# PostHog

## Project Summary

PostHog is the candidate product analytics, experimentation, feature flags, session replay layer for GSE / GSN.

Canonical repo: https://github.com/PostHog/posthog  
Official site: https://posthog.com  
Docs: https://posthog.com/docs

## What It Replaces

Amplitude, Mixpanel, LaunchDarkly, FullStory, Hotjar, Heap, lightweight CDP tools

## Verified Capabilities

- Product analytics and funnels
- Web analytics and event capture
- Session replay
- Feature flags
- Experiments
- Surveys
- Data warehouse/CDP surfaces
- Error tracking and product assistant

## Deployment Model

Cloud recommended by vendor; open-source hobby self-host exists but vendor states it is advanced and not guaranteed at large scale

## License / Open-Core Risk

MIT Expat for repo content outside ee; enterprise code under separate license

Recommended legal posture: Medium caution. Keep core/enterprise boundaries explicit and avoid copying enterprise code.

## Security / Privacy Risk

High sensitivity: behavior events, session recordings, IDs, cohort membership, feature flags

Primary risk: PII/session replay risk; open-core ee boundary; self-host scale/support limits

## API / Integration Surface

Client event SDK, server-side events, feature flags, exports, webhooks/integrations

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

- Do not copy PostHog source into GSE.
- Do not bypass license or enterprise-feature boundaries.
- Do not connect production customer data during prototype.
- Do not launch public surfaces before privacy, auth, and rollback review.

## Recommended Adoption Mode

Prototype immediately, but prefer cloud or isolated hobby deploy until event volume and privacy policy are clear

## Final Score

strategic: 10/10, speed: 7/10, website: 10/10, cost: 8/10, integration: 9/10, security: 6/10, maintenance: 7/10, revenue: 10/10

## Sources

- https://github.com/PostHog/posthog
- https://posthog.com/docs/self-host
- https://posthog.com/docs
