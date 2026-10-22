# AI / RAG / Knowledge System Strategy

As of: 2026-06-09

## Direct Answers

1. Use AnythingLLM first for document/workspace RAG. Use Open WebUI only as an isolated internal model/chat lab with branding/license limits respected.
2. Better for private internal research: AnythingLLM, because workspace RAG, document ingestion, embedded/API options, and MIT license reduce legal friction.
3. Better for document-based sports intelligence: AnythingLLM first; Open WebUI is useful for model experimentation and broad AI chat workflows.
4. Better for customer-facing support: Chatwoot plus a strictly public/customer-safe AnythingLLM Help Brain.
5. Safer around proprietary data: neither is safe by default. AnythingLLM is safer legally, but both require isolated hosting, provider-key rules, corpus separation, access controls, and evals.
6. Citations: both need citation evals. Open WebUI knowledge APIs and AnythingLLM RAG must be tested against GSE source snippets.
7. Provider integration: Open WebUI is strong for Ollama/OpenAI-compatible model operations; AnythingLLM docs list local and cloud LLM/embedder/vector providers.
8. Agents/workflows: AnythingLLM has agent flows and skills; Open WebUI has tools/functions/skills concepts.
9. Ingestion: AnythingLLM source tree shows repo, website, wiki/docs, YouTube, Obsidian, GitHub/GitLab, and other loaders; Open WebUI supports file upload, directories, and sync APIs.
10. Founder-only separation: separate instance or at minimum separate workspaces, API keys, user groups, and vector stores.
11. Leakage prevention: redact source maps, never mix Method Brain with Help Brain, block private browsing tools, eval every answer for method leakage, log citations.
12. Claude Code connection: build queue reads approved markdown cards only; RAG can summarize completed research docs but must not mutate code or execute tools.

## Internal GSE Research Brain

Repo: AnythingLLM primary, Open WebUI optional model lab. Data: public docs, research artifacts, and approved sports source maps. Output: source-cited briefs, build-card drafts, source gap lists.

## Founder-Only GSE Method Brain

Repo: AnythingLLM isolated instance or air-gapped desktop. Data: proprietary methodology, edge logic, founder strategy, pricing/risk notes. No customer/public access.

## Customer-Facing Help Brain

Repo: Chatwoot plus AnythingLLM public corpus. Data: approved help docs, pricing FAQ, onboarding, and terms-safe methodology snippets. Human approval before autonomous replies.

## Sports-Source Citation Brain

Repo: AnythingLLM and Hoppscotch. Data: source docs, endpoint contracts, freshness policies, ingestion QA notes. Output: citation packets and stale-source warnings.

## Support/Copilot Brain

Repo: Chatwoot plus AnythingLLM. Data: public support KB and redacted resolved tickets. Output: draft replies, escalation tags, retention risk notes.

## Build Cards

Primary: BUILD-013 through BUILD-024, BUILD-098, BUILD-110 through BUILD-120.
