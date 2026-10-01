# Wiring Backlog — 2026-10-01

Source: four parallel read-only recon sweeps over `Beexly/Sports @ origin/main` (`3d9260a47`),
covering (1) the Session 0 inventory (`docs/engine/research/2026-09-30/total-signal-inventory.md`
+ companions A/B/C), (2) the film-pipeline program (`docs/engine/research/2026-09-29/`) +
`docs/ops/total-signal-wiring-program.md`, (3) X analytics sweeps 2026-09-27→30
(`docs/dfs/research/*/full-tables/README.md`), (4) 30 sampled arXiv ADOPT notes + the NGS
metric glossary. Every candidate was checked with 2–3 name/concept grep variants across
`packages/*/src` and `apps/web/lib` (excluding tests/node_modules). **Doc-only mentions never
count as wired.** Per INGEST-AND-LEARN: every UNWIRED item is "queued for evaluation," not dead.

Owner: Motif wires this backlog (Garrett's call, 2026-09-30). Coding agent composes, does not duplicate.

## Corrections to the Session 0 inventory (stale at current main — read first)

- `conformalRdPosture` HAS a production caller — `apps/web/app/api/ops/public-surface-truth/route.ts:998`
  (ops truth route, not the publish path). The inventory's "zero callers" claim is factually wrong.
- The observation-bundle reader path is wired — `loadBundleSurfaces` (`apps/web/lib/intelligence-core/db-loaders.ts:588`);
  `apps/web/app/api/picks/route.ts:277-297` loads all 12 raw surfaces per pick. The "2 of 14 fields"
  claim is stale; only upstream data gaps remain.
- The wiring program's queue #1 premise (devig math broken) is stale — the math is fixed (#965);
  only the asymmetric-input tests are missing (`market-odds-adapters.test.ts:77` still uses
  only `-110,-110` and an invalid `"proportional"` method).
- `activeDfsSlate()` sample fallback is killed (`apps/web/lib/fantasy/engine-slate.ts:2`).

## Tier 1 — the "wire everything" engine core (Session 0 inventory order)

1. **`composeLedger` → published score.** 84,500 signal rows, "fuel with no engine"; zero production
   callers (only populator-internal + read-only loader). `signal-ledger-populator.ts:136-154`,
   `signal-ledger-loader.ts` exist; `index.ts:1040-1042`: "none is wired into the published score."
   STATUS 2026-10-01: WIRED in shadow (PR #988) — `composeByEntity` barrel-exported, new
   `apps/web/lib/ops/signal-ledger-shadow.ts`, census cron returns `data.shadow`. Computed,
   never persisted, never touches the published score.
2. **Player signals table — "the empty core of the total-signal doctrine."** CORRECTION 2026-10-01:
   the sweep's premise was stale — the generic `signals` table EXISTS (Prisma `Signal` model,
   `@@map("signals")`), the WRITER exists (`apps/web/lib/ops/signal-ledger-writer.ts`), and the
   write cron exists and runs hourly (`/api/cron/signal-ledger-write`, vercel.json). The actual gap
   was the READER: nothing read `db.signal` rows into the composer (only the row-counting state
   route). STATUS 2026-10-01: WIRED in shadow (PR #988) — new `apps/web/lib/ops/signal-ledger-store.ts`
   `readStoredSignals(db, filter)`; census cron returns `data.shadowStored` (identical math on the
   persisted ledger) with `storedRows`/`storedDropped` ledger health. Uncomposable rows are dropped
   and counted, never defaulted.
3. **Observation-engine input starvation.** Weather surface structurally empty (zero WEATHER writers;
   the inventory-cited `game-weather-capture.ts` does not exist); universal wiring still market-only
   (`universalSignalsFromPick` → `market.consensus` + `market.devig` only). NWS read path exists
   (`apps/web/lib/weather/game-weather.ts`) but no game-keyed writer.
4. **`tuneSignalWeights` + team crosswalk — the "weight" step.** Zero non-test callers (barrel export only).
5. **Devig oracle + 3 adapters, no production callers.** Math fixed; asymmetric-input tests missing (see above).
6. **NGS weighting into scoring.** Ingestion dark (`nflverse-ngs.ts` typed-access layer wired dark);
   weighting explicitly founder-gated. Internal-only doctrine respected.
7. **Injury trajectory as model signal.** `nfl_injury_trajectory.evaluate` is `return null` (ACTIVE status)
   at `signal-registry-definitions.ts:744`; 7 more ACTIVE-but-null defs (720/768/792/816/840/864/888).
8. **Weather & environment full stack.** Vintage flag default OFF; `nfl_wind_elasticity` reads `WIND_MPH`
   env with zero writers.
9. **Line movement / CLV / sharp signal.** `LINE_ARCHIVE_ENABLED` + `LINE_ARCHIVE_EU_PINNACLE` both
   default OFF. Flag flips are Garrett's call.
10. **Kalshi persistence + Polymarket as calibration inputs.** Fetch wired; snapshot persistence
    deliberately not done (`kalshi-client.ts:22-25`); PM default OFF.
11. **Props + pick'em promotion.** Code wired; `runPropsSlate` has no caller; no cron, no table; optimizer
    flagged off. Garrett's merge + flag-flip.
12. **Sleeper market signals.** Display-side only; `canPublishPicks` hard-`false` (`market-signal.ts:49`).
13. **Coaching/situational.** All 22 extension evaluators read 71 env keys with zero writers.
14. **LLM/narrative signals.** `nfl_beat_desk_corroboration` = BLOCKED_MISSING_SOURCE, rights false,
    weight 0. Rights-blocked, not a code task.
15. **Adjustment layer v1 (T3).** No adjustment layer exists at all.
16. **Off-field intake (T5).** Nutrition/psychology/cognitive, depth charts, practice reports, injury news.
    Zero production code.
17. **Odds API historical backfill pipeline.** Client wired (`odds-api-client.ts`, `odds-credit-ledger.ts`);
    no backfill job/cron. `reservePaidCallSlot` fails open (`odds-credit-ledger.ts:434-435`) —
    budget decision is Garrett's.

## Tier 2 — film pipeline (second-pass review: "top GSE item, upgraded by evidence")

18. **G2 play-segmentation prefilter** — cheapest test (1–2 wks), unlocks G1/G3/G4. Zero hits.
19. **G1 field-anchored telestration** — "highest-value GSE item"; 2–4s telestrated clips. Only interface
    contracts exist (incl. in-flight `cv-detector-contract.ts`, PR #986).
20. **G3 replay discriminator** — replay-as-play error < 1% gate. Zero hits.
21. **G4 vanishing-point calibration (implementation)** — contract-only; zero implementation.
22. **Semantic moment search** (frame embeddings + cosine + pgvector). Zero hits.
23. **Phase 3 automated charting labels → engine** — "the labeled dataset… is the actual long-term moat"
    (variance model, signals table, rankings). Zero hits.

## Tier 3 — high-leverage arXiv ADOPTs (all have concrete GSE specs in-note)

24. **0531 Isotonic Bradley-Terry** — learn rating→win-prob link via isotonic regression instead of assuming
    logistic; "2–3 engineer-days, ~150 lines, low risk." Zero hits (isotonic exists only as post-hoc calibrator).
25. **0955 next-gen-scrapy CPAE pipeline** — public-data CPAE at ρ=0.91 vs proprietary; ~1 day; publish weekly
    QB/defense CPAE tables cross-checked vs official NGS (accept ρ≥0.80).
26. **0065 SportsTraj/UniTraj** — unified trajectory forecasting; beats 9 baselines 11–28% on minADE20; open
    checkpoints. For expected-separation/YAC/tackle-probability features.
27. **0511 Going Deep** — continuous-time within-play valuation (ball-carrier LSTM + RFCDE → per-frame EP/WP
    curves); "the foundational architecture GSE's NGS tracking lane should build on."
28. **1851 CRAFTER corrective feature discovery** — mines the *frozen engine's residuals* with LLM-proposed
    mechanisms + MCTS; eats exactly the playoff/weather/QB-change residual where pick value concentrates.
29. **0506 hybrid simulation** — per-predictor lookback ablation (N∈{4,…,17} by held-out log-loss) + weeks 16–18
    incentive modifiers (locked-seed/eliminated-team discounts).
30. **0126 SportSQL NL→SQL endpoint** — schema validation wired; no NL generation/verification gate. 3–5 days
    via NVIDIA NIM.

## Tier 4 — X-sweep metrics with explicit edge claims

31. **PRFFBall WR triple criterion** (25+ first-read targets, 35%+ air-yard share, 0.25+ TPRR) —
    `docs/dfs/research/2026-09-30/full-tables/README.md`. 64%/84.2%/92% top-12 hit rates since 2021 —
    strongest predictive claim in the window. No GSE composite rule.
32. **RotoDoc Deserved Margins / Expected Scores** ("Luck Rankings") — 2026-09-28 PM. Regression/luck signal
    on nflfastR; no GSE equivalent.
33. **Pass-rush win rate (PFF), EPA/dropback when blitzed, EPA/dropback vs man, explosive play rates (10+/20+),
    run-gap EPA/YPC, duo rate, personnel rates, first-read target share (measured), QB vs-pressure efficiency
    splits, avg drive start, garbage-time snaps, FP/DB, ANY/A** — all inventoried, none implemented
    (34 more Tier B–D items in the full sweep report; proprietary ones need GSE-owned proxies per INGEST-AND-LEARN).

## Tier 5 — NGS glossary unwired

Quick pressures (<2.5s — the glossary's explicit adopt recommendation), time to pressure, get-off, WP
added/cumulative WPA, RECYOE, missed tackles forced, chip blocks faced, OL time-to-pressure/quick-pressure
allowed, double-teamed pressures, vertical receptions, air yards/target, isolated-alignment TDs, field-side
CB completion %, defender ghosting (trajectory prediction), defensive alerts, NGS QB Passing Score TCN,
average speed on carries/at LOS.

## Tier 6 — awesome-apps infra (engine-adjacent, lower priority than raw wiring)

TOON serialization (~64% token cut), hybrid RAG on Neon (dense+pgvector), `devpulse_ai` T4/T5 intake pipeline
("this IS the T4/T5 intake architecture"), critique→revise backtest loop, hash-chained pick provenance
("independently verifiable record"), typed-citation refusal gate, `scope-creep-detector` PR gate,
reasoning-trace QC panel, needle semantic finder, knowledge graph, LMUnit eval rubrics, presser-extraction
pipeline, T4 anomaly cross-referencing, DFS infographic auto-generation, patent/repo watcher.

## Items needing Garrett's call (not builder tasks)

Flag flips: pick'em intakes, `LINE_ARCHIVE_*`, Polymarket, weather vintage, NGS scoring weight.
Data/licensing: 8 shadow-category providers, free-spine secondary source registration
(SOURCE_NOT_REGISTERED), Kalshi persistence migration, LLM/narrative rights, footage sourcing + validation
set for the film pipeline (per his 9/29 pending note), Odds API backfill budget.

## Caveats

- WIRED = mechanism exists as real code; many are `ENABLED=false`/additive/dark — wired ≠ live in the
  publish path.
- DB-count claims (84,500 rows, 0/3493 census) and Vercel prod flag states need DB/credentialed access —
  not re-verifiable read-only.
- arXiv-derived modules wired (24): 0001, 0004, 0126 (schema-only), 0142, 0171, 0174, 0232, 0265, 0290, 0298,
  0323, 0476, 0503, 0549, 0615, 1169, 1648 (offline only), 1649, 1777, 1847, 1987, 2042, 2048, 2127.
  Partial gaps inside: 1169 no explicit `logPool`, 1649 minimum-CRPS training objective unconfirmed,
  0142 kicker-TMLE product absent, 0126 no NL endpoint.
- NGS glossary wired (~24): RYOE, CPOE (+calibration bridge), EPA/dropback, pressure rate, blitz rate,
  YAC/xYAC, air yards, target separation, completion probability, success rate, motion-at-snap %,
  under-center splits, on/off-field splits, coverage matchup tables, target EPA (DB), yards/coverage snap,
  run stuffs, missed tackle rate, scramble EPA, kicker-makes-over-expected, coverage classification,
  internal EP models, draft model scores (partial).
- X-sweep metrics wired (24): TPRR, CPOE, air yard share, success rate, RYOE, xYAC, DAKOTA, XFP, team EPA
  family, points/plays per drive, drive-end distribution, on/off EPA per dropback, scramble EPA,
  pressure/sacks/blitzes, defensive tendency rates (partial), bad-throw %, stacked-box %, PFF facet grades
  (env-gated ingest; charting win rates NOT covered), yards allowed/coverage snap, aDOT, NGS separation,
  red-zone TD%, expected sack-rate delta, two-high shell rate.

## Completed wiring — 2026-10-01 (branch `motif/ledger-shadow-2026-10-01`, PR #988)

All items below are wired as real production code, tested, and pushed. Newly
wired, uncalibrated signals compute in shadow and cannot affect published
outputs (standing directive). Rights postures labeled honestly per item.

### Tier 1 — engine core (commits a459761, d824d2b, a793661 + earlier)
1. **composeLedger → published score (shadow).** `composeByEntity`/`composeLedger`/
   `compositeScore`; stored + fresh signals share one composition path. Bounded,
   read-only; no publication effects.
2. **Stored-signal reader.** Prisma `Signal` writer already existed; reader wired
   (5 tests). The "signals table written, never read" gap is closed.
3. **Game-keyed weather writer** (`a459761`). NWS weather writes finite wind/temp/
   precip rows into `game_signals`; picks route shadows `WEATHER_TRAVEL` (8 tests).
4. **Weight-tuning caller + player crosswalk** (`d824d2b`). Canonical `Player.gsisId`
   crosswalk; `GET /api/ops/signal-weight-tuning` computes verdicts, never persists
   weights (10 tests). Real GSIS↔NGS coverage still to measure.
5. **Devig oracle callers** (`a793661`). `GET /api/ops/devig` exposes all seven
   methods read-only; published scoring's inline fair-value math untouched (needs
   a MODEL_VERSION bump to change) (13 tests).

### Tier 2
1. **Injury-trajectory analyzer caller** (`1513676`). Maps stored injury status
   into the real `analyzeInjuryTrajectory`; cron-secret ops route, read-only,
   500-row bound (6 tests).
2. **Line-movement / steam candidates** (`33e3f2c`). OPEN→latest consensus movement
   from `OddsLineSnapshot` (median across books); |movement| ≥ 2.0 pts flagged as
   steam candidate (observation flag, not a calibrated verdict); sharp-signal
   layer stays default-off (6 tests).
3. **Prediction-market snapshot persistence** (`bf17f14`). Cron persists Kalshi/
   Polymarket independent fair values into `game_signals` (MARKET_SENTIMENT).
   RIGHTS: Kalshi gate closed (paid-required, `isIngestible("kalshi")` false —
   fetcher returns null, cron persists nothing); Polymarket compliance-held,
   default-off. Machinery ready, no bypass (4 tests).
4. **NGS weekly ingestion** (`c224967`). Wednesday cron fetches nflverse's CC-BY-4.0
   NGS assets (receiving/rushing/passing), parses weekly rows, upserts
   `ngs.avg_separation` / `ngs.ryoe_per_att` / `ngs.cpoe` as player signals keyed
   by gsisId. POSTURE: internal-only (2026-09-28 NGS doctrine, HARD); weight=0 on
   every row (NGS weighting founder-gated — shadow only); re-ingest never
   overwrites weight; week defaults to max REG week in data, never invented.
   Verified end-to-end on real assets: 27,322 rows parsed → 138 signal rows,
   0 invalid (3 projection tests).

### Still owed (not blockers on the above)
- Route-level suites for the newer Tier 2 routes (auth/bounds/no-write proofs).
- PR #988 CI + mergeability check after the latest pushes.
- Full web typecheck remains unusable (~25k pre-existing errors); not claimed clean.
- Founder-gated: NGS scoring weight, pick'em flag flips, Polymarket/Kalshi rights,
  Odds API backfill budget, `reservePaidCallSlot` fail-open design, footage sourcing.
