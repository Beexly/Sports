# BUILD-CMD-074: Player Risk Passport concept packet

## Classification

launch_blocker: no
must_have: no
must_fix: no
post_launch: yes
creative_moat: yes
risk_reduction: no

## Duplicate Gate

duplicate_check_status: EXTENSION
matched_existing_ids: BUILD-SITE-039
relation_to_existing: Command-center consolidation or execution packet, not a renamed duplicate.
reason_not_duplicate: This card turns prior research/build cards into launch ownership, evidence, and verification work across departments.
parent_id: BUILD-SITE-039
supersedes_id:
dependency_ids: BUILD-SITE-039
merge_notes: Reference and extend prior cards; do not recreate their lower-level implementation details.

## Department Owner

Primary: Executive / Founder Command
Supporting: QA / Testing / Release; Operations / Founder Cockpit
Worker/agent: creative/moat opportunity

## Goal

Player-level risk/freshness/status profile.

## Why It Matters

This protects launch quality, trust, revenue, retention, support readiness, compliance, or founder leverage.

## Evidence

Visible workspace contains docs/research and generated packets, but the runnable app source is not visible here. Prior matching items: BUILD-SITE-039.

## Current Problem

The work is planned or researched but not proven implemented in the real shipping clone. Unknowns must stay gray/red until verified.

## Product Surface

creative/moat opportunity; likely affects public website, GSE Rating, Player Lab, pricing, support, data, or founder cockpit depending on implementation.

## Internal Surface

Command center, launch dashboard, QA evidence archive, department packet, and Claude final handoff.

## Customer Value

Users get clearer, safer, faster, more trustworthy product experiences.

## Business Value

Improves launch confidence, conversion, retention, support efficiency, revenue clarity, and defensibility.

## Implementation Plan

1. Verify real repo root, branch, dirty state, package manager, app routes, and relevant files.
2. Read all matched existing cards/docs before editing.
3. Confirm duplicate status and parent dependencies.
4. Implement the smallest route/component/data/tooling change that satisfies this card.
5. Add or update tests/checks relevant to the surface.
6. Capture evidence: command output, screenshots if UI, source links if data.
7. Update command-center status with proof or blocker.

## Acceptance Criteria

- Existing work is referenced, not duplicated.
- Required route/data/tooling behavior is implemented or blocker is documented.
- Tests/checks pass or failures are recorded with exact cause.
- No production deploy, live affiliate link, production DB mutation, or method leakage occurs.

## Test Plan

Typecheck, lint, build, unit/integration tests, route probe, data canary check, screenshot QA, mobile viewport, accessibility, performance, method leakage scan, promotion live-link scan as applicable.

## Rollback Plan

Revert only files changed for this card; disable feature flag if present; restore previous copy/component; keep evidence log.

## Priority

P2

## Difficulty

M

## Risks

Legal: MEDIUM; Brand: MEDIUM; Data: MEDIUM; Technical: MEDIUM; Support: MEDIUM; Financial: MEDIUM; Maintenance: MEDIUM.

## Claude Handoff Notes

Claude must verify Codex claims in the real app clone, inspect pages visually, run tests, preserve reveal-less methodology, and avoid deploys without approval.

## Claude Code Prompt

You are Claude Code in the real Galaxy Sports Edge / GSN shipping clone. Execute only BUILD-CMD-074: Player Risk Passport concept packet. First verify repo root, branch, dirty state, package manager, scripts, route files, and prior related build cards (BUILD-SITE-039). Do not deploy, mutate production DB, add live affiliate links, expose founder methodology, or fake readiness. Implement the smallest safe change, run relevant tests/checks, capture evidence, and report blockers clearly.
