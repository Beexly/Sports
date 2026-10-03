# GSN — Competitive Pricing, Value & Packaging Decision

**Question:** What do competitors charge, for what, how does our value compare, what
are we missing — and what should our pricing & packages be?
**Method:** Live web research (June 2026) + read of GSN's real pricing code.
**Decision status:** Pricing **set** in code (monthly + annual; clear of live-Stripe
hard stop — price IDs are env-driven and operator-wired).
**Labels:** `verified-ext` · `verified-code` · `recommended` · `decision`.

---

## 1. Competitor pricing landscape (`verified-ext`, June 2026)

GSN's category is **data-driven picks/predictions** (not sharp tools, not books).

| Service | Price | What you get | Track record |
|---|---|---|---|
| **Pickswise** | Free | Picks + parlays, ad/affiliate funded | public |
| **Dimers Pro** | **$24.99/mo** (~$8.33/mo annual ≈ $99.99/yr) | All sports, unlimited best bets, **Dimebot AI chat**, Parlay Picker, Discord | years, public |
| **BettingPros** | **$29.99/mo** ($119.98/yr ≈ $9.99/mo) | Expert consensus, props, tools | public |
| **Rithmm** | ~$29.99/mo, 7-day trial | AI picks + model builder | public-ish |
| **ParlaySavant** | ~$19/mo | Conversational AI + custom models | public-ish |
| **BetQL** | ~$30/mo / ~$200/yr | Model picks, line tracking | public |
| Sharp tools (different category) | | | |
| **OddsJam** | **$199.99/mo** Gold (40+ books), $399.99 Global; ~20% annual; 7-day trial | Line shopping + +EV across 100+ books | n/a (tool) |
| **Unabated** | **$49–$199/mo** (Essentials→Premium) | Sharp lines, calculators | n/a (tool) |

**Category takeaways:** picks cluster at **$20–30/mo**, **annual ≈ $8–12/mo** (steep
annual discounts are the norm), **free tiers + 7-day trials are table stakes**, and AI
chat / parlay tools / Discord communities are common.

## 2. The problem with GSN's current pricing (`verified-code`)

`lib/stripe.ts` + `app/pricing/page.tsx`: **Pro $9.99/week, Elite $13.99/week**, billed
weekly, **no monthly, no annual, no trial.**

- **$9.99/wk ≈ $43/mo; $13.99/wk ≈ $60/mo** — GSN is priced *above every proven
  incumbent* in its category (Dimers $25, BettingPros $30) while still in **bootstrap
  with no public track record**. That is backwards.
- **Weekly billing is the worst possible cadence** for a variance product: ~52
  renewal/dunning/reconsideration events per year (loss aversion fires every week),
  vs. 1 for annual. Annual churns ~3× less.
- **No annual** = the single biggest LTV/retention lever is unused.
- **Weekly framing hides the true monthly cost** — honest brands don't obscure price.
- Pro→Elite differ **only by email/push alerts** — Elite has no substance for a 40% step.

## 3. Value comparison — ours vs. theirs

**Where GSN has MORE value (`verified-code`, the moat):**
- **Published calibration + Brier + discrimination** — nobody else grades themselves honestly.
- **Tamper-evident track record, loss autopsies, model journal** — radical transparency.
- **Full factor trail / "why"** on every pick — explainability competitors don't match.
- **Venue-agnostic fair value** — usable by prediction-market traders, not just bettors.

