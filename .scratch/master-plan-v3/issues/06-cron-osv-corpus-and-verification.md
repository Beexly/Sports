# 06: Cron Split-Brain Guard, markClosingSnapshots, OSV Polyglot Audit & 59-Repo Corpus

**What to build:** Gate off-cadence cron pick minting to authorized Noon Lock / `T-90m` windows while keeping snapshot/closing-line capture active, wire `markClosingSnapshots` into `settle-picks`, add `osv-polyglot-audit.mjs` (`google/osv.dev`), `docker-compose.localstack.yml`, `workers/twitter-bot/wrangler.toml`, `docs/ops/ci-templates/leapwork-and-osv.yml`, `/wizard` setup script, 59-repository `oss-corpus-registry.json`, `overnight-verify-and-ship.mjs`, and complete Vitest + pytest coverage.

**Blocked by:** 05-temporal-localstack-ml-and-arize

**Status:** implemented-awaiting-shell-verify

- [ ] `generate-signal-slate` and `board-fill` do not mint off-cadence picks in production unless inside an authorized Noon Lock / `T-90m` window or explicit override flag.
- [ ] All 59 user-supplied repositories are classified in `docs/data-sources/research/2026-11-15/oss-corpus-registry.json` with zero dropped items.
- [ ] All new TypeScript Vitest tests and Python pytest unit/workflow/integration tests are complete and statically verified against module interfaces.
