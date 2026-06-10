# 00 — Executive Summary — Founder Audit 2026-06-09

**Scope:** Eleven-lens read-only audit across the two clones —
**DEPLOY** = `C:/Users/Garrett/Sports` (the launch target; narrower picks/board product) and
**CANONICAL** = `C:/Users/Garrett/Sports-canonical-2026-06-03` (the full platform: Player Lab,
intelligence engines, Airwave, department-heads cockpit, fantasy).
This summary synthesizes lenses 01–11. **Lens 05 (Departments/Heads/Process) has now been produced
— grade B** (see `05-departments-heads-process.md`). It surfaced no P0 and reinforces the dominant
two-clones theme: the operator PROCESS is genuinely wired (ingestion→scoring→publish-gate→board, an
honest cron, every regulated step human-gated) and Jarvis + the guardrail-script CI gates are real,
but the **entire Department-Heads cockpit and Compliance-Program model live CANONICAL-only and are
absent from the launch tree** — and DEPLOY's HEAD branch matches no CI push trigger. Both fold into
the existing consolidation/process items (P0-1 / P1-6 / P1-8); the top-10 below is unchanged.

---

## 1. One-page verdict

**This is a genuinely strong, trust-first build held back by one structural problem: it is two
products in one repo, and the launch target is the weaker twin on several things that matter for
shipping correctly.**

The engineering quality is real and, in several places, better than funded competitors. Strict
TypeScript with almost no escape hatches, effectively zero rotting debt, a mature CI matrix with
real-Postgres tests and five dedicated policy gates, and hand-written guardrail scripts (trust-gate,
model-freeze, draft-only) that are real engineering, not theater. The **trust posture is the crown
jewel**: calibration is a real Brier + reliability implementation that is evidence-only and can
*never* auto-apply; the performance surface fails closed and refuses any win-rate until it is
earned; the per-pick audit endpoint refuses to leak method, stake, or raw payloads; demo data is
gated and always PENDING so no fake win-rate can leak; and the security/compliance posture is
encoded in code (fail-closed promotions gate with zero approved partners, a banned-phrase scanner
wired into CI as a hard blocker, an Airwave pipeline that refuses by default). Across nine graded
lenses the cluster sits at **B− / C+**, with **security at B+** — a high floor for a pre-launch
solo build.

The two things that pull every grade down are the same two things, everywhere:

1. **Two-clones drift.** The matured work — design tokens, observability stack, pricing-phase
   ladder, migrate-in-build, HSTS, financial guardrails — largely lives in CANONICAL, while DEPLOY
   (what actually ships) runs the older system. The drift is **bidirectional** (DEPLOY uniquely has
   the clean liveness/readiness split and a production-guarded `DEV_FAKE_ADMIN`), so neither clone
   is a superset and any future promotion is a large, schema-sensitive merge.
2. **The edge is ambition, not yet reality.** The headline "edge" is largely circular — it de-vigs
   the book's own consensus price and compares it to that same price; the two independent-estimate
   fields are hardcoded `null`. Today the product is a *calibrated consensus tracker*, honestly
   labeled as such, not yet an engine with its own edge. The 70% target is correctly framed
   everywhere as an engineered north-star, never asserted as fact.

**Net:** Launch verdict is **GO-WITH-FIXES** for the narrow DEPLOY product — the launch engineering
is there, but it is not launchable *today*: production DB + ingestion are unprovisioned (so
`/api/ready` is correctly 503), and DEPLOY's own cron cadence vs. freshness gate contradict each
other, plus migrate-in-build and HSTS are missing from DEPLOY's `vercel.json`. None are crashes or
trust leaks — they are provisioning/operational gates. Every money/legal/regulated switch is
correctly founder-gated and must stay that way.

---

## 2. Cross-cutting themes (appear across multiple lenses)

1. **Two-clones drift is THE dominant finding — it shows up in 9 of 10 graded lenses.**
   Aesthetic (DEPLOY ships the old token system, 1696 raw-neutral occurrences vs 36), IA/UX (two
   different products, two front doors selling two first-value props), Brand (`trust-claims.ts` /
   `brand.ts` diverged), Financials (**two incompatible pricing + Stripe-wiring systems** — P0),
   Data (canonical still carries the masked-success cron bug DEPLOY fixed), Code (schema +
   migrations + CI-trigger drift, ~598 vs ~1244 TS files), Security (canonical missing the
   production guard on `DEV_FAKE_ADMIN` — P0), Launch (migrate-in-build + HSTS missing from DEPLOY),
   Observability (entire stack canonical-only). The drift is the connective tissue of this whole
   audit.

