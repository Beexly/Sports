# GSE 2026 — Revenue Intelligence OS (Workstream I)

> Companion research doc to `apps/web/lib/gse/revenue-intelligence-os.ts`.
> Internal only. Not customer-facing. No fabricated metrics — every number in
> this doc is **ILLUSTRATIVE / modeled** unless wired to live instrumentation.
> Pricing is **never** invented here: the single source of truth is
> `apps/web/lib/pricing/pricing-phases.ts`.

---

## 0. Thesis: GSE must think for the business too — without betraying trust

Galaxy Sports Edge (GSE) already thinks for the *user*: what matters today, what
changed, how confident the model is, when the smartest call is No-Bet. The
Revenue Intelligence OS extends that same discipline to the **business** — but
under a hard constraint: **revenue may never come at the cost of trust or user
agency.**

The product's entire moat is credibility. A single fake-urgency banner, a fake
"347 people bought this" counter, or a win-is-promised headline would convert
a few users today and destroy the only asset that compounds. So the Revenue
Intelligence OS is built on one inversion:

- **Free proves trust.** It demonstrates how GSE thinks, shows real (eventual)
  calibration, and earns the right to charge.
- **Paid unlocks deeper decision intelligence.** Not "more picks." The full
  board, the factor trail, line movement, calibration, CLV — the reasoning layer.

The OS monitors the business, surfaces the highest-leverage revenue move, and
**refuses** any move that violates the trust contract. Trust is a gate, not a
suggestion.

---

## 1. What the OS monitors

The OS ingests signals across the full revenue surface. Each monitored stream
has a **freshness SLA** (stale data is treated as a defect, per the no-stale-data
rule) and a **trust flag** (does acting on this signal risk user trust?).

### 1.1 Acquisition & top of funnel
- **Traffic** — sessions by source (organic, direct, referral, social, affiliate
  inbound), landing page, device. Watches for bot/junk inflation.
- **Free signups** — rate, source attribution, signup→activation lag.
- **Conversion-page quality** — pricing-page bounce, scroll depth, CTA reach,
  copy that passes the banned-phrase scanner (see §7).

### 1.2 Activation & engagement
- **Onboarding completion** — % reaching first "aha" (first board view, first
  No-Bet explanation read, first confidence score understood).
- **Feature usage** — which surfaces get used (board, factor trail, line
  movement, fantasy tools, calibration), depth, repeat rate.
- **Product readiness** — is the surface a user would upgrade *for* actually
  shipped, tested, and not gated behind a stub? (No selling vapor.)

### 1.3 Monetization
- **Upgrade triggers** — which moments produce upgrade intent (hit a gate, viewed
  locked factor trail, viewed calibration teaser).
- **Subscription starts** — Pro/Elite, monthly/annual, by phase (FOUNDING today).
- **Pricing experiments** — annual-vs-monthly framing, gate placement, plan-card
  ordering. **Price values themselves are NOT experiment variables** — they are
  fixed by the proof-gated ladder. Only *presentation* is testable.

### 1.4 Retention & risk
- **Churn risk** — declining usage, failed payments, support friction, no-login
  streaks.
- **Cancellation reasons** — structured exit survey (price, didn't use, didn't
  trust the record yet, technical, life). Reasons feed the Retention Loop and the
  Revenue Autopsy.
- **Refund risk** — early-cycle dissatisfaction, dispute/chargeback signals.

### 1.5 Growth economics
- **Campaign / content / affiliate performance** — by channel, with honest
  attribution (no double-counting, no vanity ROAS).
- **Sponsor inventory** — available placements, sold/unsold, integrity status.
- **Data-source costs** — The Odds API call volume/cost, Anthropic token spend,
  infra; cost-per-active-user and cost-per-paying-user.
- **Support burden** — ticket volume, top categories, time-to-resolve, deflection.

### 1.6 Governance
- **Trust signals** — public calibration freshness, claim-scanner pass rate,
  disclosure presence on every monetized surface.
- **Compliance risk** — responsible-gaming framing present, affiliate disclosures
  present, no banned phrasing live, scraping-rights posture intact.

---

## 2. Core entities

These mirror (or will mirror) types in `revenue-intelligence-os.ts`. All money
fields are USD. All `*_at` fields are timestamps with a freshness SLA.

