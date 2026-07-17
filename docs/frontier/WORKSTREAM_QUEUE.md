# GSE Frontier Workstream Queue

| ID | Status | Workstream | Dependency | Primary leverage | Protected zones |
|---|---|---|---|---|---|
| W000 | DONE (slice 1) / REPEATABLE | Recover Existing Assets | none | Prevent duplicate code; restore stranded correctness and frontier substrate | varies by selected PR |
| W001 | DONE (2026-07-17) | Governed Playback Canonicalization | W000 ✓; PR #112 disposition | One evidence envelope/event/delta/playback spine | settlement, proof, entitlements |
| W002 | DONE (2026-07-17) | Worldline v0 | W001 ✓ | Bitemporal as-of replay and no-lookahead world diffs — landed `apps/web/lib/worldline` (13 tests; verifier FAIL→both blockers fixed, DEC-009) | data, proof |
| W-OTS | DONE slices 1+2 (2026-07-17) | Bitcoin-anchored trustless time | founder packet | Slice 1: verbatim port, LIVE calendar+python checks, migration+flag. Slice 2: fail-open mint wire (post-transaction, never a freeze failure mode) + /api/proof/ots/[slateKey] (raw .ots + ?format=json) + llms.txt discovery. Slice 3 DONE (2026-07-17): ots-upgrade.ts (reference commitment-path semantics, conservative grafting, python parses upgraded proofs) + gated /api/cron/ots-upgrade poll (Bearer CRON_SECRET, documented-not-registered). W-OTS COMPLETE end-to-end | proof, data |
| W-MCP | DONE slice 1 (2026-07-17) | Hosted Galaxy Proof MCP at /api/mcp | proof surface (live) | The packet's 7-tool contract served from the site itself (streamable-HTTP JSON-RPC, dependency-free, in-process over lib/proof — one truth path; 24 tests). Ships with the next merge, zero new infra. Follow-ups queued: vendor the stdio packet for local installs; MCP registry/directory listings (founder click) | proof, public claims |
| W-WEATHER-REC | READY (packet intake 2026-07-17) | Reconcile gse-weather-edge packet with edge-lab nfl-weather | trials registry | Two weather implementations exist (packet + edge-lab feature) — merge to ONE canonical path, stronger-of-each | data, model claims |
| W003 | BLOCKED | Reality Receipt v0 | W002 ✓ (now unblocked) | Reproducible visual/decision object | proof, public claims |
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
