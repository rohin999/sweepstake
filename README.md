# World Cup 2026 Sweepstakes

A private web app for a 12-person, 4-teams-each World Cup sweepstakes.

**Live:** https://rohin999.github.io/sweepstake/

## Features

- **The Draw** — a spinning wheel of fortune reveals each player's team pot by pot. The drawn team shows an infographic card (FIFA ranking, pot, group, assigned player). Picked teams disappear from the wheel as the draw progresses.
- **Standings** — leaderboard with points, goal difference, and teams alive. Click a player to see their four teams.
- **Bracket** — knockout bracket (Phase 2, before ~28 Jun).

## Format

| | |
|---|---|
| Players | 12 |
| Teams each | 4 (one from each FIFA-ranking quartile) |
| Buy-in | £40/person → £480 pot |
| Prizes | 1st £300 · 2nd £120 · 3rd £40 · 4th £20 |
| Scoring | Group wins (3pts) + draws (1pt) + cumulative knockout bonuses + 25 for winning |
| Tiebreak | Combined goal difference, then coin flip |

## Running locally

```bash
cd app
npm install
npm run dev     # http://localhost:5173
```

## Updating during the tournament

Edit `app/src/data/results.ts` — update `groupWins`, `groupDraws`, `goalsFor`, `goalsAgainst`, and `stageReached` for each team after match days. Commit and push; the site redeploys automatically in ~1 min.

## Data files

| File | What it holds |
|---|---|
| `src/data/people.ts` | The 12 players and their colours |
| `src/data/teams.ts` | 48 qualified teams, FIFA ranks (Apr 2026), real groups from the Dec 2025 draw |
| `src/data/picks.ts` | Draw result — paste JSON from Lock & Save after the live draw |
| `src/data/results.ts` | Match results — edit this during the tournament |
| `src/data/scoring.ts` | Points config |
