import type { Team, Quartile } from "../lib/types";

// The 48 qualified teams for the 2026 World Cup.
//
// `fifaRank` = global FIFA/Coca-Cola ranking (April 1 2026 update — the latest
//   official list; the next update lands 11 June 2026, refresh then if it moves).
// `group`    = the REAL group from the Final Draw (Washington DC, 5 Dec 2025).
// `quartile` = COMPUTED below: re-rank the 48 by fifaRank, then cut into four
//   bands of 12 (Q1 = the 12 best-ranked WC teams … Q4 = the 12 lowest).
//
// To refresh after the 11 June ranking update: adjust fifaRank values; quartiles
// re-derive automatically. Groups are fixed and shouldn't change.
interface RawTeam {
  id: string;
  name: string;
  flag: string;
  fifaRank: number;
  group: string;
  odds: string; // fractional outright-winner odds (bookmaker board, 11 Jun 2026)
}

const RAW: RawTeam[] = [
  { id: "FRA", name: "France", flag: "🇫🇷", fifaRank: 1, group: "I", odds: "5/1" },
  { id: "ESP", name: "Spain", flag: "🇪🇸", fifaRank: 2, group: "H", odds: "9/2" },
  { id: "ARG", name: "Argentina", flag: "🇦🇷", fifaRank: 3, group: "J", odds: "9/1" },
  { id: "ENG", name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", fifaRank: 4, group: "L", odds: "13/2" },
  { id: "POR", name: "Portugal", flag: "🇵🇹", fifaRank: 5, group: "K", odds: "8/1" },
  { id: "BRA", name: "Brazil", flag: "🇧🇷", fifaRank: 6, group: "C", odds: "8/1" },
  { id: "NED", name: "Netherlands", flag: "🇳🇱", fifaRank: 7, group: "F", odds: "20/1" },
  { id: "MAR", name: "Morocco", flag: "🇲🇦", fifaRank: 8, group: "C", odds: "50/1" },
  { id: "BEL", name: "Belgium", flag: "🇧🇪", fifaRank: 9, group: "G", odds: "33/1" },
  { id: "GER", name: "Germany", flag: "🇩🇪", fifaRank: 10, group: "E", odds: "14/1" },
  { id: "CRO", name: "Croatia", flag: "🇭🇷", fifaRank: 11, group: "L", odds: "80/1" },
  { id: "COL", name: "Colombia", flag: "🇨🇴", fifaRank: 13, group: "K", odds: "33/1" },
  { id: "SEN", name: "Senegal", flag: "🇸🇳", fifaRank: 14, group: "I", odds: "125/1" },
  { id: "MEX", name: "Mexico", flag: "🇲🇽", fifaRank: 15, group: "A", odds: "66/1" },
  { id: "USA", name: "United States", flag: "🇺🇸", fifaRank: 16, group: "D", odds: "66/1" },
  { id: "URU", name: "Uruguay", flag: "🇺🇾", fifaRank: 17, group: "H", odds: "66/1" },
  { id: "JPN", name: "Japan", flag: "🇯🇵", fifaRank: 18, group: "F", odds: "50/1" },
  { id: "SUI", name: "Switzerland", flag: "🇨🇭", fifaRank: 19, group: "B", odds: "80/1" },
  { id: "IRN", name: "Iran", flag: "🇮🇷", fifaRank: 21, group: "G", odds: "500/1" },
  { id: "AUT", name: "Austria", flag: "🇦🇹", fifaRank: 23, group: "J", odds: "150/1" },
  { id: "ECU", name: "Ecuador", flag: "🇪🇨", fifaRank: 24, group: "E", odds: "100/1" },
  { id: "KOR", name: "South Korea", flag: "🇰🇷", fifaRank: 25, group: "A", odds: "400/1" },
  { id: "AUS", name: "Australia", flag: "🇦🇺", fifaRank: 26, group: "D", odds: "500/1" },
  { id: "EGY", name: "Egypt", flag: "🇪🇬", fifaRank: 29, group: "G", odds: "300/1" },
  { id: "CAN", name: "Canada", flag: "🇨🇦", fifaRank: 30, group: "B", odds: "125/1" },
  { id: "CIV", name: "Ivory Coast", flag: "🇨🇮", fifaRank: 33, group: "E", odds: "300/1" },
  { id: "QAT", name: "Qatar", flag: "🇶🇦", fifaRank: 35, group: "B", odds: "2000/1" },
  { id: "ALG", name: "Algeria", flag: "🇩🇿", fifaRank: 36, group: "J", odds: "400/1" },
  { id: "SWE", name: "Sweden", flag: "🇸🇪", fifaRank: 39, group: "F", odds: "125/1" },
  { id: "TUN", name: "Tunisia", flag: "🇹🇳", fifaRank: 40, group: "F", odds: "500/1" },
  { id: "CZE", name: "Czechia", flag: "🇨🇿", fifaRank: 41, group: "A", odds: "300/1" },
  { id: "TUR", name: "Türkiye", flag: "🇹🇷", fifaRank: 42, group: "D", odds: "80/1" },
  { id: "NOR", name: "Norway", flag: "🇳🇴", fifaRank: 44, group: "I", odds: "25/1" },
  { id: "SCO", name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿", fifaRank: 47, group: "C", odds: "250/1" },
  { id: "COD", name: "DR Congo", flag: "🇨🇩", fifaRank: 51, group: "K", odds: "750/1" },
  { id: "BIH", name: "Bosnia & Herzegovina", flag: "🇧🇦", fifaRank: 52, group: "B", odds: "350/1" },
  { id: "PAN", name: "Panama", flag: "🇵🇦", fifaRank: 53, group: "L", odds: "1500/1" },
  { id: "KSA", name: "Saudi Arabia", flag: "🇸🇦", fifaRank: 57, group: "H", odds: "1000/1" },
  { id: "RSA", name: "South Africa", flag: "🇿🇦", fifaRank: 60, group: "A", odds: "1000/1" },
  { id: "IRQ", name: "Iraq", flag: "🇮🇶", fifaRank: 61, group: "I", odds: "1500/1" },
  { id: "UZB", name: "Uzbekistan", flag: "🇺🇿", fifaRank: 62, group: "K", odds: "1500/1" },
  { id: "PAR", name: "Paraguay", flag: "🇵🇾", fifaRank: 64, group: "D", odds: "150/1" },
  { id: "GHA", name: "Ghana", flag: "🇬🇭", fifaRank: 65, group: "L", odds: "400/1" },
  { id: "JOR", name: "Jordan", flag: "🇯🇴", fifaRank: 68, group: "J", odds: "2500/1" },
  { id: "CPV", name: "Cape Verde", flag: "🇨🇻", fifaRank: 70, group: "H", odds: "2000/1" },
  { id: "CUW", name: "Curaçao", flag: "🇨🇼", fifaRank: 81, group: "E", odds: "3500/1" },
  { id: "HAI", name: "Haiti", flag: "🇭🇹", fifaRank: 83, group: "C", odds: "2500/1" },
  { id: "NZL", name: "New Zealand", flag: "🇳🇿", fifaRank: 95, group: "G", odds: "2500/1" },
];

// Re-rank the 48 by global FIFA rank, then derive quartile from position.
export const TEAMS: Team[] = [...RAW]
  .sort((a, b) => a.fifaRank - b.fifaRank)
  .map((t, i) => ({
    ...t,
    quartile: (Math.floor(i / 12) + 1) as Quartile,
  }));

export const TEAMS_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t])
);

export const teamsInQuartile = (q: Quartile): Team[] =>
  TEAMS.filter((t) => t.quartile === q);
