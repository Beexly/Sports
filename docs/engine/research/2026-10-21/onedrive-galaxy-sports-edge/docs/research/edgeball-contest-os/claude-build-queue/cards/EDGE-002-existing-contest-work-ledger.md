# EDGE-002: Existing contest work ledger

## Duplicate Gate

duplicate_check_status: DEPENDENCY  
matched_existing_ids: BUILD-GV2-029, BUILD-GV2-030, BUILD-GV2-031, CONTEST-003  
relation_to_existing: Required gate before downstream contest work.  
reason_not_duplicate: Required to prevent new EdgeBall cards from duplicating prior contest lab work.  
parent_id: none  
dependency_ids: BUILD-GV2-029, BUILD-GV2-030, BUILD-GV2-031, CONTEST-003

## Category

dedupe

## Goal

Create a docs-first, fake-data-first, or disabled-by-default EdgeBall artifact for Existing contest work ledger.

## Legal Boundary

Legal risk: LOW. Do not launch paid contests, prizes, deposits, payouts, live leaderboards, sportsbook/DFS affiliate flows, or real-money entries without founder/legal approval.

## Data Boundary

fake contest data only. Do not import real friend-history data without explicit consent and deletion controls.

## Implementation Plan

1. Verify the real GSE shipping clone, branch, dirty state, package manager, and existing cards.
2. Read this card plus matched IDs: BUILD-GV2-029, BUILD-GV2-030, BUILD-GV2-031, CONTEST-003.
3. Produce the smallest docs/spec/mock/fake-data implementation.
4. Preserve GSE as sports intelligence, not sportsbook.
5. Add validation for no secrets, no live prizes, no entry fees, no deposits, and no method leakage.

## Testing Plan

- JSON/schema validation if data files are added.
- Copy scan for sportsbook-like pressure.
- Feature flag disabled by default if code is ever approved.
- No live contest, prize, deposit, or affiliate link.

## Acceptance Criteria

- Duplicate gate remains intact.
- Approval gates are explicit.
- No production data or real friend data is used.
- Rollback is documented.

## Rollback Plan

Remove this card's docs/spec/mock or disable the feature flag. No billing, payments, or production data should be touched.

## Priority

P0

## Difficulty

S

## Claude Code Prompt

You are Claude Code in the real Galaxy Sports Edge / GSE shipping clone. Execute only EDGE-002: Existing contest work ledger. Verify repo root, branch, dirty state, and existing contest/community cards first. Do not duplicate prior work. Do not launch contests, prizes, deposits, payouts, paid entries, live leaderboards, or affiliate links. Use fake data unless explicit consent and approval exist. Preserve GSE as sports intelligence, not sportsbook. Report files changed, checks run, approvals needed, and rollback.
