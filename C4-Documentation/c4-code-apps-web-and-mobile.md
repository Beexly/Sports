# C4 Code Level: `apps/web` & `apps/mobile` (Web Storefront, Mobile iOS Client & Guardrails)

## Overview

- **Name**: GSE Web Storefront (`Next.js 14`), Native iOS Client (`Expo SDK 57 / React Native 0.86`), and Public Copy Trust Gate
- **Description**: Customer-facing web application (`apps/web`), bearer-authenticated mobile API (`apps/web/app/api/mobile/v1/*`), native iOS client (`apps/mobile`), and pre-deploy guardrails (`scripts/trust-gate.mjs`, `apps/mobile/scripts/lint-rules.js`, `scripts/guardrails/connected-workflow-dossier-guard.py`).
- **Location**: [`apps/web/`](file:///C:/Users/Garrett/Sports/apps/web), [`apps/mobile/`](file:///C:/Users/Garrett/Sports/apps/mobile), and [`scripts/trust-gate.mjs`](file:///C:/Users/Garrett/Sports/scripts/trust-gate.mjs)
- **Language**: TypeScript 5.x, React 18.3 (`apps/web`), React 19.2.3 / React Native 0.86.3 (`apps/mobile`)
- **Purpose**: Delivers natural football-film & matchup analysis to users while enforcing paywall redaction on the server, `72/100` confidence formatting, and zero internal math-jargon leakage.

## Code Elements

### Functions/Methods

- `getEngineLiveBridgeSnapshot(): Promise<EngineLiveSnapshot>`
  - Description: Reads verified Stage 0..5 call-sheet dossiers and serves redacted public environment analytics or authenticated premium pick/prop/DFS cards.
  - Location: [`apps/web/lib/engine/engine-live-bridge.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/engine/engine-live-bridge.ts)
  - Dependencies: `data/dossiers/`, `packages/prediction-engine`

- `filterTrustworthyPicks(rows: MobilePickRow[]): MobilePickRow[]`
  - Description: Client-side defensive mirror of `adverse-edge-suppression` and stale-pick policy (`apps/mobile/src/lib/trust.ts`); may only remove rows, never add them.
  - Location: [`apps/mobile/src/lib/trust.ts`](file:///C:/Users/Garrett/Sports/apps/mobile/src/lib/trust.ts)
  - Dependencies: [`apps/mobile/src/lib/entitlements.ts`](file:///C:/Users/Garrett/Sports/apps/mobile/src/lib/entitlements.ts)

## Dependencies

### Internal Dependencies
- [`packages/prediction-engine`](file:///C:/Users/Garrett/Sports/packages/prediction-engine)
- [`scripts/trust-gate.mjs`](file:///C:/Users/Garrett/Sports/scripts/trust-gate.mjs)

### External Dependencies
- `next`, `react`, `expo`, `@sentry/nextjs`, `stripe`, `@neondatabase/serverless`