2. **"Gated-but-unwired" — built well, not yet connected.** A recurring, *honest* pattern: real
   machinery exists but is inert. Canonical's resilience toolkit (failover, circuit breaker, source
   registry) has zero live callers; `currentEdgeIndex` and `GateDecision` are read but never
   written in production; Kelly staking is built but deliberately off the public API; the
   observability integrations are all no-op without keys. This is mostly *good discipline* (shadow-
   first, fail-closed) — but a few named public surfaces (Edge Index) are permanently null+fallback,
   which is a trust risk if a customer assumes the name implies a populated metric.

3. **Trust/accuracy vs. ambition.** The trust *scaffolding* is A-grade; the *edge* underneath is
   C-grade and circular. Calibration tracks reliability but not resolution, there is no out-of-
   sample/walk-forward validation harness, and the tier grader (canonical) labels a pure within-
   position percentile as "Elite" with no absolute floor (the "Tua = Elite" mislabel). The product
   is honest about all of this — but the gap between "looks like an intelligence engine" and "is
   one" is the central R&D story.

4. **Reveal-less restraint vs. glass-box density.** The product mostly resolves this well
   (JSON demoted to ghost pills, method kept founder-only, tier-gates blur depth not the rating),
   but the tension surfaces as AI-tic copy density ("X, not Y" 106×, em-dash 1002× in canonical),
   eyebrow-on-everything, and a brand promise fragmented across three headlines — the strongest one
   ("Proven, not explained") absent from the launch target, which leads with its weakest defensive
   framing ("We're not AI").

5. **Money/legal correctly founder-gated everywhere — keep it that way.** Affiliate surface is
   hard-off (zero approved partners), real-money/chance fantasy is founder/legal-gated, pricing
   phases advance only by human action defaulting to FOUNDING, Airwave live capture needs legal
   sign-off, performance stats are gated. The audit found **no** autonomous-flip risk on money/legal
   — the posture is right. Every regulated item (21+ age gate, state geo-gating, helpline
   reconciliation, dunning policy) needs a founder/legal hand before its switch is flipped.

6. **Single-source fragility on the live data spine.** DEPLOY ingests exactly one external source
   (The Odds API) with no failover; a single outage/quota/key-revocation blacks out the board (two
   keys already leaked/rotated 2026-06-03). The fail-closed truth contract that prevents *masking*
   that failure is excellent — but it cannot manufacture a second provider.

---

## 3. Top 10 things that matter most right now (ranked)

| # | Item | Severity | Clone | Why (one line) |
|---|------|----------|-------|----------------|
| 1 | **Provision prod DB + one real ingestion; get `prod-probe` green** | P0 | deploy | The single hard launch gate — `/api/ready` is correctly 503 until this exists; nothing ships until it's green. |
| 2 | **Cron cadence (daily) contradicts 60-min freshness gate** | P0 | deploy | Even with a DB, `/api/ready` goes red ~23h/day on Vercel; readiness can't stay green until cron cadence and the freshness window agree. |
| 3 | **Port `migrate-if-configured.mjs` + migrate-in-build into DEPLOY `vercel.json`** | P0 | deploy | Without it a fresh prod DB never gets schema → every DB read fails → permanent 503; this is the exact fix that took canonical from ~80% deploy-error to green. |
| 4 | **Two incompatible pricing + Stripe-wiring systems across clones** | P0 | both | Displayed price *and* the Stripe price-ID env schema disagree ($19/$49 vs Founding $14.99/$24.99) — whichever tree deploys decides what customers are actually charged. Reconcile before any Stripe key goes live. |
| 5 | **CANONICAL `DEV_FAKE_ADMIN` is not production-guarded** | P0 | canonical | If that flag ever leaks into a canonical prod deploy it mints ADMIN+ELITE for every visitor; DEPLOY's d26c306 hardening was never ported. |
| 6 | **DEPLOY ships the OLD design system; matured redesign is canonical-only** | P0 | both | The launch target's `page.tsx` is raw `bg-gray-950`, no surface tokens in its Tailwind config (token classes would silently no-op), no Reveal/cinematic — what launches is not the design that was matured. |
| 7 | **Single odds provider, zero failover on the live spine** | P0 | deploy | One outage/quota/key-revocation blacks out the entire board; a launch-critical resilience gap (keys already leaked once). |
| 8 | **The engine's edge is circular; independent-estimate fields are inert** | P1 | both | `trueEvScore`/`fairProbability` are hardcoded null — today it's a calibrated consensus tracker, not an edge engine; the keystone of the accuracy story. |
| 9 | **User-facing read paths never check freshness; stale data renders as "live"** | P1 | deploy | The fail-closed write-side contract has no read-side complement — `/api/picks` + board serve day-old odds labeled live; directly undercuts the trust pitch. |
| 10 | **Observability stack + client error capture absent on DEPLOY** | P1 | both | A real prod incident on the launch target is visible only via raw `console.*`; the error boundary's copy promises a trace that nothing captures. |

