# GSE NFL Signal Taxonomy

## Signal Domains

| Domain | Signal Examples | Best Sources | Current Repo State | Recommended Tier |
| --- | --- | --- | --- | --- |
| Market | Consensus, depth, line movement, implied probability, closing-line value | The Odds API or licensed provider | Already partly active | PRO/ELITE/founder |
| Schedule | Rest days, short week, divisional familiarity, travel miles, lookahead | nflverse schedules, current TeamGameLog | Partly active through context enrichment | FREE/PRO |
| Weather | Wind, temperature, precipitation, alerts, roof/surface, air density | NWS, NOAA/Open-Meteo after approval | Blocked missing source | FREE/PRO |
| Venue | Dome/outdoor, turf/grass, altitude, stadium coordinates, travel context | nflverse teams, Wikidata, manual stadium registry | Blocked missing source | FREE/PRO |
| Injury/availability | Practice status, game status, late downgrade, snap reentry, replacement impact | Official injury report, nflreadr injuries, licensed provider | Blocked missing source | PRO/ELITE/founder |
| Roster/depth | Depth chart, roster move, backup role, unit continuity | nflreadr rosters/depth charts, licensed provider, team reports | Blocked missing source | PRO/ELITE/founder |
| Player usage | Snaps, routes, targets, carries, red-zone work, participation | nflreadr participation/snap counts, PBP | Blocked missing source | PRO/ELITE |
| Team strength | Offense, defense, special teams, pace, explosive rate, drive efficiency | nflfastR/nflverse PBP | Derived only from limited current odds/game logs | PRO/ELITE |
| Coaching | Fourth-down aggression, pace, personnel, halftime adjustment, red-zone menu | PBP, news claim cards | Missing | ELITE/founder |
| Officials | Crew assignments, penalty tendency, game-control sensitivity | nflreadr officials, licensed provider | Blocked missing source | ELITE/founder |
| News/reporting | Claim timeline, source confidence, contradictions, narrative vs model divergence | GDELT, publisher RSS/API, team sites | Missing | ELITE/founder |
| Social/attention | Fantasy adds/drops, video interest, public discussion, pageview spikes | Sleeper, YouTube API, Reddit API, Wikimedia | Missing | ELITE/founder |
| Development | Rookie translation, camp battles, preseason role, progression/regression | CFBD, nflreadr combine/draft, team reports | Missing | Founder/ELITE |
| Video-game analog | Original archetypes, ratings sliders, progression bands, style cards | Derived from public performance data | Missing | Founder/PRO/ELITE |
| Compliance/provenance | License, source URL, timestamp, terms gate, blocked-source disclosure | Manual review plus SourceSnapshot | Partly active | Founder/admin |

## Signal Quality Ladder

1. Official/contracted source with explicit display/cache rights.
2. Open historical dataset with attribution and version pinning.
3. Public API with clear terms and rate-limit behavior.
4. Manual claim card with source URL, quote limits, and human review.
5. Attention proxy that never becomes truth by itself.
6. Blocked/private/proprietary data that can inspire a proxy but cannot be ingested.

## Non-Redundant Decision Rule

A signal earns a build card only if it changes a decision or product state that current odds, rest, and historical form cannot already explain. Duplicate data wrappers should be cross-checks, not separate model votes.
