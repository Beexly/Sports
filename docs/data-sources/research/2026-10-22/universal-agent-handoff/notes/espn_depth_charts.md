# ESPN depth charts — 2,290 rows across all 32 teams

`https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{id}/depthcharts` returns 200 with
~240 KB per team, unauthenticated. Structure: `depthchart[]` (named charts like "Base 3-4 D") ->
`positions{pos: {athletes: [...] }}` -> ordered athletes.

Captured **32/32 teams, 2,290 rows** with team, chart name, position, depth rank and `espn_id`:
`extracted_data/espn_depth_charts.csv`.

This is the depth data theScore's roster endpoint lacked (it returned nulls for
`depth_chart_position`). It gives per-position ordering *per scheme*, which is what
replacement-level and snap-share models need, and `espn_id` joins the universal crosswalk straight
into `nfl_id`/`gsis_id`.

Also confirmed working but not mined: `teams/{id}?enable=roster` (291 KB, full athlete objects).

# Team sites, for the record
Six official club sites (chiefs, patriots, cowboys, packers, 49ers, ravens) all render 460–820 KB of
HTML with **no** `/api` paths and no `__NEXT_DATA__`/`window.__` embeds — React SPAs building their
API hosts in JS. Content-rich, data-poor; a browser capture would be needed and they add little over
ESPN, so parked.
