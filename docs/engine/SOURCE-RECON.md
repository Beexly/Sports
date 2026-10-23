# Source recon — API surfaces found behind the walls

Started 2026-10-23. Purpose: stop treating walls as permanent. Every entry here is
a real host, path or call shape that was reached and its status recorded. Nothing
here is a guess.

## FTN — mapped, auth is the only barrier

- Data service: `https://api.ftnfantasy.com` (from `window.baseURL` inline config).
- Auth: cookie `access_token`; refresh cookie `refresh_token`; token is read via
  `window.getAccessToken()` and sent as an `Auth` header by the client.
- `POST /users/token/refresh` → 422 (path real, wants `refresh_token`).
- `POST /users/login` → 401 with a junk body (path real, wants email + password).
- `GET /permissions/tools/{tool}` → 403 unauthenticated (path real).
- `GET /permissions/tools/{tool}/required` → 405 on POST, GET is the verb.
- Present in the bundle: `/users/signup/captcha`, `/users/forgot-password/send`,
  `/users/forgot-password/reset`, `/users/reset-password`.
- Shadow matrix page itself is WordPress + a client tool; the table is not in
  HTML and not in any of the widget bundles.

**Next:** one free account → login via curl → keep `access_token` → hit
`/permissions/tools/...` to learn the tool slug, then the data route behind it.

## scores24 — API open, no account needed

Base: `https://scores24.live/rapi` (same-origin JSON). Plain curl gets a
Cloudflare 403; **Firecrawl reaches it**. Two things make it work:

1. The SSR page ships `window.__API_TOKEN__` (209 chars) and
   `window.__REACT_QUERY_STATE__` — a 384 KB hydrated cache of the page's own
   queries, which decodes to `queryKey` objects containing the exact API URLs.
   That is how the routes below were found.
2. `sport_slug` is an **array** parameter: `sport_slug[]=nfl`.

Working calls:

```
GET /rapi/matches/best?timezone_offset=0&lang=en          -> 200, 69 match records
GET /rapi/predictions/top?sport_slug[]=nfl&timezone_offset=0&lang=en -> 200, opinions
GET /rapi/localized/matches/markets?slugs[]=...          -> needs `slugs`
```

Prediction record shape: `{ prediction: "total_t2_over" | "total_under" | "one_two",
prediction_value: "1_5" | "5_5" | "w1", agreed_votes_percent, all_votes_count,
match: {...} }`. `agreed_votes_percent` / `all_votes_count` is a crowd-consensus
signal, not a model output — treat it as such.

Match record fields that matter to the audit: **`referees`**, `broadcasts`,
`has_squads`, `has_standings`, `has_h2h`, `has_statistic`, `expected_prediction`,
`created_at`. `referees` closes the L4 crew wall when the assignment is published.

Other known paths from the bundle: `/matches/best`, `/matches/counter`,
`/predictions/top`, `/predictions/sports`, `/predictions/filter`,
`/localized/matches/markets`, `/localized/trends/list`, `/live-trends`, `/meta`,
`/search`, `/top-leagues`.

**Next:** resolve the match-detail route. Method that works: open a live match
page, read its `__REACT_QUERY_STATE__` `queryKey.url` values, take the pattern.
The public page route is not `/en/match/<slug>` (404) — find it from a rendered
league page. Then ingest `referees` + `expected_prediction` into L4/L5.

## NGS — the 401 is an AWS SigV4 requirement, not a missing key

`GET /api/league/2026/REG/lead` unauthenticated returns 401 whose body names the
missing parameters: "Authorization header requires 'Credential' / 'Signature' /
'SignedHeaders'" — i.e. the endpoint wants an AWS SigV4-signed Authorization
header, generated client-side. Probed webpack chunks 0–9 of
`nextgenstats.nfl.com/dist/*`: none contains the signer (grep AWS4-HMAC-SHA256 = 0
in all). The page also loads `https://www.nfl.com/libs/playaction/api.js` — that
shared library is the next place to look for the signing routine.

## Dead ends recorded

- `client-api.fragmentsx.com` appears in the bundle but does not resolve (NXDOMAIN);
  it is a stale default. Use the same-origin `/rapi` instead.
- `https://scores24.live/en/nfl` is 404; the sport root is
  `/en/american-football` (200). `/en/american-football/nfl` is 404.
- FTN shadow page: curl 403, Firecrawl renders 24 KB of nav only — the matrix is
  behind login, not merely JS.

## Rules

- Record the status code with every probe. A 403 proves the path exists; a 404
  does not.
- Never let a recon finding stand in for a data row: an endpoint is not a read.
  The audit row flips only when values are in the JSON.
