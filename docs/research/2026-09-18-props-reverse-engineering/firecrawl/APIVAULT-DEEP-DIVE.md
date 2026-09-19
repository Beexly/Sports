# APIvault (apivault.uk) — Deep Dive

Research date: 2026-09-18. All page fetches performed 2026-09-18 ~16:10 CDT (21:10 UTC).
Task boundary: public material only. No logins, no paywall bypass, no credential use.

## Bottom line

**CONFIRMED: apivault.uk is NOT a sports-data or odds-data API provider.**
It is a generic "one key for every API" proxy-aggregation service: you sign up once,
get one vault key, and call third-party APIs through `/{service}` proxy routes with
an `x-vault-key` header. Its published catalogue covers weather, news, AI models,
crypto, forex, geocoding, jokes, and similar consumer APIs. **No sports, odds, or
NFL statistics APIs appear anywhere in its public catalogue.** Garrett's belief
that it has "free tiers of API data statistics" relevant to sports is not supported
by any public evidence. Garrett has an account (baxley.garrett@gmail.com, password
manager entry modified Jun 26, 2026, per his screenshot), so login is possible only
via his own approved flow — not attempted here.

## 1. What the site actually offers

### Business model — CONFIRMED
Source: https://apivault.uk/ (fetched 2026-09-18 ~21:10 UTC)
- "One key for every API." Sign up once, get a vault key, access every API in the vault.
- Routing pattern: `GET /proxy/exchangerates` with `x-vault-key: ****` header (homepage example shows live-ish results: "1 KES = $0.00772 USD").
- Free APIs "work immediately · No credit card needed." Paid APIs "from $1" / "from $0.001 per call".
- Top-up via M-Pesa, Visa, or bank transfer. "Credits never expire."
- "Built for African developers" — M-Pesa, Africa's Talking, local payment APIs listed as "soon".
- No SDK required; works with any HTTP client. Real-time dashboard of calls, cost, status.

### Published catalogue — CONFIRMED (verbatim from homepage, fetched 2026-09-18 ~21:10 UTC)
Homepage says **"17 APIs ready now"** (title tag claims "49 APIs" — discrepancy documented below).
Ready now: Exchange Rates (FREE), REST Countries (FREE), IP Geolocation (FREE), Open
Meteo (FREE), NewsAPI, OpenWeather, GitHub API (FREE), JokeAPI (FREE), Chuck Norris
(FREE), PokeAPI (FREE), SpaceX Data (FREE), Cat Facts (FREE), Advice Slip (FREE),
CoinGecko (FREE), Frankfurter Forex (FREE), Open FDA (FREE), Claude (Anthropic).
"Soon": GPT-4o, Gemini Flash, HeyGen Video, Africa's Talking, Twilio SMS, M-Pesa, Flutterwave.
**No sports, odds, betting, NFL, or statistics APIs in the catalogue.**

### API count discrepancy — CONFIRMED
The `<title>`/hero says "49 APIs · One key · No setup" while the catalogue section
says "17 APIs ready now" (16 marked FREE + NewsAPI/OpenWeather/Claude). 17 ready +
8 "soon" = 25, not 49. INFERRED: the "49" figure is marketing inflation or counts
upstream endpoint groups. Do not cite "49" as a real API count.

## 2. Public API surface (documented, no auth attempted)

### Proxy pattern — CONFIRMED
From https://apivault.uk/: requests are made to `/proxy/{service-slug}/*` with the
`x-vault-key` request header carrying the user's vault key. Example given on the
homepage: `/proxy/exchangerates`, `/proxy/jokeapi`, `/proxy/restcountries`.

### Full endpoint inventory — INFERRED from public open-source codebase
The GitHub repo `jemeralds/apivault` (https://github.com/jemeralds/apivault,
updated ~62 days before 2026-09-18) documents the identical product and the identical
`x-vault-key` + `/proxy/:service/*` contract as apivault.uk. Strongest public evidence
this repo is the apivault.uk codebase (or a sibling build of it):

User routes (require `x-vault-key` header):
- `GET /user/me` — profile + balance
- `GET /user/apis` — APIs visible to this user's plan
- `GET /user/usage` — last 50 calls
- `GET /user/key` — masked vault key
- `POST /user/key/reveal` — full vault key (logged)

Proxy route (requires `x-vault-key` header):
- `ANY /proxy/:service/*` — forwards to the upstream API. Examples in README:
  `POST /proxy/grok-image`, `POST /proxy/gpt4o/chat/completions`.

Admin routes (require admin vault key — NOT in scope to touch):
- `GET|POST|PATCH /admin/apis`, `POST /admin/apis/:slug/rotate-key`,
  `GET|PATCH /admin/users`, pool top-ups, alerts, logs, billing.

### Rate limits — CONFIRMED (from public repo README)
`middleware/rateLimit.js`: per-user throttle **60 requests/min**, **daily cap 1000**.
This is INFERRED to apply to apivault.uk only if it runs this codebase — the linkage
is strong but not officially confirmed by the site.

