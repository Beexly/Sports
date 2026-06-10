# Audit — Financials / Monetization (2026-06-09)

**Grade: B−**

**Verdict.** The monetization machinery is real and unusually disciplined for a pre-launch product: Stripe checkout, customer portal, and a signature-verified, idempotent webhook are fully implemented in both clones (not stubbed), every money/affiliate lever is built INERT and founder-gated behind a registry with a test guard that fails on any live URL, and the Claude API spend governor is genuinely good (per-surface monthly budgets, 4-tier thresholds, hard-cap request-blocking, graceful fallbacks). The single biggest problem is not code quality — it is **clone divergence**: the DEPLOY target (`C:/Users/Garrett/Sports`) and the CANONICAL platform (`C:/Users/Garrett/Sports-canonical-2026-06-03`) ship **two incompatible pricing systems** — different displayed prices ($19/$49 vs Founding $14.99/$24.99), different billing intervals (monthly-only vs monthly+annual), and **mutually incompatible Stripe price-ID env-var schemas** — so whichever tree deploys determines what customers are actually charged, and they disagree. Secondary: the Claude cost-monitor hard-codes one global token price ($3/$15, the Sonnet rate) while the canonical model-router can route surfaces to Opus 4.8 ($5/$25) — a latent ~40–67% undercount on any Opus surface. Unit economics are plausible but unproven (no published win-rate, data-cost spine still The-Odds-API-dependent per the parallel data-mesh workstream). Nothing here is fraudulent or live-dangerous; the gaps are correctness and consistency, and the money-touching pieces correctly demand a founder/legal hand on the switch.

Everything below is grounded in files I read. Clone is labeled on every finding. Forward slashes throughout.

---

## How the money model actually works (grounded)

**Tiers (identical in both clones).** `FREE | PRO | ELITE`, defined in `packages/types/src/index.ts:7` and `:88` (`getEntitlements`). The entitlement shape is the same byte-for-byte across clones:
- `canSeePremiumPicks / canSeeConfidence / canSeeLineMovement / canSeeFactorBreakdown` → PRO+ (`isPro = tier === "PRO" || "ELITE"`).
- `canSeeEdgeScore` → always `true` (public Edge Index — deliberate trust hook).
- `canGetAlerts` → ELITE only.
- `dailyPickLimit` → `1` for FREE, `null` (unlimited) for paid.

**Entitlement resolution.** `apps/web/lib/entitlements.ts:24` (`getUserEntitlements`) reads the active `Subscription` row (`status IN (ACTIVE, TRIALING)`) and maps tier → flags; defaults to FREE on any miss or DB error (`.catch(() => null)`, line 37). A `DEV_FAKE_ADMIN` shortcut returns ELITE but is hard-gated to non-production (`entitlements.ts:18–22`). This is correct, server-side, fail-closed-to-FREE. Identical in both clones.

**Stripe is REAL, gated only by env-var presence — not stubbed.** Both clones instantiate the live SDK with a non-null-asserted secret (`lib/stripe.ts:3` DEPLOY, `:6` CANONICAL) and implement:
- Checkout session creation — `app/api/subscriptions/checkout/route.ts`
- Customer portal — `app/api/subscriptions/portal/route.ts`
- Webhook with signature verification + idempotency (`WebhookEvent` table dedupe) + tier sync on `checkout.session.completed / customer.subscription.* / invoice.payment_*` — `app/api/webhooks/stripe/route.ts`
- `getOrCreateStripeCustomer` upserts a FREE subscription row so the customer ID exists before checkout.

So "live vs gated": **the billing code is production-grade and will run the moment Stripe env vars are set.** There is no test/mock seam — missing keys throw at request time (see P1 below). Enabling real billing is a founder action (set keys + create Stripe prices), consistent with `lib/cockpit/monetization-levers.ts:124` (`ladderPro.trigger = "Founder enables paid billing (Stripe) and sets pricing"`).

