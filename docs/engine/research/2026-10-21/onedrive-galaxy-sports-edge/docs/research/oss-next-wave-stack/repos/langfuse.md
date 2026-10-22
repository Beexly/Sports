# Langfuse

## Project Summary

Langfuse is the candidate llm observability, prompt management, evals, datasets layer for GSE / GSN.

Canonical repo: https://github.com/langfuse/langfuse  
Official site: https://langfuse.com  
Docs: https://langfuse.com/docs

## What It Replaces

LangSmith, Helicone, HoneyHive, prompt spreadsheets, manual AI QA

## Verified Capabilities

- LLM traces and spans
- Prompt management
- Datasets and evaluations
- Cost and latency tracking
- OpenTelemetry integrations
- OpenAI/LangChain/LiteLLM integrations

## Deployment Model

Self-host via Docker with web, worker, PostgreSQL, ClickHouse, Redis/blob storage depending version; cloud available

## License / Open-Core Risk

MIT core outside ee/web/src/ee/worker/src/ee; enterprise modules require commercial license

Recommended legal posture: Medium caution. Keep core/enterprise boundaries explicit and avoid copying enterprise code.

## Security / Privacy Risk

Very high sensitivity: prompts, retrieved context, model outputs, user questions, source snippets, costs

Primary risk: Prompt leakage, trace retention, open-core enterprise security features, model output PII

## API / Integration Surface

SDK/API instrumentation around AI calls, RAG retrieval, agent tasks, evals, prompt registry

## GSE Internal Use Cases

- Founder cockpit inputs and dashboards
- Operations workflow automation
- Research-to-build packet conversion
- Brand/content workflow governance
- Reliability, AI, and marketing instrumentation

## GSE Customer-Facing Use Cases

- Faster onboarding
- Better paid-tier education
- Higher-trust alerts and explanations
- Cleaner feedback and support loops
- More measurable conversion paths

## Sports Intelligence Use Cases

- Instrument sports-data ingestion and alert delivery
- Track which research surfaces create conversions
- Evaluate AI-generated reports with trace/eval evidence
- Monitor autonomous sports-data workers
- Build paid-tier API and alert controls

## Revenue / Monetization Use Cases

- FREE to PRO/ELITE conversion measurement
- Paid-tier notification preference control
- Affiliate and creator attribution
- Enterprise demo and API access packaging
- Churn and pricing-objection capture

## Claude Code Implementation Ideas

- Start with a docs/spec packet in the real shipping clone.
- Add event taxonomy, data-boundary, and rollback docs before package install.
- Prototype against fake data or local fixtures only.
- Gate production keys, real customer data, and public exposure behind owner approval.

## What Not To Do

- Do not copy Langfuse source into GSE.
- Do not bypass license or enterprise-feature boundaries.
- Do not connect production customer data during prototype.
- Do not launch public surfaces before privacy, auth, and rollback review.

## Recommended Adoption Mode

Prototype now for internal AI/RAG systems; never log founder-only corpora without redaction policy

## Final Score

strategic: 10/10, speed: 7/10, website: 9/10, cost: 7/10, integration: 10/10, security: 6/10, maintenance: 7/10, revenue: 9/10

## Sources

- https://github.com/langfuse/langfuse
- https://langfuse.com/docs/open-source
- https://langfuse.com/docs/deployment/self-host
