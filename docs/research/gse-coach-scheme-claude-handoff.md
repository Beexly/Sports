# Claude Handoff: Coach and Scheme Intelligence

Generated: 2026-06-09
Repo: C:\Users\Garrett\Sports

## Objective

Build the first source-governed GSE coach/scheme intelligence layer. Do not jump straight to UI. First create verified staff data, situation-bucketed play-call aggregates, and confidence-scored scheme tendency profiles.

## Already Done

- Added shared coach/scheme contracts in packages/types/src/world-model.ts.
- Added unit tests for run/pass bias and profile validation in packages/types/src/__tests__/world-model.test.ts.
- Added research docs for current state, metrics, data model, and GitHub trend implications.

## Phase 1: Staff Source Ledger

Deliverable:

- Create a source-ledger seed file for 2026 NFL staffs with team, head coach, offensive coordinator, defensive coordinator, offensive play caller, defensive play caller, and source URL.

Requirements:

- Use ESPN Mike Clay guide as one starting source, but verify uncertain rows against NFL.com/team announcements or another primary/strong secondary source.
- Do not trust Wikipedia-only data for production.
- Include confidence and retrieved_at.
- Store alternate names/aliases.
- Mark vacant/TBD explicitly.

Acceptance:

- Every row has at least one source URL.
- Play caller confidence is separate from coordinator title.
- No unsourced scheme labels.

## Phase 2: Play-Call Aggregation

Deliverable:

- Implement an offline script/notebook that loads 2023-2025 play-by-play and outputs team-season-side play-call splits.

Minimum situations:

- ALL_NEUTRAL
- EARLY_DOWN_NEUTRAL
- THIRD_DOWN
- THIRD_AND_SHORT
- THIRD_AND_MEDIUM
- THIRD_AND_LONG
- RED_ZONE
- TRAILING
- LEADING
- TWO_MINUTE

Acceptance:

- Public-data-only transforms are reproducible.
- Run/pass splits sum within tolerance.
- Small samples return INSUFFICIENT_SAMPLE.
- Output includes source_run_id and transform_version.

## Phase 3: Coach Attribution

Deliverable:

- Join staff/playcaller episodes to team-season aggregates and generate SchemeTendencyProfile records.

Acceptance:

- Team-level aggregate exists even when coach attribution is low confidence.
- Coach profile is blocked or marked low-confidence when caller is unknown.
- New coordinators without play-calling history are labeled as projection/inference, not observed tendency.

## Phase 4: Scheme Matchup Matrix

Deliverable:

- Start with public outcome metrics: EPA/play allowed, success rate allowed, explosive rate allowed, and third-down conversion by opponent tendency bucket.
- Add charting-only placeholders for front, coverage, personnel, motion, blitz, box count, and run concept.

Acceptance:

- Public vs licensed-source fields are clearly separated.
- No charting-only metric is faked from public PBP.
- Output can answer "what is this scheme good/bad against" with sample size and confidence.

## Phase 5: Product Surfaces

Build after phases 1-4:

- Team Scheme Card
- Coach Tendency Card
- Matchup Friction Widget
- What Changed: Staff/Scheme Alert
- Optimizer Adjustment Note
- Founder-only Coach-Speak Watch

## Validation Commands

- npm.cmd run test --workspace=packages/types
- npm.cmd run typecheck --workspace=packages/types
- npm.cmd run typecheck --workspaces --if-present

## Non-Negotiables

- Source every staff claim.
- Separate observed, derived, and analyst-inferred claims.
- Keep paid-source/raw-charting data out of public surfaces until licensing is approved.
- Keep play-caller confidence separate from role title.
- Prefer boring source governance over impressive but unverifiable scheme claims.
