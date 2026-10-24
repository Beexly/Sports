# Penpot Deep Dive

As of: 2026-06-09

## Project Summary

Open-source design and prototyping platform for design-code collaboration, design systems, tokens, plugins, API, MCP, and self-hosted team design work.

Canonical repo: https://github.com/penpot/penpot  
Official site: https://penpot.app/  
Docs: https://help.penpot.app/technical-guide/getting-started/  
Latest release: `2.15.4`  
Latest commit date: `2026-06-09T09:17:06Z`  
Stars/forks at verification: 49415 / 3168

## What It Replaces

Figma/Sketch-style design collaboration for some workflows, design handoff tooling, prototype libraries.

## Verified Capabilities

- browser design tool
- collaboration
- design systems
- design tokens
- plugins
- open API
- self-hosting
- Docker Compose
- Kubernetes/Helm
- OIDC/LDAP

## Deployment Model

Self-host guide supports Docker Compose, Kubernetes/Helm, Openshift/Rancher/community options. Config uses PENPOT_* env vars and flags, SMTP, auth providers, Valkey, database, storage, exporter.

Database: PostgreSQL.  
Queue/cache/background jobs: Valkey/Redis for websocket notifications; worker/exporter components.  
Docker: Docker images and compose path documented.  
Kubernetes: Official Helm and K8s options documented.  
Cloud option: Penpot SaaS plus self-host pricing/support.  
Self-hosting maturity: Use as internal-only tool

## License / Open-Core Risk

MPL-2.0 repo license; self-host support/pricing exists but no core code restriction found here. Paid self-host support/enterprise services may matter for production teams. MEDIUM-LOW; MPL file-level obligations if modifying covered files.

Safe use posture for GSE: Use as internal-only tool. Do not copy code into GSE. Do not fork, white-label, or expose externally without legal review when AGPL, custom branding clauses, MPL file modifications, or enterprise directories are involved.

## Security / Privacy Risk

Design/IP leakage, screenshots, unreleased flows, auth misconfig, storage backups. Public advisory query returned 4 entries.

Common caution: Complex stack; self-host export/rendering health can be fragile.

## API / Integration Surface

API: README/docs reference open API; source tree has OpenAPI templates.  
Webhooks: Webhook migrations and backend command files present.  
SSO/auth: Google, GitLab, GitHub, OIDC, Azure AD, LDAP documented.  
Import/export: Design export/import is core but exact formats need workflow verification.  
Plugin/extension: Plugin system documented.  
Database-level integration: read-only exports or documented APIs only; avoid direct writes.  
Mobile: Design web app; no mobile claim.  
Multi-tenant: Team/workspace collaboration; external customer tenancy not assumed.

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

- Create a repo-specific adoption checklist for `penpot` under the GSE OSS lab.
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

Use as internal-only tool

## Final Score

| Dimension | Score 1-10 |
| --- | --- |
| strategic value | 8 |
| ease of deployment | 5 |
| product fit | 8 |
| cost savings | 7 |
| integration quality | 7 |
| security comfort | 7 |
| maintenance burden | 5 |
| revenue potential | 6 |
| speed-to-value | 6 |

Overall practical score: 6.6/10

## Sources

- https://github.com/penpot/penpot
- https://help.penpot.app/technical-guide/getting-started/
- https://help.penpot.app/technical-guide/configuration/
- https://help.penpot.app/plugins/
- https://penpot.app/pricing/self-host
