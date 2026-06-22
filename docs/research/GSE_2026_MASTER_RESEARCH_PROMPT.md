# Galaxy Sports Edge 2026 — Master Research Prompt

**Status:** Production-grade research intelligence captured as of 2026-06-22  
**Audience:** Claude (or any AI researcher) tasked with expanding GSE's competitive moat  
**Purpose:** Single, authoritative brief to guide market research, product strategy, and feature design  

---

## I. Strategic Context

**Galaxy Sports Edge (GSE)** is a **subscription SaaS for high-stakes fantasy football decision-making**. The platform combines three capabilities:

1. **Draft Intelligence Engine** — ADP analysis + league memory + voice co-pilot + manager genome profiling
2. **Scoring & Calibration** — Confidence-based ranking (MAE/RMSE/Brier) + process grading (decision quality independent of outcome)
3. **Decision OS** — Real-time evidence debate, audit trail, pick thesis + counter-thesis, no-play doctrine

**Revenue model:** FOUNDING tier ($0), Pro ($14.99/mo · $99/yr), Elite ($24.99/mo · $179/yr). Founding members grandfathered for life.

**Trust ladder:** FOUNDING → PROVEN (≥100 published picks + calibration) → ESTABLISHED (≥500 + CLV ≥52.4%) → AUTHORITY (multi-season ROI).

---

## II. Competitive Landscape

**45+ competitors tracked across 6 categories:**

- **Draft-assistant:** FantasyPros, MFL Tools, Dynasty League Football, Draft Buddy
- **Mock simulator:** Sleeper, The Athletic, FFPC
- **League sync:** Sleeper, Yahoo, ESPN, MFL, Fantrax, Fleaflicker
- **DFS optimizer:** DraftKings, FanDuel, Monkey Knife Fight, Optimizer Suite
- **Sports prediction & analytics:** FiveThirtyEight, ESPN, numberFire, Sharpens, The Athletic
- **All-in-one fantasy:** FantasyPros, Yahoo Sports, ESPN+, The Athletic

**Key competitor gaps identified (market research):**

| Gap | Competitors missing | GSE approach |
|-----|-------------------|--------------|
| Manager Genome | 40/45 | Per-opponent draft DNA profiling — position/player/timing tendencies |
| Calibration tracking | 41/45 | MAE/RMSE/Brier/CLV published per pick, auditable precision |
| Process grading | 42/45 | Distinguish good/bad process from good/bad outcome — build trust independently |
| Voice Jarvis | 44/45 | Live voice draft co-pilot, eyes-free mode, <3s latency, no screen required |
| Draft futures engine | 43/45 | Show what survives to your *next* pick, not just best available now |
| Pick thesis counter | 41/45 | Mandatory opposing argument + playbook for reversing the decision |
| Bias detection | 44/45 | Narrative inflation detection — catch when vibes override data |
| Calibration science | 38/45 | Ensemble + Monte Carlo models with transparent signal taxonomy |

---

## III. First-of-Kind Product Systems

**35 confirmed unique systems across 9 categories:**

### A. Draft Intelligence (7 systems)
- **ADP Engine v2** — position-scarcity-adjusted average draft position with peer-group clustering
- **Manager Genome Profiler** — 5-year opponent draft DNA (position runs, bye-week patterns, player tier preference)
- **Historical Regret Engine** — surfaces comparable historical drafts (REAL data only; labeled ILLUSTRATIVE when modeled)
- **Roster Destiny Simulator** — 10,000-sim Monte Carlo post-draft full-season outcome projection
- **Pick Thesis + Counter-Thesis** — mandatory opposing argument + override playbook
- **Draft Futures Engine** — what survives to your next pick vs. BPA optimization
- **League Memory** — multi-season position/scoring/roster history per league, searchable archive

### B. Scoring & Calibration (8 systems)
- **Calibration Science Suite** — MAE, RMSE, Brier, CLV, Pearson-r, log loss, bias metrics
- **Process Grading Taxonomy** — GOOD_PROCESS_GOOD_OUTCOME, GOOD_PROCESS_BAD_OUTCOME, LUCKY, PROJECTION_MISS, OWNERSHIP_MISREAD, BAD_PROCESS_BAD_OUTCOME
- **No-Play Doctrine** — first-class outcome (tracked in accuracy record); 7 suppression reasons
- **Breakeven Win Rate Science** — 52.38% threshold against -110 vig (with field-specific adjustments)
- **Signal Taxonomy** — 8 primary signals, sharp indicators, ensemble weights
- **Stat Methods Ensemble** — Monte Carlo, empirical bootstrap, Bayesian hierarchical models
- **Confidence Scoring v3** — 0–100 scale, calibrated against historical outcomes per tier
- **Autopsy & Lesson Capture** — post-slate root-cause analysis, playbook refinement

