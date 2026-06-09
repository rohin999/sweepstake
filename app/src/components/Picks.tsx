import { PEOPLE } from "../data/people";
import { PICKS } from "../data/picks";
import { TEAMS_BY_ID } from "../data/teams";
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

export default function Picks() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 text-center sm:text-left">
        <p className="font-display text-sm tracking-[0.35em] text-brand">
          WORLD CUP 2026
        </p>
        <h2 className="font-display mt-2 text-4xl font-semibold uppercase tracking-tight text-chalk sm:text-5xl">
          The Picks
        </h2>
        <p className="mt-3 text-sm text-chalk-muted">
          Twelve players, four teams each — one from every FIFA-ranking
          quartile.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-pitch-line">
        <div className="grid grid-cols-[minmax(6.5rem,1.2fr)_repeat(4,minmax(0,1fr))] bg-pitch-surface px-3 py-2.5 font-display text-[11px] uppercase tracking-widest text-chalk-muted">
          <span>Player</span>
          {([1, 2, 3, 4] as Quartile[]).map((q) => (
            <span key={q} className="text-center">
              Pot {ROMAN[q - 1]}
            </span>
          ))}
        </div>
        {PEOPLE.map((person) => {
          const slots = teamsByPerson.get(person.id) ?? [];
          return (
            <div
              key={person.id}
              className="grid grid-cols-[minmax(6.5rem,1.2fr)_repeat(4,minmax(0,1fr))] items-stretch border-t border-pitch-line"
            >
              <span className="flex items-center gap-2 px-3 py-2 font-display text-sm uppercase tracking-wide">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: person.colour }}
                />
                <span className="truncate text-chalk">{person.name}</span>
              </span>
              {([1, 2, 3, 4] as Quartile[]).map((q) => {
                const team = slots[q - 1];
                return (
                  <div
                    key={q}
                    className="flex flex-col items-center justify-center gap-1 border-l border-pitch-line px-1 py-2 text-center"
                  >
                    {team ? (
                      <>
                        <span className="text-2xl leading-none">{team.flag}</span>
                        <span className="font-display text-[12px] uppercase leading-tight tracking-wide text-chalk sm:text-[13px]">
                          {team.name}
                        </span>
                        <div
                          className="mt-1 w-full max-w-[5.5rem] px-1"
                          title={`Outright odds ${team.odds} — implied ${formatProbability(impliedProbability(team.odds))}`}
                        >
                          <div
                            className="h-1 w-full overflow-hidden rounded-full bg-pitch-line"
                            role="presentation"
                          >
                            <div
                              className="progress-fill h-full rounded-full bg-brand"
                              style={{ transform: `scaleX(${barFraction(team.odds)})` }}
                            />
                          </div>
                          <span className="mt-0.5 block text-[10px] leading-none tabular-nums text-chalk-muted">
                            {formatProbability(impliedProbability(team.odds))}
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm text-pitch-line">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>
    </div>
  );
}
