# Dub

## Project Summary

Dub is the candidate link management, attribution, partner/referral programs, campaign analytics layer for GSE / GSN.

Canonical repo: https://github.com/dubinc/dub  
Official site: https://dub.co  
Docs: https://dub.co/docs

## What It Replaces

Bitly, Rebrandly, PartnerStack light use, attribution spreadsheets, UTM chaos

## Verified Capabilities

- Branded short links
- Marketing attribution
- Partner/referral programs
- Conversion tracking
- Analytics API
- REST API, SDKs, webhooks
- Bulk links

## Deployment Model

Self-host guide requires Vercel, PlanetScale/MySQL, Tinybird/ClickHouse, Upstash Redis, R2/AWS storage, GitHub OAuth, optional Resend/Unsplash

## License / Open-Core Risk

AGPLv3 core with ee folders under commercial license

Recommended legal posture: High caution. Use internally or by API/cloud first; do not fork, embed, white-label, or expose modified network service without legal approval.

## Security / Privacy Risk

Medium/high sensitivity: campaign traffic, referrals, clicks, conversions, partner IDs

Primary risk: AGPL/public network obligations if modified; multi-service hosting; attribution privacy; source access duties

## API / Integration Surface

Campaign link spine for every GSE content, affiliate, creator, enterprise, and paid-tier conversion path

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

- Do not copy Dub source into GSE.
- Do not bypass license or enterprise-feature boundaries.
- Do not connect production customer data during prototype.
- Do not launch public surfaces before privacy, auth, and rollback review.

## Recommended Adoption Mode

Use cloud/API or pattern first; self-host later only if AGPL obligations and infra burden are accepted

## Final Score

strategic: 9/10, speed: 5/10, website: 10/10, cost: 8/10, integration: 8/10, security: 4/10, maintenance: 5/10, revenue: 10/10

## Sources

- https://github.com/dubinc/dub
- https://dub.co/docs
- https://dub.co/docs/self-hosting
- https://raw.githubusercontent.com/dubinc/dub/main/LICENSE.md
