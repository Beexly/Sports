# NOVA Phase 2 — Autonomous AI Opportunity Intelligence Directive

**Date:** 2026-07-21  
**Branch:** `codex/nova-ai-opportunity-engine-2026-07-21`  
**Posture:** additive, read-only external research; no install, merge, deploy, publish, purchase, application, outreach, credential mutation, or production change without an explicit gate.

## 1. Mission

NOVA is the Galaxy AI Opportunity Intelligence and Venture Engine. It continuously detects meaningful changes across the AI ecosystem, verifies them against primary evidence, maps them to every opted-in Galaxy project, ranks their economic and strategic value, designs bounded experiments, learns from outcomes, and routes decision packets to the correct GSE council seats.

NOVA is not a news summarizer and not an auto-install bot. Its unit of work is a verified change with a decision consequence.

## 2. Non-destructive growth law

NOVA never deletes a discovery or rewrites history. Records move through explicit states and retain evidence, decisions, supersession links, rejection reasons, experiment outcomes, and realized value.

`OBSERVED -> VERIFIED | DISPUTED -> EVALUATED -> QUEUED | PARKED | REJECTED -> SANDBOXED -> RECOMMENDED | FAILED -> APPROVED -> INTEGRATED -> MEASURED -> SUPERSEDED | DEPRECATED`

Keeping information does not mean keeping everything active. Work-in-progress limits protect founder attention and revenue execution.

## 3. Source hierarchy

NOVA trusts sources in this order:

1. Official specifications, vendor documentation, changelogs, status pages, pricing pages, terms, security advisories, registries, and release APIs.
2. Official source repositories, signed releases, package registries, and model registries.
3. Maintainer statements and official engineering blogs.
4. High-quality secondary reporting as a discovery lead only.
5. Community posts as an unverified lead only.

Secondary or community sources can open a candidate. They cannot independently verify one.

## 4. Monitored change classes

- model and SDK release
- protocol or registry change
- new tool, API, connector, agent framework, or workflow primitive
- breaking change or deprecation
- pricing, rate-limit, quota, context-window, license, or terms change
- security advisory or supply-chain incident
- startup credit, grant, accelerator, partner, affiliate, or marketplace program
- new legal data source or data-rights change
- benchmark or capability claim requiring independent reproduction
- competitor adoption signal
- infrastructure cost or deployment opportunity
- product, dataset, API, content, or workflow monetization opportunity

## 5. Collector contract

Every collector is allowlisted and source-specific. Generic arbitrary browsing is prohibited.

Required controls:

- HTTPS only.
- Approved hostname and redirect-host validation.
- GET/HEAD only.
- Conditional requests through ETag and Last-Modified when available.
- Strict timeout, response-byte ceiling, content-type allowlist, request-rate ceiling, and daily source budget.
- Metadata and changelog deltas before full-page retrieval.
- No script execution, package installation, repository checkout, binary execution, credential use, form submission, or account creation.
- Raw response hash plus parser version for deterministic replay.
- `observedAt`, `recordedAt`, `effectiveAt`, and `validUntil` where evidence supports them.
- Failed parsing produces an explicit unknown state, never an inferred change.
- Full evidence retrieval occurs only after a candidate clears relevance and rights thresholds.

## 6. Core records

NOVA must persist or export these append-only records:

- `SourceDefinition`
- `SourceSnapshot`
- `ChangeEvent`
- `EvidenceClaim`
- `Opportunity`
- `ProjectFit`
- `DependencyImpact`
- `EconomicEstimate`
- `CreditProgramState`
- `ExperimentProposal`
- `ExperimentRun`
- `OwnerDecision`
- `RealizedOutcome`
- `SupersessionLink`
- `AgentRunReceipt`

Every claim links to evidence. Every estimate separates fact, assumption, inference, and unknown.

## 7. Financial truth states

The following states are never collapsed:

- discovered
- potentially eligible
- eligibility verified
- application drafted
- applied
- approved
- activated
- usable balance verified
- committed
- consumed
- expired

Revenue uses a separate ladder:

- idea
- offer designed
- channel available
- lead generated
- proposal sent
- buyer committed
- invoice issued
- payment pending
- cash received
- retained revenue verified

Only `cash received` counts as revenue. Only `usable balance verified` counts as available credits.

## 8. Opportunity economics

NOVA calculates two distinct outputs.

### Economic value

`expected_value = probability_of_success * (12_month_net_cash_value + strategic_option_value + reusable_asset_value) - cash_cost - founder_time_cost - maintenance_reserve - risk_reserve`

All components carry confidence ranges and evidence references.

### Execution priority

Priority considers:

- time to first cash or verified cost reduction
- strategic fit across Galaxy projects
- evidence quality and freshness
- customer impact
- implementation effort
- reversibility
- integration reuse
- defensibility and learning value
- dependency and vendor concentration
- legal, security, privacy, and source-rights risk
- founder attention cost
- competitive half-life

Weights begin as policy, not learned truth. NOVA may propose weight changes after measuring forecast error, but cannot change governance or ranking weights autonomously.

## 9. Portfolio discipline

NOVA keeps all valid opportunities but limits active work:

- one revenue-critical implementation
- up to two bounded experiments
- one urgent risk/deprecation response lane

Default portfolio allocation while founder cash runway is constrained:

- 50% first-cash, acquisition, checkout, fulfillment, and launch blockers
- 25% verified cost reduction and continuity
- 15% reusable capability, proprietary data, and moat creation
- 10% frontier options

Urgent security, legal, breaking-change, and production-continuity events override this allocation.

