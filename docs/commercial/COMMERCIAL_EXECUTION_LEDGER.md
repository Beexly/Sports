# Commercial Execution Ledger

Updated: 2026-07-04

| Work item | Status | Evidence | Next gate |
| --- | --- | --- | --- |
| Media Revenue Studio docs | complete | `docs/media/*` | owner review |
| Media public pages | complete | `/media-kit`, `/partners`, `/newsletter`, `/content-lab`, `/podcast` | visual QA before production push |
| Media revenue utilities | complete with first-month queue fixtures | `apps/web/lib/media-revenue/*` | review-queue export slice |
| Commercial revenue core | complete for pure seam | `apps/web/lib/revenue/*` | owner review and future route/UI decisions |
| Partner/offer live registry | not live | no DB schema or provider integration added | owner product decision |
| Affiliate links | not live | no real links added | owner/compliance approval |
| B2B Evidence API | shadow with route harness | existing B2B governance, closeout docs, API v1 shadow seam, and route-level shadow harness | draft workflow harness and owner-gated live-route promotion packet |
| AWS live resources | not live | no credentials or deploy actions | owner/AWS approval |
| Sunday frontier safety guardrails | complete for current slice | `commercial-copy-scan`, `no-unsupported-performance-claims`, `no-raw-ngs-export`, `partner-offer-compliance-scan`, `api-payload-rights-scan`, `openapi-security-scan`, pricing copy hardening | route-level API harness |
| Fence and policy seams | complete for pure seam, draft harness, local review packet, renderer, memory ledger, queue filters, and summary counts | `apps/web/lib/fences/*`, `apps/web/lib/source-rights/*`, `apps/web/lib/ip/*`, `apps/web/lib/api-auth/*`, `apps/web/lib/api-v1/*`, `apps/web/lib/api/v1/shadow-route-harness.ts`, `apps/web/lib/workflows/draft-fence-workflow.ts` | representative packet fixtures and claim-safety batch report |
| Review packet fixtures | complete for local content/API samples | `apps/web/lib/workflows/draft-review-fixtures.ts`, `apps/web/__tests__/draft-review-fixtures.test.ts` | local review-queue export |
| First-month media queue fixtures | complete for local draft queue | `apps/web/lib/media-revenue/first-month-content-queue.ts`, `apps/web/__tests__/first-month-content-queue.test.ts`, `docs/media/FIRST_MONTH_CONTENT_QUEUE_FIXTURES.md` | local review-queue export |

## Verification Contract

Every commercial slice must record:

- files changed
- tests run
- guardrails run
- claim-safety boundary
- any live integration intentionally not added

## 2026-07-05 Update

- Added and wired local guardrails for public commercial copy, unsupported performance claims, and raw NGS export language.
- Tightened `/pricing` copy to avoid unsupported public proof language.
- No affiliate links, sponsor claims, traffic claims, revenue claims, win-rate claims, ROI claims, or live partner integrations were added.
- Added and wired partner-offer compliance scanner with explicit sportsbook/DFS fail-closed handling.
- Added pure commercial/source/API fence seams and tests; no live route or partner exposure was added.
- Added API payload rights scanner and OpenAPI security scanner.
- Added route-level API shadow harness with auth, scope, rate-limit/quota, request ID, envelope, usage event, payload-rights, and abuse-response tests.
- No live API routes, durable persistence, env vars, secrets, affiliate links, partner exposure, or production API promotion were added.
- Added draft fence workflow harness for content/API manual-review workflows. Safe drafts can only reach manual review; blocked drafts require repair.
- Added local draft review packet serialization with owner checklist fields. Checklist approval does not publish, send, expose routes, or activate integrations.
- Added packet markdown rendering and an in-memory append-only packet ledger. Rendering omits protected payload values and ledger append does not approve live actions.
- Added local packet queue status filters and review summary counts. Summaries keep publish/send/route/live locks false.
- Added representative content/API review packet fixtures and claim-safety batch report. Fixtures remain local and do not expose protected payload values.
- No content publish, external send, affiliate activation, API route exposure, or production workflow automation was added.
- Added first-month media queue fixtures and claim-safety report: 90 local content drafts, 30 manual partner-outreach batches, 300 outreach targets, and all publish/send locks closed.
- Next commercial/API gate: local review-queue export for first-month content drafts.
