export type Quartile = 1 | 2 | 3 | 4;

export interface Team {
  id: string; // "ARG"
  name: string; // "Argentina"
  flag: string; // emoji
  fifaRank: number; // global rank, for display
  quartile: Quartile; // computed by re-ranking the 48
  group: string; // "A".."L"
  odds: string; // fractional odds to win the tournament, e.g. "9/2"
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
