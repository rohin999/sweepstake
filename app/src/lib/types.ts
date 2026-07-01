export type Quartile = 1 | 2 | 3 | 4;

export interface Team {
  id: string; // "ARG"
  name: string; // "Argentina"
  flag: string; // emoji
  fifaRank: number; // global rank, for display
  quartile: Quartile; // computed by re-ranking the 48
  group: string; // "A".."L"
  odds: number; // decimal odds to win the tournament, e.g. 5.5 (implied probability = 1/odds)
}

export interface Person {
  id: string;
  name: string;
  colour: string; // for bracket tagging
}

export interface Pick {
  personId: string;
  teamIds: [string, string, string, string]; // one per quartile, in quartile order
}

export type KnockoutRound = "R32" | "R16" | "QF" | "SF" | "THIRD" | "FINAL";

export interface KnockoutMatch {
  round: KnockoutRound;
  slot: number; // position within the round, 0-indexed in bracket draw order
  matchNum?: number; // openfootball's match number, kept for traceability
  team1Id?: string; // undefined = not yet decided (TBD)
  team2Id?: string;
  team1Placeholder?: string; // raw "W80"/"L101" string while unresolved
  team2Placeholder?: string;
  score1?: number; // the score that decided the match (penalties if shootout, else et, else ft)
  score2?: number;
  ftScore1?: number; // full-time score, kept even when the match went to penalties
  ftScore2?: number;
  wentToPenalties?: boolean;
  winnerId?: string;
  date?: string; // ISO date, e.g. "2026-07-04"
  venue?: string;
}

export interface MostConcededEntry {
  teamId: string;
  goalsConceded: number;
  opponentTeamId: string;
  round: string; // raw feed round label, e.g. "Matchday 4" or "Round of 32"
  date?: string;
}

export interface FastestGoalEntry {
  teamId: string;
  scorerName: string;
  minute: string; // raw label, e.g. "2" or "45+2"
  minuteValue: number; // normalized (stoppage time added on) for comparing/sorting
  round: string;
  date?: string;
}
