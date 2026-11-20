# Whop Storefront (`app_PrbVglxvAeazeA` / `galaxy-sports-edge.whop.site`) Verification & Remediation Runbook

## Critical DNS Protection Rule (DO NOT POINT ROOT DOMAIN AT WHOP)
**NEVER** point `galaxysportsedge.com` or `www.galaxysportsedge.com` DNS records at Whop (`app_PrbVglxvAeazeA`).
- `galaxysportsedge.com` on Vercel serves live Neon-backed routes (`/record`, `/board`, `/clv`, `/performance`, `/proof`, `/verify`, `/auth/signin`), mobile Bearer API (`/api/mobile/v1/*`), Stripe/Whop/Telegram webhooks (`/api/webhooks/*`), OpenRouter edge proxy (`/api/openrouter/v1`), and the interactive DFS optimizer (`/fantasy/dfs`).
- Overwriting root DNS with the static/cloned Whop app would break all APIs, webhooks, authentication, and live settlement pages.
- Keep `galaxy-sports-edge.whop.site` (or an optional `whop.galaxysportsedge.com` subdomain if custom branding on Whop is desired) strictly as the storefront surface.

## Why Whop Verifier Reported `NOT VERIFIED`
1. `src/data/storefront-products.json` inside the Whop builder workspace (`~/apps/app_PrbVglxvAeazeA`) listed `0` products because `/products.json` did not exist on the origin site (`apps/web/app/products.json/route.ts` now serves all 6 Week 11 Whop Value Ladder SKUs plus Stripe fallback links).
2. `/terms` and `/privacy` routes/footer links were omitted in the Whop clone (`https://www.galaxysportsedge.com/terms` and `https://www.galaxysportsedge.com/privacy` are live on Vercel).
3. Source-only live pages (`/record`, `/board`, `/clv`, `/performance`, `/proof`, `/verify`, `/auth/signin`) and the DFS lineup checker must link back to `https://www.galaxysportsedge.com/...` instead of rendering plain-text stubs or frozen metrics.
4. Remaining 9 built routes and mobile (`390px` width) need visual re-verification after republishing `~/apps/app_PrbVglxvAeazeA`.

## Repo Assets Created Here
- Live JSON Feed: `apps/web/app/products.json/route.ts` (`GET https://www.galaxysportsedge.com/products.json`)
- Drop-in Catalog JSON: `infra/whop-storefront/storefront-products.json`
- Probe/Sync Utility: `node scripts/ops/sync-whop-storefront-catalog.mjs`

## Exact Remediation Steps Inside Whop Builder (`~/apps/app_PrbVglxvAeazeA`)
1. Copy `infra/whop-storefront/storefront-products.json` (or fetch `https://www.galaxysportsedge.com/products.json`) into `~/apps/app_PrbVglxvAeazeA/src/data/storefront-products.json`.
2. In Whop Dashboard (`biz_jzvuDvevsatKWi`), create/bind the 6 matching products and populate `WHOP_CHECKOUT_*` env vars on Vercel (`WHOP_CHECKOUT_PRIMETIME_STANDARD`, `WHOP_CHECKOUT_THANKSGIVING_STANDARD`, `WHOP_CHECKOUT_SUNDAY_STANDARD`, `WHOP_CHECKOUT_MEMBERSHIP_FOUNDING`, `WHOP_CHECKOUT_MEMBERSHIP_STANDARD`, `WHOP_CHECKOUT_MEMBERSHIP_REST_OF_SEASON`).
3. Restore `Terms` (`https://www.galaxysportsedge.com/terms`) and `Privacy` (`https://www.galaxysportsedge.com/privacy`) in the Whop app footer.
4. Route `/record`, `/board`, `/clv`, `/performance`, `/proof`, `/verify`, `/auth/signin`, and interactive DFS optimization CTAs to their canonical `https://www.galaxysportsedge.com/...` URLs.
5. Keep visible desktop (`1440px`) and mobile (`390px`) checks against `clone-checklist.json` across all 11 built routes and republish `app_PrbVglxvAeazeA`.
