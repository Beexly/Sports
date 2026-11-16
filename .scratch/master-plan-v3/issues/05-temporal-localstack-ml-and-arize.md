# 05: Temporal SlateWindowWorkflow, LocalStack/R2 Receipts, ML Service & Arize OOS Backtest

**What to build:** Implement durable `SlateWindowWorkflow` (Wed/Fri/Sun Noon Master Locks + `T-90m` differential adjustments + LIFO Saga compensation), `S3ReceiptArchiver` (`boto3` targeting LocalStack dev / Cloudflare R2 prod), `gse-ml-endpoints.ts` wiring `gse-ml-service` (`/predict/etkf`, `/predict/tda`), `Arize AX` walk-forward calibration evaluator (`real_money_stake_cleared: false` whenever `ECE > 0.035`), post-gate `Genkit` prose flow, and `python-fire` `gse_engine.cli`.

**Blocked by:** 03-cage-seal-and-live-surfaces, 04-python-engine-and-dfs-doctor

**Status:** implemented-awaiting-shell-verify

- [ ] `SlateWindowWorkflow` executes LIFO Saga compensation cleanly when Neon persistence or CAGE policy fails.
- [ ] `S3ReceiptArchiver` writes SHA-256 verified receipts to LocalStack (`localhost:4566`) or in-memory test fakes with zero paid AWS resources.
- [ ] `evaluate_walk_forward_calibration` blocks `real_money_stake_cleared` whenever `ECE > 0.035` or `decided_clv_beat_rate < 0.50`.
