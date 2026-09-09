# Gate Matrix — 2026-09-08

**Status: documentation only. No gate was flipped. No code was changed. This pass
is read-only research, produced by an autonomous session in response to an
automated launch-dispatch brief that had not been confirmed by a human at the
time this file was written (see "Provenance" below).** The founder/user
narrowed the original 5-part brief down to this single deliverable — the gate
matrix itself — and asked to check back in before any code (STATS_PUBLIC
per-field gating, the ratchet test, or a Vercel flip script) is written. Those
three items are listed under "Deferred" at the end of this file, not done.

## Provenance

- Base: `origin/main` @ `8cc0695` (branch `claude/launch-gate-matrix`).
- Truth-surface snapshot used throughout this file: `GET
  https://www.galaxysportsedge.com/api/ops/public-surface-truth`,
  `generatedAt: 2026-09-08T23:52:29.699Z`, `deployment.sha:
  8cc069585871d8a316714ce93bf1022a31b892eb` (matches base — the snapshot is
  current for this branch point). Public detail level only (no `CRON_SECRET`
  used); some fields the full brief wanted (`stripeWebhookHosts`,
  `mainFeatureMarkers`, per-sport `operatorNext`) are gated behind
  `detail=authenticated` and are not reproduced here because this session
  holds no ops secret.
- All file:line references below came from two read-only research passes over
  this repo checkout; they were not re-verified line-by-line a second time.
  Treat a file:line as "as of 8cc0695," not as a live guarantee — re-grep
  before acting on any single row if the branch has moved.
- Nothing in this document should be read as a recommendation to flip a gate.
  AGENTS.md law 3 forbids this session from flipping any gate or env flag,
  full stop; the "Status" column states what the *data* supports, not an
  instruction to act.

## How to read the Status column

- **OPEN NOW** — the flag is already `true`/live in production per the
  observed truth surface, or every documented precondition is met today
  according to that same snapshot.
- **OPENABLE AFTER `<precondition>`** — a concrete, checkable condition (not
  yet true per the snapshot) stands between here and an honest flip.
- **NOT OPENABLE (law/rights/schema)** — blocked by an AGENTS.md law, an
  unclear/uncleared rights posture, or a schema/migration this session
  cannot touch, independent of any metric.
- **N/A** — not a public/private toggle in the launch sense (an override,
  a numeric threshold, or dev-only escalation that stays off in prod by
  construction).

---

## 1. Launch-critical gates (named in the dispatch brief)

### 1.1 `CALIBRATION_AUTO_PUBLISH`

| | |
|---|---|
| Reads it | `apps/web/lib/calibration/rpcp-conformal-bridge.ts:180`; consumed by `apps/web/lib/ops/calibration-publish-policy.ts:56` and surfaced at `calibrationPublish.autoPublish` |
| Value now | `false` (`calibrationPublish.autoPublish: false`, `calibrationPublish.published: false`, `calibrationPublish.publishedEffective: false`) |
| Must be TRUE to open honestly | `calibrationEligibility.status === "GREEN"` **and** `consecutiveGreen >= streakRequired` |
| Observed today | `calibrationEligibility.status: "GREEN"`, `n: 475`, `ece: 0.0466` (floor `0.05` — passes), `brier: 0.1898` (floor `0.22` — passes), `murphy.reliability: 0.005` (floor `0.05` — passes), `consecutiveGreen: 30`, `streakRequired: 3` — **precondition met** |
| Verify after flip | `calibrationPublish.published`, `calibrationPublish.publishedEffective`, `calibrationPublish.source` |
| Rollback | unset `CALIBRATION_AUTO_PUBLISH` (or set `CALIBRATION_AUTO_UNPUBLISH=true` to force it back down on next eligibility check) |
| Owner | founder (public claim of "PROVEN"-track calibration; law 3 flip) |
| **Status** | **OPEN NOW** by the data. One caution worth the founder's attention before flipping: the by-model-version breakdown in the same snapshot shows the currently-serving model `v5.2.7` at `n:262, ece:0.0947` — nearly double the pooled `0.0466` — because the pool blends four model versions (`v5.2.7`, `v5.2.6`, `v5.1.0`, `v5.0.0`). The pooled figure is what the gate reads and it is real, but a founder publishing "PROVEN" off it should know the deployed model alone doesn't clear the floor on its own rows yet. This is a data observation, not a recommendation either way. |

### 1.2 `LINE_ARCHIVE_ENABLED`

