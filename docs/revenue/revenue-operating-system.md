# Galaxy Revenue Operating System — Workstreams L & M (doctrine of record)

> This document is the canonical, committed record of Galaxy's revenue architecture.
> It sits ON TOP of the existing build (Reality Engine / Workstream K, compliance scoring,
> diagnostics, backtesting, No-Bet discipline, inertness + trust guardrails). Nothing in the
> prior plan is removed, weakened, or bypassed by anything here.

## The thesis

Galaxy Sports Network is a **sports intelligence, analytics, education, media, and
decision-support company** — not a sportsbook, not a tout, not a gambling product dressed as
analytics. The operating promise:

> We tell you what deserves action, what deserves caution, what deserves No-Bet, and what we
> are not confident enough to claim yet.

Public positioning: **"Sports intelligence for people who are done being sold certainty."**

The revenue flywheel:
**Content creates attention → Trust converts attention → The Desk monetizes trust →
Community creates retention → Media/sponsors/affiliates/merch monetize the non-subscribers.**

## The three business lines (one brand)

1. **Consumer intelligence** — Founding Desk, Pro, Ask Galaxy custom reviews, paid reports,
   paid newsletter, private community, digital playbooks, seasonal packs. *The core cash engine.*
2. **Media engine** — YouTube, TikTok, Instagram, podcast, newsletter, Shorts/Reels, articles,
   founder notes, live sessions, merch, sponsor slots. *Distribution for the Desk, not random hustle.*
3. **Partner / data products** — sponsor packages, affiliate registry, local-business Game Night
   Packs, creator network, newsletter swaps, B2B content packs, embeddable widgets, licensed
   intelligence (later). *The scaling layer after first proof.*

## Non-negotiables (preserved from every prior conversation)

These bind every revenue surface. They are not optional and they are the moat:

- Positioned as sports intelligence / media / software. **Never a sportsbook; never accepts wagers.**
- **No guaranteed outcomes. No fabricated subscribers, revenue, traffic, CLV, testimonials, wins,
  picks, or performance.** Honest empty/zero states until real data flows.
- **No win-rate / performance claims before the internal evidence supports them** (the calibration
  learning floor; the win-rate pillar is data-blocked, not code-blocked). When evidence is
  incomplete, public copy says so — and that restraint is itself the trust pitch.
- **No sportsbook/casino affiliate revenue as the face of the business.** Compliance-reviewed,
  later, a minority slice, with FTC-style disclosure.
- Preserve responsible-gaming posture, the trust-gate banned-phrase enforcement
  (`scripts/guardrails/trust-gate.mjs` is the single source of truth for prohibited hype/certainty
  language — do not re-list the literal words elsewhere), source gating, proof gating, model-freeze,
  and owner approval. No auto-publish, no auto-spend, no external action without the owner gate.
- **No-Bet is a first-class product value, not a fallback.**
- Internal `/cockpit/reality` diagnostics stay INTERNAL — never exposed raw on public pages.
- The public product feels simple; the internal machinery is ruthless.

## The first sellable product — Galaxy Founding Desk

A paid early-access intelligence ritual: *before you bet, follow a pick, or make a fantasy/sports
decision, read the Desk.*

- **Offer:** $19 for a 14-day Founding Desk beta, or $9/$19 monthly Founding Member (whichever the
  Stripe/product config supports safely; see "Owner activation" below). Founder pricing while active.
- **Includes:** daily/near-daily Galaxy Desk brief · No-Bet Watch · Market Mirage · Signal vs Noise ·
  public narrative vs market pressure · player/team signal watch · submit one game · early dashboard
  access where legally safe · transparent product updates.
- **Does NOT promise:** guaranteed wins, a verified win-rate before calibration supports it,
  personalized gambling advice, sportsbook operations, certainty.

## Revenue lanes & priority order

Do not chase all lanes equally. Build the system so every lane feeds the same center.

