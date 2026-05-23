# Vault Pricing Evolution — Framework

**Audience:** Garrett. Internal.
**Purpose:** Vault launches at $200/year. The price will be re-examined at multiple Year-1 + Year-2 gates. The framework below specifies when re-examination triggers + how the decision gets made.

**Default:** $200/year holds through Year-1. Changes happen only against the criteria below.

---

## Why $200/year was the launch price

Per `02-active-tracks.md`, `05-cashflow-capital.md`, and Vault interview validation:

- Bottom-up TAM math at $200 reaches breakeven on conservative subscriber assumptions.
- Comparable benchmark: Outlier.bet $50/month ($600/year tier-equivalent); PFF $30/month ($360/year tier-equivalent); independent sports newsletters $100-300/year.
- $200 is below the "premium price-anchored" threshold most members associate with luxury subscriptions, so doesn't trigger the same scrutiny.
- $200 is above the impulse-buy threshold ($50-100), which filters for members serious about the product.
- $200 is a price the founding-50 cohort confirmed in customer dev as "fair, not cheap, not luxury."

The $200 number is therefore a calibrated bet, not arbitrary. Changes should respect that.

---

## When pricing gets re-examined

### Gate 1: Month-3 KPI ritual

Per `copy/vault-month-3-kpi-decision-memo-template.md`, the Month-3 review examines:

- Membership count vs target (target: 200+ at Month 3 per Plan A; 100+ per Plan B).
- Renewal-intent signals (per Day-30 + Day-60 retention check-ins).
- Cancel-reasons trending toward "value at this price isn't there."

**Pricing change criteria at Month 3:**

- If membership is significantly below target AND cancel-reasons cluster around "price too high" with consistent signal → potential price reduction discussion.
- If membership is significantly above target AND no price-pushback in feedback → potential price increase discussion (for new sign-ups only; existing members grandfathered).
- Otherwise: $200 holds.

**Default action at Month 3:** Hold. Pricing decisions are conservative.

### Gate 2: Month-6 KPI ritual

Per `copy/vault-month-6-kpi-decision-memo-template.md`, the Month-6 review is the deepest pre-renewal audit.

**Pricing change criteria at Month 6:**

- 6-month cancellation rate >20% AND price-related cancellations >40% of those → price reduction or value bundle consideration.
- 6-month cancellation rate <8% AND feedback signals "Galaxy is undercharging" from 5+ members → modest price increase consideration for new signups.
- Founding-50 cohort retention <90% → re-examination beyond just price.

**Default action at Month 6:** Hold unless one of the above triggers fires.

### Gate 3: Month-12 renewal decision

Per `copy/vault-month-12-renewal-decision-memo-template.md`, the Month-12 renewal is the binary go/no-go.

**Pricing change criteria at Month 12:**

- Renewal rate ≥70% → V2 cap-lift triggers; price examination is part of V2 planning.
- Renewal rate 50-70% → conditional continuation; price adjustment may be part of the recovery plan.
- Renewal rate <50% → Scenario C sunset; price is moot.

**Default action at Month 12 (if continuing):** Maintain $200 for the founding cohort; potentially adjust for Year-2 new signups based on findings.

### Gate 4: Year-2 strategic question framework

Per `galaxy-year2-strategic-question-framework.md` Question 1, Year-2 Vault trajectory decision includes pricing.

**Possible Year-2 pricing structures:**

- **Status quo:** $200/year for everyone. Founding cohort + all new joiners pay the same.
- **Founding-grandfathered increase:** $200/year locked in for founding-50 + Year-1 cohort; $250 for new Year-2 joiners.
- **Tier introduction:** $200/year base Vault + premium $500/year tier with additional access (rarely the right move; brand-position constraint).
- **Founding-discount continuation:** Founding-1000 stays at $200, broader cohort moves to $250.

---

## How price changes get decided

### Step 1: Quantitative analysis (1-2 hours)

Run the numbers across both scenarios:

- Current member retention rate at $200.
- Hypothetical member retention rate at new price (modeled from similar premium subscription cohorts).
- Net revenue change.
- Brand-position cost (what happens to "we don't gouge our members" positioning).

**Output:** Decision-log entry candidate showing the trade-off.

### Step 2: Brand-position check (30 minutes)

Ask the test questions:

- Does the new price preserve the "fair, not exploitative" positioning?
- Will members read the change as "Galaxy is following their value compounding" or "Galaxy is gouging"?
- Does the founding cohort feel honored by the change (grandfathered) or exploited (treated like any other cohort)?

### Step 3: Member feedback signal check (1 hour)

Pull from `templates/vault-feedback-themes.csv`:

- Have members signaled they'd pay more?
- Have members signaled the price feels right?
- Have members signaled it feels expensive?

### Step 4: Founding-50 advisory check (if active)

If `#founding-50-advisory` channel is active per `copy/vault-advisory-channel-spec.md`, run a brand-position-check question:

```
Question for the founding-50: I'm considering a Vault price adjustment for Year-2. Your honest read on whether this preserves or compromises the brand position you signed up for.

The proposal: [specific change].

Brief reasoning: [why considering].

Reply with your honest reaction.
```

