# Final Report - GSE EdgeBall Contest OS

As of: 2026-06-09

## 1. Best Format Recommendation

Build GSE EdgeBall Lab first: a free, no-cash, best-ball-style sports intelligence contest using fake data and educational overlays.

## 2. Why Not Clone Milly Maker Directly

Milly Maker-style GPPs need massive scale, prize bankroll, legal confidence, support maturity, and tolerance for sharp-player dominance. GSE should borrow spectacle and content cadence, not clone the paid GPP.

## 3. Why Best Ball Fits GSE

Best ball rewards research before the season, keeps lineup management simple, supports Player Lab/GSE Rating education, and can remain engaging through weekly autopsies and risk feeds.

## 4. What Pick'em Teaches But Why It Is Risky

Pick'em teaches simple mobile decision cards and high-frequency engagement. Paid pick'em can look prop-like and carries higher legal/trust risk for a sports intelligence brand.

## 5. Best Owner ROI Path

Start with subscription-retention EdgeBall Lab, then sponsor-funded free-to-play championship. Paid version only later.

## 6. Best Engagement Path

Draft room, rivalry pods, ghost managers, what-changed feed, risk ladder, weekly autopsies, and playoff gauntlet.

## 7. Best Trust-Safe MVP

Fake-data EdgeBall Lab with no prizes, no entry fees, no deposits, no public friend data, and no live leaderboard pressure.

## 8. First-Of-Kind Mechanic

Friend History Engine: five-year friend contest memory that creates archetypes, rivalries, ghost managers, draft tendencies, and risk lessons with consent.

## 9. EdgeBall Lab Spec

See 04-gse-edgeball-format-spec.md.

## 10. EdgeBall Championship Future Spec

Sponsor-funded first; paid legal-review-only later.

## 11. Friend History Engine

See 05-friend-history-engine.md.

## 12. Legal/Compliance Blockers

Paid contest law, sweepstakes/prize law, DFS/fantasy classification, state eligibility, age gates, tax/prize handling, responsible play, privacy, support disputes, and stat corrections.

## 13. Sponsor Strategy

Sponsor-funded free-to-play is the best prize-pool path before paid contests. Sponsor value comes from brand exposure, leads, content integration, and trust-safe association.

## 14. Data Model

See 07-product-architecture.md.

## 15. Analytics Events

- contest_landing_viewed
- edgeball_rules_viewed
- contest_join_started
- contest_join_completed
- draft_room_opened
- draft_pick_made
- draft_queue_updated
- risk_overlay_viewed
- friend_history_import_started
- friend_history_import_completed
- friend_history_deleted
- rivalry_pod_viewed
- ghost_manager_viewed
- weekly_autopsy_viewed
- receipt_viewed
- leaderboard_viewed
- side_quest_joined
- support_dispute_opened
- scoring_correction_viewed
- sponsor_offer_viewed

## 16. Support/Dispute Plan

Official rules, stat provider policy, correction window, support playbook, audit logs, and escalation for responsible-play signals.

## 17. Build Queue Summary

40 EdgeBall cards: dependencies, extensions, and net-new EdgeBall mechanics.

## 18. Top 10 Claude Builds

- EDGE-001: Legal posture memo
- EDGE-003: EdgeBall Lab official rules draft
- EDGE-004: EdgeBall Lab scoring model
- EDGE-006: Friend History import schema
- EDGE-007: Friend History consent and deletion flow
- EDGE-014: Risk ladder scoring spec
- EDGE-022: No-live-prizes release gate
- EDGE-025: Prize pool simulator
- EDGE-029: Contest event taxonomy
- EDGE-039: Contest go/no-go checklist

## 19. What Not To Build

- paid real-money contest
- sportsbook-style picks
- paid pick'em cash game
- DFS GPP clone
- cash-prize leaderboard
- public contest using real friend data without consent
- prize copy without approved official rules

## 20. Human Approvals Needed

Founder and legal approval for any real data import, public beta, prize, paid entry, sponsor-funded prize, eligibility gate, tax/prize process, or production launch.

## 21. Commands Run

Read prior contest/growth docs, memory context, official web research, generation script, JSONL validation, duplicate gate validation, secret scan.

## 22. Sources Used

See SOURCE_LEDGER.md.

## 23. Unknowns

Real app source state, current implemented routes/models, exact state-by-state contest legality, sponsor demand, tax/prize operations, and whether friend-history data is available with consent.
