# HERMES REASONING-ENGINE INTEGRATION LEDGER (2026-10-13)

What the reasoning layer (intelligence/reasoning + reasoning_engine) produced
today, and the exact repo surfaces it now feeds. Companion to the audit:
docs/ops/REASONING-AUDIT-2026-10-13.md.

## Produced today (all pushed, branch fix/galaxy-odds-first-2026-10-08)

| Artifact | Path | Proof |
|---|---|---|
| L4 Bayesian spine | intelligence/reasoning/{signals,bayes}.py | PHI 0.51 -> 0.5338 (Kalshi + air-density LR), step math shown |
| Market priors (every game) | intelligence/reasoning/market_priors.py | DK -120/+100 de-vig -> 0.5217/0.4783, booksum recorded |
| Slate board emitter | intelligence/reasoning_engine/emit_slate_board.py | 15/15 boards on tonight's slate; per-side posteriors on ML rows |
| Analyst layer (the product) | intelligence/reasoning/analyst.py | DAL@PHI "Trench Funnel" card: 7 domains, sourced chain, breaking conditions, cross-anchor AGREE (delta 0.0117), fused posterior 0.5158, conviction 70/100 |
| Matchup engine | intelligence/matchups/matchup_engine.py | WR1/WR2/TE1/RB1 pairings vs on-report coverage/front; Barkley/Williams rows |
| Empirical copula in L4 | intelligence/reasoning/bayes.py | rho=0.6995 from 1,088 team-games -> sqrt(rho) damping, matrix cell cited |
| Stored-signal env bridge | packages/ingestion-pipeline/src/stored-signal-env-bridge.ts | closes the silent weather leak in generateSignalSlate (prod cron) |
| Corpus leverage sweep | docs/ops/SWEEP-2026-10-13-CORPUS.jsonl | 1,038 verified rows |
| Gates wiring sweep (census-corrected) | docs/ops/SWEEP-2026-10-13-GATES.jsonl | 229 rows; 186 landed-not-wired; 4 rows parent-corrected |

## Integration map (reasoning output -> repo surface)

1. ranked_board.bayes_updates -> docs/predictions/research/<date>/ cards
   (analyst.py fuses the posterior + cross-anchor verdict into the card text).
2. emit_slate_board traces (intelligence/reasoning_engine/traces/) are the
   machine-readable per-game record: priors, posteriors, per-side ML pairs,
   analyst-card metadata. Consumers: any cron/reporting surface (below).
3. stored-signal-env-bridge -> generateSignalSlate: DB weather now reaches the
   wind-elasticity tilt. This is the first reasoning-layer correction landed
   INSIDE the production TS pipeline.
4. matchup chains -> analyst cards (domain: matchup) -> same corpus discipline.

## Next integration points (candidates, not yet wired)

- apps/web/app/api/cron/engine-dfs-slate (READ-ONLY receipt) could include
  slate-board metadata (thesis + conviction per game) in its report - read-only,
  no new write path, follows the repo's own lesson about writes deserving review.
- props-slate-shadow: when the founder flips PROPS_SLATE_SHADOW_ENABLED, the
  copula-damped LR table is the honest correlation input the shadow slate lacks.
- The 186 landed-not-wired rows: 165 wire points point at
  generate-signal-slate.ts. Harness-level wiring (registry extensions with
  DARK->ACTIVE promotion) is the scalable path; one-by-one wiring is not.

## Honest limits

- The card's LR table (air_density 1.10, wind 1.05) is a DECLARED heuristic
  pending backtest calibration against settled games; every step carries its
  verification label so the calibration pass can find them.
- Injury coverage: ESPN digest lists only report players; healthy starters are
  a named gap, not data.
- Kalshi digest volume is thin (open-market snapshot); priors cross-checked
  against DK de-vig every run via the cross-anchor check.
