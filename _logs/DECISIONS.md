# GSN — Decisions Log

Append-only log of consequential decisions. Newest first. Every entry states the
decision, why, the evidence, and the status. This file is referenced throughout
the GSN doctrine (`CLAUDE.md`, the autonomous-operator brief) but did not exist in
the repo until 2026-06-01 — it is created here so the decision trail has a home.

Labels follow the Evidence Law: `verified` · `inferred` · `recommended` · `speculative` · `blocked` · `unverified`.

---

## 2026-06-01 — Best-of-2026 improvement wave (cross-department, all verified green)

Acting on the 7 specialists + Codex digest, shipped a series of safe, verified
improvements (each its own commit; full suite + build green throughout):
- **Trust surface re-skin** — calibration panel off casino green/red onto brand
  tokens (verify/alert/ion) + non-color glyphs (a11y).
- **SEO** — bespoke proof-led homepage metadata; fixed www/apex canonical mismatch.
- **Model orchestration** — `model-router.ts` (`pickModelForSurface`) + opt-in prompt
  caching; zero behavior change today, flips become validated one-liners.
- **Conversion** — locked confidence/edge + factor-breakdown now link to `/pricing`
  (dead end → highest-intent CTA).
- **Shareable proof** — `/performance` OG card so shared track-record renders the wedge.
- **Hygiene** — scrubbed stray test cruft from `seed.ts` (verified whole, not truncated).
- **Consolidation** — `CLAUDE_CODEX_HANDOFF.md` (15 prior docs deduped) +
  `RISK_AND_FAILURE_REGISTER.md` (every finding, status, owner action).
- **Key reconciliation:** shipping brand is **Galaxy Sports Edge (GSE)** in code/domain;
  "GSN" is brief-only. Flagged for a founder naming decision (not renamed).

---

## 2026-06-01 — Pricing & packaging: set Founding rates + a named proof-gated ladder

- **Decision:** Replace weekly billing with **monthly + annual**, reprice to be
  category-competitive for an unproven brand, and codify a **named price-escalation
  ladder** (FOUNDING→PROVEN→ESTABLISHED→AUTHORITY) gated by proof milestones, with a
  **lifetime grandfather guarantee** for early members. Live phase = FOUNDING.
- **Why (data, `verified-ext`):** Dimers Pro (proven) is $24.99/mo; GSE shipped
  $9.99/wk ≈ $43/mo — priced *above* proven incumbents while pre-record. Weekly billing
  fires loss-aversion ~52×/yr and hides true cost. Grandfathering removes the 10–15%
  price-increase churn spike; value-paired increases lift retention ~26%; documented
  transition policies cut escalations ~25%. Full research: `COMPETITIVE_PRICING_AND_PACKAGING.md`.
- **Live (FOUNDING):** Pro $14.99/mo · $99/yr; Elite $24.99/mo · $179/yr. Ladder rises
  with proof (PROVEN $19.99/$29.99 @ ≥100 settled + published calibration; ESTABLISHED
  $29.99/$49.99 @ ≥500 settled + verified CLV ≥52.4%; AUTHORITY $39.99/$69.99).
