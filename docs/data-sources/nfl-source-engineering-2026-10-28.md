# NFL source engineering — index of 100 host records

Built 2026-10-28. **70 JSON endpoints captured. 970 client-side functions passed the filter across
53 hosts.** One record per host in `engineering/<host>.md`, captured payloads in
`artifacts/api-captures/<host>/`.

## The filter, and why it exists

The first extractor matched framework code — `updateProjection` from framer-motion, polyfills,
Firebase internals. That is not proprietary logic. Corrected:

- vendor bundles dropped (`polyfill|vendor|framework|runtime|chunk|framer|react-dom|...`)
- a function is kept only if its body carries a domain word (nfl, player, projection, rank, target,
  route, epa, coverage, ...) **and** at least two arithmetic operations on operands
- UI handlers are dropped by name (`handle*`, `on[A-Z]`, `toggle*`, `use[A-Z]`)
- only surviving app bundles are beautified; every script still contributes endpoints

## What the numbers mean

**26 hosts expose JSON unauthenticated.** For those the response schema is the artifact — the model
is server-side and the shape is what is actually readable.

**53 hosts yielded client functions.** Minified names (`Fde`, `Fn`, `cwe`) are normal; the body is
what carries the arithmetic.

**40 hosts are an explicit gap.** No JSON, no surviving function. They
need a credentialed session or crawl-based page parsing, and they are recorded as gaps rather than
filled with invented coefficients.

## Totals by category

| Category | Hosts | JSON captures | Functions |
|---|---|---|---|
| Advanced data / charting | 29 | 21 | 224 |
| Analytics / betting media | 18 | 14 | 222 |
| Fantasy / DFS | 19 | 11 | 171 |
| Sportsbook / odds | 34 | 24 | 353 |
| **Total** | **100** | **70** | **970** |

## Records


### Advanced data / charting

| Host | JSON | Functions | Gap | Record |
|---|---|---|---|---|
| `playerprofiler.com` | 13 | 18 | — | [record](engineering/playerprofiler.com.md) |
| `pff.com` | 4 | 40 | — | [record](engineering/pff.com.md) |
| `fantasypoints.com` | 2 | 20 | — | [record](engineering/fantasypoints.com.md) |
| `receptionperception.com` | 1 | 35 | — | [record](engineering/receptionperception.com.md) |
| `sportsinfosolutions.com` | 1 | 1 | — | [record](engineering/sportsinfosolutions.com.md) |
| `the33rdteam.com` | 0 | 25 | — | [record](engineering/the33rdteam.com.md) |
| `footballperspective.com` | 0 | 20 | — | [record](engineering/footballperspective.com.md) |
| `sharpfootballanalysis.com` | 0 | 14 | — | [record](engineering/sharpfootballanalysis.com.md) |
| `pro-football-reference.com` | 0 | 12 | — | [record](engineering/pro-football-reference.com.md) |
| `stathead.com` | 0 | 12 | — | [record](engineering/stathead.com.md) |
| `airyards.com` | 0 | 11 | — | [record](engineering/airyards.com.md) |
| `ftnfantasy.com` | 0 | 7 | — | [record](engineering/ftnfantasy.com.md) |
| `nflfastr.com` | 0 | 7 | — | [record](engineering/nflfastr.com.md) |
| `establishtherun.com` | 0 | 2 | — | [record](engineering/establishtherun.com.md) |
| `footballoutsiders.com` | 0 | 0 | nothing public | [record](engineering/footballoutsiders.com.md) |
| `mysportsfeeds.com` | 0 | 0 | — | [record](engineering/mysportsfeeds.com.md) |
| `nfl.com` | 0 | 0 | nothing public | [record](engineering/nfl.com.md) |
| `nflsavant.com` | 0 | 0 | — | [record](engineering/nflsavant.com.md) |
| `numberfire.com` | 0 | 0 | — | [record](engineering/numberfire.com.md) |
| `profootballnetwork.com` | 0 | 0 | — | [record](engineering/profootballnetwork.com.md) |
| `rotoviz.com` | 0 | 0 | — | [record](engineering/rotoviz.com.md) |
| `sharpfootballstats.com` | 0 | 0 | nothing public | [record](engineering/sharpfootballstats.com.md) |
| `sportradar.com` | 0 | 0 | nothing public | [record](engineering/sportradar.com.md) |
| `sportsdataio.com` | 0 | 0 | — | [record](engineering/sportsdataio.com.md) |
| `sumer-sports.com` | 0 | 0 | nothing public | [record](engineering/sumer-sports.com.md) |
| `sumersports.com` | 0 | 0 | nothing public | [record](engineering/sumersports.com.md) |
| `theathletic.com` | 0 | 0 | nothing public | [record](engineering/theathletic.com.md) |
| `thepowerrank.com` | 0 | 0 | — | [record](engineering/thepowerrank.com.md) |
| `trumedia.com` | 0 | 0 | nothing public | [record](engineering/trumedia.com.md) |

