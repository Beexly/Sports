# Launch Readiness Scorecard

As of: 2026-06-09

This scorecard supersedes the earlier docs-only score. Docs/control readiness and app launch readiness are scored separately so research volume cannot inflate product readiness.

| Area | Status | Score | Real app evidence | Required action |
| --- | --- | --- | --- | --- |
| Docs/control system readiness | GREEN | 82 | Existing command center package exists and is now being updated, not duplicated. | Keep using command-center as source of launch truth. |
| Real app source availability | GREEN | 90 | Selected app repo: C:\Users\Garrett\Sports, branch safety/sports-wip-2026-06-04, remote BeeXly/Sports. | Owner should confirm this is the intended shipping clone before fixes. |
| Build/test readiness | RED | 58 | typecheck/lint/build pass; npm.cmd test fails 3 tests; prod-probe fails. | Fix full test red and prod probe red before launch. |
| Product functionality | RED | 35 | Homepage, board, board API, promotions API, health fail under local production start. | Fix DB auth/runtime resilience and rerun route matrix. |
| Data/roster truth | GRAY | 30 | Najee/Rico static grep found no app player records; no Player Lab/roster route rendered. | Define real roster source and add canary harness or mark out of launch scope. |
| Website/design | RED | 45 | Static pricing/promotions/methodology look premium; homepage is an error card. | No launch until homepage and board render cleanly. |
| Mobile/accessibility | YELLOW | 50 | Mobile screenshots captured for major static routes; no axe/accessibility pass yet; picks desktop timed out. | Run accessibility and responsive QA after route fixes. |
| Monetization/pricing | YELLOW | 55 | Pricing page renders monthly Free/Pro/Elite style offers; Stripe/live checkout not verified. | Resolve pricing cadence/source-of-truth and checkout integrity gate. |
| Promotions/compliance | YELLOW | 60 | Promotions route has disclosure and safe empty state; API fails from DB and live links are unverified. | Keep shell-only until compliance-approved partner data and API green. |
| Support/content/brand | YELLOW | 62 | FAQ/contact/brief/methodology respond; help/video layer not yet verified. | Add Galaxy Studios help/how-to layer and confused-user rescue. |
| Analytics/finance | GRAY | 35 | Event plans exist; runtime event implementation not verified. | Add launch-minimum events and finance dashboard evidence. |
| Infrastructure/security/QA | RED | 48 | Prisma auth failure, full test failure, dirty worktree, and app-runtime route failures. | Fix environment and test red; confirm production env gates. |
| Claude handoff readiness | GREEN | 80 | This update creates real-app evidence, cards, and handoff. | Claude should verify, then fix in priority order. |

## Overall Launch Score

Source-verified launch score: 49/100.

Recommendation: RED - not launchable. The command center is usable, but the app is blocked by homepage/runtime failures, local DB auth failure, failed full tests, failed prod-probe, and unverified roster/player-product scope.
