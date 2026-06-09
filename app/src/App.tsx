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
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-10 border-b border-pitch-line bg-pitch/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <h1 className="font-display text-lg font-semibold uppercase tracking-wide">
            World Cup 2026{" "}
            <span className="text-brand">Sweepstakes</span>
          </h1>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={`rounded-md px-3.5 py-2 font-display text-sm uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-pitch ${
                  tab === t.id
                    ? "bg-brand text-pitch"
                    : "text-chalk-muted hover:text-chalk"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="px-4 py-8">
        {tab === "picks" && <Picks />}
        {tab === "prizes" && <PrizesInfo />}
        {tab === "bracket" && <Bracket />}
      </main>
    </div>
  );
}
