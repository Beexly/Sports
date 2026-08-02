# GSE unlock actions (founder-only)

Repo `Beexly/Sports` is private → no agent write access.

## 1. Router clearance (#279 ground truth)
- Open the open PR/issue for router clearance.
- Confirm free-path gate still matches law: free only when `THE_ODDS_API_KEY` is **absent**; blocked (401→402) when present + DEACTIVATED.
- Merge only after review; do not invent new locking.

## 2. Stripe Dashboard (one-click)
Stripe → Developers → Webhooks → [endpoint] →  
**Add event:** `checkout.session.expired`  
(Existing: retries + idempotency already solid. Do not re-implement.)

## 3. Founder gates still off (do not flip)
- LIVE_BOARD = off  
- PUBLISH_LEDGER = off  
- #226 HEOS still needs explicit YES  

## 4. B2B ship order (from existing spec)
`docs/product/b2b-widgets-and-api-spec.md` already defines:
1. **Ship free first:** `/embed/edge-index/[gameId]` (SEO + distribution, no auth)
2. Then paid: `/embed/market-pulse/[gameId]`

No new product design required — implement the free embed.
