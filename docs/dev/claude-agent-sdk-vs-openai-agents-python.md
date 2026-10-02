# Claude Agent SDK — the correct-vendor replacement for openai/openai-agents-python

**Status: documentation only, no code change.** GSE's own Claude usage is deliberately
Claude-only and narrow (`apps/web/lib/claude-api/*` — a hand-rolled router with a numeric
guard, response cache, and per-surface tier policy). `openai/openai-agents-python` was
evaluated as one of 15 agent frameworks and rejected outright: wrong LLM vendor (OpenAI-
native), wrong language (Python; GSE is TypeScript-strict end to end), and adopting it
would contradict GSE's own architecture. This doc records the same design pattern's
correct-vendor equivalent, for anyone who reads that rejection and wonders what the
Anthropic-native version actually looks like.

## Primitive-by-primitive mapping

| `openai-agents-python` primitive | What it does | Claude Agent SDK / Claude Code equivalent |
|---|---|---|
| `Agent` (a named entity with instructions + a tool allowlist) | Scopes what one agent can do and how it should behave | A subagent definition in `.claude/agents/<name>.md` — GSE already has 7 of these (data-ingestion-agent, prediction-engine-agent, subscriptions-billing-agent, content-publishing-agent, frontend-app-agent, testing-qa-agent, auditor), each tool-scoped exactly the same way |
| `Handoff` (one agent transfers control to another mid-run) | Composes specialized agents into one flow | The `Agent` tool's ability to spawn a named subagent from within a session, or a `Workflow` script's `agent()`/`pipeline()` calls — GSE's own multi-agent ledger (`docs/ops/AGENT_LEDGER.md`) implements a slower, human/session-mediated version of the same idea today |
| `Guardrail` (input/output validation that can halt a run) | Prevents an agent from doing something out of scope | Tool-scoping itself (each `.claude/agents/*.md` restricts which Bash/Edit/etc. commands that agent can invoke, e.g. `auditor` is read-only by construction) plus the repo's own AGENTS.md "THE LAWS" (frozen paths, no secrets, no fabricated data) enforced by session-level policy, not application code |
| `Runner` (executes an agent loop: think, call tools, observe, repeat) | The actual execution engine | The Claude Agent SDK itself — literally what is running this session. No porting needed; it's already the substrate |

## Why this mapping matters in practice

GSE didn't need to adopt anything to get this — it already independently converged on the
same shape (named, tool-scoped agents; a handoff/coordination ledger; guardrails as scope
restriction) using the Claude Agent SDK's own primitives, because that SDK is what every
Claude Code session in this repo already runs on. The `openai-agents-python` evaluation's
real conclusion isn't "GSE is missing an agent framework" — it's "GSE's agent framework is
the one already running it, and it happens to also be the correct one for an all-Claude
architecture."

## One concrete difference worth knowing

`openai-agents-python`'s `Guardrail` type is a first-class, typed object with an explicit
pass/fail return the `Runner` checks before continuing. GSE's equivalent (tool-scoping +
AGENTS.md law text) is enforced at the platform/session level, not as application-visible
TypeScript — there is no `guardrail.ts` a developer can point at inside `apps/web`. This
is a real, if minor, transparency gap: a new contributor reading GSE's own source code
would not discover "auditor can never write files" from the code itself, only from
`.claude/agents/auditor.md`. Not a defect worth fixing by importing a framework — just
worth naming, since it's the one place the OpenAI-native primitive is slightly more
explicit than what GSE has today.