| Priority | Lane | Why |
|---|---|---|
| 1 | Founding Desk | Owned revenue; validates the product |
| 2 | Ask Galaxy concierge | Lead capture + customer intelligence wedge |
| 3 | Newsletter (Desk Note free / Premium Brief paid) | Owned audience; bridge from social to subscription |
| 4 | YouTube | Long-form trust engine; conversion first, ad revenue later |
| 5 | TikTok / Instagram | Top-of-funnel hook lab; DM/visual trust → funnel |
| 6 | Podcast (audio version of the Desk) | Authority + sponsor inventory |
| 7 | Digital products (No-Bet Journal $9, Market Mirage Playbook $19, etc.) | Fast low-cost cash; needs clear pain not big audience |
| 8 | Sponsorships (safe categories; $50–$1,500 tiers) | Early non-platform revenue; sell niche trust not fake reach |
| 9 | Merch (print-on-demand; phrase-test first) | Identity layer, not first cash |
| 10 | Affiliates (compliance-first registry; sportsbook later) | Useful but disclosure-sensitive |
| 11 | Community (Desk Room / Signal Room) | Retention; responsible-language moderated |
| 12 | B2B Game Night Packs ($99/mo for bars, leagues, creators) | Higher-ticket; content businesses need |
| 13 | White-label / data widgets | Later, after consumer proof |

## The operating flywheel — one brief, many surfaces

One Galaxy Desk brief becomes: member brief · free newsletter · article · YouTube script · 3 Shorts ·
3 TikToks · 3 Reels · podcast episode · IG carousel · X thread · sponsor slot · Ask Galaxy CTA ·
Founding Desk CTA · merch phrase test · objection prompt · product insight.

**Create once. Convert everywhere. Measure everything.** That is `/cockpit/content-factory`.

Core recurring formats: **Market Mirage** (public belief vs market pricing) · **No-Bet Watch** (the
game everyone wants action on, and why we may refuse) · **Signal vs Noise** · **Public Narrative vs
Market Pressure** · **Confidence Autopsy** · **The Desk Note** · **Reality Room** (weekly: what was
signal, what was noise, what we got wrong, what we refuse to claim yet).

## Workstream L — Founding Desk Revenue Loop

Public, conversion-first, trust-first routes (must NOT expose raw `/cockpit/reality` diagnostics or
unsupported model claims):

- `/founding-desk` — the paid offer (reuses the Stripe checkout path; honest inert CTA when the
  Founding Desk price ID is not yet configured — never a fake "subscribed" state).
- `/sample-desk` — shows exactly what a member receives (a representative Desk brief).
- `/ask-galaxy` — the concierge wedge: submit ONE game; we classify it **action signal / caution
  signal / no-bet signal / insufficient data** (honest manual/safe classification; never automated
  betting advice).
- `/trust-room` — how confidence works, what No-Bet means, responsible posture, limitations, and the
  non-sportsbook identity. Turns the win-rate restraint into the trust pitch.
- `/no-bet` — No-Bet as a product philosophy.
- `/newsletter` — Galaxy Desk Note signup (owned audience).
- `/cockpit/customer-proof` — internal: the funnel + objections + the 14-day proof report.

**Customer-proof events** (added to `apps/web/lib/analytics/events.ts`, the typed no-op `track()`):
`founding_desk_view`, `sample_desk_view`, `trust_room_view`, `no_bet_page_view`,
`ask_galaxy_started`, `ask_galaxy_submitted`, `email_signup_started`, `email_signup_completed`,
`checkout_started`, `checkout_completed`, `feedback_submitted`, `objection_logged`,
`testimonial_added`, `referral_shared`, `pricing_interest_clicked`.

**Reports:** `reports/customer-proof/objection-ledger.md`, `reports/customer-proof/14-day-market-proof.md`.

## Workstream M — Revenue Operating System (the revenue nervous system)

Internal cockpit surfaces + public partner pages. Honest empty/zero states until real data flows;
never fabricated metrics.

- `/cockpit/revenue` — every lane: status, owner, next action, expected value, risk, proof. MRR,
  paid subs, ARR run-rate, conversion, refund/cancel reasons.
- `/cockpit/channels` — YouTube / TikTok / IG / podcast / newsletter / site / direct outreach.
- `/cockpit/sponsors` — pipeline: lead → contacted → interested → proposal → active / declined.
- `/cockpit/affiliate-registry` — partner · category · commission · geo/state · disclosure language ·
  risk rating · approved placement · owner approval (compliance-first).
