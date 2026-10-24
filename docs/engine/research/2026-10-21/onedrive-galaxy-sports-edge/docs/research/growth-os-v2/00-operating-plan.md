# GSE / GSN Growth OS V2 Operating Plan

As of: 2026-06-09

## Mission Interpretation

This mission builds a non-duplicative growth operating system for Galaxy Sports Edge / GSN. The goal is not to create another brainstorm. The goal is to inventory what already exists, fingerprint prior build ideas, classify overlap, then produce only net-new, extension, dependency, replacement, or review-needed work that can be executed by Claude Code with minimal human input.

GSE / GSN is treated as a sports intelligence product, not a sportsbook. Promotions and affiliate ideas are research-only until legal, compliance, founder, and partner approvals exist.

## Safety Rules

- Do not change production app code.
- Do not create live affiliate links.
- Do not launch sportsbook, casino, DFS, or fantasy promotions.
- Do not imply GSE is a sportsbook.
- Do not encourage irresponsible gambling.
- Do not target minors.
- Do not collect unnecessary sensitive data.
- Do not expose founder-only methods publicly.
- Do not copy competitor copy, protected UX, proprietary code, or licensed content.
- Do not fabricate legal requirements, affiliate availability, partner economics, pricing, or claims.
- Do not install untrusted software.
- Do not run risky scripts.
- Do not expose secrets.

## No-Duplicate Rules

Every new opportunity and build must be classified before it is accepted:

- DUPLICATE: same goal, same user value, same surface, same implementation path. Do not recreate.
- VARIANT: same goal but different audience, tier, or surface. Merge if possible; otherwise create a child build.
- EXTENSION: existing build exists but lacks a major layer. Create child build with parent_id.
- DEPENDENCY: build must happen before or after existing work. Link dependency_ids.
- REPLACEMENT: better version of old idea. Mark supersedes_id.
- CONFLICT: contradicts legal, trust, brand, or product direction. Flag founder review.
- NET_NEW: materially distinct value, surface, data model, or business system. Create new build.
- UNCERTAIN_REQUIRES_REVIEW: separated from the main queue.

## Repo Audit Plan

The local workspace resolves Git upward to `C:\Users\Garrett`, so all commands must stay scoped to `C:\Users\Garrett\OneDrive\Documents\Galaxy Sports Edge`. Avoid profile-wide Git operations and do not stage or commit anything.

Audit targets:

- `docs/`
- `reports/`
- `apps/`
- `_logs/`
- generated OSS leverage stacks
- build queue JSONL/markdown cards
- route/surface references in app files, if present

## Existing Build Inventory Plan

1. List existing docs and build queues.
2. Extract build cards, BUILD/NEXT ids, Claude prompts, roadmaps, and opportunity ideas.
3. Create ledgers for builds, docs, and product surfaces.
4. Generate normalized fingerprints from category, goal, surface, user value, and repo area.
5. Use the fingerprint ledger as the duplicate gate for every new build candidate.

## External Research Plan

External research starts only after existing inventory and duplicate rules exist. Research categories include monetization, affiliate/promotions, lifecycle, support, sales, content, analytics, AI automation, organizational design, tooling, compliance, and future risk. Prefer official sources and regulator/affiliate-program pages over secondary commentary.

## Scoring Model

Each opportunity receives 1-5 scores for:

- customer value
- business value
- revenue value
- engagement value
- retention value
- trust value
- support value
- speed to value
- founder leverage
- moat value

Risk fields:

- legal risk: LOW / MEDIUM / HIGH
- brand risk: LOW / MEDIUM / HIGH
- technical risk: LOW / MEDIUM / HIGH
- support burden: LOW / MEDIUM / HIGH
- duplicate risk: LOW / MEDIUM / HIGH / UNCERTAIN

## Workstreams / Agents

