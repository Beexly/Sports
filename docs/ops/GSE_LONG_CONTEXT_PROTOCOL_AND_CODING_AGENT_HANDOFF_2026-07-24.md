# GSE Long-Context Protocol & Coding Agent Handoff
**Date:** 2026-07-24  
**Purpose:** Permanent solution to the "conversation is too long" hard limit that has been killing every dense GSE session. This file is the single source of truth that future chats and the coding agent must load first.

## 1. Why the Limit Keeps Happening

Grok (and most frontier chat platforms) impose a hard token/turn limit on a single conversation.  
GSE work is extremely dense: recursive repository trees, full TypeScript implementations, multi-agent coordination, statistical proofs, and connector matrices.  
When a session tries to carry the full prior transcript + new code + new analysis, the limit is hit.  
This is a platform constraint, not a model failure. The correct response is to **externalize state**.

## 2. Permanent Protocol (use in every new chat)

**Bootstrap prompt (copy-paste into every new Grok/Claude session):**

```
Continue GSE from durable state. Load first:
1. docs/ops/GSE_LONG_CONTEXT_PROTOCOL_AND_CODING_AGENT_HANDOFF_2026-07-24.md
2. docs/ops/CLAUDE_MCP_CONNECTOR_LEVERAGE_2026-07-24.md
3. packages/prediction-engine (especially edge-lab/selective-gate.ts, conformal-intervals.ts, gse-score/)
Do not re-summarize history. Work only on the next concrete target listed in the handoff. Coding agent verifies only.
```

Rules:
- Never paste large prior transcripts.
- One mission per chat (or one tightly scoped wave).
- At the first sign of length pressure, write a short update into this file or a new dated handoff and start a fresh chat with the bootstrap above.
- Prefer tools (GitHub, Notion, Linear) over chat history.

## 3. Current Engine Reality (verified 2026-07-24)

`packages/prediction-engine` is already extremely mature:

- **Conformal:** `conformal-intervals.ts` (rolling Mondrian + ACI)
- **Inductive Venn-Abers:** already live inside `edge-lab/selective-gate.ts` via `vennAbersInterval` (uses `isotonicCalibration` from `probability-calibration.ts`)
- **Selective / No-Bet Gate:** full implementation with Wilson LCB, coverage, disjoint set enforcement, Learn-then-Test tau tuning
- **Placebo / Walk-forward / Kelly / Pedersen / CLV / GSE Score / Evidence readiness / Promotion gates** — all present with extensive tests
- **Glass Ledger patterns:** Pedersen commitments, slate commitments, pick-proof receipts, proof-of-record

The prior session's "findings" largely rediscovered and formalized what is already in the monorepo. The main remaining gap called out by the leverage map is the **display-only-substantiated-results guard**.

## 4. Coding Agent Handoff (verify only — do not re-implement engines)

### Primary target
Implement / harden the display-substantiated honesty guard so that no public surface can render a win-rate, ROI, confidence, or "proven" claim unless it carries:

- coverage denominator
- Wilson or Clopper-Pearson lower confidence bound
- CLV or walk-forward provenance
- model / calibration version

Location recommendation: `packages/prediction-engine/src/guards/display-substantiated.ts` (or `packages/compliance/`).

### Secondary targets
1. Confirm `vennAbersInterval` + selective-gate are exported and used by the No-Bet / GSE Action Score path.
2. Wire a Phase-0 placebo CI gate (script or GitHub Action) that fails the build on leakage.
3. Ensure public Board / Lab / Intelligence surfaces call the guard before any numeric claim.

### Explicit non-goals for the coding agent
- Do not re-write conformal, Venn-Abers, Kelly, placebo, or ledger code.
- Do not invent new mathematical objects unless the guard requires them.
- Focus on verification, wiring, and tests.

## 5. Highest-Leverage Next Actions (for this or the immediate next chat)

1. Land the display-substantiated guard + unit tests.
2. Add a simple re-export or thin wrapper if the coding agent needs a cleaner public API for IVAP.
3. Update CLAUDE.md / AGENTS.md with the bootstrap prompt above.
4. Create a Linear issue (or GitHub issue) titled "Enforce display-substantiated guard on all public numeric claims".

## 6. How to Keep This Working Forever

- Every dense session ends by appending a short "Session Outcome" section to this file or a dated sibling.
- New chats always start with the 4-line bootstrap.
- Coding agents are given only verification + wiring tickets; the heavy statistical intelligence stays in the already-written prediction-engine.

---
*This document is the permanent fix for the length-limit problem. Load it first. Execute the next concrete target. Do not re-accumulate history.*