- `/cockpit/content-factory` — one Desk brief → all derivative formats + CTAs.
- `/cockpit/creator-network` — recruit/track micro-creators by lane with referral codes + guardrails.
- Public: `/media-kit`, `/partners`, `/creator-network`, `/affiliate-disclosure`, `/podcast`, `/shop`.

## Agent operating model (maps to the existing agent registry)

JARVIS (governance / legal / owner approval / capital) · SCOUT (sports intelligence, Ask Galaxy
classification) · TAL (data reliability, event capture, customer-proof data) · SARAH (customer
clarity, conversion copy, objections) · AVA (draft-only content) · BOBBY (revenue, pricing,
conversion, sponsor pipeline) · GAUGE (QA, trust-gate, unsupported claims, link/nav integrity) ·
QUILL (brand voice, anti-tout tone) · LEDGER/AUDIT (proof/outcome separation, funding evidence) ·
MINT (runway, spend, loan packet, forecast) · FLARE (distribution/growth/outreach) · PULSE
(community) · VECTOR (planning/roadmap). Every agent feeds the cockpit; none makes public moves
without the owner gate.

## Brand voice

Calm, sharp, restrained, intelligent, anti-hype, human, transparent. Lines: "Confidence is not
certainty." · "No-Bet is a position." · "The market is not a scoreboard; it is a pressure system." ·
"Picks are cheap; decision quality compounds." · "We track the process before we claim the outcome." ·
"Built for people who are done being sold certainty."

## Build slices (small, verified commits)

- **L0** — doctrine (this file) + report templates. ← committed.
- **L1** — public Founding Desk routes (`/founding-desk`, `/sample-desk`, `/trust-room`, `/no-bet`)
  + nav/footer/sitemap wiring + the new analytics events.
- **L2** — Ask Galaxy intake + Newsletter capture: form components, never-throw API routes, the
  `AskGalaxySubmission` + `NewsletterSubscriber` Prisma models, event wiring.
- **L3** — `/cockpit/customer-proof` surface (funnel + objection ledger + 14-day proof report loader).
- **M0** — revenue doctrine pointers + cockpit "Monetization" nav section.
- **M1** — `/cockpit/revenue` (honest zero-state revenue nervous system).
- **M2** — `/cockpit/sponsors`, `/cockpit/affiliate-registry`, `/media-kit`, `/partners`,
  `/affiliate-disclosure`.
- **M3** — `/cockpit/content-factory` + `/cockpit/channels`.
- **M4** — `/cockpit/creator-network` + `/creator-network` + `/podcast` + `/shop` scaffolds.
- **Final** — the 14-day market-proof report generator + the owner Go-Live checklist surface.

## Quality gate for every slice

typecheck · relevant tests · trust-gate · model-freeze · nav coverage when routes are added ·
full production build · no unsupported claims · no fabricated metrics · no sportsbook positioning ·
no raw internal diagnostics exposed publicly · no auto-publish · additive-only schema (ADR when
non-trivial).

## Owner activation (the irreducible few — everything else is code's job)

These require the owner's own credentials/accounts and cannot be done in-repo. Each public surface
degrades to an honest inert state until its switch is flipped, so the site is fully shippable now:

1. **Stripe Founding Desk price ID** — create the $19 (beta) / $9–$19 (monthly) product in Stripe,
   set `STRIPE_FOUNDING_DESK_*_PRICE_ID`. Until then `/founding-desk` shows an honest "opening soon"
   CTA (the checkout route already returns a clean 503, never a fake success).
2. **THE_ODDS_API_KEY + OUTCOME_LEARNING_ENABLED** — attach the key and flip the data-collection
   flag so settled picks accrue toward the calibration floor (data collection only; does not change
   scoring or publish anything).
3. **Email/analytics provider** — wire the chosen provider at the single dispatch point in
   `lib/analytics/events.ts` (the event taxonomy is already in place).
4. **Deploy env** — DATABASE_URL, NEXTAUTH_SECRET, ANTHROPIC_API_KEY, etc. (standard deploy config).

The Go-Live checklist surface renders these as live green/red checks so the finish line is concrete.
