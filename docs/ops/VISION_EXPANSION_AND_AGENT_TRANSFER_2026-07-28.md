# Vision Expansion & Coding-Agent Transfer — 2026-07-28

**Purpose**: Durable source of truth so conversation length limits never erase progress.
**Branch**: `feat/uq-honesty-stack-hardening` (PR #225)
**Operator intent**: Keep expanding the honesty stack toward a provably honest sports intelligence platform; coding agent verifies, wires, and extends autonomously.

---

## 0. Bootstrap prompt (paste into any new coding-agent session)

```
Repo: Beexly/Sports
Branch: feat/uq-honesty-stack-hardening (or main after merge of PR #225)

Read in order:
1. docs/ops/UQ_MODULE_INDEX.md
2. docs/ops/UQ_HARDENING_SESSION_2026-07-28.md
3. docs/ops/VISION_EXPANSION_AND_AGENT_TRANSFER_2026-07-28.md  (this file)
4. docs/ops/UQ_HANDOFF_2026-07-24.md

Core code already shipped (do not rewrite algorithms):
- calibration/{pav,ivap,cvap,aggregation,local-isotonic-patch,multicalib-audit-patch}.ts
- conformal/{mondrian,sports-taxonomy,levene-welch,lwt-mcps-sketch}.ts
- edge-lab/{selective-gate,edge-lab-council,walk-forward-taxonomy,agent-roles}.ts
- edge-lab/mondrian-dual-signal.ts  (new — dual No-Bet helper)

Principles: finite-sample honesty first; No-Bet is first-class; pure TS for UQ core;
never invent statistical formulas; respect PRODUCT_CASCADE_MAP ledger block.

Your job: implement the NEXT LAYER items in §3 of this file, test them, commit
small verifiable units, update UQ_MODULE_INDEX.md when you add modules.
```

---

## 1. Vision (compressed)

Galaxy Sports Edge is not "another model that outputs a probability."
It is a system that can say, with finite-sample force:

1. **What we believe** (point / multiprobability)
2. **How unsure we are** (interval width, conformal quantile)
3. **For which world** (Mondrian category / taxonomy)
4. **Whether we should act** (selective No-Bet / guardian veto)
5. **Whether that judgment is recomputable** (Glass Ledger when a writer exists)

Nobody ships all five honestly in sports. That is the wedge.

---

## 2. What is already solid (do not rediscover)

| Layer | Status |
|-------|--------|
| IVAP / CVAP / PAV / aggregation | Implemented + tested |
| Mondrian residual manager + sports taxonomy | Implemented + tested |
| Selective gate (width No-Bet, multiprob sources) | Implemented + tested |
| SequentialEdgeLabCouncil (hard guardian veto) | Implemented + tested |
| Walk-forward taxonomy diagnostics | Implemented + tested |
| Council ↔ Gate alignment tests | Implemented |
| Module index + hardening session docs | Written |
| Ledger multiprob bridge | BLOCKED (cascade map) — do not invent |
| Certificate/math pack | BLOCKED (missing artifact) — do not invent |

PR #225 is the vehicle. Merge when CI green on latest commits.

---

## 3. NEXT LAYER — expand toward the vision

Work top-down. Each item is sized for a coding agent without founder babysitting.

### 3.1 Dual-signal No-Bet (Mondrian quantile × multiprob width) — STARTED

Module: `edge-lab/mondrian-dual-signal.ts`

Combine:
- multiprobability width (calibration pin-down)
- Mondrian residual quantile (group-conditional residual scale)

into a single structured honesty verdict the gate or council can consume without
bypassing `applySelectiveGate`. Pure helper — does not fire bets.

**Agent follow-ups**:
- Unit tests for all verdict branches
- Optional thin adapter that maps dual-signal → EdgeLabContext fields

### 3.2 Taxonomy health monitor (online)

Build on `runWalkForwardTaxonomy`:
- Rolling window of recent settled rows → per-category coverage / width
- Alert when a previously trusted category drifts under-coverage
- Output shape compatible with Edge Lab honestyFlags

Do **not** auto-retune τ from this monitor (that is eval contamination).
Diagnostics and alerts only.

### 3.3 Per-category multiprobability (Mondrian × IVAP hybrid)

Research direction with clear code path:
- Maintain separate IVAP calibration pools per Mondrian category (or parent)
- At predict time: category = assignMondrianCategory(ctx); run IVAP on that pool
- Fallback to parent/global pool when n < minSamples (same hierarchy as residual manager)

Validity intuition: within-category exchangeability → category-wise multiprobability.
Implementation must stay pure TS; start with a sketch class `MondrianIvapPool`
mirroring `MondrianResidualManager` API.

### 3.4 Soft Mondrian (optional, later)

When group membership is uncertain (e.g. "isFavorite" near 0.5):
- Soft weights over neighboring categories
- Quantile = weighted blend of category quantiles (or conservative max)
- Document that exact category-wise coverage becomes approximate

Only after 3.1–3.3 are green.

### 3.5 Wire walk-forward taxonomy into an existing replay path

Find a historical-replay or edge-lab script that already emits per-row residuals
or intervals. Map rows → `WalkForwardTaxonomyRow[]` → `runWalkForwardTaxonomy`.
Emit a markdown or JSON report under `docs/ops/` or `artifacts/`.
No gate API change.

### 3.6 Edge Lab product surface (still diagnostic)

- Typed JSON schema for `DebateSummary` (for future MCP / API)
- One example fixture: "tight honest edge" vs "wide no-bet" vs "thin stratum"
- Still not a production firer; still not a ledger writer

### 3.7 Partnership / revenue notes (docs only unless asked)

Keep expanding in docs, not code:
- Honesty layer on top of sports-science data vendors (Catapult/VALD-class)
- White-label calibration API sketch
- Affiliate / content: "why we no-bet" explainers powered by dual-signal + taxonomy

---

## 4. Mondrian algorithm — operator-level checklist (from deep dive)

1. Taxonomy from domain axes (home/fav/rest), not from test labels.
2. Finite-sample quantile uses (n+1) rank correction.
3. minSamples before trusting a leaf; hierarchical fallback with recorded chain.
4. Measure per-category coverage, not only global.
5. Data-driven trees (LWT) must be fit off the conformal calibration fold.
6. Thin category = insufficient evidence, not "no edge."

---

## 5. Anti-patterns (never do)

- Rewrite PAV / IVAP / CVAP core
- Invent certificate math without the artifact pack
- Build ledger multiprob persistence ahead of a published-pick writer
- Tune τ or thresholds on the eval set used for reported coverage
- Widen client barrel to export edge-lab (node:crypto / server-only risk)
- Claim performance numbers without walk-forward + placebo + ledger path

---

## 6. Success criteria for the next agent session

- [ ] `mondrian-dual-signal.ts` fully tested
- [ ] At least one of: taxonomy health monitor, MondrianIvapPool sketch, replay wiring
- [ ] UQ_MODULE_INDEX.md updated
- [ ] No flag flips; no cascade-map violations
- [ ] Small commits; CI green

---

## 7. Conversation hygiene

When chat length threatens speed:
1. Push findings to `docs/ops/` immediately
2. Paste only the §0 bootstrap into a new session
3. Treat the repo as memory; treat chat as a scratchpad

This file is the bridge.
