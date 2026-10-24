# Polish And Improvement Register

As of: 2026-06-09

This register converts the site war-room research into the practical polish layer the live product needs: no raw JSON screens, no hard-to-read subcategories, no unexplained proprietary complexity, and no page that makes a user hunt longer than 10 seconds for value.

## North Star

Every meaningful object on the site should answer five questions without making the user think:

1. What am I looking at?
2. Why does it matter right now?
3. What changed?
4. What is the risk or limitation?
5. What should I do next?

If a page or item cannot answer those questions above the fold, it needs a visual rewrite before more features are added.

## Item Experience Contract

Every data item, card, row, report, player, rating, receipt, promotion, brief, or alert should include:

| Layer | Requirement | Why It Matters | Bad Version | Better Version |
| --- | --- | --- | --- | --- |
| Plain-English title | Human readable, no internal file names or raw keys. | Users should know the object instantly. | `player_rating_payload.json` | `Why this player moved today` |
| One-line summary | Short answer in human copy. | Solves the 10-second comprehension problem. | `model_delta: 0.18` | `His role improved after the injury update.` |
| Status badges | Freshness, risk, tier, confidence, source state. | Gives immediate trust context. | Hidden source metadata. | `Fresh today`, `High volatility`, `PRO depth` |
| Visual body | Table, chart, comparison, timeline, or ranked list. | Turns dense data into scannable evidence. | Raw JSON block. | Two-column change table with highlighted movement. |
| How-to affordance | Inline help drawer, video chip, tooltip, or lesson link. | Teaches proprietary UX on the fly. | FAQ buried elsewhere. | `How to read this` drawer on the card. |
| Source/trust cue | Public-safe source freshness and receipt link. | Trust without method leakage. | No context. | `Updated 42m ago from verified roster/source checks.` |
| Next action | Save, compare, watch, read more, upgrade, ask support. | Converts interest into behavior. | Dead-end panel. | `Compare in Player Lab` / `Add to watchlist` |

## Raw JSON Remediation

Raw JSON is acceptable only in founder/admin debug mode. Public and customer-facing views need a formatter:

| Raw Pattern | Public Replacement | Implementation Note |
| --- | --- | --- |
| API payload page | Summary card + expandable developer payload behind founder/admin gate. | Never show JSON as the first screen for normal users. |
| Array of records | Sortable table with column labels and empty/loading/error states. | Default to the 5-7 most important columns. |
| Nested object | Overview cards plus accordion details. | Keep nested internals collapsed. |
| Score deltas | Movement badge, sparkline, before/after table. | Explain movement without exposing formulas. |
| Error payload | Human recovery state with support link. | Include trace/debug only in admin mode. |

## Subcategory Readability Fixes

Subcategories should be designed like navigation labels, not database labels.

Rules:

- Use 1-3 words where possible.
- Pair every uncommon label with a short descriptor or tooltip.
- Use segmented controls for mutually exclusive views.
- Use tabs only for stable, repeated sections.
- Use icon+text for high-value actions, not decorative buttons.
- Keep labels above 14px on mobile and 15-16px on desktop.
- Never rely on color alone to distinguish risk/freshness/tier.

Recommended category names:

| Current/Raw Idea | Better Label | Support Copy |
| --- | --- | --- |
| `rating_delta` | Moved Today | What changed since the last refresh. |
| `volatility_bucket` | Risk Level | How unstable this signal is right now. |
| `source_age` | Freshness | How recently the underlying inputs were checked. |
| `player_context` | Player Context | Team, role, status, and recent movement. |
| `methodology_notes` | Why It Matters | Public-safe explanation without the recipe. |
| `tier_required` | Unlocks With | Shows why PRO or ELITE adds depth. |

## Galaxy Studios Help Layer

Galaxy Studios should become the sitewide education surface, not a separate content island.

Recommended system:

