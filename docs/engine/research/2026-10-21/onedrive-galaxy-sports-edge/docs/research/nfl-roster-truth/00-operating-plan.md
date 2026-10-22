# NFL Roster Truth Operating Plan

As of: 2026-06-09

## Mission Interpretation

Create a multi-source NFL roster truth system so player, coach, staff, team, status, number, position, transaction, and assignment facts are current, source-backed, conflict-aware, and resilient when a source lags or fails.

## User-Reported Stale Examples

- Najee Harris listed as Pittsburgh is a stale-data smoke test, not a one-off fix.
- Rico Dowdle listed as Dallas is a stale-data smoke test, not a one-off fix.

## Safety Rules

- No production database mutation.
- No deploys.
- No secrets.
- No high-volume scraping.
- No private, paywalled, login-gated, or prohibited sources.
- No hardcoded player-team patching.
- Unknown or needs-review beats confidently wrong.
- Public surfaces should not expose source weighting or founder-only reconciliation methods.

## No-Duplicate Rules

Existing freshness, source QA, player page, data outage, analytics, and public stale-warning cards are extension anchors. New builds must be roster-specific, staff-specific, transaction-specific, or validation-specific.

## Source Verification Strategy

Use Tier 1 official team/NFL pages first, Tier 2 maintained open data for IDs/history/corroboration, Tier 3 sports media/fantasy only as fallback or conflict signal, and Tier 4 news/transaction sources as review triggers.

## Repo Audit Plan

Commands planned or equivalent:

- git rev-parse --show-toplevel
- git branch --show-current
- git log --oneline --decorate --all -n 20
- rg --files
- Get-ChildItem docs/app/components/lib/data/scripts/prisma/reports
- rg for roster, player, team, coach, staff, depth, transaction, source, stale, confidence, Najee, Rico, Harris, Dowdle

## Architecture Plan

Adapters -> raw snapshots -> normalized records -> fact evidence -> reconciliation -> truth scoring -> conflict/stale records -> public-safe output -> founder-only cockpit.

## Implementation Plan

Docs-first in this workspace. Later code should be disabled-by-default or read-only until sources, terms, app paths, and production data boundaries are approved.

## Testing Plan

Design roster:audit, roster:verify, roster:diff, roster:conflicts, roster:stale, and test:roster commands. Smoke tests for Najee Harris and Rico Dowdle must compare rendered facts against current evidence fixtures.

## Rollback Plan

Generated docs/cards can be removed without production impact. Later code must use feature flags, read-only scripts, snapshots, and reversible migrations.

## Human Approval Gates

Legal/TOS source approval, any production DB writes, any live cron/scheduled fetch, any paid API, any source requiring credentials, any public freshness UI, any staff data display, and any production deploy.

## Workstreams

AGENT 0 - Coordinator / Final Integrator  
AGENT 1 - Existing Repo Roster Auditor  
AGENT 2 - Existing Build / Docs Duplicate Auditor  
AGENT 3 - Source Discovery / Official Sources  
AGENT 4 - Source Discovery / Open Data Sources  
AGENT 5 - Source Discovery / Sports Media Sources  
AGENT 6 - Player Identity / ID Resolution Architect  
AGENT 7 - Team / Roster / Status Normalization Architect  
AGENT 8 - Coach / Staff / Trainer / Football Ops Architect  
AGENT 9 - Transaction / Roster Movement Architect  
AGENT 10 - Conflict Resolution / Confidence Scoring Architect  
AGENT 11 - Data Engineering / Ingestion Architect  
AGENT 12 - Validation / Testing / Regression Architect  
AGENT 13 - Product Surface Auditor  
AGENT 14 - Founder-Only Accuracy Cockpit Architect  
AGENT 15 - Legal / TOS / Privacy Reviewer  
AGENT 16 - Claude Code Build Packet Generator  
AGENT 17 - Final Critic / Accuracy Gate Reviewer

## Files Expected

00 through 18 phase files, source inventory, source risk register, existing build ledgers, Claude build queue, card files, source ledger, and this generator.

## No-Go Areas

Live DB writes, deploys, secrets, unapproved scrapes, private staff data, source weighting disclosure, and one-off player patches.

