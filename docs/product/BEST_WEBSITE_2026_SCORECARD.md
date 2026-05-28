# Best Website 2026 Scorecard — Galaxy Sports Edge

Weekly scoring board. Every major surface is rated 1–10 across fifteen
categories. Aggregate behavior is governed by hard rules — scores below
threshold block expansion until repaired.

## Scoring categories (1–10 each)

1. **Product clarity** — does a first-time visitor understand what this
   page does within 10 seconds?
2. **Visual impact** — does it feel like Galaxy, not generic SaaS?
3. **Information hierarchy** — is the most important thing the most
   prominent thing?
4. **Decision utility** — does it help the user make a better decision?
5. **Mobile quality** — does it work well at 375px width?
6. **Accessibility** — keyboard, focus, contrast, screen reader, reduced
   motion (WCAG 2.2 AA as baseline)
7. **Performance** — LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 (75th percentile)
8. **Trust** — does the user feel they can rely on this?
9. **Compliance** — no forbidden copy, responsible-play access, accurate
   labeling
10. **Evidence chain** — source, freshness, model version, citation
11. **Differentiation** — could a competitor ship this with copy edits?
12. **Conversion** — does it drive toward the next step in the journey?
13. **Retention** — does it pull the user back tomorrow?
14. **Trade-secret safety** — does this expose weights, thresholds,
    prompts, or scoring logic?
15. **Operator maintainability** — can this be updated without rewriting
    the page?

## Hard rules

- Average **< 8** → improve before expansion
- Any category **< 6** → rebuild before expansion
- Compliance **< 9** on betting-adjacent pages → block public launch
- Trust **< 9** on betting-adjacent pages → block public launch
- Trade-secret safety **< 9** anywhere → block public launch
- Accessibility **< 8** → improve before public push
- Performance **< 8** → optimize before adding animation
- Constitutional violation → block, no score required

## Routes to score (rotating)

### Tier 1 — habit loop surfaces (weekly)

- `/` (Homepage)
- `/today` (Today's Board)
- `/picks` (PickPilot)
- `/no-bet` (No-Bet Engine)
- `/briefing` (Personal Briefing)
- `/tracker` (Tracker)
- `/autopsy` (Post-Bet Autopsy)
- `/command` (Command Center)

### Tier 2 — decision quality (bi-weekly)

- `/parlay-mri`
- `/market-mirage`
- `/roster-shock`
- `/coaching-edge`
- `/profile` (Betting Brain)

### Tier 3 — intelligence cluster (monthly)

- `/intelligence` and its 15 cluster pages
- `/brain`, `/market-gravity`, `/fantasy`, `/rumor-radar`

### Tier 4 — commercial / company (monthly)

- `/pricing`
- `/methodology`
- `/responsible-play`
- `/vs/tout-services`
- `/about`, `/contact`, `/press`, `/faq`

### Tier 5 — SEO surfaces (monthly)

- `/nfl`, `/nba`, `/mlb`
- `/props`, `/academy`, `/reports`
- `/studios`, `/leaderboard`, `/performance`

## Score log

| Date | Cycle | Route | Avg | Notes |
|---|---|---|---|---|
| _(populate at first scoring pass)_ | | | | |

## Owner

Self-scored by autonomous cycle. Owner-reviewed weekly. Codex audit
re-scores quarterly for independence.
