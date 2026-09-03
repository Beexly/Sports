# @sports/types

**Shared TypeScript Types** — common type definitions and interfaces used across GSE packages.

## Overview

Centralized type library providing:
- **Domain models** (Game, Pick, Odds, Settlement)
- **API contracts** (request/response shapes)
- **Utility types** (branded types, discriminated unions)
- **Constant enums** (LeagueCode, PickStatus, BetType)

## Usage

```typescript
import type { Pick, GameWithOdds, LeagueCode } from "@sports/types";

function processPick(pick: Pick, league: LeagueCode) {
  // ...
}
```

## Design

- **Zero runtime** — pure type-level declarations (no emitted JS)
- **Strict nullability** — all optionals explicit
- **Branded types** for IDs (`PickID`, `GameID`) to prevent mixing

## Related

Packages depending on `@sports/types`:
- `@sports/db` (Prisma models extend these)
- `@sports/prediction-engine`
- `@sports/data-ingestion`
- `apps/web` (API + UI)

---

**Monorepo**: `packages/types` — imported via workspace `@sports/types`