| | |
|---|---|
| Reads it | `packages/ingestion-pipeline/src/line-archive.ts:163-165` (`isLineArchiveEnabled`) — also requires `LINE_ARCHIVE_EU_PINNACLE=true` before `packages/ingestion-pipeline/src/pinnacle-line-archive.ts` calls out; `LINE_ARCHIVE_ENABLED` alone only arms the base line-archive capture path (`process-sport.ts:736,911`), the EU/Pinnacle fetch is a second, independent flag |
| Value now | not present in the public truth-surface JSON (this is an ingestion-side capture flag, not a product-facing gate); default OFF per code comment ("line-archive.ts is INERT by default") |
| Must be TRUE to open honestly | no external precondition found in code — it is an additive, non-destructive capture path (never throws, never blocks settlement per `process-sport.ts:911` comment) |
| Verify after flip | no dedicated JSON path on the public truth surface; would need to confirm via `ingestionRun` rows or a future ops-surface field — **not currently observable from outside**, worth noting for whoever flips it |
| Rollback | unset `LINE_ARCHIVE_ENABLED` |
| Owner | founder-delegated per the dispatch brief ("F-8, founder-delegated YES 2026-09-08") — **not independently verified this session**; the delegation itself lives in a document this session did not read (`docs/ops/LAUNCH_COMMAND_SHEET_2026-09-08.md` on a different branch) |
| **Status** | OPENABLE — no blocking precondition found in code, but flip verification is currently a blind spot (no truth-surface field). Flagging that as a real gap rather than skipping it. |

### 1.3 `OPS_READ_SECRET`

Not found under this literal name anywhere in the repo at `8cc0695`. The
truth-surface route's authenticated detail level gates on `CRON_SECRET`
(`apps/web/app/api/ops/public-surface-truth/route.ts:139`, `hasOpsAuth`), not
a separate `OPS_READ_SECRET`. Either the brief is referring to a var that
ships on a different, not-yet-merged branch (the brief mentions "after the
security work lands," i.e. `hermes/finish-line-2026-09-05` / SEC-0x commits
referenced in AGENTS.md), or the name has changed. **Cannot produce a row for
this one without guessing — flagging as unresolved rather than fabricating a
file:line.**

### 1.4 `PREDEXON_API_KEY` + `PREDEXON_INGEST`

