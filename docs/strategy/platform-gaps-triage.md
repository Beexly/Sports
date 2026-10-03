# 25-Gap Platform Audit — Triage Through the Doctrine (2026-06-03)

The pasted "25 critical gaps" audit (from Copilot) is written for a **tout / sportsbook-affiliate**
product. A large slice of it would actively destroy our glass-box trust moat. Filtered through the
honesty + no-autonomous-money + responsible-play doctrine:

## ✅ ON-BRAND — build (introspection / transparency / responsible play IS our brand)
| Gap | Status |
|---|---|
| 6/10 Bankroll + Kelly sizing | **SHIPPED** `bankroll.ts` (conservative, "not a bet rec", hard caps + over-exposure flag) |
| 8 Responsible-gaming enforcement | **SHIPPED** `responsible-gaming.ts` (self-exclusion block, loss cool-down, session/milestone nudges) |
| 23 "Galaxy vs the Market" / contrarian / consensus | **SHIPPED core** `consensus.ts` + `consensus-view.ts` (the divergence surface) |
| 9 User performance analytics (accuracy by sport, ROI by type, **calibration by confidence**, vs-close) | Build next — pure analytics over settled picks (engine has calibration primitives) |
| 14/21 Public accountability, model changelog, **loss autopsies**, pick retraction, pre-mortem | Build — we already have LossAutopsy/CockpitDecision internally; expose a public `/accountability` |
| 24 Dark mode | Build — table stakes, design system already supports it |
| 16 Offline PWA | Build — service worker + manifest |
| 17 Audio layer (TTS pick briefings, podcast) | Build (content-gated) — Cerebras/TTS already scoped; **no auto-publish** |
| 18 Props modeling | Build — extend the engine (PropPick); pure model work, on-thesis |
| 25 "How we compare" benchmarks | Build — but ONLY with **verifiable** numbers (no overclaim); pairs with proof-of-record |
| 13 Email digest | Build — owned channel, honest digest (NOT "you'll miss games" urgency) |
| 3 Personalization (sport/type/confidence filters) | Build — preference-driven feed (no "are they chasing losses" dark profiling) |

## 🔒 FOUNDER / LEGAL-GATED (real decisions, not autonomous)
- 1 Native mobile app (Expo) — weeks of work + a strategic platform bet → founder.
- 2 Live/in-game re-scoring (WebSocket live odds) — needs a paid live-odds feed (cost) + infra → founder; the *re-score logic* is buildable on our engine, the *live feed* is the gate.
- 12 A/B testing infra (PostHog) — adopt, but founder picks the tool/budget.
- 19 Jurisdictional geo-fencing / state RG messaging — needed IF real-money; for analytics, do honest state-aware RG copy. Legal-gated.
- 20 B2B / data-licensing API — a sales motion, not a build; founder.
- 22 Institutional/syndicate tier — founder.
- 11 Creator program (revenue-share, affiliate codes) — viable distribution, founder-gated on the affiliate model.

## 🛑 REJECT / REFRAME (conflicts with the moat)
- 5 "Place this at DraftKings" buttons / **embedded sportsbook checkout** / bet-slip deeplinks / "make betting
  frictionless" — this turns us into a tout funnel that pushes wagering. **Reject.** An *honest affiliate
  disclosure link* (clearly labeled, no urgency, founder-gated) is the most we'd ever do — Phase-3, separate.
- 15 NFTs / "prove pick ownership on-chain" — crypto, off-brand; the legit version is our **Merkle
  proof-of-record** (no crypto). Reject NFTs.
- 15 Merch — harmless but not a priority; founder, trivial.
- Audit framing throughout ("mobile is where bets happen", "70% won't bet because not frictionless",
  syndicate penetration) — that's a *betting-volume* goal. **Our goal is provable accuracy + trust.** We
  optimize retention via transparency and self-awareness, not by maximizing action.

## The reframe in one line
The audit says "you're building a feature, not a platform." True — and the platform we build is the
**honest, introspective, transparent** one (accountability, calibration, responsible play, proof-of-record),
NOT the frictionless-betting one. Every adopted gap above bends toward *trust*, which is the only moat a
prediction product actually has. Related: `design-monetization-growth.md`, `gaming-and-engagement-expansion.md`.
