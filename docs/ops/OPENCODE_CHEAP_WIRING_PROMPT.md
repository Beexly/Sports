MODEL: opencode/space-bunny-free

FALLBACK: opencode/big-pickle OR opencode/mimo-v2.6-flash-free
OPTIONAL EXTRAS: OpenRouter :free models (separate sk-or key) OR nvidia/google/gemma-3-12b-it
FORBIDDEN MODELS: opus, sonnet-thinking-high, muse-spark-1.3-high (paid), gpt-5.6-sol, any *-thinking-high
NOTE: Bunny/Pickle/MiMo free are OpenCode Zen ids - not OpenRouter.

MAX CALLS THIS RUN: 25
MAX NEW FILE PAIRS: 6
MAX INPUT TOKENS PER TURN: 24k
STOP if tests red OR you hit either cap.

You implement unused GSE wiring items. Additive only.

PRIORITY OVERRIDE: prioritize unused ledger IDs for NFL and MLB calibration, CLV ingest, and related free data loaders; skip Stripe/#822 money catalogue; additive module+test only.

DO NOT READ:
- AGENTS.md (too large)
- CLAUDE.md full
- IMPROVEMENT-LEDGER.jsonl whole file
- any .env
- prisma schema / migrations
- apps/web/app/** unless the item names a specific file

READ ONLY THESE, once, at start:
1. docs/ops/HANDOFF_CURSOR_2026-09-22.md (skip if missing)
2. docs/research/2026-09-21/wiring/IMPLEMENTED.md  (last 80 lines + Wave-2 totals)
3. docs/research/2026-09-21/wiring/WIRING-PLAN.md section "NEEDS HUMAN CALL" only

Then pick the next 3 IDs that are in IMPROVEMENT-LEDGER.jsonl and NOT in IMPLEMENTED.md.
Use grep/rg for one ID at a time. Do not cat the jsonl.

For each ID:
- Create TWO new files only: module + colocated test
- JSDoc: arXiv id + ACCEPTANCE GATE comment
- Disabled-by-default flag
- No edits to existing scoring, publish, settlement, schema
- If it needs a behavior change, append one bullet under WIRING-PLAN.md NEEDS HUMAN CALL and skip

After each ID:
- Run ONLY the new test file (npx vitest run <that file>)
- Append one row to IMPLEMENTED.md
- Do not typecheck the whole monorepo
- Do not lint the whole monorepo
- Do not npm run build

Commit message: wiring: <arxiv_id> additive module+test
Push the worker branch. No force-push. No main.
If a file already exists for that id, skip. Do not rewrite it.
No explanations longer than 4 lines between tools.
No reciting AGENTS.md.
No "let me explore the codebase."
