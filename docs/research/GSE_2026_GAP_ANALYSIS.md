# GSE Competitive Gap Analysis Matrix

**Date**: 2026-06-22
**Scope**: All GSE systems vs. competitor baseline
**Purpose**: Build prioritization, not marketing
**Legend — Priority**: P0 = blocking revenue | P1 = high leverage | P2 = differentiator | P3 = nice-to-have
**Legend — Revenue Impact**: H = high | M = medium | L = low
**Legend — Trust Impact**: H = trust-critical | M = moderate | L = low
**Legend — GSE Current**: DONE | PARTIAL | SCAFFOLDED | GATE | NOT BUILT

---

## DRAFT TOOLS

| Feature/System | Competitor Baseline | GSE Current | GSE Gap | Priority | Revenue Impact | Trust Impact | Build Phase |
|---|---|---|---|---|---|---|---|
| Basic draft rankings/tiers | Every major tool (FantasyPros, 4for4, Footballguys, PFF) | PARTIAL (draft.ts has scaffold) | Need tier definitions, position tiers, scoring-adjusted tiers | P0 | H | M | Phase 5 |
| Custom scoring support | Footballguys, FantasyPros (partial) | PARTIAL (league-twin.ts exists) | Must wire scoring into VOR computation | P0 | H | M | Phase 1+5 |
| ADP integration | FantasyPros, Underdog, NFFC consensus | NOT BUILT | Need ADP record model + normalization layer; gate until licensed source | P0 | H | H | Phase 1 |
| Tier break alerts | DraftKick, 4for4 Draft Hero | NOT BUILT | Tier cliff detection in draft room state engine | P1 | H | M | Phase 5 |
| Position run alerts | DraftKick | NOT BUILT | Position run detection in draft room state engine | P1 | H | M | Phase 5 |
| Projected availability | FantasyPros ECR, 4for4 | NOT BUILT | Draft Futures Engine (Phase 6) | P1 | H | M | Phase 6 |
| Mock draft simulator | FantasyPros, ESPN, Sleeper | NOT BUILT | Mock Draft Engine — core feature before draft season | P0 | H | L | Phase 5 |
| Live draft sync | Yahoo/ESPN/Sleeper (native) | GATE (platform ToS review) | Requires founder approval on ToS; do not build yet | GATE | H | L | Gated |
| Draft room auto-track | FantasyPros (paid), DraftKick | GATE | Same gate as live sync | GATE | M | L | Gated |
| Auction support | Sleeper, NFFC, FantasyPros | NOT BUILT | Auction parser + auction state engine needed | P1 | M | M | Phase 2+5 |
| Keeper/dynasty support | Sleeper, Underdog, MFL | PARTIAL (schema flag needed) | Add isKeeper/isDynasty to schema; adjust VOR baseline | P2 | M | L | Phase 1 |
| Superflex/IDP support | MFL, Sleeper, FantasyPros | PARTIAL (schema flag) | Add isSuperFlex/isIDP to schema; adjust position scoring | P2 | M | L | Phase 1 |
| Draft grade/analyzer | 4for4 Draft Hero, PFF, FantasyPros | NOT BUILT | Draft Autopsy engine (Phase 11) | P1 | M | H | Phase 11 |
| Draft history storage | FantasyPros (limited), DraftKick | NOT BUILT | Core of League Memory system (Phase 2) | P0 | H | M | Phase 2 |
| Multi-year league memory | NO COMPETITOR | NOT BUILT | First-of-kind — multi-season trend, regret, improvement arc | P1 | H | H | Phases 1-4 |
| Manager Genome | NO COMPETITOR | NOT BUILT | **First-of-kind** — behavioral profile from draft history | P1 | H | H | Phase 3 |
| Draft Futures Engine | NO COMPETITOR (partial: projected availability only) | NOT BUILT | **First-of-kind** — probabilistic board tree 2-3 picks deep | P1 | H | H | Phase 6 |
| Opponent Room Model | NO COMPETITOR | NOT BUILT | **First-of-kind** — per-opponent pick probability model | P1 | H | H | Phase 7 |
| Pick Thesis/Counter-Thesis | NO COMPETITOR (FantasyLabs shows reasoning fragments) | NOT BUILT | **First-of-kind** — structured thesis + counter + uncertainty | P1 | H | H | Phase 8 |
| Voice Jarvis Co-Pilot | NO COMPETITOR (chatbot experiments exist, no live draft integration) | GATE (Jarvis cockpit exists, voice layer needed) | **First-of-kind** — voice-native draft co-pilot; Elite tier feature | P2 | H | H | Phase 10 |

