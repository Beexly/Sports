# OpenBMB/RepoAgent — 1,053 stars

## 1. Vision
An LLM-powered framework for repository-level documentation generation, from the OpenBMB group (arXiv 2402.16667). Bottom-up approach: generate per-file documentation, then synthesize project-level docs from the file docs. The research contribution is a structured, citation-backed documentation pipeline rather than a chat UI.

## 2. The Ask
Needs an LLM API key (built for GPT-4-era models; ChatGLM/ChatGPT per topics) and a Python environment. It processes a repo file-by-file, so the token bill scales with codebase size. Configuration for which files to include and documentation templates.

## 3. Constraints
- License: Apache-2.0.
- Scale: file-by-file LLM processing is the most expensive documentation strategy in this category; no incremental update path in the original design.
- Maintenance: STALE — last push 2024-12-23. The paper (Feb 2024) is the durable artifact; the code targets a two-generations-old model landscape.

## 4. GSE lens
The repo itself is not usable, but the *paper's method* is directly relevant: bottom-up per-file summaries composed into project documentation is exactly the pipeline GSE would need for a living Sports wiki, and the arXiv paper gives it an evaluated, citable foundation. GSE's gap is the absence of any such pipeline — documentation is hand-written markdown that rots. This is a "read the paper, not the code" case.

## 5. Verdict
REBUILD — adopt the paper's method (arXiv 2402.16667), not the repository. Per the re-implementation rule, rebuild the bottom-up summarization pipeline as GSE's own internal tooling with current models.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/OpenBMB/RepoAgent
- GitDiagram: https://gitdiagram.com/OpenBMB/RepoAgent
- Star history: https://star-history.com/#OpenBMB/RepoAgent (1,053 stars)
- github.dev: https://github.dev/OpenBMB/RepoAgent
