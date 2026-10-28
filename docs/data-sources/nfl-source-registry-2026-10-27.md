# NFL source registry — index of 100 host dossiers

Built 2026-10-27/28. **1,211,115 URLs enumerated across 100 hosts.** One dossier per host in
`registry/<host>.md`, raw URL lists in `artifacts/sitemaps/<host>.txt`.

Every URL below came off the host's own sitemap tree, walked from its `robots.txt` declarations
plus the conventional paths. Nothing is guessed.

## Read this before planning a pull

- **13 hosts hit the 60,000-URL cap** and are truncated, not exhausted: `4for4.com`, `bettingpros.com`, `cbssports.com`, `fanduel.com`, `fantasypros.com`, `nfl.com`, `oddsportal.com`, `oddstrader.com`, `pff.com`, `pinnacle.com`, `polymarket.com`, `rotowire.com`, `theathletic.com`.
- **31 hosts publish no usable sitemap** and are empty here: `airyards.com`, `bet365.com`, `betonline.ag`, `betrivers.com`, `donbest.com`, `dynastyleaguefootball.com`, `fantasy.espn.com`, `fantasy.nfl.com`, `fleaflicker.com`, `fliff.com`, `football.fantasysports.yahoo.com`, `footballoutsiders.com`, `kalshi.com`, `legalsportsreport.com`, `mysportsfeeds.com`, `numberfire.com`, `oddsjam.com`, `oddsshark.com`, `pointsbet.com`, `pro-football-reference.com`, `receptionperception.com`, `sisportsbook.com`, `spankodds.com`, `sportsdataio.com`, `sporttrade.com`, `stathead.com`, `superbook.com`, `thepowerrank.com`, `tipico.com`, `trumedia.com`, `wynnbet.com`.
  These need crawl-based discovery (katana), not sitemap walking. Several are the most valuable
  targets on the list — PFR, Stathead, Football Outsiders, Reception Perception, SportsDataIO.
- Six hosts are Cloudflare-walled and were reached through `intelligence/ingestion/wall_clear.py`.

## Totals

| Category | Hosts | URLs |
|---|---|---|
| Advanced data / charting | 29 | 353,809 |
| Analytics / betting media | 18 | 336,019 |
| Fantasy / DFS | 19 | 152,939 |
| Sportsbook / odds | 34 | 368,348 |
| **Total** | **100** | **1,211,115** |

## Dossiers


### Advanced data / charting

| Host | URLs | Dossier |
|---|---|---|
| `nfl.com` | 60,000 | [dossier](registry/nfl.com.md) |
| `pff.com` | 60,000 | [dossier](registry/pff.com.md) |
| `theathletic.com` | 60,000 | [dossier](registry/theathletic.com.md) |
| `playerprofiler.com` | 50,438 | [dossier](registry/playerprofiler.com.md) |
| `ftnfantasy.com` | 37,473 | [dossier](registry/ftnfantasy.com.md) |
| `rotoviz.com` | 29,612 | [dossier](registry/rotoviz.com.md) |
| `profootballnetwork.com` | 18,029 | [dossier](registry/profootballnetwork.com.md) |
| `establishtherun.com` | 12,974 | [dossier](registry/establishtherun.com.md) |
| `sharpfootballanalysis.com` | 7,626 | [dossier](registry/sharpfootballanalysis.com.md) |
| `footballperspective.com` | 5,063 | [dossier](registry/footballperspective.com.md) |
| `the33rdteam.com` | 4,284 | [dossier](registry/the33rdteam.com.md) |
| `sportsinfosolutions.com` | 3,033 | [dossier](registry/sportsinfosolutions.com.md) |
| `fantasypoints.com` | 2,018 | [dossier](registry/fantasypoints.com.md) |
| `sumersports.com` | 1,795 | [dossier](registry/sumersports.com.md) |
| `sportradar.com` | 1,233 | [dossier](registry/sportradar.com.md) |
| `nflsavant.com` | 189 | [dossier](registry/nflsavant.com.md) |
| `nflfastr.com` | 40 | [dossier](registry/nflfastr.com.md) |
| `sharpfootballstats.com` | 1 | [dossier](registry/sharpfootballstats.com.md) |
| `sumer-sports.com` | 1 | [dossier](registry/sumer-sports.com.md) |
| `airyards.com` | 0 | [dossier](registry/airyards.com.md) |
| `footballoutsiders.com` | 0 | [dossier](registry/footballoutsiders.com.md) |
| `mysportsfeeds.com` | 0 | [dossier](registry/mysportsfeeds.com.md) |
| `numberfire.com` | 0 | [dossier](registry/numberfire.com.md) |
| `pro-football-reference.com` | 0 | [dossier](registry/pro-football-reference.com.md) |
| `receptionperception.com` | 0 | [dossier](registry/receptionperception.com.md) |
| `sportsdataio.com` | 0 | [dossier](registry/sportsdataio.com.md) |
| `stathead.com` | 0 | [dossier](registry/stathead.com.md) |
| `thepowerrank.com` | 0 | [dossier](registry/thepowerrank.com.md) |
| `trumedia.com` | 0 | [dossier](registry/trumedia.com.md) |

