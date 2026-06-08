import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PEOPLE } from "../data/people";
import { teamsInQuartile } from "../data/teams";
import {
  runDraw,
  assignmentsToPicks,
  type QuartileAssignment,
} from "../lib/draw";
import type { Quartile, Team, Person } from "../lib/types";
import Wheel from "./Wheel";

const ROMAN = ["I", "II", "III", "IV"] as const;
const POT_TAG: Record<Quartile, string> = {
  1: "TOP SEEDS",
  2: "POT II",
  3: "POT III",
  4: "UNDERDOGS",
};
const N = PEOPLE.length; // 12
const TOTAL = N * 4; // 48
const STORAGE_KEY = "wc26-draw-v1";
const SPIN_MS = 4200;

type Phase = "idle" | "spinning" | "revealed";

interface RevealInfo {
  team: Team;
  person: Person;
  quartile: Quartile;
  personIndex: number;
}

const stepToCoord = (step: number) => ({
  qi: Math.floor(step / N),
  pi: step % N,
});

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function Draw() {
  const [seed, setSeed] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<QuartileAssignment[] | null>(
    null
  );
  const [revealed, setRevealed] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [rotation, setRotation] = useState(0);
  const [spinDuration, setSpinDuration] = useState(0);
  const [locked, setLocked] = useState(false);
  const [copied, setCopied] = useState(false);

  const restoredRef = useRef(false);
  const spinTimer = useRef<number | null>(null);
  // Synchronous re-entrancy guard: blocks repeat spin() calls fired in the same
  // burst (e.g. held spacebar) before React has re-rendered the phase.
  const busyRef = useRef(false);

  const done = revealed >= TOTAL;

  // --- Persistence ----------------------------------------------------------
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        seed?: number;
        revealed?: number;
        locked?: boolean;
      };
      if (typeof saved.seed === "number") {
        setSeed(saved.seed);
        setAssignments(runDraw(PEOPLE, saved.seed));
        setRevealed(Math.min(TOTAL, saved.revealed ?? 0));
        setLocked(!!saved.locked);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    if (seed === null) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ seed, revealed, locked }));
  }, [seed, revealed, locked]);

  useEffect(() => {
    return () => {
      if (spinTimer.current) clearTimeout(spinTimer.current);
    };
  }, []);

  // --- Derived --------------------------------------------------------------
  // The team just drawn (shown in the card during the "revealed" phase).
  const latest = useMemo<RevealInfo | null>(() => {
    if (!assignments || revealed === 0) return null;
    const { qi, pi } = stepToCoord(revealed - 1);
    const a = assignments[qi];
    return {
      team: a.pairs[pi].team,
      person: a.pairs[pi].person,
      quartile: a.quartile,
      personIndex: pi,
    };
  }, [assignments, revealed]);

  // Whose turn it is to draw (idle / spinning).
  const current = useMemo(() => {
    if (!assignments || done) return null;
    const { qi, pi } = stepToCoord(revealed);
    return { person: PEOPLE[pi], quartile: assignments[qi].quartile };
  }, [assignments, revealed, done]);

  // Teams shown on the wheel: the current pot, minus the teams already picked.
  // The just-drawn team stays on the wheel during its reveal (so it's visible
  // landing under the pointer), then disappears once we move to the next spin.
  const wheel = useMemo(() => {
    if (!assignments) return { quartile: 1 as Quartile, teams: [] as Team[] };
    const refStep = phase === "revealed" ? Math.max(0, revealed - 1) : revealed;
    const potIdx = Math.min(3, Math.floor(refStep / N));
    const quartile = (potIdx + 1) as Quartile;
    const removed = new Set<string>();
    for (let s = potIdx * N; s < refStep; s++) {
      removed.add(assignments[potIdx].pairs[s % N].team.id);
    }
    return {
      quartile,
      teams: teamsInQuartile(quartile).filter((t) => !removed.has(t.id)),
    };
  }, [assignments, phase, revealed]);

  // Per-person/quartile (scoreboard) and team→owner (wheel) maps.
  const { grid, ownerByTeam } = useMemo(() => {
    const g = new Map<string, Team>();
    const o = new Map<string, Person>();
    if (assignments) {
      for (let s = 0; s < revealed; s++) {
        const { qi, pi } = stepToCoord(s);
        const a = assignments[qi];
        const { person, team } = a.pairs[pi];
        g.set(`${person.id}|${a.quartile}`, team);
        o.set(team.id, person);
      }
    }
    return { grid: g, ownerByTeam: o };
  }, [assignments, revealed]);

  const exportJson = useMemo(
    () =>
      assignments
        ? JSON.stringify(assignmentsToPicks(PEOPLE, assignments), null, 2)
        : "",
    [assignments]
  );

  // --- Actions --------------------------------------------------------------
  const start = useCallback(() => {
    busyRef.current = false;
    const s = Date.now();
    setSeed(s);
    setAssignments(runDraw(PEOPLE, s));
    setRevealed(0);
    setRotation(0);
    setPhase("idle");
    setLocked(false);
  }, []);

  const spin = useCallback(() => {
    if (busyRef.current || !assignments || phase !== "idle" || done) return;
    const { qi, pi } = stepToCoord(revealed);
    const team = assignments[qi].pairs[pi].team;
    // Land on the team's slice within the *current* wheel (picked teams removed).
    const idx = wheel.teams.findIndex((t) => t.id === team.id);
    if (idx < 0) return;
    busyRef.current = true;
    const seg = 360 / wheel.teams.length;
    const targetCenter = (idx + 0.5) * seg;

    const reduce = prefersReducedMotion();
    const spins = reduce ? 0 : 5;
    setSpinDuration(reduce ? 0 : SPIN_MS);
    setRotation((prev) => {
      const currentMod = ((prev % 360) + 360) % 360;
      const desiredMod = ((360 - targetCenter) % 360 + 360) % 360;
      const delta = (desiredMod - currentMod + 360) % 360;
      return prev + spins * 360 + delta;
    });
    setPhase("spinning");
    spinTimer.current = window.setTimeout(
      () => {
        setRevealed((r) => r + 1);
        setPhase("revealed");
      },
      reduce ? 60 : SPIN_MS + 200
    );
  }, [assignments, phase, done, revealed, wheel]);

  const proceed = useCallback(() => {
    if (phase !== "revealed" || revealed >= TOTAL) return;
    busyRef.current = false;
    setPhase("idle");
  }, [phase, revealed]);

  const reset = useCallback(() => {
    if (spinTimer.current) clearTimeout(spinTimer.current);
    busyRef.current = false;
    localStorage.removeItem(STORAGE_KEY);
    setAssignments(null);
    setSeed(null);
    setRevealed(0);
    setRotation(0);
    setPhase("idle");
    setLocked(false);
    setCopied(false);
  }, []);

  // Keyboard control for the live host.
  useEffect(() => {
    if (!assignments) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return; // ignore key auto-repeat from a held key
      if (e.code !== "Space" && e.code !== "Enter") return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (tag === "BUTTON" && el?.dataset.advance !== "true") return;
      e.preventDefault();
      if (done) {
        if (!locked) setLocked(true);
      } else if (phase === "idle") {
        spin();
      } else if (phase === "revealed") {
        proceed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [assignments, phase, done, locked, spin, proceed]);

  const copy = () => {
    navigator.clipboard?.writeText(exportJson);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  // -------------------------------------------------------------------------
  // Start screen
  // -------------------------------------------------------------------------
  if (!assignments) {
    return (
      <div className="pitch-stripes mx-auto max-w-2xl rounded-2xl border border-pitch-line bg-pitch-surface px-8 py-16 text-center">
        <p className="font-display text-sm tracking-[0.35em] text-brand">
          WORLD CUP 2026
        </p>
        <h2 className="font-display mt-2 text-5xl font-semibold uppercase tracking-tight text-chalk sm:text-6xl">
          The Draw
        </h2>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-chalk-muted">
          Four pots, twelve players, forty-eight teams. Spin the wheel for each
          player in turn — they win one team from every FIFA-ranking quartile,
          top seeds first, underdogs last.
        </p>
        <button
          onClick={start}
          className="mt-9 inline-flex items-center gap-2 rounded-lg bg-brand px-7 py-3.5 font-display text-base font-semibold uppercase tracking-wide text-pitch transition hover:bg-brand/90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-surface"
        >
          Start the draw
        </button>
        <p className="mt-4 text-xs uppercase tracking-widest text-chalk-muted">
          Tip: press <span className="text-chalk">Space</span> to spin
        </p>
      </div>
    );
  }

  const potIndex = Math.min(3, Math.floor(revealed / N));

  // -------------------------------------------------------------------------
  // Broadcast layout
  // -------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-6xl pb-4">
      <div aria-live="polite" className="sr-only">
        {done
          ? "Draw complete. All 48 teams drawn."
          : phase === "revealed" && latest
            ? `${latest.team.name}, FIFA ranked ${latest.team.fifaRank}, drawn to ${latest.person.name}`
            : ""}
      </div>

      {/* Top broadcast bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pitch-line pb-3">
        <div className="flex items-center gap-3 font-display uppercase">
          <span className="text-lg font-semibold tracking-wide text-chalk">
            WC26 Draw
          </span>
          <span className="flex items-center gap-1.5 rounded bg-pitch-surface px-2 py-1 text-[11px] tracking-widest text-brand">
            <span
              aria-hidden="true"
              className="live-dot inline-block h-2 w-2 rounded-full bg-brand"
            />
            {done ? "COMPLETE" : "LIVE"}
          </span>
        </div>
        <div className="flex items-center gap-4 font-display text-sm uppercase tracking-widest text-chalk-muted">
          <span>
            Pot <span className="text-chalk">{ROMAN[potIndex]}</span>
            <span className="text-chalk-muted"> / IV</span>
          </span>
          <span className="tabular-nums">
            <span className="text-chalk">{revealed}</span>/{TOTAL}
          </span>
        </div>
      </div>

      {/* Stage: wheel on the left, info / infographic card on the right */}
      <section className="mt-4 grid items-center gap-5 rounded-2xl border border-pitch-line bg-pitch-surface p-5 lg:grid-cols-2 lg:p-7">
        <div className="pitch-stripes flex items-center justify-center rounded-xl py-4">
          <Wheel
            teams={wheel.teams}
            ownerByTeamId={ownerByTeam}
            rotation={rotation}
            durationMs={spinDuration}
            potRoman={ROMAN[wheel.quartile - 1]}
            highlightTeamId={phase === "revealed" ? latest?.team.id : undefined}
          />
        </div>

        <div className="min-h-[16rem] flex flex-col justify-center">
          {done ? (
            <div className="text-center lg:text-left">
              <p className="font-display text-sm tracking-[0.35em] text-brand">
                ALL 48 DRAWN
              </p>
              <h3 className="font-display mt-2 text-5xl font-semibold uppercase tracking-tight text-chalk">
                Draw Complete
              </h3>
              <p className="mt-4 text-sm text-chalk-muted">
                Every player has their four teams. Lock &amp; Save to freeze the
                result.
              </p>
            </div>
          ) : phase === "revealed" && latest ? (
            <InfographicCard info={latest} />
          ) : (
            <div className="text-center lg:text-left">
              <p className="font-display text-sm uppercase tracking-[0.3em] text-chalk-muted">
                {phase === "spinning" ? "Spinning…" : "Now drawing for"}
              </p>
              <h3 className="font-display mt-2 flex items-center justify-center gap-3 text-5xl font-semibold uppercase tracking-tight text-chalk lg:justify-start sm:text-6xl">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ background: current?.person.colour }}
                />
                {current?.person.name}
              </h3>
              <p className="font-display mt-2 text-sm uppercase tracking-[0.3em] text-brand">
                {current ? POT_TAG[current.quartile] : ""}
              </p>
              {phase === "idle" && (
                <p className="mt-5 text-sm text-chalk-muted">
                  Press <span className="text-chalk">Spin</span> or{" "}
                  <span className="text-chalk">Space</span> to draw their Pot{" "}
                  {ROMAN[(current?.quartile ?? 1) - 1]} team.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Scoreboard */}
      <section className="mt-4 overflow-hidden rounded-2xl border border-pitch-line">
        <div className="grid grid-cols-[minmax(6.5rem,1.2fr)_repeat(4,minmax(0,1fr))] bg-pitch-surface px-3 py-2.5 font-display text-[11px] uppercase tracking-widest text-chalk-muted">
          <span>Player</span>
          {([1, 2, 3, 4] as Quartile[]).map((q) => (
            <span key={q} className="text-center">
              Pot {ROMAN[q - 1]}
            </span>
          ))}
        </div>
        {PEOPLE.map((person, pi) => {
          const isLatestRow = phase === "revealed" && latest?.personIndex === pi;
          return (
            <div
              key={person.id}
              className={`grid grid-cols-[minmax(6.5rem,1.2fr)_repeat(4,minmax(0,1fr))] items-stretch border-t border-pitch-line ${
                isLatestRow ? "bg-pitch-elevated" : ""
              }`}
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
                const team = grid.get(`${person.id}|${q}`);
                const isFresh =
                  isLatestRow && latest?.quartile === q && team !== undefined;
                return (
                  <div
                    key={q}
                    className={`flex flex-col items-center justify-center gap-1 border-l border-pitch-line px-1 py-2 text-center ${
                      isFresh ? "anim-rowflash" : ""
                    }`}
                  >
                    {team ? (
                      <>
                        <span className="text-2xl leading-none">{team.flag}</span>
                        <span className="font-display text-[12px] uppercase leading-tight tracking-wide text-chalk sm:text-[13px]">
                          {team.name}
                        </span>
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

      {/* Sticky control deck */}
      <div className="sticky bottom-0 z-10 mt-4 -mx-4 border-t border-pitch-line bg-pitch/90 px-4 py-3 backdrop-blur">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={TOTAL}
          aria-valuenow={revealed}
          aria-label="Teams drawn"
          className="relative mb-3 h-1.5 overflow-hidden rounded-full bg-pitch-elevated"
        >
          <div
            className="progress-fill h-full w-full rounded-full bg-brand"
            style={{ transform: `scaleX(${revealed / TOTAL})` }}
          />
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              aria-hidden="true"
              className="absolute top-0 h-full w-0.5 bg-pitch"
              style={{ left: `${(i / 4) * 100}%` }}
            />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!done && phase !== "revealed" && (
            <button
              data-advance="true"
              onClick={spin}
              disabled={phase === "spinning"}
              className="rounded-lg bg-brand px-6 py-3 font-display text-base font-semibold uppercase tracking-wide text-pitch transition hover:bg-brand/90 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-pitch"
            >
              {phase === "spinning" ? "Spinning…" : "Spin the wheel"}
            </button>
          )}
          {!done && phase === "revealed" && (
            <button
              data-advance="true"
              onClick={proceed}
              className="rounded-lg bg-brand px-6 py-3 font-display text-base font-semibold uppercase tracking-wide text-pitch transition hover:bg-brand/90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-pitch"
            >
              Next Player
            </button>
          )}
          {done && !locked && (
            <button
              data-advance="true"
              onClick={() => setLocked(true)}
              className="rounded-lg bg-brand px-6 py-3 font-display text-base font-semibold uppercase tracking-wide text-pitch transition hover:bg-brand/90 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-pitch"
            >
              Lock &amp; Save
            </button>
          )}
          <button
            onClick={reset}
            className="rounded-lg border border-pitch-line px-5 py-3 font-display text-sm uppercase tracking-wide text-chalk-muted transition hover:bg-pitch-surface hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chalk-muted focus-visible:ring-offset-2 focus-visible:ring-offset-pitch"
          >
            Reset
          </button>
          {!done && phase === "idle" && current && (
            <span className="font-display text-xs uppercase tracking-widest text-chalk-muted">
              Up next: <span className="text-chalk">{current.person.name}</span>
            </span>
          )}
          <span className="ml-auto font-display text-sm uppercase tracking-widest tabular-nums text-chalk-muted">
            <span className="text-chalk">{revealed}</span>/{TOTAL}
          </span>
        </div>
      </div>

      {/* Export panel */}
      {locked && (
        <div className="mt-5 rounded-2xl border border-brand/30 bg-brand/5 p-5">
          <p className="font-display text-sm uppercase tracking-wide text-brand">
            Draw locked
          </p>
          <p className="mt-1 text-sm text-chalk-muted">
            Paste this into{" "}
            <code className="text-brand">src/data/picks.ts</code> as the{" "}
            <code className="text-brand">PICKS</code> array and commit to freeze
            it.
          </p>
          <textarea
            readOnly
            value={exportJson}
            className="mt-3 h-44 w-full rounded-lg border border-pitch-line bg-pitch p-3 font-mono text-xs text-chalk"
          />
          <button
            onClick={copy}
            className="mt-2 rounded-lg border border-pitch-line px-4 py-2 font-display text-sm uppercase tracking-wide text-chalk transition hover:bg-pitch-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-pitch-surface"
          >
            {copied ? "Copied ✓" : "Copy JSON"}
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The infographic card for a drawn team.
// ---------------------------------------------------------------------------
function InfographicCard({ info }: { info: RevealInfo }) {
  const { team, person, quartile } = info;
  const rows: { label: string; value: string }[] = [
    { label: "FIFA World Ranking", value: `#${team.fifaRank}` },
    {
      label: "Pot",
      value: `${ROMAN[quartile - 1]} · ${POT_TAG[quartile]}`,
    },
    { label: "Group", value: team.group },
  ];

  return (
    <div className="anim-cardin rounded-xl border border-pitch-line bg-pitch p-5">
      <p className="font-display text-xs uppercase tracking-[0.3em] text-brand">
        Team Drawn
      </p>
      <div className="mt-2 flex items-center gap-4">
        <span className="anim-flagpop anim-landglow rounded-lg border border-pitch-line bg-pitch-surface px-3 py-1.5 text-[3.25rem] leading-none">
          {team.flag}
        </span>
        <h3 className="font-display text-4xl font-semibold uppercase leading-none tracking-tight text-chalk sm:text-5xl">
          {team.name}
        </h3>
      </div>

      <dl className="mt-5 divide-y divide-pitch-line">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between py-2.5"
          >
            <dt className="font-display text-xs uppercase tracking-widest text-chalk-muted">
              {r.label}
            </dt>
            <dd className="font-display text-base font-semibold uppercase tracking-wide tabular-nums text-chalk">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-brand/10 px-3 py-3">
        <span className="font-display text-xs uppercase tracking-widest text-chalk-muted">
          Assigned to
        </span>
        <span className="flex items-center gap-2 font-display text-lg uppercase tracking-wide text-brand">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-full"
            style={{ background: person.colour }}
          />
          {person.name}
        </span>
      </div>
    </div>
  );
}
