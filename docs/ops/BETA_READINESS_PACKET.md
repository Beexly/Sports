# Beta Readiness Packet

What ships to beta users. What is live. What is demo. What is disabled.
How feedback flows in.

## Live surfaces

- `/` — Homepage with kinetic hero, evidence chain scroller, lead-with-ledger CTAs
- `/today` — Today's Board (live odds gated by `LIVE_ODDS_ENABLED`)
- `/picks` — Public picks (gated by `PUBLIC_PICKS_ENABLED`)
- `/no-bet` — Pass list
- `/room/[gameId]` — Decision Room with TrustStrip, verdict card, factor radial, press-R theater, related panel, coach, NextBestSurface, action grid
- `/parlay-mri` — Parlay correlation tool
- `/autopsy` — Process grading
- `/command` — Command Center with Since-Last-Visit + 12 widgets
- `/academy` — Concept modules
- `/ledger/canonical` — Public canonical record (gated by `CANONICAL_LEDGER_ENABLED`; honest empty until data accumulates)
- `/manifesto` — 11-beat thesis
- `/we-are-not` — Refusal patterns
- `/we-were-wrong` — Public model autopsy
- `/decisions` — ADR public archive
- `/the-evidence` — Marketing companion
- `/model-pulse` — Model metabolism (gated by `MODEL_PULSE_ENABLED`)
- `/stream` — Decision stream (gated by `DECISION_STREAM_ENABLED`)
- `/methodology` — Public framework + accumulation callout + calibration constellation
- `/galaxy-demo` — Noindex guided tour
- `/canvas` — Spatial slate view (gated by `SLATE_CANVAS_ENABLED`)
- `/eyeglass` — Concept page; not a deployed feature
- `/api/telemetry` — POST endpoint (no-ops when launch-mode analytics=false)

## Demo / sample surfaces

These render with explicit "demonstration data" labels:
- `/galaxy-demo` — 7 tour stops, noindex
- Today's Board in bootstrap mode (when `LIVE_ODDS_ENABLED=false`)
- Command Center widgets when their underlying data is sample

## Disabled (not in beta)

- Live AI in CoachPromptHost (`COACH_LIVE_AI_ENABLED=false`)
- Stripe checkout (`STRIPE_CHECKOUT_ENABLED=false`)
- Email delivery of daily brief (`BRIEF_EMAIL_SEND_ENABLED=false`)
- Ambient sound (`AMBIENT_SOUND_ENABLED=false`)
- ROI tracking schema migration (ADR-008 not applied)
- Public-picks rendering on live data (requires canonical history accumulation)

## What we ask beta users to test

1. Open the homepage and read the manifesto excerpt. Does it land?
2. Press `/` to open the command palette. Does it find every surface?
3. Open Today's Board. Is the trust-label / freshness story clear?
4. Open a Decision Room. Does the verdict card feel like the focal point? Does the factor radial illustrate something?
5. Press `R` in the Decision Room. Does the theater feel like the model is working?
6. Open the canonical ledger. Does the honest empty state read as honest?
7. Read the manifesto end-to-end. Does the thesis feel coherent?
8. Read "We were wrong." Does it feel like a trust deposit?
9. Try Command Center after refreshing twice — does Since-Last-Visit show a delta?
10. Open pricing. Does the "Why a price?" callout disarm the conversion anxiety?

## Known limitations

- Canonical ledger is empty until live odds + settled outcomes accumulate
- Calibration constellation is empty diagonal until ≥ 30 settled per bucket
- Decision Coach uses canned responses only; live AI deferred
- Stripe checkout disabled; existing PRO/ELITE accounts retain access
- Model Pulse and Decision Stream require `release-candidate` mode

## How to report issues

- Open a GitHub issue with the label `beta`
- Include: surface (URL), browser + device, expected vs actual, screenshot if relevant
- Trust incidents (fabricated content, stale-without-label, certainty leak) are SEV-1: email hq@galaxysportsedge.com directly

## What we do NOT want

- Public sharing of beta URLs or screenshots before launch
- Picks treated as recommendations to act on
- Bug reports about features explicitly listed as "disabled"

## Responsible-play note

Galaxy is a research and decision-quality platform. It is not a recommendation to bet, and we do not place bets on your behalf. If gambling is causing harm, the National Problem Gambling Helpline is 1-800-GAMBLER.

## No-guarantee note

Sports outcomes are probabilistic. Confidence bands and edge indices describe model state, not certainty. Past calibration does not guarantee future calibration. Bet only what you can afford to lose.
