# Prisma Export Map

## Inspected sources

- Schema: `packages/db/prisma/schema.prisma`
- DB package: `packages/db/package.json`, `packages/db/src/index.ts`
- Generated client target: `node_modules/@prisma/client` via `packages/db` script `prisma generate`
- Root generation command: `npm run db:generate`

## Package export behavior

`@sports/db` exports its singleton `db` client and then re-exports `@prisma/client` with `export * from "@prisma/client";`. Therefore enums, model types, and Prisma namespace helpers are expected to be available from either `@prisma/client` or, where code uses it, `@sports/db`.

## Export map

| Expected symbol | Kind | Schema source | Generated client before fix | Generated client after `npm run db:generate` | `@sports/db` re-export? | Correct fix |
| --- | --- | --- | --- | --- | --- | --- |
| `CockpitComplianceStatus` | enum | `enum CockpitComplianceStatus` | missing | present | yes | regenerate client |
| `CockpitDecision` | model | `model CockpitDecision` | missing | present | yes | regenerate client |
| `CockpitRiskLevel` | enum | `enum CockpitRiskLevel` | missing | present | yes | regenerate client |
| `CockpitTask` | model | `model CockpitTask` | missing | present | yes | regenerate client |
| `CockpitTaskStatus` | enum | `enum CockpitTaskStatus` | missing | present | yes | regenerate client |
| `EnumMemoryStateFilter` | generated helper | generated from `enum MemoryState` | missing | present | yes | regenerate client |
| `InputJsonValue` | generated helper | Prisma JSON helper | missing | present | yes | regenerate client |
| `JarvisMemoryEventWhereInput` | generated helper | generated from `model JarvisMemoryEvent` | missing | present | yes | regenerate client |
| `ModelJournalEntryStatus` | enum | `enum ModelJournalEntryStatus` | missing | present | yes | regenerate client |
| `ModerationAction` | model | `model ModerationAction` | missing | present | yes | regenerate client |
| `ModerationActionKind` | enum | `enum ModerationActionKind` | missing | present | yes | regenerate client |
| `ModerationAppeal` | model | `model ModerationAppeal` | missing | present | yes | regenerate client |
| `ModerationAppealStatus` | enum | `enum ModerationAppealStatus` | missing | present | yes | regenerate client |
| `ModerationReasonCode` | enum | `enum ModerationReasonCode` | missing | present | yes | regenerate client |
| `ModerationReport` | model | `model ModerationReport` | missing | present | yes | regenerate client |
| `ModerationReportStatus` | enum | `enum ModerationReportStatus` | missing | present | yes | regenerate client |
| `OddsMarket` | enum | `enum OddsMarket` | missing | present | yes | regenerate client |
| `OperatorAgent` | enum | `enum OperatorAgent` | missing | present | yes | regenerate client |
| `PickSelect` | generated helper | generated from `model Pick` | missing | present | yes | regenerate client |
| `PickGetPayload` | generated helper | generated from `model Pick` | missing | present | yes | regenerate client |
| `Prisma.validator` | generated helper | Prisma namespace API | missing | present | yes | regenerate client |
| `Prisma.JsonNull` | generated helper/value | Prisma namespace API | missing | present | yes | regenerate client |
| `Prisma.PrismaClientKnownRequestError` | generated class | Prisma namespace API | missing | present | yes | regenerate client |
| `Promotion` | model | `model Promotion` | missing | present | yes | regenerate client |
| `PromotionComplianceStatus` | enum | `enum PromotionComplianceStatus` | missing | present | yes | regenerate client |
| `PromotionStatus` | enum | `enum PromotionStatus` | missing | present | yes | regenerate client |

## Conclusion

The schema is the source of truth. The missing exports were not stale imports or missing models; they were generated-client drift. No migrations or schema changes were needed.
