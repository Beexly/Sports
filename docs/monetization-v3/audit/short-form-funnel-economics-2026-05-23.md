# Short-Form Funnel Economics

**Date:** 2026-05-23
**Status:** Internal R&D only
**Related decision:** DEC-NEXT-065

## DEC-NEXT-065 - Model short-form economics as proof-surface traffic, not creator vanity

**Decision:** Evaluate short-form video experiments by their ability to send qualified readers to Galaxy proof surfaces and then into email/Vault consideration. Do not evaluate the lane by views alone.

**Why now:** Short-form can look productive while producing no monetizable trust. Galaxy needs a small model that keeps the test honest before Garrett spends time on video production, character design, or platform-specific posting.

## Funnel Shape

Short-form post -> proof surface -> quiet email capture or contextual Vault CTA -> Vault application or later Almanac preorder.

Do not route directly to checkout.

## Conservative Funnel Math

Use this model for the first two-week test:

| Stage | Conservative assumption | Notes |
|---|---:|---|
| Public posts | 5 videos x 4 platforms | Repost once per platform, no paid boost. |
| Average views per post | 250 | Low assumption; avoids planning around virality. |
| Click-through to Galaxy | 0.5% | Only clicks to proof surfaces count. |
| Proof-surface visits | 25 | 20 posts x 250 views x 0.5%. |
| Email capture rate | 2% | Quiet module, no modal. |
| Vault application rate | 1% | Contextual CTA from proof surface. |
| Expected immediate applications | 0-1 | This is a learning test, not a launch engine. |

Break-even is not revenue in V1. Break-even is whether the comments and clicks show comprehension of the artifacts.

## Viability Thresholds

After two weeks, continue only if at least two of these are true:

- 100+ proof-surface visits from tagged short-form links;
- 3+ email captures from tagged short-form visits;
- 1+ Vault application from tagged short-form visits;
- comments mention Loss Room, Pass List, methodology, calibration, or restraint;
- production time stayed under 6 total Garrett/Codex hours for the batch.

Kill or pause if any of these happen:

- comments primarily discuss the character/persona instead of the artifact;
- comments ask for picks, locks, or outcome promises;
- proof-surface visits are below 25 total after two weeks;
- manual review time exceeds 10 minutes per finished video;
- Garrett feels pressure to post daily to keep momentum.

## Monetization Path By Time Horizon

### 0-30 days

Goal: learn whether video can send qualified proof-surface readers.

Expected revenue: near zero.

Useful output:

- winning hooks;
- proof-surface destinations that convert;
- comment vocabulary;
- production time baseline.

### 30-90 days

Goal: produce a small repeatable artifact recap format.

Revenue path:

- email capture;
- Vault applications;
- future Almanac waitlist.

Constraint:

- no more than one batch per week unless Vault operations are stable.

### 90-180 days

Goal: decide whether character media becomes a real acquisition loop.

Revenue path:

- Vault signups from proof-surface visits;
- Almanac preorders if Almanac activates;
- Live partner inquiry only if Live activates.

Constraint:

- no platform-native persona monetization, sponsorships, or unrelated merch until the active tracks earn it.

## UTM Convention

Use the existing short-form parser rules:

```text
utm_source=[youtube_shorts|tiktok|x_video|instagram_reels]
utm_medium=short_form
utm_campaign=vega_v1
utm_content=[series_slug]-[artifact_slug]
```

Every video gets exactly one destination URL. The destination is a public proof surface.

## Production Budget

V1 maximum:

- 5 scripts;
- 5 videos;
- 4 platform reposts each;
- 6 total production/review hours;
- 2-week measurement window;
- one readout memo.

If production exceeds the budget, the experiment fails even if views are decent. Founder attention is the real cost.

## What Not To Monetize

- Do not run paid boosts.
- Do not add sportsbook affiliate links.
- Do not sell merch off the first character test.
- Do not accept sponsorships.
- Do not create platform-native premium communities.
- Do not create daily prediction posts.

## Morning Action If This Becomes Active

1. Pick the five source artifacts.
2. Fill [short-form-utm-map.csv](../templates/short-form-utm-map.csv).
3. Fill [short-form-content-drafts.csv](../templates/short-form-content-drafts.csv).
4. Create one visual style frame.
5. Run brand-safety review before public posting.

## Guardrail

This R&D model does not activate a fourth monetization track. It gives Garrett a way to reject short-form work quickly if it does not produce qualified proof-surface traffic.
