# Money path — live state (2026-08-06)

## Webhook audit (2026-08-07 autonomous)

- **Enabled GSE:** `https://www.galaxysportsedge.com/api/webhooks/stripe` (`we_1TcXVf…`) — correct events for checkout/subscription/invoice
- **Foreign medusa:** `lumeralabel.medusajs.app` — **disabled** already; safe to delete in Dashboard anytime (not blocking)
- Ops surface now probes hosts live (`stripeWebhookHosts`) and **suppresses** founder Dashboard audit when GSE healthy

## Product health (autonomous verified)

- `/api/health` → **ok:true / healthy**
- deploy: post-#345+#346 (`0df36c63` web + External Cron free-spine)
- ingestion SUCCESS fresh via free-spine + settle
- source:nflverse **healthy** (probe, season **2025** REG floor)
- settlement **HEALTHY** (0 overdue / 1478 commenced)
- **No LIVE_BOARD / PUBLIC_PICKS flip** — integrity held

## Billing stack (Stripe live)

| Item | State |
|------|--------|
| Account | Galaxy Sports Network (`acct_1TPE9kQ2wPZMxx60`) |
| GSE webhook | **enabled** → `https://www.galaxysportsedge.com/api/webhooks/stripe` |
| Foreign medusa webhook | **disabled** (labeled non-GSE; delete anytime in Dashboard) |
| Products | Pro · Elite · Fantasy — **default_price set** (2026-08-06) |
| Fantasy price lookup keys | `gse-fantasy-monthly` · `gse-fantasy-annual` (added 2026-08-06) |
| Active paid subs | **0** (founder canceled / incomplete only — funnel works, no paying customers yet) |

### Founding prices (live)

| Tier | Monthly | Annual | Price IDs |
|------|---------|--------|-----------|
| Fantasy | $4.99 | $49 | `price_1TrOEIQ2wPZMxx60sgo6r9K5` / `price_1TrOESQ2wPZMxx603FyIWvOe` |
| Pro | $14.99 | $99 | `price_1TdsqBQ2wPZMxx6094V2T9cY` / `price_1TdsqCQ2wPZMxx60z4GWzgu9` |
| Elite | $24.99 | $179 | `price_1TdsqLQ2wPZMxx60eKtNl1cZ` / `price_1TdsqLQ2wPZMxx60XVzOFPxd` |

### Required Vercel Production env (must match live price ids)

```text
STRIPE_PRO_MONTHLY_PRICE_ID=price_1TdsqBQ2wPZMxx6094V2T9cY
STRIPE_PRO_ANNUAL_PRICE_ID=price_1TdsqCQ2wPZMxx60z4GWzgu9
STRIPE_ELITE_MONTHLY_PRICE_ID=price_1TdsqLQ2wPZMxx60eKtNl1cZ
STRIPE_ELITE_ANNUAL_PRICE_ID=price_1TdsqLQ2wPZMxx60XVzOFPxd
STRIPE_FANTASY_MONTHLY_PRICE_ID=price_1TrOEIQ2wPZMxx60sgo6r9K5
STRIPE_FANTASY_ANNUAL_PRICE_ID=price_1TrOESQ2wPZMxx603FyIWvOe
```

Checkout path: **Sign in → /pricing → Subscribe** → Stripe Checkout (auth required for entitlement binding).  
Webhook stamps entitlements on `checkout.session.completed` / subscription events.

## Conversion funnel (current)

| Step | State |
|------|--------|
| Homepage → See plans | Live |
| /pricing Subscribe Pro/Elite/Fantasy | Live CTAs |
| /auth/signin | Live |
| Checkout session create | Proven (live sessions exist) |
| Paid → dashboard | Proven once (founder paid then canceled) |
| /waitlist page | **Basic Auth locked** (`GSE_WAITLIST_GATE_ENABLED=true`) — blocks public lead capture |
| `/api/waitlist` POST | Works (422 validation) — not blocked by page gate |

## Revenue ladder honesty

- Step: **FOUNDING**
- Next PROVEN blocked: **Calibration not published**
- Do **not** enable PERFORMANCE_STATS / LIVE_BOARD until calibration + proof bar
- Contests public free paper skill is OK (already on)

## Highest-leverage money moves (ordered)

### A. You can sell today (no gate flip)

1. Confirm all six `STRIPE_*_PRICE_ID` env vars above are set in Vercel Production (Fantasy especially — 503 if missing).
2. **Open waitlist for leads:** set `GSE_WAITLIST_GATE_ENABLED=false` (or remove) in Vercel Production — public email capture.
3. **Close one paid seat yourself** end-to-end (Pro or Fantasy) and leave it active — proves entitlement path + social proof later.
4. Traffic → `/pricing` (X, newsletter archive, Galaxy Sports Edge brand). Board/fantasy stay free-tease with plan CTA.

### B. Margin (not product gates)

5. `CONTENT_FREE_LANE_ENABLED=true` + Cerebras key — free content without Anthropic cash.
6. `CLAUDE_PROVIDER=auto` + cloud maps — credits not cash.
7. Optional Sentry DSN pair — catch checkout 500s.

### C. Do not flip without YES

- LIVE_BOARD / PUBLIC_PICKS / STATS_PUBLIC
- Rights fork A/B/C for Game spine
- #258 brand rename
- Claim public ROI / locks / guaranteed edge

## Autonomous work already landed (2026-08-06)

- #344 season/GSIS floor · #345 free SUCCESS multi-writer + nflverse probe · #346 External Cron free-spine
- Health green; free-spine scheduled every 2h
- Stripe default prices + Fantasy lookup keys
- Medusa webhook labeled disabled non-GSE

## One-command recovery (health)

```bash
gh workflow run external-cron.yml -f target=free-spine-health
curl -sS https://www.galaxysportsedge.com/api/health | jq '{ok,ingestion:.checks.ingestion}'
```