---

## SEASON-LONG TOOLS

| Feature/System | Competitor Baseline | GSE Current | GSE Gap | Priority | Revenue Impact | Trust Impact | Build Phase |
|---|---|---|---|---|---|---|---|
| Start/sit assistant | ESPN, Yahoo, FantasyPros, Sleeper | PARTIAL (lineup.ts exists) | Wire to real scoring data (gated); enhance recommendation logic | P0 | H | M | Season Continuity |
| Waiver rankings | FantasyPros, Sleeper, Underdog | PARTIAL (waivers.ts exists) | Enhance with context-aware recommendations; wire to draft history | P1 | H | M | Season Continuity |
| FAAB bid advisor | Footballguys, 4for4 | PARTIAL (waivers.ts partially) | FAAB budget context, game theory model (others bid what?) | P1 | M | M | Season Continuity |
| Trade calculator/analyzer | FantasyPros, ESPN, Sleeper | PARTIAL (trade.ts exists) | Enhance with positional scarcity context, genome-informed framing | P1 | H | M | Phase 12 |
| Roster analyzer | PFF, FantasyPros | PARTIAL (lineup.ts) | Roster composition scoring, weakness identification | P1 | H | M | Season Continuity |
| Lineup optimizer | ESPN, Yahoo native | PARTIAL (lineup.ts) | Wire to real scoring projections (gated); current = modeled | P0 | H | M | Season Continuity |
| Bye-week planner | ESPN, Yahoo, FantasyPros | NOT BUILT | Roster Destiny output includes bye-week exposure | P1 | M | L | Phase 9 |
| Playoff schedule analyzer | Footballguys, 4for4 | NOT BUILT | Roster Destiny playoff schedule scoring | P1 | M | L | Phase 9 |
| Player news/injury feed | ESPN, Yahoo, Rotoworld, Rotowire | NOT BUILT (news pipeline exists for sports picks) | Wire existing news ingestion to fantasy context | P1 | H | H | Season Continuity |
| Beat report intelligence | NO COMPETITOR (Footballguys has beat reporters, no synthesis) | PARTIAL (media intelligence engine exists) | Wire beat signal synthesis to fantasy context — scheme/usage | P2 | M | H | Future |
| Coach intent decoder | NO COMPETITOR (PFF grades usage, no intent inference) | PARTIAL (scheme.ts exists) | **First-of-kind** — structured coach intent with calibrated probability | P2 | M | H | Future |

---

## DFS TOOLS

| Feature/System | Competitor Baseline | GSE Current | GSE Gap | Priority | Revenue Impact | Trust Impact | Build Phase |
|---|---|---|---|---|---|---|---|
| Salary import / DK CSV | DraftKings native, SaberSim, FantasyLabs, RotoGrinders | DONE | None — Phase 2 complete | — | H | M | DONE |
| Projection integration | SaberSim, FantasyLabs, DK Roto | DONE | None — Phase 2 complete | — | H | M | DONE |
| Ownership projections | RotoGrinders, SaberSim | DONE (modeled) | Gated: real ownership requires licensed source | GATE | H | H | DONE/Gated |
| Value/leverage score | FantasyLabs, SaberSim | DONE | None | — | H | M | DONE |
| Stack rules | SaberSim, FantasyLabs | DONE (20 rule types) | None | — | H | M | DONE |
| Multi-lineup generation | All DFS optimizers | DONE | None | — | H | M | DONE |
| CSV export | DraftKings standard | DONE | None | — | H | L | DONE |
| Late swap engine | SaberSim | DONE (Phase 9) | None | — | H | M | DONE |
| Portfolio simulation (Monte Carlo) | SaberSim | DONE (Phase 8) | None | — | H | M | DONE |
| Lineup thesis cards | NO COMPETITOR | DONE (Phase 7) | **First-of-kind** complete | — | H | H | DONE |
| DFS Portfolio Surgeon | NO COMPETITOR | DONE (Phase 10, autopsy/calibration) | **First-of-kind** complete | — | H | H | DONE |

