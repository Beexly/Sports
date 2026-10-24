# Final Report - NFL Roster Truth System

As of: 2026-06-09

## 1. Executive Summary

GSE needs a multi-source NFL roster truth layer before public roster/person facts can be trusted. The core recommendation is a canonical fact system with SourceEvidence, ConfidenceScore, ConflictRecord, stale detection, transaction reconciliation, and founder-only audit visibility.

## 2. Current Roster Data Failure Class

The failure is not one stale player. It is a system class: static or weakly sourced player team/status/number/position/staff data can drift while public surfaces continue to render it as current.

## 3. User-Reported Stale Examples

Najee Harris listed as Pittsburgh and Rico Dowdle listed as Dallas are regression smoke tests. They should not be patched by name. They should fail validation whenever current source evidence disagrees with rendered player facts.

- Rico Dowdle: current-source check found official Steelers roster evidence listing Rico Dowdle as RB #13, plus an official Steelers signing article and NFL.com player context for Pittsburgh. A Dallas listing is stale; a Carolina-only 2025 context is historical and should not render as current.
- Najee Harris: current-source check found Chargers 2026 free-agent context and public reports describing him as a free agent after a one-year Chargers contract and Achilles injury. A Pittsburgh current-team listing is stale. If no fresh official roster/signing evidence exists, canonical status should be FREE_AGENT or NEEDS_REVIEW rather than a guessed team.

## 4. Existing Repo Roster System Found

No complete app roster system was visible in this workspace. Existing docs define source freshness, stale warnings, player pages, Player Lab, data-source outage handling, and sports data contract tests, but not a roster truth engine.

## 5. Existing Docs/Builds Found

See 01-existing-work-inventory.md and existing-roster-build-ledger.*.

## 6. Duplicate Risks Found

Do not recreate generic source freshness, stale-data warning, source outage, source transparency, analytics contract, or player page content work. Extend those with NFL roster facts and gates.

## 7. Current Product Surfaces At Risk

Public player cards, Player Lab, GSE Rating, team pages, search/autocomplete, content/briefs, API endpoints, mock/demo/seed files, and founder cockpit.

## 8. Source Inventory Summary

Official NFL/team sources are Tier 1. nflverse is Tier 2 for IDs/history/open-data corroboration. ESPN/CBS/Yahoo/FOX/PFR/Sleeper are fallback/corroboration only after legal review.

## 9. Source Proof Hierarchy

Official current source wins unless stale or contradicted by newer official transaction evidence. Open data and media sources increase confidence or trigger review. Unknown beats wrong.

## 10. Person Universe Model

Includes active players, reserves, practice squad, IR/PUP/NFI/suspended/exempt/free agent/retired states, coaches, coordinators, public football ops, and public staff only.

## 11. Player Identity Resolution Plan

Use external IDs where available, aliases, fuzzy matching with hard no-merge rules, and manual review for rookies/UDFAs/staff/no-ID cases.

## 12. Team/Status/Position Normalization Plan

Normalize team aliases, roster status taxonomy, position taxonomy, depth role taxonomy, and source-specific raw values.

## 13. Coach/Staff/Trainer Plan

Official team staff pages and media guides preferred. Public professional role data only. No private personal or medical inference.

## 14. Transaction Tracking Plan

Transactions can override older roster pages temporarily, but must create NEEDS_REVIEW until the roster evidence converges.

## 15. Multi-Source Ingestion Architecture

Adapters -> raw snapshots -> normalized records -> evidence -> reconciliation -> confidence -> conflicts/stale records -> public-safe output -> founder cockpit.

## 16. Truth Scoring/Conflict Resolution

Each fact gets canonical_value, confidence_score, truth_status, evidence_ids, official_source_count, latest_source_at, conflict_count, and stale_source_count.

## 17. Data Quality Validation Plan

Read-only commands: roster:audit, roster:verify, roster:diff, roster:conflicts, roster:stale, test:roster.

## 18. Founder-Only Roster Cockpit Plan

Show source freshness, conflicts, stale facts, changed players, staff changes, source failures, parser errors, manual review, and deploy blockers.

## 19. Public/Private Boundary

Public sees fact, qualification, and last verified if safe. Founder/admin sees evidence, source weights, conflict reasons, and parser details.

## 20. Legal/TOS/Privacy Cautions

Legal review required before automated scraping/fetching from media/fantasy sources. Staff data must remain public professional role only.

## 21. Implementation Changes Made

Docs and build packet generator only. No production app code, DB mutation, source scraping, deploy, or secrets.

## 22. Build Queue Summary

68 executable NFL roster truth build cards created.

## 23. P0 Fixes

Source inventory/TOS, adapter contract, official/nflverse adapter plans, ID model, team/status/position normalization, evidence storage, truth scoring, conflict/stale detection, transaction reconciliation, player surface remediation, search guard, cockpit, validation CLI, dynamic smoke tests, CI gate.

## 24. P1 Fixes

Staff source map, depth chart evaluation, public freshness labels, content linter, team page rendering, nightly/postdeploy audit plans.

## 25. Long-Term Architecture

Move from static roster facts to evidence-backed canonical facts with source snapshots, reconciliation, confidence, and auditability.

## 26. Commands Run

Attachment read; git/workspace shape commands; file count commands; rg roster/source audit; official/current-source web research; generator run; JSONL validation; duplicate-gate validation; safety/secret scan.

## 27. Tests Run

Generator run passed. JSONL parse passed for 68 rows. Build count passed for 68 cards. Duplicate-gate coverage passed with 0 missing rationales and 0 duplicate IDs. Safety/secret scan returned no matches. No app typecheck/lint/tests were run because no full app/package source tree is visible in this workspace.

## 28. Files Created

See docs/research/nfl-roster-truth and reports/codex/generate-nfl-roster-truth.mjs.

## 29. Unknowns

Real shipping clone app files, production roster data path, actual rendered stale pages, source TOS approvals, official adapter feasibility, current paid/licensed data providers, and current production deployment gates.

## 30. Human Approvals Needed

Legal/TOS source approval, paid/licensed provider approval, any production DB write, any live scheduled fetch, any public source/freshness UI, staff data display, and deploy gates.

