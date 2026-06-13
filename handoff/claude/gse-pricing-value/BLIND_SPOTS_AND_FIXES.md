# Blind Spots & Fixes — Pricing / Value / Trust

Risk register. Each: level · why it matters · user-facing symptom · business
impact · fix · owner decision (if any). Status reflects the shipped value layer.

| # | Risk | Lvl | User symptom | Business impact | Fix | Owner? |
|---|---|---|---|---|---|---|
| 1 | Free gives away too much | High | No reason to upgrade | Low conversion | Free is preview-only; test "Free must not leak the paid product" enforces it. **Mitigated.** | Confirm free signal count |
| 2 | Tiers feel the same | High | "Why pay more?" | Low Pro→Elite | "Why each step up" ladder + whyNextTier on /pricing. **Mitigated.** | — |
| 3 | Elite too shallow for price | Med | Churn after upgrade | Refunds | Elite = market layer (Twin, CLV, calibration). Keep CLV honest (preview where unsupported). | CLV live/demo/preview? |
| 4 | Operator launched too early | High | Pay for vapor | Refunds, trust | Operator is **waitlist only**, not billable. **Mitigated.** | Public waitlist vs hidden |
| 5 | Promo addiction | High | Discount-trained buyers | Low LTV | All promos inactive by default + `killSwitchMetric`. **Mitigated.** | Approve/activate any? |
| 6 | "Galaxy guarantees wins" misread | High | False expectations | Legal/trust | Banned-hype test + Trust Gate CI; confidence explainer = "estimate, never a promise." **Mitigated.** | — |
| 7 | Confidence misunderstood | Med | Over-trust | Churn/complaints | "How confidence works" section live on /pricing. **Mitigated.** | — |
| 8 | Fake-live perception | High | Distrust | Reputational | No fake data; demo/fixture labels; picks gated. **Held.** | — |
| 9 | Stale odds / source gaps | Med | Wrong reads | Trust | Freshness shown; No-Bet on staleness. | Set Odds API key |
| 10 | Compliance exposure (betting copy) | High | — | Legal | Banned-phrase scans + responsible-gaming copy on conversion surfaces. **Held.** | Legal review pre-scale |
| 11 | Checkout doesn't work | **Critical** | Can't pay | **No revenue** | **Set Stripe secrets in Vercel + flip gates** (GO_LIVE_RUNBOOK). | **YES — blocker** |
| 12 | Refund/cancellation unclear | Med | Frustration | Chargebacks | 7-day refund stated on /pricing + FAQ. | Confirm policy |
| 13 | Mobile pricing friction | Med | Drop-off | Lost conv | /pricing is responsive; verify on device. | — |
| 14 | Weak onboarding/activation | Med | "Now what?" | Early churn | Post-checkout first-run not built yet. | Next increment |
| 15 | Unclear vs competitors | Med | "Just another picks site" | Low conv | Positioning = intelligence OS; No-Bet/proof differentiate. Competitor audit doc pending. | — |
| 16 | Pricing model not finalized | High | Inconsistent story | Confusion | One source of truth needed (see OWNER_DECISIONS_NEEDED #1). | **YES** |

## Top 3 to act on
1. **#11 — set Stripe secrets** → enables revenue (the only thing blocking "working for finances").
2. **#16 — confirm the pricing model** → unblocks any further pricing UI changes.
3. **#14 — onboarding/activation** → protects the conversions you do get (next build increment).
