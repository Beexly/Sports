# nflscrapR and nuke-dfs-hub

Fetched with `gh api` on 2026-10-22.

| repo | stars | pushed_at | GitHub licence | language | verdict |
|---|---:|---|---|---|---|
| maksimhorowitz/nflscrapR | 555 | 2020-04-03 | NONE | R | learned into the engine |
| nukesim/nuke-dfs-hub | 0 | 2026-10-22T04:53:10Z | NONE | Python | not copied |

## nflscrapR

GitHub reports no SPDX licence. The package `DESCRIPTION` file says `License: CC0`. The R sources were not pasted into this repo. The URL formula was reimplemented.

`proper_jsonurl_formatting` builds `http://www.nfl.com/liveupdate/game-center/{id}/{id}_gtd.json`. Garrett approved this scrape. A live request for game id `2016010310` on 2026-10-22 returned HTTP 301 to `https://www.nfl.com/` and an HTML homepage, not JSON. The approved play-by-play path is nflverse, which this repo already uses. The package's regular-season week contract is 1 through 17. It was last pushed in 2020, before the 18-week season. Week 18 is rejected by that contract rather than silently widened.

Engine files: `packages/prediction-engine/src/ingestion/nflscrapr-contract.ts`.

## nuke-dfs-hub

0 stars, pushed the day it was pasted, no LICENSE file. Source was not copied. QB stacks and bring-backs are already in `packages/prediction-engine/src/dfs/ip-portfolio.ts`.
