# Team, Status, And Position Normalization

As of: 2026-06-09

## Team Issues

Normalize LA/LAR/LAC, JAX/JAC, ARI/ARZ, WSH/WAS, historical abbreviations, relocation history, free agent/null team, retired/null team, practice squad team, reserve statuses, and international-game fields that are not team changes.

## Status Taxonomy

- ACTIVE
- INACTIVE
- PRACTICE_SQUAD
- INJURED_RESERVE
- PUP
- NFI
- SUSPENDED
- EXEMPT
- RESERVE_FUTURES
- WAIVED
- RELEASED
- FREE_AGENT
- RETIRED
- TRADED_PENDING
- SIGNED_PENDING
- UNKNOWN

## Position Taxonomy

- QB
- RB
- FB
- WR
- TE
- OT
- OG
- C
- OL
- DL
- DT
- DE
- EDGE
- LB
- ILB
- OLB
- CB
- S
- FS
- SS
- DB
- K
- P
- LS
- RET
- ATH

## Depth Role Taxonomy

starter, backup, rotational, practice squad, injured, specialist, unknown, source-specific rank, confidence.

## Rules

- Preserve source_value next to normalized_value.
- Unknown source status maps to UNKNOWN, not ACTIVE.
- Practice squad is a team membership with non-active roster status.
- Injury/practice participation is availability, not necessarily roster membership.

