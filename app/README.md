# World Cup 2026 Sweepstakes — App

React + Vite + TypeScript + Tailwind v4. See the [root README](../README.md) for full details.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build → dist/
npm run preview  # serve the production build locally
```

## Running the draw

1. Open the **Draw** tab and click **Start the draw**.
2. Press **Spin the wheel** (or **Space**) to draw each player's team — pot by pot, top seeds first, underdogs last.
3. The drawn team lands under the pointer; an infographic card shows its ranking, pot, group, and who it's assigned to.
4. Press **Next Player** (or **Space**) to continue.
5. When all 48 are drawn, click **Lock & Save** and copy the exported JSON into `src/data/picks.ts` as the `PICKS` array, then commit. The Picks tab updates automatically.

## Data files

| File | What it holds | When to edit |
|---|---|---|
| `src/data/people.ts` | The 12 players | Before the draw |
| `src/data/teams.ts` | 48 teams, FIFA ranks, real groups, outright odds | Refresh `fifaRank`/`odds` if they move |
| `src/data/picks.ts` | Draw result | Once, after the live draw |

## Deploy

Pushes to `main` auto-deploy to GitHub Pages via `.github/workflows/deploy.yml`.  
Live at: **https://rohin999.github.io/sweepstake/**
