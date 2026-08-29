# Sports OS — Research Lab

**Status**: Doctrine only. Implementation requires approved change proposal.
**Source**: Prompt 1 §3.3 · Component 11
**Parent**: `docs/intelligence/SPORTS_OS_INTELLIGENCE_NETWORK_MASTER_PLAN.md`

---

## Purpose

The Research Lab is Sports OS's internal workspace for structured sports
intelligence briefs. Operators use the lab to produce systematic research
outputs that inform picks, Brain answers, and content decisions.

The Research Lab is cockpit-only. No lab output reaches a public surface
without going through the full pick or Brain answer publication gate.

---

## Research Brief Types

The lab supports 10 structured brief types. Each type has a defined
input set, output structure, and evidence standard.

### 1. Injury Timeline Brief

**Purpose**: Reconstruct the full timeline of a player's injury — mechanism,
diagnosis, treatment, rehab milestones, and return probability.

**Required inputs**:
- Player entity ID
- Injury entity ID (if exists)
- Date range for evidence search

**Required outputs**:
- Incident date and mechanism (Tier 1 source required)
- Official diagnosis (Tier 1 or Tier 2 required)
- Rehab milestones and current status (Tier 1 preferred)
- Return timeline (Tier 1 or Tier 3 with caveat)
- Market reaction to injury news
- Fantasy and pick implication

**Algorithm Applications**:
- **Anytime-Valid Ledger**: Track sequential validation of recovery progression indicators (range of motion, strength metrics) to determine statistically significant improvement milestones
- **Expected Value Calculations**: Evaluate betting opportunities on return timelines (over/under games missed) using injury recovery models
- **Brier Score**: Assess calibration of injury recurrence probability models across different injury types and severities

### 2. Player Context Brief

**Purpose**: Full current-state profile of a player — role, usage, status,
scheme fit, and relevant recent events.

**Required inputs**: Player entity ID, sport, current week

**Required outputs**:
- Current team and depth chart position (Tier 1)
- Recent snap counts / usage percentage (Tier 2)
- Recent target share / carry share (Tier 2, if applicable)
- Injury status and practice designation (Tier 1)
- Coordinator scheme fit notes (Tier 1–3)
- Recent performance trend (Tier 2)
- Weakening signals (if any)

**Algorithm Applications**:
- **Expected Value Calculations**: Quantify value of player-specific projections (usage, efficiency) vs. market expectations for fantasy and prop betting
- **Logit Pool Test**: Validate usage prediction models against actual snap counts/target shares
- **Conformal Calibration**: Provide uncertainty bands around usage forecasts for risk-averse fantasy decisions
- **Brier Score**: Assess calibration of performance trend models (improvement/decline trajectories)

### 3. Game Context Brief

**Purpose**: Pre-game intelligence package for a specific matchup.

**Required inputs**: Game entity ID, target date

**Required outputs**:
- Current line and movement summary (Tier 2)
- Key injury designations for both teams (Tier 1)
- Weather and venue context (Tier 2)
- Head-to-head historical context (Tier 2–3)
- Scheme matchup notes (Tier 1–3)
- Market pressure summary (Market Gravity output)
- Confidence and risk classification

**Algorithm Applications**:
- **Conformal Calibration**: Determine when to abstain from game picks due to high uncertainty (weather, injury volatility, lineup uncertainty)
- **Anytime-Valid Ledger**: Sequential validation of line movement models and closing line accuracy
- **Logit Pool Test**: Assess game win probability model calibration against market prices
- **CLV Tracking**: Post-game attribution of picking skill vs. line movement luck
- **Expected Value Calculations**: Evaluate betting line value and construct +EV parlays from game-level opportunities

### 4. Prop Market Brief

**Purpose**: Deep research on a specific player proposition market.

**Required inputs**: Player entity ID, prop type, current line

**Required outputs**:
- Historical performance vs. this prop line (Tier 2)
- Matchup context for this prop type (Tier 2–3)
- Recent usage trend (Tier 2)
- Current line vs. implied probability
- Market movement summary (Tier 2)
- Key supporting and weakening signals
- Confidence level with rationale

**Algorithm Applications**:
- **Expected Value Calculations**: Primary metric - compute EV = (pOver × payout) - 1 for over/under decisions
- **Logit Pool Test**: Validate prop probability model calibration against market implied probabilities
- **Conformal Calibration**: Generate prediction sets for prop outcomes to determine when confident recommendations are possible
- **Anytime-Valid Ledger**: Sequential validation of prop model performance over time
- **CLV Tracking**: Measure closing line value for prop line movements (especially relevant for player props with volatile lines)
- **Brier Score**: Assess calibration of prop probability models across different player/tier combinations