| Surface | Help Asset | Max Length | Trigger |
| --- | --- | --- | --- |
| Homepage hero | 45-60 second product overview | 60s | `What is GSE?` |
| GSE Rating card | 20-30 second motion explainer | 30s | `How to read this` |
| Player Lab | 45 second workflow clip | 45s | First visit and help drawer |
| No-bet/risk panel | 20 second risk explainer | 20s | Any no-bet/risk state |
| Track Record | 30 second receipts explainer | 30s | Receipts section |
| Pricing | 30 second tier walkthrough | 30s | Plan comparison |
| Promotions | 20 second disclosure/trust explainer | 20s | Before outbound click, once approved |
| Support | 60 second getting-started video | 60s | Support landing |

Every help asset needs a text fallback, captions, transcript, and reduced-motion safe version.

## Motion Polish

Motion should teach the user where to look. It should not decorate the page.

Approved patterns:

- Rating movement tick: small numeric transition when a score changes.
- Freshness pulse: subtle border/indicator when new data arrives.
- Risk ladder reveal: stepped reveal for low/medium/high volatility.
- Compare slide: left/right player comparison transition.
- Skeleton shimmer: only for loading states and only when reduced motion is not requested.
- Drawer entrance: short opacity/translate for help panels.

Do not ship:

- Autoplay-heavy hero loops that delay LCP.
- Constant background particles.
- Sportsbook-style flashing urgency.
- Motion that implies guaranteed outcome.
- Animation without `prefers-reduced-motion` fallback.

## Route-Level Polish Map

| Route/Surface | Highest-Impact Polish | Why | First Build |
| --- | --- | --- | --- |
| Home | Replace generic hero with command-center hero and three proof panels. | Users need the product promise in 10 seconds. | BUILD-SITE-002 |
| Home | Add what-changed and no-bet panels. | Shows the product is alive and risk-aware. | BUILD-SITE-003 / BUILD-SITE-004 |
| GSE Rating | Above-fold score, movement, freshness, risk, and explain drawer. | Turns proprietary signal into understandable value. | BUILD-SITE-031 / BUILD-SITE-032 |
| Player Lab | Tabs, compare, watchlist, current team/status trust. | Makes the complex research workspace usable. | BUILD-SITE-036 |
| Players | Search, table/card toggle, current team/status proof. | Prevents stale roster confusion. | BUILD-SITE-041 |
| Track Record | Receipt strip, autopsy cards, humility copy. | Builds trust without overclaiming. | BUILD-SITE-005 |
| Pricing | Use-case ladder instead of feature dump. | Converts by clarity, not pressure. | BUILD-SITE-051 |
| Promotions | Compliance-safe shell only. | Prevents trust and legal damage. | BUILD-SITE-057 |
| Brief/Content | Key takeaways, source legend, next product action. | Makes content part of the product loop. | BUILD-SITE-061 |
| Support | Galaxy Studios hub and confused-user rescue. | Teaches the product and reduces churn. | BUILD-SITE-066 / BUILD-SITE-070 |

## Visual QA Gates

Before any live aesthetic rollout, capture desktop and mobile screenshots for:

- Homepage first viewport.
- Homepage next-section hint.
- GSE Rating above fold.
- Player Lab tabs/table/card view.
- Players search and empty state.
- Pricing comparison.
- Promotions shell.
- Support/help drawer.
- Loading skeletons.
- Error states.
- Reduced-motion mode.

Fail the review if:

- Text overlaps on mobile.
- Any card shows raw JSON to a normal user.
- A user cannot tell what to do next.
- Colors read like sportsbook/casino/tout marketing.
- Motion hurts readability.
- A locked state feels like a dead end.
- Founder-only methodology is exposed.

## Execution Order

1. Locate the real shipping clone and capture screenshots.
2. Fix raw JSON and unreadable subcategory surfaces.
3. Implement visual tokens and data-card hierarchy.
4. Rebuild homepage above the fold.
5. Rebuild GSE Rating above the fold.
6. Rebuild Player Lab navigation and card/table behavior.
7. Add Galaxy Studios help layer and how-to drawers.
8. Add pricing/trust copy and support rescue.
9. Add route-level analytics.
10. Run visual QA, accessibility, performance, and copy audits.