**Honorable mentions just below the line (P1, founder/legal):** responsible-gaming helpline number
conflicts across surfaces (1-800-GAMBLER vs 1-800-522-4700) — *legal*; 21+ age gate and state
geo-gating are designed-not-built and are hard prerequisites before any affiliate/real-money path —
*legal*; missing HSTS header on DEPLOY; no dunning grace window (one failed invoice instantly drops
a paying customer to FREE) — *money-UX*; tier grader "Elite" mislabel with no absolute floor
(canonical).

---

## 4. The single most important thing to do next

**Declare one source-of-truth tree for the launch and close the four launch-blocking deltas on it,
in order: (1) provision DB + ingestion, (2) reconcile cron cadence with the 60-min freshness gate,
(3) port migrate-in-build, then re-run `prod-probe` to green.**

Everything else is downstream of this decision. The repeated, cross-lens damage is *drift* — the
audit keeps finding the better implementation in the clone that isn't shipping. Before adding any
feature, pick the deploy tree, write the one-way canonical→deploy promotion checklist
(schema → migrations → config → guardrails → code), and add a CI parity check that fails on
unexpected drift. The launch-readiness path itself is short and well-understood (the launch docs are
unusually disciplined — explicit GO / WATCH / NO-GO matrix and rollback triggers already exist);
the blocker is operational provisioning plus three config ports, not missing product. Keep every
money/legal switch founder-gated throughout — none of the above requires flipping one.

---

## 5. What is genuinely excellent (do not undersell this)

- **Trust-as-code is the standout asset.** Calibration is evidence-only and *cannot* move a weight
  (`canApplyCalibrationAdjustments: false` as a typed constant). The performance surface fails
  closed and refuses premature win-rate claims. The per-pick audit endpoint is best-in-class —
  forensic source-snapshot hash prefixes + byte counts, never raw payloads, never leaks
  method/stake/EV. Demo data is gated and always PENDING. No fake win-rate can leak. This is a
  higher trust bar than most funded competitors clear.

- **Compliance is encoded, not just documented.** The trust-claims registry + banned-phrase scanner
  are wired into CI and the content pipeline as *hard blockers*. The promotions/affiliate gate is
  fail-closed with **zero** approved partners (the affiliate surface is hard-off by construction).
  The Airwave/SiriusXM pipeline refuses by default and double-gates capture behind explicit human
  legal acknowledgement. Injury data uses only public official designations and never asserts a
  medical state. Real-money/chance fantasy is founder/legal-gated with no autonomous payments.

- **The security posture is B+ and real.** Google-OAuth-only with server-side role gates
  everywhere, signature-verified idempotent Stripe webhooks, fail-closed bearer-secret cron, no real
  secrets git-tracked in either clone, sound security headers, and a non-vacuous secret/method-
  leakage CI gate.

- **Engineering health is high.** Strict TypeScript (+ `noUncheckedIndexedAccess`), ~3 escape
  hatches in DEPLOY production lib, ~2 TODO/FIXME in the whole monorepo, build health that isn't
  faked (lint `--max-warnings=0`), a mature CI matrix with real-Postgres tests, and large invariant-
  focused test suites (158/224 test files). The hardest RSC/runtime footgun (node:zlib in the Edge
  bundle) is handled correctly where it counts and unit-tested.

- **The money machinery is production-grade.** Stripe checkout, portal, and a full-lifecycle
  idempotent webhook are implemented (not stubbed) in both clones, gated only by env presence.
  Every money/affiliate lever is inert-by-construction with an active test guard that fails on any
  live URL. The Claude spend governor (per-surface budgets, 4-tier thresholds, hard-cap request-
  blocking) is genuinely good. The pricing-phase ladder ties every price increase to an honesty
  milestone with a grandfather guarantee.

- **The design *system* (canonical) is senior work.** A WCAG-AA-documented token architecture that
  consolidated three competing near-blacks into one canonical scale, an additive light scale for
  dense data, every text token annotated with its measured contrast ratio, reduced-motion safety
  layered three-deep, and a cinematic entrance that is tasteful *and* honest (every numeral labeled
  "illustrative," no fake odds, fully accessible and skippable). The value is real — the problem is
  only that it hasn't reached the launch clone.

- **The launch discipline is unusually mature for a solo founder.** A degraded-safe public surface
  that never crashes, a correct liveness/readiness/health split, a fail-closed truth contract that
  fixed a real masked-success bug, the broad Player-Lab scope *actually* cut from Launch 1 (not just
  promised), and a serious `prod-probe` go/no-go gate with banned-phrase and trust-gate checks.

**Bottom line for the founder:** You have built a trustworthy, compliant, well-engineered product
with a rare honesty posture and a real design system. The work is not in doubt — the *consolidation*
is. Pick the deploy tree, close the four operational blockers on it, keep the money/legal switches in
your own hands, and the narrow launch is a legitimate GO. The "is it really an edge engine yet"
question is the honest next chapter after launch, not a launch blocker — and the code already tells
the truth about where that stands.
