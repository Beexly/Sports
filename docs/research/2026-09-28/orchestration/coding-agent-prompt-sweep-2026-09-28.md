# Coding agent prompt — GSE all-day autonomous sweep (2026-09-28)

You're working Beexly/Sports, branch motif/orchestration-v4-2026-09-28. The repo's own rules govern everything: AGENTS.md (auto-loaded) is the contract, docs/INDEX.md is the bucket map for where research lives.

Key standing rules already in the repo: the ingest-and-learn doctrine (AGENTS.md top + docs/governance/ingest-and-learn-doctrine.md — nothing is dead until tested, cited, and confirmed; untested items are UNTESTED, queued for evaluation; we ingest, we learn — never use commercial data commercially or sell their data); the public/private surface doctrine (public site shows projections and rankings ONLY — all data, metrics, signals, methodology stay internal); the NGS internal-only doctrine (NGS is reasoning fuel, never shown publicly, nothing commercial touches it).

Today's backlog — work it in order, then loop:

1. Foundation chain (each unblocks the next): lock the projection source → register a live DFS slate provider (activeDfsSlate() currently falls back to ILLUSTRATIVE_DFS — the optimizer in apps/web/lib/fantasy/ already exists, do NOT build another) → build adjustment layer v1 → populate player signals → add off-field intake → backtest every rule → then rankings (rest-of-season, weekly, positional, weeks 4–10 onward).

2. HF evaluation queue (docs/engine/research/2026-09-28/hf-gse-inventory.md + hf-leverage-round2-2026-09-28.md): the NFL datasets and sports predictor Spaces are UNTESTED — run the defined tests (ingest, inspect schema/provenance, call live APIs, log predictions, write up the method you learn). Prototype tracks: Qwen3 internal Space, bge-m3 embeddings over the research corpus, Parakeet transcription. Chronos/time-series stays gated behind projection-source lock + backtests. Respect licenses: research/learn-only where restricted, never in product.

3. Public/private re-fencing: the audit (docs/research/2026-09-28/orchestration/public-private-surface-doctrine.md) found 13 definite exposures — move them behind the fence.

4. GCP is the FINAL phase only (docs/engine/research/2026-09-28/gcp-final-bow-plan.md): full-scale GPU backtests on the final build, production hosting, final validation. Only after the engine is set up, calibrated, and weighted. The trial is unclaimed; signup/billing are the founder's taps — do not start the 90-day clock.

Boundaries: never touch gse-grok-build-sandbox. DraftKings hidden-endpoint and FanDuel questions are unresolved — do not wire scraped feeds; contracted providers only. Nothing posts publicly without the founder.

The loop: when the backlog is done, go back to exploration → investigation → research → wiring → calibration → testing, over and over. Keep working until everything is tested and improved. Make aggressive decisions. Push or merge everything to the remote — nothing lives only locally; file research in the right bucket per docs/INDEX.md.
