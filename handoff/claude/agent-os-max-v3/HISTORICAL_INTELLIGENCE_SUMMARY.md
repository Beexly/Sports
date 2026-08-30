# Historical Intelligence Queue

Historical NFL tasking is now represented in the Agent OS task queue and supporting libraries.

## Built

- GSIS-first player identity resolver.
- Team alias resolver.
- Game identity resolver requiring season, week, and teams; commence-time-only joins are unsafe.
- Settled-season guard: historical seasons must be before current season.
- Stat coverage auditor that routes gaps to PRISM/ASCEND with Claude review.
- Projection feature registry where every feature requires AUDIT review, owner approval for weight changes, and unsettled-season exclusion.