### C. Evidence & Decision (6 systems)
- **Evidence Debate** — structured argument/counter-argument with citation chain
- **No-Play Doctrine Enforcement** — hard stops before recommendation submission
- **Source Rights Clearance Engine** — checkClearance() + RightsSnapshot on every extraction
- **Signal Detection Pipeline** — automated flag for narratives without data backing
- **Decision Audit Trail** — complete history: pick → inputs → reasoning → outcome → grading
- **Ownership/Market Alignment** — compare pick vs. crowd, detect contrarian/consensus positioning

### D. Voice & UX (4 systems)
- **Voice Jarvis** — intent-based voice co-pilot (WebSocket + Web Speech API + Claude API <3s latency)
- **Eyes-Free Mode** — draft board sync without screen (voice-only I/O)
- **League Memory Voice Search** — "show me how Player X was used in Year Y"
- **Pick Explanation Voice** — generate 30–60 second audio rationale for each pick

### E. Platform Integration (3 systems)
- **Sleeper Live Draft Sync** — CONDITIONAL_PERMISSION (license review required)
- **Yahoo Fantasy Sync** — CONDITIONAL_PERMISSION (OAuth integration)
- **Custom League Import** — CSV/JSON upload for manual or third-party platforms

### F. Research & Calibration (4 systems)
- **Competitor Intelligence Matrix** — 45+ competitors × 30 feature flags + exceed methods
- **Revenue Model Intelligence** — 15 revenue models, competitor pricing, affiliate risk map
- **Outside-Domain Transfers** — 15 domains (finance/quant, chess, poker, aviation, NASA, medical, etc.) with V1/V2 GSE applications
- **Gap Analysis & Roadmap** — quarterly refresh, feature priority matrix

### G. Trust & Monetization (3 systems)
- **Trust Tier Ladder** — proof-gated progression (FOUNDING → PROVEN → ESTABLISHED → AUTHORITY)
- **Unit Economics** — LTV/CAC ratio, payback period, churn risk factors per tier
- **Calibration-Based Pricing** — cost-per-accurate-pick, annual value projection, grandfather clause

---

## IV. Data Contracts & Source Rights

### Approved data sources (9 registered):
- **The Odds API** — `approved_api` (licensed, commercial terms)
- **Anthropic Claude API** — `approved_api` (content generation only, not source of truth)
- **NFLVerse** — `approved_open_license` (CC0, public data)
- **Sleeper API** — `approved_api` (conditional: oauth sync permitted)
- **Yahoo Fantasy API** — `approved_api` (conditional: oauth sync permitted)
- **ESPN Fantasy** — `manual_research_only` (no automation; UX research OK)
- **Scores24.live** — `permission_required` (manual research only, no automation without consent)
- **Score24.com** — `vendor_candidate` (complete questionnaire before ingestion)
- **SiriusXM Activator** — `excluded` (circumvents paid access; no safe path)

### Integrity invariants (11 non-negotiable):
1. `checkClearance()` must be called before every extraction job
2. `ClearanceResult.allowed=false` must STOP the job (no circumvention)
3. `wrapExtractedRecord()` enforces the RightsSnapshot envelope
4. Every extracted record carries timestamp + source reference
5. Rights snapshots are point-in-time; never mutate after capture
6. Attribution text from registry must propagate to all derived outputs
7. No CAPTCHA/paywall/account bypass; no fake credentials
8. No proxy rotation to circumvent IP blocks or access controls
9. No automated access after cease-and-desist without legal review
10. Facts only — no article bodies, proprietary predictions, or protected graphics
11. Personal data requires privacy review before extraction

### TypeScript strict-mode data contracts (11 files):
- `competitor-intelligence.ts` (32+ entries, 20+ feature flags, helpers)
- `revenue-intelligence.ts` (15 models, 9 competitor pricing, 4 sportsbook affiliates)
- `prediction-methods.ts` (9 calibration metrics, 8 signals, 7 no-play reasons)
- `first-of-kind-systems.ts` (35 systems, 7 scoring models)
- `outside-domain-transfer.ts` (15 domain transfers)
- `decision-graph-roadmap.ts` (8 decision OS nodes, 3 tiers)
- `revenue-operating-model.ts` (4 trust tiers, unit economics, ARR projections)
- `source-rights-gates.ts` (9 sources, 11 invariants)
- `draft-intelligence-roadmap.ts` (5 phases, 5 roster configs)
- `voice-jarvis-roadmap.ts` (7 commands, 5 platform postures, 5 privacy reqs)
- `league-memory-roadmap.ts` (6 import formats)
- `historical-draft-intelligence.ts` (3 archetypes ILLUSTRATIVE, 3 data sources)

