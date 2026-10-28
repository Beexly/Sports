# Gap break — hosts that yielded nothing on the client surface

Built 2026-10-28. Two strategies in order: server-rendered table extraction, then a rendered
browser that captures every JSON response the page itself requests.

**35 of 47 broken. 501 JSON responses captured. 12 remain gaps.**

## Why the browser is the answer

The gaps are JS-rendered SPAs. The HTML carries no tables and the API paths are not guessable
from a static fetch. Rendering the page and recording its own network calls is the only thing
that works — the site hands over exactly what it uses to build itself.

## Still a gap (12)

`betmgm.com`, `betrivers.com`, `dynastyprocess.com`, `footballoutsiders.com`, `mojo.com`, `myfantasyleague.com`, `mysportsfeeds.com`, `rotoviz.com`, `spankodds.com`, `sportsdataio.com`, `sumersports.com`, `tipico.com`

These need a credentialed session. Nothing public is reachable.

## Broken (35)

| Host | JSON responses | Rendered tables | Record |
|---|---|---|---|
| `bettingnews.com` | 47 | 0 | [record](gapbreak/bettingnews.com.md) |
| `nfl.com` | 46 | 0 | [record](gapbreak/nfl.com.md) |
| `profootballnetwork.com` | 40 | 1 | [record](gapbreak/profootballnetwork.com.md) |
| `kalshi.com` | 32 | 0 | [record](gapbreak/kalshi.com.md) |
| `scoresandodds.com` | 31 | 5 | [record](gapbreak/scoresandodds.com.md) |
| `actionnetwork.com` | 31 | 0 | [record](gapbreak/actionnetwork.com.md) |
| `vegasinsider.com` | 29 | 6 | [record](gapbreak/vegasinsider.com.md) |
| `pinnacle.com` | 27 | 0 | [record](gapbreak/pinnacle.com.md) |
| `polymarket.com` | 26 | 1 | [record](gapbreak/polymarket.com.md) |
| `fantasy.nfl.com` | 21 | 0 | [record](gapbreak/fantasy.nfl.com.md) |
| `keeptradecut.com` | 20 | 0 | [record](gapbreak/keeptradecut.com.md) |
| `theathletic.com` | 20 | 0 | [record](gapbreak/theathletic.com.md) |
| `unibet.com` | 17 | 0 | [record](gapbreak/unibet.com.md) |
| `nflsavant.com` | 16 | 0 | [record](gapbreak/nflsavant.com.md) |
| `sleeper.app` | 13 | 2 | [record](gapbreak/sleeper.app.md) |
| `novig.com` | 13 | 0 | [record](gapbreak/novig.com.md) |
| `oddsjam.com` | 12 | 0 | [record](gapbreak/oddsjam.com.md) |
| `legalsportsreport.com` | 10 | 2 | [record](gapbreak/legalsportsreport.com.md) |
| `oddstrader.com` | 8 | 7 | [record](gapbreak/oddstrader.com.md) |
| `betonline.ag` | 7 | 0 | [record](gapbreak/betonline.ag.md) |
| `sportradar.com` | 7 | 0 | [record](gapbreak/sportradar.com.md) |
| `oddsportal.com` | 6 | 0 | [record](gapbreak/oddsportal.com.md) |
| `thepowerrank.com` | 5 | 1 | [record](gapbreak/thepowerrank.com.md) |
| `pointsbet.com` | 3 | 0 | [record](gapbreak/pointsbet.com.md) |
| `bet365.com` | 2 | 0 | [record](gapbreak/bet365.com.md) |
| `draftkings.com` | 2 | 0 | [record](gapbreak/draftkings.com.md) |
| `fantasylife.com` | 2 | 0 | [record](gapbreak/fantasylife.com.md) |
| `sharpfootballstats.com` | 2 | 0 | [record](gapbreak/sharpfootballstats.com.md) |
| `sumer-sports.com` | 2 | 0 | [record](gapbreak/sumer-sports.com.md) |
| `odds-api.io` | 1 | 2 | [record](gapbreak/odds-api.io.md) |
| `bovada.lv` | 1 | 0 | [record](gapbreak/bovada.lv.md) |
| `numberfire.com` | 1 | 0 | [record](gapbreak/numberfire.com.md) |
| `sporttrade.com` | 1 | 0 | [record](gapbreak/sporttrade.com.md) |
| `sisportsbook.com` | 0 | 10 | [record](gapbreak/sisportsbook.com.md) |
| `trumedia.com` | 0 | 2 | [record](gapbreak/trumedia.com.md) |

## Highest yield

- `bettingnews.com` — 47 JSON responses
- `nfl.com` — 46 JSON responses
- `profootballnetwork.com` — 40 JSON responses, 1 tables
- `kalshi.com` — 32 JSON responses
- `scoresandodds.com` — 31 JSON responses, 5 tables
- `actionnetwork.com` — 31 JSON responses

## Notable

`nflsavant.com` exposed `/api/explore/featured` (12,309 B) and `/api/teams` — the explore DSL surface, which is the thing that makes savant worth having.
