# GSE 2026 — Competitor Deep Dive (40+)

Web-grounded competitive intelligence, June 2026. Structured, scorable form lives in
`apps/web/lib/gse/competitor-intelligence.ts` (`COMPETITORS`, `FEATURE_GAPS`, `scoreFeatureGap`,
`prioritizeGaps`). All dollar figures are **(verify)** — pricing changes constantly and several pages
were JS/login-gated at research time; the structured contract intentionally stores monetization
*model*, not prices.

## The one-line thesis

Across DFS optimizers, betting-analytics tools, fantasy platforms, pick/model sites, and data
providers, **almost no one ships an auditable, calibrated, per-pick track record.** DRatings is the
lone exception (publishes log-loss vs the market) and it has weak UX/distribution. That is GSE's white
space — the Trust Ledger + calibration the product already builds toward. Everyone markets accuracy;
nobody exposes a live calibration trail tied to each recommendation.

---

## Segment A — Betting analytics / odds tools

| Tool | Standout mechanic (copyable) | Monetization | Key weakness (attack surface) | Threat |
|---|---|---|---|---|
| **OddsJam** | Real-time +EV + arbitrage across 100+ books | Subscription | No calibration ledger; premium price | High |
| **Outlier.bet** | Tiered EV gating (badge → filterable feed → arb+stake calc); devig vs Pinnacle | Sub + freemium | **No bet tracking and no CLV at all** | High |
| **Sharp App** | Proptimizer — prop-level devig vs consensus | Subscription | No surfaced CLV/calibration; expensive | Medium |
| **Betstamp** | **Dual-CLV** (vs your book's close AND market best) on immutable timestamped bets; B2B "True Line" API | Freemium + data licensing + affiliate | Price-discovery focus, not calibrated outcome prediction | Medium |
| **Action Network** | Letter-graded edges + **bet-sync auto-tracking** + Sharp Report; high-end LABS tier | Sub + affiliate | No per-pick calibration; affiliate conflict | High |
| **BetQL** | 1–5 **star** model edges (10k sims) + sharp-vs-public overlay; per-sport access ladder | Subscription | Black-box model, no calibration transparency | Medium |
| **Props.cash** | Contextual **hit-rate charts** + last-N filters; line-shading alerts | Subscription | No devig/EV/CLV; odds not real-time | Medium |
| **Unabated** | Sharp fair-value lines + prop simulators for "investors" | Subscription | Narrow sharp audience; steep learning curve | Medium |
| **Pinnacle** (reference) | Low-margin "Winners Welcome" market-maker → the fair-odds benchmark | Margin/hold | A book, not analytics; no US access — an **input**, not a rival | Low |

**Copy verdicts:** prop-level devig (Sharp/Outlier) → extend our Shin de-vig to props; dual-CLV
(Betstamp) → close our devig→bet-log→CLV→calibration loop; bet-sync (Action) → reduce tracking
friction. Pinnacle is a **data source to ingest**, not a competitor.

---

## Segment B — DFS optimizers / projections / draft tools

| Tool | Standout mechanic | Monetization | Weakness | Threat |
|---|---|---|---|---|
| **FantasyLabs** | **Player Models** (user-weightable factor sliders) + SimLabs + historical **Trends** query-builder | Subscription | Built to win contests, not surface one calibrated verdict | High |
| **SaberSim** | Play-by-play **sim engine** + **Contest Sims** on the real payout curve; **Dupes** leverage metric | Subscription ($97–297/mo verify) | Expensive, DFS-lineup-only, steep curve | Med-High |
| **Stokastic** (= Awesemo) | SimSheets + **Boom/Bust probability** + ownership; pick'em optimizers | Subscription (per-sport, verify) | Confusing per-sport/promo pricing; DFS-only | Medium |
| **Draft Sharks** | **Injury Predictor** (games-missed at an 80% CI + 1–5 Durability Score) + **3D Value** live War Room | Subscription (~$72–192/yr verify) | NFL-fantasy only; seasonal; no public calibration | Med-High |
| **RotoWire** | News-reactive projections + **Smart Money** cross-book prop value + DFS results tracker | Subscription (à-la-carte, verify) | Fragmented pricing; dated UX | Med-High |
| **FantasyPros** | **Expert Consensus Rankings** (rank-points, accuracy-weighted from Wk3) + cross-platform **Live Draft Sync** + "Coach" AI | Freemium + sub | Consensus-of-experts, not a calibrated probabilistic engine | High |
| **Establish The Run** | Stat-level, change-logged projections (consumed even by rival optimizers) + GPP game scores | Subscription (seasonal) | No native optimizer; NFL-centric; key-person risk | Medium |
| **4for4** | **LeagueSync** (tools adapt to your league) + Draft Hero live sync | Subscription (seasonal) | Football-centric; confusing season billing | Low-Med |
| **DFS Army** | Domination Station optimizer + **coaching/community** moat + Proptemizer | Subscription | Tooling less deep than FantasyLabs; key-person risk | Medium |
| **numberFire** (→ FanDuel Research) | **nERD** single explainable rating (expected margin vs average) | Free (sportsbook funnel) | Brand erased; conflicted (drives FD conversion) | Medium |

**Copy verdicts:** no-code **model builder + backtest** (FantasyLabs Player Models, Rithmm) → high
value, GAP; **injury miss-time probability with a CI** (Draft Sharks) → GAP; **cross-platform sync
overlay** (FantasyPros/4for4) → GAP; **single explainable rating** (nERD) → make our confidence one
legible, shareable number tied to calibration; **Dupes/Contest Sims** (SaberSim) → DFS leverage.

---

## Segment C — Pick / model / prediction sites

| Tool | Standout mechanic | Monetization | Weakness | Threat |
|---|---|---|---|---|
| **Dimers** | Model probability **vs market price** + **Dimebot** AI assistant; daily best bets | Freemium (~$29.99/mo verify) | Calibration/record not foregrounded; single flat tier | High |
| **DRatings** | **Transparent Bradley-Terry methodology + published log-loss vs market**; anti-tout | Ads/freemium | Spartan UX, weak distribution of its trust edge | Medium |
| **TeamRankings** | Published methodology + **NFL Survivor / pool optimizers** (defensible niche) | Subscription | Dated UX; ROI transparency not front-and-center | Medium |
| **Covers** | **Line-aware consensus** (picks at each line value) from contest volume | Affiliate/ads | Contest picks ≠ real handle; no per-pick records | Medium |
| **BettingPros** | Expert-consensus ranked **by tracked expert accuracy** + EV/cover-prob | Freemium + sub | Aggregation, not first-principles calibration | Medium |
| **Pickswise** | Free picks funnel + star confidence; strong SEO/app | Affiliate | No visible records; affiliate-first conflict | Medium |
| **Sports Insights** | **% of bets vs % of money** (handle) split + steam alerts | Subscription | Niche/dated; offshore-book data representativeness | Low |

**Copy verdicts:** **DRatings is the template** — its log-loss-vs-market accountability is exactly the
GSE ethos, executed without UX/distribution; out-execute it. Line-aware consensus (Covers) and
bets-vs-money (Sports Insights) → sharp-vs-public overlay (teach the nuance, never "fade the public").

---

## Segment D — Fantasy / pick'em platforms (the action layer)

| Platform | Standout mechanic | Monetization | Weakness | Threat |
|---|---|---|---|---|
| **Sleeper** | All-in-one league + pick'em + **prediction-market** same-login funnel | Entry fees + market take | No decision-intelligence/calibration layer | Medium |
| **PrizePicks** | **Demons/Goblins** difficulty slider; P2P "Arena" + Kalshi/Polymarket | Entry fees + market | Sets its own lines, no published methodology | Medium |
| **Underdog** | Pick'em + Best Ball + **FCM event contracts**; Ladders/Streaks | Entry fees + market | Sells risk, not edge; no transparency | Medium |
| **Yahoo Fantasy+** | Research Assistant + **Assistant GM** auto-optimizer + Trade Hub partner matching | Freemium | Conveniences on a league host, not a calibrated engine | Medium |
| **ESPN Fantasy** | Massive free reach + live-media (FantasyCast) | Ads | Thin proprietary decision engine | Low |

**Trend to track:** the action layer is migrating to **P2P + CFTC/FCM prediction markets** to dodge
DFS state bans. These platforms set lines opaquely and sell *risk*; users still need an edge tool to
beat them — that is GSE's audience, not GSE's competitor. Prediction-market implied probabilities
(Kalshi/Polymarket) are a **market-read input** to blend in (rights-checked).

---

## Segment E — Data / stats providers (source AND/OR competitor)

| Provider | Standout mechanic | Role for GSE | Note |
|---|---|---|---|
| **PFF** | Per-play 0–100 grades (expectation baseline + context adjustment); WAR | Source **and** competitor | Grades are subjective opinion → beat on **auditability** |
| **Sports Info Solutions** | **Total Points** (credit-allocation from an EPA baseline); independent charting | Primarily a **source** | Resilient (not feed-dependent); narrow sports |
| **Stathead / Sports Reference** | **Finder query-builder** (Season/Game/Streak/Span) — the query-UX gold standard | Source + UX benchmark | Lost FBref's advanced soccer feed (Jan 2026) |
| **Opta / Stats Perform** | Granular licensing by competition/country/data level; canonical soccer feed | **Source** (+ supplier risk) | Cut FBref's feed — supplier power is real |
| **Sportradar / Genius Sports** | Official rights incl. NFL Next Gen Stats + official betting feed | **Source / gatekeeper** | Expensive, exclusive; the path to official NFL data |
| **FBref / Understat** | Free historical soccer / xG | **Rights-gated source** | Understat has **no commercial license** — clear before any use |

**Strategic lesson (cite-worthy):** FBref's Jan-2026 Opta cutoff proves single-feed dependency is
existential. Diversify sources and snapshot rights at extraction (already GSE doctrine).

---

## Segment F — AI assistants (fastest-moving cohort)

RotoBot AI, Dimebot (Dimers), Rithmm, WalterPicks, Ball Knowledge, Sportsmind, NFL Pro Fantasy AI.
Conversational, sync-aware, multi-signal — the **most direct analog to Jarvis**. Common blind spot:
none surfaces a published **calibration / confidence-accuracy ledger**; they output answers without an
audit trail. **Rithmm's no-code Model Builder + backtest** is the standout copyable mechanic.

---

## Monetization patterns (what actually funds these products)

| Model | Who | Fit for GSE | Trust note |
|---|---|---|---|
| Subscription good/better/best | FantasyPros, Action, BetQL, Draft Sharks | **Core** — matches the proof-gated ladder (Free / Pro $14.99 / Elite $24.99) | Honest tiering only |
| Freemium funnel | Dimers, BettingPros, Yahoo+ | **Yes** — free proves trust, paid unlocks depth | Free must be genuinely useful |
| Affiliate (sportsbook CPA) | Pickswise, Covers, Betstamp | **Cautiously** — CPA-only, disclosed, geo-gated, walled off from picks | Rev-share = incentive conflict → avoid |
| Entry fees / prediction market | PrizePicks, Underdog, Sleeper | **No** — GSE sells edge, not risk | Out of scope by policy |
| Data/API licensing (B2B) | Betstamp, SIS, Opta, Sportradar | **Later** — license our calibration/True-Line once proven | Needs the proof first |
| Pool/survivor seasonal | TeamRankings | **Candidate** — sticky, low competition | — |

---

## The ranked "copy-now" board (mirrors `FEATURE_GAPS` / `prioritizeGaps()`)

1. **Make calibration receipts the headline** (HAVE) — the white space the whole field leaves open.
2. **Close devig → bet-log → CLV → calibration loop** (PARTIAL) — Outlier lacks tracking; Betstamp lacks outcome calibration; own both.
3. **Prop-level devig vs consensus** (PARTIAL) — extend Shin de-vig to props.
4. **No-code model builder + backtest** (GAP) — show calibration of the user's model, not a win count.
5. **Cross-platform league/draft sync overlay** (GAP) — advice on top of the user's real Yahoo/ESPN/Sleeper league.
6. **Stathead-style query builder** (GAP) — composable filter stacks over our entity graph.
7. **Injury miss-time probability with a CI** (GAP) — feed projection variance + falsifiers.
8. **Contextual hit-rate charts + last-N** (PARTIAL) — with small-sample confidence bands (no implied certainty).
9. **Sharp-vs-public divergence overlay** (PARTIAL) — teach the nuance.
10. **Survivor/pool optimizer** (GAP) — sticky seasonal product.

(Trust-eroding mechanics — fake confidence UX, fake urgency — are hard-gated to the bottom by
`scoreFeatureGap`.)

## GSE's clearest differentiation vs this entire field

Show the **evidence and the counter-case**, **freeze the claim before the result** (Trust Ledger),
and **publish calibration** once the sample is honest. Competitors sell confidence, tools, or
contest-volume; GSE sells **decision quality with a receipt**. That compounds with memory and is hard
to fake because it requires being honest when wrong.

---

## Sources

Aggregated from web research (June 2026) across competitor sites, help centers, and independent
reviews. Per-competitor source URLs are recorded in the research-agent transcripts; representative
domains: oddsjam.com, outlier.bet/help.outlier.bet, sharp.app, betstamp.com, actionnetwork.com,
betql.co, props.cash, unabated.com, pinnacle.com, stokastic.com, sabersim.com, fantasylabs.com,
draftsharks.com, rotowire.com, fantasypros.com, establishtherun.com, 4for4.com, dfsarmy.com,
dimers.com, dratings.com, teamrankings.com, covers.com, bettingpros.com, pickswise.com,
sportsinsights.com, sleeper.com, prizepicks.com, underdogsports.com, yahoo.com/plus/fantasy,
fantasy.espn.com, pff.com, sportsinfosolutions.com, stathead.com, statsperform.com, sportradar.com,
geniussports.com, understat.com, fbref.com, rotobot.ai, rithmm.com — plus reviews (oddsplays.com,
betsmart.co, sportbotai.com, picksandparlays.net, windailysports.com) and encyclopedic corroboration
(Wikipedia). **All pricing is research-time and must be re-verified before any business use.**
