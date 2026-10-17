# GSE v5.3.0 Build Spec — Calibrated confidence, beat desk, prop alignment, context matrix

**For:** the coding agent. **Source:** founder directive 2026-09-13 + code trace of the Sports repo.
**Rule:** no placeholders. Every workstream ends with acceptance criteria and the proof you will show. If a step cannot be completed exactly as written, stop and report what is missing — do not invent.

---

## 1. Mission

Today the displayed `confidence` on a pick is a heuristic composite (market-echo), while the board ranks on a separate number (`rankingP`). Thresholds (70 → Premium, grade bands) are static and never fit to outcomes. Whole signal classes are missing: beat-writer/reporter/coach/Reddit intel, prop cross-market checks, travel, unit-level matchups, coaching/scheme.

Build v5.3.0 so that:
- (a) the public confidence number is a **calibrated probability** (a 70 wins ~70%),
- (b) Premium/grade thresholds are **fit from backtested CLV/ROI** and Premium becomes a **conjunction gate** (several green lights, not one number),
- (c) three new signal layers feed scoring through the existing game×factor matrix: **beat desk**, **prop alignment**, **context matrix**,
- (d) everything ships **direct to production** — no shadow period (founder override 2026-09-13: "we're way too far behind"). Safety comes from the kill switch, the conjunction gate (which fails safe — see below), and weekly monitoring, not from waiting.

**Non-goals:** replacing the Poisson/Dixon-Coles/Elo/Skellam independents; auto-publishing anything (`CALIBRATION_AUTO_PUBLISH` stays false); touching `gse-grok-build-sandbox` (never); pushing to `main` without explicit approval.

---

## 2. Current architecture (verified in repo)

- **Book-priced path:** `processSport()` in `packages/ingestion-pipeline/src/process-sport.ts` → scoring in `packages/prediction-engine/src/scoring.ts` (`scoreSpreadPick` ~L382, `scoreTotalPick` ~L714, `scoreMoneylinePick` ~L1080). Triggered by Vercel cron `apps/web/app/api/cron/refresh-odds/route.ts` (every 15 min), `workers/data-refresh/src/index.ts`, admin trigger route.
- **Signal path:** `generateSignalSlate()` in `packages/ingestion-pipeline/src/generate-signal-slate.ts` (MONEYLINE-only, `(model signal)` suffix, `bookmakerCount = 0`, never overwrites a book-priced pick). Cron: `apps/web/app/api/cron/generate-signal-slate/route.ts`.
- **Key formulas today:**
  - Fair value: proportional de-vig of averaged two-sided implied probs (`scoring.ts:71`).
  - `rawEdge = fairProb − americanToImpliedProbability(avgPrice)`; edge component = `clamp((rawEdge+0.05)/0.10, 0, 1) × 25`.
  - `edgeScore = round(edgeComponentScore / 25 × 100)`.
  - `confidence = round(clamp(consensus + depth + edge + volatilityPenalty + lineMovement + restAdvantage + historicalForm + dataQualityPenalty + headToHead + venueForm + uncertaintyPenalty + crossMarket + scheduleStress + 10, 0, 100))` (`scoring.ts:551`).
  - Tier: `confidence >= 70 → PREMIUM` else `FREE` (`PREMIUM_CONFIDENCE_THRESHOLD`, `packages/prediction-engine/src/constants.ts:30`).
  - Grade (book path), `computePickGrade` (`packages/types/src/index.ts:217`): conf≥85 & edge≥80 → ELITE_PLAY; conf≥75 & edge≥65 → STRONG_PLAY; conf≥65 & edge≥50 → SOLID_PLAY; else LEAN.
  - Grade (signal path): `pickGradeFromConfidence`: ≥80 → STRONG_PLAY, ≥65 → SOLID_PLAY, else LEAN.
  - `MODEL_VERSION = "v5.2.7"` (`constants.ts:25`). v5.2.7 = Skellam ATS cover priced into spread `rankingP` only (commit `4ec8a9911`, doc `docs/calibration-proposals/2026-08-22-skellam-spread-rank-v5.2.7.md`).
