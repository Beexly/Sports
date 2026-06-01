# GSN — Repository Intelligence Report

**Scope:** The Beexly/Sports monorepo (Galaxy Sports Network prediction platform).
**Method:** Direct read of source + schema, plus a full validation pass (install,
prisma generate, typecheck, test) on branch `claude/trusting-ramanujan-mYK6E`.
**Date:** 2026-06-01. **Author:** autonomous operator session.
**Evidence labels:** `verified` (reproduced here) · `inferred` (read from code, not
run) · `recommended` · `unverified`.

> This single report intentionally folds in the GSN-specific artifact topics
> (odds-integration audit, pick-lifecycle/model register, model-orchestration & cost,
> compliance & responsible gaming, risk register). I chose depth-on-the-real-system
> over breadth-of-speculation; see §10 for what was deliberately not done.

---

## 1. Headline verdict

GSN is **not vaporware and not slop**. It is a large, disciplined, doctrine-aligned
platform whose trust architecture (bootstrap gating, immutable signal snapshots,
human-gated calibration, server-side paywall, compliance gates) is genuinely
well-built and, in places, ahead of commercial competitors. `verified`

The single most important conceptual gap sits exactly on the product's thesis:
**`confidence` is a 0–100 heuristic quality score, not a calibrated win
probability — yet the calibration layer measures it as if it were one.** This is
fine for moneyline, misleading for spread/total, and it is the thing to get right
before promoting confidence numbers to users. Addressed partially this session
(discrimination metric); the deeper fix is human-gated. `verified` / `recommended`

---

## 2. Verified state (validation baseline)

| Gate | Result | Evidence |
|---|---|---|
| `npm install` | exit 0, 593 pkgs | 13 vulns (1 critical, 4 high) — see §9 |
| `npm run db:generate` | Prisma Client v5.22.0 | clean |
| `npm run typecheck` | **green, 9 workspaces** | strict mode, zero errors |
| `npm run test` | **green** | apps/web 1,855 · engine 197 · ingestion 17 · types 28 |

`verified`. **Caveat:** apps/web's 1,855 tests run against a **stub Prisma client**
(`DATABASE_URL` unset → "All reads return empty results"). They are excellent
*contract/policy/logic* tests (gating, copy-scanning, route shapes, a11y) but do
**not** exercise live database behavior, real migrations, or real query semantics.
That is the largest coverage blind spot. `verified`

**Surface:** 48 API routes · 60 pages · 103 lib modules · 165 web test files · 25
components · 3 workers (data-refresh, pick-generation, content-publishing) · 6
packages (types, db, data-ingestion, ingestion-pipeline, prediction-engine). `verified`

---

## 3. Pick lifecycle & model register

**State machine (`verified` from schema + routes + worker):**
`ingest odds → score (prediction-engine) → GateDecision (SCORING→PUBLISHED|GATED)
→ persist Pick (result=PENDING, isBootstrap per gate) → settle (worker) → record
PickSignalSnapshot outcome → (if canonical+eligible) feed calibration`.

- **Model version:** `MODEL_VERSION = "v5.0.0"` (`packages/prediction-engine/src/constants.ts`). Stamped on every pick. `verified`
- **Scoring (`scoring.ts`):** vig removal → fair value → edge vs offered price;
  components = consensus (max 30) + market depth (max 20) + edge (max 25) +
  volatility penalty (−15) + context (line movement, rest, schedule stress, H2H,
  venue form, cross-market, uncertainty) + flat +10 base, clamped 0–100. Refuses
  to emit below `MIN_PUBLISH_CONFIDENCE=50` or `MIN_BOOKMAKERS=2`. `verified`
- **Settlement (`packages/prediction-engine/src/settlement.ts`):** pure
  `calculatePickResult()` for SPREAD/MONEYLINE/TOTAL, with correct home-perspective
  spread convention and soccer-draw handling. 31 unit tests. `verified`
- **Readiness gates (`readiness.ts` + `platform-config.ts`):** a 7-phase bootstrap
  progression, every flag defaulting to the safest state. `canApplyCalibrationAdjustments`
  is a **hardcoded `false`** — weights can never auto-apply. This is the strongest
  expression of the human-gate doctrine and should be treated as load-bearing. `verified`

**Trust mechanics worth calling out as strengths (`verified`):**
- `isBootstrap` flags fence pre-canonical picks out of all public stats.
- `PickSignalSnapshot` is an immutable record of which signals were live at pick
  time → the foundation for honest, outcome-anchored calibration.
- `LossAutopsy` + `ModelJournalEntry` are public-accountability surfaces (publish
  your losses), which is exactly how prediction brands earn durable trust.

---

## 4. Odds integration audit (`the-odds-api`)

`verified` from `packages/data-ingestion/src/{config,odds-api-client}.ts`:
- **Provider/base:** `https://api.the-odds-api.com/v4`, region `us`, `american` odds.
- **Coverage:** 7 sports (NFL, NCAAF, NBA, NCAAB, MLB, NHL, MLS) × 3 markets (h2h,
  spreads, totals).
