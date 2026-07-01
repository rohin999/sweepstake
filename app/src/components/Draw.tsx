import { PEOPLE } from "../data/people";
import { PICKS } from "../data/picks";
import { TEAMS_BY_ID } from "../data/teams";
import { isEliminated } from "../data/matches";
import { barFraction, formatProbability, impliedProbability } from "../lib/odds";
import type { Quartile, Team } from "../lib/types";

const ROMAN = ["I", "II", "III", "IV"] as const;

// Map each person to their four teams, indexed by quartile (1-4).
const teamsByPerson = new Map<string, (Team | undefined)[]>();
for (const pick of PICKS) {
  const slots: (Team | undefined)[] = [undefined, undefined, undefined, undefined];
  for (const id of pick.teamIds) {
    const team = TEAMS_BY_ID[id];
    if (team) slots[team.quartile - 1] = team;
  }
  teamsByPerson.set(pick.personId, slots);
}

// Order players by their Pot I team's % chance of winning (strongest first).
const potOneChance = (personId: string): number => {
  const potOne = teamsByPerson.get(personId)?.[0];
  return potOne ? impliedProbability(potOne.odds) : -1;
};
const SORTED_PEOPLE = [...PEOPLE].sort(
  (a, b) => potOneChance(b.id) - potOneChance(a.id)
);

// Subtle strength tint within tokens: bright lime for favourites, fading to
// dim, then muted-grey for longshots. The % label is the source of truth.
function thermoColour(fraction: number): string {
  if (fraction >= 0.66) return "var(--color-brand)";
  if (fraction >= 0.33) return "var(--color-brand-dim)";
  return "var(--color-chalk-muted)";
}

// A slim vertical thermometer that fills bottom-to-top by win chance.
function ThermoPill({ odds }: { odds: number }) {
  const fraction = barFraction(odds);
  const pct = formatProbability(impliedProbability(odds));
  return (
    <div
      className="flex flex-col items-center justify-end gap-1"
      title={`${pct} chance of winning (odds ${odds.toFixed(2)})`}
    >
      <div
        className="relative h-12 w-2 overflow-hidden rounded-full bg-pitch-line"
        role="img"
        aria-label={`${pct} chance of winning`}
      >
        <div
          className="progress-fill-y absolute inset-x-0 bottom-0 h-full rounded-full"
          style={{ transform: `scaleY(${fraction})`, background: thermoColour(fraction) }}
        />
      </div>
      <span className="text-[10px] leading-none tabular-nums text-chalk-muted">
        {pct}
      </span>
    </div>
  );
}

export default function Draw() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 text-center sm:text-left">
        <p className="font-display text-sm tracking-[0.35em] text-brand">
          WORLD CUP 2026
        </p>
        <h2 className="font-display mt-2 text-4xl font-semibold uppercase tracking-tight text-chalk sm:text-5xl">
          The Draw
        </h2>
        <p className="mt-3 text-sm text-chalk-muted">
          Twelve players, four teams each — one from every FIFA-ranking
          quartile.
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-chalk-muted sm:justify-start">
          <span
            aria-hidden="true"
            className="relative inline-block h-5 w-2 shrink-0 overflow-hidden rounded-full bg-pitch-line"
          >
            <span className="absolute inset-x-0 bottom-0 h-3/4 rounded-full bg-brand" />
          </span>
          <span>
            <span className="text-chalk">% chance of winning</span> the
            tournament — from bookmaker outright odds. Fuller bar = stronger
            favourite.
          </span>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <section className="min-w-[40rem] overflow-hidden rounded-2xl border border-pitch-line sm:min-w-0">
          <div className="grid grid-cols-[minmax(7rem,1.2fr)_repeat(4,minmax(5rem,1fr))] bg-pitch-surface px-3 py-2.5 font-display text-[11px] uppercase tracking-widest text-chalk-muted">
            <span className="sticky left-0 z-10 bg-pitch-surface">Player</span>
            {([1, 2, 3, 4] as Quartile[]).map((q) => (
              <span key={q} className="text-center">
                Pot {ROMAN[q - 1]}
              </span>
            ))}
          </div>
          {SORTED_PEOPLE.map((person) => {
            const slots = teamsByPerson.get(person.id) ?? [];
            return (
              <div
                key={person.id}
                className="grid grid-cols-[minmax(7rem,1.2fr)_repeat(4,minmax(5rem,1fr))] items-stretch border-t border-pitch-line transition-colors hover:bg-pitch-elevated"
              >
                <span
                  className="sticky left-0 z-10 flex items-center gap-2 border-l-[3px] bg-pitch-surface px-3 py-2 font-display text-sm uppercase tracking-wide"
                  style={{ borderLeftColor: person.colour }}
                >
                  <span className="truncate text-chalk">{person.name}</span>
                </span>
                {([1, 2, 3, 4] as Quartile[]).map((q) => {
                  const team = slots[q - 1];
                  const eliminated = team ? isEliminated(team.id) : false;
                  return (
                    <div
                      key={q}
                      className="flex items-stretch justify-center gap-1.5 border-l border-pitch-line px-1.5 py-2.5"
                    >
                      {team ? (
                        <>
                          <div
                            className={`flex min-w-0 flex-1 flex-col items-center justify-start gap-1 text-center ${eliminated ? "opacity-50" : ""}`}
                          >
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pitch-elevated text-xl leading-none ring-1 ring-pitch-line">
                              {team.flag}
                            </span>
                            <span
                              className={`font-display text-[11px] uppercase leading-tight tracking-wide sm:text-[12px] ${
                                eliminated ? "text-chalk-muted line-through" : "text-chalk"
                              }`}
                            >
                              {team.name}
                            </span>
                            {eliminated && (
                              <span className="rounded-full border border-pitch-line px-1.5 py-0.5 font-display text-[9px] uppercase tracking-widest text-chalk-muted">
                                Out
                              </span>
                            )}
                          </div>
                          <ThermoPill odds={team.odds} />
                        </>
                      ) : (
                        <span className="self-center text-sm text-pitch-line">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
