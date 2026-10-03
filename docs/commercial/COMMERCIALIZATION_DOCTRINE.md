# GSE Commercialization Doctrine

Updated: 2026-07-04

Status: repo-visible operating doctrine. This does not activate affiliate links, sponsors, billing, publishing, or external integrations.

## Thesis

GSE commercializes trust before it commercializes picks. Media, partners, sponsors, affiliate relationships, API demand, and future licensing all have to pass the same evidence standard:

- no fake data
- no fabricated audience numbers
- no fake revenue claims
- no unsupported win-rate, ROI, profit, calibration, or market-beating claims
- no sponsor control over picks, model outputs, no-bet decisions, loss autopsies, calibration claims, or editorial conclusions
- no auto-publish
- no auto-send
- no automated betting
- no undisclosed partner or affiliate placement

## Commercial Machine

Data -> Source Rights -> Reliability -> Proprietary Metrics -> Model Parliament -> Calibration -> No-Bet Governor -> Evidence -> Content -> API -> Partnerships -> Revenue -> Audit -> Trust.

Commercial work can start before every model or API surface is live because the first product sold is disciplined attention. That attention must not be purchased with false certainty.

## Approved Lanes

| Lane | Status | Boundary |
| --- | --- | --- |
| Media sponsorship | draft/manual | no fake audience or ROI claims |
| Affiliate/tool reviews | draft/manual | disclosure required; no unreviewed links |
| Local sponsors | draft/manual | sponsor cannot influence editorial or model output |
| Newsletter sponsorship | coming soon | no provider integration in this slice |
| B2B Evidence API | future/shadow | derived intelligence only, not raw data resale |
| Licensing and data room | future | source-rights and metric validation required |

## Current Code Surface

- `apps/web/lib/media-revenue/*` handles media strategy and content safety.
- `apps/web/lib/revenue/*` handles reusable partner, offer, disclosure, risk, and audit primitives.
- `docs/media/*`, `docs/commercial/*`, and `docs/revenue/*` describe operating boundaries.

## Owner Gates

Owner approval is required before:

- adding real affiliate links
- naming real partners as active
- signing sponsor packages
- connecting a newsletter provider
- exposing public API v1 routes
- claiming public performance, calibration, or market edge
- enabling paid or live infrastructure