### Billing mechanics — CONFIRMED (from public repo README)
- Users are prepaid; an atomic Postgres `deduct_credits` function debits on each call.
- Upstream 5xx → automatic refund + log; timeout → refund + 504; success → log + debit pool.
- Each upstream API has a pool with a dynamic solvency floor (7-day rolling daily
  average × 3 days); hourly cron tops up; empty pool → circuit breaker → HTTP 503
  with `retry_after`.
- Request bodies capped at 32 KB.

### Architecture — CONFIRMED (public repo, same caveat)
- Frontend: React + Vite + Tailwind (`client/`), pages: Login (vault-key entry),
  Dashboard (user view: APIs, usage, credits), AdminDashboard.
- Backend: Node.js + Express (`server/`); routes `proxy.js`, `user.js`, `admin.js`,
  `webhook.js` (Stripe); services `billing.js`, `pools.js`, `registry.js`;
  middleware `auth.js` (vault key + admin guard), `rateLimit.js`.
- Database: Supabase (Postgres). Billing: Stripe webhooks (idempotent, signature-verified).
- Master upstream keys stored in Supabase Vault, not DB plaintext. Vault keys are UUIDs.

### Adding a new API — CONFIRMED (public repo)
Via admin dashboard (APIs → Add API → slug, upstream URL, master key, cost, markup)
or `POST /admin/apis` with `{slug, name, upstreamUrl, masterKey, costPerCall, markup}`.
The registry auto-categorizes by slug; unknown slugs go to `pending` and raise an
admin alert. Relevance: this is the mechanism by which a sports API *could* be added
("Request any API and we'll add it" per the homepage) — but none is public today.

## 3. GitHub / code provenance

| Repo | Relationship to apivault.uk | Status |
|---|---|---|
| https://github.com/jemeralds/apivault | Near-certain codebase match: identical product concept, identical `x-vault-key` header, identical `/proxy/:service/*` contract, M-Pesa/Stripe billing, Supabase backend. | Public, updated ~62 days ago |
| https://github.com/flitnetics/apivault | UNRELATED. Go-based API gateway auth for microservices (JWT, OTP protect mode). Different product. | Do not conflate |
| https://github.com/tobi-maru/apivault | UNRELATED. Personal API-key manager with Clerk auth. | Do not conflate |
| https://github.com/sulavtimsina/apivault | UNRELATED. Proxyman traffic-capture documentation tool. | Do not conflate |
| https://github.com/apivault-labs/* (skip-trace, tiktok scrapers, facebook scrapers) | UNRELATED. Apify actor clients for social scraping; name collision only. | Do not conflate |
| https://github.com/apivault-directory/api-vault | Possibly related-ish (free-tier API directory with trust scores) but a different product (directory, not proxy). No confirmed link to apivault.uk. | UNVERIFIED |

No archived/leaked apivault.uk datasets, dumps, or historical data were found in any
public source searched. Web-archive lookup was attempted and failed (service error);
not retried.

## 4. Sports/odds relevance for the GSE Sports repo

- **CONFIRMED: zero sports or odds endpoints in the public catalogue.** APIvault cannot
  serve as an NFL odds, line-movement, or statistics source today.
- INFERRED: because it is a generic proxy, a sports API (e.g. API-Football, Odds API)
  could theoretically be requested and added by the operator ("Request any API and
  we'll add it"), at which point Sports would just be paying a markup over the
  upstream provider's price — strictly worse economics than integrating the upstream
  API directly (repo documents a `markup` field on every API).
- The repo's own README examples (`/proxy/grok-image`, `/proxy/gpt4o/chat/completions`)
  confirm the service skews toward AI-model APIs, not sports data.
- Verdict for Sports/GSE: **no engineering value as a data source.** Do not build an
  APIvault adapter. If Garrett wants a sports API routed through it later, the correct
  move is to integrate the upstream provider directly (The Odds API key already exists;
  see MEMORY.md).

## 5. Findings requiring Garrett action (not done here)

1. Garrett has an APIvault account (his password-manager screenshot, modified Jun 26,
   2026). If he wants the live per-plan API list (`GET /user/apis` would show exactly
   which APIs his plan can see), he must log in himself — out of scope for agents.
2. No credential was used, requested, or stored in this research.

## Sources (verbatim, accessed 2026-09-18 ~21:10 UTC)
- https://apivault.uk/
- https://apivault.uk/sitemap.xml (serves the homepage content; no XML sitemap exposed)
- https://github.com/jemeralds/apivault
- Search: "APIvault apivault.uk API free tier endpoints documentation"
- Search: "apivault.uk" (exact)
- Search: "apivault.uk proxy sports odds football API marketplace"
- Search: "apivault.uk github apivault proxy documentation x-vault-key"

Labels: CONFIRMED = seen on a fetched page or verbatim search result. INFERRED =
reasonable deduction stated as such. UNVERIFIED = claimed but not publicly checkable.
No endpoints, schemas, or URLs were fabricated.
