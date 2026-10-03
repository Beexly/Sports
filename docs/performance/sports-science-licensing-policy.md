# Sports OS — Sports Science Licensing Policy

**Status**: Doctrine. Binding on all sports science data acquisition.
**Source**: Prompt 3 v2 — Wave 3 Line-Level Integration
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Cross-reference**:
- `docs/performance/biomechanics-modality-taxonomy.md` — per-modality detail
- `docs/performance/sports-science-evidence-vault.md` — vault admission
- `docs/source-providers/commercial-crawling-approval-gate.md` — crawling gate
- `docs/audit/piracy-malware-do-not-use-register.md` — ToS violation register
- `docs/audit/final-wave-source-risk-register.md` — source risk register

---

## Purpose

Sports science data — biomechanics, radar, tracking, wearable, and video
analytics — sits at the intersection of multiple overlapping legal and
contractual regimes: copyright law, database rights, collective bargaining
agreements, athlete consent requirements, and commercial licensing programs.

This policy is the single authoritative reference for which sports science
data types Sports OS may use, under what conditions, and what approval is
required before any ingestion, derivation, or publication.

**Default position: ALL sports science data is PROHIBITED until licensed.**

Unlike standard web data, the "it's publicly available" argument does not
confer commercial use rights for sports science data. Each data type below
has its own legal framework.

---

## Source Evidence from Line Audit

Wave 3 audit identified the following licensing frameworks applicable to
sports science data in the Sports OS context:

**Open-source tools (code only — not data)**:
- YOLO (Ultralytics): MIT license — model code is free, but input data rights are separate
- MediaPipe (Google): Apache 2.0 — model code is free, same input data issue
- OpenSim: Apache 2.0 — biomechanics simulation code is free; clinical data separate
- BTK / ezc3d: MIT/Apache — C3D file parsing code is free; file contents are licensed separately
- pybaseball: MIT — code is free; it wraps Baseball Savant which has its own terms

**Data with commercial use complexity**:
- OpenBiomechanics Project (OBP): CC BY 4.0 for data + Driveline's additional
  commercial restriction on derivative commercial products
- Baseball Savant (Statcast): Public endpoint + MLB's commercial data licensing terms
  are separate — scraping ≠ licensed commercial use
- Sports Reference: Database display license, not commercial redistribution
- Hudl: Subscriber data use terms — analysis outputs may not be redistributed

**Data requiring explicit commercial license**:
- Trackman, Rapsodo: Commercial license required
- Catapult GPS, STATSports: Commercial license + team partnership
- Next Gen Stats, Second Spectrum: League program enrollment + commercial license
- Hawkeye: Commercial license
- TRACAB: Commercial license

**Data with athlete rights overlay**:
- Any biometric or wearable data: CBA consent framework applies by league
- GPS positional data: Privacy/data protection law (GDPR, CCPA) may apply
  to individual athlete movement profiles

---

## License Classification Registry

### Category A — Code-Only Open Source (Data Rights Separate)

| Tool | Code License | Data Use Status |
|---|---|---|
| YOLO (Ultralytics) | MIT | Input data rights are separate; do not run on unlicensed footage |
| MediaPipe | Apache 2.0 | Same |
| OpenPose | Non-commercial academic | Commercial use of code requires CMU license |
| OpenSim | Apache 2.0 | Clinical/research data separate |
| BTK / ezc3d | MIT/Apache | C3D file data is licensed separately |
| pybaseball | MIT | Wraps Baseball Savant; MLB commercial terms apply |

**Rule**: Category A tools may be used in production. Their input data
must independently satisfy the applicable license category below.

---

### Category B — Open Data with Research Restrictions

| Source | License | Commercial Use |
|---|---|---|
| OpenBiomechanics Project (OBP) | CC BY 4.0 + Driveline addendum | PROHIBITED without written Driveline commercial agreement |
| Driveline Baseball R&D datasets | Driveline terms | PROHIBITED commercially without written agreement |
| Academic biomechanics datasets | Varies (most CC BY NC) | PROHIBITED commercially |
| Public sports research datasets | Varies | Review required per dataset |