- **Freshness:** `FRESHNESS_THRESHOLD_MS = 1h`; per-pick `dataFreshnessAt` stored;
  `SourceCoverageReport` models FRESH/AGING/STALE/MISSING/CONTRADICTORY.
- **Resilience:** 15s timeout; reads `x-requests-remaining` / `x-requests-used`
  quota headers; exponential backoff + jitter, honoring `Retry-After`, on 429/5xx.
- **Forensics:** `SourceSnapshot` stores the raw provider payload + hash before
  normalization — every derived signal is traceable. Strong design.

**Read-only connectivity check: `blocked`/`unverified`** — no live `THE_ODDS_API_KEY`
in this container, so I did not make a real call (and would not without one). The
client correctly throws if the key is absent. Recommended next step: a single
read-only `getSports()` call in an authed environment to confirm quota headers.

**Gaps (`recommended`):** single-provider dependency (no failover provider);
`MIN_BOOKMAKERS=2` is thin — two books that agree yield 100% "consensus" with no
real price discovery. Consider raising the floor or down-weighting <4-book markets
more aggressively.

---

## 5. The calibration finding (core)

`computeCalibration` (`apps/web/lib/calibration/compute.ts`) buckets settled picks
by confidence, computes observed-vs-expected win rate, delta, and **Brier score**,
and emits review-only proposals at n≥30 and |delta|≥0.12. It is honest, well-bounded,
and never mutates weights. `verified`

**The flaw:** it sets `expected = confidence/100`, i.e. it treats confidence as
P(win). But confidence is a *desirability heuristic*. For spread/total markets
(priced ≈50% by construction), observed win rate hovers near 50% while confidence
sits at 65–90 → calibration reports systemic "overcalling," and that report is
**public** (`app/page.tsx`, `/board`, `/api/calibration`). A naive "fix" (deflate
confidence to match 50%) would destroy the product's UX. `verified`

**Done this session (`verified`, additive, evidence-only):** added a market-neutral
`discrimination` metric — *does observed win rate rise as confidence rises?* —
exposing `improving | flat | inverted | insufficient-data`, the high/low bucket
win rates, spread, and monotonicity. This answers "is confidence at least a good
*ranking* signal?" even when it isn't an absolute probability. 6 new tests; full
calibration suite 52/52 green.

**Recommended (human-gated, NOT taken):**
1. Persist a **modeled win probability** distinct from the confidence UX score
   (scoring already computes vig-free fair prob — currently `fairProbability: null`).
   Calibrate *that* with Brier; keep `confidence` as the display/ranking score.
2. Make `computeCalibrationProposals` **market-aware** so spread/total picks are not
   flagged "overconfident" purely for being priced near 50%.
3. Both require a `MODEL_VERSION` bump and operator sign-off per `readiness.ts`.

---

## 6. Model orchestration & cost

`verified`: every Claude call goes through `apps/web/lib/claude-api/messages.ts`,
which **hardcodes `claude-sonnet-4-6`** (appears 15× across the lib). There is **no
Haiku/Opus tiering** and **no prompt caching** anywhere, despite the brief describing
a tiered Haiku/Sonnet/Opus orchestration.

Cost governance that *does* exist and is good: `ClaudeApiCallRecord` (per-surface
token + cost ledger) and `ClaudeApiBudget` (monthly budget, alert thresholds,
override). So spend is *measured* but not yet *optimized*. `verified`

**Recommended:**
- Route cheap/structured surfaces (copy-scan, classification, banned-phrase checks)
  to **Haiku 4.5**; reserve **Opus 4.8** for deep reasoning (model-court, calibration
  insight). Expected upside: large cost reduction on high-volume surfaces.
- Add **prompt caching** to the system prompt on repeated surfaces (journal, studio,
  brief) — these reuse long static instructions and are ideal cache candidates.
- Centralize a `pickModelForSurface()` router so the policy is auditable in one place.

---

## 7. Compliance & responsible gaming

`verified` from schema + `apps/web/lib/promotions/*`: the `Promotion` model hard-gates
public render on non-empty `disclosureText`, `termsUrl`, `responsibleGamingText`,
`status=ACTIVE` + `complianceStatus=APPROVED`, not expired, and geo allow/deny via
`eligibleStates`/`restrictedStates` (honest "not available in your state" rather than
fabricated availability). "Risk free" is explicitly flagged as banned copy. There are
banned-phrase scan tests (`metadata-banned-phrases`, `public-copy-scan*`,
`no-fake-percentages`, `pricing-honesty`, `trust-claims`). This is a serious,
above-average responsible-gaming posture for a pre-launch product. `verified`

