# GSN — Sales, Conversion & Lifecycle (CRM) Strategy

**Author:** Conversion & lifecycle strategist (GSN). **Mode:** bootstrap, trust-first ("proof not promises").
**Method:** grounded in GSN's *real* code (paths cited inline) + 2026 web benchmarks (URLs cited).
**Labels:** `verified` (read in this repo) · `inferred` (logical read of the code/market) · `recommended` (action) · `speculative` (lower certainty).
**Scope guardrail:** this doc proposes only. It does **not** modify Stripe live mode, money, refunds, or any code. One safe code change is named at the end.

---

## 0. The reality-check that reframes everything (READ FIRST)

**The single most important finding: the spec and the shipped product disagree on price, billing period, and trial — and the conversion strategy must follow the SHIPPED reality, not `CLAUDE.md`.** `verified`

| Dimension | `CLAUDE.md` spec | What is actually shipped | Source |
|---|---|---|---|
| Pro price | $19 **/mo** | **$9.99 /week** (~$43/mo equiv) | `apps/web/app/pricing/page.tsx:53-59`, `apps/web/lib/stripe.ts` `PRICE_DISPLAY` |
| Elite price | $49 **/mo** | **$13.99 /week** (~$61/mo equiv) | same |
| Billing period | monthly | **weekly** (12 → ~52 charge events/yr) | `pricing/page.tsx:368` "Billed weekly" |
| Trial | NextAuth `TRIALING` status exists | **No `trial_period_days`** set in checkout | `lib/stripe.ts` `createCheckoutSession` (only `subscription_data.metadata`) |
| Risk reversal | — | **7-day refund window** (manual, not a Stripe trial) | `pricing/page.tsx:122-123,367-369` |

