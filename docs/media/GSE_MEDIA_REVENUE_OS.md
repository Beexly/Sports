# GSE Media Revenue OS

Updated: 2026-07-04

Status: local strategy, docs, public-safe pages, and typed planning utilities. No auto-publish, no auto-send, no external platform API integration, no affiliate tracking integration, and no email provider integration were added.

## Purpose

GSE should become a sports intelligence media company, not only a sports picks website. The prediction system can keep maturing while the audience, authority, partner pipeline, newsletter habit, and founder trust are built in public.

Media starts now because:

- subscriptions need trust before conversion
- partners need to see editorial standards before buying inventory
- affiliates need review and disclosure workflows before links exist
- API and data demand grows from public education about source reliability
- founder credibility compounds through proof, not launch-day hype
- content creates a distribution spine for GSE and a later GSN network umbrella

## What This Is Not

This is not a faceless AI content farm. It is not a high-volume recycled clips system. It is not a sports footage scraper. It is not an auto-upload pipeline. It is not a tout funnel.

The repo already contains binding boundaries in:

- `docs/media/media-studio-workflow.md`
- `docs/media/youtube-automation-boundaries.md`
- `docs/media/content-provenance-and-review.md`
- `docs/audit/media-automation-risk-policy.md`
- `docs/brand-safety-rules-v2.md`

This OS builds around those boundaries instead of replacing them.

## Brand Thesis

GSE is evidence over ego.

The model is allowed to say no.

Confidence is earned, not performed.

No bet is a decision.

The box score lies. The evidence does not.

Raw data is not intelligence.

Sports prediction should be audited, not shouted.

GSE is not a tout brand. It is an auditable sports intelligence company.

## GSE, Founder, And GSN Roles

GSE official content is the product voice. It explains evidence, methodology, source reliability, calibration, no-bet discipline, loss autopsies, and product decisions.

Garrett/founder-led content is the human build-in-public voice. It can show pressure, unemployment context, ambition, discipline, shipped work, blockers, and lessons, but it should not become desperate, chaotic, or pity-driven.

GSN is the later media/network umbrella. It can house broader board meeting, podcast, partner, and creator collaboration programming once the operating standards are proven.

## Revenue Map

| Revenue path | Media contribution | Current boundary |
| --- | --- | --- |
| Subscriptions | Build trust before asking for payment | No unsupported performance claims |
| Partners | Show editorial standards and sponsor inventory | No partner claims without disclosure |
| Affiliates | Review tools through evidence and workflow fit | Placeholder only until approved links exist |
| Sponsors | Founding packages for aligned brands | No fake audience or ROI claims |
| Newsletter | Owned audience and conversion spine | Waitlist state until provider is approved |
| API demand | Teach why raw data is not intelligence | No private API claim without proof |
| Founder credibility | Show real work and honest blockers | No secrets, no live-readiness inflation |

## Operating Layers

1. Content Pillar Layer - `apps/web/lib/media-revenue/content-pillars.ts`
2. Platform Strategy Layer - `apps/web/lib/media-revenue/platform-strategy.ts`
3. Content Opportunity Scoring Layer - `apps/web/lib/media-revenue/content-idea-score.ts`
4. Script Template Layer - `apps/web/lib/media-revenue/script-templates.ts`
5. SEO Packaging Layer - `apps/web/lib/media-revenue/seo-pack.ts`
6. Repurposing Layer - `apps/web/lib/media-revenue/repurposing-plan.ts`
7. Claim Safety Layer - `apps/web/lib/media-revenue/claim-safety.ts`
8. Founder Identity Layer - `apps/web/lib/media-revenue/creator-identity.ts`
9. Partner Fit Layer - `apps/web/lib/media-revenue/partner-fit.ts`
10. Sponsorship Package Layer - `apps/web/lib/media-revenue/sponsorship-packages.ts`
11. Media Calendar Layer - `apps/web/lib/media-revenue/media-calendar.ts`
12. KPI Layer - `apps/web/lib/media-revenue/content-kpi.ts`
13. Public Pages Layer - `/media-kit`, `/partners`, `/newsletter`, `/content-lab`, `/podcast`
14. Documentation Layer - this folder
15. Tests - `apps/web/__tests__/media-revenue-*.test.ts`, `media-kit-page.test.ts`, `partners-page.test.ts`

## Claim Safety Principles

- No fabricated stats.
- No stale-data claims.
- No fake audience numbers.
- No fake monetization status.
- No fake sponsors or testimonials.
- No auto-publish.
- No auto-send.
- No external posting without manual review.
- All commercial claims need evidence or must be blocked.
- Sponsorships and affiliates require disclosure.
- Sportsbook/DFS offers require complete compliance metadata.

## Public Pages Added

- `/media-kit` - public-safe sponsor overview with honest early-stage language
- `/partners` - partner standards, disclosure, editorial independence, responsible-gaming posture
- `/newsletter` - waitlist-oriented newsletter positioning and lead magnet concepts
- `/content-lab` - content pillar explanation
- `/podcast` - future GSE Board Meeting format and partner/guest inquiry route

## Next Slice

Build the Content Production Queue:

- `docs/media/CONTENT_PRODUCTION_QUEUE.md`
- 80 starter content ideas as structured data
- internal route to browse content ideas
- draft-only script generation utilities
- SEO pack examples for first 10 videos
- partner outreach tracker template
- lead magnet landing page docs
- no auto-publish
