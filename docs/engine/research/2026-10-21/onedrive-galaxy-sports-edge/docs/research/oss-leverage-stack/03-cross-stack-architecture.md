# Cross-Stack Architecture

As of: 2026-06-09

## Architecture A - Minimal Internal Stack

Services used: Hoppscotch, AnythingLLM Desktop or isolated Docker, listmonk later

Services excluded: Twenty, Chatwoot, Penpot, Cap self-host

Deployment topology: One small VPS or local lab, no customer data, no public exposure.

Database needs: separate Postgres/MySQL per stateful app where required; never share production GSE DB.

Email/SMTP needs: listmonk and Chatwoot require deliverability planning; Twenty/Cap/Penpot need SMTP for invites or auth flows.

Auth/SSO needs: start with private admin auth, then OIDC/Google/Microsoft only after redirect URLs and owner approval.

Storage needs: S3/MinIO/R2 for videos, attachments, design files, and media.

Backup needs: per-service DB dumps plus object storage snapshots; test restore before production.

Monitoring needs: uptime, queue depth, email failure, storage growth, security advisory monitor.

Security boundaries: no production secrets in docs, no founder-only RAG in public tools, no customer data until access controls are tested.

Estimated setup effort: S/M

Estimated monthly cost: unknown until host/email/storage/provider pricing is refreshed.

What SaaS it replaces: see `04-saas-replacement-map.md`.

Biggest risks: license boundaries, service sprawl, self-host maintenance, data leakage, weak backup/restore, and false SaaS-equivalence claims.

Best first implementation path: Fastest value: API testing, private docs assistant, newsletter research.

## Architecture B - Full Self-Hosted Operating Stack

Services used: Twenty, Chatwoot, listmonk, Hoppscotch, AnythingLLM, Cap, Penpot, Open WebUI

Services excluded: None, but all behind gates

Deployment topology: Segmented services behind SSO/reverse proxy, separate DBs, object storage, backups, observability, and version pinning.

Database needs: separate Postgres/MySQL per stateful app where required; never share production GSE DB.

Email/SMTP needs: listmonk and Chatwoot require deliverability planning; Twenty/Cap/Penpot need SMTP for invites or auth flows.

Auth/SSO needs: start with private admin auth, then OIDC/Google/Microsoft only after redirect URLs and owner approval.

Storage needs: S3/MinIO/R2 for videos, attachments, design files, and media.

Backup needs: per-service DB dumps plus object storage snapshots; test restore before production.

Monitoring needs: uptime, queue depth, email failure, storage growth, security advisory monitor.

Security boundaries: no production secrets in docs, no founder-only RAG in public tools, no customer data until access controls are tested.

Estimated setup effort: XL

Estimated monthly cost: unknown until host/email/storage/provider pricing is refreshed.

What SaaS it replaces: see `04-saas-replacement-map.md`.

Biggest risks: license boundaries, service sprawl, self-host maintenance, data leakage, weak backup/restore, and false SaaS-equivalence claims.

Best first implementation path: Maximum SaaS replacement but high ops burden.

## Architecture C - GSE Product Growth Stack

Services used: Twenty, Chatwoot, listmonk, Cap, AnythingLLM Help Brain

Services excluded: Penpot full self-host, Open WebUI public

Deployment topology: Customer acquisition, support, newsletter, paid conversion, and onboarding around the existing GSE app.

Database needs: separate Postgres/MySQL per stateful app where required; never share production GSE DB.

Email/SMTP needs: listmonk and Chatwoot require deliverability planning; Twenty/Cap/Penpot need SMTP for invites or auth flows.

Auth/SSO needs: start with private admin auth, then OIDC/Google/Microsoft only after redirect URLs and owner approval.

Storage needs: S3/MinIO/R2 for videos, attachments, design files, and media.

Backup needs: per-service DB dumps plus object storage snapshots; test restore before production.

Monitoring needs: uptime, queue depth, email failure, storage growth, security advisory monitor.

Security boundaries: no production secrets in docs, no founder-only RAG in public tools, no customer data until access controls are tested.

Estimated setup effort: M/L

Estimated monthly cost: unknown until host/email/storage/provider pricing is refreshed.

What SaaS it replaces: see `04-saas-replacement-map.md`.

