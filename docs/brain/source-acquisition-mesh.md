# Sports OS — Source Acquisition Mesh

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §3 · Component 5
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/brain/source-hierarchy.md` — six-tier taxonomy used by all sources
- `docs/brain/evidence-vault.md` — where acquired evidence is stored
- `docs/brain/weak-signal-engine.md` — Tier 5 source handling
- `docs/brain/picks-intelligence.md` — downstream consumer of acquired sources
- `docs/brain/calibration-feedback-loop.md` — source quality signals from settlement

---

## Purpose

The Source Acquisition Mesh (SAM) is the intake layer of the Sports OS
intelligence network. It governs how sources are discovered, evaluated,
admitted, scored, monitored, and retired.

Every piece of intelligence that reaches a user originated at a source.
The quality, freshness, and reliability of that source determines what
claims the system can make, at what tier, and with what confidence.

A pick is only as trustworthy as the sources behind it.
The SAM is the system's immune response to bad data.

The SAM is NOT a web crawler. It is NOT a scraper. It is a governed registry
of approved sources with documented acquisition methods, update frequencies,
health checks, and retirement rules. Sources are onboarded deliberately.
No source is trusted by default.

---

## Source Registry

Every source used by the Sports OS intelligence network must have a Source
Registry entry. An unregistered source may not be used as evidence for any
pick, Brain answer, or recommendation.

```typescript
// STATUS: PROPOSAL — for documentation purposes only.
// Implementation requires approved schema change.

type SourceRegistryEntry = {
  // Identity
  sourceId: string;              // stable, never reused
  name: string;
  url?: string;
  sourceTier: 1 | 2 | 3 | 4 | 5 | 6;
  sport: string[];               // sports this source covers
  league: string[];              // leagues this source covers

  // Acquisition
  acquisitionMethod: AcquisitionMethod;
  updateFrequency: UpdateFrequency;
  licenseStatus: LicenseStatus;
  licenseNotes?: string;

  // Health
  healthStatus: SourceHealthStatus;
  reliabilityScore: number;      // 0–100; starts at 50 for new Tier 3 sources
  accuracyScore: number;         // 0–100; calibrated against settlement outcomes
  freshnessScore: number;        // 0–100; measures how current data typically is

  // Lifecycle
  admittedAt: Date;
  lastReviewedAt: Date;
  retiredAt?: Date;
  retiredReason?: string;
};

type AcquisitionMethod =
  | "LICENSED_API"       // Tier 1/2: formal API agreement with SLA
  | "OFFICIAL_FEED"      // Tier 1: direct from league/team
  | "CREDENTIALED_HUMAN" // Tier 3: human operator manually reviewing source
  | "AGGREGATED_REVIEW"  // Tier 3: operator curates summary from multiple T1/T2
  | "MARKET_DATA_API"    // Tier 4: licensed market feed
  | "MONITORED_COMMUNITY"// Tier 5: cockpit-only community monitoring
  | "INTERNAL_MODEL"     // Tier 6: Sports OS model output (never a source of truth)
;

type UpdateFrequency =
  | "REAL_TIME"     // continuous — live game data
  | "FIVE_MIN"      // every 5 minutes — market data
  | "FIFTEEN_MIN"   // every 15 minutes — injury reports
  | "HOURLY"        // breaking news cycle
  | "DAILY"         // daily stats updates
  | "ON_DEMAND"     // operator-triggered fetch
  | "MANUAL"        // human operator updates only
;

type LicenseStatus =
  | "LICENSED"           // formal agreement in place
  | "OFFICIAL_PUBLIC"    // public official feed, no license required
  | "FAIR_USE_REVIEW"    // under legal review for fair use classification
  | "PENDING"            // awaiting license agreement
  | "UNLICENSED"         // not licensed — source cannot be used for evidence
;

