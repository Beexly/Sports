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
| 2026-05-29 | C12 | /orbit | 8.6 | New surface. Hierarchy strong; performance not yet measured. |
| 2026-05-29 | C20-C33 | _platform_ | n/a | Operating Control Plane shipped; 88 new intelligence evals pass; no public surface scores changed. |

## Galaxy Operating Control Plane status (C20-C33)

| Cycle | Layer | Files | Doc |
|---|---|---|---|
| C20 | Product Telemetry Registry | events.ts, surfaces.ts, intent.ts, privacy.ts | PRODUCT_TELEMETRY_STANDARD.md |
| C21 | User Understanding Model | user-understanding.ts, confusion-signals.ts, learning-state.ts | USER_UNDERSTANDING_MODEL.md |
| C22 | Decision Quality Maturity Model | maturity.ts, process-grades.ts, behavior-patterns.ts | DECISION_QUALITY_MATURITY_MODEL.md |
| C23 | Experiment Engine | experiments.ts, variants.ts, metrics.ts, guardrails.ts | EXPERIMENT_ENGINE_STANDARD.md |
| C24 | AI Governance System | risk-controls.ts, assistant-boundaries.ts, agent-actions.ts | AI_GOVERNANCE_SYSTEM.md + 3 docs |
| C25 | Taste Critic System | taste-criteria.ts, anti-patterns.ts | TASTE_CRITIC_RUBRIC.md |
| C26 | Experience Orchestrator | orchestrator.ts, user-modes.ts, surface-priority.ts, next-best-surface.ts | EXPERIENCE_ORCHESTRATOR.md |
| C27 | Responsible Intelligence Layer | friction.ts, restraint.ts | RESPONSIBLE_INTELLIGENCE_LAYER.md |
| C28 | Trust UX System | trust-signals.ts, disclosures.ts, source-labels.ts | TRUST_UX_STANDARD.md |
| C29 | Explainability Ladder | levels.ts, renderers.ts | EXPLAINABILITY_LADDER.md |
| C30 | Intelligence Eval Harness | 5 test files | 88 tests pass |
| C31 | Product Science Ledger | — | PRODUCT_SCIENCE_LEDGER.md |
| C32 | Positioning Firewall | positioning-firewall.ts | POSITIONING_FIREWALL.md |
| C33 | Award-Level Presentation | moments.ts | AWARD_LEVEL_PRESENTATION_STANDARD.md |

## Owner

Self-scored by autonomous cycle. Owner-reviewed weekly. Codex audit
re-scores quarterly for independence.