**Revenue streams modeled.** `apps/web/lib/cockpit/monetization-levers.ts` enumerates eight levers, all built inert and (except FREE) `founderTriggerRequired: true`: FREE tier, PRO sub, ELITE sub, annual/team plans, sportsbook affiliate, sponsorship, enterprise reports, live forward-projections/graded-pool. `findNonInertLevers()` (`:296`) is a runtime+test guard that flags any lever carrying a live `https?://` URL — a real "stay inert" assertion. CANONICAL only; DEPLOY has no cockpit.

**Affiliate / sportsbook posture (CANONICAL only).** `app/promotions/page.tsx` + `lib/promotions/guards.ts` implement a fail-closed compliance gate: no public render without disclosure text, responsible-gaming text, terms URL, explicit `eligibleStates`, `complianceStatus === APPROVED`, a banned-hype-language scan, and an APPROVED_PARTNER operator-registry check. `lib/cockpit/operator-registry.ts` defaults `APPROVED_PARTNER: 0` (`summarizeRegistry()` → `publishablePartners: 0`), so the promotions surface renders **empty by default** and links carry `rel="nofollow sponsored"` (`promotions/page.tsx:194`). This is a strong, founder/legal-gated posture. DEPLOY does not ship promotions at all.

**Cost structure (data + AI).**
- **Crons** (`vercel.json`, identical in both clones): 7 `refresh-odds` runs/day (one per sport, staggered 05:00–11:00) + `settle-picks` + `jarvis-snapshot` = 9 daily cron invocations. The Odds API is the launch-critical paid spine the data-mesh workstream is making fail-closed (referenced, not re-audited here).
- **Claude API budget governor** (`lib/claude-api/cost-monitor.ts`): per-surface monthly USD budgets (BLOG $50, STUDIO $500, MODEL_COURT $2000, PICK_EXPLANATION $200, others $50–$100, PRE_MORTEM $0), 4-tier thresholds (yellow .5 / orange .8 / red 1.0 / hard_cap 1.5), `requestAllowed=false` at red/hard_cap, and per-surface graceful fallback copy. `budget-store.ts` + `usage-store.ts` persist spend. This is a real spend governor, present in both clones.

---

## Findings by severity

### P0 — launch-blocking / correctness

**F1 — Two clones ship two different, incompatible pricing + Stripe-wiring systems. (clone: both)**
The deploy target and the canonical platform disagree on what a customer pays AND on the Stripe env-var contract:

| | DEPLOY `C:/Users/Garrett/Sports` | CANONICAL `Sports-canonical-2026-06-03` |
|---|---|---|
| PRO price shown | **$19/mo**, no annual (`app/pricing/page.tsx:54`) | **$14.99/mo, $99/yr** (Founding phase, `lib/pricing/pricing-phases.ts:76`) |
| ELITE price shown | **$49/mo**, no annual (`app/pricing/page.tsx:75`) | **$24.99/mo, $179/yr** (`pricing-phases.ts:77`) |
| Billing intervals | monthly only | monthly + annual toggle (`components/pricing/pricing-plans.tsx`) |
| Stripe price env vars | `STRIPE_PRO_PRICE_ID`, `STRIPE_ELITE_PRICE_ID` (`lib/stripe.ts:9–10`; `.env.example:36–37`) | `STRIPE_PRO_MONTHLY/ANNUAL_PRICE_ID`, `STRIPE_ELITE_MONTHLY/ANNUAL_PRICE_ID` (`lib/stripe.ts:17–23`; `.env.example:56–59`) + `PRICING_PHASE` |
| Checkout body | `{ tier }` (`checkout/route.ts:10`) | `{ tier, interval }` (`checkout/route.ts:10–13`) |
| Missing-price behavior | non-null assert `STRIPE_PRICE_IDS[tier]` → can pass `undefined` to Stripe | returns `503 "Pricing … not configured yet"` (`checkout/route.ts:29–34`) — graceful |

