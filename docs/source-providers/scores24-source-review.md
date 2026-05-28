# Sports OS — Scores24 Source Review

**Status**: Doctrine. ORANGE classification. No active integration permitted.
**Source**: Prompt 4 — Final Wave
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/audit/final-wave-source-risk-register.md` — aggregate risk classification
- `docs/audit/piracy-malware-do-not-use-register.md` — ToS violation register
- `docs/brain/source-acquisition-mesh.md` — source admission criteria

---

## Purpose

This document records the full risk review of Scores24 as a potential data
source for Sports OS. It is the authoritative record for any future decision
to admit, block, or partner with Scores24.

This review was completed as part of the Prompt 4 Final Wave. It will be
updated if Scores24's licensing or ToS status changes, or if a formal
partnership discussion is initiated.

---

## Sports OS Fit Assessment

Scores24 is a sports scores and statistics aggregation platform. On the
surface it appears to offer the type of structured sports data that Sports OS
uses — scores, odds context, game schedules, and line information.

However, as documented below, the legal and licensing status of Scores24
is insufficiently clear to permit automated access. Until a formal licensing
agreement is established, Scores24 is classified ORANGE and may not be
integrated into the Source Acquisition Mesh.

---

## Provider Profile

| Field | Value |
|---|---|
| **Name** | Scores24 |
| **Type** | Scores and statistics aggregation |
| **Primary use case** | Scores, odds, standings, game schedules |
| **Data quality tier** | Estimated T2–T3 (unverified without licensed access) |
| **Official API offered** | Unknown — not publicly documented |
| **Terms of Service** | Unclear — automated access status not confirmed |
| **Commercial licensing** | No public commercial license program documented |
| **Classification** | ORANGE |

---

## Risk Assessment

Evaluated against the four-dimension Source Risk Framework from
`docs/audit/final-wave-source-risk-register.md`:

| Dimension | Score | Notes |
|---|---|---|
| **Data quality** | 3 | Aggregates real data but provenance chain unclear |
| **Legal / licensing** | 2 | No confirmed commercial license; ToS automated access status unknown |
| **Reliability** | 3 | Uptime history not established for API use |
| **Manipulation risk** | 3 | Aggregator risk: downstream of original sources |

**Overall risk tier**: ORANGE  
One dimension is in the 2–2.9 range (Legal / licensing). Per the framework,
this requires owner approval before admission and is not self-approving.

---

## Detailed Findings

### Finding 1 — Terms of Service Status: UNCONFIRMED

Sports OS has not been able to confirm whether Scores24's Terms of Service
permit automated data access. The platform does not publish a clear commercial
API program or developer terms.

**Implication**: Under Sports OS doctrine, when ToS automated access status
is not confirmed, the source is treated as if automated access is PROHIBITED.
This is consistent with the principle in `docs/audit/piracy-malware-do-not-use-register.md`:
"If a website's Terms of Service includes language prohibiting automated access,
data extraction, or scraping — do not scrape it. 'But the data is public' is
not a defense when the ToS prohibits automated access."

**Required to resolve**: A written response from Scores24 confirming
that automated access and data redistribution are permitted under a commercial
agreement, OR a signed licensing agreement.

### Finding 2 — No Official API Documented

As of the date of this review, Scores24 does not publicly document an official
API program for commercial use. Absence of a documented API is not confirmation
that one does not exist — but it means any access would require either:

a) A private commercial agreement (ORANGE → potentially GREEN after agreement)
b) Web scraping (BLOCKED — ToS status unconfirmed; scraping default is PROHIBITED)

**Implication**: No integration pathway exists until a commercial agreement
is established or a documented API program is confirmed.

### Finding 3 — Data Provenance Chain Unclear

Scores24 is itself an aggregator. It does not originate the data it displays —
it aggregates from upstream sources. This creates a provenance risk:

- The original source tier of Scores24 data is unknown
- Redistribution rights may not flow from the original source through Scores24
- Even if Scores24 permits access, the original data owner may prohibit redistribution

**Implication**: A licensing agreement with Scores24 alone may not be sufficient.
Sports OS would need confirmation that Scores24 has the right to sublicense
the data for Sports OS's intended use (derived intelligence, public-facing picks).

### Finding 4 — No Historical Reliability Data

Sports OS has no historical uptime or reliability data for Scores24 as an
API data source. The source's consumer-facing website uptime is not a reliable
proxy for API-level reliability under production load.

**Implication**: Even if licensing is resolved, a 90-day evaluation period
with parallel validation against The Odds API would be required before
Scores24 data could be used in production picks.

---

## Classification Decision: ORANGE

**ORANGE** means: Requires owner approval before admission. Cannot be admitted
by operator alone. Current status is monitoring-only.

**Rationale**: The legal and licensing dimension scores 2.0. One confirmed
LOW dimension triggers ORANGE per the risk framework.

**What ORANGE means in practice**:
- Scores24 may NOT be scraped
- Scores24 data may NOT be included in any pick evidence chain
- Scores24 may NOT appear in the Source Registry as an ADMITTED source
- Scores24 MAY be monitored for potential partnership interest
- A formal licensing inquiry MAY be initiated by the owner

---

## Path to GREEN Classification

Scores24 could reach GREEN classification if the following are resolved:

| Step | What is required |
|---|---|
| 1. ToS confirmation | Written confirmation that automated data access is permitted |
| 2. API documentation | Official API documentation or commercial license terms |
| 3. Provenance confirmation | Confirmation Scores24 can sublicense data for Sports OS's use case |
| 4. License signed | Formal commercial license agreement executed |
| 5. Reliability evaluation | 90-day parallel evaluation against The Odds API |
| 6. Owner approval | Owner approval required even after all above are satisfied |

Only after ALL six steps are complete may Scores24 be reclassified and admitted.

---

## Path to RED Classification

Scores24 would be reclassified RED if:
- Their ToS is confirmed to prohibit automated access
- Their data is confirmed to come from sources that prohibit redistribution
- A legal review identifies liability risk in their data licensing model
- A formal partnership inquiry is declined or terms are unacceptable

If reclassified RED, Scores24 would be moved to the hard-ban register in
`docs/audit/piracy-malware-do-not-use-register.md` Section 3.

---

## Current Status: Monitoring Only

Until the ToS and licensing questions are resolved, Scores24 is monitoring-only.
This means:

- The Sports OS team may manually visit Scores24 as end users
- The Sports OS team may initiate a commercial licensing inquiry
- No automated access of any kind is permitted
- No Scores24 data may enter any Sports OS data pipeline

**Monitoring notes**: If Scores24 launches an official commercial API program
or updates their ToS to clarify automated access, update this document and
re-evaluate the classification.

---

## Alternative Sources for the Same Data

Scores24's primary value would be as a supplementary scores and stats source.
Current approved alternatives:

| Need | Approved source |
|---|---|
| Odds and lines | The Odds API (T2, GREEN, licensed) |
| Official scores | League official feeds (T1, GREEN) |
| Game schedules | The Odds API + league feeds |
| Stats (future) | Sportradar or Stats Perform (T2, YELLOW, requires license) |

There is no current gap in Sports OS data coverage that requires Scores24.
The monitoring-only classification does not create a data deficit.

---

## Source Evidence

This review was completed as part of Prompt 4 Final Wave documentation.
The classification is based on:
- Publicly available information about Scores24's Terms of Service
- Absence of a documented commercial API program
- Application of the Source Risk Framework from `docs/audit/final-wave-source-risk-register.md`
- Legal review guidance completed 2026-05-20

This review does not constitute a legal opinion. The owner should consult
with a lawyer before initiating any formal licensing inquiry with Scores24.

---

## Forbidden Actions

- Do NOT scrape Scores24 under any circumstances
- Do NOT include Scores24 data in any pick evidence chain
- Do NOT admit Scores24 to the Source Registry without completing all six
  Path to GREEN steps and obtaining owner approval
- Do NOT represent Scores24 as a data source in any public methodology disclosure
- Do NOT reclassify Scores24 without updating this document

---

## Approval Gates

| Action | Who approves |
|---|---|
| Initiating a formal licensing inquiry | Owner |
| Admitting Scores24 after ToS confirmed | Owner (required even with confirmed ToS) |
| Reclassifying from ORANGE to RED | Operator (document reason) |
| Reclassifying from ORANGE to GREEN | Owner (requires all 6 steps complete) |

---

## Validation Expectations

- Source Registry contains no ADMITTED entry for Scores24
- No data ingestion adapter references Scores24 endpoints
- No code in `packages/data-ingestion/` or `workers/` makes requests to Scores24
- This document is updated if Scores24's status changes

---

## Codex Audit Requirements

1. Confirm no code in `packages/data-ingestion/` or `workers/` references
   Scores24 domain names or endpoints
2. Confirm Source Registry has no ADMITTED record for Scores24
3. Confirm `docs/audit/piracy-malware-do-not-use-register.md` Section 3
   entry for Scores24 matches the ORANGE status here (no escalation to RED
   without updating this document first)
4. Report any Scores24 scraping code as a P1 violation
