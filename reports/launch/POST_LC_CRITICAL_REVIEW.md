# Galaxy Sports Edge — Post-LC Critical Review

**Status:** ACTIVE CORRECTION TO LC-008 STOPPING POINT  
**Generated:** 2026-07-19  
**Purpose:** identify work that remained pending, was deliberately deferred, or was materially undervalued after LC-000 through LC-008. This document improves the Launch Convergence record; it does not erase the verified work already completed.

## Executive ruling

LC-000 through LC-008 materially improved the system, but the statement that no further autonomous launch work remained was too strong.

Fresh production inspection and a source-level re-review surfaced four autonomous workstreams that should precede release acceptance:

1. **A live intermittent `/nflverse` out-of-memory failure.**
2. **A still-live refund/legal/copy contradiction that exists on `main` but was already fixed on frozen PR #129 and was incorrectly left behind by LC-007.**
3. **A real analytics configuration defect that can render a Microsoft Clarity request containing the literal string `undefined`.**
4. **An incorrect LC-007 mathematical dismissal of PR #122's away-moneyline dispersion bug.**

The owner-only and credential-blocked actions remain real, but the autonomous queue is not empty until the items below are resolved or independently disproven.

---

## New live evidence: production is not globally healthy merely because `/api/health` is green

Fresh Vercel production logs for deployment `dpl_5P1ZN7EBdBdZGzoowfE6i4nEnpmY` showed:

- repeated `GET /nflverse 500` events;
- `Vercel Runtime Error: instance was killed because it ran out of available memory`;
- the same route later returning 200 after a warm/cached execution;
- repeated `prisma:error Error in PostgreSQL connection: Error { kind: Closed }` on successful and failed requests;
- `observability: not wired (no DSN)` across multiple routes;
- `/api/health` returning 200 and `healthy` during the same period.

This is not proof that the whole site is down. It is proof that the current health model is too coarse: one global endpoint can report healthy while a substantial public capability is intermittently unavailable and the runtime emits connection errors.

### Probable `/nflverse` root cause from current source

`apps/web/app/nflverse/page.tsx` cold-loads three reports concurrently:

```text
loadNflverseUsagePulse()
loadQbAgeRbTrendReport()
loadBirthdayUsageTrendReport()
```

The latter two independently fetch, decompress, parse, and retain the same three full-history nflverse artifacts (`player_stats_week`, `players`, `schedules`) in parallel. The usage pulse separately fetches player stats plus rosters. On a cold serverless invocation this creates duplicated compressed buffers, decompressed strings, CSV row arrays, maps, observations, and report objects before any module-local cache can be populated.

The correct fix is not merely increasing memory. The system needs one canonical, single-flight nflverse snapshot/materialization path that can be shared across reports, bounded by explicit resource budgets, with honest partial/degraded states.

---

## LC-007 correction 1: PR #129 contains a launch-critical refund-consistency fix that was not ported

Current `main` still contains contradictory public promises:

- `/pricing` says every paid plan has a **3-day** money-back window.
- `/terms` says refunds may be offered **at discretion** within an unspecified checkout period.
- `StartInSixty`, `TierGatePanel`, and the Trust Claim Registry still say **7-day** refund window.
- `/pricing` prominently promises founding-member pricing locked for life, while current `/terms` does not state that guarantee.

Frozen PR #129 already contains a bounded, reviewed correction:

- `/terms` states the 3-day refund window and founding-rate grandfather promise;
- stale 7-day claims are changed to 3-day;
- the legal last-updated date is advanced.

LC-007 classified PR #129 as entirely evidence-only and concluded no unique launch-critical slice remained. That conclusion was incorrect. The exact DEC-050 legal/copy slice should be re-derived onto current `main` in its own focused PR, with legal-copy tests and no unrelated PR #129 content.

This does not decide broader refund policy beyond the existing public 3-day promise. It makes the legal and marketing surfaces tell one coherent story.

---

## LC-007 correction 2: the PR #122 away-moneyline analysis used a false assumption

LC-007 reasoned that away implied probability equals `1 - home implied probability`, making max-minus-min dispersion side-symmetric.

That assumption is false for real sportsbook American prices with vig. Home and away implied probabilities are not complementary within each book. Consequently:

```text
spread(home implied probabilities across books)
```

need not equal:

```text
spread(away implied probabilities across books)
```

Current `main`'s `bookLineDispersion("MONEYLINE", ...)` reads only `homePrice`. Current `process-sport.ts` also does not persist `bookDisagreementAtLock` at pick creation even though the CLV decomposition names that field as its liquidity/disagreement regressor.

PR #122 therefore remains a potentially real money-truth recovery, not a mere future enhancement. It also carries migrations and Pedersen fields, so it must not be blindly rebased or merged.

