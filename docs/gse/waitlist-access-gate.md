# GSE Waitlist Access Gate

## Why app-level Basic Auth?

The custom domain `galaxysportsedge.com` bypasses Vercel Deployment Protection
(which only applies to `.vercel.app` preview aliases). Enabling Vercel Deployment
Protection on a custom domain requires the **Vercel Pro plan** — a paid add-on.

This gate implements the same hard-stop at zero cost using Next.js middleware
and Basic Auth, enforced entirely server-side before the page renders.

## Cost

**$0** — no Vercel add-ons, no third-party services, no subscriptions.

## How it works

1. Next.js middleware (`apps/web/middleware.ts`) intercepts every request to
   `/waitlist` and `/waitlist/*` before any page code runs.
2. It calls `checkWaitlistGate()` from `apps/web/lib/waitlist/access-gate.ts`.
3. If `GSE_WAITLIST_GATE_ENABLED !== "true"`, the request passes through
   unchanged (current production behavior is preserved).
4. If enabled, the middleware checks the `Authorization: Basic <base64>` header.
5. Credentials are compared against `GSE_WAITLIST_BASIC_USER` and
   `GSE_WAITLIST_BASIC_PASSWORD` (server-side env vars only).
6. Denied requests receive **HTTP 401** with:
   - `WWW-Authenticate: Basic realm="GSE Waitlist", charset="UTF-8"`
   - `Cache-Control: no-store`
7. Browsers pop a native login dialog; bots get a 401 and stop.

### What is NOT protected

- All other routes (`/`, `/faq`, `/pricing`, `/picks`, etc.) are unaffected.
- The API route `/api/waitlist` is not behind this gate (middleware matcher
  excludes `/api/`). If you need API-level protection, add it separately.

## Environment variables required

Set these in **Vercel Project Settings → Environment Variables**. Do NOT commit
values. Do NOT use `NEXT_PUBLIC_` prefixes (that would expose them client-side).

| Variable | Required | Description |
|---|---|---|
| `GSE_WAITLIST_GATE_ENABLED` | Yes (to activate) | Set to `"true"` to enable the gate. Any other value (or absent) disables it. |
| `GSE_WAITLIST_BASIC_USER` | Yes (when enabled) | Username for Basic Auth. Choose a non-obvious value. |
| `GSE_WAITLIST_BASIC_PASSWORD` | Yes (when enabled) | Password for Basic Auth. Use a strong random secret. |

### How to set them in Vercel

1. Go to **Vercel Dashboard → sports-web → Settings → Environment Variables**.
2. Add each variable with **Environment: Production** (and Preview if desired).
3. Redeploy the production deployment after setting the vars.

## How to test locally

```bash
# In apps/web/.env.local (never commit this file):
GSE_WAITLIST_GATE_ENABLED=true
GSE_WAITLIST_BASIC_USER=localuser
GSE_WAITLIST_BASIC_PASSWORD=localpass

npm run dev
```

Then visit `http://localhost:3000/waitlist` — the browser should prompt for
credentials.

Or with curl:

```bash
# Should return 401:
curl -I http://localhost:3000/waitlist

# Should return 200:
curl -I -u localuser:localpass http://localhost:3000/waitlist
```

## Rollback plan

**Option A — Disable gate without code change** (instant, no redeploy logic):
1. In Vercel Environment Variables, set `GSE_WAITLIST_GATE_ENABLED=false` (or delete it).
2. Trigger a redeployment (or the next deploy will pick it up).

**Option B — Revert the code commit**:
```bash
git revert <commit-sha>
git push
```

Both options restore the previous open behavior. No database changes, no
schema migrations, no side effects.

## Gates preserved by this change

- `BACKTEST_TRUTH.beatsNaive === false` — untouched
- `robots: { index: false, follow: false }` in waitlist page — untouched
- No Stripe / pricing / checkout activated
- No schema migration
- No database write
- No performance claims added
- No `NEXT_PUBLIC_` secret names
- No paid Vercel features

## Files changed

| File | Change |
|---|---|
| `apps/web/lib/waitlist/access-gate.ts` | New — Basic Auth helper, fully testable |
| `apps/web/middleware.ts` | Updated — imports helper, adds waitlist gate block |
| `apps/web/__tests__/waitlist-access-gate.test.ts` | New — 15 tests covering gate, no-claim, credential isolation |
| `docs/gse/waitlist-access-gate.md` | This file |
