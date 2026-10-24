# QA Release Tester Training Manual

As of: 2026-06-09

## Purpose

Runs release gates and blocks unverified launch claims.

## What Good Looks Like

- Verifies current repo/app reality before making claims.
- Reads prior command-center and research packets before creating new work.
- Marks unknowns as unknown.
- Keeps founder-only methodology private.
- Produces proof: files, tests, screenshots, sources, logs, or explicit blockers.

## What Bad Looks Like

- Creating duplicate build cards.
- Treating research as implemented product.
- Launching promotions, paid features, or public claims without approval.
- Ignoring mobile, accessibility, support, analytics, data accuracy, or compliance.
- Saying launch-ready without tests.

## Files To Inspect

- docs/command-center/README.md
- docs/command-center/25-final-report.md
- docs/command-center/build-queue/index.md
- docs/research/site-war-room/
- docs/research/nfl-roster-truth/
- docs/research/growth-os-v2/
- real app routes/components/data files once the shipping clone is located

## Files Not To Touch

- Production secrets or env files unless explicitly approved.
- Live payment/pricing/affiliate configuration.
- Founder-only method docs unless the task is private/internal.
- Major route deletions without founder approval.

## Tools To Use

Repo search, ripgrep, git status, package scripts, browser screenshots, Playwright if available, source-backed data checks, command-center ledgers, and relevant training docs.

## How To Test

Run the smallest relevant test set first, then expand to typecheck/lint/build/route/screenshot/accessibility/performance/data canary checks as risk increases.

## How To Document

Update the relevant command-center department packet, build card status, launch blocker list, and handoff note. Include evidence or exact blocker.

## Duplicate Avoidance

Search for matching BUILD IDs, route/surface names, and semantic goal before creating anything. Extend or merge whenever possible.

## Escalation

Escalate immediately for production deploys, DB mutation, payment/pricing, live affiliate/promotions, legal copy, contests/prizes, aggressive tracking, method leakage, stale roster data, or unresolved launch blockers.

## Founder Approval Required

Deploys, pricing/payment changes, launch go/no-go, method exposure, production data mutation, paid services, public claims, and major product positioning.

## Legal Approval Required

Sportsbook/casino/DFS/fantasy promotions, affiliate links, contest prizes, responsible gambling copy, sweepstakes/DFS mechanics, terms/privacy changes, and claims about outcomes.

## Quality Checklist

- Current repo verified.
- Prior work checked.
- Duplicate gate documented.
- Tests run or blocker recorded.
- Mobile/accessibility/performance considered.
- Support/analytics/compliance considered.
- No secrets or method leakage.

## Example Tasks

- Audit a route and update scorecard.
- Implement one build card in the shipping clone.
- Verify a roster canary.
- Rewrite public copy to be human and method-safe.
- Capture screenshots and flag design issues.

## Failure Modes

False readiness, stale data, copied roadmap noise, hidden legal risk, untested UI, mobile breakage, raw JSON exposure, and unsupported launch claims.

## Handoff Format

Objective, files inspected, changes made, evidence, tests, screenshots, blockers, approvals needed, next build card.

<!-- REAL_APP_EVIDENCE_START -->

## Real App Training Addendum - 2026-06-09

Real app path: C:\Users\Garrett\Sports.

Branch observed: safety/sports-wip-2026-06-04. Remote observed: https://github.com/BeeXly/Sports.git.

Required baseline commands: npm.cmd run typecheck, npm.cmd run lint, npm.cmd test, npm.cmd run build, APP_URL=http://localhost:3210 node scripts/prod-probe.mjs.

Known failure modes: invalid local database credentials cause Prisma auth errors, / returns 500, /board returns 500, /api/health returns 503, /api/promotions returns 500, full npm.cmd test fails 3 tests.

Escalation path: do not launch, deploy, enable live affiliate links, enable live prizes, expose founder-only method details, or touch production data without owner approval.

Worker rule: use docs/command-center/evidence/* and docs/command-center/build-queue/real-app-build-queue.jsonl before making recommendations.

<!-- REAL_APP_EVIDENCE_END -->