### Analytics / betting media

| Host | URLs | Dossier |
|---|---|---|
| `4for4.com` | 60,000 | [dossier](registry/4for4.com.md) |
| `fantasypros.com` | 60,000 | [dossier](registry/fantasypros.com.md) |
| `oddstrader.com` | 60,000 | [dossier](registry/oddstrader.com.md) |
| `rotowire.com` | 60,000 | [dossier](registry/rotowire.com.md) |
| `teamrankings.com` | 19,478 | [dossier](registry/teamrankings.com.md) |
| `sportsbettingdime.com` | 18,008 | [dossier](registry/sportsbettingdime.com.md) |
| `fantasylife.com` | 16,998 | [dossier](registry/fantasylife.com.md) |
| `rotoballer.com` | 10,390 | [dossier](registry/rotoballer.com.md) |
| `thelines.com` | 9,404 | [dossier](registry/thelines.com.md) |
| `playusa.com` | 6,343 | [dossier](registry/playusa.com.md) |
| `dynastynerds.com` | 4,935 | [dossier](registry/dynastynerds.com.md) |
| `sportsinsights.com` | 4,444 | [dossier](registry/sportsinsights.com.md) |
| `usbets.com` | 2,863 | [dossier](registry/usbets.com.md) |
| `bettingnews.com` | 1,723 | [dossier](registry/bettingnews.com.md) |
| `footballguys.com` | 999 | [dossier](registry/footballguys.com.md) |
| `scoresandodds.com` | 434 | [dossier](registry/scoresandodds.com.md) |
| `dynastyleaguefootball.com` | 0 | [dossier](registry/dynastyleaguefootball.com.md) |
| `legalsportsreport.com` | 0 | [dossier](registry/legalsportsreport.com.md) |

### Fantasy / DFS

| Host | URLs | Dossier |
|---|---|---|
| `cbssports.com` | 60,000 | [dossier](registry/cbssports.com.md) |
| `fanduel.com` | 60,000 | [dossier](registry/fanduel.com.md) |
| `prizepicks.com` | 15,655 | [dossier](registry/prizepicks.com.md) |
| `sleeper.app` | 13,334 | [dossier](registry/sleeper.app.md) |
| `keeptradecut.com` | 1,134 | [dossier](registry/keeptradecut.com.md) |
| `draftkings.com` | 774 | [dossier](registry/draftkings.com.md) |
| `underdogfantasy.com` | 620 | [dossier](registry/underdogfantasy.com.md) |
| `myfantasyleague.com` | 613 | [dossier](registry/myfantasyleague.com.md) |
| `fantasycalc.com` | 473 | [dossier](registry/fantasycalc.com.md) |
| `novig.com` | 271 | [dossier](registry/novig.com.md) |
| `mojo.com` | 36 | [dossier](registry/mojo.com.md) |
| `betr.app` | 22 | [dossier](registry/betr.app.md) |
| `dynastyprocess.com` | 7 | [dossier](registry/dynastyprocess.com.md) |
| `fantasy.espn.com` | 0 | [dossier](registry/fantasy.espn.com.md) |
| `fantasy.nfl.com` | 0 | [dossier](registry/fantasy.nfl.com.md) |
| `fleaflicker.com` | 0 | [dossier](registry/fleaflicker.com.md) |
| `fliff.com` | 0 | [dossier](registry/fliff.com.md) |
| `football.fantasysports.yahoo.com` | 0 | [dossier](registry/football.fantasysports.yahoo.com.md) |
| `sporttrade.com` | 0 | [dossier](registry/sporttrade.com.md) |

