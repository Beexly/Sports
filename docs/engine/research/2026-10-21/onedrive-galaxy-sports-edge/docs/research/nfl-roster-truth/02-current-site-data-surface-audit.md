# Current Site Data Surface Audit

As of: 2026-06-09

This workspace exposes a docs/control lane. The apps directory exists, but the scan returned no app source files; root app/components/lib/data/scripts/prisma were missing. Product surfaces below are therefore mapped from prior research artifacts and must be re-audited in the real shipping clone before implementation.

| Surface | Roster/Person Data | Current Source State | Risk | Recommended Fix |
| --- | --- | --- | --- | --- |
| public player pages | Player team, number, position, status, bio/profile | unknown; source files not visible | HIGH | Use canonical roster API with fact-level evidence and freshness. |
| Player Lab | Player/team movement, changes, GSE Rating overlays | planned docs only | HIGH | Gate what-changed cards on roster truth snapshots and transaction reconciliation. |
| GSE Rating surfaces | Player/team context used to explain ratings | planned docs only | HIGH | Ratings must join through canonical person/team IDs, not static name/team fields. |
| team pages | Roster lists, staff, player links | unknown | HIGH | Render from roster snapshots with stale warnings and conflict suppression. |
| search/autocomplete | Player names, team abbreviations, positions | unknown | HIGH | Use canonical person index with alias table and stale-team validation. |
| content/briefs/articles | Player/team/staff references | docs mention content only | MEDIUM/HIGH | Add content freshness checks and source-backed roster mention linter. |
| founder cockpit | Data health, source freshness, conflicts | planned docs only | HIGH internal | Build private roster accuracy cockpit and manual review queue. |
| API endpoints | Player/team JSON consumed by UI | not visible | HIGH | Contract-test every roster fact and return truth_status/confidence internally. |
| mock/demo/seed data | Static player/team examples | not visible | HIGH if production leakage | Deploy gate must block mock roster data on public surfaces. |
| tests/fixtures | Regression examples and validation snapshots | not visible | MEDIUM | Use dynamic source fixtures for smoke tests; do not hardcode guessed teams. |

## Hardcoded / Mock Risk

The app source tree is not visible here, so hardcoded player/team constants cannot be exhaustively proven or disproven. The remediation plan treats public player cards, Player Lab, GSE Rating, team pages, search/autocomplete, API endpoints, mock/demo files, seed files, tests, and generated data as high-priority surfaces for the real-clone audit.

## Required Real-Clone Audit

In the shipping clone, run targeted rg over app, components, lib, data, scripts, prisma, tests, fixtures, and generated directories for player names, team abbreviations, static rosters, mock data, and stale source markers.

