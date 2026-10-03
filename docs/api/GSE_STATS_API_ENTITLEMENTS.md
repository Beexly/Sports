# GSE Stats API × Stripe entitlements

Live Stripe products (Galaxy Sports Network `acct_1TPE9kQ2wPZMxx60`):

| Tier | Stripe product | Stats API surfaces |
|------|----------------|--------------------|
| FREE | (none) | `public_api` |
| FANTASY | `prod_Ur6RIZ0AzmKKiT` | `public_api` only |
| PRO | `prod_Ud95br56Qtsfiq` | `public_api` + `pro_api` |
| ELITE | `prod_Ud980MnXT07nOv` | `public_api` + `pro_api` + `elite_api` |

Dark / blocked metrics: **403 for all tiers**.

Query param `tier=` on `/metrics` and `/metrics/:id` (until session-auth wires real entitlements).

Production path: resolve tier from subscription via `tierForPriceId` → pass into handlers.

No price/product creation here — only the entitlement **law** between existing products and API surfaces.
