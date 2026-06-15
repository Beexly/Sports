# Competitive Landscape — Sports Betting Intelligence (2026)

> Teardown of the surfaces we compete with: how they work, why they fail, what we
> leverage, what we avoid, what we're missing, and what to improve. Grounded in
> live research (sources at the end) and our real codebase capabilities. Nothing
> here changes product behavior — it's the strategy map. Aligns with the anti-tout
> doctrine on `/vs/tout-services` and the named pricing ladder.

## TL;DR — the one insight that matters

**Closing Line Value (CLV) is the only sharp-accepted benchmark of skill, and
almost nobody in our competitive set publishes it.** Tout services sell win-rate.
AI sites claim accuracy with no verification. +EV tools chase an edge that gets
users banned. We already *compute* CLV, de-vig, calibration (Brier/ECE), and an
agreement-gated edge engine in `packages/prediction-engine` — we just don't
surface them yet. **Our biggest moat is latent, not missing.** The category is
crowded with tools and picks; it is nearly empty on *provable honesty*. That is
exactly the lane our doctrine already points at.

---

## The four competitor segments

### 1. Pick / tout services (Action Network experts, WagerTalk, Docsports, Instagram cappers)
**How they work:** sell or syndicate daily picks, often with confident win-rate
marketing. Action Network is the legitimate end — free expert picks plus a strong
data/tracking app; the Instagram-capper end is the predatory one.

**Why they fail (for the bettor):** the business model is misaligned — a tout is
paid when you *buy* the pick, not when it *wins*. Documented tactics across the
category: cherry-picked or fabricated records, the split-pick scam (Team A to half
the list, Team B to the other half), and an always-on "premium pick" even on slates
that don't earn one. Long-run win rates above ~55–57% at -110 are vanishingly rare;
anything advertised at 65%+ over a real sample is almost always manipulated or
small-sample. **The real tell is CLV, which they never show.**

**Our contrast:** `/vs/tout-services` already names the four tells. We count every
loss (the Vault), gate the public win-rate until it's defensible, and attach a
factor trail to every signal.

### 2. Sharp / +EV tools (OddsJam, Outlier.bet, Unabated)
**How they work:** aggregate odds from 100–150+ books in real time, de-vig to a
"fair" line, and surface +EV bets, arbitrage, middles, and line-shopping. Outlier
adds AI player-prop models and the juice-free "Unabated Line." Terminology is sharp:
devig, Kelly, EV, arbitrage. Pricing spans ~$20/mo entry to **$200–400/mo** for the
real +EV/arb feeds.

**Why they fail (for most users):** the strategy they sell is self-limiting. Books
treat consistent +EV bettors as a liability, not a customer — the reward for winning
is **reduced limits or account bans**. Arbitrage isn't risk-free (a book can void one
leg). Margins are tightening so hard that industry voices now argue "+EV is dead in
2025." And the tools are *overwhelming* — a wall of devig/Kelly/arb that casual
bettors can't action. They're built for high-volume pros ($1,000+/week) for whom the
$200–400/mo makes sense; everyone else churns.

**Our contrast:** we have the same math (`removeVig`, `computeMoneylineClv`,
`assessEdge`) but we are an *intelligence/transparency* product, not a bet-execution
terminal. We don't push users into the arb/limit treadmill, and "intelligence speaks
through clean data" beats a cluttered sharp cockpit.

### 3. AI prediction sites (BetIdeas, Zcode, Sportsprediction.ai, Leans.ai, SportBot)
**How they work:** run ML over form/injuries/lines/weather and publish picks or
probabilities. Marketed on accuracy claims of 60–85%.

**Why they fail:** the category's own reviewers say it plainly — **most publish
picks with no methodology, no accuracy tracking, and no calibration**, so a "90%
accuracy" claim is indistinguishable from marketing fiction (often measured on the
trivial subset of obvious favorites). No CLV, no reliability curve, no audit.

**Our contrast:** this is the cleanest contrast we have. We publish a real
calibration baseline (market closing line: **Brier 0.2111, ECE 0.0180 over 5,281
games**) and we refuse to publish our own model's number until settled picks exist.
The thing they fake is the thing we gate.

### 4. Bet trackers (Pikkit, Action Network BetSync)
**How they work:** auto-sync a user's real bets from 30+ books (Pikkit's BookSync,
Action's BetSync), so personal P/L and community leaderboards are *verified* (no
manual entry = no faked records). Pikkit's whole pitch is verified action.

**Why they're strong, not failing:** this is the segment doing honesty *right*, just
from the other direction — they verify the *user's* bets; we verify *our* signals.
Their gap: a verified P/L leaderboard still measures luck unless it's graded against
CLV, which they largely don't do.

**Our contrast / overlap:** we don't let users track their own bets at all. That's a
real engagement gap (see Missing).

---

## Where Galaxy already sits (latent advantages, codebase-grounded)

| Capability | Status in repo | Competitor reality |
|---|---|---|
| De-vig / fair line | `removeVig`, `americanToImpliedProbability` | Core of every sharp tool |
| Closing Line Value | `computeSpreadClv/Total/Moneyline`, `gradePickClv`, `deriveClosingSnapshotFromOdds` | The benchmark nobody publishes |
| Calibration (Brier/ECE/reliability) | real market baseline computed; pick-model gated | AI sites fake it; touts ignore it |
| Edge engine | `assessEdge` — independent estimators must diverge from book **and** agree (founder-gated) | A *more* disciplined +EV than the feeds |
| Factor trail | every published signal | Touts sell a "vibe," not a breakdown |
| Loss-complete ledger | the Vault | Touts scrub losses |
| Multi-book odds | The Odds API ingestion | We have the data for line context |