### 5. Fantasy Decision Brief

**Purpose**: Start/sit/waiver/trade research for a specific fantasy decision.

**Required inputs**: Player entity ID, decision type, league scoring format

**Required outputs**: Per the Fantasy War Room spec (`docs/brain/fantasy-war-room.md`) —
evidence must be separated into verified status, usage, matchup, scheme, and market
categories. No opaque combined analysis.

**Algorithm Applications**:
- **Expected Value Calculations**: Compute EV of start/sit decisions based on projected points vs. opportunity cost
- **Logit Pool Test**: Validate fantasy point projection models against actual scoring
- **Conformal Calibration**: Produce prediction sets for fantasy scores to guide boom/bust probability assessments
- **Anytime-Valid Ledger**: Track sequential validation of fantasy model consistency and bias
- **Brier Score**: Assess calibration of touchdown/scoring probability models
- **CLV Tracking**: For fantasy sports with betting lines, track CLV of fantasy-adjacent propositions

### 6. Coach / Scheme Change Brief

**Purpose**: Assess the intelligence impact of a coaching or coordinator change.

**Required inputs**: Team entity ID, previous and new staff entity IDs

**Required outputs**:
- Personnel changes confirmed (Tier 1)
- New coordinator's historical scheme tendencies (Tier 2–3)
- Projected usage impact on key players (Tier 2–3 with appropriate confidence)
- Pick and fantasy implications
- Timeline: when the new scheme is expected to be installed

**Algorithm Applications**:
- **Logit Pool Test**: Test whether new scheme improves predictive accuracy of usage/performance models
- **Anytime-Valid Ledger**: Sequential validation of scheme impact on team performance metrics
- **Expected Value Calculations**: Quantify betting opportunities arising from scheme-induced mismatches or under/over-reactions
- **Brier Score**: Assess calibration improvement/degradation after scheme change
- **Conformal Calibration**: Measure uncertainty reduction/increase in predictions post-scheme change
- **CLV Tracking**: Determine if scheme changes improve ability to beat closing lines

### 7. Rumor Triage Brief

**Purpose**: Evaluate a Tier-5 rumor and determine its verification status.

**Required inputs**: Rumor cluster ID (from Weak Signal Engine)

**Required outputs**: Per the Weak Signal Engine spec (`docs/brain/weak-signal-engine.md`) —
verification status, Tier 1–2 corroboration check result, market alignment check,
recommended action (verify / watchlist / dismiss), and required language for any output.

**Algorithm Applications**:
- **Anytime-Valid Ledger**: Sequential validation of rumor persistence and market impact over time
- **Expected Value Calculations**: Compute EV of acting on rumor now vs. waiting for confirmation (factoring in timing of market reaction)
- **Logit Pool Test**: Test correlation between weak signals and actual outcomes (does this rumor type predict events?)
- **Conformal Calibration**: Determine confidence threshold for acting on weak signals based on historical accuracy
- **Brier Score**: Assess calibration of rumor-to-outcome prediction models
- **CLV Tracking**: Measure whether acting on rumors generates positive or negative closing line value

### 8. Market Movement Brief

**Purpose**: Explain a material line movement and assess its intelligence value.

**Required inputs**: Market entity ID, movement event timestamp

**Required outputs**:
- Movement size and speed (Tier 2)
- Timing vs. known news events (Tier 1–3 correlation check)
- Book agreement / disagreement (Tier 2)
- Corroborating Tier 1–3 information (if any)
- Market Gravity classification (WATCH / LEAN / PICK / AVOID)
- Forbidden: any unverified sharp-money claim

**Algorithm Applications**:
- **Logit Pool Test**: Test whether line movements contain predictive information beyond public news
- **Anytime-Valid Ledger**: Track sequential efficiency of line movements (do they revert or persist?)
- **Expected Value Calculations**: Quantify value of betting with/against the move based on timing and conviction
- **CLV Tracking**: Primary attribution - determine if bets placed on movement beat or lost to closing line
- **Conformal Calibration**: Assess uncertainty in line movement persistence and timing
- **Brier Score**: Evaluate calibration of line movement prediction models (based on news, injury, weather, etc.)

### 9. Content / SEO Brief

**Purpose**: Research brief for a planned article or methodology page.

**Required inputs**: Topic, target URL, target audience

