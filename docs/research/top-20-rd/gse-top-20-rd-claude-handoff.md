# GSE Top 20 R&D Claude Handoff

## Mission

Turn the top-20 R&D packet into executable product specs and narrow repo changes for Galaxy Sports Edge. Treat GSE as an NFL decision operating system, not a generic sports site.

## Startup Procedure

1. Confirm repo root is C:\Users\Garrett\Sports.
2. Run git status and preserve existing user/Codex changes.
3. Read this file, gse-top-20-rd-master-plan.md, gse-top-20-rd-build-queue.jsonl and the specific area brief for the task.
4. Before code edits, inspect the actual implementation surface named by the task card.
5. If a task touches external data, entitlements, public claims, model scoring, billing or migrations, stop at a proposal unless the task explicitly authorizes implementation.

## Operating Laws

- Evidence first. Every claim must tie to SourceSnapshot, source hierarchy, fixture evidence or an explicit TODO.
- No silent feature invention. If a source, API or route does not exist, say so and create a proposal.
- Public surfaces are stricter than cockpit surfaces.
- LLM output is never truth. Claude may phrase source-backed facts but cannot invent stats, odds, injuries, projections or performance numbers.
- Keep formula, provider cost, source-risk and shadow-factor information founder-only unless a task explicitly says otherwise.
- Use user-uploaded or approved provider data for optimizer work. Do not scrape platforms.
- Preserve brand-safety rules around tout language, medical claims, trueEV, Kelly, staking and win-rate claims.

## Recommended Phase Plan

Phase 0 - Proof and prep:
- Run repo reality check
- Read existing docs/brain, docs/research and docs/brand-safety-rules-v2.md
- Confirm current implementation files before editing
- Create or update docs/spec artifacts before code

Phase 1 - Foundations:
- RD20-01 Source-Provenanced World Model
- RD20-02 What Changed Engine
- RD20-10 Entitlement Architecture
- RD20-12 Trust UX
- RD20-20 Cross-Domain Website Polish

Phase 2 - User value:
- RD20-03 Scenario Lab
- RD20-04 GSE Optimizer
- RD20-05 Player Intelligence Cards
- RD20-09 Watchlists
- RD20-14 Weather Intelligence
- RD20-15 Injury Intelligence

Phase 3 - Trust and moat:
- RD20-08 Autopsy and Calibration
- RD20-11 Founder-Only Layer
- RD20-13 News Claim Cards
- RD20-17 Market Intelligence

Phase 4 - Expansion and growth:
- RD20-06 Original Analog Ratings
- RD20-16 Best Ball Layer
- RD20-18 Retention Lifecycle
- RD20-19 Brand Voice and Content OS

## First 12 Claude Tasks

1. RD20-01-01 - Define provenance interfaces.
2. RD20-01-02 - Map current SourceSnapshot to provenance contract.
3. RD20-02-01 - Define ChangeEvent schema and severity taxonomy.
4. RD20-12-01 - Create trust state design tokens and copy list.
5. RD20-10-01 - Create FeatureRegistry and TierProjection spec.
6. RD20-20-01 - Create route-by-route website quality audit template.
7. RD20-03-01 - Create ScenarioState and ScenarioOverride type spec.
8. RD20-04-01 - Create salary CSV import spec with validation errors.
9. RD20-05-01 - Draft PlayerIntelligenceCard data interface.
10. RD20-14-01 - Create stadium metadata fixture list schema.
11. RD20-15-01 - Define AvailabilityState and PracticeTrend types.
12. RD20-08-01 - Define AutopsyRecord schema and categories.

## Completion Definition

A Claude task is complete only when:

- The target file paths are named.
- The source and guardrail dependencies are named.
- The acceptance criteria from the task card are satisfied or explicitly blocked.
- Any tests, lint, typecheck or docs-only validation are reported.
- No unrelated dirty work is reverted or hidden.
