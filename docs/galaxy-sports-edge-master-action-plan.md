# Galaxy Sports Edge — Master Action Plan

> Single source of truth. Supersedes all prior briefs. Claude and Codex
> both work from this document. When in doubt, defer to this plan. When
> the plan is silent, escalate to the product owner.

-----

## Part 0 — The North Star

### What Galaxy Sports Edge is

A **transparent scoring engine for sports betting**, built on three pillars:

1. **Deterministic math** — every pick ships with the factor breakdown
   that produced it. No black box, no LLM in the prediction pipeline, no
   hidden weights at the methodology layer.
2. **Radical transparency** — every settled pick keeps its full signal
   snapshot against the actual outcome. Calibration is shown openly at
   every confidence band. Picks we considered but didn't publish are
   surfaced with reasons.
3. **Explicit restraint** — the model can refuse. Most days, it does.
   Fewer than five picks on a typical slate. Some days, zero.

### What we are NOT

- Not an AI sports prediction platform. The engine is
  statistical/deterministic, documented in `docs/prediction-engine.md`.
  The Claude API is only used in the content publishing worker, never in
  the prediction pipeline.
- Not a tout service. No all-caps hype, no "VIP card," no "must profit
  or week free" gimmicks.
- Not a templated SaaS landing page. The Dazaboost-style chassis
  (Hero → Problem → Solution → Tech Grid → Testimonials → Pricing) is
  dead.
- Not a multi-asset prediction marketplace. No crypto, no stocks, no
  hedge fund pitching.

### The position

> **"We're not AI. We're math you can read."**

Locked. Variants for testing only, never as primary: *"Deterministic
scoring. Open math. Most days, fewer than five picks."* / *"Sportsbook
research, not sportsbook hype."*

### Corporate structure (filed May 22, 2026)

**Galaxy Sports Network LLC (Texas)** is the corporate parent.
**Galaxy Sports Edge** is the flagship consumer product. See
`docs/corporate-structure.md` for the canonical reference.

The user-facing brand doesn't change. The corporate entity gives us a
clean home for IP, contracts, and multi-product expansion without
restructuring later.

**Texas-specific operational note:** Texas restricts traditional sports
betting (DFS only, no licensed sportsbooks). Galaxy Sports Edge operates
as informational/research, not a sportsbook — this is fine. But
sportsbook affiliate enrollment in Phase 4 requires legal review per
program (DraftKings, FanDuel, etc. each have state-by-state operator
licensing requirements). Flag for whoever runs that enrollment.

### The business architecture — a Sports Intelligence OS

The consumer position above ("math you can read") is what the public
sees. The business view is bigger: **Galaxy is a Sports Intelligence
platform. Sports betting is the wedge product. The same unit of sports
intelligence — one game, one factor breakdown, one settled outcome —
monetizes five ways:**

1. **Consumer subscription.** Free / Pro / Elite picks, Game
   Intelligence Rooms, calibration training, personalized lenses.
2. **Creator tools.** Galaxy Studio packages a slate into shareable
   assets (threads, scripts, newsletters, sponsor-safe blurbs) with
   citations and compliance checks.
3. **B2B widgets + API.** Market Pulse, Slate Weather, Model Court,
   Evidence Health — embeddable for newsletters, Discord communities,
   fantasy creators, sportsbook affiliates, local media.
4. **Affiliate + commerce.** One subtle sportsbook deeplink per pick.
   Future: tickets, tools, merch — never aggressive, never homepage
   placement.
5. **Trust + compliance layer.** Claim scanner, promo guard, Loss Room,
   evidence registry — sellable as a compliance toolkit to other
   operators.

This frame doesn't change the consumer position. It expands the
business model the same engine powers. **The wedge stays the wedge.**
Don't market the OS to consumers; market math you can read.

### The tier narrative (unchanged)

- **Free** — See it. One pick a day plus all free public surfaces
  (Gate Cam, Pass List, Public Ledger preview, Live Calibration chart,
  Edge Lab tools, public Edge Index, methodology page).
- **Pro** — Bet it. Every pick, every day, confidence, quick reasoning,
  factor breakdown, custom alerts, Discord/Telegram pipes.
- **Elite** — Master it. Full analysis, "What Was Learned" weekly
  digest, alerts with reasoning, early access, advanced tools
  (programmable DSL, custom alert scripts, backtesting, cross-sport
  correlation queries, live war room access).

-----

## Part 1 — The Claude / Codex Division of Labor

The point of this section: stop stepping on each other.

### Codex's lane (engineering implementation)

Codex owns everything that produces or modifies code. Specifically:

- All TypeScript, React, Next.js, Prisma changes
- Database schema migrations
- API endpoint implementation
- Component architecture and styling
- Test suites (unit, integration, E2E)
- Build, deploy, CI/CD pipeline work
- External API integrations (Odds API, balldontlie, SportsDataIO, future
  data sources)