**Rule**: Category B sources require a written commercial agreement with
the publisher before any commercial use. "Commercial use" includes: ingestion
into a prediction engine, inference from the data, or citing the data in
commercial content — even if the output is a summary and not raw data.

**Required documentation**:
```
Source: [full name and URL]
License SPDX: [e.g., CC-BY-4.0]
Commercial use restriction: [quote the relevant clause]
Written commercial agreement obtained: [YES | NO — BLOCKED if NO]
Agreement date: [ISO date]
Agreement contact: [publisher contact]
Owner approval: [YES | NO]
```

---

### Category C — Licensed Commercial APIs (Standard commercial path)

| Source | Program | Access path |
|---|---|---|
| Trackman | Commercial API license | Contact Trackman Sports |
| Rapsodo | Commercial API license | Contact Rapsodo |
| FlightScope | Commercial API license | Contact FlightScope |
| Catapult GPS | Commercial account + license | Contact Catapult Sports |
| STATSports | Commercial account + license | Contact STATSports |
| Hawkeye | Commercial license | Contact Sony (Hawkeye owner) |
| TRACAB (ChyronHego) | Commercial license | Contact ChyronHego |

**Rule**: Category C sources require a signed commercial agreement before
any data is ingested. The agreement must explicitly permit:
- Ingestion into a commercial prediction engine
- Derivation of signals for commercial product use
- Internal storage (not redistribution of raw data)

**Required documentation** (per commercial-crawling-approval-gate.md Gate 4):
```
Source: [name]
License type: Commercial API agreement
Agreement signed: [YES | NO — BLOCKED if NO]
Agreement date: [ISO date]
Permitted uses: [ingestion | derivation | internal storage]
Redistribution of raw data: [PERMITTED | PROHIBITED]
Attribution requirements: [what must appear in public content]
Cost per unit/month: [for budget planning]
Owner approval: [YES | NO]
```

---

### Category D — League Official Programs (Highest trust, highest barrier)

| Source | Program | Access path |
|---|---|---|
| Statcast / MLBAM | MLB official data delivery | mlb.com/data-partnerships |
| Next Gen Stats | NFL data program | nfl.com/data-partnerships |
| Second Spectrum | NBA data program | Via NBA league office |
| Sportradar | Multiple leagues | Sportradar.com commercial |
| Stats Perform (Opta) | Multiple leagues | statsperform.com commercial |

**Rule**: Category D programs typically require:
1. Application to the league data program
2. Commercial license agreement with the league or their data partner
3. Revenue share or per-use fee schedule
4. Attribution requirements in all public content
5. Prohibitions on redistribution of raw data
6. Annual review / renewal terms

These are significant commercial commitments. Each requires owner approval
before any application or negotiation begins.

---

### Category E — League Broadcasting / Film Rights

| Right type | Holder | Access path |
|---|---|---|
| NFL broadcast footage | CBS/Fox/NBC/ESPN + NFL Films | Contact NFL Films; no public API |
| MLB broadcast footage | Regional networks + MLB Advanced Media | Contact MLBAM |
| NBA broadcast footage | Turner/ESPN + NBA | Contact NBA content licensing |
| NCAA footage | ESPN/Fox + conferences | Complex; contact relevant conference |

**Rule**: Category E rights require a separate broadcast or content license.
The existence of a Category D data license does NOT grant broadcast or video rights.
These are distinct legal frameworks. Computer vision analysis of broadcast footage
requires explicit authorization under the broadcast rights — not just a data license.

---

### Category F — CBA and Athlete Consent Requirements

Some data requires more than a commercial data license. If the data relates
to individual athlete physiology, movement, or biometrics, applicable
collective bargaining agreements may govern consent requirements independently
of any commercial license.