| Entity | Purpose | Key fields |
|---|---|---|
| `RevenueEvent` | Atomic, append-only business fact | `id`, `type` (signup, activate, upgrade, renew, churn, refund, dispute), `userSegmentId`, `funnelStageFrom`, `funnelStageTo`, `amountUsd`, `planId`, `pricingPhaseId`, `source`, `occurredAt`, `trustImpact` |
| `FunnelStage` | Named step in the journey | `id`, `name` (Visitor → Free → Activated → Upgrade-Intent → Paying → Retained → Advocate), `order`, `entryDef`, `exitDef`, `medianTimeInStage` |
| `UserSegment` | Cohort for honest analysis | `id`, `label` (e.g. "organic-free-30d", "founding-pro-annual"), `acquisitionSource`, `sport`, `tier`, `cohortMonth` |
| `ProductGate` | A free→paid boundary | `id`, `surface`, `tierRequired`, `whatIsShown` (the trust-building tease), `whatIsLocked`, `upgradeTriggerId`, `isHonest` (shows real value, not a fake wall) |
| `UpgradeTrigger` | A moment that earns upgrade intent | `id`, `gateId`, `context`, `copyVariantId`, `intentRate` (ILLUSTRATIVE), `bannedPhraseClean: boolean` |
| `PricingPlan` | A purchasable plan — **read-only mirror of pricing-phases.ts** | `tier` (PRO/ELITE), `interval`, `monthly`, `annual`, `pricingPhaseId`, `grandfathered: boolean` |
| `Campaign` | A marketing push | `id`, `channel`, `claimSet` (must pass claim-scanner), `spendUsd`, `attributedSignups`, `attributedPaid`, `disclosurePresent` |
| `Sponsor` | A paid placement partner | `id`, `name`, `placement`, `inventoryStatus`, `integrityReview`, `disclosureId` |
| `AffiliatePartner` | A revenue-share partner | `id`, `name`, `category` (e.g. sportsbook-adjacent tooling), `disclosureId`, `complianceReview`, `responsibleGamingAligned: boolean` |
| `Disclosure` | A required transparency statement | `id`, `kind` (affiliate, sponsor, modeled-data, responsible-gaming), `text`, `surfacesShownOn`, `lastVerifiedAt` |
| `ChurnRisk` | A scored retention threat | `userId`, `score` (0–100, ILLUSTRATIVE), `topReasonCodes`, `recommendedActionId`, `computedAt` |
| `RetentionAction` | A trust-safe retention move | `id`, `trigger`, `action` (re-onboard, surface unused value, pause offer, honest downgrade path), `isManipulative: false` (invariant) |
| `RevenueExperiment` | A presentation test (never a price test) | `id`, `hypothesis`, `variants`, `metric`, `guardrailMetrics` (trust, refund, complaint), `status`, `result` |
| `RevenueAutopsy` | Post-mortem of a churn/refund/failed launch | `id`, `subjectType`, `whatHappened`, `rootCause`, `trustImplication`, `fix`, `preventionGate` |

**Invariants:**
- `RevenueEvent` is append-only and auditable (mirrors the picks-are-versioned rule).
- `PricingPlan` **must** derive from `pricing-phases.ts`; the OS never holds an
  independent price. Drift is a CI failure.
- Any `RetentionAction`, `UpgradeTrigger`, `Campaign`, or copy variant with a
  failing banned-phrase or claim scan is **blocked**, not warned.

---

## 3. Tie to trust (the non-negotiable layer)

Every revenue surface is checked against the Trust Contract before it can ship.