- **Tables (live Neon `neondb`):** `picks` (3,411 rows; full CLV column suite: `clvLockLine`, `clvCloseLine`, `clvValue`, `clvVerdict`, `clvComputedAt`…), `games` (has `restDaysHome/Away`, `openingSpread/Total`, `lineMovementSpread/Total`, `dataQualityScore`, `currentEdgeIndex`), `game_signals` (4,384 rows, game-level key/value with trust levels — the designed home for new game-level signals), `signals` (**0 rows** — entity/player-level table, currently unwritten; use it), `pick_signal_snapshots` (3,369 rows; **book path only** — 42 signal-path picks have none), `gate_decisions` (**dead** — latest row 2026-06-11, no writer in codebase; do not resurrect), `calibration_proposals` (0 rows; the real process is markdown in `docs/calibration-proposals/`).

---

## 3. Build order

**Workstream 0 (data correctness) → Workstream 1 (calibration) + Workstream 2 (thresholds) → Workstreams 3–5 (new layers, shadow) → Workstream 6 (promotion).** Do not fit any model before Workstream 0 is green.

---

## 4. Workstream 0 — Data correctness & label audit (DO FIRST)

**0a. Dedupe bug.** `generateSignalSlate` writes duplicate rows (observed: identical selection+confidence+matchup 3–4×, e.g. Rays ML 86 ×3). Root cause per trace: fixture collapse dedupes for *consideration* (`collapseGameRowsToFixtures`) but picks are unique per `(gameId, pickType)` and multiple game rows survive as separate fixtures. Fix: dedupe on `(gameId, pickType, selection)` before insert, plus a DB unique partial index to make recurrence impossible.

**0b. Snapshot parity.** Extend `buildPickSignalSnapshot` (process-sport.ts:1384) to the signal path so **every** pick row has a `pick_signal_snapshots` row capturing its full factor vector at generation time. The calibration trainer reads snapshots, never live recomputation.

**0c. Label audit.** Report, per sport and per market type (spread/ML/total): count of picks with settled `result`, count with `clvValue` computed, date range coverage. Training needs: CLV labels (fast loop, available within hours of lock) and realized results (slow loop). If realized-result coverage is thin for a sport, say so explicitly and mark that sport's calibration head as CLV-only until coverage exists.

**Acceptance:** 0a — zero duplicate `(gameId, pickType, selection)` rows in a full regen test, unique index in place. 0b — 100% of new picks across both paths get a snapshot row (prove with a count query). 0c — a written label-coverage table per sport/market. Proof: SQL outputs pasted into your report.

---

## 5. Workstream 1 — Calibrated confidence

**Goal:** `confidence = round(calibrated_p × 100)` where `calibrated_p` is a genuine probability.

- **Heads:** one calibration head **per sport × market type** (spread / moneyline / total). Do not fit one global model — sport dynamics differ (this is why the Skellam work was sport-specific).
- **Spread head must handle pushes:** 3-class (cover / push / fail) or P(cover | no push) × (1 − push_rate). Use whichever the backtest prefers; document the choice.
- **Features:** the snapshot factor vector (all existing components) + Workstream 3/4/5 columns when they exist. Start with logistic regression (L2) — weights must be inspectable for the public `factorBreakdown`. A GBM may run as a challenger; it only replaces the linear head if it beats it on out-of-sample log-loss/Brier by a margin you report.
- **Labels:** primary = CLV-derived (fast loop); validation = realized ROI (slow loop). Report both.
- **Rollout safety:** gate on the existing `CALIBRATION_ADJUSTMENTS_ENABLED` env flag. Heuristic composite stays as the fallback whenever the calibrated head lacks coverage (new league, thin history) — mark such picks so the board can label them honestly. `rankingP` and `calibrated_p` converge; document the merge and remove the two-truths display.
- **Versioning:** this ships as v5.3.0 (`MODEL_VERSION` bump in `constants.ts`), with a calibration proposal doc in `docs/calibration-proposals/` following the existing frontmatter format.

