# Role Shock Topology

*`packages/engine/src/galileo/role-shock-topology.ts` + `market-physics/role-state.ts` —
Invention 5. Pure, shadow-only. Candidate generation only — no edge is claimed.*

Player props price a ROLE, not a generic over/under. When a starter is limited, a backfield
changes, an OL is banged up, or game script flips, the role moves immediately but the prop line can
stay anchored to the old assumption for hours. This models the role and surfaces candidates where
the priced role looks stale.

## `PlayerRoleState`
snap / route / target / carry / red-zone shares · third-down & two-minute roles · backup
availability · starter & injury status · OL & defensive-front context · spread & team-total &
weather context · volatility.

## Scores + detectors
- `roleShiftScore` / `roleVolatility` — how far the role has moved vs the priced assumption.
- `roleDeltaScore` — aggregate |recent − projected| plus contextual swings.
- `siblingDivergence({receptionsMove, receivingYardsMove})` — when one sibling market moves and the
  other doesn't, the stale sibling holds outdated role info.
- `generateRoleCandidates(state)` — emits candidates for: backup RB pass-down work after a starter
  limitation; WR2/slot/TE receptions after WR1 out; RB rush UNDER after losing favorite status; QB
  rush OVER behind a hurt OL; backup/rookie conservative-prior uncertainty.

Every candidate carries an explicit **structural reason** and must clear the Edge Immune System
(SimplicityProsecutor rejects bare trends with no structural basis) + the Ledger before promotion.

## Status
Validated on fixtures. Needs real flesh-state feeds (injury/practice timestamps, snap/route/target
shares, depth charts) to run on live games.
