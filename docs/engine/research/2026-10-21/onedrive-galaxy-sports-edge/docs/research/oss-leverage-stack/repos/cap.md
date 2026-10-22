# Cap Deep Dive

As of: 2026-06-09

## Project Summary

Open Loom alternative for screen recording, local editing, instant sharing, comments, transcripts, analytics, team workspaces, custom storage, API, webhooks, and self-hosted video infrastructure.

Canonical repo: https://github.com/CapSoftware/Cap  
Official site: https://cap.so/  
Docs: https://cap.so/docs  
Latest release: `cap-v0.5.1`  
Latest commit date: `2026-06-08T19:17:08Z`  
Stars/forks at verification: 19493 / 1608

## What It Replaces

Loom, async video support tools, lightweight training-video portals.

## Verified Capabilities

- screen/camera/mic recording
- Instant and Studio modes
- desktop apps
- share links
- comments
- transcripts/captions
- analytics
- REST API and webhooks
- self-hosted web/media/storage stack

## Deployment Model

Self-host docs use Docker Compose and include Cap Web, media server, MySQL, and MinIO. Production requires changed secrets, public URL, S3 URL, SSL, email, and backups.

Database: MySQL in self-host compose.  
Queue/cache/background jobs: Media server/FFmpeg processing; queue details need deployment review.  
Docker: Docker Compose self-hosting documented.  
Kubernetes: Not primary; verify before K8s.  
Cloud option: Cap Cloud and Railway option exist.  
Self-hosting maturity: Use directly but isolated

## License / Open-Core Risk

Repo license says cap-camera/scap crates are MIT and other content is AGPLv3. Treat as COSS/open-core risk. Commercial license/pricing exists; feature and license boundaries need legal review for public product use. HIGH for public embedding/forking; MEDIUM for isolated internal use.

Safe use posture for GSE: Use directly but isolated. Do not copy code into GSE. Do not fork, white-label, or expose externally without legal review when AGPL, custom branding clauses, MPL file modifications, or enterprise directories are involved.

## Security / Privacy Risk

High because recordings can expose credentials, customer data, and private methods. Default compose secrets must never go public.

Common caution: Self-host docs say no direct support; production hardening burden is real.

## API / Integration Surface

API: Docs list REST API; source includes developer API routes and tests.  
Webhooks: Docs list webhooks; source includes webhook tests.  
SSO/auth: Google OAuth documented; org SSO files present.  
Import/export: Loom import and exports visible.  
Plugin/extension: Developer API useful; not a broad plugin platform.  
Database-level integration: read-only exports or documented APIs only; avoid direct writes.  
Mobile: Desktop macOS/Windows; web viewing.  
Multi-tenant: Team workspaces/orgs, not assumed external multi-tenant SaaS.

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

- Create a repo-specific adoption checklist for `cap` under the GSE OSS lab.
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
| strategic value | 8 |
| ease of deployment | 6 |
| product fit | 8 |
| cost savings | 7 |
| integration quality | 7 |
| security comfort | 5 |
| maintenance burden | 6 |
| revenue potential | 8 |
| speed-to-value | 8 |

Overall practical score: 7.0/10

## Sources

- https://github.com/CapSoftware/Cap
- https://cap.so/docs/introduction
- https://cap.so/docs/self-hosting
- https://github.com/CapSoftware/Cap/blob/main/LICENSE
