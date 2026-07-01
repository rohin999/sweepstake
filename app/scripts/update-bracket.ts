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

// Each round's feeder round, for walking the tree backwards from the Final. The
// Round of 32 is the leaf level (no feeder). "THIRD" is fed by the two Semi-Final
// losers rather than winners — handled separately, since it isn't part of the
// winners-only tree the other rounds form.
const PREV_ROUND: Record<string, string> = {
  R16: "R32",
  QF: "R16",
  SF: "QF",
  FINAL: "SF",
};

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

interface ResolvedEntry {
  round: string;
  matchNum: number;
  team1Id?: string;
  team2Id?: string;
  team1Placeholder?: string;
  team2Placeholder?: string;
  score1?: number;
  score2?: number;
  ftScore1?: number;
  ftScore2?: number;
  wentToPenalties?: boolean;
  winnerId?: string;
  date?: string;
  venue?: string;
}

function loserIdOf(entry?: ResolvedEntry): string | undefined {
  if (!entry?.winnerId) return undefined;
  return entry.team1Id === entry.winnerId ? entry.team2Id : entry.team1Id;
}

function placeholderNum(placeholder?: string): number | undefined {
  return placeholder ? parseInt(placeholder.slice(1), 10) : undefined;
}

// Find which match in `round` produced `teamId` (as winner, or as loser for the
// third-place match) — this is how we recover the true parent/child relationship
// for matches that are already decided, where the feed has overwritten the
// original "W<num>" placeholder with the real team name.
function findFeederNum(
  resolved: Map<number, ResolvedEntry>,
  round: string,
  teamId: string | undefined,
  wantLoser: boolean,
): number | undefined {
  if (!teamId) return undefined;
  for (const entry of resolved.values()) {
    if (entry.round !== round) continue;
    const candidateId = wantLoser ? loserIdOf(entry) : entry.winnerId;
    if (candidateId === teamId) return entry.matchNum;
  }
  return undefined;
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

  // Pass 1: resolve every knockout-stage match's teams/score/winner, keyed by its
  // fixed match number. This doesn't yet know each match's position in the
  // bracket tree — the feed's raw match-number order does NOT correspond to tree
  // structure (e.g. match 89's two feeders are matches 74 and 77, not 73 and 74),
  // so slot assignment happens in pass 2 by walking the tree from the Final.
  const resolved = new Map<number, ResolvedEntry>();
  for (const m of data.matches) {
    const round = ROUND_TO_SHORT[m.round];
    if (!round || m.num === undefined) continue; // group-stage matchday, not tracked

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

    resolved.set(m.num, {
      round,
      matchNum: m.num,
      team1Id,
      team2Id,
      team1Placeholder,
      team2Placeholder,
      score1: decided?.score1,
      score2: decided?.score2,
      ftScore1: m.score?.ft?.[0],
      ftScore2: m.score?.ft?.[1],
      wentToPenalties: decided?.wentToPenalties,
      winnerId,
      date: m.date,
      venue: m.ground,
    });
  }

  // Pass 2: assign each match a canonical slot by walking the tree back from the
  // Final. This guarantees slot j's two feeders are always slots 2j and 2j+1 in
  // the previous round — the property the bracket UI's layout math depends on —
  // regardless of the feed's raw match numbering.
  const output: Record<string, (ResolvedEntry & { slot: number })[]> = {
    R32: [],
    R16: [],
    QF: [],
    SF: [],
    THIRD: [],
    FINAL: [],
  };

  function assign(round: string, matchNum: number | undefined, slot: number) {
    if (matchNum === undefined) return;
    const entry = resolved.get(matchNum);
    if (!entry) {
      warnings.add(`could not find match #${matchNum} expected for ${round} slot ${slot}`);
      return;
    }
    output[round][slot] = { ...entry, slot };
    if (round === "R32") return;
    const prevRound = PREV_ROUND[round];
    const num1 = placeholderNum(entry.team1Placeholder) ?? findFeederNum(resolved, prevRound, entry.team1Id, false);
    const num2 = placeholderNum(entry.team2Placeholder) ?? findFeederNum(resolved, prevRound, entry.team2Id, false);
    assign(prevRound, num1, slot * 2);
    assign(prevRound, num2, slot * 2 + 1);
  }

  const finalEntry = [...resolved.values()].find((e) => e.round === "FINAL");
  if (finalEntry) assign("FINAL", finalEntry.matchNum, 0);
  else warnings.add("no Final match found in feed");

  // Third place is a sibling of the Final (fed by the two Semi-Final losers, not
  // winners) rather than part of the winners-only tree walked above, so it's
  // resolved directly rather than via `assign`.
  const thirdEntry = [...resolved.values()].find((e) => e.round === "THIRD");
  if (thirdEntry) output.THIRD[0] = { ...thirdEntry, slot: 0 };

  const generated: Record<string, unknown>[] = [];
  for (const round of ROUND_ORDER) {
    for (const entry of output[round]) {
      if (!entry) continue;
      const out: Record<string, unknown> = { round, slot: entry.slot };
      out.matchNum = entry.matchNum;
      if (entry.team1Id) out.team1Id = entry.team1Id;
      if (entry.team2Id) out.team2Id = entry.team2Id;
      if (entry.team1Placeholder) out.team1Placeholder = entry.team1Placeholder;
      if (entry.team2Placeholder) out.team2Placeholder = entry.team2Placeholder;
      if (entry.score1 !== undefined) out.score1 = entry.score1;
      if (entry.score2 !== undefined) out.score2 = entry.score2;
      if (entry.ftScore1 !== undefined) out.ftScore1 = entry.ftScore1;
      if (entry.ftScore2 !== undefined) out.ftScore2 = entry.ftScore2;
      if (entry.wentToPenalties) out.wentToPenalties = true;
      if (entry.winnerId) out.winnerId = entry.winnerId;
      if (entry.date) out.date = entry.date;
      if (entry.venue) out.venue = entry.venue;
      generated.push(out);
    }
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
