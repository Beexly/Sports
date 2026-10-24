# Novu

## Project Summary

Novu is the candidate notification infrastructure, inbox, preferences, workflows, agent communication layer for GSE / GSN.

Canonical repo: https://github.com/novuhq/novu  
Official site: https://novu.co  
Docs: https://docs.novu.co

## What It Replaces

Customer.io notifications, Courier, OneSignal for in-app, custom notification center, scattered provider code

## Verified Capabilities

- In-app Inbox component
- Email/SMS/push/chat channels
- Workflow builder
- Digest and delay steps
- Subscriber topics/preferences
- Agent communication infrastructure
- SDKs and API

## Deployment Model

Cloud or self-host; needs app, API, workers, DB/cache/queue depending deployment; provider credentials for email/SMS/push/chat

## License / Open-Core Risk

MIT core plus enterprise/proprietary folders and ee packages under separate licenses

Recommended legal posture: Medium caution. Keep core/enterprise boundaries explicit and avoid copying enterprise code.

## Security / Privacy Risk

High sensitivity: subscriber identity, notification preferences, message payloads, provider secrets

Primary risk: Open-core enterprise boundaries; messaging compliance; provider credential blast radius; customer fatigue

## API / Integration Surface

GSE notification control plane for alerts, lifecycle, paid-tier messaging, agent replies, and preferences

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

- Do not copy Novu source into GSE.
- Do not bypass license or enterprise-feature boundaries.
- Do not connect production customer data during prototype.
- Do not launch public surfaces before privacy, auth, and rollback review.

## Recommended Adoption Mode

Prototype after event taxonomy; use API/cloud first, self-host only after deliverability/security review

## Final Score

strategic: 10/10, speed: 6/10, website: 10/10, cost: 8/10, integration: 8/10, security: 5/10, maintenance: 6/10, revenue: 10/10

## Sources

- https://github.com/novuhq/novu
- https://docs.novu.co/platform
- https://docs.novu.co/platform/concepts/workflows
- https://raw.githubusercontent.com/novuhq/novu/next/LICENSE-MIT
- https://raw.githubusercontent.com/novuhq/novu/next/EE-PACKAGES-LICENSE
