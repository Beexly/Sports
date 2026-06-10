# GSE Coach/Scheme Current State Audit

Generated: 2026-06-09

## Current State

The scheme layer exists as research direction, not as a completed production feature.

Status by layer:

| Layer | Current status | Next action |
| --- | --- | --- |
| Product doctrine | Present | Keep; now needs source-ledger implementation. |
| Build queue | Present | Promote coach/scheme cards into an implementation epic. |
| Shared contracts | Started | Added coach staff assignment, play-call split, and scheme tendency profile types. |
| Verified 2026 staff dataset | Missing | Build source-ledger seed table from ESPN/NFL/team announcements. |
| Play-call tendency computation | Missing | Use nflverse play-by-play to aggregate run/pass by situation. |
| Defensive front/coverage/personnel | Missing | Requires charting source or licensed feed; public PBP cannot fully answer it. |
| UI | Missing | Build only after source confidence and entitlement rules exist. |

## Existing GSE Hooks

- Entity graph: coach, coordinator, scheme, team, player, venue, and season relationships.
- Research Lab: coaching-change research flow.
- Fantasy War Room: role and scheme-change context.
- Product ecosystem: coordinator/scheme impact as a user-facing question.
- Data architecture map: canonical NFL entity graph includes coaches.
- Top-20 R&D: source-provenanced world model, What Changed engine, player cards, optimizer, trust badges, and founder-only intelligence.

## Main Gap

GSE needs to stop treating scheme as prose and start treating it as a measurable, confidence-scored object. The correct first implementation is not a public article. It is a staff/source ledger plus an offline aggregation pipeline.

## Risk Controls

- Do not attribute a team-level tendency to a coach without tenure and play-caller evidence.
- Do not infer fronts, coverage shells, motion, or personnel from ordinary play-by-play alone.
- Do not publish paid-charting-derived raw values unless the license explicitly allows the surface.
- Do not erase uncertainty when a new coordinator has never called plays.
