# BUILD PROMPT — Props Production Pipeline (copy-paste to a coding agent)

**Date:** 2026-09-10
**Owner:** Garrett Baxley (founder)
**Status:** ready to execute — no research needed, all modules traced and dry-run

---

## Your mission

Give the Galaxy Sports Edge prediction engine a **production path for player props** (NFL first). The math is written, tested, and dry-run validated. Nothing feeds live player logs + live prop lines into it today. Build that path.

**First, read these before touching anything:**
1. `AGENTS.md` at repo root — the run contract and the LAWS. They are non-negotiable. Key ones for this task: never push unless the founder says so for this session (commit locally, stay UNPUSHED); never modify the files law 2 lists; never flip a gate or env flag; never fabricate product data; never weaken a guard to make a test pass.
2. `docs/ops/AGENT_LEDGER.md` — check whether this work is already claimed/dispatched before starting. Claim a row per the ledger rules or note why you didn't.
3. The integration spike: ask the founder for `ops/engine-integration-spike-2026-09-10.md` in the autonomous-revenue-engine workspace (it lives outside this repo). It contains the full module trace, dry-run numbers, and the exact function chain below.

## What already exists (do not rebuild, wire it up)

All pure functions, no I/O, no DB, zero runtime deps beyond `@sports/types`:

```
packages/prediction-engine/src/edge-lab/props-hb.ts            — fitGroupPrior(), posteriorRate(), probOver(), probOverContinuous()
packages/prediction-engine/src/edge-lab/props-priced-edge.ts    — pricePropAgainstMarket() (Shin de-vig, edge = p − q)
packages/prediction-engine/src/edge-lab/props-line-shop.ts      — shopPostedPrices() (juice-floor check per book)
packages/prediction-engine/src/edge-lab/props-fire-gate.ts      — firePostedProp() → { ok, fire, p, edge, bestBook, price }
```

Chain: `fitGroupPrior(samples)` → `posteriorRate(prior, total, games)` → `probOver` / `probOverContinuous` → `firePostedProp(p, quote, books)` → JSON pick.

Validation already done (walk-forward 2022–24, monotone calibration, beats climatology on Brier; 2026-09-10 dry run on real nflverse data reproduced a manual card review: CMC over 4.5 receptions P=0.6706 FIRE-grade, Puka over 90.5 yards P=0.4676 rejected).

**Do not use:** `gse-ml-service` (only 1 of 5 models is a real predictor and it is uncalibrated — skip), `workers/pick-generation` (stub that exits immediately — the real game-pick path is `workers/data-refresh` → `process-sport.ts` → `scoreGames()`), `pipeline/live-orchestrator.ts` (shadow-only).

## Phase A — agent-run props engine (no keys, no infra, works today)

Build `scripts/props-slate.ts`:
1. Fetch per-season player-week stats from nflverse (free, no key): `https://github.com/nflverse/nflverse-data/releases/download/player_stats/stats_player_week_<season>.csv` — use the per-season files, NOT the legacy combined `player_stats.csv.gz` (it lags newest seasons).
2. Build per-position-group priors with `fitGroupPrior` (RB receptions, WR receiving yards, etc.).
3. Accept a slate of props as JSON: `{ player, market, line, books: [{ book, american }] }` — manual entry today, Odds API player-props endpoint later.
4. For each prop: `posteriorRate` → `probOver`/`probOverContinuous` → `firePostedProp` → emit `{ player, market, line, p, edge, fire, bestBook, price }` as JSON to stdout.
5. **Deterministic:** same inputs → same outputs. No network calls inside the math path except the nflverse fetch, which must be cached locally with the season + download date recorded in the output.

**Acceptance:** running the script with the 2026-09-10 verified lines reproduces the spike's numbers (CMC over 4.5 → p≈0.671 FIRE; Puka over 90.5 → p≈0.468 no-fire) within rounding.

## Phase B — game picks on demand (needs `THE_ODDS_API_KEY` for automation)

1. Build `OddsInput` (`{ gameId, homeTeam, awayTeam, commenceTime, sport, bookmakerOdds[] }`) from The Odds API — or from hand-verified lines for manual runs.
2. Call `scoreGame()` from `packages/prediction-engine/src/scoring.ts` → publishable picks with confidence/tier/grade.
3. **Respect the fail-closed behavior:** spread/total markets require complete two-sided quotes from ≥2 books or the engine returns null — that is correct, do not work around it.
4. Output JSON. Persist to Postgres only if the founder asks (needs `DATABASE_URL` + worker/cron wiring).

## Phase C — modeling gaps (founder decisions required, do not start without sign-off)

1. Wire `edge-lab/features/nfl-body-clock.ts` into the game-context path behind the trials registry — makes travel/acclimation a real engine input.
2. Prop-line archive: store offered prop lines + results → unlocks `priced: true`, CLV, and fire-gate calibration.
3. Evaluate opponent-bind modules (`props-hb-air-yac-bind`, `adot-sep-bind`, …) for matchup adjustments.

## What the founder needs to provide

- `THE_ODDS_API_KEY` — the single key that unlocks automated game odds + prop lines (Phase B and prop-line automation). Everything else is free/keyless.
- Decision: agent-JSON flow (no infra, works today) vs full DB-persisted pipeline (needs `DATABASE_URL` + worker/cron).

## Definition of done

- `npm run typecheck` exit 0, `npm run lint` exit 0, new tests green (follow the repo's TDD/working-rules conventions).
- Phase A script reproduces the spike's 2026-09-10 numbers.
- One commit, staged by name, message tagged per repo convention. **Do not push.**
- Ledger row updated per `docs/ops/AGENT_LEDGER.md` rules.
