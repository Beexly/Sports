# Phase 6+ Planning

**Status:** Lightweight planning doc. Full specs deferred until Phase 4 ships and real product feedback shapes Phase 6+ priorities.
**Owner:** Claude (planning frame) + product owner (resolves open decisions before Phase 6+ kicks).
**Decision reference:** master plan Part 5.

---

## Purpose

After Phase 5 ships (anti-Galaxy, programmable DSL, B2B widgets, war room, correlation engine, trust toolkit), Galaxy is a mature platform with consumer subscription + creator tools + B2B layer + research broadcast. Phase 6+ extends from there into network effects, federation, and adjacent product lines.

We do NOT spec Phase 6+ items in full now. We list them, summarize them, and identify the decision points that will resolve when Phase 6+ planning fires (estimated 4-6 months from 2026-05-22).

When Phase 4 verification gate passes, this doc gets revisited and each item below either escalates to a full spec or is explicitly deferred again.

---

## Phase 6+ items

### Item 1 — White-label engine licensing

The original "open everything" radical (#1) pivoted to "license selectively." Phase 6+ executes the licensing program.

**Sketch:**

Other sports media properties license Galaxy's engine to power their own UI. Their brand, our math. Per-licensee revenue. Possible structures:

- **Per-license model:** flat monthly licensing fee per property. Tier by audience size.
- **Per-seat model:** licensee pays per active user accessing the engine through their UI.
- **Revenue-share model:** percentage of licensee's revenue attributable to engine-powered features.

**Decision points:**

- Pricing structure (DEC-OPEN-B).
- Customization tier (do licensees get to retune factor weights, or do they get the engine as-shipped?).
- Brand-attribution rules (does licensee have to disclose "powered by Galaxy" anywhere?).
- White-label vs co-branded (full white-label vs "Galaxy inside [their brand]" badge?).

**Prerequisites:**

- B2B API tier from Phase 5 in operation with at least 3 Enterprise customers.
- Methodology framework page mature and stable.
- Trust + compliance toolkit packaged.

### Item 2 — Multi-contributor House picks

Galaxy launches with solo creator (the owner). Phase 6+ may evolve to a multi-contributor model where named handicappers publish picks under the Galaxy umbrella with their own track records.

**Sketch:**

Each contributor:
- Has an individual track record displayed publicly.
- Picks attributed to them, not to "Galaxy."
- Galaxy's algorithmic picks remain a separate vertical (the model's vertical).
- A "Sharp Consensus" view surfaces when multiple contributors agree on a pick.

**Decision points:**

- Revenue split with contributors.
- Curation standards (how high a bar to become a House contributor?).
- Voice rules — do contributors have to follow `docs/positioning.md` banned vocabulary?
- How does this interact with anti-Galaxy (do contributors get their own anti-versions?).

**Prerequisites:**

- Solo creator layer (Phase 3) has run successfully for 6+ months.
- Performance metrics + tooling exist to track individual contributors.

### Item 3 — Native mobile app

Phase 5 Phase plan calls for this; if deferred, lands in Phase 6+.

**Sketch:**

Expo / React Native. iOS first, Android follow-on.

Core surfaces:
- `/board` view.
- `/picks` view.
- `/calibration/me` view.
- Push notifications for alerts (Pro+ tier).
- Pre-show confidence prompt with native UX.
- Game Room view.

iOS Live Activities for in-game pick tracking.

**Decision points:**

- Reskin or rebuild — does the mobile app share components with the web app or have its own UX language?
- App Store policy — sportsbook adjacency may require careful framing.

**Prerequisites:**

- Phase 4 Chrome extension ships first (lower-risk distribution).
- Calibration training in production (mobile UX particularly suits the pre-show prompt).

### Item 4 — Apple Watch complication

Lightweight Phase 6+ add. Shows live state strip: model version, slate density, open picks count. Tap for the day's published picks.

**Decision point:** Worth building only if mobile app has 10k+ users.

### Item 5 — WhatsApp Business API (Elite tier alerts)

Phase 5 spec calls for SMS via Twilio. WhatsApp is parallel — for international Elite users where SMS is less common.

**Decision point:** Defer until Elite tier has 1k+ active users.

### Item 6 — Year-in-review personalized data viz (Spotify Wrapped for betting)

End-of-year personalized data story for active users.

**Sketch:**

- Their personal calibration curve vs the model's.
- Their pick estimates this year — best week, worst week.
- Sports they were most calibrated on.
- Insights they engaged with in the Model Journal.
- Notable losses + their reactions / engagement with autopsies.

Shareable as an image / link. Drives word-of-mouth.

**Decision points:**

- Privacy: opt-in only by default.
- Shareable assets: how much auto-generation vs user customization?

**Prerequisites:**

- 12 months of data on the user.
- Calibration training has been active for the user (Phase 4 surface).

### Item 7 — Survival pool

