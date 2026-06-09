import { TEAMS } from "../data/teams";

// Pure helpers for turning fractional outright-winner odds into an implied
// win probability, plus a self-calibrating width for the visual bar shown on
// the Picks page. No React here — just maths.

/** Parse fractional odds "a/b" into an implied win probability in [0,1]: b/(a+b). */
export function impliedProbability(odds: string): number {
  const [a, b] = odds.split("/").map(Number);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a + b === 0) return 0;
  return b / (a + b);
}

/** Format a probability (0..1) as a short percent label, e.g. 0.182 -> "18.2%". */
export function formatProbability(p: number): string {
  const pct = p * 100;
  // Longshots round to "0.0%" which reads as no chance — show "<0.1%" instead.
  if (pct > 0 && pct < 0.05) return "<0.1%";
  return `${pct.toFixed(1)}%`;
}

/** Highest implied probability across all 48 teams — the bar's full-width reference. */
export const MAX_IMPLIED = Math.max(
  ...TEAMS.map((t) => impliedProbability(t.odds))
);

/**
 * Visual bar width fraction (0..1). Scaled relative to the favourite so the top
 * team fills the bar, then sqrt-compressed and floored at 4% so longshots stay
 * visible. The numeric label always shows the TRUE probability, so the bar is a
 * cue only and never misstates the number.
 */
export function barFraction(odds: string): number {
  const ratio = impliedProbability(odds) / MAX_IMPLIED;
  return Math.min(1, Math.max(0.04, Math.sqrt(ratio)));
}
