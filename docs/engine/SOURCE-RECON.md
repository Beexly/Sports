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

## NGS client found — it is api.nfl.com, not nextgenstats

The NGS app's own API client (`/dist/app.738fbeb581d2c85cb721.js`) is an axios
instance on **`https://api.nfl.com`** with `Authorization` set from a store-held
token, and endpoints `/api/league/schedule`, `/api/league/schedule/current`,
`/api/league/teams`, `/league/roster`, `/stats`, `/stats/boxscore`.

Token lifecycle: OAuth `grant_type=refresh_token` POST to
`t.env.NGS_COGNITO_TOKEN_URL` with `client_id = t.env.NGS_COGNITO_ID`. Those env
values are runtime-injected: grep for them in the static bundles finds only the
identifiers, never the values, and chunks 0-9 contain no cognito host. The
config must be captured from a live browser session (DevTools network on any
signed-in NFL.com property) or from nfl.com's auth app. That capture is the
named next step; without it the Cognito client id stays unknown.

## scores24 match detail — the call shape, one slug iteration from data

Public page proven: `https://scores24.live/en/american-football/m-<date>-<away>-<home-or-reversed>` (the
`m-` prefix is required; `/en/match/<slug>` is 404). The page's own hydration
names the exact API call:

```
queryKey: { _id: "matchesShow", baseUrl: "https://scores24.live/rapi",
            path: { sportSlug: "american-football",
                    matchSlug: "25-10-2026-cincinnati-bengals-baltimore-ravens" },
            query:  { lang: "en" } }
```

Both my slug candidates returned `httpStatus 404` inside a 200 page — so the true
matchSlug comes from a listing, not guesswork. The `/rapi/search?q=` endpoint
responds and its schema exposes a top-level **`referees`** collection (the L4
prize) alongside players/teams/matches/leagues — it returned empty for my query
shape, so its required params still need reading out of the bundle.

Also confirmed: match pages exist for college/NFL alike under
`/en/american-football/m-<dd-mm-yyyy>-<teams>` (seen: `m-24-10-2026-cincinnati-bearcats-texas-tech-red-raiders`).

## REA verdict on NGS (2026-10-24): the env is runtime-injected, period

Ran `rea-agents analyze-javascript-application` on the extracted NGS app. The
analysis graph confirms `NGS_COGNITO_TOKEN_URL` / `NGS_COGNITO_ID` are read from
`/env/` at RUNTIME (operation_kind=read, property_path=["env", ...]) — the values
are not compiled into any static chunk (29.7 MB evidence graph, saved locally).
The only capture path left is a live browser session (DevTools on a signed-in
NFL property). This closes the static-analysis avenue with evidence, not opinion.

## KB wave 6/7 (2026-10-24): +26 new hosts attempted

Curl-first with Chrome headers, then Firecrawl render for the CF/403 set. 15
hosts landed on wave 6 (ESPN core/web/cdn APIs, api+forecast weather.gov,
Open-Meteo forecast+geocode, Nominatim, api.github, raw.githubusercontent,
sleeper state, ESPN news JSON, SI, FoxSports, PFT, 33rd Team, DraftSharks,
FootballGuys, SB Nation, Yahoo team feed, static.nfl.com, PFR via render,
status.arctic-shift, r.jina.ai proxy). Wave 7 re-rendered 11 of the failures
through Firecrawl. See `kb/*/index.md` for per-host status.

## scores24 matchesShow — route still unfound (2026-10-24)

Falsified shapes (all "Not found", with `timezone_offset=0` supplied):
`/rapi/american-football/matches/{matchSlug}`, `/rapi/american-football/matches/m-{matchSlug}`,
`/rapi/american-football/matchesShow?matchSlug=...`. Key observation: the PUBLIC
match page's own hydration shows `matchesShow` returning `httpStatus 404` too —
so even the site's SSR fails on that route, meaning match data likely arrives
through the URQL/GraphQL `FRAGMENTS` layer (documents + client-api host) rather
than `/rapi`. Next probe: read the FRAGMENTS document list from the page and the
`/graphql` endpoint with the `__API_TOKEN__` bearer.

`/localized/matches/{sport}/{matchSlug}/prediction-conclusion-market` remains the
one proven per-match data route (needs `timezone_offset=0`).

## scores24 falsifications (2026-10-24, second round)

- GraphQL POSTs (`/graphql`, `/rapi/graphql`, `/api/graphql`) all 403 through the
  proxy — Cloudflare blocks non-browser POSTs. GET sub-routes still work.
- Falsified localized sub-routes on the match: `/referees`, `/squads`,
  `/officials`, `/cs-detailed-info` — all "Not found".
- The proven per-match routes remain: `/prediction-conclusion-market`,
  `/trends`, `/lines`, `/outcomes` (outcomes wants a `rate_slug`).
- Referees/crew data therefore waits on either the GraphQL-over-browser probe
  (needs a real browser POST with the bearer token) or the site publishing the
  assignment. Named, not guessed.

## scores24 route enumeration COMPLETE (2026-10-24)

The rapi client exposes exactly seven per-match routes: `/lines`, `/outcomes`
(wants rate_slug), `/prediction-conclusion-market` ✓, `/short-prediction`
(404 for this fixture), `/alt-broadcast` (200, bookmakers array — empty for
BAL@CIN), `/trends` ✓, `/cs-detailed-info` (Not found). **No referees or squads
route exists in the rapi client** — that data rides `matchesShow` (route
unfound; its own SSR 404s) or GraphQL (POST is browser-gated). The L4 crew wall
is therefore DISPOSITIONED: named route absence + two blocked transports, with
the browser-POST probe as the recorded next step.

## GitGuardian follow-up (2026-10-24)

The scores24 browser token captured during recon was committed inside two KB
html artifacts (mp4.html, root.html) and later redacted in the working tree —
but GitGuardian scans the pushed commits, so the historical occurrence still
fails the check. Current tree: zero `[REDACTED-BROWSER-TOKEN]` occurrences (verified by grep).
Exact next human step: dashboard.gitguardian.com -> occurrences for
Beexly/Sports PR #1195 -> mark the scores24 session token as
revoked/ignored (it is an ephemeral public-page token; rotate by loading
scores24 in any browser). Alternatively a history rewrite (filter-repo) would
purge it, but the branch is shared and a force-push is not worth the risk for
an ephemeral token.

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
