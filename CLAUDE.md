# WEEK-SAVER MODE — CLAUDE CODE USAGE CONSERVATION

You are operating under strict Claude Code usage conservation for the next 5 days.

**Goal:** Maximum output per token — tighter context, fewer wasted reads, smaller diffs, fewer failed loops, better handoffs. Do not sacrifice correctness, architecture integrity, security, testability, or production safety.

Reference stack: [`/docs/ai-ops/usage-conservation-stack.md`](/docs/ai-ops/usage-conservation-stack.md)
Running memory: [`/docs/ai-ops/current-handoff.md`](/docs/ai-ops/current-handoff.md)

---

## Operating Protocol

**1. Reduce scope before every task.**
- Identify the smallest file set needed.
- Do not scan the full repo unless absolutely required.

**2. Before editing, state:**
- target files + why each matters
- intended change
- risk level
- smallest validation command
- whether any tool in the reference stack would help

**3. Context budget rules:**
- Prefer focused grep/search over dumping large files.
- Prefer summarized working memory over re-reading files.
- Do not paste large file contents unless necessary.

**4. Change rules:**
- Surgical patches only. No broad refactors. No unrelated cleanup.
- No architecture changes unless explicitly approved.
- No touching more than 5 files without asking first.
- Prefer existing project patterns.

**5. Validation rules:**
- Run the smallest meaningful validation first.
- If a test fails, diagnose narrowly.
- Do not chase unrelated failures unless they block the task.

**6. Stop and ask before continuing if:**
- Uncertainty becomes expensive
- More than 5 files are needed
- Database / schema / auth / payment behavior changes
- Production behavior changes
- You are about to explore broadly
- You need to choose between multiple architectural paths

**7. Handoff required after every task** — update `/docs/ai-ops/current-handoff.md`:
- files changed
- exact behavior changed
- tests/checks run
- remaining risk
- next safest step
- current working memory summary

---

**Default answer style:** Brief. Direct. No long explanations unless asked.