**Why P0:** the displayed prices differ by ~21–49% AND the env schemas don't overlap, so wiring Stripe for one tree mis-wires the other. If the DEPLOY tree is the launch target (per memory: "deploy target is C:/Users/Garrett/Sports"), customers see **$19/$49 monthly-only** and the founding-member/grandfather/annual story (built, tested, on-brand in CANONICAL) **does not ship**. Conversely the canonical `pricing-phases.ts` + grandfather guarantee is the more defensible model and is the one referenced in marketing docs.
**Recommendation (FOUNDER, money):** Decide the single source of truth for price before any Stripe keys go live. Reconcile to one schema — almost certainly port CANONICAL's `pricing-phases.ts` + 4-env-var (monthly/annual × PRO/ELITE) wiring + `PRICING_PHASE=FOUNDING` into the DEPLOY tree, so display price and the Stripe price object can't drift. Do NOT create Stripe price objects until this is reconciled; a price-ID created against the wrong amount is a refund/chargeback liability.

---

### P1 — important (money, trust, correctness)

**F2 — Claude cost-monitor hard-codes one global token price ($3/$15 = Sonnet); model-router can route to Opus 4.8 ($5/$25). (clone: both; router is CANONICAL-only)**
`cost-monitor.ts:140` `DEFAULT_CLAUDE_TOKEN_PRICING = { input: 3, output: 15 }` is a single global constant consumed by `estimateClaudeCostUsd` (`:148`). Verified against current pricing: $3/$15 is the **Sonnet 4.6** rate; **Opus 4.8 is $5/$25**, Haiku 4.5 is $1/$5. CANONICAL `lib/claude-api/model-router.ts:19–21` defines `opus: "claude-opus-4-8"` and routes per surface; `model-court` is commented "recommended: opus" (`:43`) though currently set to `sonnet`. Today most surfaces route to Sonnet so the estimate is roughly right — but the moment any surface flips to Opus (model-court adversarial reasoning is the obvious one), spend is **undercounted ~40% on input and ~67% on output**, silently weakening the very budget guardrail that is supposed to block runaway spend. DEPLOY hard-codes `claude-sonnet-4-6` (`messages.ts:48`) so its $3/$15 is currently accurate, but the constant is still a latent trap.
**Recommendation:** Make token pricing per-model (a `Record<modelId, ClaudeTokenPricing>`) and have `estimateClaudeCostUsd` take the resolved model id from `model-router`/`messages`, not a global default. Add a vitest asserting the Opus row = $5/$25 so a future price change can't silently drift the budget math. Pure refactor, no live switch.

**F3 — Stripe clients use non-null assertions on env vars → hard crash, not graceful degradation, when keys are absent. (clone: both)**
`lib/stripe.ts:3` (DEPLOY) / `:6` (CANONICAL): `new Stripe(process.env["STRIPE_SECRET_KEY"]!, …)` executes at module load. `STRIPE_PRICE_IDS[tier]` (DEPLOY `checkout/route.ts:27`) is also non-null-asserted, so a misconfigured deploy passes `priceId: undefined` to `stripe.checkout.sessions.create`, surfacing as a generic 500 ("Checkout failed") rather than a clear config error. CANONICAL's `checkout/route.ts:29–34` already does this correctly with a 503; DEPLOY does not.
**Recommendation:** In the DEPLOY tree, mirror CANONICAL: replace the price-ID non-null assert with an explicit "pricing not configured" 503, and guard the `Stripe` constructor so an unconfigured environment fails loudly at boot/health-check rather than mid-checkout. Low effort, prevents a silent broken-checkout launch.

**F4 — `getEntitlements` has no `INCOMPLETE`/`PAUSED`/`PAST_DUE` grace handling; entitlement query only honors `ACTIVE`/`TRIALING`. (clone: both)**
`entitlements.ts:33` filters `status IN (ACTIVE, TRIALING)`. The webhook maps Stripe `past_due` → `PAST_DUE` and `unpaid` → `PAST_DUE` (`webhooks/stripe/route.ts:198,207`), and on `invoice.payment_failed` sets `PAST_DUE` immediately (`:105–113`). Net effect: a single failed invoice instantly drops a paying customer to FREE entitlements with no dunning grace window. That's a defensible-but-aggressive revenue/UX choice (most SaaS gives 3–14 days of grace during Stripe's retry cycle).
**Recommendation (FOUNDER, money/UX):** Decide the dunning policy. If you want grace, either keep `PAST_DUE` entitled for a window or let Stripe Smart Retries run before flipping tier. Founder call — flag, don't auto-change.

