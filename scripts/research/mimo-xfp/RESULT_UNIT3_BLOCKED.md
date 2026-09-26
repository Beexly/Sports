# Unit 3 status: BLOCKED (closing prop lines not available on free public data)

Date: 2026-09-18
Preregistration: PREREGISTRATION_UNIT3.md (written before this status)

## OBSERVATION

Searched local research and repo data paths for a 2025 Weeks 1-18 closing
player-prop line export (no production database, no credentials):

- C:\Users\Garrett\Sports-worktrees\mimo-xfp-2026-09-18
- C:\Users\Garrett\Sports\data
- C:\Users\Garrett\XiaomiMiMoProjects\.mimo-sessions\2026-09-18

Result: CLV *code* and *docs* exist (apps/web/lib/clv/*, docs/data/CARDS_CLOSING_LINE.md).
No local file export of historical closing sportsbook player-prop lines was found.
nflverse public assets do not ship closing player-prop prices.

## BLOCKED reason (exact)

Unit 3 requires 2025 Weeks 1-18 closing prop lines to measure whether projection
gaps predict closing-line error. Those lines are not present as an authorized
free/local export. Laws forbid fabricating market data, using production
credentials, or reading the production database for this research lane.

NOT RUN. No relationship can be estimated without the lines.

## Consequence

- Unit 1: FAIL on pre-registered kill line (see RESULT_UNIT1.md)
- Unit 2: INCONCLUSIVE on pre-registered kill line (see RESULT_UNIT2.md)
- Unit 3: BLOCKED on data gap
- Unit 4: NOT STARTED (correct; Unit 3 has no verdict)

## What would unblock Unit 3

A founder-supplied local export of 2025 Weeks 1-18 closing player-prop lines
(price + market type + player + week + team), placed under the research data
directory. After that, implement exactly the method in PREREGISTRATION_UNIT3.md
(garbage-time ratios, script-adjusted volume, stability gating, deliberate
nulls excluded, week bootstrap). Do not reinvent the method.