**Acceptance:** per-head out-of-sample log-loss and Brier vs the current heuristic, reported in a table; calibration plot (predicted vs realized buckets) attached; fallback triggers demonstrated on a thin-history league. Proof: metrics table + plot + the proposal doc.

---

## 6. Workstream 2 — Stronger thresholds

- **Refit cutoffs from backtest:** sweep candidate Premium cutoffs over settled history; choose the cutoff where marginal CLV/ROI turns durably positive, per sport. Refit grade bands (Elite/Strong/Solid/Lean) as backtested win-rate buckets on the calibrated inputs (keep the two-input confidence+edge shape).
- **Premium becomes a conjunction.** `PREMIUM` requires ALL of: calibrated confidence ≥ cutoff, shrunk edge ≥ min_edge, beat-vector agreement (no unresolved negative hold flag — Workstream 3), prop alignment ≥ neutral (Workstream 4; neutral counts as pass when props are absent), `dataQualityScore` ≥ bar. One red light → Free. Implement as an explicit gate function with each sub-check logged (so a "why not Premium" explanation is always available).
- **Integrate with `isPublished`:** the existing publish gate (`MIN_PUBLISH_CONFIDENCE = 50`) stays as the floor; the conjunction sits above it. Do not build a parallel publish system.

**Acceptance:** backtest table showing CLV/ROI above vs below each chosen cutoff; conjunction gate unit tests (each sub-check failing → Free, with the reason logged); no change to `isPublished` semantics for picks below the floor. Proof: tables + test output.

---

## 7. Workstream 3 — Beat desk

**Goal:** per-game beat vectors in `game_signals` (game-level) and player-level items in `signals` (currently 0 rows — this is its purpose).

**Sources (tiered):**
- T1 — official: team PR / injury reports / coach presser transcripts.
- T2 — curated beat writers, 1–2 per team (list lives in a config file, founder-approved).
- T3 — national reporters/aggregators for breaking news.
- T4 — Reddit team subs + fan sentiment. Mechanics: Reddit API OAuth app (credential needed), per-team sub list in config, min volume gate per window, account-age/karma filters to cut bots, polarity+volume only — never single posts.

**Pipeline per item:** ingest → classify into (injury / lineup / scheme / motivation / weather / off-field) → entity-resolve to team/player/game → polarity × magnitude → freshness decay (half-life ~24–48h; injury news slower, motivational quotes faster) → source trust weight.

**Trust leaderboard:** every source starts at its tier prior; weights update on a rolling window by correlation of that source's signals with subsequent line moves and realized outcomes. Backtest the leaderboard on history, then keep it live-updating in production.

**Hold flags:** unresolved high-magnitude negative items (e.g., starting QB downgraded within 48h of kickoff) set a hold that blocks Premium (Workstream 2 conjunction) until resolved or game time. Do NOT resurrect the dead `gate_decisions` table — implement holds as explicit columns/a small `pick_hold_flags` table with reason + timestamp + resolver.

**Unexplained-steam detector (high value — do not skip):** cross every beat item's timestamp against `lineMovementSpread/Total` timestamps. A significant line move with **no** preceding public beat item = sharp steam without news — score it as its own positive factor. A move *explained* by a beat item gets no extra credit beyond the item itself. This is the closest thing to seeing respected money.

**Cost control:** classification runs on a cheap model, batched; put a per-day spend cap in config and log usage. If the cap trips, the desk degrades to T1+T2 only and logs the degradation.

**Crons:** beat-desk refresh every 15–30 min (`apps/web/app/api/cron/` new route, mirroring existing cron structure).