- Infrastructure: workers, queues, caching, scheduled jobs
- Bug fixes and performance optimization
- Browser extension build
- Native mobile app build (when scoped)
- Bot implementations (Discord, Telegram, Twitter/X, SMS via Twilio)
- The programmable DSL parser, sandbox, and runtime
- The cross-sport correlation query engine
- The anti-Galaxy parallel pipeline
- Edge Lab tool implementations
- Email / push / SMS / WhatsApp notification delivery

### Claude's lane (strategy, content, coordination)

Claude owns everything that doesn't produce or modify shipping code.
Specifically:

- Voice and vocabulary stewardship across the entire product
- Marketing copy: homepage, methodology, pricing, hero, section heads
- Editorial review of all auto-generated content (blog posts,
  pre-mortems, post-mortems, weekly Model Journal)
- The weekly **Model Journal** essay drafts (Codex pipes the data,
  Claude drafts the essay, owner reviews and publishes)
- Pre-mortem and post-mortem narrative templates
- Phase planning, brief writing, priority debates
- PR reviews on anything touching voice, UX, or positioning
- Ongoing competitor and category analysis
- Coordination with the product owner
- The Twitter/X bot's voice and format rules (Codex builds the bot,
  Claude writes the post templates)
- The "Why this pick?" conversational interface prompt design
- The methodology tutor prompt design
- Calibration training UX copy and feedback messaging
- "What Was Learned" Elite digest editorial
- The published methodology framework document (what we expose vs
  protect)

### Joint territory (need explicit protocols)

A few surfaces live at the intersection. Both Codex and Claude touch
them. Protocol below.

| Surface | Codex does | Claude does |
|---|---|---|
| Methodology page | Implements the page, the interactive visualizations, the data wiring | Writes the content, signs off on every paragraph |
| Model Journal weekly | Pipes settled-pick data into a draft generation step, builds the editor UI | Writes the essay draft from the data, owner human-reviews before publish |
| Blog auto-generation | Implements the generation pipeline + storage + scheduling | Curates the prompts, reviews output samples, flags drift |
| Pre-mortem auto-summary | Implements the generation pipeline (factor data → text) | Provides the prompt + voice rules, reviews periodically |
| Post-mortem auto-summary | Same | Same |
| Twitter/X auto-post bot | Builds the bot, scheduler, rate-limiting, error handling | Writes the post templates, voice rules, what gets posted vs muted |
| Pricing page copy | Implements the page | Writes/owns every word |
| FAQ + glossary | Implements the surface | Writes the content |

### Path-based ownership

The role descriptions above are abstract. These path patterns are the
concrete rules. They prevent editor collisions.

**Claude creates freely (no review unless flagged):**

- `docs/product/**` — all product manifestos, specs, taxonomies
- `docs/research/**` — competitor analysis, audience research, category
  notes
- `docs/positioning.md` and any positioning addendums
- `apps/web/lib/**/templates.ts` — prompt templates, content templates,
  asset templates
- `apps/web/__fixtures__/**` — example data, sample narratives,
  expected-output references
- New markdown handoff files for Codex implementation

**Codex owns edits to (Claude does not touch):**

- `packages/db/prisma/schema.prisma`
- All `prisma/migrations/**`
- All existing app routes (`apps/web/app/**/*.tsx`,
  `apps/web/app/**/route.ts`)
- All existing tests (`apps/web/__tests__/**`, `**/*.test.ts`)
- Existing guardrails and policy modules
- Package configs (`package.json`, `tsconfig.json`, `next.config.*`,
  `tailwind.config.*`)
- Build/test fixes, CI/CD configuration

**Shared files require explicit handoff (PR description must call it
out):**

- `apps/web/app/cockpit/layout.tsx`
- `packages/db/prisma/schema.prisma` (Claude proposes a change in a
  markdown handoff; Codex implements)
- `apps/web/lib/trust-claims.ts`
- `apps/web/lib/promotions/guards.ts`
- Any generated client or types files
- The methodology page, pricing page, FAQ page, glossary page (Claude
  provides content as a markdown handoff; Codex implements)
- Marketing component files (`apps/web/components/marketing/**`) —
  Claude writes copy; Codex implements

**Note about "scaffolds":** Claude can scaffold new files (component
skeletons, types, fixtures, templates, prompts, docs) but does NOT
implement the running code paths inside them. A Claude scaffold is a
markdown handoff that says *"here's the shape; build it like this."*
Codex implements.

-----

## Part 1.5 — The Autonomous Collaboration Loop

The default operating mode. Claude and Codex run the loop without the
product owner in the path. The owner only intervenes when the loop
explicitly escalates a STUCK item.

### The loop

