// Fetches live World Cup outright-winner odds from The Odds API
// (https://the-odds-api.com), averages them across whichever UK bookmakers are
// returned, and splices the result into src/data/odds.ts between the
// GENERATED-BEGIN/END markers. Requires an ODDS_API_KEY env var (a free-tier key
// from the-odds-api.com — add it as a GitHub Actions repo secret, don't commit it).
//
// Run with: ODDS_API_KEY=xxx node --experimental-strip-types scripts/update-odds.ts
// (or `npm run update-odds` from the app/ directory, with the env var set)

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { TEAMS } from "../src/data/teams.ts";

const API_KEY = process.env.ODDS_API_KEY;
const API_BASE = process.env.ODDS_API_BASE ?? "https://api.the-odds-api.com/v4";

// Known name mismatches between The Odds API and our teams.ts, seeded from the
// same three we found for openfootball (scripts/update-bracket.ts) since it's a
// reasonable starting guess — the "unmatched name" warning below will surface any
// more that turn out to be specific to this feed, without ever crashing the run.
const NAME_ALIASES: Record<string, string> = {
  USA: "United States",
  "Czech Republic": "Czechia",
  Turkey: "Türkiye",
};

interface OddsApiSport {
  key: string;
  title: string;
  description?: string;
  has_outrights: boolean;
}
interface OddsApiOutcome {
  name: string;
  price: number;
}
interface OddsApiMarket {
  key: string;
  outcomes: OddsApiOutcome[];
}
interface OddsApiBookmaker {
  key: string;
  title: string;
  markets: OddsApiMarket[];
}
interface OddsApiEvent {
  bookmakers: OddsApiBookmaker[];
}

function buildNameMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const team of TEAMS) map.set(team.name, team.id);
  for (const [apiName, ourName] of Object.entries(NAME_ALIASES)) {
    const team = TEAMS.find((t) => t.name === ourName);
    if (team) map.set(apiName, team.id);
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

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Fetch failed: ${res.status} ${res.statusText} — ${body.slice(0, 300)}`);
  }
  return res.json();
}

// Find the World Cup outright-winner market's sport key by asking the API's own
// catalogue rather than hardcoding a guess (the exact key naming isn't something
// this environment could verify directly against live docs).
async function discoverSportKey(): Promise<string> {
  const sports = (await fetchJson(
    `${API_BASE}/sports?apiKey=${API_KEY}`,
  )) as OddsApiSport[];
  const candidates = sports.filter(
    (s) => s.has_outrights && /world cup/i.test(s.title + " " + (s.description ?? "")),
  );
  if (candidates.length === 0) {
    throw new Error(
      "No outright-market sport matching 'World Cup' found in /v4/sports — check the API's current sport list.",
    );
  }
  if (candidates.length > 1) {
    console.warn(
      `WARNING: multiple candidate sports matched, using the first: ${candidates.map((c) => c.key).join(", ")}`,
    );
  }
  return candidates[0].key;
}

function average(nums: number[]): number {
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100) / 100;
}

function splice(existingText: string, newBlock: string): string {
  const startMarker = "// --- GENERATED-BEGIN ---";
  const endMarker = "// --- GENERATED-END ---";
  const start = existingText.indexOf(startMarker);
  const end = existingText.indexOf(endMarker);
  if (start === -1 || end === -1) {
    throw new Error("GENERATED-BEGIN/END markers not found in data/odds.ts");
  }
  const before = existingText.slice(0, start + startMarker.length);
  const after = existingText.slice(end);
  return `${before}\n${newBlock}\n${after}`;
}

async function main() {
  if (!API_KEY) {
    throw new Error(
      "ODDS_API_KEY is not set — add a free key from the-odds-api.com as a repo secret.",
    );
  }

  const sportKey = await discoverSportKey();
  console.log(`Using sport key: ${sportKey}`);

  const events = (await fetchJson(
    `${API_BASE}/sports/${sportKey}/odds?apiKey=${API_KEY}&regions=uk&markets=outrights&oddsFormat=decimal`,
  )) as OddsApiEvent[];

  const nameMap = buildNameMap();
  const warnings = new Set<string>();
  const pricesByTeamId = new Map<string, number[]>();

  for (const event of events) {
    for (const bookmaker of event.bookmakers ?? []) {
      const market = bookmaker.markets?.find((m) => m.key === "outrights");
      if (!market) continue;
      for (const outcome of market.outcomes) {
        const id = resolveTeamId(outcome.name, nameMap, warnings);
        if (!id) continue;
        if (!pricesByTeamId.has(id)) pricesByTeamId.set(id, []);
        pricesByTeamId.get(id)!.push(outcome.price);
      }
    }
  }

  // Every team keeps its previous odds unless this run found fresh prices for it —
  // a team temporarily or permanently dropped from the market (e.g. once
  // eliminated, some bookmakers pull it) shouldn't lose its last-known value.
  const merged: Record<string, number> = {};
  for (const team of TEAMS) {
    const prices = pricesByTeamId.get(team.id);
    merged[team.id] = prices && prices.length > 0 ? average(prices) : team.odds;
  }

  const body = Object.entries(merged)
    .map(([id, odds]) => `  ${id}: ${odds},`)
    .join("\n");
  const newBlock = `const GENERATED_ODDS: Record<string, number> = {\n${body}\n};`;

  const oddsPath = path.resolve(import.meta.dirname, "../src/data/odds.ts");
  const existing = readFileSync(oddsPath, "utf8");
  const spliced = splice(existing, newBlock);

  if (spliced !== existing) {
    writeFileSync(oddsPath, spliced);
    console.log(`Updated src/data/odds.ts (${pricesByTeamId.size} teams refreshed this run).`);
  } else {
    console.log("No changes to src/data/odds.ts.");
  }

  console.log(`Resolved ${pricesByTeamId.size} team names, ${warnings.size} unmatched.`);
  for (const w of warnings) console.warn(`WARNING: ${w}`);
  if (warnings.size > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
