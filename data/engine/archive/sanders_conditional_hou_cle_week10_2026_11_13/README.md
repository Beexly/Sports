# ARCHIVED — Sanders-conditional HOU@CLE Week 10 artifacts (superseded)

Archived 2026-11-13 by crucible-fix-1 (launch branch hermes/week10-master-launch-2026-11-13).

## Why these artifacts are invalid

The sealed connected-workflow run that produced these artifacts (WP-8 full slate,
generated 2026-11-13T13:38:33.597924+00:00) resolved CLE QB1 = **Shedeur Sanders**, because both
scripts/ops/build_week10_jev_spines.py and the Stage-0 allowlist
(scripts/ops/enforce_stage0_roster_and_board_allowlist.py -> require_week) sourced
confirmed_qb1 from the DFS rostering gate config
(data/nflverse/week10_live_roster_transactions_and_starters_2026.json), which substitutes
Sanders for the banned Deshaun Watson.

The authoritative Stage-0 preflight config
(data/engine/week10_stage0_preflight_config.json, qb1_ban_conflicts) resolves
CLE QB1 = **Deshaun Watson** as the LIVE starter for simulation: the latest nflverse
depth chart ranks him QB1, the week-10 injury report has no Out/Doubtful/IR row for him
(Questionable - Concussion only), and ESPN announced him the starter on 2026-11-11.
The Stage-0 ban is retained for DFS rostering only.

Therefore the sealed HOU win prob 0.6088 / score 23.38-19.88 in this dossier is
SANDERS-CONDITIONAL and must not be published. The environment was also a generic
placeholder (58F / 7.5 mph wind, "CLE Home Venue") rather than the verified forecast
(47F feels-like 42F, wind 9 mph gusts 15, Huntington Bank Field — NFLWeather.com 2026-11-13).

## Superseded by

The re-run with the QB1 live-starter fix (apply_stage0_qb1_live_starter_resolutions):
- data/engine/jev_full_game_spine_hou_cle_week10.json (rebuilt, QB1 = Deshaun Watson)
- data/engine/connected_workflow_dossier_hou_cle_week10.json (fresh receipt chain)
- data/context_packets/2026_10_HOU_CLE.json, data/simulations/2026_10_HOU_CLE.sim.json,
  data/reasoning/traces/2026_10_HOU_CLE.trace.json (re-armed)

The sealed Tuesday baseline (coachMindsetHash, tau=0.42) was NOT modified; it is loaded
read-only by the simulator. These archived files are preserved for audit history only.

## Archived file hashes (sha256)

| file | sha256 |
|---|---|
| 2026_10_HOU_CLE.sim.json | bcaf6e4d6835fb29c8a19d23a55b7b773f39d99246354d6b4499db2093605e84 |
| 2026_10_HOU_CLE.trace.json | fadbf5925692306802a31e391a94053cc223d112b5d877a05611190d722aad72 |
| connected_workflow_dossier_hou_cle_week10.json | 0e3fa09f787a525dc7248be23b595a2d5ec5a5f0ce088da9b354972abd5fe8b9 |
| context_packet_2026_10_HOU_CLE.json | c61ab96d3872807a9980fb0c7972cfe2db928c2a57795c497722635f7dc33be8 |
| jev_full_game_spine_hou_cle_week10.json | 470030e28e5d42b055dcf4d9e0394e16ca0dbc2b53c39e1259df45e9db91b479 |
