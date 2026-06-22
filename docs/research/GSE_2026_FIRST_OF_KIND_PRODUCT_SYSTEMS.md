# GSE 2026 First-of-Kind Product Systems Map

**Status:** Research document. Unverified competitive claims are labeled "source gap."
**Branch:** claude/laughing-wozniak-gyryjx
**Date:** 2026-06-22

> This document maps 35 first-of-kind product systems that define the GSE moat.
> It builds on existing GSE systems (Signal Courtroom, Agent War Room, GM Ledger,
> League Twin, Bias Mirror, Trust Ledger, Academy Simulator, DFS Optimizer) without
> duplicating them. Each entry defines what it is, why it doesn't exist elsewhere,
> what it requires, and how it connects to the broader GSE ecosystem.

---

## 1. GSE Decision Graph

**Thesis:** Every sports decision is part of a causally connected chain. A draft pick
affects the waiver wire strategy, which affects trade leverage, which affects DFS
exposure, which produces a result, which feeds autopsy, which feeds calibration, which
improves future drafts. No competitor models this chain explicitly. Without it, every
recommendation is a point-in-time output with no memory of what caused it.

**Why Competitors Don't Do It:**
Generic tools (FantasyPros, ESPN, Sleeper) treat each product surface (draft, waiver,
trade, DFS) as an independent module. There is no graph that binds them. A FantasyPros
rankings change has no causal link to a user's prior draft pick or future DFS exposure.
Source gap: no public documentation confirming any competitor has a cross-surface causal
decision graph.

**Data Required:**
- All GSE recommendation events with timestamps
- User decisions (accepted/rejected/modified)
- Results tied to each decision node
- Season-level outcome data (final standing, winnings, calibration grade)
- Cross-system join keys (player_id, manager_id, season_id, pick_id)

**Frontend Surface:**
A read-only timeline visualization on `/profile/decisions` showing each decision node
(draft pick, waiver, trade, DFS entry, start/sit), its context at decision time, the
outcome, and the downstream effects on subsequent decisions. Nodes are clickable to the
Trust Ledger entry and GM Ledger process grade for that decision.

**Backend Model/Service:**
A directed acyclic graph (DAG) stored as adjacency data in PostgreSQL (or a graph
extension). Each edge represents a causal relationship. A background job reconstructs
the graph after each season to re-score node quality in light of full outcomes.

**GSE Ecosystem Tie-In:**
- Trust Ledger: stores the evidence state for every node
- GM Ledger: stores the process grade for every node
- Academy Simulator: trains on historical graph paths
- Bias Mirror: detects patterns across the graph
- League Twin: visualizes the current season graph spatially

**Revenue/Trust/Retention Value:**
Primary retention moat. A user with three seasons of Decision Graph data has an
irreplaceable personal record. No other tool can show them what a 2023 reach pick in
round 4 did to their waiver budget in week 7. This is the lock-in that makes GSE
irreplaceable.

**Legal/Source Risks:**
All graph data is user-generated or GSE-generated. No third-party data rights issue.
Graph edges must not expose other managers' private decisions without consent.

**V1 (MVP):**
Linear decision log on `/profile/decisions`. Chronological list of recommendation
events with outcome tags. No graph traversal. Manual season linkage.

