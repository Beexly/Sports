# Trigger.dev

## Project Summary

Trigger.dev is the candidate durable background jobs, ai tasks, retries, scheduled work, realtime task status layer for GSE / GSN.

Canonical repo: https://github.com/triggerdotdev/trigger.dev  
Official site: https://trigger.dev  
Docs: https://trigger.dev/docs

## What It Replaces

Ad hoc cron, fragile serverless timeouts, homegrown queues, background-job SaaS for Next.js

## Verified Capabilities

- Long-running tasks
- Retries
- Scheduled tasks
- AI workflows
- Realtime API
- Dashboard observability
- Vercel/Next.js-friendly SDK

## Deployment Model

Cloud or self-host; self-host requires version-pinned releases and infrastructure ownership; integrates with TypeScript apps

## License / Open-Core Risk

Apache-2.0

Recommended legal posture: Permissive posture, still preserve notices and review trademarks.

## Security / Privacy Risk

Medium/high sensitivity depending jobs: sports data, AI reports, emails, billing events, user payloads

Primary risk: Job idempotency, duplicate sends, queue costs, payload retention, self-host operations

## API / Integration Surface

Execution backbone for sports ingestion, report generation, alert compilation, and autonomous worker queues

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

- Do not copy Trigger.dev source into GSE.
- Do not bypass license or enterprise-feature boundaries.
- Do not connect production customer data during prototype.
- Do not launch public surfaces before privacy, auth, and rollback review.

## Recommended Adoption Mode

Use SDK/cloud prototype in real app clone; self-host later only for residency/control reasons

## Final Score

strategic: 10/10, speed: 8/10, website: 10/10, cost: 7/10, integration: 9/10, security: 7/10, maintenance: 7/10, revenue: 9/10

## Sources

- https://github.com/triggerdotdev/trigger.dev
- https://trigger.dev/docs/introduction
- https://trigger.dev/docs/self-hosting/overview
- https://raw.githubusercontent.com/triggerdotdev/trigger.dev/main/LICENSE