---

## PREDICTION / ANALYTICS

| Feature/System | Competitor Baseline | GSE Current | GSE Gap | Priority | Revenue Impact | Trust Impact | Build Phase |
|---|---|---|---|---|---|---|---|
| Pick recommendations with evidence | Action Network (basic), Unabated, Sharp (partial) | PARTIAL (prediction-engine exists) | Wire evidence chain to every pick recommendation | P0 | H | H | Ongoing |
| Confidence scores | Action Network, Unabated | PARTIAL (confidence in prediction engine) | Calibrate scores against settled picks; publish calibration | P0 | H | H | Ongoing |
| Model calibration tracking | Unabated, Pinnacle (internal) | PARTIAL (calibration-proposals docs exist) | Build public calibration dashboard; requires settled picks volume | P1 | M | H | Ongoing |
| Historical pick audit | Action Network (limited) | PARTIAL (cockpit exists) | Full audit trail per pick, per model version | P1 | M | H | Ongoing |
| No-play recommendations | FantasyLabs (edge threshold), Unabated | NOT BUILT | Explicit "no edge" output is a trust feature | P1 | L | H | Future |
| Line/odds integration | The Odds API (live via existing integration) | DONE | None | — | H | H | DONE |
| Closing line value tracking | Unabated, Pinnacle | NOT BUILT | CLV tracking requires line snapshot storage; add to ingestion | P1 | M | H | Future |
| Counter-thesis requirement | NO COMPETITOR | NOT BUILT | **First-of-kind** — every prediction must include counter-evidence | P1 | L | H | Phase 8 |

---

## INTELLIGENCE / TRUST

| Feature/System | Competitor Baseline | GSE Current | GSE Gap | Priority | Revenue Impact | Trust Impact | Build Phase |
|---|---|---|---|---|---|---|---|
| Signal Courtroom | NO COMPETITOR | EXISTS (complete) | No gap — do not refactor | — | M | H | DONE |
| Trust Ledger | NO COMPETITOR | EXISTS (complete) | No gap | — | M | H | DONE |
| Source Reliability Ledger | NO COMPETITOR | EXISTS (source-rights-registry.ts live) | No gap — extend only | — | L | H | DONE |
| Bias Mirror | NO COMPETITOR | EXISTS | Wire to actual draft decisions (Phase 3+4) | P2 | L | H | Phases 3-4 |
| GM Ledger / Process Grade | NO COMPETITOR | EXISTS | No gap — extend only | — | M | H | DONE |
| Narrative Inflation Detector | NO COMPETITOR | PARTIAL (media intelligence engine) | **First-of-kind** — football-mechanism gate on hype signals | P2 | L | H | Future |
| Decision Autopsy | NO COMPETITOR | PARTIAL (DFS autopsy done; fantasy needed) | Fantasy draft autopsy (Phase 11); links to existing DFS pattern | P1 | M | H | Phase 11 |
| League Exploit Map | NO COMPETITOR | NOT BUILT | **First-of-kind** — where specific league misprices value | P2 | M | H | Future (post-genome) |

---

## MONETIZATION

