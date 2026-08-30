# Sports OS Intelligence Network — Master Architecture Plan

**Status**: Controlling doctrine — in-repo canonical copy
**Source**: Downloads/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md (Prompt 1)
**Date placed in repo**: 2026-05-27
**Authority**: This document and all files under `docs/intelligence/` are the
primary doctrine layer for the Sports OS Intelligence Network. Prompt 2
(CLAUDE_CODEX_SEAMLESS_OPERATING_PROTOCOL) requires every agent to read this
file first. Prompts 3 v2 and 4 extend this document; they do not replace it.

> **Implementation note**: This is a planning and control artifact only.
> It does not implement code, change routes, change schema, add dependencies,
> weaken gates, or expose internal systems publicly. All implementation requires
> a completed pre-implementation change proposal
> (`docs/adr/pre-implementation-change-proposal-template.md`) and owner approval.

---

## 0. Baseline Lock

Sports OS is the product of record. The current app structure, public route
structure, cockpit route structure, trust gates, feature flags, calibration
logic, and no-fake-data doctrine are preserved.

The uploaded reference projects (R&D Batches 0–6) are pattern sources only.
They are not architecture replacements. Their role is to teach patterns that
can be translated into additive Sports OS improvements.

The current direction:

> Sports OS is a governed sports intelligence network that turns fragmented
> sports data, market movement, source evidence, weak signals, model outputs,
> and uncertainty into decision-ready insight.

The Brain is the intelligence core, but it is not the whole product.

The ecosystem includes 15 components. See `docs/intelligence/product-ecosystem.md`
for the full map.

---

## 1. Non-Negotiable Constraints

- Do not rebuild the app
- Do not rename routes
- Do not migrate architecture
- Do not replace the current Sports repo structure
- Do not weaken feature flags, public gates, tests, or trust rules
- Do not fabricate data, picks, odds, injuries, rumors, performance, testimonials, or readiness
- Do not expose internal Brain tools publicly
- Do not create public Ask-the-Brain routes until source governance, evidence vault, claim governance, and internal Q&A validation exist
- Do not treat Reddit, forums, fan boards, community chatter, comments, or rumor threads as verified fact
- Do not imply inside information
- Do not claim sharp money unless supported by specific, legitimate data
- Do not add dependencies without explicit approval
- Do not add schema changes without explicit approval
- Do not copy uploaded repo code blindly
- Do not import GPL/AGPL or license-sensitive code without legal review
- Do not use sportsbook/tout/casino certainty language: locks, guaranteed, sure thing, risk-free, easy money, free money, cannot lose, verified track record — unless explicitly approved and legally supported

---

## 2. Product Thesis

Sports OS should become the intelligence layer between fragmented sports
reality and decision-ready insight.

Sports reality is messy: official injury reports, team announcements, beat
writer comments, coach-speak, Reddit rumors, forum speculation, line movement,
player usage changes, scheme shifts, weather, venue effects, fantasy panic,
model disagreement, outdated articles, AI-generated junk, and market
overreaction.

Sports OS wins by classifying that chaos into clear categories:

| Category | Definition |
|---|---|
| verified fact | Confirmed by Tier 1 or Tier 2 source within TTL |
| source observation | Observed by Tier 3 source, not yet verified |
| trusted report | From a Tier 3 source with high reliability score |
| market signal | Line/prop movement or book disagreement |
| weak signal | Community chatter, rumor, or unconfirmed report |
| rumor | Unverified claim from Tier 5 source |
| community chatter | Reddit/forum/fan-board content |
| model output | Prediction engine result |
| confidence | Engine confidence score 0–100 |
| volatility | Measure of how much a signal is changing |
| risk | Risk-adjusted uncertainty estimate |
| public claim | Any claim surfaced on a public route |
| recommendation | Actionable pick or watchlist flag |
| settlement | Outcome recorded post-game |
| calibration impact | Settlement effect on model accuracy |

The moat is not AI picks. The moat is source-aware, evidence-weighted,
time-sensitive, auditable sports intelligence.

---

## 3. Product Ecosystem

See `docs/intelligence/product-ecosystem.md` for full detail on all 15 components.

Summary of the 15 ecosystem components:

1. Picks Intelligence
2. Fantasy Intelligence
3. Sports Research Brain
4. Weak Signal / Rumor Radar
5. Source Acquisition Mesh
6. Evidence Vault
7. Entity Graph
8. Signal Ledger
9. Market Gravity
10. Operator Cockpit
11. Research Lab
12. Public Trust / Methodology Layer
13. Developer / Innovation Layer
14. AI-Search / GEO Visibility Layer
15. Future API / B2B Intelligence Layer

---

## 4. Intelligence Architecture — Component Summaries

Full specifications for each component are in `docs/brain/`:

| Component | Doc |
|---|---|
| Source Acquisition Mesh | `docs/brain/source-hierarchy.md` |
| Weak Signal Engine | `docs/brain/weak-signal-engine.md` |
| Entity Graph | `docs/brain/entity-graph.md` |
| Evidence Vault | `docs/brain/evidence-vault.md` |
| Signal Ledger | `docs/brain/signal-ledger.md` |
| Market Gravity | `docs/brain/market-gravity.md` |
| Ask the Brain | `docs/brain/ask-the-brain.md` |
| Fantasy War Room | `docs/brain/fantasy-war-room.md` |
| Research Lab | `docs/brain/research-lab.md` |
| Claim Governance | `docs/brain/claim-governance.md` |
| Operator Cockpit Governance | `docs/brain/operator-cockpit-governance.md` |

### Source Tier Summary

| Tier | Name | Examples | Public Use |
|---|---|---|---|
| 1 | Official / Primary | League APIs, injury reports, transaction logs | Supports facts when fresh |
| 2 | Licensed / Structured | Odds APIs, stats feeds, fantasy APIs | Supports structured claims if license allows |
| 3 | Trusted Secondary | Verified beat writers, reputable analysts | Supports contextual claims with attribution |
| 4 | Market Signals | Line movement, book disagreement, prop movement | Supports market-context claims |
| 5 | Community / Weak Signal | Reddit, forums, fan boards | Watchlist only — never source of truth |
| 6 | Synthetic / AI / Low Trust | AI summaries, scraper spam, aggregators | Never source of truth |

### Ask the Brain — Launch Sequence

Public Ask-the-Brain is **blocked** until all of the following exist and pass validation:

1. Evidence Vault (internal) — implemented and tested
2. Claim governance — implemented and tested
3. Source transparency — public methodology pages exist
4. Internal Q&A validation — cockpit-only Q&A has passed a quality gate

See `docs/brain/ask-the-brain.md` for the full BrainAnswer schema and launch protocol.

---

## 5. Design Experience System

See `docs/intelligence/design-experience-system.md` and `docs/design/` for full detail.

Design standard: Bloomberg discipline · F1 telemetry · NASA mission control ·
Apple restraint · sports-native clarity · premium intelligence network.

Signature components (defined in `docs/design/signature-components.md`):
Brain Answer Card · Evidence Drawer · Signal Stack · Market Gravity Meter ·
Rumor Radar Card · Player Intelligence File · Pick Provenance Timeline ·
Source Health Panel · Contradiction Alert · Brain Confidence Meter ·
Fantasy War Room Card · Slate Command View · Public Methodology Block

Design principle: **one cinematic brand layer. many disciplined data layers.**

---

## 6. Implementation Sequence

| Phase | Name | Status | Approval required |
|---|---|---|---|
| 0 | R&D Extraction | Complete | No |
| 1 | Architecture Docs Only | In progress | No |
| 2 | Operator Skills | Pending | No |
| 3 | Evidence Schema Proposal | Pending | No (proposal only) |
| 4 | Evidence Vault MVP | Blocked | **Yes — schema implementation** |
| 5 | Source Hierarchy + Source Health | Blocked | **Yes — cockpit route changes** |
| 6 | Signal Ledger MVP | Blocked | **Yes — schema implementation** |
| 7 | Internal Ask the Brain | Blocked | **Yes — route creation** |
| 8 | Fantasy War Room MVP | Blocked | **Yes — schema + route** |
| 9 | Public Brain Beta | Blocked | **Yes — requires Phases 4–8 complete** |
| 10 | Developer / Methodology Layer | Blocked | **Yes — public route creation** |

---

## 7. Validation Rules Before Any Implementation

Before implementation of any code change:

1. Show branch
2. Show `git status`
3. Inspect open PRs
4. List files to touch
5. Explain why each file is touched
6. Confirm no route changes
7. Confirm no schema changes unless approved
8. Confirm no dependency changes
9. Confirm no weakened gates
10. Confirm no copied external code
11. Confirm no public exposure of internal Brain tools

Run:

```bash
npm run db:generate
npm run lint
npm run typecheck
npm run test
npm run test:smoke
npm run build
```

If validation fails: capture exact error · diagnose root cause · fix only if safe ·
rerun · document unresolved blockers honestly.

---

## 8. Final Quality Bar

Every recommendation and change must improve at least one of:

product intelligence · source discipline · decision quality · user trust ·
model accountability · fantasy utility · picks explainability · cockpit
usefulness · technical durability · creative differentiation · AI-search
visibility · revenue readiness · operational clarity

No generic advice. No startup fluff. No fake certainty. No casino language.
No unsupported claims. No architecture migration. No public agent exposure.
No code copying. No AI theater.