**Implications, ranked:**
1. **Weekly billing is the highest-stakes packaging decision in the whole system and it is working against GSN.** Weekly = ~52 payment attempts/yr vs 12 monthly / 1 annual. Involuntary (billing-failure) churn scales with attempt count: annual billing cuts attempts from 12→1 and reduces churn ~51% with ~92% retention vs ~68% monthly ([Baremetrics](https://baremetrics.com/blog/annual-vs-monthly-pricing-better-retention), [Subscription Index](https://www.subscriptionindex.com/guides/annual-vs-monthly-pricing)). Weekly is the *worst* case: more dunning surface, more "is this worth it?" decision moments, more card-expiry exposure. `inferred`
2. **The narrow Pro→Elite gap is a packaging problem.** $9.99 vs $13.99/wk is only a **$4/wk (40%) step**, and Elite's *sole* incremental benefit in code is `canGetAlerts` (email+push). `verified` at `packages/types/src/index.ts:86-98` (`canGetAlerts: tier === "ELITE"`) and `pricing/page.tsx:81-91`. The CLAUDE.md "early access / analytics" Elite promises are **not entitlement-backed** — Elite is currently "Pro + notifications." `inferred`
3. **The doc must serve the as-built funnel.** Everything below uses the real weekly prices and the real entitlement gates.

> Recommendation flag: reconciling spec↔reality (and any price change) **touches money** → hard stop. Propose to the operator; do not implement. The *safe* wins below are all UI/lifecycle/instrumentation, not price.

---

## 1. The funnel: visitor → free → Pro → Elite (grounded in the real gates)

GSN's funnel is enforced server-side (good — satisfies CLAUDE.md rule #3). The exact gate is `getUserEntitlements` → `getEntitlements(tier)` → consumed in `apps/web/app/api/picks/route.ts:60` (`...(entitlements.canSeePremiumPicks ? {} : { tier: "FREE" })`) and `take: entitlements.dailyPickLimit ?? 200` (line 77). `verified`

| Stage | What the user hits (real code) | Primary conversion lever | Benchmark anchor |
|---|---|---|---|
| **Visitor → account** | Homepage hero is the **calibration curve + loss autopsy** (`apps/web/app/page.tsx` imports `CalibrationCurve`, `loadHomepageAutopsy`), CTA → `/auth/signin`. `/picks` shows locked picks (`LockedValue`, `pick-card.tsx:427`). | Proof-first hero → curiosity → sign-up. The locked-but-visible pick *is* the ad. | Visitor→signup for opt-in (no card) ≈ 8.5% of visitors ([ADV.me](https://adv.me/articles/conversion-optimization/saas-free-trial-conversion-rate-benchmarks-2025/)). |
| **Free activation** | `dailyPickLimit: 1` (`getEntitlements`), no confidence/edge-detail/factor-trail; **but** Edge Score + Data Quality + Evidence audit drawer are visible to ALL (`canSeeEdgeScore: true`; `pick-card.tsx:173-181` "drives upgrade for FREE"). | **Time-to-value in <1 session**: the free user must *feel* the rigor (audit drawer, data-quality meter) immediately. | Aha-moment in first hour → 4-5× Day-7 retention; reach value <14 days → 80%+ M12 retention ([SaaSMag](https://www.saasmag.com/time-to-value-saas-onboarding-retention-2026/)). |
| **Free → Pro** | The wall: confidence rating, full reasoning, factor trail, line-movement, all-7-sports, unlimited count. Bottom CTA "Upgrade to Pro / $9.99/wk" (`picks/page.tsx:362-378`). | **Gated-confidence tease** (see §3) — the number is *named and locked*, not hidden. | Freemium→paid median ~5.6%; great = 8-12% ([ChartMogul](https://chartmogul.com/reports/saas-conversion-report/)). Role/feature-gating lifted one product to 5.1% / ~2× revenue ([First Page Sage](https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/)). |
| **Pro → Elite** | Only `canGetAlerts`. Teaser exists: "Want early access, daily alerts, and advanced analytics?" (`picks/page.tsx:381-388`) — but **two of three promises aren't entitlement-backed**. `verified` | Expansion must be triggered by a *felt* gap (a pick moved after they saw it → "you'd have been alerted"). | Expansion MRR is the cheapest growth; needs a real Elite-only value moment, not just a price step. |

**Funnel leak diagnosis (`inferred`):**
- **No analytics/event tracking in source.** Searched `posthog|mixpanel|gtag|plausible|track(|captureEvent` across `apps/web`, `packages`, `workers` — only matches are in `.next/` build artifacts and unrelated cockpit/agent code. **GSN is currently flying the funnel blind: it cannot measure visitor→signup→Pro→Elite, paywall-view→click, or churn.** This is the #1 capability gap. `verified` (absence)
- **No lifecycle/email infra.** No `resend|nodemailer|sendgrid|postmark|sendEmail`. **No welcome email, no activation nudge, no dunning email, no winback.** `verified` (absence)
- **Dashboard has no tier-aware upgrade banner.** FREE users see a generic "View Plans" quick link (`dashboard/page.tsx:247`) and a "Tier" stat that shows only Admin/Member (`:192`) — never "Free → upgrade." The highest-intent logged-in surface is under-monetized. `verified`

---

## 2. Packaging & pricing strategy

### 2.1 Is $9.99 / $13.99 weekly right? (`recommended`, money = propose-only)
- **Weekly framing helps the anchor, hurts the lifecycle.** "$9.99/week" feels small at the point of sale (good for first conversion) but produces ~52 renewal decisions and ~52 dunning chances/yr (bad for retention + involuntary churn). `inferred`
- **Recommended packaging target:** keep weekly as the *low-commitment on-ramp*, then **add monthly and annual options** and upsell engaged cohorts to annual. Annual subscribers are ~2.4× more profitable and stay ~40 vs ~14 months ([Baremetrics](https://baremetrics.com/blog/annual-vs-monthly-pricing-better-retention)). The 2026 consensus play: "monthly as low-risk acquisition on-ramp, upsell to annual to lock 50-60% LTV lift." `recommended`
- **Three tiers is correct** — 3-tier pages convert ~1.4× vs 2-tier; 4+ converts worse ([Adapty](https://adapty.io/blog/tiered-pricing/)). Keep three. `verified-ext`

### 2.2 The Pro→Elite gap is too thin and under-differentiated (`recommended`)
- Today: 40% price step for *alerts only*. To justify Elite, make it the **"sharp's edge" tier**, mapping directly onto GSN's moat assets from `COMPETITIVE_INTELLIGENCE.md`: **CLV / closing-line value, early access (publish Elite picks N minutes before Free/Pro), and the model-accountability analytics surface.** These are the things `CLAUDE.md` already *promises* for Elite — make them real entitlements (`canSeeCLV`, `earlyAccessMinutes`) so the price step buys something. `recommended` (engine/entitlement work, not money)
- **Anchoring/decoy:** Elite already carries a badge ("All signals, all alerts", `pricing/page.tsx:79`) and Pro carries "Where most start" (`:58`). Combining anchor + center-stage + "most popular" can lift conversions 25-60% ([Orbix](https://www.orbix.studio/blogs/saas-pricing-page-psychology-convert), [Adapty](https://adapty.io/blog/tiered-pricing/)). Pro is correctly center-staged; keep it the obvious default. `verified-ext`

### 2.3 Trials & founder pricing during bootstrap (`recommended`, propose-only)
- **No trial exists in code** (`createCheckoutSession` sets no `trial_period_days`). The 7-day **refund** is a manual money-back guarantee, not a Stripe trial. Refund-style risk reversal lifts conversion meaningfully (one case +26%; risk-free badge +18% conv, -12% cart abandonment — [Zigpoll](https://www.zigpoll.com/content/how-does-offering-a-moneyback-guarantee-on-shopify-product-pages-impact-customer-trust-and-conversion-rates-over-a-30day-trial-period), [Conversion Fanatics](https://conversionfanatics.com/does-a-money-back-guarantee-matter/)). **So: surface the 7-day guarantee far more prominently** (it's currently buried in FAQ + footer). `recommended`
- **Reverse trial fits GSN's instant-value model best:** drop a new free signup into 7 days of full Pro (confidence + factor trail + CLV), then revert to Free. Reverse trials convert ~25-40% and suit "AI / fast-value tools" ([amraandelma](https://www.amraandelma.com/free-trial-conversion-statistics/), [ADV.me](https://adv.me/articles/conversion-optimization/saas-free-trial-conversion-rate-benchmarks-2025/)). It also lets the user *experience* the locked numbers' payoff. (Requires Stripe `trial_period_days` or an app-side entitlement override → propose-only.) `recommended`/`speculative`
- **Founder pricing during bootstrap:** offer a capped **"Founding Member"** cohort (first N subscribers, e.g. price-locked weekly or a discounted annual). It manufactures the scarcity GSN's ethics allow (real cap, real lock) and seeds the proof flywheel with committed early users. `recommended`

---

## 3. The gated-confidence tease — GSN's core conversion mechanism

This is the heart of the engine and it is **already implemented correctly in spirit**: Free users see the pick exists, the matchup, the pick type, the Edge Score, the data-quality meter, and can open the evidence audit drawer — but the **confidence rating, full reasoning, and factor trail are locked** (`pick-card.tsx:117-161`, `api/picks/route.ts:116-126`). The lock is a named placeholder (`LockedValue label="Conf."`, `pick-card.tsx:120-124,427-440`), not an absence. **This is exactly right: "named + locked" out-converts "hidden" because it quantifies the missing value.** `verified` + `inferred`

**Where it under-performs today (`verified`):**
1. **The lock is inert.** `LockedValue` (`pick-card.tsx:427`) renders a padlock + label with **no click target, no `/pricing` link, no "unlock for $9.99/wk".** A logged-in Free user who taps the locked confidence number gets nothing. The single highest-friction-to-fix conversion atom on the site. (This is the safe code change in §9.)
2. **The factor-breakdown placeholder is a flat sentence**, "Factor breakdown available on Pro & Elite" (`pick-card.tsx:155-160`) — informative but not persuasive and not clickable.
3. **The tease doesn't quantify the loss.** Best practice: show the *shape* of what's hidden (e.g., a blurred bar, "Confidence: ●●%") so the brain fills the gap. Show proof that matches the objection ([Convertibles](https://convertibles.dev/blogs/optimization/increase-ecommerce-conversion-rate)).

**Conversion mechanics to layer on the existing tease (`recommended`):**
- Make every `LockedValue` and the factor-breakdown placeholder a **link to `/pricing` with the price in the label** ("Unlock confidence · $9.99/wk").
- Pair the lock with **retrospective proof**: "Pro users saw this graded result" — leverages GSN's verified track record (the moat) as the unlock incentive, not a hype claim. `recommended`
- On the **3rd** locked-pick view in a session, escalate to an inline reverse-trial offer ("See every confidence score free for 7 days"). Requires the event instrumentation in §6. `recommended`

---

## 4. Checkout / Stripe UX + failure / dunning / winback

### 4.1 What exists (`verified`)
- **Checkout:** `apps/web/app/api/subscriptions/checkout/route.ts` → Zod-validated tier, `getOrCreateStripeCustomer`, `createCheckoutSession` with `success_url=/dashboard?upgraded=true`, `cancel_url=/pricing`. Client (`subscribe-button.tsx`) handles 401→signin, shows founder-voice errors, redirects to Stripe. Solid, idempotent customer creation.
- **Portal:** `api/subscriptions/portal/route.ts` → `createPortalSession` returning to `/dashboard`. Self-serve cancel/update lives here. Good.
- **Webhook:** `api/webhooks/stripe/route.ts` — signature-verified, **idempotent** (`webhookEvent.findUnique` on `stripeEventId`, `:32-37`), handles `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_{succeeded,failed}`. On `payment_failed` it sets `status: "PAST_DUE"` (`:105-113`). On `deleted` it reverts `tier:"FREE"` + `canceledAt` (`:81-92`). Schema backs this: `Subscription` has `status`, `cancelAtPeriodEnd`, `canceledAt`, `trialStart/End`, `currentPeriodEnd`; `WebhookEvent` stores full payload (`packages/db/prisma/schema.prisma`). `verified`

### 4.2 The gaps (`verified` absence / `inferred`)
- **Dunning is passive.** The webhook *records* `PAST_DUE` but nothing acts on it: no retry-schedule awareness, **no dunning email**, no in-app "your payment failed, fix it" banner, no Stripe Smart Retries / card-updater configuration visible in code. With no dunning, businesses recover only ~15% of failed payments; dunning campaigns recover ~32%, and retry+email+card-updater combined recovers ~70% ([Churnkey via DunningCompare](https://www.dunningcompare.com/stats/involuntary-churn-statistics-2026), [Slicker](https://www.slickerhq.com/resources/blog/involuntary-churn-vs-voluntary-churn)). Involuntary churn is 20-40% of total churn ([DunningCompare](https://www.dunningcompare.com/stats/involuntary-churn-statistics-2026)). **On weekly billing this leak is amplified ~4×.** `inferred`
- **No winback / reactivation.** `customer.subscription.deleted` flips to FREE and stops — no exit survey, no "come back" sequence, no save-offer. `verified` (absence)
- **No churn-save at cancel.** Cancel happens silently in Stripe's portal; GSN never sees intent-to-cancel before it's done, so no pause-instead-of-cancel or downgrade-to-Free-with-1-pick save. `inferred`

### 4.3 Recommended (all propose-only where money/Stripe-config is involved)
- **Enable Stripe Smart Retries + Customer Portal cancel-reason capture + "pause subscription"** (Stripe dashboard config → propose to operator). `recommended`
- **Act on `PAST_DUE`:** add an in-app billing banner (safe, no money) + a dunning email sequence once email infra exists (§6). `recommended`
- **Webhook hardening:** also handle `customer.subscription.trial_will_end` (for the recommended trial) and `invoice.upcoming` (renewal reminder for annual). `recommended`

---

## 5. Lifecycle / CRM: onboarding → activation → expansion → save → reactivation

GSN has **zero lifecycle automation today** (no email infra; no event bus). This is the largest untapped revenue surface. The sequences below are the target state; each maps to data GSN must start capturing (§6).

| Lifecycle stage | Trigger | Message / action | GSN-specific hook |
|---|---|---|---|
| **Welcome / onboarding** | account created | Day 0 email: "Here's how GSN grades itself in public" + link to calibration page + today's free pick. | Lead with the moat (graded-in-public), not a discount. |
| **Activation (free)** | first session | In-app: push them to open one **evidence audit drawer** + see the data-quality meter. That's the aha. | TTV <1hr → 4-5× Day-7 retention ([SaaSMag](https://www.saasmag.com/time-to-value-saas-onboarding-retention-2026/)). |
| **Free→Pro expansion** | 3rd locked-pick view, or a Free pick that *graded as a win* | "You saw this pick win. Pro shows you *why* — confidence + factor trail." | Uses GSN's settled record (truthful) as the upgrade trigger. |
| **Pro→Elite expansion** | a pick's line moved after they viewed it | "Elite would have alerted you when this line moved." | Requires real Elite value (alerts/CLV/early access) per §2.2. |
| **Dunning (involuntary)** | `status=PAST_DUE` | In-app banner + 3-email retry sequence ("update your card"). | ~70% recoverable with retry+email+updater ([DunningCompare](https://www.dunningcompare.com/stats/involuntary-churn-statistics-2026)). |
| **Churn-save (voluntary)** | cancel intent in portal | Offer pause / downgrade-to-Free / annual switch before final cancel. | Pause beats cancel; preserves the relationship. |
| **Reactivation / winback** | `canceledAt` + N days | "Here's what the model went 12-7 on since you left" — proof, not plea. | The track record *is* the winback asset; no other pick site can do this honestly. |

**Activation north-star (`recommended`):** define GSN's aha = "viewed ≥1 evidence audit drawer in first session." Every +1% activation ≈ -2% churn at the 36% median ([Artisan](https://www.artisangrowthstrategies.com/blog/user-activation-rate-find-fix-saas-aha-moment)). ~75% of new users abandon in week 1; non-engagement by day 3 → ~90% churn ([UserGuiding](https://userguiding.com/blog/user-onboarding-statistics)). Speed to that drawer is the whole game.

---

## 6. Data & events that MUST be captured (prerequisite for everything above)

**Today GSN captures only billing state (`Subscription`, `WebhookEvent`).** It has no product-analytics or marketing-event layer. Minimum viable event schema (`recommended`):

| Event | Where to emit (real surface) | Powers |
|---|---|---|
| `page_view{path, tier, authed}` | root layout / `/picks` / `/pricing` | funnel base rates |
| `paywall_viewed{pickId, lockedField, tier}` | `pick-card.tsx` `LockedValue`, factor placeholder | tease→click conversion |
| `paywall_cta_clicked{from, tier, targetTier}` | the linked lock (§9), pricing CTAs | the core conversion metric |
| `checkout_started{tier}` / `checkout_completed{tier}` | `subscribe-button.tsx`, webhook `checkout.session.completed` | true conversion + drop-off |
| `activation_aha{userId}` | evidence audit drawer open | activation rate |
| `payment_failed` / `payment_recovered` | webhook `invoice.payment_failed/succeeded` | dunning recovery rate |
| `subscription_canceled{reason}` / `reactivated` | webhook `deleted` + portal reason | churn + winback |

Email/CRM infra: add a transactional provider (Resend/Postmark) + a lightweight events table or PostHog. **No PII in code; keys via env** (CLAUDE.md rule #4). `recommended`

---

## 7. Sales psychology — GSN's ethical, proof-native toolkit

GSN's brand forbids the tout playbook (fake win rates, deleted losses — see `COMPETITIVE_INTELLIGENCE.md` §3). Every lever below is **truth-compatible**:

- **Social proof = the verified record, not testimonials.** The calibration curve, Brier score, loss autopsies, and (recommended) CLV are *self-policing* proof. Show "matched-to-objection" proof at the paywall ([Convertibles](https://convertibles.dev/blogs/optimization/increase-ecommerce-conversion-rate)). This is GSN's unfair advantage — no competitor can show *honest* numbers. `verified`(assets exist) + `recommended`
- **Risk reversal:** the 7-day refund is already real — **promote it hard** at every CTA, not just FAQ/footer. +18-26% conv lift range from prominent guarantees ([Zigpoll](https://www.zigpoll.com/content/how-does-offering-a-moneyback-guarantee-on-shopify-product-pages-impact-customer-trust-and-conversion-rates-over-a-30day-trial-period)). `recommended`
- **Urgency/scarcity — done ethically:** the only honest scarcity GSN has is **time-bound slates** ("locks at first pitch", the 30-min refresh in `pricing/page.tsx` FAQ) and a **real, capped Founding-Member cohort**. Never fake countdowns. `recommended`
- **Center-stage + default:** keep Pro badged "Where most start" and center-staged (`pricing/page.tsx`). `verified` + `verified-ext`
- **Anti-pattern guardrail:** do **not** advertise an accuracy % the calibration page can't defend — it would torch the one moat that matters (`COMPETITIVE_INTELLIGENCE.md` §3 "What NOT to do"). The Performance page is *correctly* gated until statistically defensible (`pricing/page.tsx` FAQ). Hold that line. `verified`

---

## 8. Prioritized conversion-experiment backlog

Each: hypothesis · success metric · failure/kill signal. (P0 = ship first; none touch money except where flagged.)

| # | Pri | Experiment | Success metric | Failure / kill signal |
|---|---|---|---|---|
| 1 | **P0** | **Make locked confidence/edge/factor a clickable `/pricing` link with price in label** (§9). | paywall_cta_click rate >3% of paywall_views; Free→Pro lift. | no click lift after 2 wks of traffic. |
| 2 | **P0** | **Instrument the funnel** (events in §6). | full visitor→Pro→Elite funnel observable. | n/a (enabler). |
| 3 | P0 | **Tier-aware upgrade banner on `/dashboard`** for FREE users (replace generic "View Plans"). | dashboard→pricing CTR; assisted conversions. | CTR < site-avg nav. |
| 4 | P1 | **Promote 7-day money-back guarantee** at every CTA (currently FAQ/footer only). | checkout_started rate ↑. | refund rate spikes >10%. |
| 5 | P1 | **Reverse-trial test** (7 days full Pro on signup). *Stripe trial config = propose-only.* | trial→paid 25-40% ([ADV.me](https://adv.me/articles/conversion-optimization/saas-free-trial-conversion-rate-benchmarks-2025/)). | trial→paid <8% (worse than freemium 5.6%). |
| 6 | P1 | **Add monthly + annual plans; upsell annual.** *Money = propose-only.* | annual mix >25%; blended churn ↓. | annual cannibalizes weekly with no LTV gain. |
| 7 | P1 | **Dunning sequence + in-app PAST_DUE banner** (banner is safe now). | recovered/failed ratio → 30-70% ([DunningCompare](https://www.dunningcompare.com/stats/involuntary-churn-statistics-2026)). | recovery <15% (= no better than passive). |
| 8 | P2 | **Real Elite differentiation** (CLV / early-access / analytics as entitlements). | Pro→Elite expansion rate ↑. | <2% expansion after 60 days. |
| 9 | P2 | **Winback sequence** using the settled record. | reactivation rate of churned cohort. | unsub/complaint rate up. |
| 10 | P2 | **Founding-Member capped cohort.** *Money = propose-only.* | early committed-cohort fill; annual lock-in. | cap fills with low-retention users. |
| 11 | P3 | **Retrospective-proof on locked picks** ("Pro saw this graded win"). | paywall→Pro lift vs control. | no lift / trust complaints. |

**Global guardrail metric:** refund rate, unsubscribe rate, and complaint rate must stay flat — a conversion win that raises any of these violates the trust wedge and is a kill, not a win. `recommended`

---

## 9. THE single highest-leverage SAFE code change

**File:** `apps/web/components/picks/pick-card.tsx` — the `LockedValue` component (currently lines ~427-440) and its three call sites (confidence `:120-124`, edge `:130-134`, factor-breakdown placeholder `:155-160`).

**What:** Turn the inert padlock into a **conversion surface**: wrap `LockedValue` (and the factor-breakdown placeholder) in a Next `<Link href="/pricing">`, and put the price in the label — e.g. `Unlock · $9.99/wk` instead of `Conf.`. Add `aria-label="Unlock confidence rating — Pro $9.99/week"`. Pull the price from `PRICE_DISPLAY` in `apps/web/lib/stripe.ts` so the label can't drift from billing. (Pure presentational/navigational change — no Stripe call, no entitlement logic, no money.)

**Why:** This is the most-rendered, highest-intent, *currently-dead* conversion atom in the product. The gated-confidence tease is GSN's core conversion mechanism (§3), yet the lock has **no click target** today — a Free user who taps it gets nothing, and GSN can't even see the intent. Naming the price at the moment of desire is textbook value-quantification at the paywall (role/feature-gating ~2×'d one product's freemium conversion — [First Page Sage](https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/)). It is reversible, dependency-free, and unblocks experiment #1.

**How to verify:**
1. `npm run typecheck` and `npm run test` (existing `pick-card` rendering tests stay green; add one asserting the locked element renders an anchor to `/pricing`).
2. Manual: load `/picks` as a Free/unauthenticated user → each locked field is now a link to `/pricing` showing the weekly price; confirm a PRO/ELITE session still renders the real `ConfidenceBadge`/`EdgeScoreBadge` (gating in `api/picks/route.ts:116-130` unchanged).
3. Lint: `npm run lint`. No new env vars, no schema change, no Stripe interaction.

> Everything price/Stripe/trial/refund-related in this document is **propose-only**. The only change recommended for implementation is the safe, navigational `LockedValue` link above.
