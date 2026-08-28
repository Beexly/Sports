# Cloud-agent brief — Galaxy keyless odds (2026-08-27)

**Branch:** `hermes/galaxy-keyless-odds` · **PR:** https://github.com/Beexly/Sports/pull/680  
**Not main.** Do not merge until founder says so. Do not flip `LIVE_BOARD` / `PUBLIC_PICKS` / `PERFORMANCE_STATS`.

Read this before repeating Rundown-signup or “history is missing” work.

## What the founder decided (morning session 2026-08-27)

We **become the odds provider**. Named **Galaxy Sports API**. Not another company’s key (not The Odds API, not TheRundown). Local proof: `C:/Users/Garrett/galaxy-sports-api/odds_feed.py` serving `:8731` — **that folder is not in this git repo.** Product code for the same formula **is** in this branch.

## The formula (wired in this PR)

1. Keyless ESPN **`site.web.api.espn.com`** scoreboard (this IP: `site.api` / `sports.core` are Akamai-blocked).
2. Read **inline** `competition.odds` (DraftKings block). One GET. No vendor key.
3. Never fake `-110` spread prices. Point only when ESPN omits American price.
4. De-vig: `p_i = (1/O_i) / Σ(1/O_j)` → `fair_prob` on ML (`galaxy-devig.ts`). Verified Bills −159/+132 → ~0.5875/0.4125.
5. No paid key → `GalaxySportsApiOddsProvider` (`createOddsQuoteProvider`). **Not** certifiable for live FIRE.
6. `processSport`: Galaxy/ESPN keyless **before** Rundown.

Files: `packages/data-ingestion/src/espn-odds-client.ts`, `odds-provider-adapter.ts`, `galaxy-devig.ts`, `packages/ingestion-pipeline/src/process-sport.ts`.

## 2018–2025 history is NOT missing

nflverse `schedules` / `games.csv` (CC-BY-4.0), already in `NFLVERSE_CATALOG`. Local file measured 2026-08-27: **every 2018–2025 game** has `spread_line`, `total_line`, and moneylines (267–285 games/season). Parser: `parseNflverseGameLines` / `linesInSeasons` in `nflverse-game-lines.ts`. slieb74 CSV is 1968–2017 only — do not treat that as the whole history.

## Polymarket — HELD OFF

`docs/agent-skills/polymarket-hold`: not 100% legal for product. Parser `galaxy-polymarket.ts` exists for research. **Not called** from `GalaxySportsApiOddsProvider`. Do **not** enable `/api/cron/gamma`. Do **not** CLOB. Do **not** treat hold as tech debt.

## Live player props (already in repo)

`packages/ingestion-pipeline/src/event-odds-ingest.ts` — Odds API `/v4/sports/{sport}/events/{eventId}/odds`. NFL markets: `player_pass_tds`, `player_pass_yds`, `player_receptions`, `player_reception_yds`, `player_rush_yds`. **Default OFF** (`EVENT_ODDS_INGEST_ENABLED`). Uses remaining paid Odds API credits (cap 8 events). Not a second vendor. Do not scrape DK/FD. Extract-data JSONs in Downloads are a **lakehouse/prop-correlation blueprint**, not a live feed.

## Tests measured on this branch (2026-08-27, this machine)

- `packages/prediction-engine` vitest: **282 files / 3125 passed** (includes edge-lab, calibration, Brier/certificate, CLV properties, leak-gate, props-HB).
- Galaxy de-vig independent check: −159/+132 → 0.5875/0.4125 (sums to 1).
- `packages/data-ingestion` Galaxy/espn/history unit tests: **18 passed**.
- `packages/ingestion-pipeline` process-sport + event-odds: **42 passed** (after mock `isPolymarketIndependentEnabled: false`).
- `apps/web` full vitest: **NOT RUN**.
- LIVE_BOARD still off. Edges exist in tests; they are not a public fire.

## Related PRs (also not main)

- #679 `hermes/grok46-full-audit-2026-08-27` — full codebase/security audit at `origin/main` `bb0e7dfc0` (`handoff/GROK46_FULL_AUDIT_2026-08-27.md`).
- #677 Finish Line plan — **DRAFT**, not on main.
- #678 sports-intel orientation.

## Do not repeat

- `git fetch origin bb0e7df` looks for a **branch name**. `origin/main` **is** `bb0e7dfc0`.
- Rundown email-signup as the kill switch — founder rejected; Galaxy is the path.
- “espn-odds-client / rundown-client missing” — they are under `packages/data-ingestion/src/` on main.
- Flipping gates. Merging to main. Inventing prop lines. Enabling Polymarket cron.
