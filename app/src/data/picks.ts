import type { Pick } from "../lib/types";

// The frozen draw result. Each Pick's teamIds are in quartile order:
// [Q1, Q2, Q3, Q4].
export const PICKS: Pick[] = [
  { personId: "p01", teamIds: ["CRO", "AUT", "TUR", "CPV"] },
  { personId: "p02", teamIds: ["GER", "KOR", "BIH", "PAR"] },
  { personId: "p03", teamIds: ["ESP", "EGY", "SCO", "IRQ"] },
  { personId: "p04", teamIds: ["POR", "IRN", "SWE", "RSA"] },
  { personId: "p05", teamIds: ["BEL", "ECU", "CAN", "PAN"] },
  { personId: "p06", teamIds: ["BRA", "URU", "CZE", "NZL"] },
  { personId: "p07", teamIds: ["NED", "MEX", "COD", "CUW"] },
  { personId: "p08", teamIds: ["ARG", "JPN", "ALG", "KSA"] },
  { personId: "p09", teamIds: ["MAR", "SUI", "NOR", "GHA"] },
  { personId: "p10", teamIds: ["COL", "SEN", "TUN", "JOR"] },
  { personId: "p11", teamIds: ["FRA", "USA", "QAT", "UZB"] },
  { personId: "p12", teamIds: ["ENG", "AUS", "CIV", "HAI"] },
];

export const hasPicks = (): boolean => PICKS.length > 0;
