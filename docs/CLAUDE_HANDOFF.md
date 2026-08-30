# Claude Handoff - GSE Intelligence Core

Date: 2026-06-24

Branch: `codex/intelligence-core`

Worktree: `C:\Users\Garrett\Sports-intelligence-core`

Status: all checklist slices through F3 are built, locally committed, and pushed. FINAL handoff is committed at `1f2e8dd4`; the audit follow-up confirms the branch state and adds `docs/INTELLIGENCE_CORE_AUDIT.md`.

Final gate result: repo `typecheck` passed; repo `lint` passed; full web Vitest passed; repo `build` passed with existing Sentry/OpenTelemetry, stub-Prisma, and edge-runtime warnings; trust/model-freeze/draft-only passed.

## Branch State By Slice

| Slice | Commit | State |
|---|---:|---|
| Slice 0 | `0c13254f` | Day-0 surface audit, branch/files check, nflverse access probe |
| A1 | `94ee8bb8` | LadderEvent shadow reducer, append-only model, invariant tests, two-track rung requirements |
| A2 | `84d666ee` | GameSettledEvent heartbeat and idempotent DATA/FORECAST/PROOF/UNLOCK fan-out stub |
| E1 | `8303eec8` | Replay and historical-backtest harness over nflverse regular-season data |
| B1 | `95524c2f` | Feature-store interface over metrics plus coverage-map rows and persistence seam |
| B2 | `4e4a5560` | Player-rate shrinkage layer with empirical-Bayes posteriors and published weights |
| B3 | `52c39ecd` | Market-anchored team yards/TD reconciliation with derived fantasy points |
| BT | `9684385e` | Tweedie baseline projection, ACI intervals, Clark-West harness scoring |
| B4 | `7bfb81ff` | Earned-weight ensemble with bounded loss and Clark-West gates |
| B5 | `635c6c44` | Adaptive Conformal Inference, Mondrian by position, rolling recalibration |
| B6 | `d7d56828` | Self-publishing calibration harness and publish-criteria definition only |
| C6 | `5c4e6f75` | Correlation/copula layer for best-ball/parlay consumption |
| C1 | `2511a89e` | Regression/breakout engine |
| C2 | `305776e9` | Opportunity and role-migration engine |
| C3 | `9ef7304f` | Game-script engine |
| C4 | `005a4325` | Availability/return and role-tenure engine |
| C5 | `3e44a995` | Unified divergence layer |
| D1 | `81907adc` | Cross-market triangulation through player props |
| D2 | `9dc2bfac` | Options-style distribution outputs |
| D3 | `f05af2c3` | Model-parliament public CRPS leaderboard feed, flagged |
| D4 | `7ded99ed` | Replayable-provenance endpoint, flagged |
| D5 | `d1aea679` | Community calibration-tournament scaffold, draft-only-safe |
| D6 | `d20e9b5c` | Active-learning uncertainty map |
| E2 | `d00a4b78` | Scoring-rule and reliability-diagram reporting |
| E3 | `0a039722` | Pipeline trace id, degradations, and Board-health badge |
| F1 | `0b1c8317` | Persist-what-we-fetch serving-table/interface seam |
| F2 | `eb44b04b` | Coverage-map UI data |
| F3 | `42b0c882` | Phase-0 cost-slice confirmation |
| FINAL | `1f2e8dd4` | Final decisions and Claude handoff |
| AUDIT | `e72e420e` | Full branch recheck and provenance polish |

## Safety Invariants

- No commits were made to `master` or `main`; work stayed on `codex/intelligence-core`.
- No secrets, money paths, production resources, pricing rungs, `PROJECTIONS_PROVIDER`, or `canPublishProjections` were changed.
- New estimators and public-facing feeds are shadow, draft-only, flagged off, or `priced=false` until real out-of-sample proof and owner approval exist.
- Calibration proposals are draft-only. No `IMPLEMENTED` calibration proposal or `MODEL_VERSION` promotion was created.
- The market anchor conserves team yards and touchdowns. Fantasy points are always derived output, never the conserved team total.
- Conformal intervals use Adaptive Conformal Inference with Mondrian-by-position logic.
- Promotion gates use Clark-West against market-only and equal-weight baselines with purged/embargoed walk-forward discipline.
- The ladder has separate fantasy and betting tracks. Fantasy MAE/coverage cannot unlock betting CLV, and betting CLV cannot unlock projection publication.

## Human Gates

- `[OWNER]` Merge, deployment, public publication, live-money actions, Stripe price creation, pricing rung flips, Vercel ignored-build wiring, and public feed enablement.
- `[INFRA]` Provision `R2_FEATURE_STORE`, `R2_FETCH_ARCHIVE`, DuckDB `feature_store.*` / `fetch_store.*`, durable hash-chain storage, tournament storage, trace storage, alerts, CDN rollout, and source-snapshot retention/pruning.
- `[DATA]` Load real historical projection/outcome rows, learn model coefficients, tune thresholds, validate minimum samples, produce Clark-West reports, bump `MODEL_VERSION`, and approve any model promotion.
- `[SCHEMA]` Generate, review, and apply migrations such as `LadderEvent` to the target database environment.

## Next 5 Tasks For Claude

1. Review `docs/EXECUTION_LEDGER.md`, `docs/DECISIONS_TO_RATIFY.md`, `docs/PHASE0_COST_SLICES.md`, `docs/INTELLIGENCE_CORE_AUDIT.md`, and this handoff before touching deployment or production settings.
2. Ratify or decline the `[SCHEMA]` migration path for `LadderEvent` and choose the target database environment.
3. Provision or defer the `[INFRA]` seams for R2/DuckDB feature-store and fetch-store persistence, then wire only the reviewed implementations.
4. Load real historical projection/outcome rows into the replay harness and produce purged/embargoed out-of-sample Clark-West reports before any promotion.
5. Decide which owner-gated surfaces remain hidden or become enabled after minimum samples: public calibration observatory, model parliament, replay provenance, tournament, and expanded coverage-map claims.

## Stop Condition

After FINAL commit and push, Codex stops. Claude should treat this branch as code-ready pending human review, not live-ready.
