# Infrastructure / DevOps / Security

As of: 2026-06-09

## Mission

Owns CI, deployment gates, secrets, auth/admin controls, rollback, and security posture.

## Why It Matters

This department owns a launch-critical layer of trust, revenue, product clarity, execution speed, or risk reduction.

## Current State

Research and build packets exist. Implementation in the live shipping app is unknown from this workspace unless otherwise stated.

## What Exists

- Prior docs under docs/research.
- Command-center ledgers and scorecards.
- Master build queue references: BUILD-CMD-048, BUILD-CMD-049, BUILD-CMD-050.

## What Is Missing

- Real shipping-clone verification.
- Current route screenshots where UI is involved.
- Passing test/build evidence where code is involved.
- Clear owner update after implementation.

## Launch Blockers

Anything red in launch-readiness scorecards, unverified P0 data, missing tests, compliance blockers, or unapproved public claims.

## Must-Haves

- Owner named.
- Launch status updated.
- Evidence attached.
- Build cards deduplicated.

## Must-Fixes

- Red blockers tied to this department.
- Unknowns that affect launch claims.
- Any customer-trust issue.

## Post-Launch Opportunities

Use discovery inventory and master queue for growth, automation, monetization, and moat work.

## Owned Routes / Files / Docs

See department-map.csv, product-surface scorecard, and build queue card evidence.

## Owned Metrics

Readiness score, blocker count, test evidence, customer impact, revenue/trust/support metrics relevant to the department.

## Owned Build Cards

BUILD-CMD-048, BUILD-CMD-049, BUILD-CMD-050

## Worker Roles

Department lead, implementation worker, QA reviewer, support/compliance reviewer as applicable.

## Daily Workflow

1. Review blockers.
2. Pick the highest-priority deduped card.
3. Verify current repo/source state.
4. Execute or document blocker.
5. Update command center.

## Weekly Workflow

Score readiness, review metrics, merge/supersede duplicate work, escalate approvals, and choose next build cards.

## Quality Standard

No fake readiness. Evidence first. Customer trust above speed. Founder-only methodology protected.

## Definition Of Ready

The build has an owner, source files, duplicate gate, approval gate, test plan, rollback plan, and acceptance criteria.

## Definition Of Done

The change is implemented or explicitly blocked, tested, documented, screenshot/source verified if relevant, and reflected in the command center.

## Escalation Rules

Escalate legal/compliance, deploy, production data, payments, live affiliate, method leakage, or P0 data accuracy problems immediately.

## Dependencies

Shipping clone access, product route/source verification, QA evidence, support/compliance review, and founder decisions.

## Tools Needed

Repo search, test scripts, browser/screenshot tooling, source checks, spreadsheets/ledgers, and command-center queue.

## Training Needed

Read this department packet, relevant training manual, duplicate rules, launch blocker triage, and Claude handoff standard.

## Blind Spots

Unknown implementation state in the visible workspace, stale docs, unverified route behavior, and hidden production config.

## First 10 Actions

1. Read command-center README.
2. Read this department packet.
3. Review owned build cards.
4. Review launch blockers.
5. Locate real app files.
6. Verify current state.
7. Run relevant tests.
8. Fix or document highest-risk issue.
9. Update scorecard.
10. Hand off to Claude for final polish/verification if UI/copy/release-critical.

## Claude Handoff Notes

Claude should verify implementation in the real app clone, polish UI/copy where relevant, run tests, and report launch readiness with evidence.

<!-- REAL_APP_EVIDENCE_START -->

## Real App Evidence Update - 2026-06-09

Readiness: RED

Current real app state: DB auth, full test failure, dirty worktree, and route probe failure block launch.

Owned routes/files to inspect: C:\Users\Garrett\Sports, apps/web/app, apps/web/components, apps/web/lib, scripts, packages/db/prisma.

Owned tests/commands: npm.cmd run typecheck, npm.cmd run lint, npm.cmd test, npm.cmd run build, APP_URL=http://localhost:3210 node scripts/prod-probe.mjs.

Worker training gap: every worker must now reference actual app routes, failing runtime behavior, and BUILD-REALAPP cards.

Build cards: BUILD-REALAPP-002, BUILD-REALAPP-004, BUILD-REALAPP-020

Claude handoff note: verify this department's claim against the app before changing production code or declaring launch readiness.

<!-- REAL_APP_EVIDENCE_END -->
