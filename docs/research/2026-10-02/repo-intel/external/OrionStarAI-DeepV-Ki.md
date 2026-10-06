# OrionStarAI/DeepV-Ki — 298 stars

## 1. Vision
AI-powered wiki generator for code repositories (GitHub/GitLab/Bitbucket): paste a repo URL, get automatic code-structure analysis, detailed docs, Mermaid architecture diagrams, and an interactive knowledge base with RAG-based code Q&A. Python backend + Next.js 15 frontend.

## 2. The Ask
Needs an LLM API key for generation, a Python 3.12+ environment, and Node for the frontend. RAG Q&A implies an embedding model and a vector store (local or hosted) that must be built per repo and refreshed as code changes.

## 3. Constraints
- License: MIT.
- Scale: the RAG index is per-repo and must be rebuilt on code change — on a fast-moving repo like Sports, index freshness is the real operating cost, not generation.
- Maintenance: QUIET — pushed 2026-03-26, 298 stars. Not dead, but not visibly accelerating.

## 4. GSE lens
The RAG-over-codebase Q&A pattern is the one genuinely missing piece in GSE's agent stack: the fleet has raw code and hand-written docs, but no queryable "ask the repo" layer that survives across sessions and machines. DeepV-Ki's architecture (structure analysis → docs → diagrams → RAG index) is a reasonable blueprint. But honestly, it duplicates what cerebro-code-memory does cheaper (SQLite, no vector DB) and what deepwiki-by-cc does more rigorously (claim-verified pages). It reveals the gap without being the best fix for it.

## 5. Verdict
REBUILD — learn the RAG-Q&A-over-repo pattern, but implement it on the cheaper cerebro-style substrate (structured map + cached summaries) rather than adopting this full stack.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/OrionStarAI/DeepV-Ki
- GitDiagram: https://gitdiagram.com/OrionStarAI/DeepV-Ki
- Star history: https://star-history.com/#OrionStarAI/DeepV-Ki (298 stars)
- github.dev: https://github.dev/OrionStarAI/DeepV-Ki
