# AsyncFuncAI/deepwiki-open — 18,111 stars

## 1. Vision
Open-source clone of DeepWiki: point it at any GitHub/GitLab/Bitbucket repo and it analyzes code structure, generates comprehensive documentation, draws visual diagrams, organizes everything into a navigable wiki, and builds a "codemap" for code-centric guided tours. Now rebranded with a hosted "Grok Wiki" 2.0 at grok-wiki.com.

## 2. The Ask
Needs an LLM provider key (supports Codex, Gemini, Grok CLI, Ollama per its topics) plus hosting for the web app, or use their hosted grok-wiki.com. The wiki generation itself is LLM-heavy — every page costs tokens, and regeneration is needed as the repo changes.

## 3. Constraints
- License: MIT (repo). The hosted grok-wiki.com is a separate commercial surface.
- Scale: full-repo wiki generation is expensive on large codebases; freshness is manual (regenerate or go stale).
- Maintenance: ALIVE-ish — pushed 2026-09-03, 18.1k stars, but recent energy is going into the hosted 2.0 product rather than the open repo. Single-maintainer risk (sng-asyncfunc).

## 4. GSE lens
GSE's Sports repo accumulates docs/research daily plus a growing wiring backlog, and the agent fleet has no living documentation surface — knowledge lives in scattered markdown and agent context. A generated wiki over Sports would help, but this project's one-shot generation model fights GSE's reality: the repo changes daily, and a wiki that goes stale in a week is worse than none. The deeper gap it exposes is that GSE has no *maintained* understanding layer at all — not even a stale one.

## 5. Verdict
REBUILD — the pipeline shape (clone → structure analysis → outline → per-page generation → diagrams) is the method to learn, but rebuild it as a GSE-internal, incrementally-updated wiki over Sports, not as an adoption of this app. The better blueprint is andyhtran/deepwiki-by-cc (agentic, claim-verified pages).

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/AsyncFuncAI/deepwiki-open
- GitDiagram: https://gitdiagram.com/AsyncFuncAI/deepwiki-open
- Star history: https://star-history.com/#AsyncFuncAI/deepwiki-open (18,111 stars)
- github.dev: https://github.dev/AsyncFuncAI/deepwiki-open
