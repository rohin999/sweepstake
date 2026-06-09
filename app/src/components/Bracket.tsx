export default function Bracket() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative overflow-hidden rounded-2xl border border-pitch-line bg-pitch-surface px-6 py-16 text-center sm:px-10">
        {/* Ghosted bracket motif (pure CSS/divs) */}
        <div
          className="bracket-ghost anim-ghostpulse pointer-events-none absolute inset-0 flex items-center justify-between px-6 opacity-40"
          aria-hidden="true"
        >
          <BracketColumn pairs={4} />
          <BracketColumn pairs={2} />
          <BracketColumn pairs={1} />
          <div className="h-10 w-16 shrink-0 rounded border border-[var(--line)]" />
          <BracketColumn pairs={1} />
          <BracketColumn pairs={2} />
          <BracketColumn pairs={4} />
        </div>

        {/* Foreground copy */}
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-pitch-line bg-pitch px-3 py-1 font-display text-[11px] uppercase tracking-widest text-chalk-muted">
            <span className="live-dot inline-block h-2 w-2 rounded-full bg-brand" />
            Coming soon
          </span>
          <h2 className="font-display mt-4 text-3xl font-semibold uppercase tracking-tight text-chalk sm:text-4xl">
            The Bracket
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-chalk-muted">
            Phase 2 unlocks ~28 June. Round-of-32 → Final tree, each surviving
            team tagged with its owner&rsquo;s colour. Goes live once the group
            stage finishes and the 32 qualifiers are entered.
          </p>
        </div>
      </div>
    </div>
  );
}

function BracketColumn({ pairs }: { pairs: number }) {
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