**Acceptance:** ≥ N items/day ingested (report actuals), entity-resolution precision ≥ 90% on a 100-item hand-checked sample, trust leaderboard updating, unexplained-steam factor firing on known historical steam moves (backtest: pick 5 documented steam games, show detection), hold flag blocking a Premium in a drill. Proof: counts, sample audit, backtest hits, drill log.

---

## 8. Workstream 4 — Prop alignment

**Dependency:** a prop odds feed (player props + team totals). **First** check the existing odds vendor's props endpoint — same vendor, same auth, least cost. Only propose a new vendor if coverage is missing. (Founder decides spend.)

**Schema:** new `prop_snapshots` table mirroring `odds_line_snapshots` (prop lines at pick time; never updated in place).

**Mechanics:**
- Per game, derive the **prop-implied game script** vector: pace, pass-heaviness, scoring level (QB passing-yards over + WR overs + high team total ⇒ shootout script).
- Every side/total pick implies a script (Over ⇒ scoring; home-favorite spread ⇒ control).
- **Alignment score** = similarity of the two scripts. Aligned → small boost; conflicted (engine Under vs prop shootout) → penalty **and** a review flag. Conflicts are information.
- **Team-total consistency:** spread-implied team total vs market team total — divergence is its own edge signal.
- **Anti-circularity:** down-weight alignment when the prop board merely echoes the same book steam as the side (shared-root check via bookmaker overlap + move-timing correlation).

**Acceptance:** alignment score computed for every game with prop coverage; conflict flags fire on at least 3 historical contradicting-script games in backtest; anti-circularity down-weight demonstrably triggers on same-steam cases. Proof: backtest cases + a live-game walkthrough.

---

## 9b. Workstream 5B — Narrative & incentive factors (founder add 2026-09-13)

Garrett: milestones, records, birthdays, revenge games, contract incentives (e.g. a WR needing 105 yards for a bonus — teams force-feed to get him there). Ranked by evidence, not hype:

1. **Contract incentives — strongest.** Real money moves real behavior: target-share spikes when a player is within reach of a yardage/TD/catch bonus. Source: incentive clauses (Spotrac/OverTheCap — manual curation of top ~50 skill players for v1, automate later) × season stats (nflverse, already in-house) → `yards_needed` vs per-game pace → `incentive_in_reach` flag when needed ≤ 1.5× pace over remaining games. Peaks weeks 14–18; rare in September, tracker runs all season anyway.
2. **Milestone/record chases — strong.** Teams keep starters in and keep passing in garbage time when a record is in reach (single-season marks, franchise records) → tilts totals up, helps favorites cover late. Source: season totals vs a curated records table (manual list v1). Flag: `record_in_reach_within_2_games`.
3. **Revenge games — weak.** Player vs former team (traded/cut last 2 seasons), ex-coach vs former team. Mostly narrative; keep the weight small and let the backtest decide.
4. **Birthdays — weakest.** Include as a micro-tiebreak flag for completeness; expect ~zero weight.

**Schema:** new `narrative_signals` (gameId, entity, kind: incentive|milestone|revenge|birthday, detail JSONB, computed_at) or columns on `game_signals` — builder's call, but immutable history like everything else.

**Scoring integration:**
- Incentives/milestones feed the **prop workstream first** (player props move directly; prop-implied pass-rate tilt adjusts the game total secondarily).
- **Premium gate:** a supporting narrative (incentive aligned with the pick) is a positive gate input; a *conflicting* incentive (e.g. fading a team that will force-feed for a record) triggers a Premium hold.
- **Anti-double-count with the beat desk:** beat writers WILL report these stories ("Chase needs 105"). Dedupe by entity + threshold — the structured tracker is the source of truth, the beat mention is corroboration, never a second vote.

**Backtest-or-cut:** each narrative factor must show positive CLV contribution on history or its weight goes to zero. Revenge and birthday are guilty until proven innocent.

**Acceptance:** tracker computes in-reach flags from stats × clauses; at least one historical case study per factor showing the behavior change (target share / garbage-time pass rate); no double-count with beat desk in the logs. Proof: tracker output + case studies.