**F5 — Unit economics are plausible but unproven; pricing escalation is gated on proof that doesn't exist yet. (clone: CANONICAL)**
`pricing-phases.ts` is genuinely well-designed: a named FOUNDING→PROVEN→ESTABLISHED→AUTHORITY ladder with structured `triggerMetrics` (e.g. PROVEN needs ≥100 settled picks + published calibration; ESTABLISHED needs ≥500 + CLV beat ≥52.4%), a grandfather guarantee, and operator-advanced phases (`PRICING_PHASE`, defaults FOUNDING). But every higher phase's revenue assumption is contingent on a public track record the product, by its own honesty posture, does not yet have (the Performance/Calibration page is intentionally gated — `pricing/page.tsx:129` FAQ). So current realistic ARPU is FOUNDING-only: PRO $14.99 / ELITE $24.99, with data+AI COGS (Odds API + Claude budgets up to a few $K/mo if all surfaces maxed) needing to be covered by a subscriber base that doesn't exist yet.
**Recommendation:** Keep `PRICING_PHASE=FOUNDING` until the named proof milestones are actually met (the code already enforces human-gated advance — good). Treat the higher-phase prices as roadmap, not plan. No code change; this is a planning-truth note.

---

### P2 — worth doing

**F6 — Webhook `invoice.payment_failed` path can't resolve userId and relies on `updateMany` by subscription id; a legacy/edge row logs a warning and silently no-ops. (clone: both)**
`webhooks/stripe/route.ts:172–181`: when `metadata.userId` is absent, `syncSubscription` falls back to `updateMany` by `stripeCustomerId` and, on `count===0`, only `console.warn`s. A subscription that was created outside the normal `getOrCreateStripeCustomer` path would silently fail to sync tier. Idempotency + the metadata-on-checkout path make this rare, but it's a silent revenue-correctness gap.
**Recommendation:** Emit a structured alert (not just `console.warn`) on `count===0` so an unsynced paid subscription is visible. Consider a reconciliation cron that diffs Stripe active subs vs local `Subscription` rows.

**F7 — Nested duplicate source tree inside the DEPLOY clone (`C:/Users/Garrett/Sports/Sports/…`) contains a second copy of pricing/checkout/stripe files. (clone: DEPLOY)**
Glob returned both `C:/Users/Garrett/Sports/apps/web/...` and `C:/Users/Garrett/Sports/Sports/apps/web/...` for `pricing/page.tsx`, `checkout/route.ts`, `portal/route.ts`, `webhooks/stripe/route.ts`, and `lib/stripe.ts`. A stale nested copy of money-handling code is a real footgun (wrong file edited, ambiguous deploy root).
**Recommendation:** Confirm which tree the Vercel project builds from (`vercel.json` is at `C:/Users/Garrett/Sports/`), then delete or quarantine `C:/Users/Garrett/Sports/Sports/` so there is exactly one checkout/webhook implementation. Founder/ops housekeeping — verify before deleting.

**F8 — `monetization-levers` and `pricing-phases` are CANONICAL-only; DEPLOY has no monetization cockpit or inert-lever guard. (clone: DEPLOY)**
The strongest financial-governance assets — the inert-lever registry with `findNonInertLevers()` guard, the operator registry, the pricing-phase ladder — live only in CANONICAL. If DEPLOY is the launch tree, it ships without those guardrails.
**Recommendation:** When reconciling F1, port `pricing-phases.ts`, `monetization-levers.ts`, `operator-registry.ts`, and `promotions/guards.ts` (+ their tests) into the deploy tree so the launch target carries the same financial guardrails the canonical tree was audited against.

---

### P3 — minor / polish

**F9 — Annual savings math is presentational only and consistent (no correctness bug). (clone: CANONICAL)** `annualSavingsPct` / `annualMonthlyEquivalent` (`pricing-phases.ts:157–166`) compute display values from the same `TierPrice` source of truth the checkout uses; the "Save up to 45% annually" copy (`pricing-plans.tsx:58`) is a static claim — verify it matches the deepest phase (AUTHORITY ELITE: $499 vs $839.88 ≈ 41%). Minor copy/claim-accuracy check.