- AGENT 0 - Coordinator / Final Integrator
- AGENT 1 - Existing Build Ledger Auditor
- AGENT 2 - Existing Route / Surface Auditor
- AGENT 3 - Existing Monetization Auditor
- AGENT 4 - Existing Docs / Research Auditor
- AGENT 5 - Duplicate Detection / Build Fingerprint Analyst
- AGENT 6 - Monetization Analyst
- AGENT 7 - Promotions / Affiliate / Sportsbook / Casino Compliance Analyst
- AGENT 8 - Customer Support / Customer Success Analyst
- AGENT 9 - Brand Voice / Human Copy / Verbiage Auditor
- AGENT 10 - Engagement / Time-on-Site Analyst
- AGENT 11 - Retention / Lifecycle Analyst
- AGENT 12 - Content / SEO / Editorial Analyst
- AGENT 13 - Sales Psychology / Complex Sales Analyst
- AGENT 14 - Financial Model / Unit Economics Analyst
- AGENT 15 - Data Engineering / Product Analytics Analyst
- AGENT 16 - AI Automation / Agent Workflow Analyst
- AGENT 17 - Organizational Design / Operating Cadence Analyst
- AGENT 18 - Contest / Community / Viral Loop Analyst
- AGENT 19 - Tooling / Open-Source / SaaS Replacement Analyst
- AGENT 20 - Future Risk / Forecasting Analyst
- AGENT 21 - Claude Code Build Packet Generator
- AGENT 22 - Legal / Privacy / Compliance / Responsible Gambling Reviewer
- AGENT 23 - Final Critic / No-Duplicate Gate Reviewer

Native subagents are available and will be used for narrow read-only sidecar audits. If they cannot finish in time, their workstreams are emulated with files in this folder.

## Output Files

Required phase files:

- 00-operating-plan.md
- 01-existing-work-inventory.md
- 02-current-product-surface-audit.md
- 03-no-duplicate-gate.md
- no-duplicate-rules.md
- 04-total-growth-research.md
- 05-promotions-affiliate-system.md
- 06-monetization-system.md
- 07-customer-support-success-system.md
- 08-brand-voice-human-copy-auditor.md
- gse-brand-voice-rules.md
- human-copy-audit-checklist.md
- 09-engagement-time-on-site-system.md
- 10-retention-lifecycle-system.md
- 11-content-editorial-engine.md
- 12-sales-partnership-system.md
- 13-financial-model-unit-economics.md
- 14-data-engineering-product-analytics.md
- 15-ai-automation-agent-workflow-system.md
- 16-org-design-operating-cadence.md
- 17-future-issue-forecast.md
- 18-tooling-saas-expansion.md
- 19-opportunity-graph.md
- opportunity-graph.json
- 21-build-merge-plan.md
- 22-final-decision-matrix.md
- 23-final-report.md
- 24-final-critic-review.md
- build queue files under `claude-build-queue/`

Ledger files:

- existing-build-ledger.jsonl
- existing-build-ledger.csv
- existing-doc-ledger.csv
- existing-surface-ledger.csv
- growth-opportunity-inventory.csv
- affiliate-partner-inventory.csv
- affiliate-compliance-risk-register.md
- uncertain-builds-for-review.jsonl

## Merge Strategy

- Existing identical builds are referenced, not duplicated.
- Extensions receive parent_id links.
- Variants receive merge notes and child relationships.
- Replacements receive supersedes_id.
- Uncertain items are excluded from the main queue.
- New build cards live only under `docs/research/growth-os-v2/claude-build-queue/cards/`.

## Claude Code Handoff Format

Each card includes duplicate gate, category, goal, repo context, public/internal surfaces, customer/business value, legal/compliance boundary, data/analytics needs, brand copy needs, implementation plan, tests, acceptance criteria, rollback, priority, difficulty, dependencies, risks, and a ready-to-paste Claude Code prompt.

## Approval Gates

Founder approval:

- founder-only methodology exposure
- pricing, billing, Stripe, or production deployment
- public AI/RAG launch
- live customer data import
- promotions tab launch
- legal copy changes

Legal/compliance approval:

- sportsbook, casino, DFS, or fantasy affiliate links
- geo/state availability rules
- responsible gambling language
- affiliate disclosures
- claims about accuracy, outcomes, or financial value

## No-Go Areas

- live affiliate or betting links
- production env writes
- customer data import
- public gambling encouragement
- public methodology leakage
- copied competitor copy or code
- unapproved paid tools
- duplicated build-card noise

## Commands Planned

- scoped Git and file inventory commands
- `rg --files` and `rg -n` across docs/apps/reports only
- JSONL/CSV generation with local scripts
- web research after duplicate gate exists
- secret-pattern scan before final response
- JSONL validation before final response
