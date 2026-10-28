# Gap break — 40 hosts that yielded nothing on the client surface

Built 2026-10-28. These are the hosts the engineering pass recorded as gaps. Two strategies
were tried in order: server-rendered table extraction (homepage then section pages), then a
rendered browser that captures every JSON response the page itself requests.

**31 of 40 broken. 439 JSON responses captured. 9 remain gaps.**

## Why the browser is the answer

The gaps are JS-rendered SPAs. The HTML carries no tables and the API paths are not guessable
from a static fetch. Rendering the page and recording its own network calls is the only thing
that works — the site hands over exactly what it uses to build itself.

## Still a gap (9)

`betmgm.com`, `betrivers.com`, `dynastyprocess.com`, `footballoutsiders.com`, `mojo.com`, `myfantasyleague.com`, `spankodds.com`, `sumersports.com`, `tipico.com`

These need a credentialed session. Nothing public is reachable.

## Broken (31)

| Host | JSON responses | Rendered tables | Record |
|---|---|---|---|
| `bettingnews.com` | 47 | 0 | [record](gapbreak/bettingnews.com.md) |
| `nfl.com` | 46 | 0 | [record](gapbreak/nfl.com.md) |
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
| `sleeper.app` | 13 | 2 | [record](gapbreak/sleeper.app.md) |
| `novig.com` | 13 | 0 | [record](gapbreak/novig.com.md) |
| `oddsjam.com` | 12 | 0 | [record](gapbreak/oddsjam.com.md) |
| `legalsportsreport.com` | 10 | 2 | [record](gapbreak/legalsportsreport.com.md) |
| `oddstrader.com` | 8 | 7 | [record](gapbreak/oddstrader.com.md) |
| `betonline.ag` | 7 | 0 | [record](gapbreak/betonline.ag.md) |
| `sportradar.com` | 7 | 0 | [record](gapbreak/sportradar.com.md) |
| `oddsportal.com` | 6 | 0 | [record](gapbreak/oddsportal.com.md) |
| `pointsbet.com` | 3 | 0 | [record](gapbreak/pointsbet.com.md) |
| `bet365.com` | 2 | 0 | [record](gapbreak/bet365.com.md) |
| `draftkings.com` | 2 | 0 | [record](gapbreak/draftkings.com.md) |
| `fantasylife.com` | 2 | 0 | [record](gapbreak/fantasylife.com.md) |
| `sharpfootballstats.com` | 2 | 0 | [record](gapbreak/sharpfootballstats.com.md) |
| `sumer-sports.com` | 2 | 0 | [record](gapbreak/sumer-sports.com.md) |
| `odds-api.io` | 1 | 2 | [record](gapbreak/odds-api.io.md) |
| `bovada.lv` | 1 | 0 | [record](gapbreak/bovada.lv.md) |
| `sporttrade.com` | 1 | 0 | [record](gapbreak/sporttrade.com.md) |
| `sisportsbook.com` | 0 | 10 | [record](gapbreak/sisportsbook.com.md) |
| `trumedia.com` | 0 | 2 | [record](gapbreak/trumedia.com.md) |

## Highest yield

- `bettingnews.com` — 47 JSON responses
- `nfl.com` — 46 JSON responses
- `kalshi.com` — 32 JSON responses
- `scoresandodds.com` — 31 JSON responses, 5 tables
- `actionnetwork.com` — 31 JSON responses
- `vegasinsider.com` — 29 JSON responses, 6 tables