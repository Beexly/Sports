# Unkey

## Project Summary

Unkey is the candidate api keys, rate limiting, authorization, api analytics, gateway layer for GSE / GSN.

Canonical repo: https://github.com/unkeyed/unkey  
Official site: https://www.unkey.com  
Docs: https://www.unkey.com/docs

## What It Replaces

Homegrown API key tables, Redis rate limiters, basic usage dashboards, API gateway glue

## Verified Capabilities

- API key issue/verify/revoke
- Rate limiting
- Usage analytics
- Permissions and RBAC
- Audit logs
- Gateway/deployment direction
- Per-key metadata/limits

## Deployment Model

Cloud or self-host/source-available; modern API platform with services, gateway, control API, DB/cache needs

## License / Open-Core Risk

AGPLv3 for main repo outside package-specific exceptions

Recommended legal posture: High caution. Use internally or by API/cloud first; do not fork, embed, white-label, or expose modified network service without legal approval.

## Security / Privacy Risk

High sensitivity: API keys, auth metadata, usage records, permissions, audit logs

Primary risk: AGPL, auth criticality, customer API outage risk, key leakage, external PR policy paused

## API / Integration Surface

Future PRO/ELITE/enterprise API access layer and partner-key governance

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

- Do not copy Unkey source into GSE.
- Do not bypass license or enterprise-feature boundaries.
- Do not connect production customer data during prototype.
- Do not launch public surfaces before privacy, auth, and rollback review.

## Recommended Adoption Mode

Pattern now, API/cloud prototype later; self-host/fork only after AGPL and auth review

## Final Score

strategic: 9/10, speed: 6/10, website: 9/10, cost: 7/10, integration: 8/10, security: 5/10, maintenance: 6/10, revenue: 10/10

## Sources

- https://github.com/unkeyed/unkey
- https://www.unkey.com/docs
- https://raw.githubusercontent.com/unkeyed/unkey/main/LICENSE