- **What changed (`verified-code`):** `lib/pricing/pricing-phases.ts` (new single source of
  truth) → `lib/stripe.ts` derives `PRICE_DISPLAY` from the live phase + 4 interval price
  IDs + `getStripePriceId`; checkout accepts `interval`; new `pricing-plans.tsx` client
  toggle; pricing/faq/picks copy + CLAUDE.md + .env.example updated; `pricing-honesty` test
  rewritten + `pricing-phases` test added. Also fixed an Elite overpromise in the picks
  upsell (claimed early access/analytics that don't exist yet).
- **Scope guard:** No live Stripe / money touched. Operator must create the 4 **test-mode**
  Stripe prices and set the env vars; advancing `PRICING_PHASE` is a deliberate human action.
- **Evidence:** typecheck clean; full suite green (web 166 files); production build green
  (`/pricing` compiles); trust-gate clean (271 files).
- **Status:** Done, verified green, committed to `claude/trusting-ramanujan-mYK6E`.

---

## 2026-06-01 — P0 BUG FIX: away-favored SPREAD picks were mis-graded

- **Severity:** Critical (trust-fatal). Found via an end-to-end probe.
- **Bug:** `scoring.ts` stored a SPREAD pick's `line` as `chosenSpread` — which is
  AWAY-perspective for away-favored picks — but `settlement.ts`, `OpeningLine`,
  `Game.openingSpread`, line-movement, and the CLV helpers all treat `line` as
  HOME-perspective. Net effect: an away favorite that FAILED to cover was graded a
  WIN. This silently corrupts win rate, calibration, and CLV — the entire public
  track record the brand is built on. `verified` (probe: away -6 winning by only 3
  returned WIN instead of LOSS).
- **Fix:** store `line: avgSpread` (home-perspective) in scoring; the chosen-side
  display number still lives in `selection`. Suppressed the now-redundant raw-line
  row in `pick-card.tsx` for SPREAD (it would contradict the selection). Added
  `spread-line-convention.test.ts` — an end-to-end score→settle regression (3 tests).
- **Evidence:** engine suite 210→213 green; full suite green (apps/web 1,861, engine
  213, ingestion 17, types 28); web typecheck clean; pick-card/picks suites green.
- **Operator follow-up (`recommended`):** any away-favored SPREAD picks already
  settled in a real DB under the old logic are mis-graded and would need re-grading.
  Not touched here (no real DB access; re-grade is an operator action).
- **Status:** Done, verified green, committed to `claude/trusting-ramanujan-mYK6E`.

---

## 2026-06-01 — VISIBLE: public Calibration & Discrimination panel on /performance

- **Decision:** Ship the "lead with the scoreboard" strategy as real UI. The
  `/performance` page was titled "Calibration Report" but only rendered win/loss
  tables. Added `components/performance/calibration-panel.tsx` — a polished server
  component rendering the **reliability curve** (observed vs. expected per bucket),
  the **Brier score** with a plain-English read, and the new **discrimination
  verdict** as the honest headline. Mounted as the lead section on `/performance`
  (gate-open) and as a "how we'll prove it" showcase in bootstrap mode.
- **Why:** "Best website of 2026" = visible trust. This makes calibration the public
  hero — the proof-not-promises wedge — and turns the bootstrap empty state into a
  methodology showcase instead of a dead end. `verified`.
- **Guardrails respected (`verified`):** numbers all rendered from
  `loadPublicCalibrationReport()` at request time (none hardcoded); no win-rate math
  in the component (policy-only-winrate clean); no banned vocabulary (trust-gate
  clean, 269 files); component lives outside the page-scanned set. Typecheck green;
  full suite green; 10 policy/copy-scan suites green.
- **Status:** Done, verified green, committed to `claude/trusting-ramanujan-mYK6E`.
  Follow-on: wire CLV into the same panel once lock-time closing-line capture lands.

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

---

## 2026-07-15 - Canonical intelligence flight recorder and recovery disposition

- **Decision:** Use one immutable `PickEvidenceEnvelope` as the truth object and derive lifecycle events, audience projections, epistemic deltas, cited decision explanations, and every downstream consumer from it.
- **Why:** Game Room, Twin, Brain, autopsy, and Studio must not drift into separate explanations of the same decision. A deterministic ledger can show what changed while refusing unsupported causal attribution.
- **Safety:** PUBLIC never receives raw internal output, raw source payloads, paid movement/dispersion, or unentitled factor trails. Missing historical facts remain `NOT_CAPTURED`; incomplete PASS rows withhold.
- **Persistence:** No migration was authorized. `GateDecision` still lacks a complete immutable quote/threshold snapshot and pick-specific calibration effect; the additive design remains proposal-only pending owner approval and shadow-DB proof.
- **PR decision:** Draft PR #112 is the single replacement review surface. Stale extracted PRs #80/#81/#83-#87/#89/#92-#95 were commented and closed unmerged. PR #101 remains an owner-gated hold.
- **Evidence:** 9,309 tests; root typecheck/lint; production build with 205 routes; full guardrails; exact no-excuse checker on 32 files; desktop/mobile Playwright with zero axe WCAG A/AA violations, reduced motion, keyboard operation, and 200% zoom.
- **Production boundary:** Public access and deployment identity were later verified: apex `307` to `www`, `www` `200` without an SSO wall, READY production `main` SHA `3ce5c4a1`. The recovery branch is not production; live DB/cron/provider state and a real persisted playback record remain unverified.

## 2026-07-16 - Selected-game Cockpit playback uses the Game Room envelope

- **Decision:** Wire owner-only `/cockpit/market-twin/[gameId]` to the existing Game Room playback envelope and `buildPlaybackConsumerBundle()` instead of creating another event store.
- **Why:** Operators need a selected-game Cockpit view of the same Twin and deterministic Brain explanation already produced by the governed playback stream. A second store would create explanation drift.
- **Safety:** `requireCockpitAdmin()` runs before data loading; unavailable and withheld states are explicit; raw model output is excluded; the Brain answer is citation-backed and says causality is not inferred.
- **Evidence:** Focused Cockpit/static suite 164/164; browser QA desktop/mobile with axe and 200% text zoom; root lint/typecheck/test/guardrails/build green; exact TypeScript no-excuse checker clean.
- **Boundary:** No production DB, migration, cron/provider, deployment, secret, or publication action occurred. Browser proof used a production-board game ID against local stub DB and therefore proves the honest unavailable path, not a live playback row.

## 2026-07-16 - Selected-game Cockpit exposes autopsy and draft-only Studio projections

- **Decision:** Extend the same owner-only selected-game Cockpit route to render `bundle.autopsy` and `bundle.mediaStudio` from `buildPlaybackConsumerBundle()` instead of adding a Studio publisher, fixture event source, or second autopsy store.
- **Why:** Postgame learning and content preparation must stay attached to the immutable Game Room envelope. Rendering the already-derived projections makes the operator surface useful without allowing explanation drift.
- **Safety:** The autopsy section says unavailable when settlement evidence is not captured; the Studio section is read-only, `DRAFT_ONLY`, human-review-blocked, and exposes no external posting button or mutation path. Unavailable playback still renders none of Brain/autopsy/Studio.
- **Evidence:** Focused Cockpit/static suite 165/165; selected-game tests cover captured autopsy, draft-only Studio package, preflight blockers, no posting action, unavailable non-invention, and raw-output exclusion.
- **Boundary:** This remains code/local verification only. No live eligible playback row, production deployment, migration, production DB, provider, cron, secret, or publication action was touched.

## 2026-07-16 - Owner adjudication of the PR #112 HOLD findings applied on-branch

- **Decision:** Implement the founder's four rulings exactly: (R1) keep the 72h auto-void but gate the sweep on a healthy scores feed (`feedError === null`); (R2) CLV continuity first — receipt-gated CLV is forward-only from `RECEIPT_MARKET_CONTRACT_EPOCH`, probability-space averaging is restored as the close derivation of record, the retroactive CLV backfill onto settled picks is reverted, and every settled pick resolves terminally (`clvGradedAt` stamped even when ungradeable); (R3) the public performance population is every published, non-bootstrap settled pick — the snapshot/learning-eligibility narrowing is removed and the mint snapshot is mandatory (failed snapshot rolls the pick back and alerts); (R4) freeze redundancy restored — the 07:00 settle pass freezes today's slate whenever the prior scheduled 10:00 mint did not verifiably succeed.
- **Why:** A public track record must never change its grading methodology, its inclusion contract, or its sealing guarantees silently mid-record; and infrastructure failure must never masquerade as a graded outcome (VOID) or silently shrink the published population.
- **Mechanical fixes in the same pass:** M1 receipt-mint failure alerts the owner (record-integrity event); M2 opengraph/twitter-image routes exempt from the fantasy 307; M3 PUBLIC projections strip `factors` inside the projection; M4 pre-SCORED playback steps show UNKNOWN_MARKET, never the decision-time line; M5 "Recorded events/transitions" copy became "Derived events".
- **Evidence:** All rulings pinned by tests in settle-sport, process-sport, freeze-slate-commitments, clv-capture, fantasy-public-gate, pick-evidence-envelope, epistemic-delta-ledger, cockpit-selected-game-playback, and dashboard-performance-gate; package + web suites, typechecks, and the four trust guardrails green (counts in the ledger).
- **Boundary:** No migration, production DB, secret, deployment, or publication action. `origin/main` (post-#110/#111/#113) merged cleanly into the branch; history stays fast-forwardable for the sibling worktree.