```
1. Trigger
   Owner says: "Run Phase N" / "Fix [issue]" / "Improve [surface]"

2. Brief
   Claude generates an implementation brief.

3. Implementation
   Codex implements against the brief.

4. Self-test
   Codex runs the verification suite. On failure → auto-diagnose →
   fix → retry (MAX 3 retries). After 3 failed retries → escalate to
   STUCK queue with diagnostic.

5. PR
   Codex opens PR with description, screenshots, joint-territory tag.

6. Auto-review
   Claude reviews against the checklist. On issues → posts review
   with specifics → returns to step 3. After 3 unresolved review
   rounds → escalate to STUCK queue.

7. Approval + merge
   Claude approves → Codex merges → CI deploys.

8. Verification
   Codex runs production sanity checks. On regression → auto-rollback →
   escalate to STUCK queue.

9. Next card
   Codex picks the next scoped item from the current phase. OR Claude
   initiates next item if it's a content/copy task.
```

### STUCK criteria

The loop halts and escalates to the owner when ANY of these are true:

1. **Codex stuck:** 3 retries failed on self-test loop with the same
   class of error.
2. **Claude stuck:** 3 feedback rounds, Codex still hasn't resolved
   the same review issue.
3. **Spec ambiguity:** the master plan is silent or contradictory.
4. **Commercial decision:** the task requires a pricing / legal /
   vendor choice that exceeds Claude's delegated authority (see Part 6).
5. **Schema break:** the task would modify committed schema in a way
   that breaks existing data without a clear migration path.
6. **External blocker:** waiting on an external API, third-party
   approval, missing credential the owner controls.
7. **Plan conflict:** two parts of the master plan contradict each
   other and the resolution isn't obvious.

### Shared artifacts

Operational files at `docs/ops/`. Both Claude and Codex read and write.

| File | Purpose | Append-only? |
|---|---|---|
| `docs/ops/issue-queue.md` | Bug reports, voice/vocab violations spotted in production, test gaps, perf issues | No |
| `docs/ops/decision-log.md` | Every decision with date + rationale + alternatives considered | **Yes** |
| `docs/ops/stuck-queue.md` | Current escalations waiting on owner | No |
| `docs/ops/improvement-backlog.md` | Non-urgent improvements | No |
| `docs/ops/evals/**` | Test cases for AI-output layer | Yes |

### Claude's auto-review checklist

Run in this order on every Codex PR. Stop and flag at first failure.

1. **Spec compliance.** Does implementation match the brief?
2. **Voice scan.** Any banned words from Part 3?
3. **Visual diff.** Screenshot comparison vs prior version.
4. **Test coverage.** New behaviors tested?
5. **Performance.** Bundle size delta. Page load delta.
6. **Accessibility.** Semantic HTML, aria labels, keyboard nav.
7. **Mobile-first.** 390px viewport works. Tap targets 44px+.
8. **Bootstrap respect.** Handles bootstrap-canonical gating?
9. **Integration.** Doesn't conflict with any prior PR's surface.
10. **Documentation.** Master plan, decision log, or product docs
    updated if structural change.

### Codex's self-test loop

After every implementation step:

```bash
npm run lint --workspace=apps/web
npm run typecheck
DATABASE_URL=stub npm run test --workspace=apps/web
npm run build --workspace=apps/web
```

### Maximum iteration thresholds (locked)

| Threshold | Limit |
|---|---|
| Codex self-test retries before escalating | **3** |
| Claude review rounds with Codex before escalating | **3** |
| Codex implementation retries on Claude review feedback | **3** |
| Wall-clock before STUCK queue entry auto-flagged "urgent" | **24 hours** |
| Wall-clock before unresolved STUCK item pings owner | **48 hours** |

### Continuous flow vs phase gates

Phases in Part 5 are the strategic frame, not a daily bottleneck.
Codex always has 2-3 cards in flight from the current phase. Claude is
always reviewing or writing the next batch of briefs/content. Phase
gates are quality checkpoints, not start/stop barriers. Cross-phase
work happens in parallel.

### Rehydration procedure (when context is lost)

If a Claude or Codex session breaks or context is dropped, recover by
reading in order:

1. `docs/galaxy-sports-edge-master-action-plan.md` (this file)
2. `docs/ops/decision-log.md` — last 20 entries
3. `docs/ops/stuck-queue.md` — current escalations
4. `git log --merges -n 5 --pretty=full` — last five merged PRs
5. `docs/innovation-os-current-state.md` — current codebase shape
6. `docs/ops/issue-queue.md` — open items

-----

## Part 2 — The Complete Surface Inventory

Everything we're building, organized into categories. Phases are
assigned in Part 5.

### A. Existing engine assets (already shipped or in code)

These exist. Don't rebuild. Build on top of them.

- Multi-source ingestion: Odds API, balldontlie, SportsDataIO (premium
  NFL), TheSportsDB
- Deterministic scoring engine with 10+ factors (consensus, depth, edge,
  line movement, volatility, H2H, venue form, schedule stress, rest,
  cross-market, data quality)
