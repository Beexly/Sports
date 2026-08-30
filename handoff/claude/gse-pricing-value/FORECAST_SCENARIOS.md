# Forecast Scenarios — Pricing & Revenue (ASSUMPTIONS, not guarantees)

All numbers below are **illustrative planning assumptions**, not predictions or
promises. They exist to pressure-test the model and size risk. Founding prices:
Pro $14.99/mo · $99/yr, Elite $24.99/mo · $179/yr (source: `pricing-phases.ts`).

## Assumptions (edit these — they drive everything)
- Free→paid conversion: 2% (base), 1% (low), 4% (high).
- Of payers: 70% Pro / 30% Elite (base).
- Annual mix: 35% choose annual.
- Monthly churn: 8% (base), 12% (decline), 5% (best).
- Blended ARPU ≈ Pro/Elite mix at founding monthly ≈ **~$18/mo** (mix-weighted).

## Scenarios (monthly, illustrative)

| Scenario | Free users | Conv % | Payers | ~MRR | Notes |
|---|---|---|---|---|---|
| Worst | 1,000 | 1% | 10 | ~$180 | weak top-funnel, high churn |
| Base | 5,000 | 2% | 100 | ~$1,800 | steady founding ramp |
| Best | 20,000 | 4% | 800 | ~$14,400 | viral + strong retention |
| Decline | 5,000 | 2% → churn 12% | shrinking | erodes | retention problem dominates |
| Seasonal spike (NFL/CFB) | 30,000 | 3% | 900 | ~$16,200 | spike fades without retention |
| Churn-risk | 5,000 | 2% | 100→ | ~$1,800 falling | base acq, retention failing |
| Promo-overuse | 5,000 | 3% (promo-pumped) | 150 | margin-thin | discount-dependent, low LTV |
| Data-cost-overrun | — | — | — | margin hit | Odds/Anthropic spend > plan |
| Support-burden | — | — | — | margin hit | support time per member too high |

## What to track (instrument via `lib/analytics/events.ts` once a provider is wired)
Free users · Pro/Elite conversion · annual adoption · churn · ARPU · MRR ·
refund rate · support load · data/tooling cost · seasonality · promo dependency ·
feature-readiness risk.

## Read of the model
- The lever that matters most is **retention**, not acquisition — at 8%→5% churn
  the same funnel roughly doubles steady-state payers.
- **Annual mix** is the second lever (cash up front + lower churn). The founding
  annual discount (~37–45% vs 12× monthly) is intentionally generous to pull this.
- **Promo dependency** is the main trap: heavy discounting inflates conversion but
  craters LTV. Every promo code has a `killSwitchMetric` for exactly this.
- **Operator** should stay a waitlist until infra is real — selling it early is a
  refund/trust risk with no offsetting margin.

## Honesty note
These are assumptions for planning. Do not present any of these as expected
results, to customers or anywhere public. The public surfaces stay proof-gated.
