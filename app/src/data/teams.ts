import type { Team, Quartile } from "../lib/types";
import { ODDS_BY_ID } from "./odds.ts";

// The 48 qualified teams for the 2026 World Cup.
//
// `fifaRank` = global FIFA/Coca-Cola ranking (April 1 2026 update — the latest
//   official list; the next update lands 11 June 2026, refresh then if it moves).
// `group`    = the REAL group from the Final Draw (Washington DC, 5 Dec 2025).
// `quartile` = COMPUTED below: re-rank the 48 by fifaRank, then cut into four
//   bands of 12 (Q1 = the 12 best-ranked WC teams … Q4 = the 12 lowest).
// `odds`     = pulled in from ./odds (updated daily) — see RawTeam.odds fallback.
//
// To refresh after the 11 June ranking update: adjust fifaRank values; quartiles
// re-derive automatically. Groups are fixed and shouldn't change.
interface RawTeam {
  id: string;
  name: string;
  flag: string;
  fifaRank: number;
  group: string;
}

const RAW: RawTeam[] = [
  { id: "FRA", name: "France", flag: "🇫🇷", fifaRank: 1, group: "I" },
  { id: "ESP", name: "Spain", flag: "🇪🇸", fifaRank: 2, group: "H" },
  { id: "ARG", name: "Argentina", flag: "🇦🇷", fifaRank: 3, group: "J" },
  { id: "ENG", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", fifaRank: 4, group: "L" },
  { id: "POR", name: "Portugal", flag: "🇵🇹", fifaRank: 5, group: "K" },
  { id: "BRA", name: "Brazil", flag: "🇧🇷", fifaRank: 6, group: "C" },
  { id: "NED", name: "Netherlands", flag: "🇳🇱", fifaRank: 7, group: "F" },
  { id: "MAR", name: "Morocco", flag: "🇲🇦", fifaRank: 8, group: "C" },
  { id: "BEL", name: "Belgium", flag: "🇧🇪", fifaRank: 9, group: "G" },
  { id: "GER", name: "Germany", flag: "🇩🇪", fifaRank: 10, group: "E" },
  { id: "CRO", name: "Croatia", flag: "🇭🇷", fifaRank: 11, group: "L" },
  { id: "COL", name: "Colombia", flag: "🇨🇴", fifaRank: 13, group: "K" },
  { id: "SEN", name: "Senegal", flag: "🇸🇳", fifaRank: 14, group: "I" },
  { id: "MEX", name: "Mexico", flag: "🇲🇽", fifaRank: 15, group: "A" },
  { id: "USA", name: "United States", flag: "🇺🇸", fifaRank: 16, group: "D" },
  { id: "URU", name: "Uruguay", flag: "🇺🇾", fifaRank: 17, group: "H" },
  { id: "JPN", name: "Japan", flag: "🇯🇵", fifaRank: 18, group: "F" },
  { id: "SUI", name: "Switzerland", flag: "🇨🇭", fifaRank: 19, group: "B" },
  { id: "IRN", name: "Iran", flag: "🇮🇷", fifaRank: 21, group: "G" },
  { id: "AUT", name: "Austria", flag: "🇦🇹", fifaRank: 23, group: "J" },
  { id: "ECU", name: "Ecuador", flag: "🇪🇨", fifaRank: 24, group: "E" },
  { id: "KOR", name: "South Korea", flag: "🇰🇷", fifaRank: 25, group: "A" },
  { id: "AUS", name: "Australia", flag: "🇦🇺", fifaRank: 26, group: "D" },
  { id: "EGY", name: "Egypt", flag: "🇪🇬", fifaRank: 29, group: "G" },
  { id: "CAN", name: "Canada", flag: "🇨🇦", fifaRank: 30, group: "B" },
  { id: "CIV", name: "Ivory Coast", flag: "🇨🇮", fifaRank: 33, group: "E" },
  { id: "QAT", name: "Qatar", flag: "🇶🇦", fifaRank: 35, group: "B" },
  { id: "ALG", name: "Algeria", flag: "🇩🇿", fifaRank: 36, group: "J" },
  { id: "SWE", name: "Sweden", flag: "🇸🇪", fifaRank: 39, group: "F" },
  { id: "TUN", name: "Tunisia", flag: "🇹🇳", fifaRank: 40, group: "F" },
  { id: "CZE", name: "Czechia", flag: "🇨🇿", fifaRank: 41, group: "A" },
  { id: "TUR", name: "Türkiye", flag: "🇹🇷", fifaRank: 42, group: "D" },
  { id: "NOR", name: "Norway", flag: "🇳🇴", fifaRank: 44, group: "I" },
  { id: "SCO", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", fifaRank: 47, group: "C" },
  { id: "COD", name: "DR Congo", flag: "🇨🇩", fifaRank: 51, group: "K" },
  { id: "BIH", name: "Bosnia & Herzegovina", flag: "🇧🇦", fifaRank: 52, group: "B" },
  { id: "PAN", name: "Panama", flag: "🇵🇦", fifaRank: 53, group: "L" },
  { id: "KSA", name: "Saudi Arabia", flag: "🇸🇦", fifaRank: 57, group: "H" },
  { id: "RSA", name: "South Africa", flag: "🇿🇦", fifaRank: 60, group: "A" },
  { id: "IRQ", name: "Iraq", flag: "🇮🇶", fifaRank: 61, group: "I" },
  { id: "UZB", name: "Uzbekistan", flag: "🇺🇿", fifaRank: 62, group: "K" },
  { id: "PAR", name: "Paraguay", flag: "🇵🇾", fifaRank: 64, group: "D" },
  { id: "GHA", name: "Ghana", flag: "🇬🇭", fifaRank: 65, group: "L" },
  { id: "JOR", name: "Jordan", flag: "🇯🇴", fifaRank: 68, group: "J" },
  { id: "CPV", name: "Cape Verde", flag: "🇨🇻", fifaRank: 70, group: "H" },
  { id: "CUW", name: "Curaçao", flag: "🇨🇼", fifaRank: 81, group: "E" },
  { id: "HAI", name: "Haiti", flag: "🇭🇹", fifaRank: 83, group: "C" },
  { id: "NZL", name: "New Zealand", flag: "🇳🇿", fifaRank: 95, group: "G" },
];

// Re-rank the 48 by global FIFA rank, then derive quartile from position.
// A team missing from ODDS_BY_ID (shouldn't happen — see data/odds.ts) falls back
// to a long-shot default rather than leaving `odds` undefined.
export const TEAMS: Team[] = [...RAW]
  .sort((a, b) => a.fifaRank - b.fifaRank)
  .map((t, i) => ({
    ...t,
    quartile: (Math.floor(i / 12) + 1) as Quartile,
    odds: ODDS_BY_ID[t.id] ?? 1001,
  }));

export const TEAMS_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t])
);

export const teamsInQuartile = (q: Quartile): Team[] =>
  TEAMS.filter((t) => t.quartile === q);