**Read:** we are sitting on the sharp toolkit *and* the honesty narrative. The work
is surfacing, not inventing.

---

## Leverage · Avoid · Missing · Improve

### Leverage (play to our structural edge)
- **Make CLV the headline.** It's the one metric that's both sharp-credible and
  almost-never-published. A gated public CLV report (same discipline as the
  Calibration Report) would own a narrative no competitor can copy without admitting
  their own.
- **The factor trail as the anti-vibe.** Keep leaning on "every pick shows its work."
- **Best-price context from data we already pull.** We ingest multiple books — show
  "best line / book" per signal as *transparency*, without becoming an arb tool.
- **Honest-education content moat.** Expand the `/vs/tout-services` + glossary base
  into plain-language CLV/calibration/devig explainers. This is SEO + trust + the
  on-ramp to the AUTHORITY tier.

### Avoid (their traps — especially given our positioning)
- **The always-on daily premium pick.** Discipline to say nothing on a thin slate is
  the differentiator; selling a daily lock is tout move #3.
- **Pushing +EV/arbitrage as a user strategy.** It gets users limited/banned, isn't
  risk-free, and the edge is dying. We can *show* edge; we don't sell the treadmill.
- **Unverifiable accuracy/win-rate claims.** The AI-site trap. Our gating is the
  antidote — never regress it for marketing.
- **Sharp-terminal clutter.** OddsJam/Outlier overwhelm. Our promise is intelligence
  through *clean* data — resist feature-bloat that buries the signal.

### Missing (real gaps vs the field)
1. **A public CLV track record surface.** We compute CLV; we don't show it. Highest-
   leverage gap — gate it exactly like calibration until settled picks exist.
2. **Line-shopping / best-book context per pick.** We have the multi-book data; we
   don't surface where the price is best.
3. **User-side tracking / "did you beat the close?"** Pikkit/Action own personal
   tracking + leaderboards. A *differentiated* version — grading the user's entries
   against CLV, not just P/L — would be uniquely on-brand. (Heavier; ToS/security
   review needed for any book-sync.)
4. **A disciplined edge feed.** `assessEdge` exists but is founder-gated/unwired —
   our honest answer to the +EV feed, if/when calibrated.

### Improve (concrete, on-doctrine moves)
1. **Build the CLV report surface** (read-only, gated) — turns a latent engine into
   the category's most defensible public claim.
2. **Add best-line/book context** to pick cards from existing odds ingestion.
3. **Grow the education content engine** (CLV, calibration, "how to spot a tout") —
   compounding SEO + authority, cheap to produce, fully on-brand.
4. **Scope user-tracking** as a later differentiator framed around CLV, not raw P/L.

## Priority order (highest leverage first)
1. CLV report surface (gated) — *the* move; nobody else can match it honestly.
2. Best-line/book context per pick — small lift, real value, uses data we have.
3. Honest-education content moat — compounding, cheap, on-doctrine.
4. User CLV-tracking — bigger bet, revisit after the above land.

> Every recommendation above is consistent with the non-negotiables: no fabricated
> stats, no fake win-rates, server-side gating, gate-until-defensible. We don't beat
> this field by out-touting the touts or out-tooling the terminals — we beat it by
> being the only one whose numbers can survive being shown.

## Sources
- Action Network features — [actionnetwork.com/app](https://www.actionnetwork.com/app), [BetSmart review](https://www.betsmart.co/tool-reviews/action-network-pro)
- OddsJam +EV/pricing — [RotoWire review](https://www.rotowire.com/betting/oddsjam-review), [OddsJam +EV tool](https://oddsjam.com/betting-tools/positive-ev)
- Outlier.bet features/pricing — [BettingNews review](https://www.bettingnews.com/tools/outlier-bet-review/), [Outlier +EV guide](https://outlier.bet/sports-betting-strategy/positive-ev-betting/what-is-positive-ev-betting/)
- Pikkit verified tracking — [Pikkit BookSync](https://pikkit.com/booksync), [PinnacleOddsDropper review](https://www.pinnacleoddsdropper.com/blog/pikkit-pro-review)
- AI prediction site criticism — [sports-ai.dev comparison](https://www.sports-ai.dev/blog/best-ai-sports-betting-tools-platforms-2026-comparison), [ReadWrite](https://readwrite.com/gambling/betting/ai-betting-prediction/)
- Tout tactics / red flags — [BBB scam alert](https://www.bbb.org/article/scams/26768-bbb-scam-alert-sports-handicapper-promising-you-guaranteed-wins-dont-bet-on-it), [Nolan Dalla](https://www.nolandalla.com/10-sure-fire-ways-to-tell-your-sports-handicapping-service-is-a-scam/)
- +EV limiting/bans reality — [8rain Station](https://8rainstation.com/2025/06/18/positive-ev-sports-betting-fading-2025-strategies/), [OddsShopper](https://www.oddsshopper.com/articles/betting-101/why-sportsbooks-limits-ev-bettors-and-what-to-do-about-it-y10)
- CLV as the real benchmark — [Caan Berry](https://caanberry.com/closing-line-value/), [OddsPlays CLV tools](https://oddsplays.com/us/betting-tools/closing-line-value/)
