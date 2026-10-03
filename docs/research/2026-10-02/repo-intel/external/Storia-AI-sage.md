# Storia-AI/sage — 1,265 stars

## 1. Vision
"Chat with any codebase in under two minutes" — an open-source GitHub-Copilot-style assistant for learning how a codebase works and how to integrate it. Runs fully locally or via third-party LLM APIs, with a hosted app and docs site.

## 2. The Ask
Needs an LLM provider key (Anthropic/Claude supported per topics) or local model setup, plus repo indexing on first use. The "under two minutes" claim assumed a hosted index or fast local embedding.

## 3. Constraints
- License: Apache-2.0.
- Scale: indexing cost per repo; chat quality bounded by the retrieval layer, which was pre-agentic-era RAG.
- Maintenance: DEAD — repository is ARCHIVED, last push 2024-11-11. The company (Storia AI) appears to have moved on; hosted app likely unmaintained.

## 4. GSE lens
No live gap this fills that the other tools in this set don't fill better. The idea — conversational codebase Q&A — is subsumed by GSE's actual agent fleet: Garrett's agents don't need a chatbot wrapper, they need structured repo context (digests, maps, persistent memory). Including it here only as a cautionary data point: even a 1.2k-star "chat with your codebase" product died because the chatbot was the wrong interface for the problem.

## 5. Verdict
IGNORE — archived project; the interface idea is obsolete for an agent fleet.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/Storia-AI/sage
- GitDiagram: https://gitdiagram.com/Storia-AI/sage
- Star history: https://star-history.com/#Storia-AI/sage (1,265 stars)
- github.dev: https://github.dev/Storia-AI/sage