| Feature/System | Competitor Baseline | GSE Current | GSE Gap | Priority | Revenue Impact | Trust Impact | Build Phase |
|---|---|---|---|---|---|---|---|
| Free tier | FantasyPros, Sleeper, ESPN (all free tiers) | DONE (live) | No gap | — | M | M | DONE |
| Pro/subscription tier | FantasyPros, 4for4, Footballguys | DONE (live, $14.99/mo) | No gap — maintain value ladder | — | H | M | DONE |
| Elite tier | 4for4 ($14.99+), Footballguys ($35+) | DONE (live, $24.99/mo) | Needs Voice Jarvis to fully differentiate Elite tier | P1 | H | M | Phase 10 |
| Seasonal draft kit | FantasyPros (annual plan) | NOT BUILT | One-time purchase for draft season; reduces churn; complement to subscription | P1 | M | L | Future |
| Founding member program | Substack, Patreon model | NOT BUILT | Activate before draft season 2026 — owner action item | P0 | H | H | Owner action |
| Community / Discord | FantasyLabs, RotoGrinders (large), Unabated | NOT BUILT | High retention value; low build cost | P2 | M | M | Future |
| Affiliate/sponsorship (integrity-gated) | Action Network (heavy), ESPN (heavy) | GATE | Requires compliance review before any affiliate; prediction-affiliate conflict gate | GATE | M | H | Gated |

---

## FIRST-OF-KIND FEATURE SUMMARY

| Feature | Category | Status | Phase | Market Position |
|---|---|---|---|---|
| Manager Genome | Draft Intelligence | NOT BUILT | Phase 3 | Nobody computes behavioral genome from draft history |
| Draft Futures Engine | Draft Intelligence | NOT BUILT | Phase 6 | Competitors show projected availability; nobody runs probabilistic tree |
| Opponent Room Model | Draft Intelligence | NOT BUILT | Phase 7 | Nobody models per-opponent pick probabilities in real time |
| Pick Thesis + Counter-Thesis | Decision Quality | NOT BUILT | Phase 8 | Nobody requires counter-thesis on every recommendation |
| Voice Jarvis Draft Co-Pilot | UX | NOT BUILT | Phase 10 | No voice-native draft co-pilot with evidence context exists |
| Roster Destiny Simulator | Season-Long | NOT BUILT | Phase 9 | Some playoff probability tools exist; not wired to single-draft decision |
| League Exploit Map | Analytics | NOT BUILT | Future | Nobody identifies per-league mispricing from historical data |
| Narrative Inflation Detector | Trust | PARTIAL | Future | Football-mechanism gate on hype does not exist anywhere |
| Coach Intent Decoder | Signal | PARTIAL | Future | Usage-rate signals exist; calibrated intent probability model does not |
| Process-Based Draft Autopsy | Calibration | NOT BUILT | Phase 11 | Process/outcome 2x2 framing rare; good-process-bad-outcome distinction not made |
| DFS Lineup Thesis Cards | DFS | DONE | DONE | Complete; first-of-kind built |
| DFS Portfolio Surgeon | DFS | DONE | DONE | Complete; first-of-kind built |

---

## CAPABILITY DENSITY SCORE (GSE vs. Market)

This is a rough relative density score, not a precision metric. 1–10 scale per category.

| Category | Market Leader Score | GSE Current Score | GSE Potential Score |
|---|---|---|---|
| DFS Optimizer | SaberSim: 9 | 8 (10 phases done) | 9 (licensing fills gap) |
| Draft Tools — Table Stakes | FantasyPros: 9 | 3 (scaffolded) | 8 (post Phases 1-5) |
| Draft Tools — Intelligence Layer | No clear leader: 3 | 0 (not built) | 10 (post Phases 3,6,7,8) |
| Season-Long Tools | ESPN/Yahoo: 7 | 4 (partial lib files) | 7 (post Phase 12) |
| Prediction/Analytics | Unabated: 8 | 5 (engine exists) | 9 (post calibration + CLV) |
| Trust/Intelligence Layer | No competitor: 0 | 7 (multiple systems live) | 10 (post genome wiring) |
| Monetization | FantasyPros: 7 | 5 (live tiers) | 8 (post draft kit + founding) |
