# Crawl — the 31 hosts that publish no sitemap

Built 2026-10-28. These were written off in the registry pass as "needs crawl-based discovery"
and never crawled. This is that pass: BFS, same-host, depth 3, 400-URL cap, seeded from the root
plus seven conventional section paths. Walled hosts go through the wall-clear.

**3,193 URLs reached across 31 hosts. 3 still empty. 5 hit the 400 cap.**

## Honest read

The cap is doing real work — `receptionperception`, `thepowerrank`, `fleaflicker`, `numberfire`
and `fantasy.espn` all hit 400 and are truncated, not exhausted. They are content sites with deep
archives; the crawl proves the surface exists without mapping all of it.

`pro-football-reference.com` reached only 31 and is the clearest failure. PFR rate-limits hard
(429) and the crawl contended with a concurrent probe for most of its run. It was re-crawled alone
afterwards and still only reached 31 — its homepage is a thin directory, so depth-3 BFS is the
wrong shape for it. It needs the index pages walked directly, not crawled.

3 hosts stayed empty and are recorded as such rather than padded.

## Still empty (3)

`fantasy.nfl.com`, `legalsportsreport.com`, `oddsjam.com`

## All hosts

| Host | URLs reached | Record |
|---|---|---|
| `polymarket.com` | 400 | [record](crawl/polymarket.com.md) |
| `receptionperception.com` | 400 | [record](crawl/receptionperception.com.md) |
| `thepowerrank.com` | 400 | [record](crawl/thepowerrank.com.md) |
| `fleaflicker.com` | 395 | [record](crawl/fleaflicker.com.md) |
| `numberfire.com` | 393 | [record](crawl/numberfire.com.md) |
| `fantasy.espn.com` | 389 | [record](crawl/fantasy.espn.com.md) |
| `oddsshark.com` | 167 | [record](crawl/oddsshark.com.md) |
| `trumedia.com` | 122 | [record](crawl/trumedia.com.md) |
| `stathead.com` | 107 | [record](crawl/stathead.com.md) |
| `mysportsfeeds.com` | 63 | [record](crawl/mysportsfeeds.com.md) |
| `donbest.com` | 57 | [record](crawl/donbest.com.md) |
| `superbook.com` | 42 | [record](crawl/superbook.com.md) |
| `sportsdataio.com` | 36 | [record](crawl/sportsdataio.com.md) |
| `pro-football-reference.com` | 31 | [record](crawl/pro-football-reference.com.md) |
| `pointsbet.com` | 25 | [record](crawl/pointsbet.com.md) |
| `betonline.ag` | 22 | [record](crawl/betonline.ag.md) |
| `airyards.com` | 20 | [record](crawl/airyards.com.md) |
| `spankodds.com` | 19 | [record](crawl/spankodds.com.md) |
| `fliff.com` | 18 | [record](crawl/fliff.com.md) |
| `wynnbet.com` | 17 | [record](crawl/wynnbet.com.md) |
| `sporttrade.com` | 14 | [record](crawl/sporttrade.com.md) |
| `footballoutsiders.com` | 11 | [record](crawl/footballoutsiders.com.md) |
| `tipico.com` | 10 | [record](crawl/tipico.com.md) |
| `football.fantasysports.yahoo.com` | 9 | [record](crawl/football.fantasysports.yahoo.com.md) |
| `sisportsbook.com` | 9 | [record](crawl/sisportsbook.com.md) |
| `betrivers.com` | 8 | [record](crawl/betrivers.com.md) |
| `kalshi.com` | 8 | [record](crawl/kalshi.com.md) |
| `bet365.com` | 1 | [record](crawl/bet365.com.md) |
| `fantasy.nfl.com` | 0 | [record](crawl/fantasy.nfl.com.md) |
| `legalsportsreport.com` | 0 | [record](crawl/legalsportsreport.com.md) |
| `oddsjam.com` | 0 | [record](crawl/oddsjam.com.md) |

## Caveat

URLs reached is not URLs that exist. Depth 3 from a homepage is a sample, and a site with pagination or infinite scroll looks far smaller than it is. Treat these as surfaces confirmed, not surfaces complete.
