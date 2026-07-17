# GSE Frontier Workstream Queue

| ID | Status | Workstream | Dependency | Primary leverage | Protected zones |
|---|---|---|---|---|---|
| W000 | DONE (slice 1) / REPEATABLE | Recover Existing Assets | none | Prevent duplicate code; restore stranded correctness and frontier substrate | varies by selected PR |
| W001 | ACTIVE | Governed Playback Canonicalization | W000 ✓; PR #112 disposition | One evidence envelope/event/delta/playback spine | settlement, proof, entitlements |
| W002 | BLOCKED | Worldline v0 | W001 | Bitemporal as-of replay and no-lookahead world diffs | data, proof |
| W003 | BLOCKED | Reality Receipt v0 | W002 | Reproducible visual/decision object | proof, public claims |
| W004 | BLOCKED | SportsIR v0 | W002-W003 | Shared minimal intermediate representation | schema/contracts |
| W005 | BLOCKED | Intelligence Contract v0 | W002, existing watchlist | Persistent user-maintained intelligence | entitlements, notifications |
| W006 | BLOCKED | Capability Foundry v0 | W000; PR #124 disposition | Turn discovered assets into evaluated capabilities | supply chain, source rights |
| W007 | BLOCKED | Branching Reality v0 | W002, W004 | Preserve unresolved worlds instead of flattening uncertainty | model/public interpretation |
| W008 | BLOCKED | Model Ecology v0 | W006-W007 | Regime-aware shadow competition | model freeze, claims |
| W009 | BLOCKED | Hypothesis-to-Instrument v0 | W004, historical harness | Convert research into versioned product metrics | evaluation/claims |
| W010 | BLOCKED | Product Twin v0 | telemetry baseline | Turn comprehension gaps into bounded proposals | privacy, experiments |

## Workstream completion rule

A workstream is DONE only when its acceptance criteria, tests, protected-zone review, branch/PR receipt, and current-state update are verified. One session executes one workstream.

## W000 remaining recovery slices (repeatable, see RECOVERY_MATRIX.md)

- #123 cockpit per-page ADMIN (founder-mergeable or next recovery slice)
- #124 frontier fabric (after #119/#123 land; guard-script interplay re-check)
- #122 CLV/Pedersen (OWNER_GATE: founder merge + migration)
- #121 fantasy engine (after trademark rename)
- #52 Galaxy Dynasty (defer to Dynasty convergence)
