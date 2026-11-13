# ADR 0006 — Multi-Channel Short-Form Video Production, Social Follower Flywheel & Ad/Affiliate Revenue Attribution Engine

**Date:** 2026-11-06
**Status:** Accepted

## Context

To scale Galaxy Sports Edge (`GSE`) and Galaxy Sports Institute (`GSI`) revenue aggressively while keeping customer acquisition cost (`CAC`) near zero, we must combine:
1. **High-Retention Short-Form Video Production** across TikTok, YouTube Shorts, Instagram Reels, and X Video (`1080x1920`, `60fps`, 45–60s storyboard packets with `0-3s` pattern-interrupt hooks, `3-25s` film/trench breakdowns, `25-45s` matchup environment overlays, and `45-60s` paywall/follow CTAs).
2. **Multi-Stream Monetization**:
   - Direct Subscriptions & Day/Week Passes via Stripe (`/packages` instant paywall unlock) and Whop (`/whop`).
   - Display & Video Ad Revenue via Google AdSense (`ca-pub-8151105906877749`, `ads.txt` verified, suppressed on `/embed/*` routes), YouTube Partner Program, X Creator Revenue Sharing, and TikTok Creator Rewards.
   - Verified Affiliate & Tracker Ecosystem via Impact.com (`Account 8111208`), OddsJam (`?ref=zwniodg`), and CapperTek verified record distribution.
3. **Customer-Facing Human Copy & Paywall Protection Doctrine (`HARD`)**: Public videos, social posts, and free web pages must NEVER dump internal math/pipeline jargon (no mentions of `JEV`, `Sinkhorn`, `Romano CQR`, `Cholesky`, `tau_hat`, or `10,000 worlds`) and must NEVER give away paid official sides, totals, player props, or SGP legs for free.

## Decision Drivers

* **Maximum Organic Reach & Follower Velocity**: Sharp, natural football-film storytelling (offensive line slide mismatches, silent-count road crowd latency, coverage shell tendencies, weather/wind kicking edges) outperforms robotic AI jargon on TikTok, Reels, Shorts, and X.
* **Strict Paywall Conversion**: Public content reveals the *matchup environment* and *why the market is vulnerable*, then routes viewers directly to `https://www.galaxysportsedge.com/packages` to unlock the official `47-19-1` (`+26.50u`) Week 9 card and DFS lineup cores.
* **End-to-End Funnel Telemetry**: Track every impression-to-checkout step in PostHog Cloud Project `516325`.

## Considered Options

### Option 1: Post Raw Model Percentages & Free Picks on Social Media
- **Pros**: Easy to automate.
- **Cons**: Violates the Paywall Protection Doctrine (erodes subscription value) and the Human Copy Doctrine (robotic percentages fail `lint-rules.js` and `trust-gate.mjs`).

### Option 2: Automated Storyboard & Film-Breakdown Video Packet Engine + Paywall-Safe Teasers + Multi-Stream Ad/Affiliate Attribution
- **Pros**: Builds massive organic authority and ad revenue across 4 video platforms while driving high-intent subscription checkouts on `/packages` and `/fantasy/dfs`, with 100% guardrail compliance.
- **Cons**: Requires structured storyboard generation and automated copy-linting tests.

## Decision

We adopt **Option 2**: Deploy `intelligence/ops/gse_video_social_and_revenue_growth_engine.py` and `apps/web/lib/content-os/video-and-revenue-engine.ts` to generate paywall-safe, human-written short-form video scripts, Remotion/FFmpeg storyboards, social follower growth hooks, and full multi-stream revenue attribution.

## Rationale

1. **Teach the Film, Gate the Ticket**: Explaining *how* an opponent's wide-9 pass rush attacks a backup tackle builds immediate viewer trust; gating the exact derivative prop and DFS leverage stack converts that trust into recurring subscription revenue.
2. **Diversified Revenue Stack**: Every viewer generates value—either via high-margin Stripe/Whop subscriptions, Impact/OddsJam affiliate conversions, or AdSense/platform video ad impressions.

## Consequences

### Positive
- Ready-to-render 45–60s vertical video packets generated automatically for every slate.
- 100% compliance with `trust-gate.mjs`, `commercial-copy-scan.mjs`, `no-unsupported-performance-claims.mjs`, and `apps/mobile/scripts/lint-rules.js`.

### Negative
- Public social/video scripts must be continuously tested by `tests/python/test_video_social_and_revenue_growth_engine.py` to prevent accidental pick leaks or internal math jargon.

## Implementation Notes

- Python Video/Social/DFS/Revenue Engine: `intelligence/ops/gse_video_social_and_revenue_growth_engine.py`
- TypeScript Content-OS Module: `apps/web/lib/content-os/video-and-revenue-engine.ts`
- Verification Suite: `tests/python/test_video_social_and_revenue_growth_engine.py`

## Related Decisions

- [ADR-0003](0003-gsi-cross-domain-sports-medicine-and-decision-intelligence-expansion.md): GSI Cross-Domain Expansion & Capital Stack
- [ADR-0005](0005-week9-plays-360-board-and-draftkings-fanduel-dfs-engine.md): Week 9 Plays & DraftKings/FanDuel DFS Engine

## References

- `data/engine/week9_video_social_dfs_and_revenue_master_packet_2026_11_06.json`
- `docs/dfs/research/2026-11-06/WEEK9_PLAYS_DFS_VIDEO_AND_REVENUE_EXECUTION_PACKET.md`
