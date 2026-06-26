# Handoff prompt — paste into a fresh Claude (Claude Code in the repo is ideal)

**First, connect both folders so Claude can read/run everything:**
- Repo (branch `codex/intelligence-core`): `C:\Users\Garrett\Sports-intelligence-core`
- Strategy & decision docs: `C:\Users\Garrett\Documents\Claude\Projects\AI Sports`

---

You are picking up the Galaxy Sports Edge (GSE) intelligence build. Everything you need is in the two connected folders.

READ FIRST, in order: `START_HERE_GSE.md`, then `GSE_GO_DECISION.md`, `GSE_BACKTEST_AND_FIXES_STATUS.md`, and on the branch `docs/CLAUDE_HANDOFF.md` + `docs/EXECUTION_LEDGER.md`. Precedence if anything conflicts: `GSE_INTEL_00_RIGOR_PASS.md` > the corrected briefs (`GSE_CODER_KICKOFF`, `GSE_CODEX_AUTONOMOUS_EXECUTION`) > the design docs (`GSE_INTEL_01–05`). Load-bearing corrections: the market anchor conserves team YARDS and TDs (fantasy points are derived, never "fantasy points = team total"); intervals use Adaptive Conformal Inference; the proof ladder has two tracks (fantasy MAE vs betting CLV).

BRANCH STATE: ~28 slices are built as shadow / `priced=false` scaffolds and were verified real by a 5-lens review (integration B−, math A−, tests A, safety A−, revenue A−). A prior session fixed the conformal coverage bug (`conformal-intervals.ts`, `tweedie-aci.ts`) and added a Tweedie truth-in-labeling note, but COULD NOT run the gate (sandbox was down) — treat those edits as pending one verification run.

YOUR TASKS, in order. Work autonomously — never stop to ask; choose the most reversible option, log it, proceed:
1. VERIFY the pending edits: `npm run typecheck && npm run lint && (cd apps/web && npx vitest run) && npm run build` + `node scripts/guardrails/{trust-gate,model-freeze,draft-only}.mjs`. Fix anything red.
2. RUN THE BACKTEST and report real numbers: `NODE_OPTIONS=--use-system-ca npx tsx scripts/backtest/player-projection-backtest.ts 2021 2022 2023`. Report model MAE vs naive-baseline MAE and `beats NAIVE`. This is "model vs naive points-persistence on REAL data" — NOT yet "beats the Vegas market" (that needs historical player props, a `[DATA]` follow-up). If it beats naive on a healthy sample, that's the evidence to attach to a DRAFT calibration proposal.
3. APPLY the remaining work order from `GSE_GO_DECISION.md` §3 — yard-pool split in the reconciliation, ADMIN-gate the leaky `airwave/*` + `media/readiness` + `health/synthetic-monitoring` endpoints, add `PROJECTIONS_PROVIDER` + `STRIPE_FANTASY_*` to the `.env` templates, wire the `LadderEvent` reducer + observatory readouts in shadow. Each = one additive, flagged, tested commit, full gate green, a row appended to `docs/EXECUTION_LEDGER.md`.

HARD RULES (binding): branch only, never `main`/deploy; never touch money/secrets; never flip `canPublishProjections` / `PROJECTIONS_PROVIDER` / pricing rungs — build behind OFF flags; new estimators stay `priced=false` until they beat baseline out-of-sample (Clark-West, purged/embargoed CV); you may only create DRAFT calibration proposals — the flip to IMPLEMENTED + any MODEL_VERSION bump is a human action; guardrails stay green; no fabricated data; server-side enforcement only.

OWNER-GATED — do NOT do these; flag them for the owner: create live Stripe Fantasy prices, flip the live switches, merge/deploy, provision infra (R2/DuckDB/Oracle VPS), apply DB migrations.

When the buildable work is done, update `docs/CLAUDE_HANDOFF.md` with the new state + next tasks, and stop.
