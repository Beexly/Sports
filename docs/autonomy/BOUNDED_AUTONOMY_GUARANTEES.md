# Bounded Autonomy Guarantees

*How `@sports/autonomy` (and the runtime's `operating-plan.ts`) let the organism run itself within
structurally-enforced authority — the machine has a metabolism; the owner is the only conscience that can
spend, publish, or touch an account.*

## The Authority Charter

`AUTHORITY_CHARTER: Record<AutonomousActionType, AuthorityLevel>` is the single source of truth.

| Action | Authority |
|---|---|
| OBSERVE, INGEST_FREE, CLASSIFY, COMPILE_CARD, RUN_AUTOPSY | **SELF** (safe, reversible, no spend) |
| PROPOSE_PAID_SOURCE, SHIP_SHADOW_CARD | **CLAUDE_REVIEW** |
| PUBLISH_CARD, SPEND, ROSTER_WRITE, FLIP_GATE | **OWNER_GATE** |

## The four guarantees (tested)

1. **Propose-only by construction.** Every `AutonomousAction.status` is the literal `"PROPOSED"`. An
   executed publish/spend/roster/gate-flip is *un-constructible* inside the package — the discovery-engine
   `DiscoveryProposalStatus = "PROPOSED"` trick, generalized.
2. **Runtime backstop.** `assertBoundedAutonomy(plan)` throws if any action isn't PROPOSED, if an
   action's authority doesn't match the charter, or if an owner-gated action is marked SELF — mirroring
   `assertAllProposed`.
3. **Charter conformance.** `checkCharterConformance()` asserts the charter can never drift out of line
   with the worker/authority audit: owner-gated actions stay OWNER_GATE; only safe actions are SELF.
4. **Gate + clearance respected.** The cycle won't even *propose* PUBLISH unless `canPublishContent` is
   on; any SPEND is owner-gated and carries a `--plan` cost preview (never a purchase); a clearance-denied
   extraction is recorded BLOCKED, not proposed.

## Real worker reality (not aspirational)

The substrate audit confirmed the real mechanism is **`setInterval` + Vercel cron + propose-only
workers**, not BullMQ (CLAUDE.md's BullMQ note is aspirational). `runAutonomousCycle` proposes a
`nextCadenceMinutes`; the existing cron/worker executes — this package never schedules or runs anything.

## What is NOT done

- The plan is not yet wired to the real `enqueueSafeAgentTask` state machine in `apps/web` (that is an
  app-layer integration, Phase 2). This package is pure and references the charter shape only.

## Tests

`npx vitest run packages/autonomy` → K–P (6 tests). Plus the runtime's Field 001 proves the propose-only
plan + `assertBoundedAutonomy` end to end.