**Banned at the source (never used, even in examples):**
fake urgency, fake countdowns, fake scarcity, fake social proof / fabricated
buyer counts, promised-outcome language, exploitative gambling copy ("bet the
rent," chase-your-losses framing), and the phrases the CI scanner forbids.

**Required on every monetized surface:**
- Clear affiliate disclosure where an affiliate link exists.
- Clear sponsor labeling where a placement is paid.
- "Modeled / illustrative" labels on any non-settled projection.
- Responsible-gaming framing present and not buried.
- Subscription value stated plainly: what you get, what stays free, that founding
  pricing is locked for life, and how to cancel.

**The doctrine, restated:**
- **Free proves trust** — it shows how GSE thinks and (over time) the real record.
- **Paid unlocks deeper decision intelligence** — the full board, factor trail,
  line movement, calibration, CLV. Never "more picks for more money."
- **User agency is sacred** — No-Bet is always a first-class answer; the product
  never pressures action, and that includes purchase pressure.

A revenue move that requires deception is, by definition, off the table — the OS
treats it as a `compliance risk` event and routes it to a Revenue Autopsy.

---

## 4. Surface: Revenue Signal Board

The owner's single morning view. Each tile carries a value (ILLUSTRATIVE),
a trend arrow, a freshness stamp, and a trust flag.

```
┌─ REVENUE SIGNAL BOARD ───────────── (data ≤ 24h · 0 trust flags) ─┐
│ ACQUISITION   Visitors  Free signups  Signup→Activate              │
│               1,240 ▲     86 ▲          41% ▬     [ILLUSTRATIVE]   │
│ MONETIZATION  Upgrade-intent  Paid starts  MRR (founding rates)    │
│               54 ▲            7 ▲          (from pricing-phases)    │
│ RETENTION     Churn-risk users  Cancels (7d)  Top reason           │
│               12 ▲            2 ▬          "didn't use yet"         │
│ ECONOMICS     Odds-API cost  AI token cost  Cost / paying user     │
│               $— ▬           $— ▬          [modeled]               │
│ GOVERNANCE    Calibration age  Claim-scan  Disclosure coverage     │
│               (public)        PASS          100% required          │
│ TOP MOVE TODAY  → "Onboarding drop at confidence-score step (§5)"  │
└────────────────────────────────────────────────────────────────────┘
```

Rules: any GOVERNANCE tile failing turns the whole board's "TOP MOVE" into a
trust-fix, which **outranks** any growth move. Trust defects are P0.

---

## 5. Surface: Conversion Friction Map

Stage-by-stage where users stall, with the honest fix (never a manipulation).

| Stage | Friction (ILLUSTRATIVE) | Honest diagnosis | Trust-safe fix |
|---|---|---|---|
| Visitor → Free | High pricing-page bounce | Value not legible in 5s | Clarify "free proves how we think" |
| Free → Activated | Drop at confidence-score step | Concept unexplained | Inline glossary, No-Bet example |
| Activated → Upgrade-intent | Few hit a gate | Gates invisible | Show *what* is behind the gate honestly |
| Upgrade-intent → Paid | Intent, no purchase | Annual value unclear | Show annual savings (real math) + grandfather guarantee |
| Paid → Retained | Early churn | Didn't form a habit | Re-onboard to one unused high-value surface |

Each row links to a `RevenueExperiment` whose **guardrail metrics** include refund
rate, complaint rate, and claim-scanner status. A variant that lifts conversion
but raises refunds or trips a guardrail is rejected.

---

## 6. Surface: Free-to-Paid Gate Map

Each gate must be **honest**: it shows enough real value to make the paid tier
legible, never a fake wall. Tiers/prices are read from `pricing-phases.ts`
(FOUNDING phase live today).

| Surface | Free sees | Gated (Pro $14.99/mo · $99/yr) | Gated (Elite $24.99/mo · $179/yr) |
|---|---|---|---|
| Daily board | Partial board, paid rows clearly locked | Full board, all signals | — |
| Reasoning | "How GSE thinks" methodology | Full factor trail per signal | — |
| Confidence | Concept + free-pick scores* | Confidence reasoning depth | — |
| Line movement | — | Movement history | Deeper market-movement context |
| Calibration / CLV | Public proof snippets | — | Calibration reports, CLV tracking |
| Alerts | — | Basic alerts | Real-time email & push alerts |

\* Free-tier pick allotment and confidence visibility follow the CLAUDE.md tier
spec (Free: 1 pick/day, no confidence scores) as the governing summary; the live
copy/entitlement detail is owned by the pricing & entitlements modules — the OS
reads, never redefines, them.

**Ladder context (named ahead of time, from `pricing-phases.ts`):**
FOUNDING (live) → PROVEN (≥100 settled + published calibration) → ESTABLISHED
(≥500 settled + verified CLV ≥52.4%) → AUTHORITY (multi-season ROI). Founding
subscribers are grandfathered for life. Each step-up ships added value and is a
deliberate human action, never automatic.

---

## 7. Surface: Trust-Safe Copy Library

Reference headlines/CTAs that pass the banned-phrase rules. All make claims the
product can back with real (eventual) calibration, or make **process** claims
(what GSE does) rather than **outcome** claims (what you'll win). None use
urgency, scarcity, social proof, or outcome guarantees.

| # | Headline | CTA |
|---|---|---|
| 1 | "See how GSE thinks before you pay a cent." | "Preview the system" |
| 2 | "Today's full board, with the reasoning behind every call." | "Read the board" |
| 3 | "Understand the market behind the slate." | "Go Elite" |
| 4 | "When the smartest move is No-Bet, we say so." | "See a No-Bet example" |
| 5 | "Confidence scores, explained — not just asserted." | "Learn how we score" |
| 6 | "Your founding rate is locked for the life of your subscription." | "Claim founding pricing" |
| 7 | "Pay yearly, keep more — here's the exact math." | "Compare plans" |
| 8 | "Every signal shows its work." | "Open the factor trail" |
| 9 | "We publish our calibration. Read it before you trust it." | "See the record" |
| 10 | "Free proves we're worth it. Paid goes deeper." | "Start free" |
| 11 | "Line movement, in context — what changed and why." | "Unlock movement" |
| 12 | "Cancel anytime. We'd rather earn the renewal." | "Manage subscription" |

Every variant carries `bannedPhraseClean: true` and is re-scanned on each copy
change. A failing scan blocks publish.

---

## 8. Surface: Launch Calendar

Sequenced so trust infrastructure leads revenue infrastructure. Dates are
**ILLUSTRATIVE planning placeholders**, not commitments.

| Window | Ship | Revenue tie | Trust gate that must pass first |
|---|---|---|---|
| Now | Honest gate map + disclosures live | Upgrade-intent legibility | Claim scan, disclosure coverage 100% |
| Next | Onboarding fix (confidence-score step) | Activation lift | No-Bet example present |
| Next | Annual-savings clarity (real math) | Annual mix lift | Grandfather guarantee shown |
| Later | Public calibration page polish | Unlocks PROVEN phase | ≥100 settled + calibration published |
| Later | Affiliate/sponsor panel GA | New revenue line | Every partner disclosed + RG-aligned |
| Research | CLV tracking surface | Unlocks ESTABLISHED phase | ≥500 settled + CLV ≥52.4% verified |

Pricing step-ups are **gated by proof milestones**, not by the calendar.

---

## 9. Surface: First-100-Paying-Users Plan

Goal: 100 paying subscribers **without** a single trust violation. Numbers are
ILLUSTRATIVE targets, not claims of achievement.

**Phase A — Earn the right (0 → ~30 paying)**
- Make Free genuinely useful: methodology preview, No-Bet examples, glossary.
- Publish honest proof snippets; begin building toward ≥100 settled picks.
- Hand-onboard early users; record every cancellation reason verbatim.

**Phase B — Make the gate legible (~30 → ~70)**
- Tune the Free-to-Paid Gate Map so the paid value is obvious, never walled.
- Ship the annual-savings clarity (real math from `annualSavingsPct`).
- Lead with the grandfather guarantee for founding members.

**Phase C — Compound trust into referrals (~70 → 100)**
- Activate honest referral (give real value, no fake "your friends are waiting").
- Stand up affiliate/sponsor lines *only* with full disclosure.
- Run a Revenue Autopsy on every churn to close the leak before scaling spend.

**Hard guardrails:** no paid acquisition until cost-per-paying-user is modeled and
positive against founding LTV; no scaling a channel whose copy fails the scanner.

---

## 10. Surface: Retention Loop Monitor

Watches the post-purchase relationship and fires only **trust-safe** actions.

```
ChurnRisk(score, reasons) ──► RetentionAction (isManipulative:false)
   usage decline      ──► re-onboard to one unused high-value surface
   "didn't use yet"   ──► show the value they haven't opened (honest nudge)
   failed payment     ──► quiet dunning + easy update (no shame, no lock-out trap)
   price concern      ──► honest annual option / downgrade path (never dark pattern)
   trust-not-yet      ──► point to the live calibration / record
   leaving anyway     ──► frictionless cancel + exit survey → RevenueAutopsy
```

Forbidden retention moves (rejected by invariant): hidden cancel flows,
guilt/manipulation copy, fake "you'll lose your spot" scarcity, surprise renewals
without notice. The product would rather lose a subscriber than a reputation.

---

## 11. Surface: Sponsor / Affiliate Integrity Panel

Every external-revenue relationship passes an integrity review before going live.

| Check | Requirement |
|---|---|
| Disclosure | `Disclosure` record present + rendered on every surface that shows the link/placement |
| Responsible gaming | Partner aligned with RG framing; no exploitative targeting |
| Independence | Sponsorship/affiliate status **never** influences picks, confidence, or rankings — and that separation is stated |
| Claim safety | Partner-supplied copy passes the banned-phrase + claim scanner |
| Inventory honesty | "Sold out" / scarcity only if literally true |
| Audit | Each placement is a `RevenueEvent` with `trustImpact` logged and reviewable |

If a partner asks for fake urgency, fabricated proof, promised-outcome framing,
or pick influence, the relationship is declined and logged. Revenue does not buy
the editorial wall.

---

## 12. Revenue Autopsy (closing the loop)

Every churn, refund, dispute, failed launch, or trust near-miss produces a
`RevenueAutopsy`: what happened, root cause, **trust implication**, the fix, and
the **prevention gate** added so it can't recur. Autopsies feed §5's friction map
and §8's calendar. The OS optimizes revenue the way the product optimizes picks:
auditable, calibrated against reality, and willing to say No-Bet — here, No-Sale —
when the only path forward would cost trust.

---

### Appendix A — Numbers disclaimer
Every metric, rate, count, and target in this document is **ILLUSTRATIVE /
modeled** for design purposes. No real user counts, revenue figures, or
testimonials appear here. Prices shown are **read** from
`apps/web/lib/pricing/pricing-phases.ts` (FOUNDING phase) and are not redefined.

### Appendix B — Integrity guarantees
This document uses **no** fake urgency, **no** fake social proof, **no**
promised-outcome language, and **no** exploitative gambling copy. All sample
copy is designed to pass the CI banned-phrase scanner.