### Analytics / betting media

| Host | JSON | Functions | Gap | Record |
|---|---|---|---|---|
| `fantasylife.com` | 4 | 0 | server-side | [record](engineering/fantasylife.com.md) |
| `footballguys.com` | 3 | 7 | — | [record](engineering/footballguys.com.md) |
| `bettingnews.com` | 3 | 0 | server-side | [record](engineering/bettingnews.com.md) |
| `playusa.com` | 2 | 17 | — | [record](engineering/playusa.com.md) |
| `teamrankings.com` | 1 | 25 | — | [record](engineering/teamrankings.com.md) |
| `dynastynerds.com` | 1 | 12 | — | [record](engineering/dynastynerds.com.md) |
| `4for4.com` | 0 | 58 | — | [record](engineering/4for4.com.md) |
| `sportsinsights.com` | 0 | 34 | — | [record](engineering/sportsinsights.com.md) |
| `dynastyleaguefootball.com` | 0 | 15 | — | [record](engineering/dynastyleaguefootball.com.md) |
| `sportsbettingdime.com` | 0 | 14 | — | [record](engineering/sportsbettingdime.com.md) |
| `rotowire.com` | 0 | 11 | — | [record](engineering/rotowire.com.md) |
| `fantasypros.com` | 0 | 9 | — | [record](engineering/fantasypros.com.md) |
| `thelines.com` | 0 | 8 | — | [record](engineering/thelines.com.md) |
| `rotoballer.com` | 0 | 6 | — | [record](engineering/rotoballer.com.md) |
| `usbets.com` | 0 | 6 | — | [record](engineering/usbets.com.md) |
| `legalsportsreport.com` | 0 | 0 | nothing public | [record](engineering/legalsportsreport.com.md) |
| `oddstrader.com` | 0 | 0 | nothing public | [record](engineering/oddstrader.com.md) |
| `scoresandodds.com` | 0 | 0 | nothing public | [record](engineering/scoresandodds.com.md) |

### Fantasy / DFS

| Host | JSON | Functions | Gap | Record |
|---|---|---|---|---|
| `sleeper.app` | 7 | 0 | server-side | [record](engineering/sleeper.app.md) |
| `cbssports.com` | 2 | 26 | — | [record](engineering/cbssports.com.md) |
| `fanduel.com` | 1 | 22 | — | [record](engineering/fanduel.com.md) |
| `keeptradecut.com` | 1 | 0 | server-side | [record](engineering/keeptradecut.com.md) |
| `prizepicks.com` | 0 | 29 | — | [record](engineering/prizepicks.com.md) |
| `football.fantasysports.yahoo.com` | 0 | 24 | — | [record](engineering/football.fantasysports.yahoo.com.md) |
| `fantasy.espn.com` | 0 | 21 | — | [record](engineering/fantasy.espn.com.md) |
| `fliff.com` | 0 | 21 | — | [record](engineering/fliff.com.md) |
| `fleaflicker.com` | 0 | 20 | — | [record](engineering/fleaflicker.com.md) |
| `fantasycalc.com` | 0 | 4 | — | [record](engineering/fantasycalc.com.md) |
| `betr.app` | 0 | 3 | — | [record](engineering/betr.app.md) |
| `underdogfantasy.com` | 0 | 1 | — | [record](engineering/underdogfantasy.com.md) |
| `draftkings.com` | 0 | 0 | nothing public | [record](engineering/draftkings.com.md) |
| `dynastyprocess.com` | 0 | 0 | nothing public | [record](engineering/dynastyprocess.com.md) |
| `fantasy.nfl.com` | 0 | 0 | nothing public | [record](engineering/fantasy.nfl.com.md) |
| `mojo.com` | 0 | 0 | nothing public | [record](engineering/mojo.com.md) |
| `myfantasyleague.com` | 0 | 0 | nothing public | [record](engineering/myfantasyleague.com.md) |
| `novig.com` | 0 | 0 | nothing public | [record](engineering/novig.com.md) |
| `sporttrade.com` | 0 | 0 | nothing public | [record](engineering/sporttrade.com.md) |