---

## 9. Workstream 5 — Context matrix

Each becomes a scored column with **learned** weights (Workstream 1), not hand-set bonuses. Inputs mostly exist (`games.restDaysHome/Away`, `game_signals` schedule density) — build the columns:

- **Travel:** miles, time zones crossed, altitude delta, road-trip game number. Sport-specific treatment (NFL short week ≠ MLB getaway day ≠ NBA back-to-back).
- **Rest:** rest *differential*, non-linear (1 day ≈ noise, 3+ ≈ signal).
- **Unit matchups:** unit grades — pass O vs pass D, run O vs run D, etc. — plus the attack angle: does the offense's strength hit the defense's weakness? Cover-relevant, not just win-relevant.
- **Coaching/scheme:** head-to-head coaching ATS history, scheme-clash tags (config list, e.g., zone-run vs light boxes), 4th-down aggressiveness rate (moves totals), new-coordinator early-season priors with shrinkage on small samples.

**Acceptance:** every column populated for ≥ 95% of games in covered sports; learned weights reported per head with sign-sanity (e.g., rest differential for the pick side must be ≥ 0); small-sample shrinkage demonstrated for coordinator-change priors. Proof: coverage stats + weight tables.

---

## 10. Launch & monitoring (no shadow — founder override 2026-09-13)

- Ship directly behind `CALIBRATION_ADJUSTMENTS_ENABLED`. That flag is the kill switch: one env change rolls the public board back to the v5.2.7 heuristic instantly. Test the rollback before launch day.
- Backtest every layer on historical data before it ships (that is analysis, not shadow — it stays).
- From launch: weekly monitoring report — per-layer CLV contribution, calibration drift (predicted vs realized buckets), trust leaderboard movement, Premium slate size. If calibrated confidence drifts or a layer goes negative for 2 consecutive weeks, it gets fixed or flagged off — no waiting quarters.
- Why this is safe enough to ship: the conjunction gate (Workstream 2) **fails safe**. Its failure mode is *fewer* Premium picks, not *bad* Premium picks. A miscalibrated head or noisy beat vector makes Premium harder to reach, which is the conservative direction.

**Acceptance:** kill-switch rollback demonstrated in staging; backtest reports per layer attached to the launch; first weekly monitoring report delivered 7 days post-launch. Proof: rollback demo log + backtests + report.

---

## 11. Env vars, credentials, founder decisions needed

- `CALIBRATION_ADJUSTMENTS_ENABLED` — reuse existing flag for the calibrated-confidence rollout.
- Reddit API OAuth app (founder creates, you store per repo secret conventions — never in chat, never in the repo).
- Beat writer source list + presser transcript source (founder approves the config).
- Prop feed: existing vendor's props endpoint first (check coverage, report); new vendor only with founder spend approval.
- Public-board flip + v5.3.0 timing (founder call; note v5.2.8 was sequenced for post-first-NFL-Sunday — confirm whether it ships first as a small bump or folds in).

---

## 12. Definition of done (whole project)

1. Workstream 0 green with SQL proof.
2. Per-head calibration metrics beat the heuristic on log-loss/Brier; calibration plots attached.
3. Thresholds refit from backtest; conjunction gate unit-tested; `isPublished` semantics intact.
4. Beat desk ingesting daily with ≥90% entity precision on audit sample; trust leaderboard live; unexplained-steam detector backtested.
5. Prop alignment scoring every covered game; conflicts flagging; anti-circularity proven.
6. Context columns ≥95% populated; weights sane and shrunk where thin.
7. Kill-switch rollback proven; backtests attached; first weekly monitoring report 7 days post-launch; v5.3.0 bumped, proposal doc written, journaled.
8. **Every claim in your final report links to a query, a test, or a plot.** No "it works" without the receipt.

Report back per workstream as you finish it — metrics and proof first, prose second.
