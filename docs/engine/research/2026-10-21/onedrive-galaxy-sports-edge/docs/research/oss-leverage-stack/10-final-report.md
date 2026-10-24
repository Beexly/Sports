# Final Report

As of: 2026-06-09

## 1. Executive Summary

The highest immediate leverage stack for GSE is AnythingLLM for private research/RAG, Hoppscotch for API/source testing, and listmonk for newsletter/alert/lifecycle operations. Chatwoot, Twenty, Cap, Penpot, and Open WebUI are valuable but should be delayed to isolated prototypes because they carry heavier operational, license, data, or open-core risk.

## 2. Verified Repo List

| Repo | Canonical | License posture | Release | Commit | Stars |
| --- | --- | --- | --- | --- | --- |
| Open WebUI | https://github.com/open-webui/open-webui | Custom Open WebUI License. Official docs say v0.6.6+ adds branding restrictions and is not OSI-approved; pre-v0.6.6 code remains BSD-3. | v0.9.6 | 2026-06-02T02:10:46Z | 140762 |
| Twenty | https://github.com/twentyhq/twenty | License says mostly AGPL with files marked Enterprise under a commercial license. | twenty/v2.10.0 | 2026-06-09T09:28:11Z | 49500 |
| Hoppscotch | https://github.com/hoppscotch/hoppscotch | MIT license; Community vs Enterprise self-host boundary should be checked before team rollout. | 2026.5.0 | 2026-05-28T10:53:13Z | 79447 |
| Cap | https://github.com/CapSoftware/Cap | Repo license says cap-camera/scap crates are MIT and other content is AGPLv3. Treat as COSS/open-core risk. | cap-v0.5.1 | 2026-06-08T19:17:08Z | 19493 |
| Chatwoot | https://github.com/chatwoot/chatwoot | MIT for community code outside enterprise directory; enterprise features under separate license. | v4.14.1 | 2026-06-09T07:12:03Z | 30045 |
| listmonk | https://github.com/knadh/listmonk | AGPL-3.0. No open-core split detected in this pass. | v6.1.0 | 2026-06-03T02:56:19Z | 21422 |
| Penpot | https://github.com/penpot/penpot | MPL-2.0 repo license; self-host support/pricing exists but no core code restriction found here. | 2.15.4 | 2026-06-09T09:17:06Z | 49415 |
| AnythingLLM | https://github.com/Mintplex-Labs/anything-llm | MIT repo license observed; hosted/cloud/mobile terms separate. | v1.13.0 | 2026-06-09T00:05:41Z | 61292 |

## 3. What Each Repo Actually Does

- Open WebUI: AI chat/model/workspace interface with knowledge, tools, users, and Docker/K8s deployment paths.
- Twenty: CRM with custom objects, REST/GraphQL APIs, webhooks, and self-hosted data ownership.
- Hoppscotch: API testing/development ecosystem for REST, GraphQL, realtime APIs, collections, environments, scripts, CLI, and self-hosted teams.
- Cap: screen recording, editing, sharing, comments, transcripts, analytics, API/webhooks, and self-hosted video stack.
- Chatwoot: live chat, email/omni-channel support, help center, automation, APIs, webhooks, and self-hosted support operations.
- listmonk: newsletter/mailing list manager with Postgres, SMTP, campaigns, subscribers, templates, bounces, API, OIDC.
- Penpot: design/prototyping/collaboration platform with design systems, tokens, plugins/API, and self-hosting.
- AnythingLLM: document/RAG workspace, agents, providers, vector DBs, API, embedded widgets, desktop and Docker.

## 4. What Screenshot Claims Were Verified Or Not Verified

The candidate names were verified against canonical GitHub repos. Claims of being open source were nuanced: Hoppscotch and AnythingLLM are MIT; listmonk is AGPL; Penpot is MPL; Open WebUI has post-v0.6.6 branding restrictions; Twenty and Chatwoot have enterprise/commercial file boundaries; Cap has MIT for some crates and AGPL for most other content.

## 5. Best Immediate Opportunities

AnythingLLM, Hoppscotch, listmonk.

## 6. Biggest Risks

License contamination, AGPL/network-service obligations, custom branding restrictions, enterprise directory boundaries, customer PII, AI prompt/data leakage, SMTP/domain reputation, weak backups, and overbuilding a self-host stack before GSE workflows are proven.

## 7. Recommended Stack Architecture

Start with Architecture A, then selectively add Architecture C and D components. Do not jump to Architecture B until there is a service owner, backup plan, security review, and clear savings/revenue target.

## 8. Internal Operating System Recommendation

Use AnythingLLM and Hoppscotch first. Add listmonk after newsletter/alert taxonomy is approved. Add Twenty/Chatwoot only when growth/support workflows are mature enough.

## 9. Customer Product Recommendation

Start with customer-safe support/help content, personalized alert digest specs, source transparency snippets, and onboarding education. Do not expose public AI over private corpora.

