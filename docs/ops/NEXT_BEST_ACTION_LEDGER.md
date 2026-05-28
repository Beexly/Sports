# Next Best Action Ledger — Galaxy Sports Edge

The self-pushing mechanism. Every autonomous cycle ends here with the
identified next highest-leverage action across ten dimensions. The next
cycle reads this file first and picks the top unresolved item per the
Constitution's priority order.

## Format

| Cycle | Date | Dimension | Item | Priority | Resolved by |
|---|---|---|---|---|---|

## Dimensions

1. Highest risk
2. Highest product gap
3. Highest conversion gap
4. Highest design gap
5. Highest security gap
6. Highest compliance gap
7. Highest performance gap
8. Highest accessibility gap
9. Highest documentation gap
10. Highest competitive-moat gap

## Active ledger

| Cycle | Date | Dimension | Item | Priority | Status |
|---|---|---|---|---|---|
| C7 | 2026-05-28 | Security gap | Verify repo visibility is `private`; confirm no proprietary methodology in public bundles | B | PARTIAL — `productionBrowserSourceMaps` defaults false ✅; `robots.ts` disallows `/cockpit`, `/admin`, `/api`, `/auth`, `/dashboard`, `/brief` ✅; repo visibility must be confirmed in GitHub UI by owner |
| C8 | 2026-05-28 | Security gap | Add `/.well-known/security.txt` for coordinated disclosure | B | RESOLVED — `d282267`+ |
| C8 | 2026-05-28 | Product coherence | Differentiate `/board` (raw operator view) from `/today` (curated habit-loop entry) so they are not perceived as duplicates | D | RESOLVED — catalog summary updated |
| C8 | 2026-05-28 | Product coherence | Add `<DecisionQualityNav />` homepage section linking all 7 decision-quality surfaces | D | RESOLVED — no more orphan surfaces |
| C8 | 2026-05-28 | Compliance gap | Audit responsible-play link coverage on all betting-adjacent surfaces; upgrade /picks with inline RiskDisclosure | E | RESOLVED |
| C8 | 2026-05-28 | Security gap | Scaffold `apps/web/lib/prompts/` server-only registry with migration backlog for inline prompts in content-generator and claude-api/messages | B | PARTIAL — scaffold + README; per-prompt migration queued |
| C7 | 2026-05-28 | Product gap | Centralize AI prompts under `apps/web/lib/prompts/` (server-only) | B | OPEN |
| C7 | 2026-05-28 | Documentation gap | Adopt the Product Kernel — typed configs under `apps/web/lib/galaxy/kernel/` | D | OPEN |
| C7 | 2026-05-28 | Compliance gap | Add responsible-play link to every betting-adjacent surface | E | OPEN |
| C7 | 2026-05-28 | Performance gap | Measure Core Web Vitals on top 5 routes against 2.5s/200ms/0.1 targets | H | OPEN |
| C7 | 2026-05-28 | Competitive moat | Galaxy Orbit View — spatial intelligence map concept page | J | OPEN |
| C7 | 2026-05-28 | Design gap | Apply `DESIGN_QA_RUBRIC.md` rules retroactively across all new surfaces | G | OPEN |
| C7 | 2026-05-28 | Conversion gap | Verify pricing feature matrix maps every promised feature to a live surface | I | OPEN |
| C7 | 2026-05-28 | Accessibility gap | Run axe on `/`, `/today`, `/picks`, `/autopsy`, `/parlay-mri` | H | OPEN |
| C7 | 2026-05-28 | Risk | Confirm `THE_ODDS_API_KEY` absent — bootstrap mode labeled everywhere | E | OPEN |

## Cycle history

| Cycle | Date | Anchor result | Commit |
|---|---|---|---|
| C1 | 2026-05-28 | Platform expansion — 8 new surfaces, premium homepage | `75e227d` |
| C2 | 2026-05-28 | Connect the organism — Tracker, Leaderboard, Alerts | `6c72459` |
| C3 | 2026-05-28 | Sport pages, daily habit loop, Pick Card, Academy modules, No-Bet, Briefing | `0094125` |
| C4 | 2026-05-28 | Decision-quality surfaces — Autopsy, Profile, Parlay MRI, Market Mirage, Roster Shock, Coaching Edge | `92ec468` |
| C5 | 2026-05-28 | IP/Security binder — 12 documents | `02c411b` |
| C6 | 2026-05-28 | Decision-quality spine — typed shared config | `0289047` |
| C7 | 2026-05-28 | Galaxy Constitution + ops/scoring/design docs + Product Kernel scaffold | `d282267` |
| C8 | 2026-05-28 | Queue B drain: security.txt + robots/sourcemap verification + board/today disambiguation + prompts scaffold + /picks RiskDisclosure | `9044a0b` → `503bb06` |
| C9 | 2026-05-28 | Queue F drain: EvidenceCard primitive — typed Evidence Chain compliance at the component level, with required failure-case on `kind="pick"` enforced by TS | _this cycle_ |

## Selection rule

The next cycle reads this ledger, then selects the highest-priority
OPEN item per the Constitution's order (A → J). If multiple OPEN items
share priority, choose the one with the largest blast radius.

If no OPEN item is above Queue G priority, the cycle may choose a
delight/breathtaking improvement (Queue J).

A cycle that closes an item updates "Status" to `RESOLVED — <commit>`
and adds the next discovered item.
