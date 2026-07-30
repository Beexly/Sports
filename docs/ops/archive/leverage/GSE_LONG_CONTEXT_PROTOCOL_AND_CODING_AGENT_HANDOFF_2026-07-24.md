# GSE Long-Context Protocol & Coding-Agent Handoff
**Date:** 2026-07-24  
**Purpose:** Permanent solution to repeated "conversation is too long" failures. This file is the single source of truth that every new Grok/Claude/coding-agent session must load first.

## Why the Limit Keeps Happening

Grok (and most LLM chat surfaces) enforce a hard token / turn limit per conversation. GSE work is dense: multi-agent coordination, recursive repository trees, full statistical engines, and long findings quickly exhaust the window. Carrying full prior transcripts is the anti-pattern. External durable state is the only reliable fix.

## Permanent Protocol (Use Every Time)

1. **Start every new chat with this exact bootstrap prompt** (copy-paste):

```
Continue GSE from docs/ops/GSE_LONG_CONTEXT_PROTOCOL_AND_CODING_AGENT_HANDOFF_2026-07-24.md + docs/ops/CLAUDE_MCP_CONNECTOR_LEVERAGE_2026-07-24.md + latest EXECUTION_LEDGER. Coding agent is verification-only. Do not re-implement statistical engines that already exist. Focus only on the current mission.
```

2. Never paste full previous transcripts or recursive trees into the chat. Reference the files instead.
3. When a session is approaching the limit, update this document (or a dated sibling) with the latest decisions and stop. Start a fresh chat using the bootstrap.
4. All heavy code lives in the monorepo. The coding agent only verifies, wires, and writes tests — never re-codes the core engines from scratch.

## Current Truth of the Prediction Stack (2026-07-24)

**Already mature and production-oriented:**
- `packages/prediction-engine/src/conformal-intervals.ts` — Mondrian + adaptive conformal with finite-sample correction
- `packages/prediction-engine/src/edge-lab/placebo.ts` + walk-forward + selective-gate (No-Bet)
- `packages/prediction-engine/src/edge-lab/kelly.ts` + CLV modules
- `packages/prediction-engine/src/pedersen-ledger.ts` + `packages/crypto` Pedersen commitments
- Extensive calibration, GSE Score, No-Bet Governor, performance-CI, promotion gates
- Live site: galaxysportsedge.com with Board, Lab, Intelligence, proof receipts

**Implemented in this commit (coding agent must verify only):**
1. `packages/prediction-engine/src/calibration/ivap.ts` — full Inductive Venn-Abers Predictor (binary multiprobability calibration with PAV isotonic regression). Outputs valid (p0, p1) intervals under exchangeability.
2. `packages/prediction-engine/src/guards/display-substantiated.ts` — pure honesty guard. Refuses any public performance / win-rate / ROI / confidence claim that lacks coverage denominator, Wilson or Clopper-Pearson LCB, CLV backing, and walk-forward provenance. This is the HANDOFF §1 gap that was still open.

**Still high-value remaining work (coding agent scope):**
- Wire `assertDisplaySubstantiated` (or the render helper) into every public surface that shows numbers (Board, Intelligence, marketing pages, API responses).
- Add unit + property tests for IVAP and the display guard.
- Optional: thin public recompute endpoint that calls the existing Pedersen + recompute-verifier.
- Phase-0 CI gate that fails the build if placebo / conditional-MI probes fail (most of the logic already exists in edge-lab).

## Coding-Agent Handoff Instructions

You are the coding agent. Your job is **verification and wiring only**.

1. Read this file + the two new source files.
2. Confirm TypeScript compiles and the public exports are correct.
3. Write or extend tests:
   - IVAP: empty calibration, extreme scores, monotonicity of isotonic fit, coverage properties on synthetic exchangeable data.
   - Display guard: must throw / return blocked on any claim missing the required evidence fields; must pass when all fields are present and LCB is acceptable.
4. Wire the display guard into the render paths that currently emit performance numbers.
5. Do **not** re-implement conformal, Kelly, Pedersen, placebo, or GSE Score. Those engines already exist and are more sophisticated than a from-scratch rewrite.
6. When finished, update the checklist in `docs/ops/CLAUDE_MCP_CONNECTOR_LEVERAGE_2026-07-24.md` and leave a short note in EXECUTION_LEDGER.

## Bootstrap for Future Human / Grok Sessions

```
Continue GSE from docs/ops/GSE_LONG_CONTEXT_PROTOCOL_AND_CODING_AGENT_HANDOFF_2026-07-24.md + docs/ops/CLAUDE_MCP_CONNECTOR_LEVERAGE_2026-07-24.md. Coding agent is verification-only.
```

This is the durable fix. Length limits will still exist, but they will no longer erase progress or force re-explanation of the entire stack.

---
*Execute. Do not just describe.*