All contracts: TypeScript strict, no `any`, full type inference.

---

## V. Where We're Winning (Confirmed Unique)

### Definitionally first-of-kind:
1. **Manager Genome** — opponent draft DNA profiling across 5+ seasons
2. **Voice Jarvis** — live voice draft co-pilot with <3s latency
3. **Pick Thesis + Counter-Thesis** — mandatory opposing argument
4. **Process Grading** — good/bad process independent of outcome
5. **Calibration Tracking** — MAE/RMSE/Brier published per pick
6. **Draft Futures Engine** — what survives to next pick optimization
7. **Historical Regret Engine** — comparable historical draft surface (REAL data)
8. **Autopsy & Lesson Capture** — structured post-slate root-cause analysis
9. **Bias Detection** — narrative inflation detection (vibes vs. data)
10. **Roster Destiny Simulator** — 10,000-sim full-season projection post-draft

### Differentiating execution:
- Ensemble + Monte Carlo calibration (vs. single-model competitors)
- No-play doctrine as first-class outcome (tracked in accuracy)
- Ownership/market alignment (crowd contrast)
- Outside-domain transfer framework (finance/chess/poker/aviation mechanics)
- Trust tier ladder with proof gates (not just pay tier)

---

## VI. Where We're Missing (Market Gaps)

### Emerging opportunities:
1. **Best Ball Intelligence** — BBV projections, position scarcity in 2-round format (mostly absent in market)
2. **Dynasty Trade AI** — multi-year value trajectory + breakeven trades (8/45 competitors have this)
3. **Injury Impact Engine** — real-time position replacement value, depth chart analysis
4. **Playoff Schedule Strength** — strength-of-schedule optimization for week 15–17
5. **Auction Efficiency** — dollar-per-projection framework + optimal bid strategy
6. **IDP Scoring Intelligence** — position scarcity in IDP leagues (Fantrax support)
7. **Narrative Velocity Tracking** — news flow + market reaction timeline
8. **Peer Benchmarking** — league-specific performance vs. similar leagues (clustering)

### Strategic gaps to close:
1. **Content Engine** — generate pick narratives from data (currently manual)
2. **Mobile-First UX** — most competitors are desktop-heavy
3. **Sportsbook Integration** — odds sync + line movement tracking
4. **Affiliate Monetization** — DFS/sportsbook referral layer (6/45 competitors active here)
5. **Community Features** — league-wide discussion/thesis sharing (network effect)

---

## VII. How to Deepen the Moat

### Technical depth:
1. **Multi-sport expansion** — apply draft intelligence to NBA/MLB/NHL (position scarcity frameworks)
2. **Simulator accuracy** — improve Roster Destiny from 10K to 100K+ sims; real-world validation
3. **Calibration feedback loop** — weekly recalibration vs. settled outcomes (reduce overfitting)
4. **Signal discovery** — automated signal mining (Bayesian structure search)
5. **Explainability** — SHAP values per pick (why this player, why now, why this confidence)

### Market depth:
1. **Seasonal player arcs** — preseason → regular season → playoffs projection refinement
2. **Tear-down analysis** — compare draft outcome vs. fantasy points (process grading per team)
3. **Manager profiling at scale** — multi-league opponent history (detect home-league bias)
4. **Market-wide sentiment** — aggregate all public rankings + expert picks + Twitter/Reddit (narrative tracking)
5. **Affiliate flywheel** — low-CAC user acquisition via sportsbook/DFS referrals

### Product depth:
1. **Voice assistant expansion** — "what if" scenario simulation ("what if I skip this tier")
2. **League-specific tuning** — customize confidence scores per league payout structure
3. **Injury uncertainty modeling** — confidence intervals for return-to-play dates
4. **Playoff position likelihood** — P(make playoffs) after each week
5. **Historical comparable search** — "show me similar draft situations from the last 5 years"

---

## VIII. Tying Together All Tools

### GSE as the decision hub:
- **Input layer:** External data (The Odds API, Sleeper, Yahoo, pro stats, Vegas lines, news flow)
- **Intelligence layer:** Competitor research, first-of-kind systems, calibration science, signal taxonomy
- **Decision layer:** Draft intelligence engine, Voice Jarvis, evidence debate, no-play doctrine
- **Output layer:** Pick recommendations, process grades, calibration metrics, trust tier progression
- **Learning layer:** Autopsy + lesson capture → confidence recalibration → next pick

