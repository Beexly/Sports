# WEEK-SAVER MODE — CLAUDE CODE USAGE CONSERVATION STACK

You are operating under strict Claude Code usage conservation for the next 5 days.

My current problem:
I have already used a large portion of my Claude Code usage, but I still need high-integrity work. The goal is not to work slower. The goal is maximum output per token: tighter context, fewer wasted file reads, smaller diffs, fewer failed loops, and better handoffs.

Core rule:
Do not sacrifice correctness, architecture integrity, security, testability, or production safety. Save usage by reducing waste, not by lowering standards.

Use these repositories/concepts as the operating reference set:

Usage tracking:
- https://github.com/ccusage/ccusage
- https://github.com/cobra91/better-ccusage
- https://github.com/Nihondo/AgentLimits

Claude Code routing / model discipline:
- https://github.com/musistudio/claude-code-router
- https://github.com/9j/claude-code-mux
- https://github.com/finch-xu/cc-router

Context compression / repo packing:
- https://github.com/yamadashy/repomix
- https://github.com/mufeedvh/code2prompt
- https://github.com/cyclotruc/gitingest
- https://github.com/microsoft/LLMLingua
- https://github.com/scaledown-team/semantic-code-compression

Claude memory / context management:
- https://github.com/zilliztech/claude-context
- https://github.com/thedotmack/claude-mem
- https://github.com/coleam00/context-engineering-intro

Observability / cost visibility:
- https://github.com/langfuse/langfuse
- https://github.com/Helicone/helicone
- https://github.com/Portkey-AI/gateway
- https://github.com/BerriAI/litellm

Coding-agent efficiency references:
- https://github.com/Aider-AI/aider
- https://github.com/sst/opencode
- https://github.com/continuedev/continue
- https://github.com/openai/codex

Important:
Do not clone, install, or deeply inspect all of these automatically. Treat them as reference architecture. Only recommend or use one if it directly helps the current task.

Operating protocol:

1. Before every task, reduce scope.
   - Identify the smallest file set needed.
   - Do not scan the full repo unless absolutely required.
   - Do not inspect unrelated routes, components, tests, docs, or config.

2. Before editing, give me:
   - target files
   - why each file matters
   - intended change
   - risk level
   - smallest validation command
   - whether any repo/tool above would help

3. Context budget rules:
   - Prefer `repomix`, `code2prompt`, or focused grep/search over dumping large files.
   - Prefer summarized working memory over rereading the same files.
   - Keep a running handoff note after each task.
   - Do not paste large file contents unless necessary.
   - Do not generate broad implementation essays.

4. Change rules:
   - Surgical patches only.
   - No broad refactors.
   - No unrelated cleanup.
   - No architecture changes unless explicitly approved.
   - No touching more than 5 files without asking first.
   - Prefer existing project patterns.

5. Validation rules:
   - Run the smallest meaningful validation first.
   - Do not repeatedly run expensive commands without reason.
   - If a test fails, diagnose narrowly.
   - Do not chase unrelated failures unless they block the task.

6. Stop conditions:
   Stop and ask before continuing if:
   - uncertainty becomes expensive
   - more than 5 files are needed
   - database/schema/auth/payment behavior changes
   - production behavior changes
   - the repo structure is unclear
   - you are about to explore broadly
   - you need to choose between multiple architectural paths

7. Handoff required after every task:
   - files changed
   - exact behavior changed
   - tests/checks run
   - remaining risk
   - next safest step
   - current working memory summary

Default answer style:
Brief. Direct. No long explanations unless I ask.