Daily mechanic: each user picks one team per week. Last person standing wins.

**Sketch:**

- Free or low-cost entry.
- Community engagement mechanic.
- Galaxy doesn't recommend the picks — users pick on their own.
- Galaxy provides the slate; users use the engine's tools to decide.

**Decision points:**

- Prize structure — cash prize requires gaming-law review; non-cash prize avoids it.
- Whether to gate to Pro+ tier or open to all.

**Prerequisites:**

- Phase 4 Edge Lab + calibration training in production.

### Item 8 — Calibration leaderboard

Phase 5+ extension of calibration training. Aggregate calibration accuracy across users.

**Sketch:**

- Opt-in only.
- Ranks users by calibration accuracy, NOT by win rate.
- Anti-tout metric — the leaderboard is for "well-calibrated bettors," not "high-rate winners."

**Decision points:**

- Public vs Pro-tier-visible.
- Display name strategy.
- Anti-manipulation (preventing users from gaming the system).

### Item 9 — Local + Youth Sports expansion (F.6)

Codex's "escape the betting-site box" track. Per master plan Part 6 DEC-019, deferred to Phase 6+ as a future expansion track.

**Sketch:**

- TeamHub for local sports (high school, club, semi-pro).
- Recap generator (AI-assisted game recaps using Galaxy's content tooling).
- NIL profile concept (athlete profiles, sponsor placement).
- Sponsor slots.
- Schedule + results importer.
- **Zero betting language.** This is a regulatory escape valve + category expansion.

**Decision points:**

- Active scope decision at Phase 6+ planning (per DEC-019).
- Whether this is Galaxy-branded or a separate product line / brand.
- Resource allocation — local sports is a sizable engineering investment that competes with continuing platform investment.

**Prerequisites:**

- Phase 5 platform in steady-state operation.
- Phase 5 B2B + creator tools have proven the OS frame works.
- Available engineering bandwidth.

### Item 10 — Embeddable widgets for free distribution

Phase 5 ships paid B2B widgets. Phase 6+ may add free-tier widgets for broader distribution.

**Sketch:**

- Edge Index widget already free (Phase 5).
- Add: a "Today's Pass List" widget — free, attribution-required.
- Add: a "Methodology snippet" widget — free, attribution-required.
- Goal: maximize Galaxy badge presence across the sports media ecosystem.

**Decision point:** which widgets stay paid, which go free? Default: keep Market Pulse + Model Court + Slate Weather paid; release Edge Index + Pass List + Methodology snippet as free with attribution.

---

## Items NOT in scope for Phase 6+ (or any phase as currently planned)

Just for clarity, the following items from the wider brainstorm (master plan Part 2.E) are NOT currently planned and would require a master plan amendment:

- Paid social ads at scale.
- Crypto / events markets adjacency.
- AI-assisted bet placement (auto-betting on user's behalf).
- Aggressive sportsbook affiliate placement (interstitials, homepage takeovers).
- White-labeling the consumer-facing Galaxy Sports Edge brand.
- Multi-asset prediction marketplace.

These remain in the "What we are NOT" frame from master plan Part 0.

---

## Phase 6+ verification gate (when this fires)

Before kicking Phase 6+ work, the following must be true:

1. Phase 5 verification gate passed.
2. Phase 5 verification retrospective in `docs/ops/decision-log.md` complete.
3. Real product metrics support the Phase 6+ priority order (e.g., if mobile usage is high, native app gets prioritized; if B2B revenue is hitting plan, white-label licensing gets prioritized).
4. Owner has resolved Phase 6+ open decisions (pricing, customization tier, etc.).
5. Engineering bandwidth available (Codex is not bottlenecked on Phase 1-5 outstanding work).

---

## When this doc gets revisited

- Phase 4 verification gate passes → this doc gets a "first review" for Phase 6+ priority order.
- Phase 5 starts → individual Phase 6+ items get promoted to full specs as they approach the front of the queue.
- Phase 5 verification gate passes → full Phase 6+ planning kicks. This doc evolves into a phase-specific brief.

---

## Open items (collected from above)

- **OPEN-P6-1:** White-label licensing — pricing model (per-license / per-seat / revenue-share)? DEC-OPEN-B.
- **OPEN-P6-2:** Multi-contributor House picks — revenue split structure?
- **OPEN-P6-3:** Native mobile app — reskin or rebuild?
- **OPEN-P6-4:** Year-in-review — privacy default and sharing model?
- **OPEN-P6-5:** Survival pool — cash prize (with gaming-law review) or no?
- **OPEN-P6-6:** Calibration leaderboard — public visibility vs Pro+ only?
- **OPEN-P6-7:** Local + Youth Sports — active scope decision (DEC-019)?

All resolve at Phase 6+ planning.

---

*Planning doc by Claude. Full specs deferred. Revisit Phase 4 verification.*
