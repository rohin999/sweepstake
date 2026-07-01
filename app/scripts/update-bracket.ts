// Fetches the openfootball/worldcup.json feed for the 2026 World Cup, resolves its
// knockout-stage matches (Round of 32 onward — this app doesn't track group-stage
// fixtures) against our internal team ids, and splices the result into
// src/data/matches.ts between the GENERATED-BEGIN/END markers.
//
// Run with: node --experimental-strip-types scripts/update-bracket.ts
// (or `npm run update-bracket` from the app/ directory)
//
// Override SOURCE_URL to point at a local file for offline testing, e.g.:
//   SOURCE_URL=file:///tmp/worldcup2026.json npm run update-bracket

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TEAMS } from "../src/data/teams.ts";

const SOURCE_URL =
  process.env.SOURCE_URL ??
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// The only three name mismatches between openfootball and our teams.ts, confirmed by a
// full diff against the live feed. Do not add speculative aliases for names that already
// match verbatim — the "unmatched name" warning below will surface any real drift.
const NAME_ALIASES: Record<string, string> = {
  USA: "United States",
  "Czech Republic": "Czechia",
  Turkey: "Türkiye",
};

const ROUND_TO_SHORT: Record<string, string> = {
  "Round of 32": "R32",
  "Round of 16": "R16",
  "Quarter-final": "QF",
  "Semi-final": "SF",
  "Match for third place": "THIRD",
  Final: "FINAL",
};
const ROUND_ORDER = ["R32", "R16", "QF", "SF", "THIRD", "FINAL"];

interface OFScore {
  ft?: [number, number];
  et?: [number, number];
  p?: [number, number];
}
interface OFMatch {
  round: string;
  num?: number;
  date?: string;
  team1: string;
  team2: string;
  score?: OFScore;
  ground?: string;
}

function buildNameMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const team of TEAMS) map.set(team.name, team.id);
  for (const [ofName, ourName] of Object.entries(NAME_ALIASES)) {
    const team = TEAMS.find((t) => t.name === ourName);
    if (team) map.set(ofName, team.id);
  }
  return map;
}

function resolveTeamId(
  name: string,
  nameMap: Map<string, string>,
  warnings: Set<string>,
): string | undefined {
  if (/^[WL]\d+$/.test(name)) return undefined; // feeder match not decided yet
  const id = nameMap.get(name);
  if (!id) warnings.add(`unmatched team name "${name}" — add to NAME_ALIASES if this is real`);
  return id;
}

function pickDecidingScore(score: OFScore) {
  if (score.p) return { score1: score.p[0], score2: score.p[1], wentToPenalties: true };
  if (score.et) return { score1: score.et[0], score2: score.et[1], wentToPenalties: false };
  const ft = score.ft;
  if (!ft) return undefined;
  return { score1: ft[0], score2: ft[1], wentToPenalties: false };
}

function serialize(value: unknown): string {
  // JSON.stringify output is valid inside a TS array literal as-is; this just unquotes
  // identifier-safe object keys so the generated block stays readable/diffable.
  return JSON.stringify(value).replace(/"([a-zA-Z_$][\w$]*)":/g, "$1:");
}

function splice(existingText: string, newBlock: string): string {
  const startMarker = "// --- GENERATED-BEGIN ---";
  const endMarker = "// --- GENERATED-END ---";
  const start = existingText.indexOf(startMarker);
  const end = existingText.indexOf(endMarker);
  if (start === -1 || end === -1) {
    throw new Error("GENERATED-BEGIN/END markers not found in data/matches.ts");
  }
  const before = existingText.slice(0, start + startMarker.length);
  const after = existingText.slice(end);
  return `${before}\n${newBlock}\n${after}`;
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { matches: OFMatch[] };

  const nameMap = buildNameMap();
  const warnings = new Set<string>();

  const byRound = new Map<string, OFMatch[]>();
  for (const m of data.matches) {
    const short = ROUND_TO_SHORT[m.round];
    if (!short) continue; // group-stage matchday, not tracked
    if (!byRound.has(short)) byRound.set(short, []);
    byRound.get(short)!.push(m);
  }
  for (const list of byRound.values()) {
    list.sort((a, b) => (a.num ?? 0) - (b.num ?? 0));
  }

  const generated: Record<string, unknown>[] = [];
  for (const round of ROUND_ORDER) {
    const list = byRound.get(round) ?? [];
    list.forEach((m, slot) => {
      const team1Id = resolveTeamId(m.team1, nameMap, warnings);
      const team2Id = resolveTeamId(m.team2, nameMap, warnings);
      const team1Placeholder = /^[WL]\d+$/.test(m.team1) ? m.team1 : undefined;
      const team2Placeholder = /^[WL]\d+$/.test(m.team2) ? m.team2 : undefined;

      const decided = m.score ? pickDecidingScore(m.score) : undefined;
      const winnerId =
        decided && team1Id && team2Id
          ? decided.score1 > decided.score2
            ? team1Id
            : team2Id
          : undefined;

      const entry: Record<string, unknown> = { round, slot };
      if (m.num !== undefined) entry.matchNum = m.num;
      if (team1Id) entry.team1Id = team1Id;
      if (team2Id) entry.team2Id = team2Id;
      if (team1Placeholder) entry.team1Placeholder = team1Placeholder;
      if (team2Placeholder) entry.team2Placeholder = team2Placeholder;
      if (decided) {
        entry.score1 = decided.score1;
        entry.score2 = decided.score2;
        if (m.score?.ft) {
          entry.ftScore1 = m.score.ft[0];
          entry.ftScore2 = m.score.ft[1];
        }
        if (decided.wentToPenalties) entry.wentToPenalties = true;
      }
      if (winnerId) entry.winnerId = winnerId;
      if (m.date) entry.date = m.date;
      if (m.ground) entry.venue = m.ground;

      generated.push(entry);
    });
  }

  const body = generated.map((m) => "  " + serialize(m)).join(",\n");
  const newBlock = `const GENERATED_MATCHES: KnockoutMatch[] = [\n${body}\n];`;

  const matchesPath = path.resolve(import.meta.dirname, "../src/data/matches.ts");
  const existing = readFileSync(matchesPath, "utf8");
  const spliced = splice(existing, newBlock);

  if (spliced !== existing) {
    writeFileSync(matchesPath, spliced);
    console.log(`Updated src/data/matches.ts (${generated.length} knockout matches).`);
  } else {
    console.log("No changes to src/data/matches.ts.");
  }

  const resolvedRefs = generated.reduce(
    (n, m) => n + (m.team1Id ? 1 : 0) + (m.team2Id ? 1 : 0),
    0,
  );
  console.log(`Resolved ${resolvedRefs} team references, ${warnings.size} unmatched name(s).`);
  for (const w of warnings) console.warn(`WARNING: ${w}`);
  if (warnings.size > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
