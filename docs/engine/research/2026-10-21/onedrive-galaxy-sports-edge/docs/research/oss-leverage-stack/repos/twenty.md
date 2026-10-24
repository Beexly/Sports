# Twenty Deep Dive

As of: 2026-06-09

## Project Summary

Open CRM alternative to Salesforce with custom objects, REST/GraphQL APIs, webhooks, workflows, roles, and self-hosting.

Canonical repo: https://github.com/twentyhq/twenty  
Official site: https://twenty.com/  
Docs: https://twenty.com/developers  
Latest release: `twenty/v2.10.0`  
Latest commit date: `2026-06-09T09:28:11Z`  
Stars/forks at verification: 49500 / 7118

## What It Replaces

Salesforce, HubSpot CRM, Pipedrive, Airtable-style sales pipeline databases.

## Verified Capabilities

- CRM records
- custom objects
- REST and GraphQL APIs
- schema-generated API docs
- webhooks
- role-scoped API keys
- Docker Compose self-hosting
- single-workspace default with multi-workspace option

## Deployment Model

Docker Compose is documented for production/self-hosting. Setup includes server, worker, Postgres, storage, SMTP, S3, OAuth, and recurring worker jobs.

Database: PostgreSQL.  
Queue/cache/background jobs: Worker containers and recurring jobs; queue implementation should be verified in deployment files.  
Docker: Official Docker Compose guide and twenty-docker package.  
Kubernetes: Not the first adoption path here; verify separately.  
Cloud option: Hosted Twenty exists; self-hosting documented.  
Self-hosting maturity: Use as internal-only tool

## License / Open-Core Risk

License says mostly AGPL with files marked Enterprise under a commercial license. Commercial/enterprise files and feature boundaries create open-core risk. HIGH if modified or public network service; acceptable only as isolated internal tool with review.

Safe use posture for GSE: Use as internal-only tool. Do not copy code into GSE. Do not fork, white-label, or expose externally without legal review when AGPL, custom branding clauses, MPL file modifications, or enterprise directories are involved.

## Security / Privacy Risk

High PII and sales-strategy sensitivity. Local logic/code interpreter can execute code on host if enabled; production defaults disable it.

Common caution: High operational complexity and AGPL/open-core boundary.

## API / Integration Surface

API: REST and GraphQL for core data and metadata; API keys can be role-scoped; rate limits documented.  
Webhooks: Record create/update/delete webhooks with HMAC validation documented.  
SSO/auth: Google/Microsoft OAuth docs; broader SSO should be validated.  
Import/export: CRM import/export should be verified in current UI/docs.  
Plugin/extension: Twenty Apps and workflow ecosystem visible in source tree.  
Database-level integration: read-only exports or documented APIs only; avoid direct writes.  
Mobile: No mobile adoption claim.  
Multi-tenant: Single-workspace default; multi-workspace available with DNS/config complexity.

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

- Create a repo-specific adoption checklist for `twenty` under the GSE OSS lab.
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
| strategic value | 9 |
| ease of deployment | 5 |
| product fit | 9 |
| cost savings | 8 |
| integration quality | 9 |
| security comfort | 5 |
| maintenance burden | 5 |
| revenue potential | 9 |
| speed-to-value | 6 |

Overall practical score: 7.2/10

## Sources

- https://github.com/twentyhq/twenty
- https://docs.twenty.com/developers/self-host/self-host
- https://docs.twenty.com/developers/self-host/capabilities/docker-compose
- https://docs.twenty.com/developers/extend/capabilities/apis
- https://docs.twenty.com/developers/extend/webhooks
- https://github.com/twentyhq/twenty/blob/main/LICENSE
