# Chatwoot Deep Dive

As of: 2026-06-09

## Project Summary

Open-source customer support platform for live chat, email support, omni-channel inboxes, help center, automation, contacts, conversations, teams, APIs, and webhooks.

Canonical repo: https://github.com/chatwoot/chatwoot  
Official site: https://www.chatwoot.com/  
Docs: https://developers.chatwoot.com/self-hosted  
Latest release: `v4.14.1`  
Latest commit date: `2026-06-09T07:12:03Z`  
Stars/forks at verification: 30045 / 7471

## What It Replaces

Intercom, Zendesk, Help Scout, Salesforce Service Cloud basics, website chat widgets.

## Verified Capabilities

- live chat
- email and omni-channel support
- help center
- contacts/conversations
- automation
- teams/inboxes
- application/client/platform APIs
- webhooks
- self-hosted community edition

## Deployment Model

Rails app requiring Linux-oriented deployment, Ruby, Node, PostgreSQL, Redis, Sidekiq, storage, SMTP/email, and SSL/reverse proxy.

Database: PostgreSQL.  
Queue/cache/background jobs: Redis and Sidekiq for background jobs and cached config.  
Docker: Docker workflows and self-host docs exist.  
Kubernetes: Container deployment possible; not first path here.  
Cloud option: Chatwoot Cloud and paid self-host plans exist.  
Self-hosting maturity: Use directly but isolated

## License / Open-Core Risk

MIT for community code outside enterprise directory; enterprise features under separate license. Premium self-host includes PRO features such as Captain AI and SLAs per official guide. LOW for MIT community use; MEDIUM for enterprise feature boundaries.

Safe use posture for GSE: Use directly but isolated. Do not copy code into GSE. Do not fork, white-label, or expose externally without legal review when AGPL, custom branding clauses, MPL file modifications, or enterprise directories are involved.

## Security / Privacy Risk

High PII exposure: support chat, emails, attachments, billing objections. Public advisory query returned 3 entries.

Common caution: Rails/Redis/Postgres ops burden, paid feature boundary, high issue count.

## API / Integration Surface

API: Application, Client, and Platform APIs documented.  
Webhooks: Webhooks listed in API docs and integration hooks present.  
SSO/auth: OAuth/integration controllers and enterprise SSO should be verified by edition.  
Import/export: Contacts/data workflows via APIs; exports should be verified.  
Plugin/extension: Integrations, dashboard apps, agent bots, automations.  
Database-level integration: read-only exports or documented APIs only; avoid direct writes.  
Mobile: Agent/mobile support not used as adoption basis.  
Multi-tenant: Accounts/inboxes support multi-account operations; tenant boundaries require review.

## GSE Internal Use Cases

- Founder cockpit module for decision logs, lead lists, support insights, or research queues.
- Internal SOP and build-queue acceleration where the tool directly reduces repeated manual coordination.
- Isolated self-host lab before any production data touches the system.

## GSE Customer-Facing Use Cases

- Customer-facing use should start as API integration, iframe, or isolated support/help layer only after privacy review.
- Do not expose founder-only methods, raw source maps, proprietary scoring logic, or sensitive customer data.
- Use public/customer-safe knowledge bases and redaction controls for any AI-facing system.

## Sports Intelligence Use Cases

- Store and test sports-source API endpoints, weather/news/odds/source-ingestion behavior, GSE Rating methodology docs, and daily brief workflows where applicable.
- Keep sports methodology private unless a specific transparency snippet is approved for customers.

## Revenue / Monetization Use Cases

- Improve FREE-to-PRO education, onboarding, support saves, personalized alerts, digest quality, and enterprise trust surfaces.
- Convert repeated support questions and research outputs into content, product education, or build cards.

## Claude Code Implementation Ideas

- Create a repo-specific adoption checklist for `chatwoot` under the GSE OSS lab.
- Build a read-only integration spec using mocked data only.
- Generate schema/event/tag maps before any service deployment.
- Add a local-only proof packet that can be reviewed by owner/legal/security before moving to an isolated sandbox.

## What Not To Do

- Do not install this in the current GSE workspace.
- Do not run Docker Compose against production services.
- Do not copy source code or UI into GSE.
- Do not connect production customer, payment, sports-source, or founder-method data.
- Do not assume cloud and self-host feature parity unless the docs/license verify it.

## Recommended Adoption Mode

Use directly but isolated

## Final Score

| Dimension | Score 1-10 |
| --- | --- |
| strategic value | 9 |
| ease of deployment | 5 |
| product fit | 9 |
| cost savings | 8 |
| integration quality | 8 |
| security comfort | 6 |
| maintenance burden | 5 |
| revenue potential | 9 |
| speed-to-value | 6 |

Overall practical score: 7.2/10

## Sources

- https://github.com/chatwoot/chatwoot
- https://developers.chatwoot.com/self-hosted/deployment/requirements
- https://developers.chatwoot.com/api-reference/introduction
- https://www.chatwoot.com/deploy
- https://www.chatwoot.com/hc/user-guide/articles/1750735898-purchasing-a-paid-self_hosted-chatwoot-license-a-step_by_step-guide