### Sportsbook / odds

| Host | URLs | Dossier |
|---|---|---|
| `bettingpros.com` | 60,000 | [dossier](registry/bettingpros.com.md) |
| `oddsportal.com` | 60,000 | [dossier](registry/oddsportal.com.md) |
| `pinnacle.com` | 60,000 | [dossier](registry/pinnacle.com.md) |
| `polymarket.com` | 60,000 | [dossier](registry/polymarket.com.md) |
| `actionnetwork.com` | 37,296 | [dossier](registry/actionnetwork.com.md) |
| `betmgm.com` | 24,125 | [dossier](registry/betmgm.com.md) |
| `sportsbookreview.com` | 21,752 | [dossier](registry/sportsbookreview.com.md) |
| `mybookie.ag` | 10,750 | [dossier](registry/mybookie.ag.md) |
| `vsin.com` | 10,260 | [dossier](registry/vsin.com.md) |
| `caesars.com` | 8,212 | [dossier](registry/caesars.com.md) |
| `bovada.lv` | 4,826 | [dossier](registry/bovada.lv.md) |
| `odds-api.io` | 3,716 | [dossier](registry/odds-api.io.md) |
| `hardrock.bet` | 2,323 | [dossier](registry/hardrock.bet.md) |
| `vegasinsider.com` | 1,836 | [dossier](registry/vegasinsider.com.md) |
| `covers.com` | 1,585 | [dossier](registry/covers.com.md) |
| `bookmaker.eu` | 792 | [dossier](registry/bookmaker.eu.md) |
| `circasports.com` | 325 | [dossier](registry/circasports.com.md) |
| `unabated.com` | 291 | [dossier](registry/unabated.com.md) |
| `theoddsapi.com` | 188 | [dossier](registry/theoddsapi.com.md) |
| `ballybet.com` | 68 | [dossier](registry/ballybet.com.md) |
| `unibet.com` | 3 | [dossier](registry/unibet.com.md) |
| `bet365.com` | 0 | [dossier](registry/bet365.com.md) |
| `betonline.ag` | 0 | [dossier](registry/betonline.ag.md) |
| `betrivers.com` | 0 | [dossier](registry/betrivers.com.md) |
| `donbest.com` | 0 | [dossier](registry/donbest.com.md) |
| `kalshi.com` | 0 | [dossier](registry/kalshi.com.md) |
| `oddsjam.com` | 0 | [dossier](registry/oddsjam.com.md) |
| `oddsshark.com` | 0 | [dossier](registry/oddsshark.com.md) |
| `pointsbet.com` | 0 | [dossier](registry/pointsbet.com.md) |
| `sisportsbook.com` | 0 | [dossier](registry/sisportsbook.com.md) |
| `spankodds.com` | 0 | [dossier](registry/spankodds.com.md) |
| `superbook.com` | 0 | [dossier](registry/superbook.com.md) |
| `tipico.com` | 0 | [dossier](registry/tipico.com.md) |
| `wynnbet.com` | 0 | [dossier](registry/wynnbet.com.md) |