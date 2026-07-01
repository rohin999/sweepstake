// Fetches the openfootball/worldcup.json feed for the 2026 World Cup — the WHOLE tournament,
// group stage included, unlike update-bracket.ts which only cares about the knockout rounds —
// and computes two novelty "bonus prize" leaders: the team that conceded the most goals in a
// single match, and the fastest goal scored so far. Splices the result into
// src/data/bonusStats.ts between the GENERATED-BEGIN/END markers.
//
// Run with: node --experimental-strip-types scripts/update-bonus-stats.ts
// (or `npm run update-bonus-stats` from the app/ directory)
//
// Override SOURCE_URL to point at a local file for offline testing, e.g.:
//   SOURCE_URL=file:///tmp/worldcup2026.json npm run update-bonus-stats

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TEAMS } from "../src/data/teams.ts";

const SOURCE_URL =
  process.env.SOURCE_URL ??
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// The only three name mismatches between openfootball and our teams.ts, confirmed by a full
// diff against the live feed (see scripts/update-bracket.ts). Do not add speculative aliases for
// names that already match verbatim.
const NAME_ALIASES: Record<string, string> = {
  USA: "United States",
  "Czech Republic": "Czechia",
  Turkey: "Türkiye",
};

interface OFGoal {
  name: string;
  minute: string;
}
interface OFScore {
  ft?: [number, number];
  et?: [number, number];
  p?: [number, number];
}
interface OFMatch {
  round: string;
  date?: string;
  team1: string;
  team2: string;
  score?: OFScore;
  goals1?: OFGoal[];
  goals2?: OFGoal[];
}

interface MostConcededEntry {
  teamId: string;
  goalsConceded: number;
  opponentTeamId: string;
  round: string;
  date?: string;
}
interface FastestGoalEntry {
  teamId: string;
  scorerName: string;
  minute: string;
  minuteValue: number;
  round: string;
  date?: string;
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
  const id = nameMap.get(name);
  if (!id) warnings.add(`unmatched team name "${name}" — add to NAME_ALIASES if this is real`);
  return id;
}

// "45+2" (stoppage time) -> 47. Plain "2" -> 2.
function parseMinute(minute: string): number {
  if (minute.includes("+")) {
    const [base, extra] = minute.split("+").map(Number);
    return base + extra;
  }
  return Number(minute);
}

function serialize(value: unknown): string {
  // JSON.stringify output is valid inside a TS literal as-is; this just unquotes
  // identifier-safe object keys so the generated block stays readable/diffable.
  return JSON.stringify(value, null, 2).replace(/"([a-zA-Z_$][\w$]*)":/g, "$1:");
}

function splice(existingText: string, newBlock: string): string {
  const startMarker = "// --- GENERATED-BEGIN ---";
  const endMarker = "// --- GENERATED-END ---";
  const start = existingText.indexOf(startMarker);
  const end = existingText.indexOf(endMarker);
  if (start === -1 || end === -1) {
    throw new Error("GENERATED-BEGIN/END markers not found in data/bonusStats.ts");
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

  let mostConceded: MostConcededEntry | undefined;
  let fastestGoal: FastestGoalEntry | undefined;

  for (const m of data.matches) {
    if (!m.score) continue; // not played yet
    const finalScore = m.score.et ?? m.score.ft; // et already includes ft goals; penalties never count
    if (!finalScore) continue;

    const team1Id = resolveTeamId(m.team1, nameMap, warnings);
    const team2Id = resolveTeamId(m.team2, nameMap, warnings);

    const concededPairs: [string | undefined, number, string | undefined][] = [
      [team1Id, finalScore[1], team2Id],
      [team2Id, finalScore[0], team1Id],
    ];
    for (const [teamId, conceded, opponentId] of concededPairs) {
      if (!teamId || !opponentId) continue;
      if (mostConceded === undefined || conceded > mostConceded.goalsConceded) {
        mostConceded = { teamId, goalsConceded: conceded, opponentTeamId: opponentId, round: m.round, date: m.date };
      }
    }

    const scorerSides: [string | undefined, OFGoal[]][] = [
      [team1Id, m.goals1 ?? []],
      [team2Id, m.goals2 ?? []],
    ];
    for (const [teamId, goals] of scorerSides) {
      if (!teamId) continue;
      for (const g of goals) {
        const minuteValue = parseMinute(g.minute);
        if (fastestGoal === undefined || minuteValue < fastestGoal.minuteValue) {
          fastestGoal = { teamId, scorerName: g.name, minute: g.minute, minuteValue, round: m.round, date: m.date };
        }
      }
    }
  }

  const newBlock = [
    `const GENERATED_MOST_CONCEDED: MostConcededEntry | undefined = ${mostConceded ? serialize(mostConceded) : "undefined"};`,
    `const GENERATED_FASTEST_GOAL: FastestGoalEntry | undefined = ${fastestGoal ? serialize(fastestGoal) : "undefined"};`,
  ].join("\n");

  const statsPath = path.resolve(import.meta.dirname, "../src/data/bonusStats.ts");
  const existing = readFileSync(statsPath, "utf8");
  const spliced = splice(existing, newBlock);

  if (spliced !== existing) {
    writeFileSync(statsPath, spliced);
    console.log("Updated src/data/bonusStats.ts.");
  } else {
    console.log("No changes to src/data/bonusStats.ts.");
  }

  console.log(`Most conceded: ${mostConceded ? `${mostConceded.teamId} (${mostConceded.goalsConceded})` : "none"}.`);
  console.log(`Fastest goal: ${fastestGoal ? `${fastestGoal.teamId} (${fastestGoal.minute}')` : "none"}.`);
  console.log(`${warnings.size} unmatched name(s).`);
  for (const w of warnings) console.warn(`WARNING: ${w}`);
  if (warnings.size > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