**Required outputs**:
- Key claims the article will make (must be evidence-backed)
- Source tiers available for each claim
- Any claims that cannot be sourced (flag for removal or caveat)
- GEO anchor opportunities (stable URLs, structured answer blocks)
- Forbidden language check (must pass public-copy scanner)
- Proposed updated-at timestamp format

**Algorithm Applications**:
- **Expected Value Calculations**: Assess EV of creating content around specific topics (traffic potential vs. effort)
- **Logit Pool Test**: Validate predictive claims in content against actual outcomes (fact-checking calibration)
- **Conformal Calibration**: Determine uncertainty bounds around predictive statements for appropriate confidence language
- **Anytime-Valid Ledger**: Track sequential accuracy of content predictions over time
- **Brier Score**: Assess calibration of predictive models used to generate content insights
- **CLV Tracking**: For betting-related content, measure whether content-informed picks show positive CLV

### 10. Competitor / Product Research Brief

**Purpose**: Intelligence on competing sports analytics or picks products.

**Required inputs**: Competitor name or URL

**Required outputs**:
- Public product description and positioning (Tier 3)
- Claims they make publicly (with source quality assessment)
- Gaps relative to Sports OS responsible intelligence positioning
- No fabricated competitive intelligence — all claims must be sourced

**Algorithm Applications**:
- **Logit Pool Test**: Direct comparison of competitor model calibration against market vs. Sports OS models
- **Expected Value Calculations**: Compare EV of competitor picks vs. Sports OS picks for same opportunities
- **Anytime-Valid Ledger**: Sequential validation of competitor pick performance vs. market baseline
- **Conformal Calibration**: Compare uncertainty quantification and refusal rates between systems
- **Brier Score**: Direct calibration measurement comparison between competing systems
- **CLV Tracking**: Compare closing line value attribution between competitor and Sports OS picks

---

## Research Lab Governance

**Cockpit-only rule**: Research Lab is accessible to operators only.
No lab surface may be made public without completing the standard component
dependency chain and receiving owner approval.

**Output destination**: Lab outputs feed into:
- Pick rationale (via Evidence Vault)
- Brain answer construction
- Content pipeline (via Content / SEO brief)
- Operator watchlist (via Rumor Triage)

Lab outputs are not standalone products — they are inputs to governed
publishing workflows.

**Evidence standard**: Every lab brief must meet the same evidence
standards as a Brain answer. Confidence levels and source tiers must
be declared. Weakening signals must be included.

---

## Cross-Reference

- Ask the Brain: `docs/brain/ask-the-brain.md` — Brain infrastructure shared with lab
- Weak Signal Engine: `docs/brain/weak-signal-engine.md` — Rumor Triage brief inputs
- Fantasy War Room: `docs/brain/fantasy-war-room.md` — Fantasy Decision brief spec
- Market Gravity: `docs/brain/market-gravity.md` — Market Movement brief inputs
- Operator Cockpit: `docs/brain/operator-cockpit-governance.md` — lab access gate
- GEO Strategy: `docs/intelligence/ai-search-geo-strategy.md` — Content brief requirements

---

## Algorithm Application Guidelines

Each brief type should conclude with an **Algorithm Application Section** detailing:

1. **Algorithms Applied**: List of specific algorithms used in the brief
2. **Parameters Used**: Key configuration values (alpha levels, ranges, thresholds)
3. **Evidence Generated**: What specific outputs each algorithm contributed
4. **Limitations Noted**: Known constraints or assumptions of the applied algorithms
5. **Reproducibility Notes**: Enough detail for another operator to replicate the analysis

### Example Algorithm Application Section:

```
## Algorithm Applications

### Anytime-Valid Ledger
- **Purpose**: Sequential validation of recovery progression metrics
- **Parameters**: ANYTIME_RANGE_UNITS = 20, returns = [daily ROM improvement %]
- **Evidence**: logEValue = 2.3, everSignificant = true, firstSignificantAtN = 14
- **Limitation**: Assumes independent and identically distributed returns
- **Reproducibility**: See `scripts/injury-recovery/anytime-validation.ts`

### Expected Value Calculation  
- **Purpose**: Quantify betting opportunity on return timeline
- **Parameters**: modelProbability = 0.65, marketOdds = 1.91 (-110)
- **Evidence**: EV = +0.085 (8.5% edge), Kelly fraction = 0.14
- **Limitation**: Assumes linear utility and accurate probability estimation
- **Reproducibility**: See `scripts/injury-recovery/ev-calculation.ts`
```

This ensures transparent, evidence-based application of Sports OS intelligence algorithms across all research brief types.