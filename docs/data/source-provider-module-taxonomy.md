# Sports OS — Source Provider Module Taxonomy

**Status**: Doctrine. Classification reference for all data source provider modules.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/data/sports-api-provider-policy.md` — API-specific policies
- `docs/brain/source-acquisition-mesh.md` — source registry
- `docs/audit/final-wave-source-risk-register.md` — risk classification
- `docs/source-providers/commercial-crawling-approval-gate.md` — crawling gate
- `docs/performance/sports-science-licensing-policy.md` — science data licenses

---

## Purpose

The Source Provider Module Taxonomy defines how Sports OS organizes, classifies,
and governs its data source providers. A "provider module" is the combination of
a data source, its adapter implementation (or proposed adapter), its license
status, and its evidence tier classification.

This taxonomy is the reference for:
- Understanding what categories of providers exist and which are active
- Deciding which module category applies to a new potential provider
- Mapping provider modules to evidence tiers and admission requirements
- Guiding the Source Acquisition Mesh registry entries

---

## Source Evidence from Line Audit

Wave 3 audit identified the following provider categories and representative
sources across sports data, odds, sports science, and reference data:

**Category 1 — Odds and Market Data**: The Odds API, Pinnacle (odds feeds),
Sportradar betting feeds, SBK odds API, Action Network API.

**Category 2 — Official League Data**: MLBAM Data Delivery, NFL Next Gen Stats,
NBA Second Spectrum, NHL RTSS, Sportradar official league feeds.

**Category 3 — Sports Science / Performance**: Trackman, Rapsodo, Catapult GPS,
STATSports, Statcast (public endpoint), Second Spectrum (NBA), Hawkeye.

**Category 4 — Reference / Statistical**: Sports Reference network (Baseball
Reference, Pro Football Reference, Basketball Reference), ESPN Stats API (limited),
Sportsdata.io, SportsradarV4.

**Category 5 — News and Injury Feeds**: AP Sports wire, Reuters Sports, official
league injury report APIs, Rotowire (paid), RotoGrinders (mixed quality).

**Category 6 — Community / Weak Signal**: Reddit sports communities, Twitter/X
sports accounts, Scores24, Betway blog, fan forum aggregators.

**Category 7 — Synthetic / AI-Generated**: AI summary sites, GPT-generated
sports previews, automated content farms.

---

## User Value

- Users benefit from a source taxonomy that ensures only verified, tier-appropriate
  evidence backs the picks they see.
- Evidence Drawer shows source tier badges that reflect this taxonomy, giving
  users the information to assess source quality themselves.

---

## Operator Value

- Every potential new provider can be classified immediately using this taxonomy,
  which determines what approval process applies.
- The taxonomy prevents "just try it and see" data ingestion — each category
  has a defined admission process.
- Audit trail is organized by provider module category.

---

## Current Sports OS Fit

The current Source Acquisition Mesh contains one active provider:
- **The Odds API** — Category 1 (Odds and Market Data), T2 licensed, active

All other categories are proposed or prospective. This document governs
the classification and admission of future providers.

---

## Module Category Registry

---

### Category 1 — Odds and Market Data

**What it provides**: Betting lines, spreads, moneylines, totals, opening
vs. closing line data, market movement, consensus odds.

**Evidence tier**: T2 (licensed structured data)

**Current active providers**:
- The Odds API (`packages/data-ingestion/odds-api/`) — active, licensed

**Prospective providers**:
- Pinnacle odds feed — commercial license required
- Action Network API — check commercial terms
- Sportradar betting feeds — commercial license required

**Admission requirements**:
- Commercial API license agreement on file
- Attribution requirements implemented in pick content
- TTL: 30 minutes for pre-game lines; 5 minutes within 2 hours of game time

**Risk classification**: YELLOW by default (market data is reliable but can
reflect manipulation; requires freshness enforcement)

---

### Category 2 — Official League Data

**What it provides**: Official game schedules, rosters, scores, official
statistics, official injury designations, official tracking programs.

**Evidence tier**: T1

**Current active providers**: None (official league data not yet ingested)

**Prospective providers**:
- MLBAM Data Delivery (MLB official)
- NFL Next Gen Stats (official program)
- NBA official APIs
- NHL RTSS official data

**Admission requirements**:
- Program enrollment with the league (not just API key purchase)
- Commercial license agreement with the league or their data partner
- Attribution requirements: "Official [League] data"
- Owner approval before any program application

**Risk classification**: GREEN (T1, official source — highest trust, highest
licensing barrier)

---

### Category 3 — Sports Science / Performance

**What it provides**: Radar (velocity, spin), tracking (player positions, speed),
wearable (GPS, physical load), biomechanics (force, joint angles).

**Evidence tier**: T2 (licensed commercial providers) / T3 (research providers)

**Current active providers**: None

**Prospective providers**: See `docs/performance/sports-science-licensing-policy.md`
for complete registry.

**Admission requirements**:
- Commercial license agreement (per provider)
- For biometric data: CBA consent determination from legal counsel
- Owner approval before any integration

**Risk classification**: YELLOW to ORANGE depending on provider and data type.
Biometric data: ORANGE until consent framework confirmed.

---

### Category 4 — Reference / Statistical

**What it provides**: Historical statistics, career records, season aggregates,
advanced metrics derived from official data.

**Evidence tier**: T3 (editorial reference — not primary pick evidence)

**Current active providers**: None

**Prospective providers**:
- Sports Reference network (Baseball Reference, Pro Football Reference, etc.)
- ESPN Stats (limited public data)
- Sportsdata.io

**Admission requirements**:
- License review for commercial use (Sports Reference prohibits bulk scraping)
- `publicCitation: false` by default; editorial use only with operator disclosure
- Attribution: "Baseball Reference" / "Pro Football Reference" in editorial content
- No automated ingestion without explicit commercial license

**Risk classification**: YELLOW (valuable reference data; commercial use restrictions)

---

### Category 5 — News and Injury Feeds

**What it provides**: Sports news, injury updates, transaction wire, roster moves.

**Evidence tier**: T1 (official wire services) / T2 (licensed aggregators) / T3 (editorial sources)

**Current active providers**: None

**Prospective providers**:
- AP Sports wire (subscription required) — T1
- Reuters Sports (subscription required) — T1
- Official league injury report endpoints — T1
- Rotowire (paid subscription) — T2

**Admission requirements**:
- Wire service: subscription license
- Official league: program enrollment
- Aggregators: review of commercial use terms
- Beat reporter or editorial sources: T3 only; no automated ingestion

**Risk classification**: GREEN for T1 wire services; YELLOW for T2 aggregators

---

### Category 6 — Community / Weak Signal

**What it provides**: Social sentiment, crowd-sourced picks, forum discussion,
Twitter/X sports commentary.

**Evidence tier**: T5

**Current active providers**: None — T5 sources are monitoring-only

**Admission requirements**:
- T5 sources may never be admitted as primary evidence
- May be used for weak signal aggregation in the Weak Signal Engine
- Must be disclosed as T5 if surfaced in any user-facing context
- No automated scraping without seven-gate crawling approval

**Risk classification**: ORANGE by default; RED if ToS prohibits automated access

---

### Category 7 — Synthetic / AI-Generated

**What it provides**: AI-written sports previews, GPT sports summaries,
automated content farm output.

**Evidence tier**: T6

**Current active providers**: None — permanently forbidden as evidence

**Admission requirements**: PERMANENTLY BLOCKED as evidence sources.
No admission path exists for Category 7 as prediction evidence.

**Risk classification**: RED — permanently forbidden

---

## Provider Module Lifecycle

### Status definitions

| Status | Meaning |
|---|---|
| PROPOSED | Under evaluation — no data ingested |
| GATED | In approval process — all gates not yet passed |
| ADMITTED | Active — licensed, ingesting, TTL enforced |
| SUSPENDED | Was active; temporarily suspended (TTL stopped) |
| REVOKED | License revoked or terms changed; data removed |
| ARCHIVED | No longer used; historical record only |

### Status transitions

```
PROPOSED → GATED: Owner approves evaluation
GATED → ADMITTED: All required gates pass + owner final approval
ADMITTED → SUSPENDED: ToS change detected or license concern raised
SUSPENDED → ADMITTED: Concern resolved, owner confirms continuation
ADMITTED → REVOKED: License revoked; 48-hour data removal required
REVOKED → ARCHIVED: After data removal confirmed
```

---

## Module Registration Format

Every provider module must have a Source Acquisition Mesh entry:

```typescript
interface ProviderModuleEntry {
  moduleId: string;           // UUID
  providerName: string;
  category: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  evidenceTier: 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6';
  licenseStatus: 'NONE' | 'UNDER_REVIEW' | 'ACTIVE' | 'REVOKED';
  licenseType: string;        // e.g., 'commercial_api', 'program_enrollment', 'research'
  commercialUsePermitted: boolean;
  crawlingApproved: boolean;  // Only true if all 7 crawling gates passed
  admissionStatus: 'PROPOSED' | 'GATED' | 'ADMITTED' | 'SUSPENDED' | 'REVOKED' | 'ARCHIVED';
  adapterPath: string | null; // packages/data-ingestion/[adapter-name]/ or null
  ttlHoursDefault: number;
  attributionRequired: string; // What must appear in public content
  riskClassification: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  lastReviewedAt: string;     // ISO 8601
  reviewedBy: string;         // Operator ID
  ownerApprovalDate: string | null;
  notes: string;
}
```

---

## Forbidden Actions

- Do NOT ingest data from a Category 6 or 7 provider as prediction evidence
- Do NOT admit any provider to ADMITTED status without owner approval
- Do NOT treat PROPOSED or GATED status as permission to ingest data
- Do NOT bypass the seven-gate crawling process for any Category 6 provider
- Do NOT use Category 4 reference data as primary pick evidence
- Do NOT allow a REVOKED provider's data to remain in the Evidence Vault
  beyond 48 hours of revocation

---

## Validation Requirements

A task is NOT complete until:
- All active data adapters have a corresponding ProviderModuleEntry with
  `admissionStatus: 'ADMITTED'`
- All Category 6/7 providers are `admissionStatus: 'PROPOSED'` or absent
- All ADMITTED providers have `licenseStatus: 'ACTIVE'`
- TTL enforcement is implemented for each ADMITTED provider's evidence items

---

## Approval Gates

| Action | Approving party |
|---|---|
| Moving any provider from PROPOSED to GATED | Owner |
| Moving any provider from GATED to ADMITTED | Owner (all gates confirmed) |
| Suspending or revoking an ADMITTED provider | Operator (immediate); Owner (within 24h) |
| Adding Category 3 (sports science) provider | Owner + legal (license review) |
| Adding Category 2 (official league) provider | Owner + program enrollment |

---

## Codex Audit Requirements

1. Confirm every data adapter in `packages/data-ingestion/` has a
   ProviderModuleEntry with `admissionStatus: 'ADMITTED'`
2. Confirm no Category 6 or 7 provider has any ingestion adapter
3. Confirm all ADMITTED entries have `licenseStatus: 'ACTIVE'`
4. Confirm all evidence items carry their source module ID for traceability
5. Report any data adapter without a corresponding ADMITTED registry entry as P0