**F10 — `PRE_MORTEM_SUMMARY` budget is $0, which means `ratio = +Infinity` and `requestAllowed=false` always. (clone: both)** `cost-monitor.ts:86` sets `monthlyBudgetUsd: 0`; `evaluateClaudeBudgetUsage` (`:151`) yields `ratio = POSITIVE_INFINITY` → status `hard_cap` → blocked. This is presumably intentional (surface is inert/disabled), but a $0 budget is an implicit kill-switch that reads like a config mistake. Add a comment, or model "disabled" explicitly.

---

## Strengths (real, grounded)

- **Stripe integration is production-grade, not a stub.** Signature-verified webhook with `WebhookEvent` idempotency dedupe (`webhooks/stripe/route.ts:32–37`), full lifecycle sync (checkout/created/updated/deleted/invoice), period + trial tracking, and a customer portal. This is the hardest part of subscription billing and it is done properly in both clones.
- **Money/affiliate levers are inert-by-construction with a test guard.** `monetization-levers.ts:296` `findNonInertLevers()` actively fails if any lever ever carries a live URL; affiliate is triple-gated (operator whitelist + geo + 21+) and `OPERATOR_REGISTRY` ships with `APPROVED_PARTNER: 0`. The default state is "nothing live," which is exactly right for a regulated, pre-launch product.
- **Promotions compliance gate is fail-closed and thorough.** `lib/promotions/guards.ts` blocks public render on missing disclosure / RG text / terms / eligible-states / approved-compliance / banned-hype, and links carry `rel="nofollow sponsored"`. This respects the sportsbook/responsible-gaming posture without hand-waving.
- **Claude spend governor is genuinely good.** Per-surface budgets, 4-tier thresholds, hard request-blocking at red/hard_cap, and on-brand graceful fallback copy per surface (`CLAUDE_BUDGET_FALLBACKS`). Most teams don't build a cost circuit-breaker until after a bill scares them.
- **Pricing-phase ladder ties price increases to honesty milestones.** `pricing-phases.ts` makes "we only raise price when proof justifies it" a code-enforced, human-gated invariant with a grandfather guarantee — directly on-brand and a real differentiator vs tout services.
- **Entitlements are server-side, fail-closed to FREE, and prod-safe.** `DEV_FAKE_ADMIN` ELITE shortcut is hard-blocked outside non-production.

---

## What would move this from B− to A

1. **Resolve F1 (P0): one pricing source of truth across both clones.** Pick CANONICAL's `pricing-phases.ts` + 4-price-ID schema, port it into the DEPLOY/launch tree, and delete the divergent static $19/$49 page. Display price and Stripe price object must derive from one module so they cannot drift. (Founder decides the actual numbers.)
2. **Fix F2 (P1): per-model token pricing.** Replace the single $3/$15 global with a per-model table keyed off the resolved model id, plus a unit test pinning Opus 4.8 = $5/$25, so the budget governor stays honest when surfaces route to Opus.
3. **Fix F3 (P1): fail loud on missing Stripe config in DEPLOY.** Mirror CANONICAL's 503 + a boot/health-check guard so an unconfigured environment can't ship a silently-broken checkout.
4. **Decide F4 (P1) dunning policy and F8/F7 (P2) clone hygiene.** Choose a `PAST_DUE` grace window; port the monetization-levers/operator-registry/promotions guards into the launch tree; eliminate the nested duplicate `Sports/Sports/` source tree.
5. **Add reconciliation + alerting (F6).** A Stripe-vs-DB subscription reconciliation cron and a real alert (not `console.warn`) on unsynced paid subs closes the last silent revenue-correctness gap.
6. **Hold the line on proof-gated pricing (F5).** Keep `PRICING_PHASE=FOUNDING` and the affiliate registry empty until the named milestones are actually met — the code already enforces this; the discipline is to not flip it early.

None of 1–6 requires flipping a live switch; each is reconciliation, refactor, or a founder decision. The live switches (Stripe keys, `PRICING_PHASE` advance, APPROVED_PARTNER rows, real affiliate URLs) remain correctly founder/legal-gated and should stay that way.
