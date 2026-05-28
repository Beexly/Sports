# Sports OS — Design Experience System

**Status**: Doctrine only. Visual implementation requires approved change proposal.
**Source**: Prompt 1 §5 · Prompt 4 design language doctrine
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`
**Full spec**: `docs/design/experience-system.md` · `DESIGN.md` (repo root, pending CC-4)

---

## Design Standard

Sports OS should feel like:

- **Bloomberg** — disciplined data density, no decorative clutter
- **F1 telemetry** — real-time precision, layered numeric information
- **NASA mission control** — operator confidence, functional authority
- **Apple** — restraint, deliberate whitespace, no wasted motion
- **Perplexity** — answer clarity, source attribution, honest uncertainty
- **Glean** — graph intelligence, entity connections made navigable
- **Linear / Vercel / Stripe / Raycast** — product polish, speed, trust

The compound effect: a product that feels like a serious intelligence network,
not a sportsbook, not a tout site, not a generic AI chatbot, not a SaaS dashboard.

**Design principle**: One cinematic brand layer. Many disciplined data layers.

---

## What to Avoid

These patterns are explicitly forbidden on all Sports OS surfaces:

| Forbidden pattern | Why |
|---|---|
| Sportsbook clutter | Associates Sports OS with gambling operators |
| Casino green | Signals gambling, undermines intelligence positioning |
| Cheap neon / laser-tag aesthetic | Undermines premium intelligence brand |
| Crypto-dashboard noise | Implies volatility theater, not genuine signal |
| Generic SaaS cards | No differentiation, no brand identity |
| Fake AI sparkle (animated gradients, glowing orbs) | Implies AI theater, not real intelligence |
| Shallow glassmorphism | Overused, signals low production quality |
| Overanimated sci-fi | Distracts from data, hurts usability |
| Hype copy / certainty language | Conflicts with responsible intelligence positioning |
| Unsupported confidence visuals | Do not show confidence meters for unverified data |

---

## Surface Hierarchy

Sports OS has two distinct visual contexts that must not bleed into each other:

### Public Surface

The user-facing product. Prioritizes:
- Clarity of intelligence output
- Source transparency
- Honest confidence representation
- Tier-appropriate content gating
- Methodological credibility

Visual tone: restrained, intelligent, authoritative. No noise.

### Cockpit Surface (Internal)

The operator mission control. Prioritizes:
- Data density
- Source health at a glance
- Action queues and review states
- Contradiction and staleness alerts
- Agent/model run history

Visual tone: functional, dense, F1 telemetry-adjacent. Speed over beauty.
Cockpit surfaces may carry more UI complexity than public surfaces.

---

## Signature Components

These are the canonical Sports OS UI components. Each must be defined in
`docs/design/signature-components.md` before any implementation begins.
No implementation without an approved change proposal.

| Component | Surface | Purpose |
|---|---|---|
| Brain Answer Card | Public / Cockpit | Displays a structured Brain answer with confidence, sources, and caveats |
| Evidence Drawer | Cockpit / Premium | Expandable evidence pack for a pick or claim |
| Signal Stack | Public / Premium | Layered signal visualization (confirmed → weak → market) |
| Market Gravity Meter | Premium / Cockpit | Visual representation of market pressure and direction |
| Rumor Radar Card | Cockpit | Weak-signal cluster with verification status |
| Player Intelligence File | Premium / Cockpit | Full entity card: status, usage, scheme, risk, market |
| Pick Provenance Timeline | Cockpit / Premium | Birth-to-settlement audit trail for a pick |
| Source Health Panel | Cockpit | Source freshness and reliability dashboard |
| Contradiction Alert | Cockpit | Flags conflicting signals on the same entity |
| Brain Confidence Meter | Public / Premium | Honest confidence representation with caveats |
| Fantasy War Room Card | Premium | Start/sit/waiver/trade recommendation with evidence |
| Slate Command View | Premium / Cockpit | Full-slate overview for a given sport and date |
| Public Methodology Block | Public | Inline explanation of how a pick or signal was derived |

---

## Typography Doctrine

- **Display / hero type**: compressed, oversized — identity statement, not decoration
- **Data type**: tabular numerals, monospace where appropriate — clarity over style
- **Body**: legible at small sizes, high contrast — credibility over aesthetics
- **Labels / metadata**: subdued, clearly secondary — data is the hero

---

## Color Doctrine

- **Primary**: deep space / near-black backgrounds for cockpit and data-dense views
- **Accent**: ultraviolet / electric indigo — premium intelligence, not casino
- **Signal colors**:
  - Confirmed / verified: neutral white or cool grey (not green — green reads as casino)
  - Warning / staleness: amber
  - Contradiction / risk: red-orange (not casino red)
  - Weak signal: muted purple
- **Forbidden**: casino green, neon yellow, hot pink, crypto orange as primary palette

---

## Motion Doctrine

Motion must be functional, not decorative:
- Use motion to indicate state change (loading, settling, updating)
- Use motion to direct attention (new signal arriving, alert appearing)
- Do not use motion as brand expression on data surfaces
- Do not animate numbers or charts in ways that suggest artificial precision
- Keep motion subtle on public surfaces; slightly more expressive on cockpit surfaces

Full motion doctrine: `docs/design/motion-and-transition-doctrine.md` (pending CC-4)

---

## Accessibility Rules

- All public surfaces must meet WCAG 2.1 AA minimum
- Color alone must never be the sole differentiator for signal state
- All confidence meters must have text labels, not only visual indicators
- All data tables must be keyboard-navigable
- Cockpit surfaces should meet AA but may prioritize density over strict AA compliance
  where the audience is operator-only and a conscious trade-off is documented

---

## The Intelligence UX Contract

Every piece of intelligence shown to a user must:

1. State what it is (pick, signal, rumor, model output, market signal)
2. State where it came from (source tier, source name if public-safe)
3. State when it was observed (timestamp)
4. State how confident we are (with honest caveats, not fake precision)
5. State what would weaken it (contradicting signals, staleness risk)
6. State what the user should do with it (act, watch, verify, ignore)

Anything that cannot satisfy all six points should not appear on a public surface.
