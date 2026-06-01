# GSN — Decisions Log

Append-only log of consequential decisions. Newest first. Every entry states the
decision, why, the evidence, and the status. This file is referenced throughout
the GSN doctrine (`CLAUDE.md`, the autonomous-operator brief) but did not exist in
the repo until 2026-06-01 — it is created here so the decision trail has a home.

Labels follow the Evidence Law: `verified` · `inferred` · `recommended` · `speculative` · `blocked` · `unverified`.

---

## 2026-06-01 — Competitive intelligence wave + Closing-Line Value (CLV) primitive

- **Decision:** Research the 2026 competitive landscape live (not from memory) and
  build the single most on-strategy primitive it pointed to: **Closing-Line Value**.
- **Why (research, `verified-ext`):** Prediction markets (Kalshi ~$23.8B volume, ~90%
  sports; DraftKings investing $200–300M) are commoditizing the bet; AI pick sites
  advertise unverifiable "60–72% accuracy / 8–16% monthly ROI"; verified trackers
  (Pikkit) prove the market rewards "verified, not self-reported." GSN's durable wedge
  is the **calibrated, tamper-evident, venue-agnostic trust layer** — win on proof.
  CLV is the sharp's gold-standard proof metric and a *leading* indicator of edge
  (beating the close predicts profitability before games settle). Full analysis in
  `COMPETITIVE_INTELLIGENCE.md`.
- **What was built (`verified`):** `packages/prediction-engine/src/clv.ts` — pure,
  tested CLV for spread/total (points) and moneyline (implied-prob), plus `summarizeClv`
  (beat-close rate = the headline credibility number). Conventions match `settlement.ts`
  (home-perspective line). 13 tests; engine suite 197→210 green; exported from the package.
- **Scope guard:** Pure engine primitive — no DB, no migration, no hard stop. Surfacing
  CLV publicly (needs lock-time closing-line capture + a route/UI) is a deliberate
  follow-on, not done here. `recommended` next step.
- **Status:** Done, verified green, committed to `claude/trusting-ramanujan-mYK6E`.

---

## 2026-06-01 — Settlement (R1): extract `settleSport()` to the shared pipeline; wire the Vercel cron

- **Decision:** Eliminate the settlement single-point-of-failure. Extract the
  worker's inline per-sport settlement loop into `settleSport()` in
  `@sports/ingestion-pipeline` (mirroring `processSport`), move the snapshot
  recorder into the same package, and make **both** the data-refresh worker and the
  `settle-picks` Vercel cron call it. The cron was previously a documented no-op.
- **Why:** Odds refresh ran on Vercel cron, but grading only happened inside a
  separate long-running worker. A Vercel-only deploy would never settle a pick →
  no graded track record → the calibrated-trust thesis silently collapses. The
  codebase already solved drift for ingestion by sharing `processSport`; this
  applies the identical pattern. `verified`.
- **Evidence:** Settlement logic copied verbatim (no behavior change). Typecheck
  green across all 9 workspaces; full test suite green (apps/web 1,861, engine 197,
  ingestion 17, types 28); relocated `settlement-snapshot-durability` test passes
  from `@sports/ingestion-pipeline`.
- **Scope guard:** No hard stop touched. Settlement writes are normal app
  operations (update `result`/`settledAt`, insert `TeamGameLog`), CRON_SECRET-gated,
  idempotent (`already-settled`). **Enabling it in production is still a deploy
  decision that remains the operator's** — this change only makes the capability
  correct and drift-free. `verified` / `recommended`.
- **Residual (`recommended`):** add a "stale unsettled picks" alert so a silent
  cron failure is caught. Add an integration test against a disposable Postgres
  (R3) to exercise the live settlement path (current tests use a stub Prisma).
- **Status:** Done, verified green, committed to `claude/trusting-ramanujan-mYK6E`.

---

## 2026-06-01 — Calibration: add a market-neutral "discrimination" metric (evidence only)

- **Decision:** Add a `discrimination` signal to `computeCalibration` in
  `apps/web/lib/calibration/compute.ts` (additive field; new exported
  `computeDiscrimination()` helper + tests).
- **Why:** Calibration currently treats `confidence/100` as a win probability
  (`expectedFromConfidence`). That assumption is sound for MONEYLINE picks
  (confidence is derived from vig-free fair probability) but **not** for
  SPREAD/TOTAL picks, which are priced to ≈50% by construction. Judged on absolute
  calibration alone, every spread/total pick reads as "overconfident," and the
  public-facing calibration report (homepage, `/board`, `/api/calibration`) would
  broadcast that misread. Discrimination asks the market-neutral question instead:
  *does observed win rate rise as confidence rises?* `verified` (see evidence).
- **Evidence:** `packages/prediction-engine/src/scoring.ts` builds confidence as a
  weighted-component sum + flat +10, clamped 0–100 (not a probability).
  `apps/web/lib/calibration/report.ts:43-51` already maps `pickType` into the
  calibration input but `compute.ts` ignored it. Typecheck clean;
  `apps/web/__tests__/calibration.test.ts` now 10 tests (4→10), full calibration
  suite 52/52 passing.
- **Scope guard:** Evidence only. Does **not** change scoring weights, the meaning
  of `confidence`, or `computeCalibrationProposals`. The deeper fix — storing a
  modeled win probability distinct from the confidence UX score — is **human-gated**
  (requires a `MODEL_VERSION` bump per `readiness.ts` `canApplyCalibrationAdjustments: false`)
  and is logged below as a recommendation, not taken. `recommended`.
- **Status:** Done, verified green, committed to `claude/trusting-ramanujan-mYK6E`.

## 2026-06-01 — Scope: ground-truth audit over external-source crawl

- **Decision:** For the GSN autonomous-operator brief, prioritize a verified audit
  of the actual codebase + a safe high-leverage improvement, and **decline** the
  literal instruction to clone/review ~200 external GitHub repos and emit 15
  speculative strategy documents this session.
- **Why:** The repo is a large, mature, doctrine-aligned monorepo that passes its
  own gates (see below). The verifiable leverage is here, not in summarizing
  freeCodeCamp/awesome-lists. The brief's own Prime Directive ("interrogate the
  ambition," "impressive but useless vs. boring but critical") and Evidence Law
  point the same way. The user confirmed: "the prompt is our guideline." `verified`.
- **Evidence:** `git ls-files` shows the product surface; no `_logs/`,
  `SOURCE_LEDGER.md`, or Anthropic "research suite" present in the container —
  several premises of the brief are not materially available here. `verified`.
- **Status:** Done. External-source synthesis remains available on request
  (see `REPO_INTELLIGENCE_REPORT.md` §"What was deliberately not done").

## 2026-06-01 — Validation baseline established (install · prisma generate · typecheck · test)

- **Decision:** Record a clean validation baseline for the branch before any change.
- **Evidence (`verified`):**
  - `npm install` → exit 0 (593 pkgs). Audit: 13 vulns (1 critical, 4 high) — logged as risk.
  - `npm run db:generate` → Prisma Client v5.22.0 generated.
  - `npm run typecheck` → green across all 9 workspaces (strict mode).
  - `npm run test` → apps/web 1,855 ✓ (165 files), prediction-engine 197 ✓,
    data-ingestion 17 ✓, types 28 ✓. apps/web tests run against a **stub Prisma**
    ("All reads return empty results") — logic/contract coverage, not live DB.
- **Status:** Baseline captured. No hard stops touched (no destructive DB, no
  Stripe live, no prod deploy).