Required treatment:

1. Fable-level re-derivation of the side-specific moneyline invariant against current normalized odds and selection formats.
2. Split the work into independently reviewable concerns: side-aware dispersion, write-once capture, schema/migration, Pedersen aggregate, verification surface.
3. Reconcile the production migration ledger first.
4. Test on a disposable database and then a production-schema shadow.
5. Require independent protected-zone red-team review before any production migration or MODEL_VERSION effect.

---

## Analytics and observability were undervalued

### Clarity configuration

`apps/web/app/layout.tsx` renders both Cloudflare Analytics and Microsoft Clarity whenever `NEXT_PUBLIC_ANALYTICS_ENABLED === "true"`. The provider-specific tokens are interpolated without proving they exist. If the master flag is enabled while `NEXT_PUBLIC_CLARITY_PROJECT_ID` is unset, the browser requests a Clarity tag named `undefined`.

This is autonomously fixable: each provider should render only when its own validated identifier exists, and configuration tests should pin that behavior. The public page should not emit malformed third-party requests.

### Sentry / runtime visibility

Production logs repeatedly state `observability: not wired (no DSN)`. The system currently has strong compile-time and synthetic controls but weak runtime memory:

- no durable error aggregation;
- no route-level error budget;
- no correlation between deploy SHA, route failure, source freshness, entitlement flow, and revenue impact;
- no alert when `/api/health` is green but a capability repeatedly fails.

This is not optional polish for a repository of this size. It is the sensory system required to operate it safely.

---

## Pending work — corrected classification

### Autonomous, release-relevant now

| ID | Work | Why now |
|---|---|---|
| OP-001 | Port DEC-050 refund/legal/copy consistency from PR #129 into a clean `main`-based PR | Current public and legal promises contradict each other; LC-007 missed a bounded launch-critical slice |
| OP-002 | Fix `/nflverse` cold-start OOM through a shared single-flight/materialized snapshot layer | Confirmed live intermittent 500; route currently duplicates full-history fetch/decompress/parse work |
| OP-003 | Extend Nightly Sentinel and health semantics to capability-level truth | Current health can say healthy during route OOM and Prisma connection errors |
| OP-004 | Fix provider-specific analytics gating | Prevents malformed `undefined` analytics requests and establishes honest instrumentation prerequisites |
| OP-005 | Re-run full browser QA for `/`, `/tools`, `/track` under a less constrained strategy | Previous pass was honestly incomplete; dense Link prefetch may itself be a low-memory/network issue worth measuring |
| OP-006 | Rebase/re-run CI after PR #128 lands, then independently re-review PR #130 as a whole release candidate | PR #130 has been reviewed by slices, not yet against the corrected pending-work set |

### Fable-required protected review

| ID | Work | Why Fable |
|---|---|---|
| FV-001 | PR #122 side-aware CLV dispersion + write-once capture + migration/Pedersen split | Sonnet's LC-007 analysis made a consequential algebraic assumption that is false under vig; this is money-truth and migration-sensitive |
| FV-002 | Final cross-PR release adjudication | Requires comparing current `main`, #128, corrected launch PRs, #130, migration state, and public promises without allowing scope or policy drift |
| FV-003 | Operational Epistemic Twin architecture contract | Crosses runtime reliability, source freshness, gates, proof, revenue, and user-visible availability; needs architecture judgment before Sonnet implementation |

### Founder / credential actions

| Action | Why it remains external |
|---|---|
| Merge PR #128 | Founder merge authority; CI fix is already clean and green |
| Correct `NEXTAUTH_URL` / `AUTH_URL` and Google callback URI | Production Vercel and Google Console configuration |
| Compare the production Odds API key fingerprint and rotate only on match | Secret-owner access required; raw key must never be exposed to the agent |
| Supply valid business tax ID to Stripe | Account/legal action; Stripe has issued an action-required notice |
| Run Stripe test-mode revenue canary | Requires test keys/dashboard/payment simulation |
| Verify and reconcile production migration ledger / `DIRECT_URL` | Requires production DB and Neon access |
| Decide Model Journal publication ceremony | Founder policy: direct DB promotion, signed manual workflow, or reviewed in-app exemption; auto-publish remains prohibited |

### Deliberately deferred backlog — preserved, not discarded

