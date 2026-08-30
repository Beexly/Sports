# Design, Monetization & Growth — References & Discipline (2026-06-03)

Extracted from the trending/design/marketing/sales/psychology research dump. Goal: a best-visual-2026
site that monetizes **without betraying the honesty doctrine** (`lib/trust-claims.ts` + public-copy scanners).

## Design system & brand identity (toward best-visual-2026)
- Adopt a STRICT design system + tokens + motion language + dark mode (refs: elementary OS guideline
  discipline; PostHog/Linear/cal.com polish; Saleor admin+storefront). Establish a consistent identity /
  symbol and palette across site, app, docs, social (refs: Blender/Godot/Krita branding).
- Production-UI references to study: PostHog (real-time dashboards), cal.com (subscription UX), Baserow/
  Metabase (data UI), n8n (visual node editor for a factor/flow view).

## Adopt (dev / UX / A-V)
- **`tldraw`** (infinite canvas) → interactive factor breakdowns, **confidence heatmaps**, the
  consensus/divergence visualization, visual pick explainers. High creativity-per-effort.
- **Stale-while-revalidate** data fetching for live odds/picks/line-movement (we already use React Query;
  `swr` is the alt) → instant UX.
- **Stripe subscription patterns**: cal.com + vercel/nextjs-commerce as references (we already have Stripe + live price IDs).
- **Audio/visual content (gated — NO auto-publish):** TTS (OpenBMB/VoxCPM) → audio pick briefings +
  accessibility; AI video (MoneyPrinterTurbo) → marketing clips. Content-layer only; human review before publish.

## Monetization & conversion — ETHICAL psychology ONLY ⚠️
The pasted sales-psychology funnel is half useful, half **toxic to our brand**. Discipline:
- **ADOPT (honest, and stronger):**
  - Real **social proof = the cryptographically-verifiable track record** (`proof-of-record.ts`) — more
    convincing AND honest than any tout claim.
  - Honest **loss-aversion via feature gating** (Free: 1 pick/day, no confidence scores) — already the model.
  - **Tier anchoring** (Elite/Pro/Free already priced); **reciprocity** (free public calibration + track record);
    **authority** via published methodology, not hype.
- **REJECT (these are BANNED by our copy scanners / honesty doctrine):**
  - "10,000+ bettors trust our AI picks" → unverified overclaim.
  - "place your first bet using our picks" / "you'll miss the weekend games" → we do NOT push wagering.
  - Fake scarcity/urgency ("only 100 spots", "ends in 7 days") unless literally, verifiably true.
  - Dark-pattern auto-convert-trial-to-paid without explicit, clear consent.
- **The moat:** we convert on **provable accuracy + radical transparency**, not tout psychology. That contrast
  (honest analytics vs. every screaming tout) IS the 2026 differentiator.

## Honest funnel
Awareness (verifiable track record + published calibration) → Trial (free picks + open record) →
Engagement (Beat-the-Model contest) → Upgrade (honest gating: confidence, factor trail, alerts) →
Retention (real performance + leaderboard) → Referral.

## Still declined
Crypto/token-gating/"blockchain picks marketplace" (gamba-labs, buperrr/cryptocasino) and casino/predictor
repos — off-brand + legal/guardrail walls. The one legitimate "provably fair" idea = our Merkle
**proof-of-record** (plain hashing, no crypto-currency). Related:
`docs/strategy/repo-firehose-review.md`, `docs/strategy/gaming-and-engagement-expansion.md`.
