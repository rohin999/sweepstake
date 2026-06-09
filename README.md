# World Cup 2026 Sweepstakes

A web app for a 12-person, 4-teams-each World Cup sweepstakes.

## Features

- **Picks** — each player's four teams, one per FIFA-ranking quartile, with each team's outright-winner odds shown as an implied win probability and a visual bar.
- **Prizes** — buy-in and the full prize breakdown (main places plus bonus prizes).
- **Bracket** — knockout bracket (Phase 2, before ~28 Jun).

## Format

| | |
|---|---|
| Players | 12 |
| Teams each | 4 (one from each FIFA-ranking quartile) |
| Buy-in | £40/person → £480 pot |
| Main prizes | 1st £270 · 2nd £90 · 3rd £40 · 4th £20 |
| Bonus prizes | Most goals conceded £20 · Fastest goal £20 · Goal of the tournament £20 |

## Running locally

```bash
cd app
npm install
npm run dev     # http://localhost:5173
```

## Data files

| File | What it holds |
|---|---|
| `src/data/people.ts` | The 12 players and their colours |
| `src/data/teams.ts` | 48 qualified teams, FIFA ranks (Apr 2026), real groups from the Dec 2025 draw, and outright odds |
| `src/data/picks.ts` | Draw result — paste JSON from Lock & Save after the live draw |
