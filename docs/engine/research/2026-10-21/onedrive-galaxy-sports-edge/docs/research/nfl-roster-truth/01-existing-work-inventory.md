# Existing Work Inventory And Duplicate Gate

As of: 2026-06-09

## Repo Shape

- Git root resolved to the user profile during prior checks, while the workspace root is C:\Users\Garrett\OneDrive\Documents\Galaxy Sports Edge.
- Workspace files scanned: 557.
- Visible root directories: docs, reports, apps, _logs, .git.
- This workspace exposes a docs/control lane. The apps directory exists, but the scan returned no app source files; root app/components/lib/data/scripts/prisma were missing. Product surfaces below are therefore mapped from prior research artifacts and must be re-audited in the real shipping clone before implementation.

## Existing Roster-Relevant Work

| ID | Title | Category | Status | Duplicate Use | Limitation |
| --- | --- | --- | --- | --- | --- |
| BUILD-GV2-020 | Receipts freshness badge system | source freshness | planned | EXTENSION | Not roster-specific and does not define official/fallback roster proof. |
| BUILD-GV2-021 | Player Lab what-changed feed | player surface | planned | EXTENSION | Needs roster transaction/freshness source before player movement can be trusted. |
| BUILD-GV2-053 | Player page content model | player page | planned | EXTENSION | No canonical roster truth API or evidence model defined. |
| BUILD-GV2-056 | Content refresh and freshness queue | stale content | planned | EXTENSION | Does not catch stale player team/number/status assignments. |
| BUILD-GV2-076 | Product analytics event contract | analytics | planned | EXTENSION | Needs roster audit events and data quality signals. |
| BUILD-GV2-081 | Privacy-safe identity resolution policy | identity | planned | EXTENSION | Not player/staff identity matching; can be extended for public sports persons. |
| BUILD-GV2-098 | Data source outage playbook | source outage | planned | EXTENSION | Needs roster provider failure modes and fallback confidence behavior. |
| BUILD-GV2-099 | Stale data public warning pattern | stale warning | planned | EXTENSION | Needs specific roster thresholds and fact-level evidence. |
| BUILD-070 | Stale source QA | QA | planned | EXTENSION | Not NFL-specific; no person/team/staff taxonomy. |
| BUILD-071 | Sports data contract tests | contract tests | planned | EXTENSION | Needs roster truth fact contracts and regression examples. |
| BUILD-112 | Source transparency snippets | public source transparency | planned | EXTENSION | Needs public/private boundary for roster evidence and source weighting. |
| EDGE-015 | Source freshness indicator spec | freshness indicator | planned | EXTENSION | Contest-specific; roster truth should reuse pattern but not duplicate. |
| EDGE-031 | Official stat provider policy | official source policy | planned | EXTENSION | Stats/scoring policy, not current roster/person truth. |

## Duplicate Classifications

- DUPLICATE: same goal and implementation already exists. Do not recreate.
- EXTENSION: existing work needs roster-specific source, evidence, conflict, validation, or product remediation layer.
- REPLACEMENT: stale/static roster approach should be superseded after review.
- DEPENDENCY: prerequisite for implementation.
- NET_NEW: distinct roster truth capability.
- UNCERTAIN_REQUIRES_REVIEW: app source not visible or classification cannot be proven.

## What Must Not Be Rebuilt

- Generic source freshness badge.
- Generic stale-data public warning.
- Generic data-source outage playbook.
- Generic product analytics event contract.
- Generic player page content model.
- Generic source transparency snippets.

## What Must Be Added

- NFL roster source hierarchy.
- Fact-level SourceEvidence.
- Identity resolution for players and staff.
- Team/status/position normalization.
- Transaction reconciliation.
- Conflict/stale truth scoring.
- Founder-only roster accuracy cockpit.
- CI/deploy gates for stale/mock/hardcoded roster data.

