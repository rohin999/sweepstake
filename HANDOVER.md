# Handover: World Cup 2026 Sweepstakes site

Session context for picking this project back up cold. Read this before touching anything —
several things in this repo are non-obvious and have already caused wasted cycles once.

## What this is

A private web app for a 12-person, 4-teams-each World Cup 2026 sweepstake pool. React 19 + Vite +
TypeScript + Tailwind CSS 4, no backend, hosted on GitHub Pages. Repo: `rohin999/sweepstake`.

Three tabs (`app/src/App.tsx`):
- **Draw** (`components/Draw.tsx`, was called "Picks") — each of the 12 people's 4 drafted teams,
  with a win-probability pill derived from live bookmaker odds. Eliminated teams show an "Out"
  tag, strikethrough, and no odds pill.
- **Prizes** (`components/PrizesInfo.tsx`) — buy-in/prize breakdown, plus two bonus-prize cards
  that show the current tournament leader (team + owning player) for "most goals conceded in a
  match" and "fastest goal".
- **Bracket** (`components/Bracket.tsx`) — live Round-of-32 → Final knockout tree with connector
  lines, mobile-friendly (horizontal snap-scroll).

## Data automation — how it actually works

Three independent scripts in `app/scripts/`, each fetching a public data source and splicing
results into a generated data file, run daily by `.github/workflows/update-bracket.yml`
(display name "Update daily data", cron **08:00 UTC** — the user manually changed this from 6am
at some point, don't assume it's still 6am anywhere):

| Script | Source | Writes to | Notes |
|---|---|---|---|
| `update-bracket.ts` | `openfootball/worldcup.json` (free, CC0, on GitHub) | `data/matches.ts` | Only tracks knockout rounds (R32+). Slot assignment walks the tree back from the Final so connector lines/positions are correct regardless of the feed's raw match numbering — don't "simplify" this, it's solving a real bug (see git log for `Fix bracket tree structure`). |
| `update-odds.ts` | The Odds API (`the-odds-api.com`, needs `ODDS_API_KEY` repo secret — already configured and confirmed working) | `data/odds.ts` | Discovers the sport key dynamically via `/v4/sports`, never hardcode it. Odds are decimal (`Team.odds: number`), not fractional. |
| `update-bonus-stats.ts` | Same openfootball feed, but **whole tournament** (group stage included — this is the one place group-stage data is used at all) | `data/bonusStats.ts` | No tie-breaking logic by design (see below). |

All three follow the same pattern: a small hand-editable `*_OVERRIDES` object above a
`// --- GENERATED-BEGIN/END ---` marker block that the script splices between. Never hand-edit
inside the markers — it gets overwritten next run. Each script has its own tiny `NAME_ALIASES`
table (3 confirmed mismatches between openfootball/Odds-API names and our `teams.ts`: `USA`↔
`United States`, `Czech Republic`↔`Czechia`, `Turkey`↔`Türkiye`) — deliberately not shared across
scripts, matches the existing self-contained-script convention.

**Known non-self-correcting state**: `data/bonusStats.ts` has a manual override pinning the
fastest-goal leader to Paraguay (Matías Galarza, minute 2), because of a genuine tie with
Morocco's Ismael Saibari (also minute 2). The script itself never breaks ties — whichever it
finds first just keeps the lead — so this was set by hand per explicit user request ("use
Paraguay for now... deal with the next tie when it happens"). It will **not** update itself if a
real faster goal happens later. If asked to revisit, that override is what needs removing/editing.

## Critical gotcha: branches get merged and deleted fast

PRs against this repo (opened via the Claude Code web UI) have been auto-merging within seconds,
and GitHub then auto-deletes the head branch. If you keep committing to your local copy of a
branch after that's happened, those commits only exist in your local session — not on GitHub —
until you notice. This already caused a near-loss of two commits once this session.

**Before starting any new work**, always:
```bash
git fetch origin main
git log --oneline -5              # your branch
git log --oneline origin/main -5  # actual current main
git merge-base --is-ancestor HEAD origin/main && echo "fully merged, safe to restart" || echo "has unpushed/unmerged work"
```
If your designated branch is fully merged into `main` already, restart it fresh:
`git checkout -B <branch-name> origin/main` (only after confirming zero unique commits would be
lost — if there are unique commits, `git rebase origin/main` instead to preserve them on the new
base).

**Also**: the user (`rohin999`) sometimes edits files directly on `main` via the GitHub web UI —
e.g. the cron time, small copy tweaks. Always re-fetch and re-read files fresh before editing;
don't trust your last-known state of any file in this repo.

## Verification approach that actually works here

- `cd app && npm ci && npm run build` (runs `tsc -b && vite build`) for type/build correctness.
- `npm run dev -- --port XXXX` + Playwright for visual checks. Playwright and Chromium are
  pre-installed globally, **not** as a project dependency — launch with:
  ```js
  import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  ```
- **For layout/alignment work specifically: measure, don't eyeball.** Screenshots at normal
  resolution are not reliable enough to catch few-pixel misalignments — this session burned two
  extra rounds on a Draw-page alignment bug that screenshots alone made look fixed when it
  wasn't. Use `page.evaluate(() => el.getBoundingClientRect())` on the specific elements in
  question and compare actual numbers across cells/rows. The bug that finally nailed it: team
  names of different lengths wrap to 1 vs 2 lines, which changed each cell's natural content
  height and threw off alignment even after `items-center` was correctly applied — the real fix
  was giving the name a fixed-height slot (`min-h-[2.5em]`) so wrapping can't change cell shape.
  **If asked to touch `Draw.tsx` layout again, re-verify this specific thing hasn't regressed,
  and use the measurement approach from the start rather than repeating the screenshot-only
  mistake.**
- **GitHub Actions verification**: don't trust a workflow YAML looks right — trigger it for real
  via `mcp__github__actions_run_trigger` (`method: run_workflow`) and check
  `mcp__github__get_job_logs` (`failed_only: true, return_content: true`) against the actual run.
  Important trap: `update-bracket.yml`'s checkout step hardcodes `ref: main`, so dispatching it
  from a feature branch still runs **main's** code, not your branch's — pre-merge testing of
  workflow changes doesn't actually exercise your new code. Only a post-merge dispatch does.
- Network note: this sandbox's egress policy blocks `fifa.com`, `skybet.com`, and
  `the-odds-api.com` outright (confirmed via `$HTTPS_PROXY/__agentproxy/status`), but
  `raw.githubusercontent.com` (openfootball) is reachable. None of this matters for the actual
  automation, which runs on GitHub Actions runners with normal internet access — it only affects
  what you can test-fetch directly from within a Claude Code session.

## Current repo state (as of this doc)

- Branch `claude/sweepstakes-website-updates-p5lz6i` is pushed, 3 commits ahead of `main`, no open
  PR yet. Working tree clean.
- The odds/bracket/bonus-stats automation is confirmed live and working in production (real
  auto-commits from the scheduled workflow are visible in `main`'s history, e.g. "Update odds
  (2026-07-02)").
- Everything else described above (elimination logic, bracket tree-walk, odds pipeline, bonus
  stats) has been audited this session and is solid / round-agnostic — no known issues there.
