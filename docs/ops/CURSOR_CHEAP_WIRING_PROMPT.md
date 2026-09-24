# GSE cheap wiring — correct surfaces (2026-09-23)

## Cost law
Do **not** raise the Cursor $200 spend cap. Additive unused-module wiring should burn **OpenCode Zen free**, not Cursor Opus.

## Surfaces (pinned)

| Priority | Where | Models |
|----------|--------|--------|
| **A (default)** | OpenCode Zen | `opencode/space-bunny-free` → `opencode/big-pickle` → `opencode/mimo-v2.6-flash-free` |
| **B (optional)** | OpenRouter `:free` | Extras only when key is **live** — not bunny’s home |
| **C (fallback)** | NVIDIA NIM | e.g. `nvidia/google/gemma-3-12b-it` |
| **D** | Grok Bot | orchestrate / triage / money |
| **E (last resort)** | Cursor CloudAgent | `composer-2.5` fast, then Gemini Flash / Kimi / nano / Haiku — never Opus / Muse Spark High / Sol / thinking-high |

Bunny / pickle / mimo free rows live on **OpenCode Zen**. They are not Cursor CloudAgent catalog ids.

### STALE — do not follow
~~OpenCode → OpenRouter FREE with `stealth/space-bunny-alpha` as default.~~  
That OpenRouter-bunny path is **stale**. Zen is truth (`gse-cheap-cursor-wiring` skill + `FREE_MODEL_LANES.md`).

## OpenCode setup checklist
1. Open the Beexly/Sports repo in OpenCode.
2. Provider = **OpenCode Zen**; model = `opencode/space-bunny-free` (fallback pickle → mimo). Thinking off.
3. Paste the prompt below as the whole task.
4. Caps in the prompt: 25 calls, 6 new file pairs, ~24k input/turn.

## Prompt (paste whole)

MODEL: opencode/space-bunny-free

FALLBACK: opencode/big-pickle OR opencode/mimo-v2.6-flash-free

FORBIDDEN MODELS: opus, sonnet-thinking-high, muse-spark-1.3-high, gpt-5.6-sol, any *-thinking-high

MAX CALLS THIS RUN: 25
MAX NEW FILE PAIRS: 6
MAX INPUT TOKENS PER TURN: 24k
STOP if tests red OR you hit either cap.

You implement unused GSE wiring items. Additive only.

DO NOT READ:
- AGENTS.md (too large)
- CLAUDE.md full
- IMPROVEMENT-LEDGER.jsonl whole file
- any .env
- prisma schema / migrations
- apps/web/app/** unless the item names a specific file

READ ONLY THESE, once, at start:
1. docs/ops/HANDOFF_CURSOR_2026-09-22.md
2. docs/research/2026-09-21/wiring/IMPLEMENTED.md  (last 80 lines + Wave-2 totals)
3. docs/research/2026-09-21/wiring/WIRING-PLAN.md section "NEEDS HUMAN CALL" only

Then pick the next 3 IDs that are in IMPROVEMENT-LEDGER.jsonl and NOT in IMPLEMENTED.md.
Use grep/rg for one ID at a time. Do not cat the jsonl.

For each ID:
- Create TWO new files only: module + colocated test
- JSDoc: arXiv id + ACCEPTANCE GATE comment
- Disabled-by-default flag
- No edits to existing scoring, publish, settlement, schema
- If it needs a behavior change → append one bullet under WIRING-PLAN.md NEEDS HUMAN CALL and skip

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
