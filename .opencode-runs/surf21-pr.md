Ledger receipt for the round that closed the outage loop. Four merges, each verified on the real tree rather than inherited from a subagent's report.

| Merge | What |
|---|---|
| `3e074c584` (#965) | 52 fabricated provenance claims → **0**. Guard green, not ratcheted. |
| `14b1f4abf` (#964) | An unreadable reading is no longer reported as a fine one. |
| `0360e92b55` (#963) | Signal-ledger shard now rotates, so the tail is ever written. |
| `e1020eb705` (#961) | A DB outage fails loudly instead of silently. |

**The two findings I would most want the next agent to keep:**

*Wiring an adapter to a real function is only correct if the adapter was already right.* The two `devig` adapters that got wired to real code were **already computing wrong values** — one read American odds as decimal prices (so `1/-110` is a negative implied probability, and equal-sided inputs cancelled the error and hid it), the other normalised by sum for every method while reporting `"additive"`. Neither has a non-test caller, so nothing published moved. But a real call site would have made a wrong number *look* validated.

*The counters were worse than the status.* `neon-pool-monitor` reported `"ok"` for a saturated pool because the measurement failed — and `successes` incremented and `lastOkAt` refreshed *during* the outage, erasing the incident window from the field an operator reads to decide whether the DB was fine a minute ago.

**Also recorded:** the ledger shard bug was a constant `0/1`, so every tick rewrote the same leading 80,000 of 118,402 rows and never reached the tail — ~38,000 rows permanently unwritten.

**Verification, re-run here:** provenance guard 0 violations with non-vacuity re-proven by injection; engine suite 859 files / 6,297 tests / 0 failed; 88 tests across three layers for the health fixes.

**Still open, deliberately:** `reservePaidCallSlot` has the same fail-open shape but is a *pacing* decision rather than a health report — changing it needs an owner call on the budget. The 15 ungated-but-unwired functions from the provenance brief are filed in code comments rather than deleted, so the pointers survive.

Ledger at 441 rows, guard exit 0.