**Gap (`recommended`):** jurisdictional licensing/age-gating logic exists at the data
layer, but there is no documented legal review of `the-odds-api` data-licensing terms
for commercial redistribution of odds, nor a per-state operations matrix. That is a
human/legal task, not a code task — flagged so it isn't silently assumed handled.

---

## 8. Strengths to preserve (do not "refactor away")

- The **readiness-gate / bootstrap-phase** system — it is the trust spine. `verified`
- **Immutable `PickSignalSnapshot`** + bootstrap exclusion — the only honest path to
  a calibrated track record. `verified`
- **Server-side paywall** in `app/api/picks/route.ts` (DB-level tier gate, per-field
  entitlement nulling, bootstrap exclusion, data-quality floor, 503 readiness gate). `verified`
- **Public accountability** surfaces (loss autopsies, model journal). `verified`
- **Cost ledger** for every Claude call. `verified`

---

## 9. Risk & failure register

| # | Risk | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| R1 | **Settlement single-point-of-failure** — `settle-picks` cron was a no-op; grading lived only in the long-running worker. **ADDRESSED 2026-06-01:** extracted shared `settleSport()` into `@sports/ingestion-pipeline`; both worker and cron now call it (zero-drift, like `processSport`). | High → mitigated | `settle-sport.ts`; functional `cron/settle-picks/route.ts`; tests green | **Residual:** add a "stale unsettled picks" alert; integration-test the live path (R3). Enabling in prod remains an operator deploy decision. |
| R2 | **Confidence treated as probability in calibration** (public-facing). | High (trust) | §5 | Persist modeled win prob; market-aware proposals (human-gated). Discrimination metric added as interim. |
| R3 | **apps/web tests use stub Prisma** — no live DB/migration coverage. | Med | §2 | Add a thin integration suite against a disposable Postgres (shadow DB) in CI. |
| R4 | **13 npm vulns (1 critical, 4 high); EOL deps** (eslint 8, glob 7, rimraf 3). | Med | `npm install` audit output | Triage `npm audit`; plan eslint 9 / dependency refresh. |
| R5 | **Single odds provider; `MIN_BOOKMAKERS=2`.** | Med | §4 | Add failover provider; raise/penalize thin-market floor. |
| R6 | **Sonnet-only, no caching** → avoidable model spend. | Med (cost) | §6 | Tiered routing + prompt caching. |
| R7 | Repo clutter: many overlapping handoff docs + `_overnight_quarantine/` (stray `index.lock*`, `.bad` files from prior Windows agent runs). | Low | `git ls-files`, quarantine README | Prune quarantine + consolidate handoffs once stable. |

No hard-stop violations found. No destructive DB ops, no Stripe live, no prod deploy. `verified`

---

## 10. What was deliberately NOT done (and why)

The operator brief listed ~200 external GitHub repos (freeCodeCamp, awesome-*,
design systems, betting repos, etc.) and 15 strategy documents. I did **not** clone
and "review" all of them this session because (a) most have near-zero specific
leverage on this mature codebase, (b) producing 15 docs of largely `speculative`
content contradicts the brief's own Evidence Law and "impressive vs. useful" test,
and (c) the user confirmed the prompt is a guideline. The standing external set
(Anthropic research suite, etc.) is **not present in this container** — so reviewing
it is `blocked` here regardless.

**Available on request** (say the word and I'll do it as a focused wave): targeted
extraction from the genuinely relevant references — e.g. `penaltyblog` /
`sports-betting` (calibration & Poisson modeling), `vercel/commerce` (subscription
UX), and the Anthropic cookbooks (model-routing & prompt-caching patterns for §6).

---

## 11. Recommended next actions (prioritized)

- **P0 — R1 settlement reliability.** Decide: run the worker as a monitored service,
  or finish the cron port. Add a "stale unsettled picks" alert. *Proves it worked:*
  picks settle within N hours of game final, observable in a dashboard.
- **P0 — R2 calibration semantics (human-gated).** Approve the modeled-win-probability
  split + market-aware proposals; bump `MODEL_VERSION`. *Proves it worked:* moneyline
  Brier improves; spread/total no longer auto-flag "overconfident."
- **P1 — R6 model routing + caching.** Add `pickModelForSurface()` + caching. *Proves
  it worked:* cost-per-surface in `ClaudeApiCallRecord` drops materially.
- **P1 — R3 integration tests** against a disposable Postgres.
- **P2 — R4 dependency/vuln triage; R5 odds failover; R7 repo hygiene.**

---

## 12. Continuation

Per the brief's Continuation Law: ledger/decisions updated (`_logs/DECISIONS.md`),
evidence captured here, no remaining work blocked except where it requires (a) a live
`THE_ODDS_API_KEY` for the read-only odds check, (b) a running DB for integration
tests, or (c) a human approval gate (calibration model-version bump, settlement
architecture decision). The next highest-leverage *safe* engineering move is the
model-routing/caching work (§6) — it touches no hard stop and reduces real cost.
