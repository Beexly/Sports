# GSE Source Dedupe Map

## Canonical Truth Families

| Truth Domain | Canonical Candidate | Secondary/Validation | Do Not Do |
| --- | --- | --- | --- |
| Odds/markets | The Odds API or one approved licensed odds provider | SportsGameOdds/API-Sports/SportsDataIO evaluation | Do not scrape DraftKings, FanDuel, ESPN, or sportsbook pages |
| Historical PBP | nflfastR/nflverse | Licensed provider spot checks | Do not run parallel wrappers as independent signals |
| Rosters/entity graph | nflverse rosters/players plus manual overrides | Licensed provider validation | Do not trust name matching alone |
| Injuries | Licensed provider or approved official report workflow | nflreadr injuries for history | Do not infer medical conditions or scrape hidden endpoints |
| Weather | NWS for U.S. forecasts/alerts | Open-Meteo/NOAA after terms review | Do not poll high-frequency or ignore User-Agent/cache rules |
| News | Approved RSS/API/licensed feeds plus claim cards | GDELT attention proxy | Do not copy full articles or bypass paywalls |
| Social/video attention | Official APIs and metadata | Wikimedia/Sleeper low-risk proxies | Do not scrape or store protected bodies/media |
| Video-game analogs | Original GSE public-data derived estimates | Public NGS aggregates and PBP proxies | Do not copy EA/Madden ratings or branding |

## Redundant Sources Removed

- Direct sportsbook page scraping is redundant with approved odds APIs and carries higher legal risk.
- ESPN direct extraction is redundant with licensed providers and carries high Disney terms risk.
- Multiple nflverse wrappers should not each become model votes; choose one canonical loader per runtime.
- Pro Football Reference should remain manual validation or licensed use, not bulk scraping.
- Public NGS pages should not be treated as raw tracking data.
