# GSN — Decisions Log

Append-only log of consequential decisions. Newest first. Every entry states the
decision, why, the evidence, and the status. This file is referenced throughout
the GSN doctrine (`CLAUDE.md`, the autonomous-operator brief) but did not exist in
the repo until 2026-06-01 — it is created here so the decision trail has a home.

Labels follow the Evidence Law: `verified` · `inferred` · `recommended` · `speculative` · `blocked` · `unverified`.

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
