# ARCHIVED — Outdoor-placeholder SF@DAL Week 10 artifacts (superseded)

Archived 2026-11-13 by crucible-fix-2 (launch branch hermes/week10-master-launch-2026-11-13).

## Why these artifacts are invalid

The sealed connected-workflow run that produced these artifacts (WP-8 full slate,
generated 2026-11-13) resolved the SF@DAL environment from the generic Week 10
fallback: **outdoor placeholder, 58F, 7.5 mph wind, 10% precip, "DAL Home Venue"**
(is_indoor=false, is_dome=false, fg_make_prob_delta=-0.0144).

AT&T Stadium (Arlington, TX — Dallas home) plays this game with the **roof CLOSED**:
indoor, climate-controlled (~70F), no wind, no precipitation. Sourced evidence
(all retrieved 2026-11-13):

- ESPN 2026 Week 10 scoreboard (data/engine/espn_2026_week10_scoreboard.json):
  venue.fullName = "AT&T Stadium", venue.indoor = true, kickoff 2026-11-15T21:25Z.
- DK Network Week 10 weather forecast (published 2026-11-13): "AT&T Stadium
  (Retractable roof, expected closed) ... With the roof expected to be closed,
  none of it should reach the field."
  https://dknetwork.draftkings.com/2026/11/13/nfl-week-10-weather-forecast/
- FantasyInfoCentral Cowboys weather page: "Retractable Dome (likely closed)
  No weather impact"; every 2026 Cowboys home game in bad weather sealed
  "Dome closed (no weather impact)".
  https://www.fantasyinfocentral.com/nfl/weather/cowboys
- Indoor ~70F observed at the same venue roof-closed (2026 World Cup semifinal,
  Soccer America / Mike Woitalla): "players and fans enjoyed a comfortable
  air-conditioned 70 or so degrees inside what's usually known as AT&T Stadium."
  https://www.socceramerica.com/the-world-cup-sparkled-magnificently-in-dallas-especially-for-spain/

The outdoor forecast (49F, 10 mph E wind gusts 20, 62% rain — NFLWeather.com /
DK Network) is immaterial inside the closed roof. Auditor dossier:
C:/Users/Garrett/Sports/foundry/artifacts/week10_crucible/SF_DAL.md (defect D1).

Therefore the sealed SF win prob 0.607 / score 25.85-22.35 in this dossier is
OUTDOOR-PLACEHOLDER-CONDITIONAL and must not be published.

## Superseded by

The re-run with the verified roof-closed environment
(WEEK10_MATCHUP_WEATHER_REGISTRY[("SF","DAL")]: AT&T Stadium, is_indoor=true,
roof_closed=true, wind 0 mph, 70F, precip 0):
- data/engine/connected_workflow_dossier_sf_dal_week10.json (fresh receipt chain)
- data/context_packets/2026_10_SF_DAL.json, data/simulations/2026_10_SF_DAL.sim.json,
  data/reasoning/traces/2026_10_SF_DAL.trace.json (re-armed)

The live-JEV spine (data/engine/jev_full_game_spine_sf_dal_week10.json) is NOT
archived: QB1s (Brock Purdy / Dak Prescott) are unchanged and the spine remains
SG-1 fresh; the environment fix does not touch the spine. The sealed Tuesday
baseline (coachMindsetHash, tau=0.42) was NOT modified; it is loaded read-only by
the simulator. These archived files are preserved for audit history only.

## Archived file hashes (sha256)

| file | sha256 |
|---|---|
| 2026_10_SF_DAL.sim.json | 3b3d65295f2a3052c147927e4cdb6ef33da8a813c6533b24bfe77ae108671ee6 |
| 2026_10_SF_DAL.trace.json | a80172bc51d088b6c3235a69747f285c49dba354799502e544a40c0546b15596 |
| connected_workflow_dossier_sf_dal_week10.json | 62c422ecf69a1c2a0fff8acb6c9742651582b9296286f7a39e84a08805103035 |
| context_packet_2026_10_SF_DAL.json | 3950a32b1fc6eb18fbe08444068f80211803be45d6978fd276b4892e714083ee |