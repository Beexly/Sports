# Claude Build Queue Index

As of: 2026-06-09

Total build cards: 120

This queue is designed for low-human-touch execution. Every card is docs-first or sandbox-first unless explicit owner approval is added later. The queue intentionally avoids production secrets, deployments, billing, and launch gates.

| ID | Title | Category | Repos | Priority | Difficulty | Mode | License risk | Security risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BUILD-001 | OSS stack decision matrix | A. Foundation / Infrastructure | anythingllm, hoppscotch | P0 | S | internal-only tool | LOW | MEDIUM |
| BUILD-002 | isolated deployment lab | A. Foundation / Infrastructure | anythingllm, hoppscotch | P0 | M | internal-only tool | LOW | MEDIUM |
| BUILD-003 | secrets boundary map | A. Foundation / Infrastructure | anythingllm, hoppscotch | P0 | S | internal-only tool | LOW | HIGH |
| BUILD-004 | docker compose sandbox template | A. Foundation / Infrastructure | anythingllm, hoppscotch | P0 | L | internal-only tool | LOW | MEDIUM |
| BUILD-005 | service health monitor | A. Foundation / Infrastructure | anythingllm, hoppscotch | P0 | M | internal-only tool | LOW | MEDIUM |
| BUILD-006 | backup and restore strategy | A. Foundation / Infrastructure | anythingllm, hoppscotch | P0 | M | internal-only tool | LOW | MEDIUM |
| BUILD-007 | auth and SSO map | A. Foundation / Infrastructure | anythingllm, hoppscotch | P0 | S | internal-only tool | LOW | MEDIUM |
| BUILD-008 | internal DNS and service routing | A. Foundation / Infrastructure | anythingllm, hoppscotch | P0 | L | internal-only tool | LOW | MEDIUM |
| BUILD-009 | observability map | A. Foundation / Infrastructure | anythingllm, hoppscotch | P0 | S | internal-only tool | LOW | MEDIUM |
| BUILD-010 | update and pinning policy | A. Foundation / Infrastructure | anythingllm, hoppscotch | P0 | S | internal-only tool | LOW | MEDIUM |
| BUILD-011 | license scanner workflow | A. Foundation / Infrastructure | anythingllm, hoppscotch | P0 | S | internal-only tool | LOW | MEDIUM |
| BUILD-012 | security advisory monitor | A. Foundation / Infrastructure | twenty | P0 | L | internal-only tool | HIGH | MEDIUM |
| BUILD-013 | GSE Research Brain | B. AI / RAG / Research | anythingllm, open-webui | P0 | S | self-hosted service | HIGH | HIGH |
| BUILD-014 | founder-only Method Brain | B. AI / RAG / Research | anythingllm, open-webui | P0 | M | self-hosted service | HIGH | HIGH |
| BUILD-015 | public Help Brain | B. AI / RAG / Research | anythingllm, open-webui | P0 | M | self-hosted service | HIGH | HIGH |
| BUILD-016 | source citation knowledge base | B. AI / RAG / Research | hoppscotch, anythingllm, open-webui | P0 | L | API integration | HIGH | MEDIUM |
| BUILD-017 | sports data R&D ingestion | B. AI / RAG / Research | hoppscotch, anythingllm, open-webui | P0 | M | API integration | HIGH | MEDIUM |
| BUILD-018 | Claude build queue assistant | B. AI / RAG / Research | anythingllm, open-webui | P0 | M | API integration | HIGH | MEDIUM |
| BUILD-019 | internal docs assistant | B. AI / RAG / Research | anythingllm, open-webui | P0 | M | API integration | HIGH | MEDIUM |
| BUILD-020 | support copilot | B. AI / RAG / Research | chatwoot, anythingllm, open-webui | P0 | L | API integration | HIGH | HIGH |
| BUILD-021 | article research assistant | B. AI / RAG / Research | anythingllm, open-webui | P0 | S | API integration | HIGH | MEDIUM |
| BUILD-022 | RAG leakage guard | B. AI / RAG / Research | anythingllm, open-webui | P0 | M | self-hosted service | HIGH | HIGH |
| BUILD-023 | model/provider routing policy | B. AI / RAG / Research | anythingllm, open-webui | P0 | S | API integration | HIGH | MEDIUM |
| BUILD-024 | RAG eval and citation scorecard | B. AI / RAG / Research | anythingllm, open-webui | P0 | S | self-hosted service | HIGH | HIGH |
| BUILD-025 | Twenty lead schema | C. CRM / Sales | twenty | P0 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-026 | GSE prospect pipeline | C. CRM / Sales | twenty | P0 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-027 | advisor and investor CRM | C. CRM / Sales | twenty | P0 | M | internal-only tool | HIGH | HIGH |
| BUILD-028 | affiliate and creator pipeline | C. CRM / Sales | twenty | P0 | L | internal-only tool | HIGH | MEDIUM |
| BUILD-029 | enterprise prospect flow | C. CRM / Sales | twenty | P0 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-030 | lead scoring model | C. CRM / Sales | twenty | P0 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-031 | newsletter-to-CRM sync | C. CRM / Sales | twenty, listmonk | P1 | M | internal-only tool | HIGH | HIGH |
| BUILD-032 | support-to-CRM sync | C. CRM / Sales | twenty, chatwoot, anythingllm | P1 | L | internal-only tool | HIGH | HIGH |
| BUILD-033 | churn-risk account tagging | C. CRM / Sales | twenty | P1 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-034 | sales task automation | C. CRM / Sales | twenty | P1 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-035 | B2B partner opportunity board | C. CRM / Sales | twenty | P1 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-036 | pricing objection capture | C. CRM / Sales | twenty, cap | P1 | L | internal-only tool | HIGH | MEDIUM |
| BUILD-037 | Chatwoot support inbox | D. Support / Customer Success | chatwoot, anythingllm | P1 | M | internal-only tool | MEDIUM | HIGH |
| BUILD-038 | pricing objection tracker | D. Support / Customer Success | chatwoot, anythingllm | P1 | M | internal-only tool | MEDIUM | MEDIUM |
| BUILD-039 | product feedback loop | D. Support / Customer Success | chatwoot, anythingllm | P1 | M | internal-only tool | MEDIUM | MEDIUM |
| BUILD-040 | support knowledge base | D. Support / Customer Success | chatwoot, anythingllm | P1 | L | internal-only tool | MEDIUM | HIGH |
| BUILD-041 | support-to-build-card flow | D. Support / Customer Success | chatwoot, anythingllm | P1 | M | internal-only tool | MEDIUM | HIGH |
| BUILD-042 | AI support copilot | D. Support / Customer Success | chatwoot, anythingllm, open-webui | P1 | M | internal-only tool | HIGH | HIGH |
| BUILD-043 | retention rescue flow | D. Support / Customer Success | chatwoot, anythingllm | P1 | M | internal-only tool | MEDIUM | MEDIUM |
| BUILD-044 | bug report triage | D. Support / Customer Success | chatwoot, anythingllm | P1 | L | internal-only tool | MEDIUM | MEDIUM |
| BUILD-045 | customer segmentation | D. Support / Customer Success | chatwoot, anythingllm | P1 | M | internal-only tool | MEDIUM | HIGH |
| BUILD-046 | in-app chat architecture | D. Support / Customer Success | chatwoot, anythingllm | P1 | M | internal-only tool | MEDIUM | MEDIUM |
| BUILD-047 | support SLA and escalation map | D. Support / Customer Success | chatwoot, anythingllm | P1 | S | internal-only tool | MEDIUM | HIGH |
| BUILD-048 | customer trust issue ledger | D. Support / Customer Success | chatwoot, anythingllm | P1 | L | internal-only tool | MEDIUM | HIGH |
| BUILD-049 | listmonk free newsletter | E. Newsletter / Lifecycle / Alerts | listmonk | P1 | M | self-hosted service | HIGH | MEDIUM |
| BUILD-050 | GSE Daily Brief | E. Newsletter / Lifecycle / Alerts | listmonk, anythingllm, open-webui | P1 | M | self-hosted service | HIGH | MEDIUM |
| BUILD-051 | injury alert digest | E. Newsletter / Lifecycle / Alerts | listmonk | P1 | M | self-hosted service | HIGH | MEDIUM |
| BUILD-052 | market movement digest | E. Newsletter / Lifecycle / Alerts | listmonk | P1 | L | self-hosted service | HIGH | MEDIUM |
| BUILD-053 | product updates campaign | E. Newsletter / Lifecycle / Alerts | listmonk, anythingllm, open-webui | P1 | M | self-hosted service | HIGH | MEDIUM |
| BUILD-054 | onboarding sequence | E. Newsletter / Lifecycle / Alerts | listmonk | P1 | M | self-hosted service | HIGH | MEDIUM |
| BUILD-055 | paid conversion sequence | E. Newsletter / Lifecycle / Alerts | listmonk, anythingllm, open-webui | P1 | M | self-hosted service | HIGH | MEDIUM |
| BUILD-056 | churn winback sequence | E. Newsletter / Lifecycle / Alerts | listmonk | P1 | L | self-hosted service | HIGH | MEDIUM |
| BUILD-057 | weekly track record email | E. Newsletter / Lifecycle / Alerts | listmonk, anythingllm, open-webui | P1 | M | self-hosted service | HIGH | HIGH |
| BUILD-058 | content distribution workflow | E. Newsletter / Lifecycle / Alerts | listmonk | P1 | M | self-hosted service | HIGH | MEDIUM |
| BUILD-059 | source-driven article digest | E. Newsletter / Lifecycle / Alerts | listmonk, hoppscotch | P1 | M | self-hosted service | HIGH | MEDIUM |
| BUILD-060 | subscriber preference center | E. Newsletter / Lifecycle / Alerts | listmonk | P1 | L | self-hosted service | HIGH | MEDIUM |
| BUILD-061 | Hoppscotch collections | F. API / Data Testing | hoppscotch | P1 | M | API integration | LOW | MEDIUM |
| BUILD-062 | odds API test suite | F. API / Data Testing | hoppscotch | P1 | M | API integration | LOW | MEDIUM |
| BUILD-063 | weather API test suite | F. API / Data Testing | hoppscotch | P1 | M | API integration | LOW | MEDIUM |
| BUILD-064 | news and RSS endpoint test suite | F. API / Data Testing | hoppscotch | P1 | L | API integration | LOW | MEDIUM |
| BUILD-065 | GSE internal API collections | F. API / Data Testing | hoppscotch | P1 | M | API integration | LOW | MEDIUM |
| BUILD-066 | public API product collections | F. API / Data Testing | hoppscotch | P1 | M | API integration | LOW | MEDIUM |
| BUILD-067 | webhook test harness | F. API / Data Testing | hoppscotch | P1 | M | API integration | LOW | MEDIUM |
| BUILD-068 | ingestion endpoint QA | F. API / Data Testing | hoppscotch | P1 | L | API integration | LOW | MEDIUM |
| BUILD-069 | auth flow QA | F. API / Data Testing | hoppscotch | P1 | M | API integration | LOW | MEDIUM |
| BUILD-070 | stale source QA | F. API / Data Testing | hoppscotch | P1 | M | API integration | LOW | MEDIUM |
| BUILD-071 | sports data contract tests | F. API / Data Testing | hoppscotch | P1 | M | API integration | LOW | MEDIUM |
| BUILD-072 | API docs playground | F. API / Data Testing | hoppscotch | P1 | L | API integration | LOW | MEDIUM |
| BUILD-073 | Penpot adoption research | G. Design / Product Workflow | penpot, anythingllm, open-webui | P1 | S | pattern only | HIGH | MEDIUM |
| BUILD-074 | design token map | G. Design / Product Workflow | penpot | P1 | S | internal-only tool | MEDIUM | MEDIUM |
| BUILD-075 | component system workflow | G. Design / Product Workflow | penpot | P1 | M | internal-only tool | MEDIUM | MEDIUM |
| BUILD-076 | prototype-to-code workflow | G. Design / Product Workflow | penpot | P2 | L | internal-only tool | MEDIUM | MEDIUM |
| BUILD-077 | GSE page redesign workflow | G. Design / Product Workflow | penpot | P2 | M | internal-only tool | MEDIUM | MEDIUM |
| BUILD-078 | mobile-first review workflow | G. Design / Product Workflow | penpot | P2 | M | internal-only tool | MEDIUM | MEDIUM |
| BUILD-079 | screenshot QA workflow | G. Design / Product Workflow | penpot | P2 | M | internal-only tool | MEDIUM | MEDIUM |
| BUILD-080 | design handoff checklist | G. Design / Product Workflow | penpot | P2 | L | internal-only tool | MEDIUM | MEDIUM |
| BUILD-081 | design system governance | G. Design / Product Workflow | penpot | P2 | M | internal-only tool | MEDIUM | MEDIUM |
| BUILD-082 | design inspiration library | G. Design / Product Workflow | penpot | P2 | M | internal-only tool | MEDIUM | MEDIUM |
| BUILD-083 | pricing page prototype loop | G. Design / Product Workflow | penpot | P2 | M | internal-only tool | MEDIUM | MEDIUM |
| BUILD-084 | trust surface design kit | G. Design / Product Workflow | penpot | P2 | L | internal-only tool | MEDIUM | MEDIUM |
| BUILD-085 | Cap internal demo workflow | H. Video / Onboarding / Trust | cap | P2 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-086 | bug reproduction workflow | H. Video / Onboarding / Trust | cap | P2 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-087 | customer onboarding clips | H. Video / Onboarding / Trust | chatwoot, anythingllm, cap | P2 | M | internal-only tool | HIGH | HIGH |
| BUILD-088 | feature release clips | H. Video / Onboarding / Trust | cap | P2 | L | internal-only tool | HIGH | MEDIUM |
| BUILD-089 | support video replies | H. Video / Onboarding / Trust | chatwoot, anythingllm, cap | P2 | M | internal-only tool | HIGH | HIGH |
| BUILD-090 | sales demo clips | H. Video / Onboarding / Trust | twenty, cap | P2 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-091 | investor demo clips | H. Video / Onboarding / Trust | cap | P2 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-092 | product education library | H. Video / Onboarding / Trust | cap | P2 | L | internal-only tool | HIGH | MEDIUM |
| BUILD-093 | trust and track-record explainer clips | H. Video / Onboarding / Trust | cap, anythingllm, open-webui | P2 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-094 | Claude Code visual QA packets | H. Video / Onboarding / Trust | cap | P2 | M | internal-only tool | HIGH | MEDIUM |
| BUILD-095 | weekly founder update video | H. Video / Onboarding / Trust | cap | P2 | M | internal-only tool | HIGH | HIGH |
| BUILD-096 | enterprise walkthrough library | H. Video / Onboarding / Trust | twenty, cap | P2 | L | internal-only tool | HIGH | MEDIUM |
| BUILD-097 | support conversation to CRM | I. Cross-Stack Automations | twenty, chatwoot, anythingllm | P2 | M | webhook integration | HIGH | HIGH |
| BUILD-098 | CRM segment to listmonk | I. Cross-Stack Automations | twenty | P2 | M | webhook integration | HIGH | HIGH |
| BUILD-099 | listmonk campaign to Chatwoot follow-up | I. Cross-Stack Automations | chatwoot, anythingllm, listmonk, open-webui | P2 | M | webhook integration | HIGH | MEDIUM |
| BUILD-100 | Cap video into support docs | I. Cross-Stack Automations | chatwoot, anythingllm, cap | P2 | L | webhook integration | HIGH | HIGH |
| BUILD-101 | Hoppscotch test failure into build card | I. Cross-Stack Automations | hoppscotch, anythingllm, open-webui | P2 | M | webhook integration | HIGH | MEDIUM |
| BUILD-102 | RAG docs from research artifacts | I. Cross-Stack Automations | anythingllm, open-webui | P2 | S | webhook integration | HIGH | HIGH |
| BUILD-103 | customer question into article idea | I. Cross-Stack Automations | chatwoot, anythingllm | P2 | M | webhook integration | MEDIUM | HIGH |
| BUILD-104 | churn tag into retention email | I. Cross-Stack Automations | anythingllm, open-webui | P2 | L | webhook integration | HIGH | HIGH |
| BUILD-105 | feature request into backlog card | I. Cross-Stack Automations | anythingllm | P2 | M | webhook integration | LOW | MEDIUM |
| BUILD-106 | weekly founder cockpit digest | I. Cross-Stack Automations | anythingllm | P2 | M | webhook integration | LOW | HIGH |
| BUILD-107 | security advisory into risk card | I. Cross-Stack Automations | twenty | P2 | M | webhook integration | HIGH | MEDIUM |
| BUILD-108 | newsletter engagement into lead score | I. Cross-Stack Automations | twenty, listmonk | P2 | L | webhook integration | HIGH | MEDIUM |
| BUILD-109 | customer-facing AI help center | J. Productized GSE Features | chatwoot, anythingllm, open-webui | P2 | M | API integration | HIGH | HIGH |
| BUILD-110 | GSE research assistant for PRO and ELITE | J. Productized GSE Features | anythingllm, open-webui | P2 | S | API integration | HIGH | MEDIUM |
| BUILD-111 | personalized alert digest | J. Productized GSE Features | listmonk | P2 | M | API integration | HIGH | MEDIUM |
| BUILD-112 | source transparency snippets | J. Productized GSE Features | hoppscotch | P2 | L | API integration | LOW | MEDIUM |
| BUILD-113 | onboarding wizard | J. Productized GSE Features | anythingllm | P2 | M | API integration | LOW | MEDIUM |
| BUILD-114 | customer feedback radar | J. Productized GSE Features | chatwoot, anythingllm | P2 | M | API integration | MEDIUM | HIGH |
| BUILD-115 | paid tier education sequence | J. Productized GSE Features | anythingllm, open-webui | P2 | M | API integration | HIGH | MEDIUM |
| BUILD-116 | API playground | J. Productized GSE Features | hoppscotch | P2 | L | API integration | LOW | MEDIUM |
| BUILD-117 | premium support lane | J. Productized GSE Features | chatwoot, anythingllm | P2 | M | API integration | MEDIUM | HIGH |
| BUILD-118 | enterprise demo portal | J. Productized GSE Features | twenty | P2 | M | API integration | HIGH | MEDIUM |
| BUILD-119 | methodology-safe citation explainer | J. Productized GSE Features | anythingllm, open-webui | P2 | M | API integration | HIGH | HIGH |
| BUILD-120 | user-specific sports watchlist brain | J. Productized GSE Features | anythingllm, open-webui | P2 | L | API integration | HIGH | HIGH |
