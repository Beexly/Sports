---
description: Legal scraping posture — clearance gate, rights registry, and extraction limits
paths:
  - "apps/web/lib/scraping/**"
  - "packages/data-ingestion/**"
  - "packages/ingestion-pipeline/**"
---

# Legal Scraping Posture

**Scraping is rights-gated, not banned.**

Every extraction job MUST pass through the Scraping Clearance Engine (`apps/web/lib/scraping/clearance-engine.ts`) before running. A `ClearanceResult` with `allowed=false` MUST stop the job. Every extracted record MUST carry a `RightsSnapshot` captured at extraction time.

### Do not build evasion

- No CAPTCHA bypass, login bypass, or paywall bypass
- No fake accounts or credential misuse
- No proxy rotation to circumvent IP blocks or access controls
- No scraping of paths disallowed by source policy unless legal counsel approves
- No automated access after receiving a cease-and-desist without legal review
- Evasion tools must NOT be added to the Tool Registry

### Source rights classification

All sources live in `apps/web/lib/scraping/source-rights-registry.ts`. Statuses:

| Status | Meaning |
|---|---|
| `approved_public_logged_off` | Public access, facts only, no login, no contract |
| `approved_api` | Licensed API with explicit commercial terms |
| `approved_open_license` | CC0/CC-BY/CC-BY-SA/Apache/MIT open dataset |
| `approved_written_permission` | Written contract or explicit permission received |
| `vendor_candidate` | Commercial provider — evaluate via questionnaire |
| `manual_research_only` | Human UX/taxonomy review only |
| `permission_required` | Terms prohibit automation without consent |
| `blocked_technical_controls` | Anti-bot/CAPTCHA/IP-block active |
| `excluded` | No safe path; permanently excluded |

**scores24.live** → `permission_required`. Manual UX research is allowed. Automation requires written consent from Kiito OÜ (support@scores24.live).
**score24.com** → `vendor_candidate`. Complete vendor questionnaire before any ingestion.
**siriusxm-activator** → `excluded`. Circumvents paid access. No path to approval.

### What may be extracted

Facts (scores, standings, fixtures), timestamps, URLs, metadata, derived signals we generate, source references. See `apps/web/lib/scraping/data-rules.ts`.

**Never extract**: article bodies for republication, proprietary predictions, protected graphics/charts/logos, site copy, personal data without privacy review, account-gated content.

### Key invariants

- `checkClearance()` must be called before every extraction job
- `wrapExtractedRecord()` enforces the envelope — throws if clearance not granted
- Rights snapshots are point-in-time captures; do not mutate them
- Attribution text from the registry must propagate to all derived outputs
