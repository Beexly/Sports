# CONTEST-023: BestBall plus weekly side-quest spec

## Duplicate Gate

duplicate_check_status: NET_NEW  
matched_existing_ids: none  
relation_to_existing: Net-new contest lab work.  
reason_not_duplicate: Adds optional weekly learning tasks to keep best ball engaging without roster management.  
parent_id: none  
dependency_ids: none

## Goal

Create a safe, docs-first or fake-data-first implementation packet for BestBall plus weekly side-quest spec.

## Legal / Compliance Boundary

Legal risk: MEDIUM. Do not launch paid contests, prizes, entry fees, live leaderboards, geofenced eligibility, or user deposits without founder/legal approval.

## Implementation Plan

1. Verify the real GSE shipping clone before code.
2. Read contest-format-lab docs and matched growth-os-v2 cards.
3. Build docs/spec/mock only unless explicit implementation approval exists.
4. Use fake contest data and no real user/friend data.
5. Add clear approval gates, rollback, and unknowns.

## Acceptance Criteria

- No production code or live contest launched.
- No secrets or payment/entry flows.
- Rules, risk, and duplicate gates are explicit.
- Claude can execute the next step in the real clone.

## Claude Code Prompt

You are Claude Code in the real GSE shipping clone. Execute only CONTEST-023: BestBall plus weekly side-quest spec. Verify repo root and existing contest/community cards first. Do not launch paid contests, prizes, deposits, or live affiliate/sportsbook flows. Use fake data or docs-only specs. Preserve GSE as sports intelligence, not a sportsbook. Report files changed, tests run, approvals needed, and rollback.