Biggest risks: license boundaries, service sprawl, self-host maintenance, data leakage, weak backup/restore, and false SaaS-equivalence claims.

Best first implementation path: Best revenue path.

## Architecture D - Research Intelligence Stack

Services used: AnythingLLM, Open WebUI isolated, Hoppscotch, listmonk for brief distribution

Services excluded: Twenty, Chatwoot, Cap, Penpot

Deployment topology: Private research brain, source citation brain, API/source testing, daily brief synthesis.

Database needs: separate Postgres/MySQL per stateful app where required; never share production GSE DB.

Email/SMTP needs: listmonk and Chatwoot require deliverability planning; Twenty/Cap/Penpot need SMTP for invites or auth flows.

Auth/SSO needs: start with private admin auth, then OIDC/Google/Microsoft only after redirect URLs and owner approval.

Storage needs: S3/MinIO/R2 for videos, attachments, design files, and media.

Backup needs: per-service DB dumps plus object storage snapshots; test restore before production.

Monitoring needs: uptime, queue depth, email failure, storage growth, security advisory monitor.

Security boundaries: no production secrets in docs, no founder-only RAG in public tools, no customer data until access controls are tested.

Estimated setup effort: M/L

Estimated monthly cost: unknown until host/email/storage/provider pricing is refreshed.

What SaaS it replaces: see `04-saas-replacement-map.md`.

Biggest risks: license boundaries, service sprawl, self-host maintenance, data leakage, weak backup/restore, and false SaaS-equivalence claims.

Best first implementation path: Best internal intelligence path.

## Architecture E - Customer Education / Content Stack

Services used: listmonk, Cap, Chatwoot help center, AnythingLLM Help Brain

Services excluded: Twenty full CRM, Open WebUI

Deployment topology: Newsletter, onboarding clips, support KB, customer Q&A assistant, tutorial/report distribution.

Database needs: separate Postgres/MySQL per stateful app where required; never share production GSE DB.

Email/SMTP needs: listmonk and Chatwoot require deliverability planning; Twenty/Cap/Penpot need SMTP for invites or auth flows.

Auth/SSO needs: start with private admin auth, then OIDC/Google/Microsoft only after redirect URLs and owner approval.

Storage needs: S3/MinIO/R2 for videos, attachments, design files, and media.

Backup needs: per-service DB dumps plus object storage snapshots; test restore before production.

Monitoring needs: uptime, queue depth, email failure, storage growth, security advisory monitor.

Security boundaries: no production secrets in docs, no founder-only RAG in public tools, no customer data until access controls are tested.

Estimated setup effort: M/L

Estimated monthly cost: unknown until host/email/storage/provider pricing is refreshed.

What SaaS it replaces: see `04-saas-replacement-map.md`.

Biggest risks: license boundaries, service sprawl, self-host maintenance, data leakage, weak backup/restore, and false SaaS-equivalence claims.

Best first implementation path: Best trust and retention path.

## Architecture F - Founder-Only Control Plane

Services used: AnythingLLM, Open WebUI, Twenty private CRM, Hoppscotch, Cap internal

Services excluded: Public Chatwoot AI, public RAG, public Penpot

Deployment topology: Private service network with strict corpus separation and no public access.

Database needs: separate Postgres/MySQL per stateful app where required; never share production GSE DB.

Email/SMTP needs: listmonk and Chatwoot require deliverability planning; Twenty/Cap/Penpot need SMTP for invites or auth flows.

Auth/SSO needs: start with private admin auth, then OIDC/Google/Microsoft only after redirect URLs and owner approval.

Storage needs: S3/MinIO/R2 for videos, attachments, design files, and media.

Backup needs: per-service DB dumps plus object storage snapshots; test restore before production.

Monitoring needs: uptime, queue depth, email failure, storage growth, security advisory monitor.

Security boundaries: no production secrets in docs, no founder-only RAG in public tools, no customer data until access controls are tested.

Estimated setup effort: M/L

Estimated monthly cost: unknown until host/email/storage/provider pricing is refreshed.

What SaaS it replaces: see `04-saas-replacement-map.md`.

Biggest risks: license boundaries, service sprawl, self-host maintenance, data leakage, weak backup/restore, and false SaaS-equivalence claims.

Best first implementation path: Best company-of-one leverage.
