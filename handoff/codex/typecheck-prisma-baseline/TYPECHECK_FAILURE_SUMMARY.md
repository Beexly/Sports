# Typecheck / Prisma Baseline Failure Summary

## Command

`npm run typecheck`

## Initial exit code

`2`

Raw output is captured in `handoff/codex/typecheck-prisma-baseline/TYPECHECK_FAILURE_RAW.log`.

## Root cause

The TypeScript baseline was failing because the local generated Prisma client in `node_modules/@prisma/client` was stale relative to `packages/db/prisma/schema.prisma`.

The missing symbols all exist in the schema as Prisma models, enums, or generated helper types, but they were not present in the generated client until the repo's existing generation command was run:

`npm run db:generate`

After regeneration, `npm run typecheck` exited `0`.

## Missing Prisma exports observed before generation

| Symbol | Kind | Exists in schema? | Importing files in failure log | Diagnosis |
| --- | --- | --- | --- | --- |
| `CockpitComplianceStatus` | enum | yes | `apps/web/app/api/cockpit/tasks/route.ts` | stale generated client |
| `CockpitDecision` | model | yes | `apps/web/lib/cockpit/transitions.ts` | stale generated client |
| `CockpitRiskLevel` | enum | yes | `apps/web/app/api/cockpit/tasks/route.ts`, `apps/web/lib/cockpit/intelligence.ts` | stale generated client |
| `CockpitTask` | model | yes | `apps/web/lib/cockpit/transitions.ts` | stale generated client |
| `CockpitTaskStatus` | enum | yes | `apps/web/__tests__/cockpit-transitions.test.ts`, `apps/web/app/api/cockpit/tasks/[id]/route.ts`, `apps/web/app/api/cockpit/tasks/route.ts`, `apps/web/app/cockpit/tasks/page.tsx`, `apps/web/lib/cockpit/intelligence.ts`, `apps/web/lib/cockpit/transitions.ts` | stale generated client |
| `EnumMemoryStateFilter` | generated helper | yes, generated from `MemoryState` enum | `apps/web/lib/jarvis/memory/actions.ts` | stale generated client |
| `InputJsonValue` | generated helper | yes, Prisma helper | `apps/web/app/api/cockpit/studio/generate/route.ts`, `apps/web/lib/cockpit/transitions.ts`, `apps/web/lib/jarvis/memory/actions.ts` | stale generated client |
| `JarvisMemoryEventWhereInput` | generated helper | yes, generated from `JarvisMemoryEvent` model | `apps/web/lib/jarvis/memory/actions.ts` | stale generated client |
| `ModelJournalEntryStatus` | enum | yes | `apps/web/lib/journal/load.ts` through `@sports/db` re-export | stale generated client |
| `ModerationAction` | model | yes | `apps/web/lib/community/moderation-actions.ts` | stale generated client |
| `ModerationActionKind` | enum | yes | `apps/web/__tests__/moderation-tooling.test.ts`, `apps/web/app/cockpit/moderation/page.tsx`, `apps/web/lib/community/moderation-actions.ts`, `apps/web/lib/community/moderation.ts` | stale generated client |
| `ModerationAppeal` | model | yes | `apps/web/lib/community/moderation-actions.ts` | stale generated client |
| `ModerationAppealStatus` | enum | yes | `apps/web/app/cockpit/moderation/page.tsx`, `apps/web/lib/community/moderation-actions.ts` | stale generated client |
| `ModerationReasonCode` | enum | yes | `apps/web/__tests__/moderation-tooling.test.ts`, `apps/web/app/cockpit/moderation/page.tsx`, `apps/web/lib/community/moderation-actions.ts`, `apps/web/lib/community/moderation.ts` | stale generated client |
| `ModerationReport` | model | yes | `apps/web/lib/community/moderation-actions.ts` | stale generated client |
| `ModerationReportStatus` | enum | yes | `apps/web/app/cockpit/moderation/page.tsx`, `apps/web/lib/community/moderation-actions.ts` | stale generated client |
| `OddsMarket` | enum | yes | `packages/data-ingestion/src/context-enrichment.ts` plus workspace-relative duplicate paths in the raw log | stale generated client |
| `OperatorAgent` | enum | yes | `apps/web/app/api/cockpit/tasks/route.ts`, `apps/web/lib/cockpit/agents.ts`, `apps/web/lib/cockpit/intelligence.ts` | stale generated client |
| `PickSelect`, `PickGetPayload` | generated helpers | yes, generated from `Pick` model | `apps/web/lib/correlation/load-settled-picks.ts` | stale generated client |
| `Prisma.validator`, `Prisma.JsonNull`, `Prisma.PrismaClientKnownRequestError` | Prisma namespace helpers/classes | yes, Prisma-generated API | `apps/web/lib/correlation/load-settled-picks.ts`, `apps/web/lib/cockpit/transitions.ts`, `apps/web/lib/community/moderation-actions.ts`, `apps/web/lib/jarvis/ledgers.ts`, `apps/web/lib/jarvis/memory/actions.ts` | stale generated client |
| `Promotion` | model | yes | `apps/web/__tests__/promotions-guards.test.ts`, `apps/web/__tests__/promotions-public-payload.test.ts`, `apps/web/app/cockpit/promotions/page.tsx`, `apps/web/lib/promotions/guards.ts`, `apps/web/lib/promotions/public-payload.ts` | stale generated client |
| `PromotionComplianceStatus` | enum | yes | `apps/web/lib/promotions/guards.ts` | stale generated client |
| `PromotionStatus` | enum | yes | `apps/web/lib/promotions/guards.ts` | stale generated client |

## Resolution

No schema edits, import deletions, global TypeScript suppressions, or fake `any` types were required. The smallest safe fix was to regenerate the Prisma client with the repository's existing script.

