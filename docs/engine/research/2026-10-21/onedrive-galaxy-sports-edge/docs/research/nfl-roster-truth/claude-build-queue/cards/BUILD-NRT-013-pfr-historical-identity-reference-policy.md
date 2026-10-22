# BUILD-NRT-013: PFR historical identity reference policy

## Duplicate Gate

duplicate_check_status: EXTENSION  
matched_existing_ids: BUILD-GV2-081  
relation_to_existing: Extends existing source freshness/player surface/data quality work with roster-specific truth rules.  
reason_not_duplicate: PFR historical identity reference policy adds NFL roster/person evidence, reconciliation, validation, or remediation that existing generic cards do not define.  
parent_id: BUILD-GV2-081  
supersedes_id:   
dependency_ids:   
merge_notes: Keep in the NFL roster truth namespace; link back to existing generic source/freshness cards instead of recreating them.

## Goal

PFR historical identity reference policy for the NFL roster truth system.

## Why It Matters

Roster facts are trust infrastructure. Wrong team, number, status, or staff role corrupts Player Lab, GSE Rating, search, content, customer trust, and internal decisions.

## Current Problem

The visible workspace is a docs/control lane, not a full app checkout. Existing cards define generic freshness, data source QA, and player surfaces, but not fact-level NFL roster evidence, conflict handling, staff rules, or deploy gates.

## Source Proof Needed

- SRC-010

## Product Surface

- player pages

## Internal Surface

- founder roster accuracy cockpit
- data quality reports

## Data Model

- ExternalPersonId
- Alias

## Ingestion Plan

Use read-only source adapters or fixture-based probes first. Store raw source snapshots with timestamp, URL, hash, parsed record count, parser version, and evidence IDs. Do not mutate production data.

## Reconciliation Plan

Compare official, open-data, and fallback records fact-by-fact. Official current evidence wins unless stale or contradicted by newer official transaction evidence. Conflicts create ConflictRecord entries instead of silent overwrites.

## Validation Plan

Run roster:audit, roster:verify, roster:conflicts, roster:stale, and test:roster once implemented. Until then, validate with source inventory, fixtures, and generated JSONL/card checks.

## Public/Private Boundary

Public surfaces can show current fact, qualified status, and last verified timestamp. Founder/admin surfaces can show source weights, conflicts, parser errors, and raw evidence links. Do not expose proprietary reconciliation logic.

## Legal / TOS Boundary

Use official/public sources only after terms and robots review. Do not scrape private, paywalled, login-gated, prohibited, or high-volume sources. Media/fantasy sources are fallback/corroboration unless legal approval upgrades them.

## Repo Context

Likely files: real shipping clone paths unknown in this workspace, docs/research/nfl-roster-truth.  
Files to avoid: production DB migrations, deployment config, secrets, live cron jobs, and any source requiring credentials.

## Implementation Plan

1. Verify real repo root, branch, dirty state, package manager, and existing app files.
2. Read this card plus matched existing IDs.
3. Add the smallest docs-first, type-only, or disabled-by-default implementation.
4. Use fixtures or low-volume legal probes only.
5. Add validation/tests and rollback notes.
6. Report exact changed files and unresolved approvals.

## Acceptance Criteria

- Duplicate gate is honored.
- Every roster fact touched by the build has source evidence design.
- Conflicts are visible internally.
- Stale/unknown facts do not render as confirmed.
- No production database mutation or deploy occurs.

## Test Plan

Unit: normalization and scoring rules.  
Integration: adapter fixtures and reconciliation.  
Data validation: stale/conflict/no-mock checks.  
Regression: Najee Harris and Rico Dowdle smoke tests compare rendered facts against current source evidence fixtures, not hardcoded replacement teams.

## Rollback Plan

Remove new disabled script/types/docs, delete generated fixtures, and leave existing production data untouched. For later DB work, roll back through migration rollback and snapshot restore only after backup verification.

## Priority

P2

## Difficulty

S

## Risks

Legal risk: MEDIUM. Source risk: MEDIUM. Maintenance risk: MEDIUM. Primary trust risk is making a stale or conflicted fact look confirmed.

## Claude Code Prompt

You are Claude Code working in the real Galaxy Sports Edge / GSN shipping clone. Execute only BUILD-NRT-013: PFR historical identity reference policy. First verify repo root, branch, dirty state, package manager, scripts, and existing patterns. Read docs/research/nfl-roster-truth plus matched existing IDs: BUILD-GV2-081. Do not use production data or secrets. Do not deploy. Do not scrape prohibited, paywalled, login-gated, or high-volume sources. Build the smallest safe docs-first, fixture-backed, type-only, or disabled-by-default implementation. Every public roster fact must have evidence, freshness, conflict handling, and rollback. Run relevant checks and report exact files changed, tests run, approvals needed, and unknowns.