type SourceHealthStatus =
  | "HEALTHY"         // fetching on schedule, reliability above threshold
  | "DEGRADED"        // fetch failures or latency — monitoring elevated
  | "STALE"           // last successful fetch exceeded expected update window
  | "UNAVAILABLE"     // source is unreachable
  | "RETIRED"         // source has been permanently removed from the network
  | "SUSPENDED"       // source is temporarily paused pending review
;
```

---

## Source Evaluation Rubric

Before a source can be admitted to the registry, it must pass an evaluation
against this rubric. The operator performs the evaluation and records it.

### Tier 1 Admission (Official / Primary)

A source qualifies for Tier 1 if it meets ALL of the following:

| Criterion | Requirement |
|---|---|
| Origin | Direct from the team, league, or the entity being reported on |
| Attribution | Can be attributed to a specific named official entity |
| Access method | Official public feed, credentialed press access, or licensed API |
| Verifiability | An independent operator could retrieve the same information |
| Historical accuracy | No history of deliberate misinformation from the source entity |

**Examples that qualify**: NFL official injury report via licensed feed,
team's official Twitter/X account making a transaction announcement,
coach's on-record press conference transcript.

**Examples that do NOT qualify**: A fan account claiming to quote an official,
an aggregator that republishes official info without attribution.

### Tier 2 Admission (Licensed / Structured)

| Criterion | Requirement |
|---|---|
| License | Formal API or data agreement with documented terms |
| SLA | Defined uptime and freshness guarantees |
| Redistribution | Terms reviewed — raw data may not be republished without permission |
| Attribution | Provider name must be cited in all derived outputs |

**The Odds API** is the current licensed Tier 2 source for odds and lines.
Raw Odds API data may not be republished verbatim. It must be displayed as
Sports OS derived intelligence, with provider attribution.

### Tier 3 Admission (Trusted Secondary)

| Criterion | Requirement |
|---|---|
| Outlet | Established publication with editorial standards |
| Reporter | Named reporter with a verifiable track record |
| Track record | At least 90 days of observable reporting; accuracy not below 70% |
| Access | Reporter has credentialed or observed access to the subject |
| History | No pattern of reporting corrections on the same claim type |

A new Tier 3 source starts with a reliability score of 50.
It graduates to a higher score only through observed accuracy over time
(measured against settlement outcomes and Tier 1 confirmation).

### Tier 4 Admission (Market Signals)

Tier 4 is limited to licensed market data feeds. Individual sportsbook
websites scraped without authorization do not qualify as Tier 4.
Market signals are informative about perceived probability, not fact.

### Tier 5 Admission (Community / Weak Signal)

Tier 5 sources are cockpit-only. They are not admitted as evidence sources —
they are admitted as watchlist inputs only. A Tier 5 source requires:

| Criterion | Requirement |
|---|---|
| Channel | A specific, defined community channel (e.g., a specific subreddit) |
| Signal type | Keyword/sentiment monitoring only — not claim extraction |
| Use constraint | Cockpit watchlist only — never surfaced as public evidence |
| Verification rule | Any Tier 5 signal that reaches watchlist must trigger a Tier 1 verification attempt |

### Tier 6 — Not Admitted

Tier 6 sources (AI-generated content, unattributed aggregators) are never
admitted to the registry as evidence sources. Sports OS model outputs are
Tier 6 by definition — they are content tools, not intelligence sources.

---

## Reliability Scoring

Each source carries a reliability score (0–100) that updates continuously
based on observed behavior:

**Reliability score inputs**:

| Factor | Effect |
|---|---|
| Tier 1 confirmation of source claim | +2 per confirmation (capped at 20 events/month) |
| Settlement WIN aligned with source-backed pick | +1 per outcome |
| Settlement LOSS on source-only evidence | -2 per outcome |
| Source claim later contradicted by Tier 1 | -5 per contradiction |
| Source claim never verified or refuted | 0 (neutral) |
| Fetch failure | -1 per missed update window |
| Fetch recovery after degraded period | +1 per successful recovery |

**Score thresholds**:

| Score | Status | Effect |
|---|---|---|
| 80–100 | HIGH_RELIABILITY | May be used as sole Tier 3 evidence in premium picks |
| 60–79 | RELIABLE | Standard use; corroboration preferred for public picks |
| 40–59 | CAUTION | Must be corroborated by Tier 1/2 before use in picks |
| 20–39 | LOW_RELIABILITY | Cockpit watchlist only — not for picks |
| 0–19 | SUSPENDED | Automatically suspended — operator review required |

---

## Health Monitoring

Every registered source is checked for health on each scheduled update.
Health checks are automatic — they do not require operator intervention
under normal conditions.

**Health failure thresholds** (automatic status changes):

| Condition | Duration | Resulting status |
|---|---|---|
| Fetch timeout or error | 1 occurrence | DEGRADED |
| Repeated fetch failure | 3 consecutive misses | STALE |
| No successful fetch | 6 consecutive misses | UNAVAILABLE |
| Prolonged unavailability | 48 hours | Operator alert — SUSPENDED pending review |

**Downstream effects of source health status**:

| Source status | Effect on evidence |
|---|---|
| HEALTHY | Evidence is used normally |
| DEGRADED | Evidence is flagged FRESHNESS_WARN; cockpit alert raised |
| STALE | Evidence is flagged STALE; picks backed solely by this source are WITHHELD |
| UNAVAILABLE | Evidence is invalidated; picks backed solely by this source are WITHHELD |
| SUSPENDED | Source is excluded from all evidence retrieval until status is cleared |

---

## Source Retirement

A source is retired when it is permanently removed from the intelligence
network. Retirement is a deliberate operator action — it is not automatic.

**Retirement triggers**:

- Source no longer exists (publication closed, feed discontinued)
- License agreement terminated
- Reliability score dropped below 10 and has not recovered in 60 days
- Source was found to have deliberately published false information
- Legal or compliance concern identified

**Retirement rules**:

- Retired sources are marked RETIRED in the registry — their record is not deleted
- All historical evidence items citing the retired source are flagged with
  SOURCE_RETIRED status
- Picks citing a retired source as sole evidence are re-evaluated:
  - If other evidence supports the pick → pick status unchanged
  - If the retired source was sole evidence → pick is flagged EVIDENCE_RETIRED
- Model calibration data does not rewind on source retirement —
  historical settlement outcomes are preserved

---

## Unlicensed Source Rule

A source with `licenseStatus: "UNLICENSED"` may not be used for evidence.
An unlicensed source may appear in the registry as PENDING while licensing
is pursued — but it is excluded from all evidence retrieval until licensed.

This rule applies regardless of the source's quality or how tempting the
data may be. Operating without proper licensing exposes the platform to
legal risk and undermines the trust model.

---

## Source Transparency

The source registry is an internal operator tool. The following derivative
information may be shown on public surfaces (via `/methodology`):

- The six-tier taxonomy (`docs/brain/source-hierarchy.md`)
- The general categories of sources used (official feeds, licensed data,
  credentialed reporters, market data)
- The freshness TTLs per tier
- The statement that raw data is not republished without license
- The statement that AI/Tier 6 content is never a source of truth

The following is NOT shown publicly:
- The specific list of all registered sources
- Reliability scores for individual sources
- Source health status
- Internal source IDs

Publishing a complete source list creates gaming and targeting risks.
The methodology page describes the system — it does not expose the registry.

---

## Current Implementation Note

The Source Acquisition Mesh as a formal registry and health-monitoring
system does not yet exist in the codebase. The current implementation uses
The Odds API (Tier 2 licensed) and operator-curated content.

The registry schema, health checks, reliability scoring, and automated
monitoring described in this document require approved schema changes before
implementation. Until then, source governance is enforced through the
operator cockpit and manual review processes.

The doctrine in this document governs how sources MUST be handled when
the SAM is implemented. It also governs current operator behavior: no source
is used without awareness of its tier, no unlicensed source is used for
evidence, and Tier 5 content never reaches public surfaces.