**Where competitors have MORE value (what we're missing — `recommended` to add):**
- **A proven public record.** Dimers/Action have years; GSN has none yet → pricing must
  reflect *unproven* status now, and rise as the record proves out.
- **AI chat assistant** (Dimers' Dimebot) — GSN has Claude but no consumer "ask the model" surface.
- **Parlay/DFS tools**, **mobile app**, **community (Discord)**, **free trial** — all absent.
- **Line shopping / +EV across books** (OddsJam/Unabated value) — out of scope, but bettors want it.

## 4. Decision — the named, proof-gated price ladder (`decision`, set in code)

Principle: **price earns its increases through proof.** We are pre-record, so the live
phase is **FOUNDING** — the lowest price GSE will ever offer, locked for life for early
members. Every rung is named ahead of time and unlocks only when its proof milestone is met
AND its added value has shipped. Data backs this: documented transition policies cut
pricing-change escalations ~25%; value-paired increases lift retention ~26%; grandfathering
removes the 10–15% increase-churn spike (ProfitWell). Single source of truth:
`apps/web/lib/pricing/pricing-phases.ts`.

| Phase | Trigger (named, proof-gated) | Pro mo · yr | Elite mo · yr | Added value (must ship first) |
|---|---|---|---|---|
| **FOUNDING** (live) | Bootstrap — no public record yet | **$14.99 · $99** | **$24.99 · $179** | Founding rate, locked for life |
| **PROVEN** | ≥100 canonical settled picks + published calibration | $19.99 · $149 | $29.99 · $229 | Verified record & calibration curve go public |
| **ESTABLISHED** | ≥500 settled + verified CLV beat-close ≥52.4% (break-even) | $29.99 · $219 | $49.99 · $349 | Verified market-beating edge; Elite analytics, early access, ask-the-model chat |
| **AUTHORITY** | Multi-season verified ROI + category authority | $39.99 · $299 | $69.99 · $499 | A multi-season record competitors can't match |

Why these numbers:
- **FOUNDING undercuts every proven incumbent** (Dimers $24.99/mo, BettingPros $29.99/mo) —
  correct for an unproven brand acquiring its first cohort — with a **~40–45% annual
  discount** (the LTV/retention lever; annual churns ~3× less than monthly).
- **Monthly + annual replaces weekly** — weekly fired loss-aversion ~52×/yr and hid the true
  monthly cost; both are gone.
- **Elite stays honest:** today it is Pro + real-time alerts. It is NOT priced at the old $49
  until ESTABLISHED, when its named added value actually ships — the "no fabricated value"
  rule applied to price.

### Sales psychology codified (`verified-ext` + `decision`)
- **Founding-member scarcity + grandfather guarantee** → reciprocity ("back us early"),
  loss-aversion ("the price only rises for those who wait"), and loyalty (no forced migration).
- **Anchoring:** publishing the whole ladder makes today's price visibly the floor — every
  future rung re-anchors the founding rate as the deal it is.
- **Value-justified increases** pair each rise with shipped value + proof — the pattern that
  lifts retention ~26% and avoids the churn spike.
- **Annual-first framing** with a steep discount converts the high-LTV, low-churn cohort and
  locks revenue ahead of the next price step.

**Advancing a phase is a deliberate human action** (set `PRICING_PHASE` env) taken only when
the milestone is met and the value has shipped — never automatic, mirroring the readiness gates.

## 5. What changed in code (`verified-code`)

- `lib/stripe.ts`: `PRICE_DISPLAY` → monthly+annual amounts; `STRIPE_PRICE_IDS` → 4 env-driven
  IDs (Pro/Elite × month/year) + `getPriceId(tier, interval)` helper + `BillingInterval`.
- `app/api/subscriptions/checkout/route.ts`: accepts `interval` ("month"|"year"), selects price.
- `components/pricing/pricing-plans.tsx` (new client component): monthly/annual toggle.
- `app/pricing/page.tsx`, `app/faq/page.tsx`, `app/picks/page.tsx`: new prices + copy.
- `__tests__/pricing-honesty.test.ts`: re-pinned to the new prices (display↔Stripe consistency).
- `.env.example`: the 4 new Stripe price-ID vars. **CLAUDE.md** tier table reconciled.

**Operator action required (`recommended`):** create the 4 **test-mode** Stripe prices and set
`STRIPE_{PRO,ELITE}_{MONTHLY,ANNUAL}_PRICE_ID`. No live Stripe / real charges were touched.

## 6. Sources
[Dimers subscription](https://www.dimers.com/subscription), [Dimers Pro vs Action PRO](https://www.dimers.com/subscription/dimers-pro-vs-action-pro), [BettingPros](https://sportshandle.com/betting-guides/best-sports-betting-picks-apps/), [OddsJam subscribe](https://oddsjam.com/subscribe), [Unabated pricing](https://unabated.com/pricing), [Pickswise](https://www.pickswise.com/), [RotoGrinders best picks apps](https://rotogrinders.com/sports-betting/guides/best-picks-apps).
