# Product Science Ledger — Galaxy Sports Edge

Every major product decision Galaxy makes is journaled here with a
hypothesis, expected effect, metric, guardrail, result, decision, and
next action. The ledger is owner-maintained and append-only.

## Format

```
| Date | Decision | Hypothesis | Expected effect | Primary metric | Guardrail | Result | Decision | Next action |
|---|---|---|---|---|---|---|---|---|
```

## Discipline rules

- Every entry is dated.
- Every entry names a primary metric (telemetry event) and a guardrail
  event drawn from `apps/web/lib/telemetry/events.ts`.
- `confusion.*` and `restraint.*` are guardrails, never primary metrics.
- Entries that result in a ship include the commit hash of the ship.
- Entries that result in a roll-back include the commit hash and a
  one-sentence post-mortem.
- Decisions that did *not* ship are kept — null results are signal.

## Active ledger

| Date | Decision | Hypothesis | Expected effect | Primary metric | Guardrail | Result | Decision | Next action |
|---|---|---|---|---|---|---|---|---|
| 2026-05-29 | Adopt Galaxy Operating Control Plane | The product becomes self-measuring once telemetry, understanding, maturity, and experiments are typed-registered. | Higher methodology-followed rate; lower confusion; stable restraint coverage. | `methodology.followed` | `restraint.responsible_play_followed`, `confusion.short_dwell` | Pending — telemetry sink not yet wired to production. | Ship typed registries; defer sink wiring. | Wire server-only ingest route; configure retention; add E2E. |
| 2026-05-29 | Build Galaxy Orbit View concept page | A spatial signal model is a clearer mental model than a flat feature list. | More methodology follows from the orbit page than from /intelligence. | `methodology.followed` from `/orbit` | `confusion.short_dwell` on `/orbit` | TBD — surface live; awaiting telemetry. | Ship concept page; measure when sink lives. | Add telemetry instrumentation to `/orbit`. |
| 2026-05-29 | Add `/api/og` shareable artifacts | Shareable cards improve referral discovery without changing intent. | More inbound referrals carrying an `og` source param. | `surface.viewed` from referral `og:*` | `restraint.disclosure_shown` | TBD | Ship four artifact routes. | Verify CDN cache headers; legal review of disclaimer copy. |

## Cadence

- Owner reviews weekly.
- Frozen at every major release for audit.

## Authority

- Constitution #6 (process over outcome)
- Experiment Engine Standard
- Product Telemetry Standard