### Connection to other GSE products:
- **DFS Optimizer** → portfolio construction using draft confidence scores
- **Content Engine** → narrative generation from pick thesis + calibration data
- **Subscription Tiers** → proof-gated progression (picks published → calibration measured → tier unlock)
- **Source Rights Clearance** → every input validated before touching decision logic

---

## IX. Key Metrics & Success Criteria

### User engagement:
- Founding members: target 100K within 12 months
- Proven tier unlock: ≥100 settled picks + published calibration
- Established tier unlock: ≥500 settled picks + CLV ≥52.4%
- NPS: target 70+ (premium tier retention > 90%)

### Product quality:
- Calibration: MAE < 4 pts, RMSE < 5.5 pts, Brier > 0.62 (better than 52.38% win rate)
- Process grading accuracy: ≥85% agreement between two independent graders
- Voice Jarvis latency: <3s end-to-end (WebSocket + Claude API + Web Speech)
- Autopsy completeness: 100% of settled picks analyzed + lesson captured

### Business metrics:
- LTV:CAC ratio: ≥5.0 (target Elite tier)
- Payback period: <6 months (Pro tier average)
- Churn rate: <2% monthly (vs. 5–8% industry average for SaaS)
- ARR progression: FOUNDING → PROVEN → ESTABLISHED → AUTHORITY

---

## X. Next Research Priorities

### Immediate (next 30 days):
1. **Manager genome validation** — ground-truth 50 leagues, test predictive accuracy
2. **Voice Jarvis latency audit** — profile WebSocket + Claude API bottlenecks
3. **Best ball intelligence** — survey existing tools, define BBV projection approach
4. **Injury impact framework** — design position replacement value model

### Medium-term (60–90 days):
1. **Multi-sport signal transfer** — apply draft learnings to NBA/MLB/NHL
2. **Narrative velocity tracking** — build news-flow → market-reaction timeline
3. **Sportsbook integration** — evaluate odds API partnerships, line movement modeling
4. **Community features roadmap** — league-wide thesis sharing UX design

### Long-term (120+ days):
1. **Calibration feedback loop** — automated weekly recalibration pipeline
2. **Market-wide sentiment model** — aggregate all public rankings + social media
3. **Affiliate flywheel architecture** — DFS/sportsbook referral layer design
4. **Explainability framework** — SHAP values + pick explanation generation

---

## XI. Implementation Roadmap

### Phase 1: Consolidation (Weeks 1–4)
- Publish Manager Genome public beta
- Launch calibration science cockpit (operator view)
- Deploy autopsy pipeline to all settled picks
- Complete source rights clearance testing

### Phase 2: Expansion (Weeks 5–12)
- Add best ball intelligence (BBV projections)
- Implement narrative velocity tracking
- Launch Voice Jarvis pilot (select users)
- Integrate injury impact engine

### Phase 3: Monetization (Weeks 13–20)
- Roll out trust tier ladder (PROVEN gate)
- Launch affiliate referral layer (DFS/sportsbook)
- Publish calibration metrics on marketing site
- Launch content generation engine (pick narratives)

### Phase 4: Optimization (Weeks 21+)
- Multi-sport expansion (NBA/MLB/NHL draft intelligence)
- Calibration feedback loop automation
- Community features launch
- International/global market expansion

---

## XII. Brand & Messaging

**Galaxy Sports Edge** is the **only platform that publishes its picks AND proves the process**.

- **What we do:** Draft intelligence + calibration science + voice co-pilot
- **Why we're different:** Manager genome profiling, process grading (independent of luck), auditable confidence scores
- **Who wins:** High-stakes fantasy players who value transparency, process repeatability, and trust-based tiers
- **Trust model:** Founding members locked in forever; each tier requires proof (published picks + measured accuracy)

---

## XIII. How to Use This Brief

**For product teams:** Use the first-of-kind systems (III) and market gaps (VI) to prioritize roadmap.

**For research teams:** Use the competitor matrix (II), data contracts (IV), and opportunities (VII) to guide deep research on specific domains.

**For content/marketing:** Use the where-we're-winning (V) and brand message (XII) to craft marketing narratives.

**For engineering:** Use the data contracts (IV) and implementation roadmap (XI) to scope sprints.

**For leadership:** Use the metrics (IX) and strategic context (I) for board updates and investor pitches.

---

**End of Master Brief**  
Generated: 2026-06-22  
All data contracts committed; all research docs available at `docs/research/`
