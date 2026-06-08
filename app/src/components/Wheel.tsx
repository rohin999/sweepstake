import type { Person, Team } from "../lib/types";

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// A rotating wheel of the current pot's teams. Rotation is fully controlled by
// the parent; this component is presentational. The pointer sits at the top
// (12 o'clock); the parent rotates so the chosen team's slice lands there.
export default function Wheel({
  teams,
  ownerByTeamId,
  rotation,
  durationMs,
  potRoman,
  highlightTeamId,
  size = 340,
}: {
  teams: Team[];
  ownerByTeamId: Map<string, Person>;
  rotation: number;
  durationMs: number;
  potRoman: string;
  highlightTeamId?: string;
  size?: number;
}) {
  const seg = 360 / teams.length;
  const labelRadius = size * 0.345;

  const stops = teams
    .map((t, i) => {
      const owner = ownerByTeamId.get(t.id);
      const base = owner
        ? hexA(owner.colour, 0.32)
        : i % 2 === 0
          ? "#0e2016"
          : "#0b1810";
      return `${base} ${i * seg}deg ${(i + 1) * seg}deg`;
    })
    .join(", ");

  return (
    <div
      className="relative mx-auto"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Fixed pointer at the top */}
      <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2">
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "11px solid transparent",
            borderRight: "11px solid transparent",
            borderTop: "20px solid var(--color-brand)",
            filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
          }}
        />
      </div>

      {/* Rotating disc */}
      <div
        className="absolute inset-0 rounded-full border-4 border-pitch-line shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        style={{
          background: `conic-gradient(from 0deg, ${stops})`,
          transform: `rotate(${rotation}deg)`,
          transition: `transform ${durationMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        {/* Slice separators */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `repeating-conic-gradient(from 0deg, transparent 0 ${seg - 0.5}deg, rgba(255,255,255,0.10) ${seg - 0.5}deg ${seg}deg)`,
          }}
        />

        {teams.map((t, i) => {
          const angle = (i + 0.5) * seg;
          const owner = ownerByTeamId.get(t.id);
          const isHi = t.id === highlightTeamId;
          return (
            <div
              key={t.id}
              className="absolute left-1/2 top-1/2 flex flex-col items-center"
              style={{
                transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${labelRadius}px)`,
              }}
            >
              <span
                className={`text-[1.7rem] leading-none transition-opacity ${
                  owner && !isHi ? "opacity-35" : ""
                }`}
              >
                {t.flag}
              </span>
              <span
                className={`font-display text-[10px] font-semibold uppercase leading-none tracking-wide ${
                  isHi ? "text-brand" : owner ? "text-chalk-muted" : "text-chalk"
                }`}
              >
                {t.id}
              </span>
              {owner && (
                <span
                  className="mt-0.5 h-1.5 w-1.5 rounded-full"
                  style={{ background: owner.colour }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Hub */}
      <div
        className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-pitch-line bg-pitch"
        style={{ width: size * 0.27, height: size * 0.27 }}
      >
        <span className="text-center font-display text-xs font-semibold uppercase leading-tight tracking-widest text-chalk-muted">
          Pot
          <br />
          <span className="text-lg text-brand">{potRoman}</span>
        </span>
      </div>
    </div>
  );
}
