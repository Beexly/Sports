# Experience Orchestrator — Galaxy Sports Edge

## Purpose

Different user modes deserve different defaults. The Experience
Orchestrator is the small, pure function that turns *mode + maturity +
understanding + behavior + confusion* into a single recommendation:
which surface to surface next, and which restraint flags to set.

It is **never** allowed to nudge a bet, raise a stake, manufacture
urgency, or suppress restraint.

## Architecture

```
apps/web/lib/experience/
├── user-modes.ts          # 8 modes + default surfaces per mode
├── surface-priority.ts    # relative weights per surface
├── next-best-surface.ts   # mode + maturity → primary/secondary
└── orchestrator.ts        # composes the above with behavior + confusion
```

## Eight modes

`first-visit`, `returning-scan`, `researching-game`,
`studying-methodology`, `auditing-history`, `calibrating-account`,
`in-restraint`, `post-loss-cooldown`.

User-declared modes (`in-restraint`) cannot be overridden by inferred
modes. Once declared, the orchestrator honors it for the session.

## Restraint priority

- `/responsible-play` has weight 100 — it can always be promoted.
- `/methodology` is in `NEVER_SUPPRESS` — orchestrator cannot demote it.
- Risky behavior patterns can elevate `/no-bet`, `/responsible-play`,
  or an Academy module — never anything else.

## Maturity influence

- **spectator / learner**: Academy is promoted to primary if a next
  module is available.
- **operator+**: mode-based defaults stand.

## Notes field

The orchestrator returns a `notes` array — a small audit trail of
why a recommendation was made. Useful for evaluation and debugging.
Never user-facing.

## What the orchestrator cannot do

- Cannot select `/picks` or a betting surface for a user in restraint.
- Cannot suppress `/responsible-play` or `/methodology`.
- Cannot raise an upsell flag for a user in any restraint mode.
- Cannot recommend "place a bet" or any equivalent surface.

## Authority

- Constitution #2 (process over outcome)
- Constitution #8 (no autonomous betting actions)
- Constitution #20 (no weakening of guardrails)
- Decision Quality Maturity Model (C22)
- User Understanding Model (C21)
- Responsible Intelligence / Friction Layer (C27, downstream)