| Capability | Why deferred | Re-entry condition |
|---|---|---|
| 91-file DFS product tree | Too broad for launch convergence; high integration surface | Product-value decomposition into bounded user journeys after revenue/runtime baseline |
| 25-module `lib/gse` layer | High duplication risk against existing systems | Codebase Twin ownership map and capability-by-capability recovery contract |
| Universal roster paste import | No source UI; needs honest unmatched-data UX and integration into `/fantasy/connect` | After revenue launch; prioritize as onboarding/conversion feature |
| FantasyCoach tooltips | Five separate surfaces; comprehension value not yet instrumented | After basic product telemetry exists |
| Late-Swap UI | Deep DFS state integration, timing and data-freshness sensitive | Dedicated live-data and contest-state contract |
| PR #121 Fantasy Engine | Real product/revenue value, but not launch-core | Post-launch fantasy monetization wave |
| PR #112 governed playback | Strong trust/retention moat, stale/conflicted | Re-derive after release baseline and canonical playback ownership decision |
| PR #124 Foundry/Radar/Assurance | Central to self-expanding architecture, shadow-only | Reconcile into Universal Capability Genome after operational control plane exists |
| PR #125 / #127 Genesis control/kernel | Strategic governance/R&D value, not runtime launch code | Integrate after production truth layer so the self-expanding system optimizes a real operating substrate |
| Dynasty Studio variants | Long-horizon simulation/world-model value | Canonical world kernel and product boundary decision |

---

## What was undervalued

1. **Runtime memory as a product correctness issue.** A route that sometimes returns 200 and sometimes dies on cold start is not merely a performance problem.
2. **Legal-copy convergence as revenue infrastructure.** Pricing, Terms, trust claims, checkout, refund webhooks, and grandfathering must compile from one Revenue Contract.
3. **Telemetry as the prerequisite for Product Twin and Decision Twin.** Without reliable event, error, and journey traces, the self-evolving product cannot distinguish improvement from noise.
4. **PR #122's side-specific CLV capture.** It fills a real write-once evidence gap; the prior dismissal relied on incorrect market algebra.
5. **Roster import.** It is more than a convenience: it reduces onboarding dependence on one external platform and expands the addressable fantasy user base.
6. **Manual publishing as a trust product.** The correct alternative to auto-publish is not an ad hoc DB edit; it is a proof-carrying publication ceremony with claim scan, source-rights receipt, human approval, immutable publication record, and retraction path.
7. **Dense-link prefetch behavior.** Chromium crashes in a constrained environment are not proof of a user defect, but they are useful evidence that route grids may over-prefetch on low-memory or low-bandwidth devices.

---

## Frontier improvement: Operational Epistemic Twin

The next genuinely differentiating system should not be another dashboard. It should make Galaxy aware of the current truth status of every capability.

For each route, engine, model, source, revenue path, and public claim, maintain:

```text
Capability state
Code revision
Deployment revision
Dependencies
Last successful observation
Freshness
Error rate
Latency and memory envelope
Rights state
Entitlement state
Proof status
Revenue impact
Fallback behavior
Current gate
Reason unavailable
Next resolving observation or action
```

This creates an **Operational Epistemic Twin**: a living graph that can answer not only "is the site up?" but:

- Which capabilities are trustworthy right now?
- Which are degraded, stale, proof-gated, rights-gated, or owner-gated?
- Which user journeys are broken even though component endpoints return 200?
- Which source, deployment, model, gate, or policy assumption caused the change?
- What is the smallest action that restores capability?
- What should agents stop doing automatically while the system is degraded?

This is the operational substrate required before Galaxy Genesis can safely acquire capabilities, evolve interfaces, or self-optimize.

---

## Model allocation

Use expensive reasoning only where it changes the quality of judgment:

```text
Fable:
  PR #122 money-truth/migration re-derivation
  cross-PR release adjudication
  Operational Epistemic Twin architecture and adversarial review

Sonnet:
  legal/refund consistency port
  analytics provider gating
  nflverse shared-snapshot implementation after contract freeze
  sentinel/health wiring
  browser QA, tests, docs, focused fixes

Haiku / scout:
  exact symbol and branch mapping
  changed-file inventories
  route and test discovery
```

Fable should not spend tokens on grep, boilerplate, test logs, or straightforward file edits.

---

## Correct next sequence

```text
1. Merge #128.
2. Port DEC-050 legal/refund consistency onto current main.
3. Fix `/nflverse` memory architecture and add route-level canary coverage.
4. Fix analytics provider gating and establish runtime observability owner packet.
5. Correct auth host configuration.
6. Run production DB migration reconciliation.
7. Use Fable for PR #122 re-derivation; re-land only proven, split concerns.
8. Run Stripe test-mode lifecycle and complete Stripe tax-ID action.
9. Rebase and independently review PR #130 plus focused correction PRs.
10. Build Operational Epistemic Twin v0 after release truth is stable.
```

The governing rule remains:

```text
REVIEW → FREEZE → IMPLEMENT → TEST → ADVERSARIAL REVIEW → IMPROVE → POLISH → VERIFY → SHIP → OBSERVE → LEARN → CONTINUE
```
