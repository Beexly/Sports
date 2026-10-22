# BUILD-GV2-096: Future risk early-warning dashboard

## Duplicate Gate

duplicate_check_status: NET_NEW  
matched_existing_ids: none  
relation_to_existing: Distinct GSE-specific value not present in existing ledger.  
reason_not_duplicate: Forecast risk register is new and cross-functional.  
parent_id: none  
supersedes_id: none  
dependency_ids: none  
merge_notes: none

## Category

risk / compliance

## Goal

Build or specify future risk early-warning dashboard for Galaxy Sports Edge / GSN without changing production systems first.

## Why It Matters

This improves revenue, retention, support, trust, engagement, financial clarity, customer value, or founder leverage while respecting existing build work.

## Current Repo Context

Likely files/routes/components/data models: docs/research/growth-os-v2, real app clone TBD.  
What already exists: no matching existing build found in the ledger.  
What is missing: the specific GSE layer described by this card.  
Files to avoid: production env files, Stripe/billing code, live affiliate links, founder-only methodology, unrelated app files.

## Product Surface

none

## Internal Surface

founder/risk

## Customer Value

Users get clearer, safer, more useful sports intelligence with less confusion and more trust.

## Business Value

Supports revenue quality, retention, brand trust, operational leverage, and sharper prioritization.

## Legal / Compliance Boundary

Legal risk: MEDIUM. Brand risk: LOW. Do not imply GSE is a sportsbook. Do not create live promotions, affiliate links, billing changes, or public AI advice without explicit approval.

## Data / Analytics Needed

Events: none. Keep identifiers privacy-safe and avoid unnecessary sensitive data.

## Copy / Brand Voice Needed

Plain human copy, no fake certainty, no pressure, no method leakage, no irresponsible gambling language, and clear disclosure where required.

## Implementation Plan

1. Verify the real GSE shipping clone, branch, dirty state, package manager, and existing patterns.
2. Read existing matching builds: none.
3. Implement a docs-first, fake-data, or disabled-by-default version.
4. Add tests or validation for event shape, copy safety, privacy, and rollback.
5. Document required env vars by name only if any.
6. Stop before production data, public launch, live affiliate links, billing, or deploy.

## Testing Plan

- Validate no duplicate card is created.
- Validate feature is disabled or fake-data-only.
- Validate no secrets or live links appear.
- Run relevant repo checks in the real clone.

## Acceptance Criteria

- Duplicate gate fields are preserved.
- Existing parent/extension relationship is documented.
- No production data or secrets are used.
- Rollback is clear.
- Approval gates are explicit.

## Rollback Plan

Remove only this build's docs, feature flag, route/component, or fake-data fixture. Leave unrelated files untouched.

## Priority

P1

## Difficulty

M

## Dependencies

none

## Risks

Legal: MEDIUM. Brand: LOW. Technical: MEDIUM. Support burden: LOW.

## Claude Code Prompt

You are Claude Code working in the real Galaxy Sports Edge / GSE shipping clone. Execute only BUILD-GV2-096: Future risk early-warning dashboard. Start by verifying repo root, branch, dirty state, package manager, scripts, and existing patterns. Read the growth-os-v2 card and any matched existing IDs: none. Do not duplicate prior work. Do not use production data or secrets. Do not create live affiliate links. Do not deploy. Build the smallest safe docs-first, fake-data, or disabled-by-default implementation; add tests or validation; document approval gates; report files changed, checks run, and rollback instructions.