## 10. AI/RAG Recommendation

AnythingLLM first, Open WebUI isolated second. Build separate Research Brain, Method Brain, Help Brain, Source Citation Brain, and Support Copilot Brain.

## 11. CRM/Sales Recommendation

Twenty is strategically strong but license/ops-heavy. Start with schemas and pipeline docs, then prototype isolated.

## 12. Support/Customer Success Recommendation

Chatwoot is strong for customer support, but should be isolated and backed by PII policy, retention rules, and escalation tags before use.

## 13. Newsletter/Alerts Recommendation

listmonk is the strongest near-term cost replacement for owned lifecycle messaging if SMTP/deliverability is handled correctly.

## 14. Design/Product Workflow Recommendation

Penpot is a strong internal design-system candidate. Start with token and handoff docs before self-hosting.

## 15. API/Data Testing Recommendation

Hoppscotch should be prototyped immediately for odds/weather/news/source/API contract testing.

## 16. Video/Onboarding Recommendation

Cap is valuable for onboarding, trust, QA, demos, and support videos, but self-hosting should be isolated because video can expose sensitive data.

## 17. Cost Replacement Map

See `04-saas-replacement-map.md`. No exact pricing claims were made because pricing was not refreshed deeply enough for public financial claims.

## 18. FREE / PRO / ELITE Implications

FREE gets onboarding, trust snippets, public help, and newsletter. PRO gets personalized alerts, better education, support response quality, and brief archives. ELITE gets premium support lane, source transparency, research assistant concepts, and enterprise-quality onboarding.

## 19. Founder-Only Protection Notes

Founder-only methodology must live in a separate Method Brain and must not be indexed into Help Brain, support KB, newsletter generation, or customer-facing assistants.

## 20. Top 20 Build Cards

- BUILD-001: OSS stack decision matrix (A. Foundation / Infrastructure)
- BUILD-002: isolated deployment lab (A. Foundation / Infrastructure)
- BUILD-003: secrets boundary map (A. Foundation / Infrastructure)
- BUILD-004: docker compose sandbox template (A. Foundation / Infrastructure)
- BUILD-005: service health monitor (A. Foundation / Infrastructure)
- BUILD-006: backup and restore strategy (A. Foundation / Infrastructure)
- BUILD-007: auth and SSO map (A. Foundation / Infrastructure)
- BUILD-008: internal DNS and service routing (A. Foundation / Infrastructure)
- BUILD-009: observability map (A. Foundation / Infrastructure)
- BUILD-010: update and pinning policy (A. Foundation / Infrastructure)
- BUILD-011: license scanner workflow (A. Foundation / Infrastructure)
- BUILD-012: security advisory monitor (A. Foundation / Infrastructure)
- BUILD-013: GSE Research Brain (B. AI / RAG / Research)
- BUILD-014: founder-only Method Brain (B. AI / RAG / Research)
- BUILD-015: public Help Brain (B. AI / RAG / Research)
- BUILD-016: source citation knowledge base (B. AI / RAG / Research)
- BUILD-017: sports data R&D ingestion (B. AI / RAG / Research)
- BUILD-018: Claude build queue assistant (B. AI / RAG / Research)
- BUILD-019: internal docs assistant (B. AI / RAG / Research)
- BUILD-020: support copilot (B. AI / RAG / Research)

## 21. Top 20 Fastest Wins

- BUILD-001: OSS stack decision matrix (A. Foundation / Infrastructure)
- BUILD-003: secrets boundary map (A. Foundation / Infrastructure)
- BUILD-007: auth and SSO map (A. Foundation / Infrastructure)
- BUILD-009: observability map (A. Foundation / Infrastructure)
- BUILD-010: update and pinning policy (A. Foundation / Infrastructure)
- BUILD-011: license scanner workflow (A. Foundation / Infrastructure)
- BUILD-013: GSE Research Brain (B. AI / RAG / Research)
- BUILD-021: article research assistant (B. AI / RAG / Research)
- BUILD-023: model/provider routing policy (B. AI / RAG / Research)
- BUILD-024: RAG eval and citation scorecard (B. AI / RAG / Research)
- BUILD-047: support SLA and escalation map (D. Support / Customer Success)
- BUILD-073: Penpot adoption research (G. Design / Product Workflow)
- BUILD-074: design token map (G. Design / Product Workflow)
- BUILD-102: RAG docs from research artifacts (I. Cross-Stack Automations)
- BUILD-110: GSE research assistant for PRO and ELITE (J. Productized GSE Features)
- BUILD-002: isolated deployment lab (A. Foundation / Infrastructure)
- BUILD-004: docker compose sandbox template (A. Foundation / Infrastructure)
- BUILD-005: service health monitor (A. Foundation / Infrastructure)
- BUILD-006: backup and restore strategy (A. Foundation / Infrastructure)
- BUILD-008: internal DNS and service routing (A. Foundation / Infrastructure)