| League | Governing body | Relevant CBA provision |
|---|---|---|
| NFL | NFLPA | Player tracking data use and consent |
| MLB | MLBPA | Biometric data use |
| NBA | NBPA | Player tracking data sharing |
| MLS | MLSPA | Varies by CBA cycle |
| International soccer | FIFPRO | Data use for commercial AI products |

**Rule**: Before ingesting any individual-level biometric or wearable data,
owner's legal counsel must provide a written determination on whether athlete
consent is required under the applicable CBA, and if so, how to obtain it.
This determination cannot be self-certified by the operator.

---

## Master License Status Registry

This registry must be kept current. Every entry must be verified before
the corresponding data type is admitted to the Evidence Vault.

```
Category A tools: Available — code licenses clear. Input data rights tracked separately.

Category B (OBP):
  Status: RESEARCH ONLY
  Commercial agreement: NOT OBTAINED
  Action required: Written Driveline commercial agreement before any commercial use

Category B (Driveline R&D):
  Status: RESEARCH ONLY
  Commercial agreement: NOT OBTAINED
  Action required: Written Driveline commercial agreement before any commercial use

Category C providers: NOT LICENSED
  All providers (Trackman, Rapsodo, Catapult, STATSports, Hawkeye, TRACAB):
  Status: NO AGREEMENT
  Action required: Owner decision + commercial negotiation per provider

Category D programs: NOT ENROLLED
  MLB MLBAM, NFL NGS, NBA Second Spectrum, Sportradar:
  Status: NO ENROLLMENT
  Action required: Owner decision + program application + commercial negotiation

Category E (broadcast): NOT LICENSED
  Status: NO AGREEMENT — All broadcast video analysis prohibited
  Action required: Owner decision + broadcast rights negotiation (V3+ only)

Category F (CBA): NOT ASSESSED
  Status: Legal determination not obtained
  Action required: Owner's legal counsel review before any biometric ingestion
```

---

## Admission Decision Tree

```
Is this sports science data?
  ↓ YES
Does Sports OS have a written commercial agreement with the publisher?
  ↓ NO → BLOCKED. Do not ingest. Escalate to owner.
  ↓ YES → Continue
Does the agreement permit commercial prediction engine use?
  ↓ NO → BLOCKED. Agreement does not cover this use case.
  ↓ YES → Continue
If biometric/wearable: Is there a CBA consent determination from legal counsel?
  ↓ NO → BLOCKED. Legal determination required first.
  ↓ YES → Continue
Is the source tier T1 or T2?
  ↓ NO (T3 or lower) → Internal context only. publicCitation: false required.
  ↓ YES → Continue to Evidence Vault admission
```

---

## Forbidden Actions

- Do NOT ingest OBP or Driveline data commercially without written agreement
- Do NOT run computer vision on broadcast footage without broadcast license
- Do NOT enroll in any league data program without owner approval
- Do NOT admit Category B data with `publicCitation: true`
- Do NOT self-certify CBA consent compliance without legal determination
- Do NOT use OpenPose commercially without CMU license
- Do NOT cite sports science data in any public content without T1/T2 source
- Do NOT store raw biometric values in any database table

---

## Approval Gates

| Action | Approving party |
|---|---|
| Beginning negotiations with any Category C provider | Owner |
| Applying to any Category D program | Owner |
| Initiating any Category E broadcast rights discussion | Owner |
| Using any Category B source commercially | Owner + written publisher agreement |
| Assessing CBA consent requirements | Owner + legal counsel |
| Admitting any sports science source to Evidence Vault | Owner (license verified) |

---

## Codex Audit Requirements

1. Confirm no Category B (OBP/Driveline) data admitted without written commercial agreement
2. Confirm no Category C/D data admitted without signed commercial agreement on file
3. Confirm no broadcast footage (Category E) processed by any CV model
4. Confirm all sports science evidence items have `licenseVerified` status in registry
5. Confirm Master License Status Registry is current (matches actual agreements on file)
6. Report any sports science data in the Evidence Vault without a corresponding
   registry entry as P0
