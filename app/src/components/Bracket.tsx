import type { CSSProperties } from "react";
import { TEAMS_BY_ID } from "../data/teams";
import { MATCHES_BY_ROUND, hasMatches, isEliminated } from "../data/matches";
import { buildOwnerMap } from "../lib/owners";
import type { KnockoutMatch } from "../lib/types";

type MainRound = "R32" | "R16" | "QF" | "SF" | "FINAL";

const ROUND_LABELS: { key: MainRound; label: string }[] = [
  { key: "R32", label: "Round of 32" },
  { key: "R16", label: "Round of 16" },
  { key: "QF", label: "Quarter-Finals" },
  { key: "SF", label: "Semi-Finals" },
  { key: "FINAL", label: "Final" },
];

const ROUND_COUNTS: Record<MainRound, number> = {
  R32: 16,
  R16: 8,
  QF: 4,
  SF: 2,
  FINAL: 1,
};

// Fixed card/slot sizing drives the layout math below: every round column gets
// the SAME total height, so a match's centre naturally lands on the midpoint
// of the two matches feeding it (the classic recursive-bracket property of
// evenly spacing N items across a shared height H).
const CARD_HEIGHT = 81;
const SLOT_GAP = 18;
const COLUMN_HEIGHT = ROUND_COUNTS.R32 * (CARD_HEIGHT + SLOT_GAP);

function centerY(round: MainRound, slot: number): number {
  const n = ROUND_COUNTS[round];
  return (COLUMN_HEIGHT * (2 * slot + 1)) / (2 * n);
}

const ownerByTeamId = buildOwnerMap();

function TeamRow({
  teamId,
  score,
  pens,
  isWinner,
}: {
  teamId?: string;
  score?: number;
  pens?: number;
  isWinner: boolean;
}) {
  if (!teamId) {
    return (
      <div className="flex h-10 items-center px-2.5 text-sm text-pitch-line">
        <span className="truncate">TBD</span>
      </div>
    );
  }

  const team = TEAMS_BY_ID[teamId];
  const owner = ownerByTeamId.get(teamId);
  const eliminated = isEliminated(teamId);

  return (
    <div className="flex h-10 flex-col justify-center gap-0.5 px-2.5">
      <div className="flex items-center gap-2">
        <span className="text-sm leading-none">{team.flag}</span>
        <span
          className={`min-w-0 flex-1 truncate font-display text-xs uppercase tracking-wide ${
            eliminated ? "text-chalk-muted line-through" : "text-chalk"
          } ${isWinner ? "font-semibold" : ""}`}
        >
          {team.name}
        </span>
        {score !== undefined && (
          <span className="shrink-0 font-display text-xs tabular-nums text-chalk-muted">
            {score}
            {pens !== undefined && (
              <span className="ml-1 text-[9px] text-chalk-muted/70">({pens})</span>
            )}
          </span>
        )}
      </div>
      {owner && (
        <span className="truncate pl-6 font-display text-[9px] uppercase tracking-widest text-chalk-muted">
          {owner.name}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match, style }: { match: KnockoutMatch; style: CSSProperties }) {
  const mainScore1 = match.ftScore1 ?? match.score1;
  const mainScore2 = match.ftScore2 ?? match.score2;
  const pens1 = match.wentToPenalties ? match.score1 : undefined;
  const pens2 = match.wentToPenalties ? match.score2 : undefined;
  return (
    <div
      style={style}
      className="overflow-hidden rounded-lg border border-pitch-line bg-pitch-surface"
    >
      <TeamRow
        teamId={match.team1Id}
        score={mainScore1}
        pens={pens1}
        isWinner={!!match.winnerId && match.winnerId === match.team1Id}
      />
      <div className="border-t border-pitch-line" />
      <TeamRow
        teamId={match.team2Id}
        score={mainScore2}
        pens={pens2}
        isWinner={!!match.winnerId && match.winnerId === match.team2Id}
      />
    </div>
  );
}

// One round's match cards, each absolutely positioned at its computed centre so
// it lines up with the midpoint of the two matches feeding it (see Connectors).
function RoundColumn({ round }: { round: MainRound }) {
  const matches = MATCHES_BY_ROUND[round];
  return (
    <div className="relative w-56 shrink-0 snap-start" style={{ height: COLUMN_HEIGHT }}>
      {matches.map((m) => (
        <MatchCard
          key={m.slot}
          match={m}
          style={{
            position: "absolute",
            top: centerY(round, m.slot) - CARD_HEIGHT / 2,
            left: 0,
            right: 0,
            height: CARD_HEIGHT,
          }}
        />
      ))}
    </div>
  );
}

// The connecting lines between two adjacent rounds: a stub from each of the two
// feeder matches to the midline, a vertical bar joining them, and a stub from
// the midline across to the next round's match — a classic bracket "elbow".
function Connectors({ from, to }: { from: MainRound; to: MainRound }) {
  const toMatches = MATCHES_BY_ROUND[to];
  return (
    <div className="relative w-12 shrink-0" style={{ height: COLUMN_HEIGHT }} aria-hidden="true">
      {toMatches.map((m) => {
        const y1 = centerY(from, m.slot * 2);
        const y2 = centerY(from, m.slot * 2 + 1);
        const yMid = centerY(to, m.slot);
        return (
          <div key={m.slot}>
            <div className="absolute left-0 h-px w-1/2 bg-chalk-muted/30" style={{ top: y1 }} />
            <div className="absolute left-0 h-px w-1/2 bg-chalk-muted/30" style={{ top: y2 }} />
            <div
              className="absolute left-1/2 w-px bg-chalk-muted/30"
              style={{ top: y1, height: y2 - y1 }}
            />
            <div
              className="absolute right-0 h-px w-1/2 bg-chalk-muted/30"
              style={{ top: yMid }}
            />
          </div>
        );
      })}
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
          Round of 32 through the Final — each team shown with its
          owner&rsquo;s name.
        </p>
        <p className="mt-1 text-xs text-chalk-muted">
          Updates automatically every day at 8am UTC.
        </p>
        <p className="mt-1 text-xs text-chalk-muted sm:hidden">
          Swipe to see later rounds →
        </p>
      </div>

      <div className="-mx-4 snap-x snap-mandatory overflow-x-auto overscroll-x-contain px-4 pb-4 sm:mx-0 sm:px-0">
        <div className="mb-3 flex min-w-max">
          {ROUND_LABELS.map((r, i) => (
            <div key={r.key} className="flex">
              <div className="w-56 shrink-0 text-center font-display text-xs uppercase tracking-widest text-chalk-muted">
                {r.label}
              </div>
              {i < ROUND_LABELS.length - 1 && <div className="w-12 shrink-0" />}
            </div>
          ))}
        </div>
        <div className="flex min-w-max">
          <RoundColumn round="R32" />
          <Connectors from="R32" to="R16" />
          <RoundColumn round="R16" />
          <Connectors from="R16" to="QF" />
          <RoundColumn round="QF" />
          <Connectors from="QF" to="SF" />
          <RoundColumn round="SF" />
          <Connectors from="SF" to="FINAL" />
          <RoundColumn round="FINAL" />
        </div>
      </div>

      {thirdPlace && (
        <div className="mx-auto mt-8 max-w-xs">
          <h3 className="mb-3 text-center font-display text-xs uppercase tracking-widest text-chalk-muted">
            Third Place Play-off
          </h3>
          <div className="relative" style={{ height: CARD_HEIGHT }}>
            <MatchCard
              match={thirdPlace}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: CARD_HEIGHT }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
