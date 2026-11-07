# C4 Code Level: `packages/mcp-equations-server` & `packages/prediction-engine` (`21,419`-Equation Cognitive Router & 80-Rule Firewall)

## Overview

- **Name**: `21,419`-Equation Cognitive Router, 80-Rule Misleading-Stat Firewall & Class B Conjunction Gate
- **Description**: TypeScript packages implementing the 4-Stage Cognitive Equation Router (`288-bit` context mask $\to$ Spectral Cluster Orthogonalization $\to$ Cross-Equation Jacobian Coupling & Positive-Part James-Stein Shrinkage capped at $|\Delta\text{log-odds}| \le 0.35$), the 80-Rule Situational Firewall, Romano/Barber Conformal Calibration, and the Class B Market De-Vig Conjunction Gate.
- **Location**: [`packages/mcp-equations-server/src/`](file:///C:/Users/Garrett/Sports/packages/mcp-equations-server/src) and [`packages/prediction-engine/src/nfl/`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl)
- **Language**: TypeScript 5.x (Node.js)
- **Purpose**: Governs mathematical priors (`Stage 2`), conformal interval calibration (`Stage 4`), and final `PASS`/publish gating (`Stage 5`).

## Code Elements

### Functions/Methods

- `buildContextMask(context: SituationalContext): BigInt`
  - Description: Encodes game state and situational triggers into a 288-bit bitmask to select active equations from the `21,419`-equation registry.
  - Location: [`packages/mcp-equations-server/src/mcp-cognitive-router.ts`](file:///C:/Users/Garrett/Sports/packages/mcp-equations-server/src/mcp-cognitive-router.ts)
  - Dependencies: `packages/mcp-equations-server/src/registry/`

- `aggregateSituationalReasoning(input: MasterSituationalInput): SituationalOverlayOutput`
  - Description: Evaluates all 6 situational families (`pressure`, `weather`, `restFatigue`, `coveragePersonnel`, `qbSkillScript`, `marketMicrostructure`) and applies the 80-Rule Misleading-Stat Firewall.
  - Location: [`packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/master-situational-reasoning-aggregator.ts)
  - Dependencies: [`x-situational-80-rules.ts`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/x-situational-80-rules.ts)

- `signCallSheetTickets(candidates: CandidateTicket[], marketLines: MarketLine[]): SignedTicket[]`
  - Description: Compares post-simulation, conformal-calibrated probabilities against live de-vigged market lines and marks any sub-threshold edge as `PASS` (`publishAllowed: false`).
  - Location: [`packages/prediction-engine/src/nfl/calibration-map.ts`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/calibration-map.ts)
  - Dependencies: [`no-bet-gate.ts`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/no-bet-gate.ts), [`sgp-copula.ts`](file:///C:/Users/Garrett/Sports/packages/prediction-engine/src/nfl/sgp-copula.ts)

## Dependencies

### Internal Dependencies
- `data/calibration/market_calibration_heads_2026.json`

### External Dependencies
- `@modelcontextprotocol/sdk`, `zod`