- `Pick`, `PickSignalSnapshot`, `GameSignal`, `IngestionRun` schema
- Bootstrap-vs-canonical history gating (`isBootstrap` flag, readiness
  gates)
- Outcome-anchored learning loop (`eligibleForLearning`, settled-only
  learning data)
- Vig removal, fair-value calculation, American odds conversion
  utilities
- Settlement logic per sport (3-way for soccer, 2-way for others)
- Performance aggregation by sport, confidence band, pick grade, depth
- Admin dashboard with the full data view
- Daily slate API with top edge pick, recent record, sport breakdown
- Public picks API with entitlements gating
- Stripe subscriptions, NextAuth, BullMQ + Redis workers
- Blog auto-generation via Claude API (content layer only)

### B. The Phase 1-2 homepage and core surfaces

These ship first. Phase 1 stubs render with illustrative data; Phase 2
replaces with real wires.

1. **Live State Strip** — thin above-hero data ticker: sports watched,
   books polled, open picks, gated today, last refresh, model version.
2. **New Hero** — *"We're not AI. We're math you can read."* +
   subhead + two CTAs (See today's board, Read the methodology).
3. **Gate Cam** — live operations theater. SCORING NOW / PUBLISHED
   TODAY / GATED TODAY columns.
4. **Public Ledger preview** — recent settled picks with the full
   `PickSignalSnapshot` data attached.
5. **Live Calibration** — single chart: confidence band on X, actual
   win rate on Y, perfect-calibration diagonal overlaid.
6. **The Pass List** — today's games we evaluated and didn't publish.
7. **The Stack — methodology** — three layers: *"Read the board" /
   "Score the math" / "Gate the slate."*
8. **Three Questions comparison** — keep structure, apply prior brief
   copy fixes.
9. **Methodology page** (`/methodology`) — published framework
   document.
10. **Edge Index public** — flip from PRO-gated to free.

### C. The eleven approved radical surfaces

1. **Programmable DSL** — *"Sports betting's Bloomberg Terminal."*
   Small domain-specific language for Pro/Elite users to write their
   own scoring filters. Elite tier feature.
2. **The model's autonomous Twitter/X account** — free picks only;
   gate state, publications, settlements, post-mortems.
3. **Calibration training disguised as a picks product** — every pick
   view prompts: *"What's YOUR confidence in this?"* before showing
   ours.
4. **Pre-mortem on every pick + "What Was Learned" Elite digest** —
   public pre-mortem; Elite weekly synthesis.
5. **Cross-sport correlation engine** — Pro+ users can test their own
   hypotheses against historical data.
6. **"GitHub Issues" model — for the model itself** — public bug
   tracker against the scoring engine.
7. **Anti-Galaxy — parallel adversary model** — a second model
   intentionally optimized to be wrong, running in parallel.
8. **Live war room during major games** — Sunday afternoons / major
   events; YouTube Live primary.
9. **The Model Journal — weekly essays** — every Sunday; tone:
   research blog, not marketing.
10. **Programmable alerts** — power users write tiny scripts in the
    DSL for notification logic.
11. **Sell / license / monetize the engine** — white-label engine,
    API as B2B paid feed, education product. PFF model.

### D. Pending — needs more iteration before launch

**Adversarial model team:** start with two models (production +
challenger), 4-6 weeks internal, expose publicly after 100+ settled
picks of independent track record.

**Academic API:** Phase 4 ships free CSV downloads of settled-pick
data; Phase 5 ships manual Researcher Program; Phase 6+ ships
self-service paid API.

### E. The wider brainstorm library

Preserved for reference. Items move from this library into phased
surfaces over time. Nothing gets dropped — just queued.

Data sources we haven't tapped: Pinnacle, Action Network reverse line
movement, Statcast / NBA Stats API / NFL Next Gen Stats, OpenWeatherMap,
RotoWire / ESPN injury wires, Twitter/X for beat reporter feeds,
DraftKings/FanDuel/BetMGM direct APIs, PrizePicks/Underdog Fantasy,
TheRundown, API-Football, Reddit sentiment (as crowd noise signal, not
sentiment AI).

Edge Lab tool expansion: Kelly criterion sizer, hedge calculator, CLV
tracker, arbitrage finder, middling scanner, SGP correlation matrix,
live game simulator (Monte Carlo 10k rollouts), backtesting, bankroll
tracker / paper trading, custom alert builder (subsumed by radical
#10).

Distribution surfaces: Chrome extension overlay on DK/FD/MGM, native
mobile app (Expo / React Native), Apple Watch complication, Discord
bot, Telegram alerts, WhatsApp Business API, email digest via
Resend/Postmark, embeddable widgets, public API, white-label engine.

Engagement / community mechanics: pick-along tail/fade tracking with
per-user calibration scoring, threaded comments on picks,
agree/disagree/fade reactions, daily streak mechanic, calibration
challenges as a game, survival pool, year-in-review personalized data
viz, calibration leaderboard (anti-tout metric), skeptic mode.

AI used honestly: "Why this pick?" conversational explainer (Claude on
top of stored factor breakdowns), methodology tutor, Whisper
transcription, ElevenLabs morning audio brief (Elite), auto-generated
per-game preview pages, loss post-mortem auto-summary.

Radical transparency moves: versioned model changelog, public model
autopsy on every loss, reproducibility receipts (downloadable factor
input data per pick), loss leaderboard, "Fade me" badge.

Monetization beyond subscriptions: sportsbook affiliate signups (DK,
FD, MGM, Caesars pay $50–$500 per qualifying signup), education
product ($99 course), Galaxy API as paid developer tier, white-label
engine, merch sparingly.

Libraries to lift: shadcn/ui, Tremor.so, TanStack Table, React Flow,
visx / Observable Plot / D3, Inngest or Trigger.dev, Resend, Twilio,
PostHog, Sentry, KaTeX.

Patterns from other industries worth stealing: Stripe's developer
culture, Linear's release notes voice, GitHub's contribution graph
(model activity heatmap), Notion's database views, Spotify Wrapped,
Strava's segments, Wordle's daily mechanic, Bloomberg's terminal
density.

### F. Sports Intelligence OS surfaces

These extend Galaxy from a consumer subscription product into the
Sports Intelligence OS described in Part 0.

#### F.1 — Galaxy Studio (creator production tool)

Route: `/cockpit/studio`. Turns one game or one slate into multiple
monetizable assets: fan explainer, fantasy angle, betting education
angle, X thread, TikTok/Reels script, newsletter block, sponsor-safe
blurb, YouTube title + thumbnail ideas, compliance scanner, citations,
"Approved for public?" indicator. **No auto-posting.** Phase 3.

#### F.2 — Game Intelligence Rooms

Route: `/room/[gameId]`. Replaces a thin "pick detail" page with a
persistent intelligence surface per game. Panels: Market Pulse, Slate
Weather, Model Court, Evidence Timeline, What Would Change Our Mind,
Lens Switcher (Fantasy/Fan/Bettor/Creator/Analyst), Galaxy Memory.
Phase 3 read-only; Phase 4 conversational.

#### F.3 — Intelligence Graph

Module: `apps/web/lib/intelligence-graph/`. The platform brain. No UI,
no DB writes initially — pure TypeScript types and pure functions over
existing data. Phase 2 foundation work.

Core types: `GameIntelligenceNode`, `MarketPulse`, `EvidenceHealth`,
`SlateWeather`, `ModelCourtCase`, `UserLens`, `MonetizationSurface`,
`CreatorAsset`.

#### F.4 — B2B widgets and API

Embeddable surfaces. Phase 5.

Widgets: `/embed/market-pulse/[gameId]`, `/embed/slate-weather`,
`/embed/model-court/[gameId]`, `/embed/edge-index/[gameId]`.

API endpoints: `/api/intelligence/game/[id]`, `/api/intelligence/slate`,
`/api/intelligence/creator-pack`.

#### F.5 — Trust & compliance toolkit

The restraint posture, productized. Claim scanner, promo guard, Loss
Room, evidence registry. Phases 2-4 for own use; Phase 5+ packaged and
licensed.

#### F.6 — Local + youth sports expansion (Phase 6+)

TeamHub for local sports, recap generator, NIL profile concept,
sponsor slots, schedule/results importer. Zero betting language.
Regulatory escape valve + category expansion. Active scope decision
made at Phase 6+ planning.

-----

## Part 3 — Voice and Vocabulary

These rules apply to **every** page, every section, every component.
They survive across all phases.

### Banned in body copy

- `card` (as in "pick card" or "VIP card") — too tout-coded. Use
  `pick`, `play`, `slip`, or `ticket`.
- `Mission Control` — generic. Use `Today's Board` or remove eyebrows
  entirely.
- `ecosystem` — generic SaaS jargon.
- `transform`, `unlock your`, `level up`, `your edge starts here` —
  pitch-deck cosplay.
- First-person algorithm voice: *"I see," "I think," "I stay quiet,"
  "I wait"* — kill all.
- Personification of board/algorithm: *"the board stays quiet," "the
  board earns,"* *"a signal is allowed"* — rewrite to system voice.
- **"AI-powered," "AI-driven," "powered by AI"** anywhere in marketing
  copy.
- **"Multimodal intelligence," "AI agents," "machine learning models"**
  as positioning language.
- *"The system thinks / sees / learns / hunts"* — anthropomorphic
  framing.
- "Intelligence platform," "edge detection," "signal detection" as
  proper-noun branding.

### Use instead

| Concept | Use these |
|---|---|
| The thing you submit | slip, ticket, parlay, single, leg |
| The house | book, sportsbook, DK, FD, MGM, Underdog, PrizePicks |
| The number | line, spread, total, O/U, moneyline (ML), juice, vig, hold |
| A pick's strength | lock, lean, fade, tail, hammer, unit |
| Favorites/dogs | chalk, favorite, dog, underdog |
| Edge/data | edge, sharp money, line movement, market consensus |
| The day's games | slate, board (only as a noun, never personified) |
| Engine description | statistical model, deterministic scoring, factor model, factor breakdown |
| Marketing shorthand | math, the math, math you can read |

### Proper-noun feature names that survive

Galaxy IQ, Edge Index, Signal Feed, Eclipse Lock, Calibration Report,
Gate Cam, Public Ledger, Pass List, The Stack, Model Journal. These
are product names — use them as nouns, don't verb them, don't
personify them.

### Where "AI" can still appear (rarely)

- Blog auto-generation footer disclosure: *"Article drafted with AI
  assistance from real pick data."*
- The "Why this pick?" conversational interface description (it
  literally is Claude on top of factor data — accurate).
- Methodology page, ONE line acknowledging that statistical scoring is
  enhanced by content tooling.

**Nowhere else.** Not in the hero, not in pricing, not in testimonials,
not in section heads.

### Voice calibration — tone references

**The bettor we're writing for:** Skeptical of the AI category.
Technically literate. Comfortable with statistical thinking.
Suspicious of hype. Reference: the Pregame.com forum thread "AI
applied to sports betting."

**Lines that pass:**

- *"We post when the model finds edge. Most days that's fewer than
  five picks."*
- *"Every pick on this page has receipts. Tap one to see the math."*
- *"Lines move. Books adjust. We refresh every 30 minutes."*
- *"Thin slate? We post less. Sometimes we post nothing. That's the
  point."*

**Lines that fail:**

- *"Discover your edge with our AI-powered insights."*
- *"If the board is weak, I stay quiet."*
- *"Unlock the ecosystem of sharper betting."*
- *"Galaxy IQ's readiness gate clears the slate."* (Technically
  accurate, reads as jargon.)

### What we are NOT — cautionary references

- **AIPredictions.com** — $199 → $19 limited-time pop-ups, "90k+
  customers winning smarter with AI," multi-asset (sports + crypto +
  stocks). Snake oil.
- **Dazaboost AI, Wise Prediction** — templated SaaS landing pages
  with empty "0 News Articles" counters.
- **The r/AI_Agents n8n hobbyist projects** — cookie-cutter
  "RECOMMENDATION: Bet Lakers Moneyline / Confidence: High" output
  format. **Our pick cards must not look like this.**
- **I Sell Winners and the Whop tout ecosystem** — all-caps hype,
  "SUNDAY VIP CARD $29.99," emoji ladders, "must profit or week free"
  guarantee gimmicks.

-----

## Part 4 — Technical Non-Negotiables

These apply across all phases.

1. **Tier narrative stays.** See it / Bet it / Master it. Don't
   restructure tiers without owner approval.
2. **Data layer stays stable.** `PublicPick`, `DailySlate`,
   `/api/picks`, `/api/performance` shapes are fixed. Extend, don't
   break.
3. **Entitlements logic stays server-side.** Frontend never makes the
   access decision.
4. **No new dependencies unless needed.** Check `package.json` first.
5. **Mobile-first.** Every surface works on 390px. Interactive
   sections must be touch-friendly with 44px+ tap targets.
6. **Accessibility.** WCAG AA contrast minimum. Semantic HTML.
   `aria-label` on icon buttons.
7. **TypeScript strict.** No `any`, no `@ts-ignore`. New components
   fully typed.
8. **No test regressions.** `npm run typecheck`, lint, build, test
   all green before merge.
9. **No websockets unless already in the dependency tree.** SSE or
   polling for live surfaces.
10. **Schema changes need migration scripts and rollback plans.**
    Bootstrap mode must continue to work.
11. **Edge Lab tools out of scope for any homepage refactor** — don't
    break them.
12. **Bootstrap gates respected everywhere.** No surface displays
    bootstrap-era data as if it were canonical. Public stats remain
    gated until `PERFORMANCE_STATS_ENABLED=true`.

-----

## Part 5 — Phasing

Seven phases (Phase 0 added for housekeeping). Each phase has a clear
scope and a verification gate. Don't start phase N+1 until phase N is
green.

### Phase 0 — Stabilize the current branch

**Owner: Codex executes solo. Claude writes the state-of-the-codebase
doc in parallel.**

Codex tasks: clean uncommitted state, remove nested `Sports/` clone,
confirm migration strategy for Loss Autopsy + Promo Desk, run full
verification suite, commit cleanly.

Claude tasks: write `docs/innovation-os-current-state.md`.

Verification gate: clean `git status`, all four commands green, current
state documented.

### Phase 1 — Reposition + kill the template

**Owner: Codex executes, Claude reviews PR for voice/UX.**

Scope: global AI-language scrub, homepage architecture replacement, new
hero/Live State Strip/Stack rewrite/Three Questions copy fixes, stub
the new surfaces (`PREVIEW MODE` labels), methodology page Phase-1
stub, Edge Index visibility flip to public, consolidate marketing
components into `apps/web/components/marketing/`, voice rules carried
forward, `docs/positioning.md` updated, nav and footer audit.

### Phase 2 — Build the real surfaces + Intelligence Graph foundation

Schema extension for `GateDecision`, `/api/board/state`,
`/api/calibration`, `/api/board/passes`, full `/board`, full `/ledger`,
full `/methodology`, pre-mortem auto-summary pipeline, cross-sport
correlation engine schema, Intelligence Graph v0, Loss Room
sub-archive.

### Phase 3 — Creator layer + transparency + Twitter bot + Galaxy Studio v0 + Game Rooms v0

Model Journal weekly surface, Twitter/X account, published methodology
framework full treatment, "What Was Learned" Elite weekly digest,
Discord bot / Telegram alerts / email digest, creator surface
(livestream embed, podcast list, House picks vertical schema), Galaxy
Studio v0, Game Intelligence Rooms v0 (read-only).

### Phase 4 — Engagement + tools + community + Model Court conversational

Calibration training, Edge Lab expansion, "GitHub Issues" for the
model, reproducibility receipts, loss leaderboard, "Fade me" badge,
sportsbook affiliate signup integrations, public stats CSV downloads,
pick-along tracking, Model Court conversational layer, Chrome
extension MVP, Galaxy Studio expansion.

### Phase 5 — Platform + adversarial + programmable + B2B widgets/API

Programmable DSL, cross-sport correlation engine UI, Anti-Galaxy
parallel adversary model, adversarial model team v1, live war room,
Researcher Program, education product launch, native mobile app, B2B
widgets + API, trust & compliance toolkit packaging.

### Phase 6+ — Network effects + licensing + federation + local sports

White-label engine licensing, multi-contributor House picks, full
self-service paid API tier, Apple Watch complication, WhatsApp
Business API, embeddable widgets, year-in-review data viz, survival
pool, calibration leaderboard, local + youth sports expansion.

### Phase ordering rules

- Don't start Phase N+1 until Phase N's verification gate is green.
- Within a phase, surfaces can ship in any order, but the homepage
  scope (Phase 1) ships as a single PR.
- Items in the wider brainstorm library can be promoted into any
  future phase as needed.

-----

## Part 6 — Decisions (locked by Claude, autonomous)

The product owner delegated decision-making authority. These are
locked. Codex executes against them without re-asking. They can be
amended only by the product owner or by Claude with explicit reasoning.

### Decisions on prior pending questions

| # | Question | **Decision** | Rationale |
|---|---|---|---|
| 1 | AI language — strip or soft-pedal? | **STRIP ENTIRELY.** Use only the precise carveouts in Part 3. | "We're not AI" is the position. Soft-pedaling betrays it. |
| 2 | Headline tagline | **"We're not AI. We're math you can read."** | Tested across briefs. Contrastive vs every templated competitor. |
| 3 | Edge Index — flip to public? | **YES. Public, every tracked game gets a public score.** | Free credibility hook. PRO retains the factor breakdown detail. |
| 4 | Methodology page detail | **Publish: factors list, conceptual approach, gating philosophy, version changelog. Withhold: weights, constants, exact aggregation formula.** | PFF model. Publish framework, protect implementation. |
| 5 | Adversarial models v1 | **Two models. Internal for 4-6 weeks. Public only after 100+ settled picks of independent track record.** | Lower complexity, real evidence before public exposure. |
| 6 | Academic API | **Phase 4: free CSV. Phase 5: manual Researcher Program. Phase 6+: self-service paid API.** | Incremental, lowest risk. |
| 7 | Creator layer — solo or multi from start? | **SOLO (owner) in Phase 3. Multi-contributor schema in Phase 6+.** | Establish the voice before multiplying creators. |
| 8 | Podcast hosting | **Spotify for Podcasters.** | Zero infrastructure, broadest distribution. |
| 9 | Livestream platform | **YouTube Live primary. Twitch as secondary.** | Lasting search value, no platform lock-in. |
| 10 | Pricing changes | **NO CHANGES.** See it / Bet it / Master it stays. | Tier narrative is working. |
| 11 | Domain and naming | **KEEP "Galaxy Sports Edge."** | Brand was fine. Category was the problem. |
| 12 | Sportsbook affiliate aggressiveness | **One subtle "Place this at [book]" link on the pick detail page only.** | Revenue without becoming I Sell Winners. |

### New decisions from integrating Codex's Innovation OS plan

| # | Item | **Decision** | Rationale |
|---|---|---|---|
| 13 | Sports Intelligence OS framing | **ADOPT as business architecture layer above the consumer position.** | Bigger commercial opportunity without compromising the consumer wedge. |
| 14 | Galaxy Studio | **BUILD. Phase 3, AFTER homepage reposition ships.** | Critical for creator/B2B monetization. |
| 15 | Game Intelligence Rooms | **BUILD. Phase 3 read-only; Phase 4 adds Model Court conversational.** | Natural evolution of pick detail. |
| 16 | Intelligence Graph as typed primitives | **BUILD. Phase 2 foundation work.** | Powers every future OS surface. |
| 17 | B2B Widgets + API as distinct product line | **BUILD. Phase 5.** | After consumer product proves the engine. |
| 18 | Trust + Compliance Toolkit as fifth monetization | **ADOPT. Phases 2-4 own use; Phase 5+ package and license.** | Turns the restraint posture into a sellable product. |
| 19 | Local + Youth Sports expansion | **DEFER to Phase 6+.** | Don't dilute focus now. |
| 20 | AI vendor — OpenAI Agents SDK vs Claude API for Model Court | **CLAUDE API ONLY. Reject OpenAI dependency.** | Already use Claude API. No technical justification for a second LLM vendor. |
| 21 | Codex's file-path ownership protocol | **ADOPT IN FULL.** | Prevents collisions. |
| 22 | First joint mission — Galaxy Studio v0 + Intelligence Graph v0 vs Phase 1 | **OVERRIDE. First joint mission is Phase 1 (homepage reposition).** | Templated chassis is brand damage every day it persists. |
| 23 | Phase 0 (stabilize current branch) | **ADOPT.** | Get to clean committable state before Phase 1 starts. |
| 24 | Branded sub-surfaces (Market Pulse, Slate Weather, Model Court, Galaxy Memory, Loss Room, Evidence Timeline, Evidence Health) | **ADOPT all as named product surfaces.** | Better product naming than functional descriptors. |
| 25 | Default operating mode — owner-in-the-loop or autonomous loop? | **AUTONOMOUS LOOP IS THE DEFAULT.** Owner manages by exception. | Removes the human bottleneck on routine work. |
| 26 | Corporate structure — single brand or parent/product? | **Galaxy Sports Network LLC (Texas) = parent. Galaxy Sports Edge = consumer product.** | Mirrors Meta Platforms / Anthropic pattern. Filed May 22, 2026. |

### Decisions still open (owner-only)

- **Sportsbook affiliate program enrollment** — which programs to sign
  up with. Needs licensing review per program against Texas LLC
  jurisdiction.
- **White-label licensing pricing** — per-license, per-seat,
  revenue-share? Engage IP counsel and accountant.
- **B2B API pricing tiers** — structure and price points? Decide in
  Phase 5 planning.
- **Education product price** — $99 default; finalize in Phase 5.
- **Trademark filings** — file as marks held by Galaxy Sports Network
  LLC.
- **Domain consolidation** — confirm `galaxysportsedge.com` is
  registered to Galaxy Sports Network LLC; register
  `galaxysportsnetwork.com` as the corporate domain.

-----

## Part 7 — Verification Rituals

### Pre-commit (Codex)

Every commit, before push:

```bash
npm run lint
npm run typecheck
npm run build --workspace=apps/web
npm test
```

All four green. If a test had to be modified, the PR description
explains why.

### PR review protocol

- Every PR has a description: what changed, what surfaces it affects,
  what tests cover it, screenshots if visual.
- PRs touching joint territory require `@claude-review` tag and
  explicit Claude approval before merge.
- PRs touching core engine require explicit owner approval.
- PRs touching positioning copy require explicit Claude approval.

### Phase gate reviews

Before declaring a phase "done":

- All surfaces in the phase have shipped to production.
- All technical non-negotiables hold (Part 4).
- All voice and vocabulary rules hold (Part 3).
- Mobile + desktop screenshots of every shipped surface complete the
  report.
- A retrospective: what got cut, what got added, what surprised us.

### Ongoing rituals

- **Weekly Model Journal** ships every Sunday (Phase 3+).
- **Monthly competitor sweep** — Claude reviews 2-3 competitor
  surfaces.
- **Quarterly model version review** — owner + Claude review settled
  pick performance.

-----

## Closing

Decisions are locked (Part 6). The autonomous loop (Part 1.5) is the
operating mode. Phase 0 starts on owner's "go."

To start the loop, the owner says:

> *"Go. Run Phase 0."*

Everything else runs autonomously. The owner reads
`docs/ops/stuck-queue.md` daily and resolves escalations. Otherwise
the loop runs.

*Last revised by Claude. Decisions locked per autonomous authority
granted by the product owner. Operating mode: autonomous loop per
Part 1.5. Amend only by product owner override or by Claude with
explicit reasoning logged in `docs/ops/decision-log.md`.*