### Step 5: Decision-log entry

DEC-NEXT-VAULT-PRICE-NNN entry per `galaxy-decision-rights-matrix.md`. The entry includes:

- The new price (if changing).
- Effective date (typically Year-2 anniversary).
- Cohort scoping (who pays what).
- Brand-position rationale.
- Sunset / re-examination trigger.

### Step 6: Member communication (if changing)

The communication template depends on the change:

- **No change:** No communication needed.
- **Increase for new joiners only (founding grandfathered):** Communication to all members noting the grandfathering.
- **Tier introduction:** Communication explaining the structure + why.
- **Founding-discount continuation:** Communication thanking founding members + explaining the new pricing structure.

Sample communication (founding grandfathered, new joiners +$50):

```
Subject: Pricing for Year 2 — and your founding-status

Hey [first name],

Quick note about Vault pricing.

Starting [date], Vault pricing for new members moves from $200 to $250 per year. This reflects the methodology evolution, the operational maturity, and the genuine value Vault has delivered in Year-1.

Your founding status preserves your $200/year price permanently. As long as you renew, your annual subscription stays at $200. This isn't a "discount" — it's recognition that you joined when there was no track record. The founding-50 + Year-1 cohort are locked in.

If you have questions, reply directly + I'll address them.

— Garrett
```

---

## When NOT to change pricing

Resist price changes when:

1. **Renewal rates are within Plan A range (≥70%) and the brand position is healthy.** Don't engineer for hypothetical revenue when actual revenue is meeting plan.

2. **Feedback hasn't surfaced consistent price-related signal across 5+ members.** Single-member feedback isn't pattern.

3. **The brand-position cost outweighs the revenue gain.** Galaxy's restraint-as-product positioning compounds; price changes that compromise it cost more than they earn.

4. **Garrett's emotional state suggests reactive thinking.** Per `founder-resilience-playbook.md`, decisions made under stress get the 24-hour buffer.

5. **Member-facing reasoning would feel like "we're charging more because we can."** That framing damages the trust dynamic.

---

## Pricing structures Galaxy will NOT do

1. **Dynamic pricing.** Different members pay different prices based on perceived willingness-to-pay. Brand-position violation.

2. **Geographic pricing.** Vault is one price globally. Different prices by country compromise the equality positioning.

3. **Promotional pricing / discount codes.** No "30% off for the next 48 hours." Brand-position violation; trains members to wait for discounts.

4. **Referral discounts.** Per `copy/vault-referral-program.md`, the referral structure is something other than price reduction.

5. **Bundle discounts with the Almanac or Live.** Galaxy may sell Almanac + Vault separately, but doesn't bundle-discount them. Each product stands on its own pricing.

6. **Lifetime memberships.** No "$2000 lifetime" option. Member relationship is annual + renewable; permanence isn't on the table because Galaxy's continuity is conditional.

7. **"Founder's lifetime grandfather" pricing for new joiners after the founding cohort.** The founding-50 status is the founding cohort only. Subsequent cohorts pay current-cohort price.

---

## Almanac + Live pricing references

The pricing framework above applies to Vault. Almanac + Live pricing is separately documented:

- Almanac: $99 hardcover and $39 digital, per `copy/almanac-production-pack.md`. Re-examined Q4 annually.
- Live: Founding-partner agreement structure per `copy/live-founding-partner-agreement-template.md`. Commercial terms, not subscription.

---

## What pricing signals tell Galaxy

Beyond direct price discussions, watch for indirect signals:

- **Member offers to pay more:** Sign that price is too low. Pattern-check over time.
- **Members ask if there's a "premium tier":** Sign of either underpricing OR demand for additional access. Carefully distinguish.
- **Renewal procrastination:** Sign that price feels marginal. Member needs more conviction.
- **Cancellation reasons clustering on "value":** Sign of either real value gap OR price perception issue.
- **Outside coverage (press, podcasts) framing Vault as "underpriced" or "overpriced":** External pricing signal. Note but don't react.

---

## Cross-references

- Vault checkout copy (current pricing display): `copy/vault-checkout-copy.md`
- Vault Month-3 KPI decision memo: `copy/vault-month-3-kpi-decision-memo-template.md`
- Vault Month-6 KPI decision memo: `copy/vault-month-6-kpi-decision-memo-template.md`
- Vault Month-12 renewal decision memo: `copy/vault-month-12-renewal-decision-memo-template.md`
- Year-2 strategic question framework: `galaxy-year2-strategic-question-framework.md`
- Vault advisory channel spec: `copy/vault-advisory-channel-spec.md`
- Vault feedback synthesis protocol: `copy/vault-feedback-synthesis-protocol.md`
- Galaxy decision rights matrix: `galaxy-decision-rights-matrix.md`
- Active-track economics: `02-active-tracks.md`
- Cash flow and capital model: `05-cashflow-capital.md`

---

*Pricing is the single highest-leverage member-experience lever. The framework above keeps Galaxy from reacting to short-term signal + ensures any change is brand-position-aligned. Default to hold. Change only on documented criteria.*
