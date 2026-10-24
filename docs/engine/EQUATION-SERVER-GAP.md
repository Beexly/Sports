# EQUATION-SERVER-GAP — what is missing before packages/mcp-equations-server/ can exist

Measured 2026-10-24. Nothing here is claimed as built.

## What exists
- `lit.premise` in Neon (`summer-brook-99380762`): **1,098 rows**, CITABLE_VERIFIED/ACTIVE (verified by count query this date, role `hermes_ro`).
- `intelligence/ratings/engine_math.py`: **42 functions** (grep of `def `).
- `packages/prediction-engine/src/equations/`: **does not exist** (no directory).

## What is missing
1. The MCP equation server itself (`packages/mcp-equations-server/`) — do not create it as a 50,000-row brain; it would be a lie with a port number.
2. A TS-side equation-kernel directory with the per-kernel contract: `equation_id`, `source_id`, a verbatim quote span from the premise row, and clamp bounds. Currently zero kernels exist under `src/equations/`.
3. A migration wiring `lit.premise` + `lit.premise_vector` reads into the engine's runtime config (the Neon table exists; nothing in the repo reads it).
4. A corpus path decision: the 1,098-row lit.premise is the real corpus; the "MIND_CORPUS_3000" and "3,143 papers" figures from the brief have no row or file in this repo.

## Honest capacity statement
An equation server built today would expose 42 Python functions (engine_math.py) and 1,098 premises — real, but an order of magnitude below the brief's claim. Build the kernel contract first; add kernels with provenance; only then stand up the server.