### Sportsbook / odds

| Host | JSON | Functions | Gap | Record |
|---|---|---|---|---|
| `bovada.lv` | 9 | 0 | server-side | [record](engineering/bovada.lv.md) |
| `actionnetwork.com` | 3 | 0 | server-side | [record](engineering/actionnetwork.com.md) |
| `covers.com` | 2 | 56 | — | [record](engineering/covers.com.md) |
| `oddsshark.com` | 2 | 37 | — | [record](engineering/oddsshark.com.md) |
| `odds-api.io` | 2 | 0 | server-side | [record](engineering/odds-api.io.md) |
| `wynnbet.com` | 1 | 18 | — | [record](engineering/wynnbet.com.md) |
| `theoddsapi.com` | 1 | 11 | — | [record](engineering/theoddsapi.com.md) |
| `donbest.com` | 1 | 3 | — | [record](engineering/donbest.com.md) |
| `betonline.ag` | 1 | 0 | server-side | [record](engineering/betonline.ag.md) |
| `oddsportal.com` | 1 | 0 | server-side | [record](engineering/oddsportal.com.md) |
| `polymarket.com` | 1 | 0 | server-side | [record](engineering/polymarket.com.md) |
| `vsin.com` | 0 | 53 | — | [record](engineering/vsin.com.md) |
| `sportsbookreview.com` | 0 | 47 | — | [record](engineering/sportsbookreview.com.md) |
| `superbook.com` | 0 | 36 | — | [record](engineering/superbook.com.md) |
| `caesars.com` | 0 | 35 | — | [record](engineering/caesars.com.md) |
| `bookmaker.eu` | 0 | 14 | — | [record](engineering/bookmaker.eu.md) |
| `circasports.com` | 0 | 14 | — | [record](engineering/circasports.com.md) |
| `mybookie.ag` | 0 | 8 | — | [record](engineering/mybookie.ag.md) |
| `unabated.com` | 0 | 8 | — | [record](engineering/unabated.com.md) |
| `bettingpros.com` | 0 | 7 | — | [record](engineering/bettingpros.com.md) |
| `ballybet.com` | 0 | 5 | — | [record](engineering/ballybet.com.md) |
| `hardrock.bet` | 0 | 1 | — | [record](engineering/hardrock.bet.md) |
| `bet365.com` | 0 | 0 | nothing public | [record](engineering/bet365.com.md) |
| `betmgm.com` | 0 | 0 | nothing public | [record](engineering/betmgm.com.md) |
| `betrivers.com` | 0 | 0 | nothing public | [record](engineering/betrivers.com.md) |
| `kalshi.com` | 0 | 0 | nothing public | [record](engineering/kalshi.com.md) |
| `oddsjam.com` | 0 | 0 | nothing public | [record](engineering/oddsjam.com.md) |
| `pinnacle.com` | 0 | 0 | nothing public | [record](engineering/pinnacle.com.md) |
| `pointsbet.com` | 0 | 0 | nothing public | [record](engineering/pointsbet.com.md) |
| `sisportsbook.com` | 0 | 0 | nothing public | [record](engineering/sisportsbook.com.md) |
| `spankodds.com` | 0 | 0 | nothing public | [record](engineering/spankodds.com.md) |
| `tipico.com` | 0 | 0 | nothing public | [record](engineering/tipico.com.md) |
| `unibet.com` | 0 | 0 | nothing public | [record](engineering/unibet.com.md) |
| `vegasinsider.com` | 0 | 0 | nothing public | [record](engineering/vegasinsider.com.md) |