# GSE / GSN OSS Leverage Stack R&D Swarm Plan

As of: 2026-06-09

## Mission Interpretation

This mission treats the eight screenshot-derived projects as candidate open-source leverage sources for Galaxy Sports Edge / GSN. The goal is to verify canonical sources, map practical leverage into the GSE operating system, and produce Claude Code-ready implementation packets that reduce future human input without creating license, security, data, or production risk.

## Candidate Repo List

| ID | Project | Candidate repo | Official site | Docs |
| --- | --- | --- | --- | --- |
| open-webui | Open WebUI | https://github.com/open-webui/open-webui | https://openwebui.com/ | https://docs.openwebui.com/ |
| twenty | Twenty | https://github.com/twentyhq/twenty | https://twenty.com/ | https://twenty.com/developers |
| hoppscotch | Hoppscotch | https://github.com/hoppscotch/hoppscotch | https://hoppscotch.com/ | https://docs.hoppscotch.io/ |
| cap | Cap | https://github.com/CapSoftware/Cap | https://cap.so/ | https://cap.so/docs |
| chatwoot | Chatwoot | https://github.com/chatwoot/chatwoot | https://www.chatwoot.com/ | https://developers.chatwoot.com/self-hosted |
| listmonk | listmonk | https://github.com/knadh/listmonk | https://listmonk.app/ | https://listmonk.app/docs/ |
| penpot | Penpot | https://github.com/penpot/penpot | https://penpot.app/ | https://help.penpot.app/technical-guide/getting-started/ |
| anythingllm | AnythingLLM | https://github.com/Mintplex-Labs/anything-llm | https://anythingllm.com/ | https://docs.anythingllm.com/ |

## Verification Strategy

- Prefer primary sources: GitHub REST metadata, repo license files, official docs, official pricing/self-host docs, and repository file trees.
- Treat screenshot claims as untrusted until matched to canonical repo/docs.
- Use GitHub API for stars, forks, latest release, latest commit, license SPDX, open issue counts, and public security-advisory query counts.
- Use repository file trees only as evidence that files exist, not as proof a feature is production-ready.
- Mark unknowns and edition limits clearly.
- Do not clone or run untrusted code unless a later owner-approved sandbox exists.

## Tools Available

- GitHub REST API through PowerShell.
- Web search/open on official docs and license pages.
- Local filesystem writes for documentation under `docs/research/oss-leverage-stack/`.
- No Docker execution, no dependency install, no production services, no secrets.

## Commands Planned

- Query GitHub repo metadata, releases, commits, license endpoint, license file, recursive tree, and public security advisories.
- Open official docs for license, self-hosting, APIs, webhooks, RAG, support, newsletters, and design/deployment.
- Generate markdown, CSV, JSONL, and build-card files.
- Validate file presence and build-card counts.

## No-Go Boundaries

- No production code changes.
- No dependency additions to GSE.
- No Docker Compose or service startup.
- No production data, customer data, sportsbook data, or secrets.
- No copying repo source code into GSE.
- No public product page or customer-facing launch.
- No AGPL/GPL/MPL/custom-license use without legal boundary review.
- No founder-only methods in customer/public RAG.

## Safety Rules

- Secrets stay out of chat, docs, logs, screenshots, and generated prompts.
- All build cards default to isolated prototypes or docs-first changes.
- All self-hosting uses version pins, backups, auth, SMTP, storage, and rollback planning before launch.
- AI/RAG corpora are separated by public, customer, internal, and founder-only boundaries.
- Customer support and newsletter systems are treated as PII systems.

## Output Files

- `00-swarm-plan.md`
- `01-repo-verification.md`
- `repo-inventory.csv`
- `repos/*.md`
- `02-gse-fit-map.md`
- `03-cross-stack-architecture.md`
- `04-saas-replacement-map.md`
- `05-ai-rag-knowledge-strategy.md`
- `06-growth-ops-strategy.md`
- `07-product-dev-strategy.md`
- `08-security-risk-register.md`
- `claude-build-queue/index.md`
- `claude-build-queue/build-queue.jsonl`
- `claude-build-queue/cards/BUILD-*.md`
- `09-final-decision-matrix.md`
- `10-final-report.md`

## Workstreams

| Agent | Workstream | Output |
| --- | --- | --- |
| AGENT 0 | Coordinator / Final Integrator | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 1 | Repo Verification / Canonical Source Finder | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 2 | License / Legal / Open-Core Risk Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 3 | Security / Deployment / Self-Hosting Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 4 | GSE Product Fit Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 5 | GSE Internal Operations Fit Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 6 | Data / API / Webhook / Integration Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 7 | AI / RAG / Knowledge System Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 8 | CRM / Sales / Pipeline Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 9 | Support / Customer Success Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 10 | Newsletter / Alerts / Lifecycle Marketing Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 11 | Design / Product Workflow Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 12 | API Testing / Developer Tooling Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 13 | Screen Recording / Onboarding / Trust Content Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 14 | Architecture / Deployment Topology Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 15 | Cost Replacement / SaaS Arbitrage Analyst | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 16 | Claude Code Build Packet Generator | Emulated as a separate workstream file/section; native parallel agents were not required. |
| AGENT 17 | Risk Register / Go-No-Go Reviewer | Emulated as a separate workstream file/section; native parallel agents were not required. |

## Merge Strategy

The coordinator merges each workstream into a single evidence set. Conflicts are resolved by primary-source priority: official license files and docs outrank READMEs, READMEs outrank community commentary, and file-tree presence only proves a file exists.

## Claude Code Handoff Format

Every build card includes goal, repo context, license boundary, security boundary, implementation plan, testing plan, acceptance criteria, rollback, and a ready-to-paste Claude Code prompt. Claude must verify the active GSE clone before editing and must not touch production secrets or launch gates unless explicitly approved.