**V2 (Full):**
Full DAG with graph traversal, causal path tracing ("this decision affected these three
later decisions"), season-over-season comparison, and export as JSON.

**Acceptance Criteria:**
- Every GSE recommendation event writes a node to the Decision Graph at creation time
- Nodes are immutable after the relevant game/week settles
- User can view their full decision history by season on `/profile/decisions`
- Graph export returns valid JSON with causal edge data
- No other manager's private data is accessible via graph traversal

---

## 2. Fantasy War Room

**Thesis:** Live drafts are high-stakes, time-pressured decisions with incomplete
information. Every fantasy tool treats the draft board as a static list. The Fantasy
War Room treats the draft as a command center: live room state, opponent modeling,
pick thesis generation, tier survival tracking, and multi-agent debate all on one
surface.

**Why Competitors Don't Do It:**
ESPN and Sleeper's draft interfaces show a board and a pick. FantasyPros Draft Analyzer
shows ADP. No tool combines live room state analysis, opponent behavioral modeling from
historical Manager Genome data, and real-time AI reasoning in one unified draft surface.
Source gap: no public documentation of any competitor offering behavioral opponent
modeling during live drafts.

**Data Required:**
- Live draft picks (via platform sync or manual entry)
- Manager Genome profiles for all managers in the draft
- Real-time tier survival probability calculations
- ADP data at draft time (from licensed or approved-open source)
- User's pre-draft strategy plan

**Frontend Surface:**
`/fantasy/war-room` — split into four panels: (1) live draft board with tier overlays,
(2) "What just happened" feed analyzing each pick as it lands, (3) "My next picks"
panel showing recommendation + Jarvis reasoning, (4) opponent behavior panel flagging
live deviations from historical Manager Genome. Mobile-responsive with voice mode.

**Backend Model/Service:**
Real-time draft state machine that ingests pick events, re-calculates tier availability,
re-runs Agent War Room for Draft on each user's next turn, and pushes updates via
WebSocket. Draft state is persisted to PostgreSQL at every pick.

**GSE Ecosystem Tie-In:**
- Agent War Room for Draft (System 10): multi-agent debate engine powering the
  reasoning panel
- Draft Futures Engine (System 3): feeds the tier survival probabilities
- Manager Genome (System 5): powers the opponent behavior panel
- Voice Jarvis Draft Co-Pilot (System 8): voice layer on top of the War Room
- Trust Ledger (System 22): records every recommendation made during the draft

**Revenue/Trust/Retention Value:**
The flagship Elite-tier draft feature. A live War Room during a high-stakes draft is
a premium-value moment users will pay for. Trust value: every recommendation is stored
with its evidence, so GSE can prove it didn't change the recommendation after the pick.

**Legal/Source Risks:**
Live platform sync requires platform API access and ToS compliance. See GSE Live Draft
Sync Design (System doc 2, Section 7). Without platform sync, manual pick entry is the
V1 fallback.

**V1 (MVP):**
Manual pick entry only. No live sync. User enters picks as they happen. Tier overlay
and next-pick recommendation update on each entry.

**V2 (Full):**
Live sync for Sleeper (API-based with user OAuth). Full War Room panels. Voice Jarvis
active. Opponent behavioral alerts for all managers with Genome data.

**Acceptance Criteria:**
- Draft state correctly tracks all picks and remaining players after each entry
- Tier survival probabilities update within 500ms of each pick entry
- Trust Ledger entry created for every pick recommendation
- Voice Jarvis responds within 3 seconds to "who should I take?"
- No auto-drafting without explicit platform permission flag

---

## 3. Draft Futures Engine

**Thesis:** Most draft tools tell you who to pick now. The Draft Futures Engine tells
you what will still be available at your next 1-3 turns, which tiers are about to
break, and what the opportunity cost of waiting actually is. This is the difference
between reactive and strategic drafting.

**Why Competitors Don't Do It:**
Draft tools show current board state. None model tier survival probability across
multiple future turns with opponent behavioral input. Source gap: no documented
competitor calculates forward-looking tier survival with per-manager behavioral
adjustment.

**Data Required:**
- Current draft board state (available players ranked by position/tier)
- Pick order (who picks between user and their next turn)
- Manager Genome data for all intervening pickers (their positional preferences)
- Historical position run data (how fast each position tier drains in similar drafts)
- Current ADP data

**Frontend Surface:**
A panel within Fantasy War Room and a standalone `/fantasy/draft-futures` page.
Shows: probability each available player survives to user's next pick, tier cliff
warnings ("this tier breaks before your pick 87% of the time"), and opportunity cost
of taking player A vs. waiting for player B.

**Backend Model/Service:**
A Monte Carlo simulation engine that runs N scenarios for the remaining picks before
the user's turn. Each scenario samples pick probabilities weighted by Manager Genome
data for each intervening manager. Outputs: survival probability per player, tier
break probability per position, recommendation to "take now" vs. "safe to wait."

**GSE Ecosystem Tie-In:**
- Fantasy War Room (System 2): primary integration point
- Manager Genome (System 5): behavioral weights for Monte Carlo
- Agent War Room for Draft (System 10): Futures Engine feeds the ADP Agent
- Projection Factory (System 11): player values used in opportunity cost calculation

**Revenue/Trust/Retention Value:**
Quantifies the value of waiting vs. acting now in a way no other tool does. Builds
trust by showing the calculation, not just the recommendation.

**Legal/Source Risks:**
Monte Carlo simulation is GSE-generated analysis. No third-party data ownership
issue beyond the ADP inputs (which must come from approved sources).

**V1 (MVP):**
Deterministic model: assume each manager fills their positional need in rank order.
Calculate expected tier availability at user's next pick. Display as "likely
available / risky / unlikely available."

**V2 (Full):**
Full Monte Carlo with Manager Genome behavioral weights. Configurable confidence
intervals. Historical back-testing of tier survival accuracy.

**Acceptance Criteria:**
- Tier survival probability updates within 1 second of each new pick
- Back-test shows survival predictions are within 10 percentage points of actual
  historical outcomes (source gap: baseline validation data needed)
- Recommendations align with Agent War Room for Draft outputs
- No Genome data used for managers who have not consented to behavioral modeling

---

## 4. League Memory Graph

**Thesis:** A fantasy league is a persistent social and competitive system. The same
ten managers draft, trade, and compete year after year. Their tendencies, mistakes,
biases, and patterns compound over time. A tool that remembers everything — every
draft pick, every trade, every waiver decision, every outcome — and builds a living
model of the league is categorically different from a tool that resets every August.

**Why Competitors Don't Do It:**
Platform-native tools (ESPN, Yahoo, Sleeper) store historical data but do not analyze
it for behavioral patterns or build manager models. Third-party tools (FantasyPros,
Underdog) are generic and have no per-league memory. Source gap: no documented
competitor builds a multi-season behavioral graph of a user's specific league.

**Data Required:**
- Historical draft results (upload or platform sync)
- Historical roster transactions (waiver adds, drops, trades)
- Historical standings and playoff results
- Player outcome data for historical seasons (for grading)

**Frontend Surface:**
`/fantasy/league-memory` — league overview showing all managers with their season
records, Genome summaries, and head-to-head history. Manager profiles accessible from
this hub. Historical draft board viewer. Transaction timeline per manager per season.

**Backend Model/Service:**
PostgreSQL graph-style schema with FantasyLeague, FantasySeason, FantasyManager,
FantasyDraft, FantasyDraftPick, FantasyTransaction, FantasyTrade, FantasyStanding,
FantasyManagerProfile entities (see full schema in Document 2). Background job
recalculates Manager Genome and FantasyRegretAnalysis records after each data upload
or at season end.

**GSE Ecosystem Tie-In:**
- Manager Genome (System 5): derived from this graph
- Historical Regret Engine (System 6): analysis layer on top of this graph
- Fantasy War Room (System 2): consumes Genome data in real time
- Trust Ledger (System 22): immutability guarantee for all stored records
- User Bias Mirror (System 25): feeds from behavioral patterns in this graph

**Revenue/Trust/Retention Value:**
The primary switching-cost moat. A user with three seasons of League Memory Graph data
will not leave GSE. The graph becomes more valuable every year. Pro/Elite only — free
tier gets single-season basic history.

**Legal/Source Risks:**
User-uploaded data is user-owned. Platform sync requires user OAuth. Data on other
managers (non-GSE users) is derived behavioral analysis, not PII — but must be
handled carefully. See compliance notes in Document 3, Section 8 (GDPR/CCPA).

**V1 (MVP):**
CSV draft upload for one season. Player resolution against known player list. Basic
Manager Genome calculation. Single-season history view.

**V2 (Full):**
Multi-season, multi-format upload. Platform sync (Sleeper first). Full graph
queries. Historical regression per manager. Export as JSON. Manager Genome
confidence badges based on sample size.

**Acceptance Criteria:**
- CSV upload processes a 12-team, 15-round draft in under 30 seconds
- Player name resolution achieves >95% match rate on standard CSV exports
- Manager Genome updates within 5 minutes of upload completion
- No manager's private data is exposed to another user without consent
- All stored records are immutable after the season lock date

---

## 5. Manager Genome

**Thesis:** Every fantasy manager has a behavioral fingerprint. Some always follow ADP.
Some reach for QBs. Some panic when a tier breaks. Some never trade. These patterns are
measurable, consistent year-over-year, and exploitable by opponents who know them. The
Manager Genome is the quantified behavioral profile of every manager in a league.

**Why Competitors Don't Do It:**
No tool builds a quantified, multi-dimensional behavioral profile of opposing managers.
Source gap: no documented competitor calculates per-manager behavioral deviation from
optimal strategy with multi-season history.

**Data Required:**
- Full draft history for the manager (multiple seasons preferred)
- ADP data at each draft time (to calculate deviation from market)
- Transaction history (waiver, FAAB, trades)
- Final standings and playoff results

**Frontend Surface:**
`/fantasy/league-memory/managers/[managerId]` — Genome dashboard showing radar chart
of all 12 dimensions (see Document 2, Section 4), historical draft patterns, notable
tendencies ("reaches for RBs in rounds 3-4," "never drafts a TE before round 8"),
confidence badges (based on sample size), and head-to-head record with current user.

**Backend Model/Service:**
Genome calculation service that runs after every data upload. Each dimension scored
0-100 with confidence interval. Stored in FantasyManagerProfile. Recalculated
incrementally as new season data arrives. Minimum sample sizes enforced before
displaying scores (see Document 2, Section 4).

**GSE Ecosystem Tie-In:**
- League Memory Graph (System 4): source data for all calculations
- Draft Futures Engine (System 3): consumes positional preference scores
- Fantasy War Room (System 2): real-time opponent modeling during drafts
- Historical Regret Engine (System 6): Genome explains why certain mistakes recur
- User Bias Mirror (System 25): self-directed version of Genome for the user

**Revenue/Trust/Retention Value:**
The Genome is what makes League Memory Graph tactically actionable. Users will pay
to know which manager to trade with, which opponent is about to panic, and which
pick they can safely leave on the board knowing a specific manager won't take it.

**Legal/Source Risks:**
Behavioral profiling of other users (who are not GSE subscribers) raises GDPR/CCPA
considerations around behavioral profiling. The Genome is behavioral analysis of
observable actions, not PII — but consent flow and privacy notice must cover it.
See Document 3, Section 8.

**V1 (MVP):**
Three dimensions only: ADP Adherence Score, Position Bias (primary position drafted
most frequently relative to ADP), and Panic Draft Detector. Requires minimum 1
completed draft with 10+ rounds.

**V2 (Full):**
All 12 dimensions. Multi-season confidence weighting. Exportable profiles. Genome
comparison between user and opponent. Exploit Map integration (System 34).

**Acceptance Criteria:**
- Each dimension displays confidence level (low/medium/high) based on sample size
- ADP Adherence Score correlates with manual audit of historical draft picks
- Minimum sample size warnings displayed before any score with < 20 picks
- Genome recalculates within 10 minutes of new draft data upload

---

## 6. Historical Regret Engine

**Thesis:** Most draft post-mortems are outcome-driven: "I shouldn't have drafted X
because he flopped." The Historical Regret Engine separates process from outcome. A
reach pick that worked was still a bad process. A value pick that got injured was still
a good process. This distinction is what separates learning from noise.

**Why Competitors Don't Do It:**
No fantasy tool performs retrospective pick-by-pick process grading with explicit
process vs. outcome separation. Source gap: no documented competitor builds
opportunity cost analysis at the individual pick level with process categorization.

**Data Required:**
- User's historical draft picks with pick number and position
- ADP data at draft time (for each historical draft)
- Player actual outcome data for each season (points scored)
- Best-available player data at each pick (what was left on the board)

**Frontend Surface:**
`/fantasy/regret-engine` — per-season, per-draft analysis. For each pick: what was
taken, what was available, what was the opportunity cost, process grade, outcome grade,
and category (GOOD_PROCESS_GOOD_OUTCOME, GOOD_PROCESS_BAD_OUTCOME, etc.). Summary
statistics: user's regret score by pick round, regret by position, regret by category.
"What if" cards showing the alternative path for top-3 missed opportunities.

**Backend Model/Service:**
Historical pick analysis service that runs after season completion. For each pick:
queries best-available player at that pick position, calculates opportunity cost in
fantasy points, assigns process grade based on deviation from expected-value pick,
assigns outcome grade based on actual points, categorizes the pick, stores
FantasyRegretAnalysis record. Requires historical player outcome data from approved
open sources (nflverse or equivalent).

**GSE Ecosystem Tie-In:**
- League Memory Graph (System 4): source data for all picks
- Historical Draft Upload (Document 2, Section 2): data entry path
- Manager Genome (System 5): Regret Engine patterns feed Genome dimensions
- Academy Simulator (System 24): Historical regret scenarios become training cases
- Autopsy/Calibration Engine (System 23): same process/outcome framework applied
  to picks vs. sports prediction picks

**Revenue/Trust/Retention Value:**
A uniquely honest product that shows users their actual decision quality. Builds
trust. Creates engagement at the end of each season when users review what went
wrong and why. Drives return engagement for the next draft.

**Legal/Source Risks:**
Requires historical player outcome data (fantasy points). nflverse (approved_open_license)
provides actual game stats that can be used to derive fantasy point totals. ADP
historical data — source status must be confirmed per source rights registry before
use.

**V1 (MVP):**
Process grade based on ADP deviation only (reach = bad process, value pick = good
process). Opportunity cost in raw draft round, not fantasy points. Three categories:
GOOD_PROCESS, BAD_PROCESS, INJURY_VARIANCE.

**V2 (Full):**
All eight process/outcome categories. Opportunity cost in projected and actual fantasy
points. Alternative path simulation. Season-over-season regret trend. Integration with
Academy Simulator scenario bank.

**Acceptance Criteria:**
- Regret analysis completes for a 12-team, 15-round draft within 60 seconds
- Process grade matches manual audit in >85% of picks (internal validation required)
- All historical player outcome data sourced from cleared sources only
- Users can dispute an automated grade and log their reasoning

---

## 7. Alternative Draft Path Simulator

**Thesis:** Understanding what could have happened with different picks is the most
powerful draft education tool that exists. Not as a recrimination, but as a training
exercise: if you had taken the value pick at round 4 instead of reaching, here is the
roster you would have had, the lineup stability you would have had, and the title
probability you would have had.

**Why Competitors Don't Do It:**
No fantasy tool reconstructs alternate historical draft paths with roster simulation
across a full season. Source gap: no documented competitor does counterfactual draft
path simulation with season-level outcome modeling.

**Data Required:**
- Full historical draft data for the user
- Player outcome data for the alternate picks (fantasy points, games played)
- Roster simulation model (lineup optimizer applied retroactively)
- Historical ADP data (to confirm what was available)

**Frontend Surface:**
Within `/fantasy/regret-engine` — "What If?" tab. User selects a specific pick to
change, the system proposes 1-3 alternatives that were available, and simulates the
rest of the draft with the changed pick (re-running availability, roster construction).
Shows: alternate final roster, projected week-by-week scores, estimated final
standing. Labeled as a simulation with explicit uncertainty disclosure.

**Backend Model/Service:**
Counterfactual simulation service. Given a changed pick at position N, re-runs
remaining availability simulation (using deterministic average-case model for other
managers) and constructs alternate roster. Applies historical scoring data to
estimate alternate season performance. Uncertainty bounds displayed prominently.

**GSE Ecosystem Tie-In:**
- Historical Regret Engine (System 6): surfaces the picks worth simulating
- Projection Factory (System 11): used in retroactive lineup optimization
- Academy Simulator (System 24): alternate path scenarios become training cases
- League Memory Graph (System 4): source data

**Revenue/Trust/Retention Value:**
High engagement, high shareability ("look what would have happened if I'd taken
this player"). Drives return visits at season end and pre-draft. Elite-tier feature.

**Legal/Source Risks:**
Simulation is GSE-generated analysis. Must clearly label as simulation/estimate.
Player outcome data from cleared sources only.

**V1 (MVP):**
Single pick substitution only. No re-simulation of remaining draft. Shows alternate
pick's actual season stats vs. taken pick's actual stats.

**V2 (Full):**
Full draft path re-simulation with cascade effects. Alternate roster construction.
Week-by-week scoring estimate. Title probability delta.

**Acceptance Criteria:**
- Simulation clearly labeled as estimate with uncertainty bounds
- All player outcome data sourced from rights-cleared sources
- Simulation completes within 10 seconds for a single pick change
- Results match manual calculation within 5% for simple single-pick substitution

---

## 8. Voice Jarvis Draft Co-Pilot

**Thesis:** Live drafts are time-pressured. Nobody can type fast enough to get a
well-reasoned recommendation in the 90 seconds they have to pick. Voice Jarvis is a
real-time audio co-pilot that answers draft questions conversationally, in 5 seconds
or less, backed by the full GSE intelligence stack.

**Why Competitors Don't Do It:**
No fantasy tool offers a voice-driven AI co-pilot during live drafts backed by
live draft state, opponent behavioral profiles, and tier survival probabilities.
Source gap: no public documentation of any competitor having voice-based live draft
assistance with league-specific behavioral context.

**Data Required:**
- Live draft state (current picks, user roster, remaining players)
- User's Manager Genome (for self-awareness queries)
- Other managers' Genome profiles
- Draft Futures Engine output (tier survival)
- Agent War Room for Draft real-time output

**Frontend Surface:**
Accessible from Fantasy War Room (System 2). A floating microphone button. Voice
waveform visual during listening. Response as both audio (TTS) and card overlay.
Persistent conversation log for the draft session. Jarvis mode activates only
during an active draft session.

**Backend Model/Service:**
Web Speech API for voice input. Claude API (claude-sonnet) for response generation
with structured draft state context. Response streamed as text, passed to TTS for
audio. Full specification in Document 2, Section 6.

**GSE Ecosystem Tie-In:**
- Fantasy War Room (System 2): host surface
- Agent War Room for Draft (System 10): reasoning input
- Draft Futures Engine (System 3): tier survival input
- Manager Genome (System 5): opponent behavior input
- Trust Ledger (System 22): every Jarvis recommendation logged

**Revenue/Trust/Retention Value:**
The premium Elite-tier feature that justifies the tier price in a single use. A user
who uses Jarvis during a live high-stakes draft will not draft without it again.
Strong differentiation that is genuinely hard to replicate (requires all other
systems to be live).

**Legal/Source Risks:**
Voice data must not be stored without explicit user consent. GDPR/CCPA compliance
required. Draft state data from platform sync requires platform ToS compliance.
See Document 3, Sections 6 and 7.

**V1 (MVP):**
Text-only (no voice). User types questions. Jarvis responds as text card. Draft
state entered manually. Responses backed by Projection Factory and basic tier
awareness. Latency target: < 5 seconds.

**V2 (Full):**
Full voice input/output. Live draft sync (Sleeper first). Full Agent War Room
for Draft reasoning behind every response. Manager Genome integration for opponent
queries. Voice session transcript available post-draft.

**Acceptance Criteria:**
- Voice response delivered within 3 seconds of question end
- "Who should I take?" returns a named recommendation with one-line reason
- All Jarvis recommendations logged to Trust Ledger with draft state context
- Voice data not stored beyond the active draft session (by default)
- User can toggle voice data retention with explicit consent

---

## 9. Signal Courtroom for Draft

**Thesis:** The Signal Courtroom (already built for sports prediction) must be applied
to every draft pick recommendation. Every suggested pick must survive structured
prosecution and defense before being surfaced. This is not a new system — it is the
extension of an existing system to a new domain with draft-specific evidence types.

**Why Competitors Don't Do It:**
No competitor applies structured evidence/counter-evidence debate to draft
recommendations. Tools return rankings and ADP-based suggestions without
transparency into why or what the counterargument is.

**Data Required:**
- All evidence types from Projection Factory (System 11)
- ADP data and deviation signals
- Injury status and history
- Scheme/coaching context
- Narrative signals from Narrative Intelligence Engine (System 13)
- Historical comparable draft outcomes

**Frontend Surface:**
Draft pick recommendation cards in Fantasy War Room (System 2) include a "See
Courtroom" expand button. Opens the Signal Courtroom view for that pick:
Claim, Prosecution evidence, Defense evidence, Judge (what would flip this
verdict), Verdict. Trust Ledger badge confirming evidence was locked at pick time.

**Backend Model/Service:**
Extension of existing `lib/courtroom/courtroom.ts`. New case type: `DRAFT_PICK`.
New evidence types: ADP_DEVIATION, TIER_POSITION, ROSTER_NEED, PROJECTION_RANGE,
INJURY_RISK, NARRATIVE_SIGNAL, OPPONENT_NEED, FUTURES_SURVIVAL. Courtroom
evaluation pipeline runs before each recommendation surfaces.

**GSE Ecosystem Tie-In:**
- Signal Courtroom (existing): core system being extended
- Agent War Room for Draft (System 10): agents supply evidence to the courtroom
- Trust Ledger (System 22): stores Courtroom state at pick time
- Narrative Intelligence Engine (System 13): supplies narrative signals as evidence

**Revenue/Trust/Retention Value:**
The transparency differentiator. Users understand why a pick is recommended, which
evidence is weakest, and what would change the verdict. Builds trust in the system.

**Legal/Source Risks:**
Same as Signal Courtroom (existing). Evidence sourced from cleared sources only.
No fabricated projections or stats.

**V1 (MVP):**
Three evidence types: TIER_POSITION, ROSTER_NEED, PROJECTION_RANGE. Courtroom
surfaces in text form. Trust Ledger entry created.

**V2 (Full):**
All eight evidence types. Full Courtroom UI component. Evidence freshness
indicators. Historical verdict accuracy tracking (how often did the "TAKE" verdict
prove correct?).

**Acceptance Criteria:**
- Every draft pick recommendation has an associated Courtroom case
- Courtroom case stored in Trust Ledger before recommendation is displayed
- At least one prosecution and one defense evidence item required per case
- Evidence freshness timestamps visible to user

---

## 10. Agent War Room for Draft

**Thesis:** The Agent War Room (already built for sports prediction) must be applied
to draft decisions with a domain-specific council of agents. Each agent specializes
in a different dimension of draft intelligence and must justify its position with
evidence before a verdict is rendered.

**Why Competitors Don't Do It:**
No competitor uses a multi-agent debate architecture for draft recommendations.
Recommendations are single-output systems (one model, one ranking, one consensus
score) without internal disagreement modeling.

**Data Required:**
- Live draft state
- Projection data (from Projection Factory, System 11)
- ADP data at draft time
- Injury/health status
- Beat reporter signals (from Beat Report Reliability Graph, System 15)
- Narrative signals (from Narrative Intelligence Engine, System 13)
- Opponent data (from Manager Genome, System 5)
- User's roster state and needs

**Frontend Surface:**
Available from Fantasy War Room "Agent Panel" button. Shows the council debate:
each agent's position on the current recommendation, confidence level, key evidence,
and dissents. Council verdict at the bottom with confidence.

**Backend Model/Service:**
Extension of existing Agent War Room infrastructure. New agent types for draft
domain: PROJECTION_AGENT, ADP_AGENT, ROOM_STATE_AGENT, INJURY_AGENT, BEAT_AGENT,
NARRATIVE_AGENT, ROSTER_AGENT, BIAS_AGENT. Each agent runs as a structured prompt
against the Claude API with domain-specific evidence context.

**GSE Ecosystem Tie-In:**
- Agent War Room (existing): core system being extended
- Signal Courtroom for Draft (System 9): agents supply evidence to the Courtroom
- Fantasy War Room (System 2): host surface
- Projection Factory (System 11): feeds PROJECTION_AGENT
- Beat Report Reliability Graph (System 15): feeds BEAT_AGENT
- Narrative Intelligence Engine (System 13): feeds NARRATIVE_AGENT
- Bias Mirror (existing): feeds BIAS_AGENT

**Revenue/Trust/Retention Value:**
Shows the internal disagreement structure of the recommendation. A user who sees
that the Injury Agent is dissenting understands the risk better than a user who
sees a single confidence score. Honest disagreement builds trust.

**Legal/Source Risks:**
Agent prompts must not fabricate player data. All evidence inputs sourced from
cleared sources. Agent outputs stored as Claude API generated content, clearly
labeled as AI-generated analysis.

**V1 (MVP):**
Three agents: PROJECTION_AGENT, ADP_AGENT, ROSTER_AGENT. Simple majority verdict.
Text-based output.

**V2 (Full):**
All eight agents. Weighted voting based on agent domain relevance to the specific
pick. Historical accuracy tracking per agent. Agent dissent highlights in War Room UI.

**Acceptance Criteria:**
- Council runs within 3 seconds for all active agents
- Every agent vote logged with evidence reference
- Council verdict stored in Trust Ledger before display
- Agent dissent displayed prominently when 2+ agents disagree
- No player data fabricated in agent prompts (all data from structured inputs)

---

## 11. Projection Factory

**Thesis:** GSE uses projection data in Draft, Waiver, Trade, DFS, and Start/Sit.
If each surface pulls from a different source with different assumptions, the
recommendations are incoherent. The Projection Factory is the single source of
projection truth for all surfaces, with explicit version tracking, uncertainty
bounds, and source attribution.

**Why Competitors Don't Do It:**
Most platforms use a single third-party projection vendor (Fantasy Pros consensus,
ESPN staff) without exposing uncertainty, version tracking, or source attribution.
No competitor exposes projection uncertainty bounds as a first-class data element.

**Data Required:**
- Licensed or open-source projection data (source gap: specific vendor TBD)
- Historical projection accuracy data for calibration
- Player health/injury status
- Depth chart data
- Weather/game environment data (for game-day projections)

**Frontend Surface:**
Not directly user-facing as a standalone page. Powers all recommendation surfaces.
Developers and analysts can access `/cockpit/projections` (admin only) to review
current projection versions, source attribution, accuracy metrics, and staleness.

**Backend Model/Service:**
Projection ingestion pipeline that normalizes external projection data into a
canonical schema: player_id, week, season, position, projected_points, floor,
ceiling, model_version, source, source_timestamp, ingested_at. All projection
queries go through a single service layer that enforces version consistency across
surfaces.

**GSE Ecosystem Tie-In:**
- Agent War Room for Draft (System 10): PROJECTION_AGENT source
- DFS Optimizer (existing): projection input
- Prop-to-Projection Delta Engine (System 35): divergence calculation source
- Roster Destiny Simulator (System 20): roster simulation input
- Academy Simulator (System 24): historical training projections

**Revenue/Trust/Retention Value:**
Internal infrastructure. Users benefit indirectly through consistent, version-tracked
recommendations. Trust value: users can see which projection version backed a
historical recommendation.

**Legal/Source Risks:**
Projection data source must be approved in the source rights registry before
ingestion. Proprietary projection data from external vendors requires licensing.
nflverse provides historical stats but not forward-looking projections — source gap
for forward projections.

**V1 (MVP):**
Single projection source (approved open or licensed). Version tagging. Staleness
detection (reject projections older than 24 hours for current week).

**V2 (Full):**
Multiple source blending with source weighting. Uncertainty bounds (floor/ceiling)
for every projection. Historical accuracy tracking per source. Automated source
failover if primary source is stale.

**Acceptance Criteria:**
- All projection data has a source attribution and ingestion timestamp
- Projections older than 24 hours for current week flagged as stale and not used
- Projection version logged with every recommendation that uses it
- All projection sources registered in source rights registry

---

## 12. Ownership Engine

**Thesis:** In DFS, projected ownership is as important as projected performance. A
player with a 40% projected ownership and a 35-point ceiling is less valuable than a
7%-owned player with a 30-point ceiling. The Ownership Engine models expected ownership
separately from performance, enabling leverage-aware lineup construction.

**Why Competitors Don't Do It:**
Some DFS tools show ownership projections (DraftKings/FanDuel's own tools, some
optimizer sites). None model ownership as a distinct engine separate from performance,
with public narrative and salary signals as inputs. Source gap: no documented
competitor models ownership from first principles as a distinct engine.

**Data Required:**
- Historical DFS ownership actuals (from public contest results)
- Current salary data (from DraftKings/FanDuel CSV — see compliance notes)
- Public narrative signals (social media mentions, expert consensus)
- Current ADP/consensus rankings
- Game-script signals (projected game total, team implied totals)

**Frontend Surface:**
Within DFS Optimizer (existing). Ownership projections displayed alongside
performance projections for each player. Leverage score = performance rank minus
ownership rank. "Contrarian targets" surface: high leverage + acceptable performance.

**Backend Model/Service:**
Ownership model: regression on historical ownership given salary rank, consensus
rank, narrative momentum, game total, team implied total. Separate model per
position and per contest type (GPP vs. cash). Updated weekly with new actuals.

**GSE Ecosystem Tie-In:**
- DFS Optimizer (existing): primary integration point
- Narrative Inflation Detector (System 14): feeds ownership inflation signals
- Projection Factory (System 11): performance side of the leverage equation
- DFS Portfolio Surgeon (System 18): uses ownership data for portfolio correlation

**Revenue/Trust/Retention Value:**
Ownership-aware lineup construction is a meaningful edge in GPP DFS. Differentiates
GSE from generic optimizers that only optimize on projected points.

**Legal/Source Risks:**
DFS platform terms must be reviewed before storing or redistributing ownership data
from platform contest results. Salary CSV download from platforms — terms of service
posture must be confirmed. See Document 3, Section 4.

**V1 (MVP):**
Simple ownership model: salary rank + consensus rank as inputs. Position-level
averages only.

**V2 (Full):**
Full regression model with narrative signals. Contest-type specific models. Leverage
score and contrarian target surfaces.

**Acceptance Criteria:**
- Ownership projections displayed with a clearly labeled model version
- Historical model accuracy tracked: mean absolute error vs. actual ownership
- No DFS platform terms violated in data acquisition

---

## 13. Narrative Intelligence Engine

**Thesis:** Fantasy and sports betting decisions are heavily influenced by narratives:
"He's in a contract year," "New OC loves his player type," "Revenge game." Most of
these narratives are analytically meaningless or significantly overstated. The
Narrative Intelligence Engine classifies every active narrative by type and historical
explanatory power.

**Why Competitors Don't Do It:**
No tool systematically classifies narratives by type and historical impact. Source
gap: no documented competitor distinguishes REAL_ROLE_CHANGE from HYPE_INFLATION
in a structured, auditable way.

**Data Required:**
- Narrative signal inputs: beat reports, coach press conference transcripts, social
  media volume (from approved sources only)
- Historical role-change outcomes (snap counts, target shares before/after)
- Historical narrative classification labels for training

**Frontend Surface:**
Narrative badges on player cards throughout the War Room and Start/Sit surfaces.
Color-coded: REAL_ROLE_CHANGE (green), CONTEXT_ONLY (yellow), HYPE_INFLATION (red),
WEATHER_GAME_SCRIPT (blue). Clicking a badge opens the Courtroom evidence trail.

**Backend Model/Service:**
Narrative classification service. Input: narrative text, player context, mechanism
description. Output: classification, confidence, historical base rate for this
narrative type, mechanism requirement check (football explanation required for
REAL_ROLE_CHANGE). Classifications stored with source attribution and timestamp.

**GSE Ecosystem Tie-In:**
- Signal Courtroom for Draft (System 9): narrative signals as evidence
- Agent War Room for Draft (System 10): NARRATIVE_AGENT source
- Narrative Inflation Detector (System 14): uses classifications as input
- Beat Report Reliability Graph (System 15): source reliability weights narrative
  confidence
- Coach Intent Decoder (System 16): feeds REAL_ROLE_CHANGE classification

**Revenue/Trust/Retention Value:**
Protects users from overpaying for hype. The single most common costly mistake
in fantasy and DFS is overvaluing narratives that don't affect role. Calling this
out explicitly and tracking the historical accuracy builds long-term trust.

**Legal/Source Risks:**
Narrative inputs from social media require platform ToS compliance. Beat report
content: may only extract factual claims (role/snap/usage), not republish article
text. Quoting must comply with fair use principles. See Document 3.

**V1 (MVP):**
Manual classification by editors for top-50 weekly narratives. Four categories.
Badge display on player cards.

**V2 (Full):**
Automated classification using Claude API against structured press conference
transcripts and beat report summaries (factual extraction only). Historical accuracy
tracking per narrative type. Mechanism requirement enforced via structured output
validation.

**Acceptance Criteria:**
- Every active narrative has a classification with a source reference
- Classification confidence displayed to user
- Historical base rate for each narrative type shown in the Courtroom
- No beat report article text republished — only factual claims extracted

---

## 14. Narrative Inflation Detector

**Thesis:** Prices in fantasy auctions and DFS salaries are moved by narratives.
A birthday back's "revenge game" narrative can inflate ownership 15 percentage
points above his fair value. The Narrative Inflation Detector identifies when a
player's market price (auction, salary, ADP) has been moved by narrative rather
than by a genuine role or performance change.

**Why Competitors Don't Do It:**
No tool isolates narrative-driven price movement from fundamentals-driven price
movement. Source gap: no documented competitor builds a narrative inflation signal
separate from standard ADP/salary tracking.

**Data Required:**
- Narrative classification from Narrative Intelligence Engine (System 13)
- ADP movement data (week-over-week) from approved source
- DFS salary movement data from platform
- Ownership projection from Ownership Engine (System 12)
- Baseline performance/role metrics

**Frontend Surface:**
"Inflation Alert" badge on players showing HYPE_INFLATION classification where
price movement exceeds what role fundamentals justify. Alert shows: current
market price, fair-value estimate, estimated inflation amount, driving narrative,
narrative type classification.

**Backend Model/Service:**
Inflation detection model: compares ADP/salary movement to role/usage movement.
Flags players where price moved significantly more than role/usage justifies,
and where an active HYPE_INFLATION or CONTEXT_ONLY narrative is present.

**GSE Ecosystem Tie-In:**
- Narrative Intelligence Engine (System 13): classification input
- Ownership Engine (System 12): ownership inflation component
- Prop-to-Projection Delta Engine (System 35): similar divergence detection
- Signal Courtroom for Draft (System 9): inflation flags become defense evidence

**Revenue/Trust/Retention Value:**
Directly saves users money in auctions and DFS. Avoids overpaying for hype. The
most immediately tangible financial value GSE can demonstrate.

**Legal/Source Risks:**
ADP movement data source must be rights-cleared. DFS salary data from CSV download
— ToS posture must be confirmed.

**V1 (MVP):**
Rule-based detection: if HYPE_INFLATION narrative present and ADP moved > 10 picks
in 48 hours, flag as inflated. Manual review of flags.

**V2 (Full):**
Model-based inflation estimation with dollar/pick amount. Historical inflation
accuracy tracking. Integration with Ownership Engine for ownership inflation.

**Acceptance Criteria:**
- Inflation alert fires within 6 hours of detecting the inflation signal
- Historical accuracy of inflation flags tracked (did inflated players underperform
  their inflated price in subsequent weeks?)
- Inflation alerts linked to the driving narrative in the Courtroom

---

## 15. Beat Report Reliability Graph

**Thesis:** Not all beat reporters are equally reliable. Some have consistent insider
access. Some speculate and label it as fact. Some have a pattern of publishing
positive spin for the team they cover. The Beat Report Reliability Graph scores every
source, so GSE can weight information by its historical accuracy rather than treating
all reports equally.

**Why Competitors Don't Do It:**
No tool builds a systematic, data-driven reliability score for individual beat
reporters. Source gap: no documented competitor tracks retraction rate, speculation
rate, or role-change prediction accuracy per reporter.

**Data Required:**
- Historical beat reports with attributed source (factual claims only, no
  republication of article text)
- Outcomes linked to specific report claims (did the player get the role change
  that was reported?)
- Retraction/correction events

**Frontend Surface:**
Source reliability badges on all evidence items in Signal Courtroom and Agent War
Room. Reporter profile pages at `/cockpit/sources/[sourceId]` (admin/internal).
User-facing: reliability tier labels (VERIFIED_INSIDER, RELIABLE, SPECULATIVE,
UNVERIFIED) on news items.

**Backend Model/Service:**
Reporter reliability scoring service. For each reporter: role_prediction_accuracy
(claimed role changes that materialized), injury_accuracy (injury severity that
matched actual), speculation_rate (frequency of unconfirmed claims), retraction_rate.
Scores stored in source rights registry extension. Recalculated weekly.

**GSE Ecosystem Tie-In:**
- Narrative Intelligence Engine (System 13): reliability weights narrative confidence
- Agent War Room for Draft (System 10): BEAT_AGENT uses reliability scores
- Signal Courtroom for Draft (System 9): evidence weighted by reporter reliability
- Trust Ledger (System 22): reliability score at evidence capture time stored

**Revenue/Trust/Retention Value:**
Unique proprietary signal. High reliability score for a specific reporter on a
specific player type is actionable intelligence that can't be purchased elsewhere.

**Legal/Source Risks:**
Reporter scores must be based on verifiable historical accuracy, not subjective
opinion. Fair use principles apply to any quoted claims. No reputational harm
claims — scores are accuracy-based, not character-based.

**V1 (MVP):**
Manual scoring for top-20 beat reporters in primary GSE sports. Three tiers only.
No automated scoring.

**V2 (Full):**
Automated accuracy tracking against player outcomes. Scoring model per reporter
with confidence intervals. API integration with approved news sources.

**Acceptance Criteria:**
- All reliability scores backed by verifiable historical data
- Score methodology documented publicly (what is measured, how)
- No score published with fewer than 10 verifiable historical claims
- Scores recalculated at minimum once per season

---

## 16. Coach Intent Decoder

**Thesis:** Coaches use specific language patterns when discussing player roles. Some
phrases ("we need to get him more involved") historically predict role changes. Others
("we like what he brings to this team") predict nothing. The Coach Intent Decoder
maps coach language to historically calibrated role-change probabilities.

**Why Competitors Don't Do It:**
No tool systematically converts coach press conference language into calibrated
role-change probabilities. Source gap: no documented competitor has a structured
language-to-outcome calibration system for coach statements.

**Data Required:**
- Coach press conference transcripts or factual summaries (from approved sources)
- Historical role changes following specific language patterns
- Snap count, target share, and usage data before and after stated outcomes

**Frontend Surface:**
Coach intent badges on player cards. Specific language quoted, with probability
estimate and historical base rate. Example: "'Earned more snaps' — historically 61%
lead to sustained usage increase (N=47)." [Note: N=47 is illustrative; real
calibration requires actual historical data collection.]

**Backend Model/Service:**
Language pattern matching service against a curated phrase bank. Each phrase
mapped to a historical outcome distribution. Phrases extracted from approved
sources (factual summaries, not article republication). New patterns added weekly.
Confidence displayed as function of sample size.

**GSE Ecosystem Tie-In:**
- Narrative Intelligence Engine (System 13): feeds REAL_ROLE_CHANGE classification
- Beat Report Reliability Graph (System 15): coach statements are a source category
- Signal Courtroom (existing): coach intent evidence type
- Agent War Room for Draft (System 10): BEAT_AGENT / NARRATIVE_AGENT input

**Revenue/Trust/Retention Value:**
Translates something users care about (what the coach said) into something
analytically actionable (historical probability). Unique proprietary analysis.

**Legal/Source Risks:**
Press conference transcripts: official NFL/team press conference transcripts are
generally public facts. Factual extraction of specific statements is fair use.
No republication of article text. Source rights registration required for each
press conference source.

**V1 (MVP):**
Manual phrase bank of 50 patterns with historical base rates (internal research
project). Phrase matching against manually tagged news items.

**V2 (Full):**
Automated phrase extraction from structured press conference summaries. Continuous
calibration against outcomes. 200+ patterns.

**Acceptance Criteria:**
- Every phrase has a documented historical sample size displayed to user
- No probability displayed with N < 20 historical instances
- Phrase bank reviewed by a qualified football analyst before publishing
- All source material properly attributed and rights-cleared

---

## 17. Motivation/Incentive Engine

**Thesis:** Player performance is influenced by contractual incentives, milestone
proximity, and situational motivation factors (revenge games, hometown returns,
draft class pride). Most of these factors are real but their actual impact is
overstated in popular analysis. The Motivation/Incentive Engine quantifies the
real historical effect of each motivator type.

**Why Competitors Don't Do It:**
No tool systematically tracks incentive clauses and calibrates their historical
impact. Source gap: no documented competitor builds a structured motivator
impact model beyond qualitative "revenge game" narrative tracking.

**Data Required:**
- Contract incentive clause data (public contract data from approved sources)
- Milestone proximity (stats-to-threshold at weekly granularity)
- Historical performance data in revenge game contexts
- Historical performance data on milestone weeks

**Frontend Surface:**
"Motivators" section on player profile pages. Lists active motivators with
calibrated impact estimates and historical base rates.

**Backend Model/Service:**
Motivator tracking service. For each motivator type: historical impact size,
sample size, confidence. Real-time tracking of milestone proximity for active
players. Revenge game detection from schedule data.

**GSE Ecosystem Tie-In:**
- Narrative Intelligence Engine (System 13): motivators are a narrative subcategory
- Signal Courtroom (existing): motivator evidence type
- Projection Factory (System 11): motivator signals can adjust projection ceiling
- Prop-to-Projection Delta Engine (System 35): motivators visible in divergence
  explanation

**Revenue/Trust/Retention Value:**
Adds calibrated nuance to the "revenge game" narrative that currently drives bad
decisions. Protects users from overvaluing motivators. Honest calibration builds
trust.

**Legal/Source Risks:**
Contract data from public sources (Spotrac has public contract data — rights status
must be confirmed before automated extraction). Source gap: specific source rights
status for Spotrac contract data is not yet confirmed. Manual research approach
until confirmed.

**V1 (MVP):**
Milestone proximity tracking only (yards to 1000, TDs to incentive threshold).
Manual data entry for top-50 players.

**V2 (Full):**
Full motivator taxonomy. Automated milestone tracking from nflverse stats.
Calibrated impact models for each motivator type.

**Acceptance Criteria:**
- Every displayed motivator has a documented historical base rate
- No motivator impact claimed without minimum N=20 historical instances
- Contract data only from rights-cleared sources
- Milestone calculations independently verifiable against public stats

---

## 18. DFS Portfolio Surgeon

**Thesis:** In DFS GPPs, a set of lineups is a portfolio. The portfolio must be
analyzed as a whole: correlated exposures, ownership concentration, fragile single-
point assumptions, and late-swap optionality. The DFS Portfolio Surgeon is a
post-construction diagnostic that grades the portfolio before submission.

**Why Competitors Don't Do It:**
Some optimizer tools show lineup correlation. None provide a structured "portfolio
health diagnosis" that identifies fragile assumptions and suggests specific surgical
fixes. Source gap: no documented competitor provides a structured portfolio-level
diagnostic with named fragile assumptions.

**Data Required:**
- User's DFS lineup set (player selections, salary, slate)
- Ownership projections (from Ownership Engine, System 12)
- Correlation data (player-game correlation model)
- Projection data (from Projection Factory, System 11)

**Frontend Surface:**
Within DFS Optimizer (existing). "Portfolio Surgeon" tab. Shows: ownership
distribution histogram, correlation heat map, fragile assumption cards ("This
portfolio breaks if QB X scores < 15 points — 6 of 10 lineups include him"),
late-swap option suggestions, portfolio risk rating (conservative/moderate/aggressive).

**Backend Model/Service:**
Portfolio analysis service. Input: array of lineups. Output: structured diagnostic.
Ownership distribution calculation, correlation matrix, single-point-of-failure
detection, late-swap candidate identification.

**GSE Ecosystem Tie-In:**
- DFS Optimizer (existing): host surface
- Ownership Engine (System 12): ownership data
- Projection Factory (System 11): performance projections
- Lineup Thesis Cards (System 19): Surgeon diagnosis feeds lineup thesis cards

**Revenue/Trust/Retention Value:**
The most common GPP mistake is building a set of 10 lineups that all break on the
same player. The Surgeon prevents this. Directly prevents lost entry fees.

**Legal/Source Risks:**
Ownership data source rights must be confirmed. DFS platform terms — analysis of
publicly available contest results is generally permissible; storing and
redistributing requires terms review.

**V1 (MVP):**
Single-point-of-failure detection only (player appearing in X% of lineups above
threshold). Manual ownership input.

**V2 (Full):**
Full portfolio diagnostic with correlation heat map, ownership distribution, and
late-swap suggestions.

**Acceptance Criteria:**
- Portfolio diagnostic runs within 5 seconds for a set of 150 lineups
- Single-point-of-failure threshold is configurable by user
- All ownership inputs from rights-cleared sources
- Results clearly labeled as analysis, not guaranteed optimization

---

## 19. Lineup Thesis Cards

**Thesis:** Every DFS and fantasy lineup recommendation should come with a structured
thesis: what the lineup is built to achieve, what it assumes, what breaks it, and
what the leverage point is. Without this, users can't evaluate whether a recommendation
fits their tournament strategy.

**Why Competitors Don't Do It:**
Most optimizer tools output lineups without structured reasoning. Some add brief
player notes. None produce a structured thesis card with explicit assumptions,
failure modes, and leverage identification. Source gap: no documented competitor
produces structured thesis cards at the lineup level.

**Data Required:**
- Lineup composition (from DFS Optimizer or manual entry)
- Projection Factory outputs for all players
- Ownership Engine projections
- Correlation data
- Game environment data

**Frontend Surface:**
"Thesis Card" overlay on each DFS lineup in the Optimizer. Structured card showing:
BUILD GOAL (leverage/upside/safety), CORE ASSUMPTION (one sentence), WHAT BREAKS
IT (top 2 risks), LEVERAGE PLAY (the owned-differently player that makes this
lineup distinct), HIGH FLOOR ANCHOR (the safe player), HIGH CEILING PLAY (the
upside play).

**Backend Model/Service:**
Thesis generation service. Input: lineup composition + supporting signals. Output:
structured thesis card using Claude API with constrained structured output (not
free-form — must populate defined fields). Thesis generated at lineup creation,
stored with lineup record.

**GSE Ecosystem Tie-In:**
- DFS Portfolio Surgeon (System 18): Surgeon diagnostic informs thesis risk section
- DFS Optimizer (existing): host surface
- Trust Ledger (System 22): thesis card stored at lineup creation time
- Projection Factory (System 11): projections referenced in thesis
- Signal Courtroom (existing): thesis is a lightweight version of the Courtroom

**Revenue/Trust/Retention Value:**
Users make better decisions when they understand the thesis. Also creates a post-
contest debrief path: "the thesis said this breaks if QB X underperforms — did he?"

**Legal/Source Risks:**
Thesis content is GSE-generated AI analysis. Must be labeled as AI-generated.
Not financial advice, not a guaranteed outcome. Disclaimer required.

**V1 (MVP):**
Three fields: CORE ASSUMPTION, WHAT BREAKS IT (one risk), LEVERAGE PLAY. Generated
by Claude API.

**V2 (Full):**
Full six-field thesis card. Historical thesis accuracy tracking (did "breaks if X"
predictions prove correct?).

**Acceptance Criteria:**
- Thesis card generated within 3 seconds of lineup finalization
- All six fields populated or explicitly marked as "insufficient data"
- Thesis card stored in Trust Ledger with lineup record
- AI-generated label displayed on all thesis cards

---

## 20. Roster Destiny Simulator

**Thesis:** Every major roster decision — a draft pick, a waiver add, a trade —
changes the downstream trajectory of your season. The Roster Destiny Simulator
shows how one decision changes weekly lineup stability, playoff path probability,
trade leverage, waiver dependency, and bye-week exposure across the full season.

**Why Competitors Don't Do It:**
Some tools show trade/waiver win probability impact. None model full-season
downstream effects on lineup stability, playoff path, and bye-week structure
from a single decision. Source gap: no documented competitor has full-season
simulation with multi-dimensional impact tracking from a roster decision.

**Data Required:**
- Current roster state
- Projection Factory outputs for all relevant players
- Schedule and bye-week data
- Playoff structure from league settings
- Waiver priority / FAAB balance

**Frontend Surface:**
Available from Trade Analyzer and Waiver Advisor. "Simulate Season Destiny" button.
Shows side-by-side: current roster trajectory vs. post-decision trajectory.
Metrics: projected win total, playoff probability, weeks with lineup holes, trade
leverage score, waiver dependency score, bye-week risk weeks.

**Backend Model/Service:**
Season simulation engine. Monte Carlo over 1000 scenarios. Each scenario: random
player health events from historical injury rates, weekly score sampling from
projection distributions, optimal lineup selection from available players, playoff
bracket simulation. Outputs: probability distributions for win total, playoff
qualification, playoff round reached.

**GSE Ecosystem Tie-In:**
- Projection Factory (System 11): projection inputs
- Season Continuity Engine (System 21): connects decision to full-season graph
- GM Ledger (existing): trade/waiver decisions logged with destiny delta
- DFS Optimizer (existing): separate but parallel simulation context

**Revenue/Trust/Retention Value:**
Transforms trade and waiver decisions from gut-feel to quantified expected value.
The simulation context makes the magnitude of decisions visible.

**Legal/Source Risks:**
All projections from cleared sources. Simulation is GSE-generated analysis.
Clear labeling as simulation with uncertainty bounds required.

**V1 (MVP):**
Deterministic single-scenario projection. No Monte Carlo. Shows projected weekly
scores and bye-week holes for current vs. post-decision roster.

**V2 (Full):**
Full Monte Carlo. Probability distributions. Playoff bracket simulation. Waiver
dependency score.

**Acceptance Criteria:**
- Simulation completes within 10 seconds for a 16-round roster
- Uncertainty bounds displayed prominently ("this is a simulation, not a prediction")
- All injury rate assumptions documented with source
- Results not cached longer than 6 hours (projections change)

---

## 21. Season Continuity Engine

**Thesis:** GSE has multiple fantasy subsystems: Draft, Waiver, Trade, Lineup,
DFS. Without a connecting layer, these are isolated surfaces. The Season Continuity
Engine maintains a persistent data graph through the season, so a draft decision
in August is connected to a waiver decision in October is connected to a DFS entry
in November.

**Why Competitors Don't Do It:**
Platform-native tools maintain roster state but not a decision-linked graph across
surfaces. No third-party tool spans draft + waiver + trade + DFS + GSN prediction
in a single persistent data model.

**Data Required:**
- All GSE decision events (draft, waiver, trade, lineup, DFS) with timestamps
- Roster snapshots at each decision point
- Outcome data as games settle

**Frontend Surface:**
No standalone surface. Powers the Decision Graph (System 1) visualization. Admin
view at `/cockpit/season-continuity` showing event log and graph integrity.

**Backend Model/Service:**
Event bus architecture. Every GSE decision surface emits a standardized decision
event. Season Continuity Engine consumes events, writes to Decision Graph, and
maintains the roster state timeline. All events immutable after write.

**GSE Ecosystem Tie-In:**
- Decision Graph (System 1): this engine populates the graph
- GM Ledger (existing): decision grading source
- Trust Ledger (System 22): immutability guarantee
- Autopsy/Calibration Engine (System 23): full-season data enables calibration
- GSN Transmission Media Flywheel (System 31): season graph generates content

**Revenue/Trust/Retention Value:**
Infrastructure that makes GSE's memory valuable. Every other system that uses
historical GSE data depends on the Season Continuity Engine maintaining a clean
event log.

**Legal/Source Risks:**
Internal data infrastructure. No third-party data rights issues.

**V1 (MVP):**
Sequential decision log only. No graph traversal. Events appended to a PostgreSQL
table with season_id, manager_id, decision_type, decision_data, outcome, timestamp.

**V2 (Full):**
Full event bus with Merkle-verified immutability (consistent with GM Ledger
approach). Graph traversal APIs. Season state replay capability.

**Acceptance Criteria:**
- Every GSE decision surface emits a standardized event within 1 second
- Events are immutable after write (no UPDATE on event records)
- Graph integrity check available at `/cockpit/season-continuity`
- Season state can be replayed from event log to reconstruct any point in time

---

## 22. Trust Ledger for Draft/Roster Decisions

**Thesis:** The Trust Ledger (already built) must be extended to cover every
Draft and Roster recommendation GSE makes. This is not a new system — it is the
application of an existing system's principles to a new domain. GSE made this
recommendation, at this time, with this evidence, and this model version. History
is locked.

**Why Competitors Don't Do It:**
No fantasy tool maintains a tamper-evident record of historical recommendations.
All competitors can silently change their rankings or claim they had a different
recommendation after the fact.

**Data Required:**
- All draft pick recommendations with evidence state at recommendation time
- All waiver/trade/lineup recommendations
- Model version at time of each recommendation
- User decision (accepted/rejected)

**Frontend Surface:**
Each recommendation in the War Room, Waiver Advisor, Trade Analyzer, and Start/Sit
includes a "View in Trust Ledger" link. Trust Ledger entry shows: recommendation,
evidence, alternatives considered, model version, timestamp. Historical view at
`/fantasy/trust-ledger`.

**Backend Model/Service:**
Extension of existing Trust Ledger infrastructure. New record types:
DRAFT_PICK_RECOMMENDATION, WAIVER_RECOMMENDATION, TRADE_RECOMMENDATION,
LINEUP_RECOMMENDATION, DFS_LINEUP_RECOMMENDATION. All records immutable after
creation. Records include agent council votes if Agent War Room for Draft was run.

**GSE Ecosystem Tie-In:**
- Trust Ledger (existing): core system being extended
- GM Ledger (existing): decision grading references Trust Ledger records
- Signal Courtroom for Draft (System 9): Courtroom cases stored here
- Autopsy/Calibration Engine (System 23): accesses Trust Ledger for post-mortem

**Revenue/Trust/Retention Value:**
The proof system. "We said [player] at pick 3.04 on August 15. Here's why. We
didn't change it." This is the single most differentiated trust signal in fantasy.

**Legal/Source Risks:**
Immutable records must comply with right-to-deletion requirements under GDPR/CCPA.
Design: anonymize personal identifiers on deletion request while preserving
prediction accuracy records without PII.

**V1 (MVP):**
Draft pick recommendations stored to Trust Ledger. Evidence captured as a snapshot
at recommendation time. View accessible from pick card.

**V2 (Full):**
All recommendation types. Model version tracking. Historical accuracy statistics
derived from Trust Ledger. Downloadable recommendation history.

**Acceptance Criteria:**
- Every draft recommendation stored in Trust Ledger before display to user
- Trust Ledger record includes model version, evidence snapshot, and alternatives
- Records immutable (no UPDATE after creation)
- GDPR-compliant deletion path does not corrupt historical accuracy statistics

---

## 23. Autopsy/Calibration Engine

**Thesis:** The Decision Autopsy (already built for sports prediction) must also
cover fantasy/roster decisions. Every GSE recommendation must eventually be graded
on process, not just outcome. Over time, this creates a calibration dataset that
measures whether GSE's confidence scores match real-world outcomes.

**Why Competitors Don't Do It:**
No fantasy tool self-grades its recommendations on process quality. No tool builds
a calibration dataset that separates good-process-bad-outcome from bad-process-good-
outcome. The absence of this means there is no accountability for recommendation
quality beyond the raw win percentage (which is gameable by cherry-picking easy
cases).

**Data Required:**
- Trust Ledger records for all historical recommendations
- Actual outcomes for all recommended players/decisions
- Process quality criteria (documented rules for what constitutes good process)

**Frontend Surface:**
`/fantasy/calibration` — public-facing calibration report showing: by confidence
decile, what percentage of recommendations at that confidence level proved correct.
Outcome × Process matrix (GOOD_PROCESS_GOOD_OUTCOME, etc.) aggregated across
seasons. Personal calibration for each user's accepted recommendations.

**Backend Model/Service:**
End-of-week calibration job. For each settled Trust Ledger record: compare
recommendation to outcome, grade process quality against documented criteria,
write calibration record. Aggregate statistics updated daily.

**GSE Ecosystem Tie-In:**
- Trust Ledger (System 22): source of all recommendation records
- GM Ledger (existing): process grade is the same framework
- Autopsy (existing): this is the fantasy extension of the same system
- Historical Regret Engine (System 6): same process/outcome framework
- Academy Simulator (System 24): calibration data feeds training scenarios

**Revenue/Trust/Retention Value:**
The published calibration report is the core trust signal for new users. It proves
GSE does not cherry-pick. It proves that high-confidence recommendations actually
hit at higher rates than low-confidence ones.

**Legal/Source Risks:**
Public calibration data must not include any user PII. Aggregate statistics only.
Must not make claims that imply guaranteed future performance.

**V1 (MVP):**
Manual post-season calibration report. Win rate by confidence band. Published once
per season.

**V2 (Full):**
Automated weekly calibration with process grading. Public calibration dashboard.
User-specific personal calibration report.

**Acceptance Criteria:**
- Published calibration report updated at minimum once per season
- Confidence-outcome calibration curve shows monotonic relationship (higher
  confidence = higher success rate) across at least two full seasons
- No individual user data in public calibration report
- Process grade criteria documented publicly

---

## 24. Academy Simulator

**Thesis:** The Academy Simulator (already built in concept) is the training and
education layer. It trains users on historical scenarios — historical draft rooms
at known tier breaks, historical auction traps, historical panic runs — with known
outcomes. Users make decisions against history and the system grades them.

**Why Competitors Don't Do It:**
Some platforms (Underdog, Sleeper) offer mock drafts. None train on historical
documented scenarios with known outcomes and process grades. The distinction:
mock drafts have unknown outcomes, Academy scenarios have ground truth.

**Data Required:**
- Historical draft scenarios from League Memory Graph (System 4)
- Historical waiver scenarios
- Historical trade scenarios
- Known outcomes for all scenarios

**Frontend Surface:**
`/fantasy/academy` — scenario library organized by type (draft panic, tier break,
auction value trap, waiver FAAB game, trade evaluation). Each scenario shows the
historical context, asks the user to make a decision, then reveals the outcome and
the GSE-recommended process grade. Score tracked across all scenarios.

**Backend Model/Service:**
Scenario bank populated from Historical Regret Engine (System 6) and historical
GSE data. Scenario player service that sequences a user through a scenario,
collects their decision, and grades it against the known optimal choice and process
criteria.

**GSE Ecosystem Tie-In:**
- Historical Regret Engine (System 6): primary scenario source
- League Memory Graph (System 4): scenario raw data
- Autopsy/Calibration Engine (System 23): calibration data feeds scenario bank
- GM Ledger (existing): Academy scenarios use same process framework
- User Bias Mirror (System 25): Academy tracks which scenario types expose biases

**Revenue/Trust/Retention Value:**
Off-season engagement driver. Returns users to GSE outside of draft season.
Progress tracking creates gamification and retention. Educational differentiation.

**Legal/Source Risks:**
Historical scenarios must use rights-cleared player data. Player names in historical
scenarios are facts. Scenario outcomes are facts. No rights issue beyond the data
source clearance for underlying stats.

**V1 (MVP):**
10 historical draft scenarios from League Memory Graph. Decision prompt + outcome
reveal. No scoring.

**V2 (Full):**
Scenario library of 200+. Scoring and progress tracking. Personalized scenario
recommendations based on Bias Mirror. Community-contributed scenarios (reviewed
before publication).

**Acceptance Criteria:**
- All scenario outcome data sourced from rights-cleared historical data
- User decisions tracked and linked to Bias Mirror
- Scenario player names and stats reference public historical facts only
- Minimum 10 scenarios available at V1 launch

---

## 25. User Bias Mirror

**Thesis:** The Bias Mirror (already built in concept) is the self-awareness layer.
It detects real patterns in a user's behavior over time: panic drafting, favorite-
team bias, recency bias, injury avoidance, sleeper obsession. The patterns are shown
with evidence, not just labels.

**Why Competitors Don't Do It:**
No tool builds a quantified behavioral profile of the user themselves, derived from
their own decision history. Generic "biases" content exists (articles, podcasts) but
no tool calibrates it to an individual user's actual pattern.

**Data Required:**
- User's complete decision history in GSE (draft picks, waiver adds, trades,
  DFS entries, start/sit choices)
- Outcomes for all decisions
- Market benchmarks (ADP, ownership) at decision time

**Frontend Surface:**
`/profile/bias-mirror` — personal bias report. Radar chart showing bias magnitude
across 8 dimensions. For each bias: specific examples from user's history ("In your
last 4 drafts, you reached for a RB an average of 1.8 rounds early in rounds 3-5"),
impact estimate ("estimated -X expected points vs. optimal picks"), and a recommended
correction.

**Backend Model/Service:**
Bias detection service. Input: user decision history. For each bias type: rule-based
detection against behavioral patterns. Confidence thresholds enforced before surfacing
any bias (minimum N decisions required). Output: bias profile with evidence citations.

**GSE Ecosystem Tie-In:**
- Bias Mirror (existing): this is the fantasy/roster extension
- League Memory Graph (System 4): historical evidence source
- User Portfolio of Decisions (System 33): data source
- Academy Simulator (System 24): bias-targeted scenario recommendations
- Agent War Room for Draft (System 10): BIAS_AGENT uses this profile

**Revenue/Trust/Retention Value:**
Deeply personal. Users return to check their Bias Mirror after each season.
Creates a unique relationship between the user and GSE that no generic tool can
replicate. Pro/Elite feature.

**Legal/Source Risks:**
Personal behavioral profiling. GDPR/CCPA right-to-deletion applies. Bias Mirror
data must be deletable without corrupting aggregate calibration statistics.

**V1 (MVP):**
Three biases: Panic Draft Detector, Favorite Team Bias, Recency Bias. Minimum 3
drafts required for any score.

**V2 (Full):**
Eight biases. Evidence citations for each. Correction recommendations. Bias trend
over time (is the user improving?). Linked to Academy scenario recommendations.

**Acceptance Criteria:**
- No bias score surfaced with fewer than 10 relevant historical decisions
- Every bias claim backed by specific evidence from user's history (named decisions)
- User can delete their Bias Mirror data (GDPR/CCPA compliance)
- Bias data never shared with other users or used for third-party profiling

---

## 26. Market Gravity / Line Movement Twin

**Thesis:** Odds and lines move because of information. Sharp money, public money,
and injury news all move lines in characteristic patterns. Visualizing line movement
as physics — objects with mass exerting gravitational pull — makes the underlying
logic intuitive and memorable. This is a new visualization paradigm, not a new
data type.

**Why Competitors Don't Do It:**
Line movement charts exist everywhere. A physics/gravity visualization of line
movement does not exist as a commercial product. The visualization is not the
data — the data is commoditized, the visualization is proprietary.

**Data Required:**
- Line movement data from licensed odds provider (The Odds API, currently integrated)
- Sharp money vs. public money split (source gap: requires a licensed data provider
  with action data — not available from The Odds API basic tier)
- Timing of significant moves

**Frontend Surface:**
Extension of Galaxy Slate Twin (`/observatory`). Line movement rendered as
gravitational bodies: a sharp-money move is a massive object pulling the line;
public money fade is a diffuse cloud pushing against it. Time scrubber shows
line history. Click a significant move to see Signal Courtroom evidence for why
the line moved.

**Backend Model/Service:**
Line movement ingestion (already wired via The Odds API). Physics simulation layer
for visualization (client-side, WebGL-based consistent with existing Slate Twin
architecture). Sharp/public split requires additional licensed data source.

**GSE Ecosystem Tie-In:**
- Galaxy Slate Twin (existing): visualization host
- Signal Courtroom (existing): Courtroom evidence for line moves
- Prop-to-Projection Delta Engine (System 35): line movement context for props
- Agent War Room (existing): line movement as a signal in war room debates

**Revenue/Trust/Retention Value:**
Visualization differentiation. Makes a real data signal (line movement) more
intuitive and sticky. Drives engagement time on the observatory surface.

**Legal/Source Risks:**
Line movement data via The Odds API — already licensed. Sharp/public split data
source: must be licensed, not scraped. Source gap: no confirmed source for
sharp/public split data within current GSE rights registry.

**V1 (MVP):**
Line movement chart only (no physics visualization). Source: The Odds API (existing).
Displayed on observatory alongside game card.

**V2 (Full):**
Full physics visualization on Slate Twin. Sharp/public split overlay (requires
licensed source). Time scrubber integration.

**Acceptance Criteria:**
- All line movement data from licensed source only
- Physics visualization clearly labeled as a representation, not a model
- Sharp/public split data source registered in source rights registry before use
- Line movement accuracy verified against external source (spot-check)

---

## 27. Source Health / Legal Gate Map

**Thesis:** Every GSE data pipeline depends on data sources. Those sources can
change their terms, go down, become stale, or be flagged for legal review. The
Source Health / Legal Gate Map is a real-time operational and compliance dashboard
that shows the status of every source in the pipeline and gates content generation
based on source health.

**Why Competitors Don't Do It:**
No competitor exposes a source health and legal compliance dashboard. Source gap:
no documented competitor has a public-facing data source integrity layer.

**Data Required:**
- Source rights registry (existing: `source-rights-registry.ts`)
- Real-time source availability checks (HTTP ping + response validation)
- Freshness metrics for each source (last successful ingest timestamp)
- Legal status change log

**Frontend Surface:**
`/cockpit/source-health` (admin/internal). Traffic light display for every
registered source: legal status, availability, freshness, last check time.
Alert queue for sources with legal status changes or freshness violations.

**Backend Model/Service:**
Source health monitoring service. Periodic availability checks per source.
Freshness gate: any source with ingest timestamp older than its defined SLA
triggers a downstream data freshness flag. Legal gate: any source with status
change to permission_required or blocked triggers automatic suspension of
downstream content generation from that source.

**GSE Ecosystem Tie-In:**
- Scraping Clearance Engine (existing): Source Health gates clearance checks
- Source Rights Registry (existing): data source for this system
- Trust Ledger (System 22): source health state logged with each recommendation
- GSN Transmission (System 31): content generation gated on source health

**Revenue/Trust/Retention Value:**
Internal infrastructure. Prevents legal incidents. Builds operator confidence.
Demonstrates due diligence.

**Legal/Source Risks:**
This system is itself a risk reduction mechanism. No novel legal exposure.

**V1 (MVP):**
Manual status updates to source rights registry. Cockpit page showing current
status. No automated monitoring.

**V2 (Full):**
Automated availability checks. Freshness monitoring. Alert queue. Automated
downstream gating.

**Acceptance Criteria:**
- All active sources registered in source rights registry
- Cockpit page shows current status for all registered sources
- Any source status change triggers an alert to the operator queue
- No content generated from a source with permission_required or excluded status

---

## 28. Revenue Intelligence Cockpit

**Thesis:** GSE needs a single internal view of its business: MRR, conversion
events, upgrade triggers, churn reasons, affiliate revenue, and retention metrics.
This is not a user-facing system — it is the operator nervous system.

**Why Competitors Don't Do It:**
This is internal infrastructure. Competitors have it; they don't publish it.
The differentiation is building it into the GSE operator layer as a first-class
system rather than bolting on Mixpanel/ChartMogul and hoping for the best.

**Data Required:**
- Stripe subscription data (already integrated)
- Authentication events (sign-up, login, upgrade, cancel)
- Feature usage events (which surfaces drive engagement)
- Affiliate click and conversion tracking

**Frontend Surface:**
`/cockpit/revenue` (admin only). MRR trend chart, conversion funnel, churn rate,
upgrade trigger analysis (which actions precede upgrades), affiliate revenue
breakdown. CSV export.

**Backend Model/Service:**
Events pipeline: all user actions emitting to an internal event store. Business
metrics aggregation service computing MRR, churn, LTV, and conversion rates from
Stripe data and event store. Refreshed daily.

**GSE Ecosystem Tie-In:**
- Stripe integration (existing): revenue source
- Feature flags / pricing tiers (existing): tier access data
- Sponsor/Affiliate Integrity Layer (System 29): affiliate revenue data

**Revenue/Trust/Retention Value:**
Operational necessity. Required for making pricing, feature, and marketing
decisions. Not directly user-facing.

**Legal/Source Risks:**
All data is GSE-generated from Stripe and internal events. No third-party data
rights issues. GDPR/CCPA: aggregate business metrics do not contain PII. Individual
user event data subject to privacy policy and data retention rules.

**V1 (MVP):**
MRR from Stripe, subscription count by tier, new subs vs. churn last 30 days.
Manual Stripe dashboard supplemented by a simple summary page.

**V2 (Full):**
Full funnel analytics. Feature-to-upgrade correlation. Cohort retention charts.
Affiliate revenue tracking.

**Acceptance Criteria:**
- MRR figure matches Stripe dashboard within $5 (rounding tolerance)
- Cockpit accessible to admin role only
- No PII in exported CSV reports
- Churn reason tracking requires user-provided reason on cancel (not inferred)

---

## 29. Sponsor/Affiliate Integrity Layer

**Thesis:** GSE will have sportsbook affiliate relationships. These relationships
must be strictly separated from prediction recommendations. The Integrity Layer
enforces this separation technically, not just through policy.

**Why Competitors Don't Do It:**
Most competitor picks sites mix affiliate recommendations with analysis. The
separation is policy-only, not technical. GSE enforces it architecturally.

**Data Required:**
- Sponsor/affiliate registry (operator registry, partially built)
- Affiliate link tracking
- Disclosure requirements by state/jurisdiction

**Frontend Surface:**
All affiliate links display a prominent "Partner" badge with FTC-compliant
disclosure language. Sponsor mentions in content are marked. No affiliate link
appears inside a Signal Courtroom case, Agent War Room debate, or Trust Ledger
record.

**Backend Model/Service:**
Affiliate link router: all outbound affiliate links pass through the integrity layer
which appends tracking parameters and verifies the destination is a registered
approved partner. System prevents affiliate links from being injected into
prediction content programmatically.

**GSE Ecosystem Tie-In:**
- Operator Registry (existing): source of approved partners
- Signal Courtroom (existing): hard gate — no affiliate links in Courtroom cases
- GSN Transmission (System 31): content pipeline checks for affiliate contamination
- Revenue Intelligence Cockpit (System 28): affiliate revenue tracked separately

**Revenue/Trust/Retention Value:**
Trust protection. If a user discovers that a prediction recommendation was
influenced by an affiliate relationship, GSE loses credibility permanently.
The technical separation is the proof.

**Legal/Source Risks:**
FTC endorsement disclosure rules (16 CFR Part 255). State-level sports betting
advertising rules vary (see Document 3, Section 5). No "lock," "guaranteed win,"
or similar prohibited language in any sponsored content.

**V1 (MVP):**
Manual affiliate link registry. Hard rule: no affiliate links in Courtroom or
War Room components. FTC disclosure badge on all partner links.

**V2 (Full):**
Automated affiliate link router. Content pipeline contamination check. State-specific
disclosure language injection based on user jurisdiction.

**Acceptance Criteria:**
- Zero affiliate links appear inside Signal Courtroom or Agent War Room
- All partner links display FTC disclosure badge
- Affiliate revenue tracked in Revenue Intelligence Cockpit separately from
  subscription revenue
- State-specific restricted content gating functional (e.g., no sportsbook
  affiliate content in states where sports betting is illegal)

---

## 30. Founder Desk / Premium Concierge

**Thesis:** Elite-tier subscribers at the top of the pricing ladder deserve a
personal relationship with the product. The Founder Desk is the human-layer
touchpoint: personal strategy sessions, custom draft boards, phone/video support,
and early access to features before they are generally available.

**Why Competitors Don't Do It:**
No digital fantasy/sports analytics platform offers a personal strategy session
as part of a subscription tier. Source gap: no documented competitor offers Elite-
tier personalized consulting at a $24.99/month price point.

**Data Required:**
- User's League Memory Graph data
- User's Manager Genome
- User's Bias Mirror report
- Upcoming draft/season context

**Frontend Surface:**
`/elite/founder-desk` (Elite tier only). Calendar scheduling for 1:1 sessions.
Secure message thread with GSE team. Custom draft board download (personalized to
user's league settings and Manager Genome data). Early access feature flags.

**Backend Model/Service:**
Calendly or equivalent scheduling integration. Secure messaging thread backed by
internal database (not external messaging platform). Early access feature flag
system. Custom draft board generation service (personalized exports from War Room).

**GSE Ecosystem Tie-In:**
- League Memory Graph (System 4): context for strategy sessions
- User Bias Mirror (System 25): pre-session briefing for GSE team
- Fantasy War Room (System 2): custom draft board source
- Revenue Intelligence Cockpit (System 28): Elite churn monitoring

**Revenue/Trust/Retention Value:**
Elite-tier retention anchor. The personal relationship makes cancellation feel like
ending a relationship, not turning off a subscription. High LTV users.

**Legal/Source Risks:**
Strategy sessions are consulting, not financial advice. Session disclaimers required.
No guarantees of outcomes. Scheduling data subject to privacy policy.

**V1 (MVP):**
Email-based scheduling (no calendar integration). Custom draft board as a PDF export.
Async message thread via existing email infrastructure.

**V2 (Full):**
In-app calendar scheduling. Secure message thread. Early access feature flag system.
Video session option.

**Acceptance Criteria:**
- Founder Desk accessible only to confirmed Elite subscribers
- Every session includes a disclaimer that this is educational consultation, not
  financial advice
- Response time SLA: 24 hours for async messages
- Custom draft board uses user's actual league settings and Manager Genome data

---

## 31. GSN Transmission Media Flywheel

**Thesis:** GSE's intelligence pipeline generates publishable insights every week:
waiver wire rankings, draft recaps, pick analysis, injury impact analysis, line
movement summaries. The GSN Transmission Flywheel turns this intelligence into
content without requiring separate manual research — the content is a byproduct of
the analysis the system is already running.

**Why Competitors Don't Do It:**
Most picks sites produce content as a primary output. GSE's content is a secondary
output of its decision intelligence pipeline. This means the content is backed by
the same trust infrastructure as the recommendations themselves. No competitor
has this structural content advantage.

**Data Required:**
- All GSE recommendation outputs for the week
- Trust Ledger data (anonymized)
- Calibration statistics
- Line movement data
- Narrative classification data

**Frontend Surface:**
Public `/transmissions` page with weekly content pieces. Each piece shows its
intelligence source (which GSE system generated the underlying analysis) and a
Trust Ledger badge (this analysis was pre-committed, not post-hoc). Email
newsletter distribution (existing email sequence infrastructure).

**Backend Model/Service:**
Content generation pipeline using Claude API against structured data inputs
(not freeform). Templates for each content type: Weekly Waiver Wire (structured),
Draft Recap (structured), Pick Analysis (structured). Human editorial review before
publication. Auto-publish gated off — editorial approval required.

**GSE Ecosystem Tie-In:**
- Signal Courtroom (existing): Courtroom evidence feeds pick analysis content
- Trust Ledger (System 22): badges for pre-committed analysis
- Source Health / Legal Gate Map (System 27): content generation gated on source
- Autopsy/Calibration Engine (System 23): calibration stats in content
- Sponsor/Affiliate Integrity Layer (System 29): content contamination check

**Revenue/Trust/Retention Value:**
SEO flywheel: high-quality content drives organic search traffic which drives
free-tier signups which drive conversions. Content quality is self-auditing
(Trust Ledger backing).

**Legal/Source Risks:**
All content generated from GSE-owned analysis, not republication of external content.
Claude API-generated content must be labeled as AI-assisted. No article text from
third-party sources republished. Affiliate disclosure rules apply to any sportsbook
mentions in content.

**V1 (MVP):**
Weekly waiver wire post. Generated from Projection Factory + Narrative Intelligence
Engine outputs. Human editorial review required before publish. Manual publish.

**V2 (Full):**
Three content types weekly. Automated draft trigger (generated when source data is
ready, queued for human review). Email distribution. SEO metadata generation.

**Acceptance Criteria:**
- Zero content published without human editorial review
- AI-generated content labeled at publication
- No third-party article text republished
- All source data in published content from rights-cleared sources
- Affiliate links subject to Integrity Layer check before publication

---

## 32. No-Play Discipline System

**Thesis:** The most valuable recommendation GSE can make is sometimes "don't play
this." Most picks tools have a structural bias toward recommending action because
they are judged on pick wins and revenue depends on engagement. GSE makes No-Play,
No-Bet, and Watchlist first-class outcomes and tracks abstention accuracy separately.

**Why Competitors Don't Do It:**
No picks site prominently tracks or grades its No-Play recommendations. The
incentive structure is against it — no-plays don't generate affiliate clicks and
don't produce content. Source gap: no documented competitor separately tracks and
publishes No-Play accuracy.

**Data Required:**
- All GSE No-Play recommendations (stored in Trust Ledger)
- Outcomes for the games/players marked No-Play
- Abstention accuracy calculation

**Frontend Surface:**
No-Play badge as prominent as the Play badge across all recommendation surfaces.
Weekly No-Play summary in GSN Transmission (System 31). `/performance/no-plays`
page showing historical No-Play recommendations and outcomes.

**Backend Model/Service:**
No additional service required. Trust Ledger extended with verdict type
NO_PLAY | NO_BET | WATCHLIST. Calibration engine includes No-Play accuracy in
its calibration report.

**GSE Ecosystem Tie-In:**
- Signal Courtroom (existing): NO_BET verdict is already a first-class Courtroom
  outcome
- Trust Ledger (System 22): No-Play records stored here
- Autopsy/Calibration Engine (System 23): No-Play accuracy tracked in calibration
- GSN Transmission (System 31): No-Play summary content type

**Revenue/Trust/Retention Value:**
Trust builder. Publishing accurate No-Play recommendations proves GSE is not just
an action-pusher. Long-term credibility that attracts serious users.

**Legal/Source Risks:**
No additional legal exposure. No-Play recommendations have the same disclosure
requirements as Pick recommendations (not financial advice, not guaranteed).

**V1 (MVP):**
No-Play verdict type in Signal Courtroom and Trust Ledger. Display on recommendation
cards. Tracked in calibration report.

**V2 (Full):**
Dedicated No-Play performance page. Weekly No-Play summary content. Abstention
accuracy as a headline metric in calibration report.

**Acceptance Criteria:**
- No-Play verdict displayed with the same visual weight as Play verdict
- No-Play records stored in Trust Ledger identically to Play records
- No-Play accuracy tracked separately in calibration report
- No-Play recommendation rate publicly visible (what % of GSE signals are No-Play)

---

## 33. User Portfolio of Decisions

**Thesis:** Every user who uses GSE builds a personal portfolio of decisions: every
pick accepted, every recommendation rejected, every waiver claim made, every DFS
entry. This portfolio is the user's personal track record. It is theirs, it is
auditable, and it compounds in value as they use GSE more.

**Why Competitors Don't Do It:**
No fantasy or picks platform builds a personal decision portfolio for the user
that tracks their individual accept/reject history against outcomes. Source gap: no
documented competitor provides a personal decision track record with outcome grading.

**Data Required:**
- User's complete decision history in GSE (Decision Graph, System 1)
- Outcomes for all settled decisions
- Process grades from GM Ledger (existing)

**Frontend Surface:**
`/profile/portfolio` — personal decision portfolio. By season, by decision type.
Win rate for accepted picks vs. recommendations user rejected. Process grade
distribution (Earned/Lucky/Respected/Corrected matrix from existing Autopsy).
Personal calibration curve.

**Backend Model/Service:**
Portfolio aggregation service. Reads from Decision Graph (System 1). Computes:
accept/reject rates, accepted recommendation accuracy vs. rejected recommendation
accuracy (to check if user's overrides add or subtract value), personal calibration
statistics. Refreshed after each game week settles.

**GSE Ecosystem Tie-In:**
- Decision Graph (System 1): data source
- GM Ledger (existing): process grades
- Autopsy/Calibration Engine (System 23): calibration data
- User Bias Mirror (System 25): behavioral patterns visible in portfolio
- Trust Ledger (System 22): immutable source of all decision records

**Revenue/Trust/Retention Value:**
Primary retention mechanism for engaged users. The portfolio grows more valuable
every season. It is genuinely portable (user can export it) which builds trust.

**Legal/Source Risks:**
All user-specific data. GDPR/CCPA right-to-deletion and right-to-portability apply.
Export feature required for compliance.

**V1 (MVP):**
By-season list of accepted GSE recommendations with outcome labels. Win rate
summary. No process grading.

**V2 (Full):**
Full portfolio view. Accept vs. reject comparison. Personal calibration curve.
Process grade distribution. JSON export.

**Acceptance Criteria:**
- Portfolio shows all accepted GSE recommendations (not just successful ones)
- Accept/reject comparison methodology documented publicly
- JSON export functional and includes all recommendation metadata
- Right-to-deletion removes portfolio data without corrupting aggregate calibration

---

## 34. League Exploit Map

**Thesis:** Every fantasy league has systematic mispricing patterns. One league
always undervalues TEs until round 6. Another always overdrafts RBs from the home
team. Another league never bids above $30 on any player in auctions. These patterns
are exploitable by a manager who has the data. The League Exploit Map quantifies
the exploitable gaps in a specific league's historical behavior.

**Why Competitors Don't Do It:**
No tool performs exploit analysis on a specific private league. Generic ADP data
applies to all leagues equally. League-specific exploit maps require per-league
historical data that only GSE (via League Memory Graph) can provide.

**Data Required:**
- Full League Memory Graph data for the target league (System 4)
- Historical Manager Genome data for all managers (System 5)
- ADP benchmarks at each draft time for comparison

**Frontend Surface:**
`/fantasy/league-memory/exploit-map` — heat map of the league's systematic pricing
gaps. For each position and player archetype: "This league drafts RBs 0.8 rounds
earlier than market." Auction map: "This league bids 12% less than market on TEs."
Exploit cards with specific draft strategy implications.

**Backend Model/Service:**
Exploit detection service. For each position archetype: compare historical draft
ADP in this league to market ADP at draft time. Identify systematic deviations
(minimum N picks for statistical significance). Flag exploitable patterns with
confidence scores.

**GSE Ecosystem Tie-In:**
- League Memory Graph (System 4): source data
- Manager Genome (System 5): individual-level patterns aggregate to league level
- Fantasy War Room (System 2): Exploit Map informs War Room strategy
- Draft Futures Engine (System 3): Futures Engine uses exploit patterns in
  opponent modeling

**Revenue/Trust/Retention Value:**
Unique competitive intelligence available only through GSE. The Exploit Map is the
answer to "what does GSE know about my league that I don't?" It is the clearest
articulation of the League Memory Graph's value.

**Legal/Source Risks:**
Exploit Map is derived analysis from the user's own uploaded league data. No third-
party data rights issue. Manager behavioral data must comply with GDPR/CCPA
profiling considerations (other managers are profiled without their consent to GSE
terms). See Document 3, Section 8.

**V1 (MVP):**
Positional draft deviation map only. Requires minimum 3 seasons of draft data.
Display as a simple table.

**V2 (Full):**
Full heat map visualization. Auction deviation map. Individual manager exploit
analysis. Draft strategy integration with War Room.

**Acceptance Criteria:**
- No exploit map score displayed without minimum 3 seasons or 100 picks of data
- Confidence intervals displayed for all estimates
- Privacy notice explains behavioral profiling of non-GSE-users to uploading user
- Exploit recommendations clearly labeled as historical patterns, not predictions

---

## 35. Prop-to-Projection Delta Engine

**Thesis:** Player props set by sportsbooks reflect the market's consensus on
player performance. GSE's Projection Factory has a different estimate. When the
divergence is meaningful — and in a specific direction — it is an analytically
interesting signal. The Prop-to-Projection Delta Engine surfaces these divergences
with explicit explanations.

**Why Competitors Don't Do It:**
Some prop-betting tools compare props to projections. None connect this analysis
to a full intelligence stack (Narrative Classification, Coach Intent, Market
Movement history, Trust Ledger). The data is commoditized; the integration is not.

**Data Required:**
- Player prop lines from licensed odds source (The Odds API — must confirm prop
  coverage; source gap: The Odds API basic tier may not cover all prop markets)
- GSE Projection Factory outputs for same players and stats
- Narrative Intelligence Engine classifications for active player narratives

**Frontend Surface:**
`/props` page — player prop divergence table. For each divergence above threshold:
player, stat type, market line, GSE projection, delta, delta direction (over-
valued or undervalued by market), active narratives affecting this player,
confidence. Signal Courtroom case linked for each significant divergence.

**Backend Model/Service:**
Delta calculation service. For each player with both a prop line and a GSE
projection: calculate delta as (GSE projection - market line). Apply threshold
filter (only surface deltas > X% of market line). Attach Narrative Intelligence
classifications. Generate Courtroom case for significant deltas.

**GSE Ecosystem Tie-In:**
- Projection Factory (System 11): GSE projection input
- Signal Courtroom (existing): Courtroom cases for significant deltas
- Narrative Intelligence Engine (System 13): narrative context for deltas
- Narrative Inflation Detector (System 14): check if narrative is inflating prop
- Market Gravity (System 26): line movement context for the prop

**Revenue/Trust/Retention Value:**
This is the most direct "edge" surface for serious bettors. It surfaces where GSE
disagrees with the market and why. Must include explicit disclaimer that divergence
is not evidence of guaranteed edge — it is an analytically interesting signal that
requires the user's own judgment.

**Legal/Source Risks:**
This surface is closest to sports betting advisory territory. Disclaimer requirements
are strong here. "Positive EV" language should be used carefully — it implies a
mathematical edge that assumes the projection is correct, which it never is with
certainty. Preferred language: "GSE projection diverges from market by X." Affiliate
disclosure required if any sportsbook links appear on this page.

**V1 (MVP):**
Manual prop entry. GSE projection comparison. Delta display. Disclaimer. No
Courtroom integration.

**V2 (Full):**
Automated prop ingestion via The Odds API (if prop coverage confirmed). Courtroom
case generation. Narrative context. Confidence thresholds. Historical delta accuracy
tracking.

**Acceptance Criteria:**
- Prominent disclaimer on all prop divergence content: this is analysis, not
  financial or betting advice; divergence from market does not guarantee edge
- All prop data from licensed source only
- GSE projection version displayed with each delta
- Historical accuracy of "GSE above market" vs. "GSE below market" predictions
  tracked and published
- No sportsbook affiliate links on props page without FTC disclosure

---

*End of GSE 2026 First-of-Kind Product Systems Map*

*Source gaps noted throughout must be resolved before implementation. No system
may be built using data sources that have not been registered in the source rights
registry with a cleared status.*
