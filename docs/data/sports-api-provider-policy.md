# Sports OS — Sports API Provider Policy

**Status**: Doctrine. Governs all sports API integrations.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/data/source-provider-module-taxonomy.md` — provider classification
- `docs/brain/source-acquisition-mesh.md` — source registry
- `docs/source-providers/commercial-crawling-approval-gate.md` — crawling gate
- `docs/audit/final-wave-source-risk-register.md` — risk classification
- `docs/agents/agent-action-policy.md` — U2 (No Secret Access) rule

---

## Purpose

Every sports API integration in Sports OS is a contractual relationship
with specific terms, rate limits, data rights, and attribution requirements.
This policy defines how Sports OS evaluates, integrates, operates, and retires
sports API providers.

The policy covers:
- Evaluation criteria for new API providers
- Required documentation before any integration begins
- Ongoing health monitoring requirements
- Rate limit and quota management rules
- Attribution and disclosure requirements
- API key security requirements
- Retirement and migration procedures

---

## Source Evidence from Line Audit

Wave 3 audit surveyed available sports API providers and their commercial terms:

**The Odds API (current active provider)**:
- Commercial license: paid tier (Sports OS currently uses this)
- Rate limits: Documented per plan tier
- Data rights: Permits commercial use; prohibits raw data redistribution
- Attribution: Not required in user-facing content; recommended in footer
- TTL: Lines should be refreshed at minimum every 30 minutes; every 5
  minutes within 2 hours of game start per accuracy requirements

**Sportradar**:
- Full sports data suite (scores, stats, play-by-play, odds)
- Commercial pricing: expensive; per-sport licensing
- Attribution: "Powered by Sportradar" required in licensed integrations
- Data rights: Strong commercial license; clear terms
- Risk classification: GREEN (established provider, clear terms)

**Stats Perform / Opta**:
- Premium sports analytics data; used by ESPN, Sky Sports
- Commercial license required per sport
- Similar structure to Sportradar

**SportsData.io (formerly MySportsFeeds)**:
- Mid-market pricing; covers major US sports
- Attribution required for some tiers
- Risk: YELLOW — verify commercial terms before production use

**ESPN API (unofficial)**:
- No official commercial API for third parties
- Unofficial endpoints exist but terms prohibit commercial use
- Risk: RED — do not use for commercial product

**RapidAPI sports providers**:
- Mixed quality; individual provider terms vary widely
- Risk: YELLOW to ORANGE — review each provider's terms individually
- Do not assume RapidAPI reselling = commercial license from the data owner

**OpenLigaDB / api-football (free tiers)**:
- Free tiers exist with varying restrictions
- Commercial restrictions often apply even to "free" access
- Verify before using in production

---

## User Value

- Pick content is backed by reliable, current API data that refreshes on schedule.
- Users see accurate game times, lines, and odds — not stale data served
  from a cache that failed to refresh.
- Freshness timestamps are displayed so users can see when data was last updated.

---

## Operator Value

- Clear documentation of every API integration prevents billing surprises,
  rate limit outages, and ToS violations.
- API keys are secured and rotated on schedule — no production outage from
  a compromised key.
- Attribution requirements are tracked and honored — no legal risk from
  failing to credit a required data source.

---

## Current Sports OS Fit

**Active integrations**:
- The Odds API: `packages/data-ingestion/odds-api/` — active

**Prospective integrations** (not yet approved or implemented):
- Official league injury reports — Category 2, requires program enrollment
- Sportradar — Category 2, requires commercial license
- Sports Reference editorial — Category 4, editorial only

---

## Section 1 — Provider Evaluation Criteria

Before any API integration is approved, evaluate against these criteria:

### Criterion A — Data Quality

| Factor | Rating scale | Weight |
|---|---|---|
| Data freshness / latency | 1 (>1hr delay) → 5 (real-time) | HIGH |
| Coverage completeness | 1 (partial) → 5 (full sport coverage) | HIGH |
| Historical depth | 1 (current season only) → 5 (5+ years) | MEDIUM |
| Error rate / reliability | 1 (frequent outages) → 5 (99.9% uptime SLA) | HIGH |
| Schema consistency | 1 (unstable, breaks frequently) → 5 (versioned, stable) | MEDIUM |

### Criterion B — Legal and Commercial

| Factor | Requirement |
|---|---|
| Commercial use explicitly permitted | REQUIRED — blocks integration if absent |
| Raw data redistribution | PROHIBITED required (Sports OS derives, not redistributes) |
| Attribution requirements | Documented — implementation required before go-live |
| License review by owner | REQUIRED for any Category 1–4 provider |
| Prohibition on competing use | Review — some providers prohibit use in betting-adjacent products |

### Criterion C — Technical Compatibility

| Factor | Requirement |
|---|---|
| REST or GraphQL API | PREFERRED — webhook or FTP acceptable with justification |
| Documented rate limits | REQUIRED — undocumented limits are a risk |
| Authentication (API key, OAuth) | API key preferred; OAuth acceptable |
| Sandbox / test environment | Strongly preferred for development |
| SDK available | Optional — simplifies integration; must review license |

### Criterion D — Cost and Sustainability

| Factor | Consideration |
|---|---|
| Price per request / per month | Must fit within operator's data budget |
| Overage charges | Document and implement circuit breaker before go-live |
| Free tier availability | Useful for development; production must use paid tier |
| Contract length | Monthly preferred for initial integration; annual after proven |
| Price increase risk | Consider provider's pricing history |

---

## Section 2 — Required Pre-Integration Documentation

Before writing any integration code, produce and store the following:

```
Provider Integration Proposal

