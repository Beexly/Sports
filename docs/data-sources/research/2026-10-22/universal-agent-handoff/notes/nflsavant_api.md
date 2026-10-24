# nflsavant.com — full analytic query API (biggest find so far)

Rebuilt as a React SPA; the API is unauthenticated and its query DSL is a base64url-encoded JSON
object. This is effectively "nflfastR in a URL": metrics computed server-side over play data.

## Getting in
- `/api/explore/featured` (200, 12 KB) publishes 14 ready-made query objects with `metrics`,
  `filters`, `having`, `sort` — the DSL is documented by example, no guessing.
- `/api/explore?q=<enc>` where `enc` = `base64url(JSON.stringify(q))` **with `+`->`-`, `/`->`_` and
  padding stripped**, then URL-encoded. Padding left on -> `{"error":"invalid query encoding"}`;
  correct encoding but empty body -> `{"error":"Required"}`.
- `/api/slate` (200) gives current week and gameIds; `/api/ticker`, `/api/route-spotlight`,
  `/api/featured-stat`, `/api/featured-stat/candidates`, `/api/coaches`, `/api/combine`,
  `/api/fantasy/player/{id}`, `/api/explore/csv` also present in the bundle.

## Query shape (verbatim from featured)
    {"groupBy":"passer","metrics":["plays","pass_yds","tds","epa_play","cpoe"],
     "filters":[{"id":1,"field":"qb_dropback","op":"is","value":true},
                {"id":2,"field":"season","op":"=","value":2026}],
     "having":{"metric":"plays","op":">=","value":100},
     "sort":{"id":"epa_play","dir":"desc"}}

## All 14 featured queries executed, all 200 with rows
top_qbs 33 rows (Lamar Jackson 0.365 EPA/DB, CPOE 8.09 over 101 dropbacks) · deep_passers 46 ·
yac_monsters 43 · explosive_recv 100 · workhorse 100 · pass_rush 32 · def_epa 32 · third_down 32 ·
rz_td_rate 32 · play_action_kings 29 · league_trend 14 · qb_seasons 100 · wr_seasons 100.
Rows key on GSIS ids, so they join the crosswalk directly.

## Why this is the biggest one
The metrics are the proprietary-shaped ones — CPOE, YOE, EPA per dropback, YAC over expectation,
red-zone TD rate, FTN play-action splits — computed by someone else, queryable with arbitrary
group-by/filter/having/sort, no key, no quota.
