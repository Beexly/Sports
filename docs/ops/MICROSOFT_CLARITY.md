# Microsoft Clarity

## Status

- **Loader:** official npm package `@microsoft/clarity` via `apps/web/components/analytics/MicrosoftClarity.tsx`
- **Gate (OP-004):** `NEXT_PUBLIC_ANALYTICS_ENABLED=true` **and** non-empty `NEXT_PUBLIC_CLARITY_PROJECT_ID`
- **Funnel bridge:** `track()` in `apps/web/lib/analytics/events.ts` → `clarity("event")` + `clarity("set")` tags; checkout events also `upgrade`
- **Not wired:** `identify()` with user email/name (forbidden — PII). `consentV2` auto-grant (forbidden until cookie banner policy)

## Founder enable (prod)

1. Create project at [clarity.microsoft.com](https://clarity.microsoft.com)
2. Settings → Overview → Project ID (~10 chars)
3. Vercel Production env:
   - `NEXT_PUBLIC_ANALYTICS_ENABLED=true`
   - `NEXT_PUBLIC_CLARITY_PROJECT_ID=<id>`
4. Redeploy. Confirm Network tab loads `https://www.clarity.ms/tag/<id>` and no `/tag/undefined`.

## Privacy posture

Clarity may use first-party cookies depending on project config. Cloudflare Web Analytics (sibling provider) is cookieless. If the Clarity project requires cookie consent, call `Clarity.consentV2({ ad_Storage, analytics_Storage })` from the consent banner — do **not** default-grant in layout.

Session replay can capture DOM: never put secrets, raw API keys, or full card data in client-rendered markup.

## Sibling provider

Cloudflare Web Analytics remains the independent beacon (`NEXT_PUBLIC_CF_BEACON_TOKEN`). Missing Clarity id must never break Cloudflare (OP-004).
