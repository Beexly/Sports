# Plan: Mandatory GSE Engine Gate & Roster/Signal Enforcement Audit

## Objectives
1. Audit and strengthen the engine gate (`frontier/sports/engine_gate.py`) to run EVERY candidate through:
   - Real GSE Signal Registry (`packages/ingestion-pipeline/src/signal-registry-definitions.ts`, `signal-registry-extensions.ts`)
   - Real mathematical engines (`packages/prediction-engine`)
   - Real equations (Wilson score LCB, Bayesian robust Kelly, Copula tail dependence, Higham nearest-PSD repair, Poisson/CQR, EPA/SVI)
2. Complete end-to-end integration proving the math, equations, and signal provenance fail-closed.
3. Re-verify tonight's DET @ CAR SNF board and provide an unflinching, verifiable audit report with live feed provenance stamps.
4. Run independent verification tests across all components.

## Execution Phases
- **Phase 0: Survey & Scope Mapping**
  - Dispatch 3 parallel Explorers:
    - Explorer 1: Engine Gate (`frontier/sports/engine_gate.py`, `intelligence/roster/live_roster_gate.py`, test files, CI bypass guards)
    - Explorer 2: Signal Registry (`packages/ingestion-pipeline/src/signal-registry-*.ts`) & Prediction Engine math contracts (`packages/prediction-engine/`)
    - Explorer 3: DET @ CAR SNF board, live feeds, existing pick files, and retired scripts
  - Synthesize reports into `PROJECT.md` (Architecture, Feature Inventory, Milestones, Interface Contracts, Code Layout).
- **Phase 1: Implementation & Integration**
  - Milestone 1: Engine Gate Signal Registry & Prediction Engine Math Integration
  - Milestone 2: Mathematical Equations & Copula/LCB/Kelly Verification
  - Milestone 3: DET @ CAR SNF Board Live Re-verification & Audit Report
- **Phase 2: Independent Verification & Audit**
  - Milestone 4: Full Test Suite, Reviewers, Challengers, and Forensic Auditor verification.
- **Phase 3: Final Delivery & Reporting**
  - Compile final audit report, update state files, handoff to parent.
