import { useState } from "react";
import Picks from "./components/Picks";
import PrizesInfo from "./components/PrizesInfo";
import Bracket from "./components/Bracket";

type Tab = "picks" | "prizes" | "bracket";

const TABS: { id: Tab; label: string }[] = [
  { id: "picks", label: "Picks" },
  { id: "prizes", label: "Prizes" },
  { id: "bracket", label: "Bracket" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("picks");

  return (
    <div className="pitch-stripes flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-20 border-b border-pitch-line bg-pitch/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="font-display text-lg font-semibold uppercase tracking-wide text-chalk">
            World Cup 2026{" "}
            <span className="text-brand [text-shadow:0_0_18px_color-mix(in_srgb,var(--color-brand)_45%,transparent)]">
              Sweepstakes
            </span>
          </h1>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={`rounded-md px-3.5 py-2 font-display text-sm uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-pitch ${
                  tab === t.id
                    ? "bg-brand text-pitch shadow-[0_2px_12px_color-mix(in_srgb,var(--color-brand)_35%,transparent)]"
                    : "text-chalk-muted hover:bg-pitch-elevated hover:text-chalk"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
        <div
          className="header-fade pointer-events-none absolute inset-x-0 top-full h-4"
          aria-hidden="true"
        />
      </header>
      <main className="flex-1 px-4 py-8">
        {/* key={tab} remounts the panel so .anim-cardin replays on each switch */}
        <div key={tab} className="anim-cardin">
          {tab === "picks" && <Picks />}
          {tab === "prizes" && <PrizesInfo />}
          {tab === "bracket" && <Bracket />}
        </div>
      </main>
      <footer className="border-t border-pitch-line px-4 py-6">
        <p className="mx-auto max-w-6xl text-center text-xs text-chalk-muted sm:text-left">
          World Cup 2026 Sweepstakes · 12 players · £40 buy-in · Win-chance from
          bookmaker outright odds, for fun only.
        </p>
      </footer>
    </div>
  );
}
