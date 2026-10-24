# Formbricks

## Project Summary

Formbricks is the candidate surveys, in-app feedback, user research, experience management layer for GSE / GSN.

Canonical repo: https://github.com/formbricks/formbricks  
Official site: https://formbricks.com  
Docs: https://formbricks.com/docs

## What It Replaces

Typeform, Qualtrics, SurveyMonkey, Hotjar feedback widgets, scattered Google Forms

## Verified Capabilities

- Link surveys
- Website surveys
- In-app surveys
- Email surveys
- Analysis surfaces
- OpenAPI file
- Docker self-hosting

## Deployment Model

Cloud or self-host; repo includes Docker compose and OpenAPI; production needs DB, auth, email/domain policy

## License / Open-Core Risk

AGPLv3 core plus enterprise modules under separate license; no white-label resale

Recommended legal posture: High caution. Use internally or by API/cloud first; do not fork, embed, white-label, or expose modified network service without legal approval.

## Security / Privacy Risk

High sensitivity: customer opinions, churn reasons, pricing objections, emails, product feedback

Primary risk: AGPL; enterprise feature boundary; feedback PII; survey fatigue; no white-label resale

## API / Integration Surface

Research layer for onboarding, pricing, churn, content quality, and paid-tier objections

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

- Do not copy Formbricks source into GSE.
- Do not bypass license or enterprise-feature boundaries.
- Do not connect production customer data during prototype.
- Do not launch public surfaces before privacy, auth, and rollback review.

## Recommended Adoption Mode

Start with cloud/API or isolated self-host; never embed white-labeled survey editor in product without approval

## Final Score

strategic: 9/10, speed: 7/10, website: 9/10, cost: 8/10, integration: 7/10, security: 5/10, maintenance: 7/10, revenue: 8/10

## Sources

- https://github.com/formbricks/formbricks
- https://formbricks.com/docs/platform/introduction
- https://formbricks.com/docs/self-hosting/overview