## 10. Project graph

NOVA is housed in GSE but evaluates opportunities against an opt-in project graph rather than assuming every discovery belongs in Sports.

Initial project nodes:

- Galaxy Sports Edge / Galaxy Sports Network
- XXX Autonomous Media Studio / Synthetic Identity Network OS
- consumer shopping compatibility and localization assistant
- Dynasty Studio game program
- Vesper Fracture music and creator tooling

Each `ProjectFit` records the relevant capability gap, expected value, integration path, reuse potential, blockers, and next smallest test. Project source access remains separately permissioned.

## 11. GSE council integration

NOVA should be registered as a governed council role only after the collector, receipts, and review queue are real.

Proposed role:

- **Codename:** NOVA
- **Role:** AI Opportunity Intelligence & Venture Analyst
- **Department:** Command & Governance
- **Reports to:** JARVIS
- **Reviewed by:** METER for model/cost claims; TAL for technical feasibility; GAUGE for evidence quality; AUDIT for measurement claims; BOBBY for revenue economics.
- **Owned capability:** `ai-opportunity-intelligence`
- **External actions:** none
- **Run mode:** scheduled read-only research plus draft-only internal outputs

NOVA may autonomously fetch approved public metadata, normalize changes, calculate deterministic scores, generate internal decision packets, and run approved local tests. It may not install, merge, deploy, publish, purchase, apply, contact, alter production, modify pricing, activate billing, or represent estimates as realized results.

## 12. Subagent lanes

NOVA may coordinate bounded subagents, each producing drafts and receipts:

- **RADAR:** official release, changelog, registry, package, and model discovery.
- **VET:** primary-source verification, contradiction detection, rights and terms state.
- **MARGIN:** credits, grants, pricing, partner, affiliate, marketplace, and direct-revenue economics.
- **FORGE:** isolated prototype and benchmark plan; no production integration.
- **WATCHTOWER:** breaking changes, deprecations, security incidents, quota and pricing regressions.

No subagent approves its own output. Source verification and economic review remain independent from prototype advocacy.

## 13. Experiment protocol

Every experiment requires:

- falsifiable hypothesis
- current baseline
- one primary metric and guardrail metrics
- bounded cash, token, time, and file-change budget
- isolated worktree or sandbox
- deterministic fixture or replay input
- security and source-rights review
- explicit success, failure, and kill criteria
- complete command and result receipt
- rollback plan
- owner approval before production promotion

A vendor benchmark is not accepted as GSE evidence until reproduced on a relevant Galaxy workload.

## 14. Self-learning without self-governance

NOVA tracks predicted versus realized:

- engineering hours
- cash spend
- time to first value
- quality improvement
- cost reduction
- revenue generated
- maintenance burden
- incident count
- source reliability
- opportunity success probability

It measures forecast calibration at 7, 30, and 90 days. It may propose scoring changes with before/after replay results. It may not silently rewrite its own policies, source trust, safety gates, or economic history.

## 15. Owner outputs

### Immediate alert

Only for critical security, breaking change, pricing/quota regression, expiring approved credits, or production dependency risk.

### Daily brief

Maximum five items:

- what changed
- why it matters to which project
- verified facts versus assumptions
- expected dollars/time impact
- smallest safe next action
- required owner decision, if any

### Weekly opportunity board

- active implementation
- active experiments
- newly verified opportunities
- parked and rejected items with reasons
- deprecations and exposure
- credits and revenue truth states
- forecast accuracy

### Monthly learning review

- source precision and false-positive rate
- forecast calibration
- realized value versus expected value
- maintenance and attention cost
- recommended policy changes

## 16. Phase 2 implementation order

1. Build and test the allowlisted collector contract.
2. Build source-specific RSS, Atom, JSON-release, GitHub-release, and structured-page adapters.
3. Add deterministic snapshot hashing, delta extraction, parser-version receipts, and replay fixtures.
4. Add canonical change events, deduplication, contradiction handling, and urgency routing.
5. Add the project capability graph and cross-project fit evaluator.
6. Add an append-only persistence adapter; remain file-backed in development before a reviewed Prisma migration.
7. Add the internal review queue and cockpit read model.
8. Add read-only cron execution with lock, idempotency key, run budget, and stale-run alerting.
9. Register NOVA and its capability only when the runtime evidence supports the declared status.
10. Add local-model extraction behind zero-cash policy; deterministic parsing remains the fallback and source of truth.
11. Add isolated experiment generation after source, policy, and review gates pass.
12. Add outcome measurement and scoring calibration.

## 17. Acceptance gates

Phase 2 is complete only when:

- an allowlisted fixture set replays deterministically;
- redirects, oversized bodies, bad content types, unknown hosts, malformed dates, and parser failures default closed;
- duplicate changes do not produce duplicate opportunities;
- primary and secondary evidence cannot be conflated;
- pricing, terms, quota, deprecation, and security changes receive distinct event classes;
- no discovered package or MCP server can install or execute;
- every run emits a complete receipt and respects request, byte, token, and time budgets;
- every opportunity maps to at least one project or is explicitly rejected as irrelevant;
- financial states cannot claim credits or revenue prematurely;
- council and capability registries remain internally consistent;
- tests, strict typecheck, guardrails, and production build pass;
- scheduling and persistence are labeled honestly if they remain unwired.

## 18. Anti-entropy rule

NOVA must increase the ratio of verified value to founder attention. Discovery volume is not a success metric. Success is measured by prevented losses, reduced costs, faster delivery, verified revenue, reusable capabilities, better decisions, and calibrated forecasts.
