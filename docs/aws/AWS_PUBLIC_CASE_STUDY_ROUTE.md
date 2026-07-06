# AWS Public Case Study Route

Status: public-safe local route artifact. This document records the GSE case-study page that translates the local AWS governance layer into reader-facing copy without claiming AWS approval, account setup, deployment, funding, audience, sponsors, legal clearance, or release readiness.

Route:

- `/case-studies/aws-governed-sports-intelligence`

Code:

- `apps/web/app/case-studies/aws-governed-sports-intelligence/page.tsx`
- `apps/web/lib/aws-case-study/public-case-study.ts`
- `apps/web/__tests__/aws-case-study-page.test.ts`
- `apps/web/__tests__/commercial-pages-launch-qa.test.ts`

Purpose:

- Explain how GSE uses AWS concepts as a governance vocabulary.
- Show the six Well-Architected pillars as local GSE controls.
- Point readers to repo-visible evidence paths without exposing credentials, provider hooks, or raw data.
- Preserve a clear boundary between portfolio storytelling and any future cloud action.

Reader-facing boundaries:

- Shadow only: local docs, fixtures, guardrails, and tests.
- No-cost lane: no AWS resources, DNS changes, credentials, deploy action, or paid resource.
- Evidence boundary: public probability, win-rate, business-outcome, and calibration claims require settled proof outside this route.

Well-Architected mapping:

| Pillar | GSE control shown on route | Evidence pointer |
| --- | --- | --- |
| Operational excellence | runbooks, guardrails, review queues, promotion packets | `docs/fable/aws/AWS_OPERATING_INTELLIGENCE_RUNBOOK.md` |
| Security | source-rights fences, payload filters, API key hash contracts, raw-key absence checks | `docs/api/API_V1_SHADOW_SEAM.md` |
| Reliability | replay harnesses, idempotency checks, duplicate rejection, stale packet reporting | `docs/api/API_V1_ABUSE_RESPONSE_FIXTURES.md` |
| Performance efficiency | lean public route, typed evidence seams, bounded payloads | `docs/api/API_V1_LIVE_ROUTE_PROMOTION_PACKET.md` |
| Cost optimization | local-first fixtures, no-spend gates, non-executable packets | `docs/aws/AWS_SHADOW_BOUNDARY.md` |
| Sustainability | synthetic fixtures, no-live-data demos, hash-only patterns | `infra/aws-shadow/README.md` |

Live-action locks:

- cloud resources created: false
- paid resources: false
- credentials used: false
- deployment approved: false
- funding approval claimed: false
- release readiness claimed: false

Verification:

```bash
npm run test --workspace=apps/web -- aws-case-study-page.test.ts commercial-pages-launch-qa.test.ts media-kit-page.test.ts partners-page.test.ts --reporter=dot --silent
npm run typecheck --workspace=@sports/web
npm run guard:aws-compatibility-index
```

Known follow-up:

- Add local desktop/mobile screenshot evidence for this new route before any production preview discussion.
- Keep any future case-study expansion behind the same claim-safety and AWS compatibility checks.