## 22. Top 20 Highest Revenue Wins

- BUILD-025: Twenty lead schema (C. CRM / Sales)
- BUILD-026: GSE prospect pipeline (C. CRM / Sales)
- BUILD-027: advisor and investor CRM (C. CRM / Sales)
- BUILD-028: affiliate and creator pipeline (C. CRM / Sales)
- BUILD-029: enterprise prospect flow (C. CRM / Sales)
- BUILD-030: lead scoring model (C. CRM / Sales)
- BUILD-031: newsletter-to-CRM sync (C. CRM / Sales)
- BUILD-032: support-to-CRM sync (C. CRM / Sales)
- BUILD-033: churn-risk account tagging (C. CRM / Sales)
- BUILD-034: sales task automation (C. CRM / Sales)
- BUILD-035: B2B partner opportunity board (C. CRM / Sales)
- BUILD-036: pricing objection capture (C. CRM / Sales)
- BUILD-037: Chatwoot support inbox (D. Support / Customer Success)
- BUILD-038: pricing objection tracker (D. Support / Customer Success)
- BUILD-039: product feedback loop (D. Support / Customer Success)
- BUILD-040: support knowledge base (D. Support / Customer Success)
- BUILD-041: support-to-build-card flow (D. Support / Customer Success)
- BUILD-042: AI support copilot (D. Support / Customer Success)
- BUILD-043: retention rescue flow (D. Support / Customer Success)
- BUILD-044: bug report triage (D. Support / Customer Success)

## 23. Top 20 Weirdest/Highest-Leverage Ideas

- BUILD-097: support conversation to CRM (I. Cross-Stack Automations)
- BUILD-098: CRM segment to listmonk (I. Cross-Stack Automations)
- BUILD-099: listmonk campaign to Chatwoot follow-up (I. Cross-Stack Automations)
- BUILD-100: Cap video into support docs (I. Cross-Stack Automations)
- BUILD-101: Hoppscotch test failure into build card (I. Cross-Stack Automations)
- BUILD-102: RAG docs from research artifacts (I. Cross-Stack Automations)
- BUILD-103: customer question into article idea (I. Cross-Stack Automations)
- BUILD-104: churn tag into retention email (I. Cross-Stack Automations)
- BUILD-105: feature request into backlog card (I. Cross-Stack Automations)
- BUILD-106: weekly founder cockpit digest (I. Cross-Stack Automations)
- BUILD-107: security advisory into risk card (I. Cross-Stack Automations)
- BUILD-108: newsletter engagement into lead score (I. Cross-Stack Automations)
- BUILD-109: customer-facing AI help center (J. Productized GSE Features)
- BUILD-110: GSE research assistant for PRO and ELITE (J. Productized GSE Features)
- BUILD-111: personalized alert digest (J. Productized GSE Features)
- BUILD-112: source transparency snippets (J. Productized GSE Features)
- BUILD-113: onboarding wizard (J. Productized GSE Features)
- BUILD-114: customer feedback radar (J. Productized GSE Features)
- BUILD-115: paid tier education sequence (J. Productized GSE Features)
- BUILD-116: API playground (J. Productized GSE Features)

## 24. What Not To Build

- Full self-host stack all at once.
- Public AI assistant connected to private methods.
- White-labeled Open WebUI or AGPL-derived public product without legal approval.
- CRM/support/newsletter automations using production customer data before access controls and retention rules.
- Any service deployment without backups and rollback.

## 25. What Needs Human Approval

- Any production deploy.
- Any external/customer-facing service.
- Any live customer data import.
- Any Stripe/billing/launch gate touch.
- Any AGPL/MPL/custom-license fork or code modification.
- Any SMTP sending from GSE domains.
- Any AI provider key or RAG corpus containing proprietary methods.

## 26. Commands Run

- `rg` over memory for Galaxy/project-boundary context.
- `git rev-parse --show-toplevel` and local directory inspection to verify workspace shape.
- GitHub REST metadata queries for each repo.
- GitHub release/default-branch commit/license/tree queries for each repo.
- GitHub public security advisory query for each repo.
- Web search/open on official GitHub and docs pages.
- Node generation script for documentation and build queue.

## 27. Files Created

See `docs/research/oss-leverage-stack/` including 00-10 markdown reports, `repo-inventory.csv`, eight repo deep dives, `claude-build-queue/index.md`, `claude-build-queue/build-queue.jsonl`, and 120 individual build cards.

## 28. Unknowns

- Exact current SaaS competitor pricing and seat math.
- Full enterprise feature boundaries for every project.
- Severity details for every GitHub security advisory count.
- Real GSE production architecture in the primary shipping clone, because this OneDrive folder is a sparse/control-style checkout.
- Actual operational cost until a target host, email provider, object storage, and auth provider are chosen.
