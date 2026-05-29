# Galaxy 2026 Current Operating Plan

Status: ACTIVE
Date: 2026-05-28
Branch: claude/determined-keller-dUcdG
Commit: 9e4e47d975963b50d8185e26d9eca1f485f5a4df

## Mission
Galaxy Sports Edge is being pushed toward best overall website of 2026, not merely a sports product. The product must become a trust-first, intelligence-rich, emotionally aware decision system that rejects sportsbook hype, generic SaaS dashboards, shallow media pages, and AI slop.

## Current Verified State
- Repo path: C:/Users/Garrett/OneDrive/Documents/Galaxy Sports Edge
- Branch: claude/determined-keller-dUcdG
- Commit: 9e4e47d975963b50d8185e26d9eca1f485f5a4df
- Reported Claude commit ca7241d: NOT VERIFIED in this checkout
- Route/system file count: 31 (11 pages, 18 APIs, 2 system routes)
- Test file count: 19
- Dirty state at plan lock: yes

## Golden Path
1. Homepage
2. Today's Board
3. Decision Room
4. Evidence/Trust
5. Coach
6. No-Bet/Parlay MRI
7. Autopsy
8. Command Center
9. Academy
10. Report
11. Demo

## Seven Product Standards
- Worldview: Every surface must express Galaxy as restraint, transparent reasoning, and decision intelligence rather than betting hype.
- Living Data: Freshness, source context, demo/live/historical/user-entered state, and stale/degraded behavior must be visible.
- Signature Interactions: Core interactions should feel ownable by Galaxy, not generic cards, dashboards, or sportsbook patterns.
- Introspection as Content: Losses, passes, what changed, what to ignore, and what could be wrong are product content, not footnotes.
- Continuous Voice: Copy must remain disciplined across public, demo, member, empty, error, and degraded states.
- Narrative Arc: A user should move from chaos to clarity to restraint or action to learning without dead ends.
- Performance as Design: Speed, mobile readability, accessible focus, stable layout, and low cognitive load are part of the brand.

## Hard Constraints
- Do not publish
- Do not deploy
- Do not enable live AI
- Do not enable payments
- Do not enable public picks
- Do not approve Prisma ADRs
- Do not run destructive migrations
- Do not spend money
- Do not expose secrets
- Do not weaken trust gates
- Do not move confidential methodology client-side
- Do not merge to main
- Do not remove existing work
- Do not fake live data
- Do not use certainty, tout, casino, or loss-chasing language

## Agent Roles
- Codex: truth, audit, release safety, safe patches, verdicts, owner firewall, validation, and autonomous requeueing.
- Claude: ambitious product integration, missing surfaces, premium UX, signature interactions, runtime states, and builder repairs.
- Owner: irreversible authority gates only.
- Repo: source of truth; local-only work does not count for coordination.

## Owner Gates
- repo private confirmation
- environment variables
- preview URL
- Prisma ADRs 003-007
- launch mode / release state flips
- COACH_LIVE_AI_ENABLED
- STRIPE_CHECKOUT_ENABLED
- PUBLIC_PICKS_ENABLED
- data rights approvals
- production launch approval

## Validation Commands
- npm.cmd run typecheck:web
- npm.cmd run test:web
- npm.cmd run build:web
- npm.cmd run validate:monetization
- npm.cmd run audit:launch
- npm.cmd run check:env

## Autonomous Loop
SYNC -> AUDIT -> CLASSIFY -> IMAGINE -> PATCH -> DELEGATE -> VERIFY -> SIMULATE -> STRESS -> SCORE -> REQUEUE

## Verdict Rules
- SAFE TO CONTINUE BUILDING defaults to yes unless safety blocks further work.
- SAFE TO MERGE defaults to no until state, validation, and gap matrix allow it.
- SAFE TO DEPLOY PREVIEW defaults to no until local release gates and owner preview inputs are ready.
- SAFE TO PUBLIC LAUNCH defaults to no until preview, owner, data, privacy, rollback, monitoring, and public/private boundary evidence all pass.
- SAFE TO ENABLE PAYMENTS, LIVE AI, or PUBLIC PICKS defaults to no until explicit owner approval and system-specific readiness gates pass.

## Supersession Rule
This plan supersedes conflicting local release-control instructions. Older docs remain evidence/reference unless PLAN_ALIGNMENT_AUDIT marks them ACTIVE or MERGED.

## Current Queue
- Q-001: Codex - Lock release-control docs and reports [now]
- Q-002: Claude - Repair missing golden-path surfaces after reading NEXT_CLAUDE_PROMPT_2026-05-28.md [next]
- Q-003: Owner - Provide preview URL, repo privacy confirmation, env vars, and approval decisions only when ready [owner-gated]
- Q-004: Codex - Re-audit after Claude builder repairs or remote state changes [next]
