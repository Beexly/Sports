# n8n

## Project Summary

n8n is the candidate workflow automation and internal ai/business automations layer for GSE / GSN.

Canonical repo: https://github.com/n8n-io/n8n  
Official site: https://n8n.io  
Docs: https://docs.n8n.io

## What It Replaces

Zapier, Make, Pipedream, brittle cron scripts, manual ops glue

## Verified Capabilities

- Visual workflow builder
- 400+ integrations
- AI nodes and code nodes
- Webhooks
- Schedules
- Credential store
- Manual and automated executions

## Deployment Model

Cloud or self-host; production self-host needs database, queue/worker mode, credentials policy, execution isolation, backups

## License / Open-Core Risk

Sustainable Use License for non-ee code; source-available/fair-code, not normal OSI OSS; ee files require enterprise license

Recommended legal posture: High caution. Use internally or by API/cloud first; do not fork, embed, white-label, or expose modified network service without legal approval.

## Security / Privacy Risk

Very high sensitivity: all connected-app credentials, customer data, workflow payloads

Primary risk: License limits; workflow RCE/sandbox risk; credential sprawl; operational blast radius

## API / Integration Surface

Webhook-first automation layer between CRM, support, newsletter, docs, analytics, and build queues

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

- Do not copy n8n source into GSE.
- Do not bypass license or enterprise-feature boundaries.
- Do not connect production customer data during prototype.
- Do not launch public surfaces before privacy, auth, and rollback review.

## Recommended Adoption Mode

Internal-only isolated automation lab; do not host workflows for external clients without legal review

## Final Score

strategic: 9/10, speed: 6/10, website: 8/10, cost: 9/10, integration: 9/10, security: 4/10, maintenance: 6/10, revenue: 9/10

## Sources

- https://github.com/n8n-io/n8n
- https://docs.n8n.io
- https://docs.n8n.io/choose-n8n/
- https://raw.githubusercontent.com/n8n-io/n8n/master/LICENSE.md
