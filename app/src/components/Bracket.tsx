import { PEOPLE } from "../data/people";
import { PICKS } from "../data/picks";
import { TEAMS_BY_ID } from "../data/teams";
import { MATCHES_BY_ROUND, hasMatches, isEliminated } from "../data/matches";
import type { KnockoutMatch, KnockoutRound, Person } from "../lib/types";

const ROUNDS: { key: KnockoutRound; label: string }[] = [
  { key: "R32", label: "Round of 32" },
  { key: "R16", label: "Round of 16" },
  { key: "QF", label: "Quarter-Finals" },
  { key: "SF", label: "Semi-Finals" },
  { key: "FINAL", label: "Final" },
];

// Increasing vertical spacing per round is a cheap way to suggest the bracket
// converging, without needing SVG connector lines.
const ROUND_GAP: Record<KnockoutRound, string> = {
  R32: "gap-3",
  R16: "gap-10",
  QF: "gap-24",
  SF: "gap-52",
  THIRD: "gap-3",
  FINAL: "gap-3",
};

const ownerByTeamId = new Map<string, Person>();
for (const pick of PICKS) {
  const person = PEOPLE.find((p) => p.id === pick.personId);
  if (!person) continue;
  for (const teamId of pick.teamIds) ownerByTeamId.set(teamId, person);
}

function TeamRow({
  teamId,
  placeholder,
  score,
  isWinner,
}: {
  teamId?: string;
  placeholder?: string;
  score?: number;
  isWinner: boolean;
}) {
  if (!teamId) {
    const label = placeholder ? `Winner of M${placeholder.slice(1)}` : "TBD";
    return (
      <div className="flex items-center gap-2 px-2.5 py-2 text-sm text-pitch-line">
        <span
          aria-hidden="true"
          className="h-2 w-2 shrink-0 rounded-full bg-pitch-line/40"
        />
        <span className="truncate">{label}</span>
      </div>
    );
  }

  const team = TEAMS_BY_ID[teamId];
  const owner = ownerByTeamId.get(teamId);
  const eliminated = isEliminated(teamId);

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-2 text-sm ${
        eliminated ? "text-chalk-muted line-through" : "text-chalk"
      } ${isWinner ? "font-semibold" : ""}`}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: owner?.colour ?? "transparent" }}
        title={owner?.name}
      />
      <span className="text-base leading-none">{team.flag}</span>
      <span className="min-w-0 flex-1 truncate font-display uppercase tracking-wide">
        {team.name}
      </span>
      {score !== undefined && (
        <span className="shrink-0 font-display tabular-nums text-chalk-muted">
          {score}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: KnockoutMatch }) {
  const mainScore1 = match.ftScore1 ?? match.score1;
  const mainScore2 = match.ftScore2 ?? match.score2;
  return (
    <div className="overflow-hidden rounded-lg border border-pitch-line bg-pitch-surface">
      <TeamRow
        teamId={match.team1Id}
        placeholder={match.team1Placeholder}
        score={mainScore1}
        isWinner={!!match.winnerId && match.winnerId === match.team1Id}
      />
      <div className="border-t border-pitch-line" />
      <TeamRow
        teamId={match.team2Id}
        placeholder={match.team2Placeholder}
        score={mainScore2}
        isWinner={!!match.winnerId && match.winnerId === match.team2Id}
      />
      {match.wentToPenalties && (
        <p className="border-t border-pitch-line px-2.5 py-1 text-center font-display text-[10px] uppercase tracking-widest text-chalk-muted">
          Pens {match.score1}–{match.score2}
        </p>
      )}
    </div>
  );
}

function RoundColumn({ round, label }: { round: KnockoutRound; label: string }) {
  const matches = MATCHES_BY_ROUND[round];
  return (
    <div className="flex w-56 shrink-0 snap-start flex-col">
      <h3 className="mb-3 text-center font-display text-xs uppercase tracking-widest text-chalk-muted">
        {label}
      </h3>
      <div className={`flex flex-1 flex-col justify-around ${ROUND_GAP[round]}`}>
        {matches.map((m) => (
          <MatchCard key={m.slot} match={m} />
        ))}
      </div>
    </div>
  );
}

function ComingSoon() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative overflow-hidden rounded-2xl border border-pitch-line bg-pitch-surface px-6 py-16 text-center sm:px-10">
        <div
          className="bracket-ghost anim-ghostpulse pointer-events-none absolute inset-0 flex items-center justify-between px-6 opacity-40"
          aria-hidden="true"
        >
          <BracketGhostColumn pairs={4} />
          <BracketGhostColumn pairs={2} />
          <BracketGhostColumn pairs={1} />
          <div className="h-10 w-16 shrink-0 rounded border border-[var(--line)]" />
          <BracketGhostColumn pairs={1} />
          <BracketGhostColumn pairs={2} />
          <BracketGhostColumn pairs={4} />
        </div>
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-pitch-line bg-pitch px-3 py-1 font-display text-[11px] uppercase tracking-widest text-chalk-muted">
            <span className="live-dot inline-block h-2 w-2 rounded-full bg-brand" />
            Coming soon
          </span>
          <h2 className="font-display mt-4 text-3xl font-semibold uppercase tracking-tight text-chalk sm:text-4xl">
            The Bracket
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-chalk-muted">
            Goes live once the group stage finishes and the Round of 32
            qualifiers are entered — updates automatically from there.
          </p>
        </div>
      </div>
    </div>
  );
}

function BracketGhostColumn({ pairs }: { pairs: number }) {
  return (
    <div className="flex h-full shrink-0 flex-col justify-around">
      {Array.from({ length: pairs }).map((_, i) => (
        <div
          key={i}
          className="my-2 h-5 w-10 rounded border border-[var(--line)] sm:w-14"
        />
      ))}
    </div>
  );
}

export default function Bracket() {
  if (!hasMatches()) {
    return <ComingSoon />;
  }

  const thirdPlace = MATCHES_BY_ROUND.THIRD[0];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 text-center sm:text-left">
        <p className="font-display text-sm tracking-[0.35em] text-brand">
          WORLD CUP 2026
        </p>
        <h2 className="font-display mt-2 text-4xl font-semibold uppercase tracking-tight text-chalk sm:text-5xl">
          The Bracket
        </h2>
        <p className="mt-3 text-sm text-chalk-muted">
          Round of 32 through the Final — each team tagged with its
          owner&rsquo;s colour.
        </p>
        <p className="mt-1 text-xs text-chalk-muted sm:hidden">
          Swipe to see later rounds →
        </p>
      </div>

      <div className="-mx-4 snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-4 pb-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-6">
          {ROUNDS.map((r) => (
            <RoundColumn key={r.key} round={r.key} label={r.label} />
          ))}
        </div>
      </div>

      {thirdPlace && (
        <div className="mx-auto mt-8 max-w-xs">
          <h3 className="mb-3 text-center font-display text-xs uppercase tracking-widest text-chalk-muted">
            Third Place Play-off
          </h3>
          <MatchCard match={thirdPlace} />
        </div>
      )}
    </div>
  );
}
