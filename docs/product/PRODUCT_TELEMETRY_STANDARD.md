# Product Telemetry Standard — Galaxy Sports Edge

## Purpose

Telemetry exists to make Galaxy **self-measuring** along the only axis
that matters: are users becoming better decision-makers? Telemetry must
never be used to maximize betting volume, manipulate intent, or extract
personal data.

## Authority

- Constitution #5 (no stale-data deception)
- Constitution #14 (no autonomous publishing or external posting)
- Constitution #20 (no weakening of guardrails to make tests pass)
- AI Tool Confidentiality Policy — Bucket B & C rules
- FTC data-minimization guidance — applied as the default

## Architecture

```
apps/web/lib/telemetry/
├── events.ts        # typed event registry (enumerated, discriminated union)
├── surfaces.ts      # surface taxonomy (every emit site enumerated)
├── intent.ts        # user-intent taxonomy + default next-surface map
└── privacy.ts       # forbidden field keys, bucket hashing, retention
```

## Hard rules

1. Every event must appear in the discriminated union `TelemetryEvent`.
   Unknown event names are dropped at the boundary.
2. Every event must declare its surface. Unknown surfaces (not in
   `TELEMETRY_SURFACES`) are dropped.
3. No event may carry any key in `FORBIDDEN_FIELD_KEYS`. The boundary
   strips them and the test suite asserts the strip.
4. No raw user identifier is persisted. Only `subjectBucket` (0..1023)
   derived from a salted hash.
5. No event with a `FORBIDDEN_EVENTS` name may be emitted. The list
   includes `bet.placed`, `bet.amount_increased`, `scarcity.timer_started`,
   and anything else a volume-maximization product would emit.
6. Retention is bounded per category:
   - confusion: 90 days
   - understanding / conversion / experiment: 180–365 days
   - decision-quality / restraint: up to 730 days
7. Operator-tier events (cockpit, admin) never leave the server boundary
   and are not aggregated with public telemetry.

## What we measure

| Category | Why it exists |
|---|---|
| understanding | Are users finding the methodology / academy / glossary? |
| decision-quality | Are users opening evidence audits, autopsies, parlay MRI? |
| restraint | Are users routing through No-Bet, responsible-play, refusals? |
| confusion | Where do users repeatedly back out or short-dwell? |
| conversion | Pricing comparison and sign-in events — Stripe-aligned. |
| experiment | Which variant the user was exposed to. |

## What we do not measure

- Bet amounts, balance, win/loss totals on the user account.
- Time-on-page correlated with deposit behavior.
- Engagement curves designed to optimize for sessions per user.
- Anything that would let the product nudge a user toward placing a
  larger bet, more bets, or any specific selection.

## Implementation contract

- Server-only emit functions. The client surface fires a small JSON POST
  to a server route; the server validates against the registry and the
  privacy module before persisting.
- All emits pass through `stripForbiddenFields` and `containsForbiddenField`
  (the latter is a defense-in-depth assertion).
- Test coverage required for every new event type and every change to
  `FORBIDDEN_FIELD_KEYS`.

## Audit

- Quarterly review of the event registry. Events not emitted in 90 days
  are flagged for removal.
- Annual review of retention windows.
- Owner-only amendments. No autonomous agent can add an event.