| | |
|---|---|
| Reads it | `packages/data-ingestion/src/predexon-client.ts:41` (`PREDEXON_INGEST`, truthy check), `:46,119` (`PREDEXON_API_KEY`, throws `missing PREDEXON_API_KEY` if unset while ingest is on) |
| Value now | not on `main` at `8cc0695` in a wired/consuming form beyond the client itself — `source-registry.ts:569` documents intent ("Default OFF via `PREDEXON_INGEST` so we do not burn quota") but the brief says the consuming wire-up is on PR #724, not yet merged |
| Must be TRUE to open honestly | PR #724 merged (out of this session's scope — brief says "reference their flags; do not implement their code") |
| Verify after flip | none on the current public truth surface; `freeSpine.oddsPath.primaryOddsSource: "the-odds-api"` and `freeOddsCandidatesGated: true` today confirm PredExon/Kalshi is not yet a live second book |
| Rollback | unset `PREDEXON_INGEST` |
| Owner | data-ingestion (PR #724) |
| **Status** | NOT OPENABLE by this branch — dependency (#724) unmerged. |

### 1.5 `REFUND_REVOKES_ACCESS`

| | |
|---|---|
| Reads it | referenced in `apps/web/__tests__/stripe-sync-existing-read-failure.test.ts:127,140` (env is set/deleted around a test) — the consuming billing-sync code itself was not located in this pass under that exact name at `8cc0695`; the test suggests the wiring is present but this session did not confirm the runtime read site with a second look |
| Value now | not on the public truth surface (`billingMoney` block has no field for it) |
| Must be TRUE to open honestly | brief says "after the billing work lands" — unspecified branch/PR, not identified this session |
| Verify after flip | none found on the public truth surface |
| Owner | subscriptions-billing-agent |
| **Status** | Unresolved — needs a subscriptions-billing-agent pass to confirm the current runtime read site and whatever branch "the billing work" refers to before this row can be trusted. Not fabricating a file:line for the production code path since it wasn't independently confirmed. |

### 1.6 `LINE_INTEGRITY_VOID_ENABLED`

Confirmed **absent from `main` at `8cc0695`** (`git grep` found zero matches).
Per the dispatch brief this lives on `claude/launch-line-integrity` (C-197
void lane), not yet merged. Nothing to document from this checkout beyond:
it is the stated precondition for the `PERFORMANCE_STATS_ENABLED` /
`PRICING_PHASE=PROVEN` pair below. **Status: NOT OPENABLE from this branch —
depends on an unmerged PR this session was told to reference, not implement.**

### 1.7 `PERFORMANCE_STATS_ENABLED` and `PRICING_PHASE=PROVEN`

| | |
|---|---|
| Reads it | `PERFORMANCE_STATS_ENABLED` → `packages/prediction-engine/src/platform-config.ts:168`, surfaced as `gates.envPerformanceStatsEnabled` / `gates.canExposePerformanceStats`; `PRICING_PHASE` → `apps/web/lib/pricing/pricing-phases.ts:150` |
| Value now | `gates.envPerformanceStatsEnabled: false`, `gates.canExposePerformanceStats: false`; `revenueLadder.currentStep: "FOUNDING"`, `pricingPhaseReadiness.currentPhaseId: "FOUNDING"` |
| Must be TRUE to open honestly | Per the brief: `LINE_INTEGRITY_VOID_ENABLED=true` merged **and** truth surface's remaining-to-void reads 0 **and** `calibrationPublish.publishedEffective === true`. Independently, the truth surface's own gate agrees: `revenueLadder.blockersToNext: ["Calibration not published"]`, `pricingPhaseReadiness.unmet: ["published calibration curve"]`, `pricingPhaseReadiness.met: ["2212/100 canonical settled picks"]` — the settled-sample floor is already cleared; publication is the only unmet item the platform itself reports. |
| Verify after flip | `gates.canExposePerformanceStats`, `revenueLadder.currentStep === "PROVEN"`, `pricingPhaseReadiness.eligible === true` |
| Rollback | unset `PERFORMANCE_STATS_ENABLED`; reset `PRICING_PHASE` to `FOUNDING` |
| Owner | founder |
| **Status** | OPENABLE AFTER (a) `CALIBRATION_AUTO_PUBLISH` flip in §1.1 lands and reports `publishedEffective: true`, and (b) `LINE_INTEGRITY_VOID_ENABLED` merges and its remaining-to-void reads 0. Neither is true in this snapshot. |

### 1.8 `CONTESTS_PUBLIC`

| | |
|---|---|
| Reads it | `apps/web/lib/launch/public-surface-gate.ts:29` |
| Value now | `gates.contestsPublic: false`; `productBoards` marks the contests surface dark; `policy.contests: "opt-in CONTESTS_PUBLIC — paper skill stays dark until founder opens it"` |
| Must be TRUE to open honestly | brief: "after the F-27 migration the founder lands" — a schema migration, which law 2 forbids this or any agent session from writing |
| Owner | founder (schema migration + flip) |
| **Status** | NOT OPENABLE (schema/law) until the F-27 migration ships through the normal Prisma path. |

### 1.9 `STATS_PUBLIC` and `LIVE_BOARD`

See §2 and §3 below — both get a full findings section per the brief's ask,
without any code change.

---

## 2. `STATS_PUBLIC` — findings (no code written this pass)

**Current gate mechanics.** `isStatsPublic()` (`apps/web/lib/launch/public-surface-gate.ts:20-22`)
reads a single boolean; the only enforcement point is
`apps/web/app/stats/layout.tsx:15-17`, which calls Next's `notFound()` for the
entire `/stats/*` tree when the flag is off. There is **no per-field or
per-source gate** anywhere in `apps/web/lib/statking/*` or
`apps/web/app/stats/**` — the code is all-or-nothing today. `gates.statsPublic: false`
on the current truth surface; `productBoards` marks `STATKING` as
`dark_by_law`.

**Source-rights registry** (`apps/web/lib/scraping/source-rights-registry.ts`,
re-exported unchanged from `apps/web/lib/source-rights/*`) has 18 entries.
Only four currently carry `commercial_display_allowed: true`: `nflverse`,
`open-meteo`, `ffc-adp`, `the-odds-api` (odds, not stats). Every other source
StatKing's player pages draw on for enrichment — `espn-public-api`,
`sleeper-api`, `ffverse-ffopportunity`, `pfr-advstats-via-nflverse`,
`clubelo`, `fpl-api`, `fantasypros-com`, `kalshi`, plus several
`vendor_candidate`/`manual_research_only` sources — is `false` for commercial
display, several (`kalshi`, `siriusxm-*`) under an explicit ToS ban on
derived-analytics use. `apps/web/app/stats/player/[id]/page.tsx` renders a raw
`source_lineage` list per player with no filtering against this registry.

**`checkClearance()` / `wrapExtractedRecord()`**
(`apps/web/lib/scraping/clearance-engine.ts:85-322,367-414`) are fail-closed
at the *extraction/ingestion* boundary (deny-by-default; `wrapExtractedRecord`
throws rather than passing an unrighted record through). They are not
consulted a second time at *render* time by the StatKing product layer — the
render layer trusts whatever already made it into the derived JSON snapshots
under `data/statking/**`.

**What "facts-only, attributed, proprietary-fields-hidden" would require**
(described, not built): tag each rendered field with its contributing
`source_id`(s) — `source_lineage` already exists as the join key — and check
`commercial_display_allowed` per source at serialize/render time, suppressing
or redacting any field whose lineage touches a non-cleared source. The board
surface already has an analogous pattern for entitlement-tier redaction
(`apps/web/lib/board/state.ts:247-259,1006-1011`,
`redactBoardConfidence`/`applyViewerRedaction`) that a StatKing version could
mirror, keyed on source-rights status instead of viewer tier. `STATS_PUBLIC`
would then gate the page shell; a second, narrower per-field check would gate
each proprietary metric.

**Named blockers and what clears them** (from each registry entry's
`unlock_condition`):
- `espn-public-api` — needs an ESPN data license agreement for commercial
  display (facts/scores are already cleared for internal use; commercial
  display is not).
- `sleeper-api` — needs ToS confirmation that commercial display/redistribution
  of player and trending data is permitted.
- `ffverse-ffopportunity` — CC-BY-SA-4.0 share-alike; needs legal review of
  whether it attaches to derived customer-facing output, or a separate
  license.
- `pfr-advstats-via-nflverse` — Sports Reference LLC ToU §5(j) bars ML/model
  use; needs written confirmation or a paid SRL license.
- `clubelo`, `fpl-api`, `fantasypros-com`, `kalshi`, `scores24-live`,
  `score24-com`, `collegefootballdata`, `siriusxm-*` — each pending a written
  permission, vendor questionnaire, or commercial-tier upgrade per its own
  registry entry.
- Separately: `ESPN_POWERINDEX_LICENSED`
  (`packages/ingestion-pipeline/src/independent-source-rights.ts:22,28-32`)
  gates ESPN Power Index specifically (strict `"true"` string match, fails
  closed on anything else); this is unset/false today, correctly, and is a
  distinct gate from the base ESPN facts API.

**Status: NOT OPENABLE (rights)** in its current all-or-nothing form. A
facts-only mode scoped to `nflverse` + `open-meteo` + `ffc-adp` fields only
is the narrowest path this research surfaced, but building the per-field
gate is real engineering work this session did not do — see "Deferred"
below.

---

## 3. `LIVE_BOARD` — findings (no code written this pass)

**Current gate mechanics.** `liveBoardOn(env)`
(`apps/web/lib/board/state.ts:36-38`) reads `LIVE_BOARD === "true"`;
`law.liveBoardDefault` is hardcoded `"off"` as a literal type in the
readiness/ops-truth reporting surfaces (`apps/web/lib/platform/world-class-readiness.ts:27,86`,
pinned by test `apps/web/__tests__/world-class-readiness.test.ts:31`) —
i.e. the *documented default* is asserted independent of the live env value,
which is a deliberate honesty backstop. `productBoards` marks `GSE_BOARD`
as `live_gated` today.

**Freshness precondition.** `resolveBoardSurface()`
(`apps/web/lib/board/board-surface-policy.ts:15-25`) auto-resolves to
`market` only when `oddsFresh === true`, defaulting to `signal` (model
lines, not book prices) whenever freshness is unknown or false — the
auto-resolution itself fails toward the honest label.
`isMarketBoardOddsStale()` (`apps/web/lib/data-reliability/public-freshness-gate.ts:90-98`)
requires a real `ingestionRun` row with `status:"SUCCESS"` and
`oddsInserted > 0` inside the 240-minute Refresh SLA — no fabrication path.
On the current snapshot this passes: `oddsInserting.ageMinutes: 5`,
`withinRefreshSla: true`.

**The important caveat, found verbatim in code comments**
(`apps/web/lib/autonomy/operating-kernel.ts:259-266`): the stale-odds check
is only *armed* when `FORCE_NO_BET_IF_STALE` is also true — `PUBLIC_PICKS`/
`LIVE_BOARD` on with that flag off performs no freshness check at all, and
stale picks stay publishable. On the current snapshot `gates.forceNoBetIfStale: true`,
so the honesty guard **is** armed today — this is a real precondition that
happens to already be satisfied, not an open question.

**Fail-open exception.** On a DB error during the freshness check, the code
explicitly fails **open** (does not suppress) — `apps/web/lib/data-reliability/public-freshness-gate.ts:76-79`
comment: "so a transient DB blip can't black out a fresh surface." This is a
deliberate trade-off (availability over caution on transient errors), not a
bug, but it means "fails closed on stale odds" is true only for the
staleness condition itself, not for every possible failure mode.

**Book-pricing coverage gap (not a freshness problem, a market-coverage
one).** `freeSpine.oddsPath.primaryOddsSource: "the-odds-api"`,
`paidSinglePath: true`, `freeOddsCandidatesGated: true` — every sport cell is
single-book-sourced through the paid Odds API today; the free/second-book
path (PredExon/Kalshi, WP-27) is not live. `marketCoverage` in the same
snapshot shows `americanfootball_nfl` MONEYLINE at `"none"` (0 picks against
6 scheduled games in the 72h window) — a real coverage gap on NFL
moneylines specifically, independent of the `LIVE_BOARD` flag itself.

**Test coverage found** (names only): `board-surface-policy.test.ts`,
`board-stale-kill-switch.test.ts`, `picks-stale-kill-switch.test.ts`,
`daily-slate-stale-kill-switch.test.ts`, `stale-gate-independence.test.ts`,
`odds-fetchedat-staleness.test.ts`, `ops-adjudicate-stale-picks.test.ts`,
`freshness-coverage.test.ts`, `line-freshness-badge.test.ts`,
`env-flags-founding.test.ts`, `platform-config-stale-gate.test.ts`,
`stale-line-risk-score.test.ts`, `freshness-schedule.test.ts` — the
fail-closed staleness behavior already has dedicated coverage; this session
did not find a gap here.

**Status: OPENABLE AFTER founder review**, not a blocked-on-code item. Every
mechanical precondition this research found (`FORCE_NO_BET_IF_STALE=true`,
odds within SLA) is met today, but `apps/web/lib/autonomy/operating-kernel.ts`
explicitly forbids autonomy code from ever flipping `LIVE_BOARD`, and the
NFL-moneyline coverage gap plus single-book pricing are real product-quality
questions a founder should see before deciding, not something this session
can resolve. Documenting the data, not recommending the flip.

---

## 4. Full flag inventory (repo-wide, `8cc0695`)

Grouped by area. Columns: env var — file:line — one-line purpose — status
where a launch-relevant status applies, `N/A` otherwise.

### 4.1 Prediction-engine platform config (`packages/prediction-engine/src/platform-config.ts`)

| Var | file:line | Purpose | Status |
|---|---|---|---|
| `CANONICAL_HISTORY_ENABLED` | :164 | picks/game-logs written canonical vs bootstrap | N/A (internal data-quality switch) |
| `DERIVED_MODEL_HISTORY_ENABLED` | :165 | ATS/H2H/venue features feed scoring | N/A |
| `PUBLIC_PICKS_ENABLED` | :166 | gates `/api/picks*` | **OPEN NOW** — `gates.canExposePublicPicks: true` observed |
| `PUBLIC_BLOG_ENABLED` | :167 | content-publishing worker master switch | N/A (draft-only pipeline regardless) |
| `PERFORMANCE_STATS_ENABLED` | :168 | gates `/api/performance` | see §1.7 |
| `CONFIDENCE_DISPLAY_MODE` | :169 | precision/labels/internal display mode | N/A (presentation config, not open/closed) |
| `FEATURED_PICK_PROMOTION_ENABLED` | :170 | allows `isFeatured=true` | N/A |
| `MIN_DATA_QUALITY_FOR_GAME_LOG` | :171 | numeric threshold | N/A |
| `OUTCOME_LEARNING_ENABLED` | :172 | marks settled picks learning-eligible | N/A |
| `MIN_SETTLED_PICKS_FOR_LEARNING` | :173 | numeric floor (100) | N/A (already cleared: 2212 settled) |
| `CALIBRATION_ADJUSTMENTS_ENABLED` | :174 | isotonic/PAVA calibrator applies adjustments | N/A — `rpcpConformalBridge.productFlags.calibrationAdjustmentsEnabled: true` already on internally; does not itself publish anything |
| `FORCE_NO_BET_IF_STALE` | :175 | stale-data kill switch for public board/picks | **OPEN NOW** — `gates.forceNoBetIfStale: true` observed, see §3 |

### 4.2 Entitlements / paywall (`apps/web/lib/entitlements.ts`, `apps/web/lib/api-entitlement.ts`)

| Var | file:line | Purpose | Status |
|---|---|---|---|
| `DEV_FAKE_ADMIN` | entitlements.ts:35,65 | dev-only ELITE-tier escalation, boot-asserts off in production | N/A — must never be true in prod, code throws if `NODE_ENV==="production"` and it's set |

No other env-driven paywall gates — tier resolution is DB-backed
(`Subscription.tier`); `apps/web/lib/pricing/feature-gates.ts` is
presentation-only per `.claude/rules/api-gating.md` and enforces nothing
server-side, matching rule 3 in CLAUDE.md.

### 4.3 Board / public-surface gates

| Var | file:line | Purpose | Status |
|---|---|---|---|
| `STATS_PUBLIC` | `apps/web/lib/launch/public-surface-gate.ts:21` | `/stats/*` tree | see §2 |
| `CONTESTS_PUBLIC` | `public-surface-gate.ts:29` | `/fantasy/contests` paper board | see §1.8 |
| `PUBLIC_PICKS` | `apps/web/lib/product/board-surfaces.ts:58` | alias OR'd with `PUBLIC_PICKS_ENABLED` for board-surface posture reporting | N/A (reporting alias) |
| `PUBLIC_BOARD_SURFACE` | `apps/web/lib/board/board-surface-policy.ts:19` | manual override of market/signal board surface | N/A — auto-resolves by default; `boardSurface.auto: true` observed, override is an incident-response lever, not a launch gate |
| `LIVE_BOARD` | `apps/web/lib/board/state.ts:37` | `/board` live product surface | see §3 |
| `LIVE_BOARD_GATE_SLATE` | `apps/web/lib/board/load-gate-slate.ts:47` | loads gate-slate specifically when `"1"` | N/A |
| `DEMO_PICKS_ENABLED` | `packages/db/src/sample-picks.ts:15` | serves seeded demo picks | **NOT OPENABLE (law 8, no fake data)** — must stay `false` in production, confirmed `host.demoPicksEnabled: false` |
| `PAID_CHECKOUT_OPEN` | `apps/web/lib/billing/paid-checkout.ts:19` | Stripe checkout kill switch | not observed on public truth surface; `billingMoney.checkoutCreatable: true` and `moneyPathReady: true` suggest checkout is already functioning, but this specific flag's value wasn't independently confirmed this pass |
| `STRIPE_TERMS_CONSENT_ENABLED` | `apps/web/lib/billing/checkout-attempt.ts:203,263` | requires explicit consent capture at checkout | ordering rule documented in `docs/ops/OPERATOR.md` §5 (referenced, not re-read this pass) |
| `GSE_WAITLIST_GATE_ENABLED` / `GSE_WAITLIST_BASIC_FORCE` | `apps/web/lib/ops/waitlist-posture.ts:23-24` | waitlist access wall | N/A — already public (`waitlist.gateEnabled: false`, `publicPageOpen: true`) |
| `SLATE_OPENING_REVEAL_ENABLED` | `apps/web/app/api/verify/slate/opening/route.ts:65` | opening-line reveal endpoint | not observed on truth surface |
| `SEALED_ENGINE_ENABLED` | `apps/web/lib/sealed/sealed-slate-view.ts:115` | sealed-slate engine view | not observed on truth surface |

### 4.4 Calibration / ranking control plane

| Var | file:line | Purpose | Status |
|---|---|---|---|
| `CALIBRATION_AUTO_PUBLISH` | `rpcp-conformal-bridge.ts:180` | see §1.1 | OPEN NOW by data |
| `CALIBRATION_AUTO_UNPUBLISH` | `apps/web/lib/ops/calibration-publish-policy.ts:56` | auto-unpublish on eligibility drop | N/A — safety net, not a launch gate |
| `CALIBRATION_PUBLISHED` | `apps/web/lib/ops/canonical-sample-posture.ts:61` | manual override marking calibration published | alternate lever to §1.1; same precondition applies |
| `CALIBRATION_ELIGIBILITY_STREAK` | `apps/web/lib/ops/calibration-eligibility-durable.ts:553` | required consecutive-GREEN streak length | currently effectively 3 (`streakRequired: 3` observed); this var can override the threshold itself — raising it is conservative, lowering it would violate law 9 |
| `CONFORMAL_ABSTAIN_ENABLED` | `apps/web/lib/calibration/aci-state.ts:56` | ACI abstain routing | off (`aciPosture.enabled: false`), R&D-only, never publishes performance per its own operator hint |
| `RPCP_CONFORMAL_BRIDGE_COMPUTE` | `rpcp-conformal-bridge.ts:174` | offline compute switch for RPCP↔conformal bridge | off (`rpcpConformalBridge.computeEnabled: false`), never eligibility-affecting per code |
| `SELECTIVE_PUBLISH_ENABLED` / `SELECTIVE_PUBLISH_DELTA` | `apps/web/lib/calibration/selective-publish-runtime.ts:39,58` | selective (filtered) publish runtime | on, `selectiveRuntime.selectiveEnabled: true`, `delta: 0.12` — already live internally, not a public-facing gate |
| `RANKING_PAUSE_APPLY` | `apps/web/lib/calibration/ranking-pause-apply.ts:31` | applies plan pause-groups to ranking | on via durable override (`rankingPauseApply.applyEnabled: true`, `source: "durable"`, 2 groups, `setBy: founder-chat-yes-2026-08-10`) — already founder-approved, not an open item |
| `SELECTIVE_PAUSE_GROUPS` | `ranking-pause-apply.ts:48` | explicit pause-group override list | N/A — durable DB value currently governs (2 of 6 planned groups paused) |
| `BACKTEST_HARNESS_ENABLED` | `apps/web/app/api/cron/backtest-calibration/route.ts:61` | backtest-calibration cron | internal tooling, N/A to launch |
| `TEAM_RATES_AVAILABLE` | `packages/prediction-engine/src/poisson.ts:57` | team-rate features in Poisson model | internal model config, N/A |

### 4.5 Content / worker gates

| Var | file:line | Purpose |
|---|---|---|
| `CONTENT_WORKER_ENABLED` | `workers/content-publishing/src/index.ts:14` | master switch, content-publishing worker |
| `INTERNAL_CALIBRATION_ONLY` | `workers/content-publishing/src/index.ts:15` | restricts worker to internal-only calibration content, default `true` |
| `CONTENT_AUTO_PUBLISH` | `apps/web/lib/cockpit/jarvis-data.ts:359` | auto-publish generated content — content-publishing is draft-only by CLAUDE.md design regardless |
| `CONTENT_FREE_LANE_ENABLED` | `apps/web/lib/ops/credit-stack-posture.ts:66`, `apps/web/lib/claude-api/free-lane.ts:37` | free/cheap Claude lane for content gen |
| `HIGGSFIELD_GENERATION_ENABLED` | `apps/web/lib/visual-production/spend-policy.ts:17` | paid Higgsfield visual generation, default off |
| `NEWS_RSS_USE_CURATED_DEFAULTS` | `apps/web/lib/news/rss.ts:204` | curated RSS fallback vs configured feeds |

None of these are public product-surface gates in the launch-matrix sense —
they govern internal generation posture, not what an end user sees.

### 4.6 Ops / infra kill switches

| Var | file:line | Purpose |
|---|---|---|
| `TRAFFIC_HEARTBEAT_DISABLED` | `apps/web/lib/ops/traffic-heartbeat.ts:88` | disables ingestion-heartbeat trigger |
| `CRON_REQUIRE_BEARER` | `apps/web/lib/cron/authorize.ts:42` | requires Bearer `CRON_SECRET` on cron routes |
| `ODDS_API_CIRCUIT_FORCE_OPEN` | `packages/data-ingestion/src/odds-api-circuit-breaker.ts:81` | force-opens (kills) Odds API circuit breaker |
| `ODDS_FRESHNESS_MODE` | `packages/data-ingestion/src/freshness-schedule.ts:32` | dynamic vs fixed refresh scheduling |
| `ODDS_REFRESH_ALL_SPORTS` | `packages/data-ingestion/src/config.ts:94` | expands refresh to all sports vs in-season only |
| `QUIET_BOARD_HORIZON_HOURS` | `packages/ingestion-pipeline/src/quiet-board.ts:29` | numeric horizon for "quiet board" detection |
| `FORCE_REAL_PRISMA` | `packages/db/src/index.ts:189` | forces real Prisma client over stub DB |
| `AUTONOMY_EXECUTE` | `apps/web/lib/ops/autonomy-posture.ts:42` | master switch, autonomy planner may invoke safe crons | already on (`autonomy.executeEnabled: true`), scoped to the 5 `safeCronTargets` listed on the truth surface; owner-queue/LAWS items are explicitly excluded from auto-run per its own operator hint |
| `WATCHLIST_ALERTS_ENABLED` | `apps/web/lib/watchlist/alert-dispatch.ts:95` | dispatch of watchlist alerts |
| `JARVIS_MEMORY_WRITE_ENABLED` | `apps/web/lib/jarvis/memory/write-gate.ts:46` | Jarvis memory persistence writes |
| `ANONYMOUS_MODERATION_REPORTS_ENABLED` | `apps/web/lib/community/anonymous-report-handler.ts:167` | unauthenticated moderation-report submission |
| `GSE_ALLOW_QUERY_TIER` | `apps/web/lib/gse-stats/session-tier.ts` | tier override via query param — dev/test escalation lever |
| `PUBLISH_LEDGER` | `apps/web/lib/ledger/ledger-view.ts:86` | machine-provenance ledger publishing |
| `EMERGENCY_RELIABILITY_UNTIL` / `EMERGENCY_REASON` / `EMERGENCY_OVERRIDE_ID` | `apps/web/lib/ai-control-plane/cost-mode.ts:90-97,275-304` | time-boxed emergency override of AI cost-mode; all three required + unexpired or fails closed | this directory (`apps/web/lib/ai-control-plane/**`) is law-2 frozen for agent edits |
| `AI_ENV_CLASS` / `LLM_COST_MODE` | `apps/web/lib/ai-control-plane/cost-mode.ts:131,164,231` | Claude spend-mode resolution; invalid value fails the deploy closed | same frozen directory |

None of these are public-facing launch gates; listed for completeness per the
brief's "every gate and env flag the platform reads" ask.

### 4.7 Airwave intake (`apps/web/lib/airwave/intelligence-control-plane.ts:80-86`)

`AIRWAVE_ENABLED`, `AIRWAVE_SIRIUSXM_LEGAL_ACK`,
`AIRWAVE_TRANSCRIPT_IMPORT_ENABLED`, `AIRWAVE_YOUTUBE_FEEDS_ENABLED`,
`AIRWAVE_PODCAST_RSS_ENABLED`, `AIRWAVE_BEAT_REPORTS_ENABLED`,
`AIRWAVE_STUDIO_HANDOFF_ENABLED` — all default off; `policy.airwave:
"illustrative demo — keep unlabeled as live intake"` confirms this is
explicitly not a launch surface. Not evaluated further.

### 4.8 Removed / legacy

- `FANTASY_PUBLIC_TOOLS_ENABLED` — dead. `apps/web/middleware.ts:80` notes the
  old gate is gone; fantasy tool access is now entitlement-only
  (`canUseFantasyFull`), not env-driven.

### 4.9 Jynx / multi-cloud AI failover

`JYNX_MODE` (`apps/web/lib/claude-api/jynx.ts:80`), `JYNX_CLOUD_FAILOVER`
(`jynx.ts:73`) — internal routing config, not product-facing.

---

## 5. Ratchet check (manual, this pass)

The brief's deliverable 5 asked for an automated grep-based ratchet test
that fails CI if a new `process.env` flag appears without a matrix row. That
test was **not written this pass** (see Deferred). As a manual substitute,
here is the search that a future ratchet test should run, and its result
against this matrix as of `8cc0695`:

```
git grep -hoE 'process\.env(\.|\[")[A-Z][A-Z0-9_]*' -- apps/web packages \
  | sed -E 's/process\.env\.?\[?"?//; s/"?\]?$//' | sort -u
```

This returns credentials, price IDs, and routing config alongside real gates
(as both research passes noted) — a real ratchet test would need the same
exclusion list used in §4's grouping (DB/URL/secret/price-ID/model-routing
vars) to avoid false positives. Building and tuning that list is exactly the
kind of thing worth getting right once in code rather than re-deriving by
hand each time, which is why it's deferred rather than hand-rolled here.

---

## 6. Deferred (explicitly out of scope for this pass)

Per the founder/user's direction, this pass produced **only** the matrix
above. Not done, and not started:

1. **STATS_PUBLIC per-field fail-closed gating + tests** (§2 describes the
   shape; no code was written).
2. **Browser-agent script F** — the ordered Vercel Production variable
   sequence for the founder's browser agent to execute. §1 above documents
   precondition/verification/rollback per gate, which is most of the
   groundwork, but the explicit ordered script was intentionally held back.
3. **The grep-based ratchet test** (§5 documents the search it would run).

Recommended next step, if the founder/user wants to continue: review §1
(launch-critical gates) and §2/§3 (STATS_PUBLIC, LIVE_BOARD) findings, then
decide whether to green-light the STATS_PUBLIC per-field gate + tests as a
follow-up commit on this same branch, and/or the ratchet test. Both are
small, reversible, single-purpose changes once scoped, consistent with a
"smallest validation command" approach — but neither should proceed without
that go-ahead, per the earlier scoping decision on this session.
