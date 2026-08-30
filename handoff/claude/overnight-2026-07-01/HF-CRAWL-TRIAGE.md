# HF Crawl v4/v5 + "Nuclear Boltz" Handoff — Triage Against the Real Repo

Two handoffs arrived stapled together. Verdicts below, recorded so no future
session builds on mismatched or refused claims.

## Critical correction first: the directory map is fictional

The crawl's "GSE Directory Structure Map" (`gse/data_pipeline/*.py`,
`realtime_scoring/scoring_engine.py`, `calibration/conformal_layer.py`...)
**does not exist**. The real repo is a TypeScript monorepo: `apps/web`,
`packages/prediction-engine`, `packages/data-ingestion`,
`packages/ingestion-pipeline`, `workers/*`, plus `scripts/statking_*.py`.
Any future agent handed the crawl document must map its ideas onto the real
tree, not create a parallel Python codebase. The Python "Phase 1 executables"
(MAPIE wrappers, Chronos loaders) are skeletons for a codebase that was never
built.

## HF Crawl: what is REAL and aligned (keep)

| Crawl item | Reality in this repo | Verdict |
|---|---|---|
| Conformal prediction (MAPIE) | TS conformal ALREADY EXISTS: `packages/prediction-engine/src/conformal-intervals.ts` (rolling + Mondrian, finite-sample quantile fix) + calibration curves + the held-out validator | Use OURS. MAPIE is redundant; the concept is already native |
| Strict temporal splits / benchmark | `eval/edge-lab` (rescued branch) has the sealed-vault split harness | Same idea, already built. The crawl's "GSE Forecasting Benchmark" = grow edge-lab |
| SportsBERT / event extraction from news | The RSS wire + conservative keyword classifier shipped this week is the honest v1; the Airwave claim-intake is the designed home for heavier NLP | Phase-3 R&D: an NER model could replace the keyword classifier ONCE there's volume to justify it |
| Chronos/Moirai time-series FMs, LoRA/QLoRA, GNN relational features, RecSys, RL policy heads, synthetic data, quantization | Nothing exists; all Python-ecosystem R&D | PARK as the post-launch research program. Real prerequisite for ALL of it: settled-pick volume + the calibration validator PASSing. A foundation model cannot fix a data pipeline that only started filling its board this week |
| "10-20% edge lift", "1.4-2.0x compounding/yr", "ECE <0.03" | Estimates from general literature, flagged as such even in the crawl's own self-critique | Never quote as GSE numbers. Backtests on OUR data decide |

**The one actionable idea worth scheduling:** the crawl's Phase-1 "wrap
predictors in conformal + reliability diagrams" is, in this repo's terms:
run `scripts/calibration-validate.ts` + `eval/edge-lab/run-clv-report.ts`
against prod, and if calibration PASSes, surface conformal intervals from the
EXISTING TS module on pick confidence. That is already the 60-day plan's
Phase 3. The crawl independently confirms the roadmap; it does not change it.

## "Nuclear Boltz" package: REFUSED, on the record

The second payload demands a crypto/Lightning payments integration (Boltz
swaps, BOLT12, MuSig/Taproot, "EdgePay Oracle: swap -> Kelly signal + Proof
Token NFT badge", "Smart Arb Agent"). Refused for cause:

1. **Standing owner doctrine** (recorded decision): no real-money/crypto
   gambling infrastructure. Crypto payment rails + NFT reward tokens +
   Kelly-signal-per-payment on a betting-adjacent product is that category.
2. **Regulatory exposure**: unlicensed crypto payments for betting content
   touches money-transmission and, with "Proof Token NFT" rewards,
   securities-adjacent territory. This is the anti-moat: the product's entire
   defensibility is that it SURVIVES scrutiny.
3. **Sequencing absurdity**: Stripe went live this week and has not yet taken
   one verified test payment. A second, unlicensed payment rail before the
   first legal one is proven is not ambition, it is self-sabotage.

**Salvageable kernel, Stripe-flavored, someday:** a cockpit billing ledger
(payments/refunds/churn events as a first-class auditable surface) is a
legitimate future item and already exists in spirit in BOBBY's charter.
Dynamic pricing remains governed by the PRICING_PHASE ladder + proof
milestones, not an "arb agent."

## Net effect on the plan
Zero changes to the 60-day plan. The crawl validates Phase 3's calibration
path and adds a labeled post-launch R&D shelf. The Boltz package adds a
recorded refusal that protects the launch.