Provider name: [name]
Category: [1–7 per taxonomy]
Evidence tier ceiling: [T1 | T2 | T3]
Risk classification: [GREEN | YELLOW | ORANGE | RED]

Legal:
  Commercial use permitted: [YES | NO — blocks integration if NO]
  Raw data redistribution permitted: [YES | NO — must be NO]
  Attribution required: [quote exact attribution requirement]
  License URL: [URL]
  License reviewed by: [Owner]
  License review date: [ISO date]

Technical:
  API documentation URL: [URL]
  Authentication method: [API key | OAuth | other]
  Rate limits: [requests/minute, requests/hour, requests/month]
  Sandbox available: [YES | NO]
  Proposed adapter path: [packages/data-ingestion/[name]/]

Data:
  Evidence types to ingest: [list specific endpoints/fields]
  TTL per evidence type: [default refresh frequency]
  Storage plan: [what is stored — not raw payloads but derived fields]

Cost:
  Plan: [plan name and pricing]
  Estimated monthly cost: [$X]
  Overage protection: [circuit breaker plan]

Owner approval: [APPROVED | PENDING]
Approval date: [ISO date]
```

This document must be stored in `docs/source-providers/` before any
adapter code is written.

---

## Section 3 — API Key Security

### Rule AK-1: Keys Never in Code

All API keys must be stored as environment variables. No API key may appear:
- In any committed file
- In any log output
- In any error message
- In any model context or prompt

### Rule AK-2: Separate Keys per Environment

Production, staging, and development must use separate API keys.
A development key must never have production rate limit quotas.

### Rule AK-3: Key Rotation Schedule

| Provider tier | Rotation frequency |
|---|---|
| All providers | Immediately on any suspected compromise |
| Critical providers (The Odds API) | Every 90 days minimum |
| All providers | Immediately when any team member with key access departs |

### Rule AK-4: Rate Limit Monitoring

Every API integration must have:
- A rate limit counter that tracks usage against the plan quota
- An alert at 80% quota consumption (warn)
- A circuit breaker at 95% quota consumption (pause non-critical requests)
- Logging of every 429 Too Many Requests response

### Rule AK-5: Quota Exhaustion Behavior

When quota is exhausted:
- Serve the most recent cached data with a staleness disclosure
- Display "Data last updated [timestamp]" to users
- Do NOT attempt to exceed quota by switching to a scraping fallback
- Alert operator immediately

---

## Section 4 — Attribution Requirements

Each active API provider's attribution requirements must be documented and implemented:

| Provider | Attribution requirement | Where required |
|---|---|---|
| The Odds API | None required; recommended in footer | Optional footer |
| Sportradar | "Powered by Sportradar" | Required in licensed displays |
| Stats Perform | "Data provided by Stats Perform" | Required in licensed displays |
| Official league programs | "Official [League] data" | Required — public-facing |
| Wire services (AP, Reuters) | Per subscription terms | Required per terms |

Attribution must be implemented before go-live for any provider that requires it.
Go-live without required attribution is a P1 license violation.

---

## Section 5 — Health Monitoring

Every active API integration must have a health check:

```typescript
interface ApiProviderHealth {
  providerId: string;
  providerName: string;
  lastSuccessfulCallAt: string;   // ISO 8601
  lastErrorAt: string | null;
  consecutiveErrors: number;
  quotaUsedPercent: number;
  latencyP95Ms: number;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'QUOTA_WARNING' | 'QUOTA_EXHAUSTED';
}
```

Health status must be visible in the Operator Cockpit. Alerts must fire when:
- Status changes from HEALTHY to DEGRADED or DOWN
- consecutiveErrors ≥ 3
- quotaUsedPercent ≥ 80%

---

## Section 6 — Provider Retirement

When retiring an API provider:

1. Identify all evidence items sourced from this provider in the Evidence Vault
2. Set provider status to REVOKED in Source Acquisition Mesh
3. Within 48 hours: expire all active evidence items from this provider
4. Remove or disable the adapter in `packages/data-ingestion/`
5. Cancel any API subscription to avoid ongoing billing
6. Remove API key from all environments
7. Document retirement in `docs/source-providers/[provider]-retirement.md`

If a replacement provider is being substituted:
- New provider must be ADMITTED before old provider is retired
- Parallel ingestion window for validation (minimum 7 days)
- Verify evidence quality parity before full cutover

---

## Output Schema Reference

Evidence items from API providers must include:

```typescript
interface ApiEvidence {
  evidenceId: string;
  sourceModuleId: string;       // ProviderModuleEntry ID
  providerName: string;
  apiEndpoint: string;          // Internal reference — never public
  evidenceType: string;
  evidenceDate: string;         // ISO 8601
  ttlHours: number;
  expiresAt: string;
  status: 'ACTIVE' | 'STALE' | 'EXPIRED';
  dataHash: string;             // SHA-256 of payload — for deduplication
  publicCitation: boolean;
  attributionText: string | null; // Required attribution if publicCitation: true
}
```

---

## Forbidden Actions

- Do NOT write any adapter code before receiving owner approval on the proposal doc
- Do NOT use unofficial APIs (e.g., ESPN unofficial) for commercial product data
- Do NOT store raw API response payloads in the database (store derived fields only)
- Do NOT exceed documented rate limits by any means, including scraping fallback
- Do NOT use a development API key in production
- Do NOT serve stale data without a freshness disclosure
- Do NOT hardcode any API key in any file

---

## Validation Requirements

A task is NOT complete until:
- Integration proposal document exists in `docs/source-providers/`
- Owner has approved the proposal
- Rate limit monitoring is implemented and tested
- Circuit breaker at 95% quota is implemented
- Health check endpoint returns accurate status
- API key is stored as environment variable only
- Attribution is implemented (if required by provider)

---

## Approval Gates

| Action | Approving party |
|---|---|
| Writing any integration proposal | Operator |
| Approving an integration proposal | Owner |
| Writing adapter code (Zone 2) | Owner approval of proposal first |
| Going live with a new provider | Operator (after all validation passes) |
| Retiring an active provider | Operator + Owner notification |
| Increasing API plan tier (cost impact) | Owner |

---

## Codex Audit Requirements

1. Confirm every adapter in `packages/data-ingestion/` has an approved
   integration proposal in `docs/source-providers/`
2. Confirm no API keys appear in any committed file, log, or error output
3. Confirm rate limit monitoring and circuit breaker exist for every active provider
4. Confirm health check is implemented and accessible from Operator Cockpit
5. Confirm all attribution requirements are implemented for all ADMITTED providers
6. Report any adapter without an approved proposal as P0
7. Report any API key found outside an environment variable as P0
