# GSE 2026 — Decision Graph Ontology (Workstream C)

Status: internal research doc. Companion to the typed contract
`apps/web/lib/gse/decision-ontology.ts` (to be authored; this doc is the spec). Read
alongside Workstream B (`docs/research/GSE_2026_DATA_EXCELLENCE_SYSTEM.md`), which supplies
the provenance envelope, Data Quality Score (DQS), rights posture, and Claim Safety Gate that
every entity below inherits.

Thesis: Galaxy Sports Edge is **one connected sports-decision knowledge graph**, not a drawer
of isolated tools. A market pick, a fantasy lineup, a piece of content, and a trust receipt
are all paths through the same graph: facts → evidence → signals → recommendation →
decision → outcome → autopsy. Modeling it as a graph is what lets the same evidence and the
same calibration serve every surface, and lets every claim be traced back to its sources.

Where a value is not yet known it is marked `(uncertain)`.

---

## 0. Universal envelope (inherited by every fact-bearing entity)

From Workstream B §4.0. Every entity that asserts a fact about the world carries:
`source_id`, `observed_at`, `captured_at`, `normalization_version`, `confidence`,
`freshness`, `rights_snapshot`, `dqs`. Pure-reference entities (Sport, League, Book) carry a
lighter envelope (no freshness/confidence) but still record provenance and version.

Per-entity, the spec below names four operational attributes:

- **source req** — what kind of source is required to populate it,
- **confidence req** — whether a confidence value is mandatory before it can back a claim,
- **freshness req** — how time-sensitive it is,
- **public/private** — whether it may surface to free/public users or is private/internal,
- plus **audit req**, **UI surfaces**, **downstream systems**.

`public/private` is constrained by both the subscription tier model (free vs Pro vs Elite)
**and** the source rights posture: a value from a `commercial_display_allowed=false` source
is private regardless of tier.

---

## 1. Core entities (full list)

The complete entity set the ontology defines:

Sport, League, Season, Week, Slate, Game, Team, Player, Coach, Injury, DepthChart,
PracticeReport, BeatReport, NewsItem, Source, Market, Book, OddsSnapshot, Prop, LineMovement,
Projection, OwnershipProjection, ModelRun, Signal, NarrativeSignal, Evidence, CounterEvidence,
Falsifier, RiskFlag, Recommendation, UserDecision, UserAction, Portfolio, Lineup, Draft,
DraftPick, LeagueMemory, ManagerGenome, WaiverClaim, Trade, Roster, FantasyTeam, ContentPiece,
GSNTransmission, AcademyScenario, TrustReceipt, Autopsy, CalibrationResult, RevenueEvent,
SubscriptionPlan, UserSegment, AgentRun, JarvisConversation.

The ~20 high-value entities are specified in detail in §2. The remainder are reference or
satellite nodes summarized in §3.

---

## 2. High-value entity specifications

### 2.1 Game
- **Fields**: game_id, slate_id, league_id, season, week, home_team_id, away_team_id,
  scheduled_at, status, venue, weather_ref(optional).
- **source req**: scores/schedule source (`the-odds-api`, `espn-public-api`, `nflverse`).
- **confidence req**: low (schedule is near-fact); status transitions timestamped.
- **freshness req**: high during live windows (status/score), low pre-game (schedule).
- **public/private**: public.
- **audit req**: status transitions append-only.
- **UI surfaces**: slate view, game card, live cockpit.
- **downstream**: Market, Projection, Recommendation, Autopsy.

### 2.2 Team
- **Fields**: team_id, league_id, names/abbreviations, roster_ref.
- **source req**: league/open dataset.
- **confidence req**: low (reference).
- **freshness req**: low (roster changes are the volatile part, held in Roster).
- **public/private**: public.
- **audit req**: standard versioning.
- **UI surfaces**: team page, matchup header.
- **downstream**: Player.plays_for, Game, FantasyTeam.

### 2.3 Player
- **Fields**: canonical_id, aliases[], team_id, position, status, depth_rank(ref).
- **source req**: roster/depth source; aliases reconcile cross-source ID drift.
- **confidence req**: medium (status/role can be contested).
- **freshness req**: high around injury/depth news.
- **public/private**: public (identity); some derived role signals private.
- **audit req**: status/team changes append-only (trades, IR).
- **UI surfaces**: player card, lineup builder, prop view.
- **downstream**: Projection, OwnershipProjection, Prop, Lineup, Injury, ManagerGenome.

### 2.4 Injury
- **Fields**: player_id, designation, body_part, reported_at, source_id, practice_status(ref).
- **source req**: official/team report or beat report; **multi-source confirmation preferred**.
- **confidence req**: mandatory — injuries are contradiction-prone; single-source ⇒ capped at `amber`.
- **freshness req**: very high (designations flip near kickoff).
- **public/private**: public when from a public source; gated otherwise.
- **audit req**: every change kept; contradictions recorded via Truth Maintenance.
- **UI surfaces**: injury feed, player card flag, RiskFlag on recommendations.
- **downstream**: Projection, RiskFlag, Recommendation, Falsifier.

### 2.5 BeatReport
- **Fields**: subject (player/team), claim_text (paraphrase only), reporter, source_id,
  reported_at, stance.
- **source req**: news source; **paraphrase + attribution only — never article body**
  (data-rules; high copyright-expression risk sources stay manual/facts-only).
- **confidence req**: mandatory; reporter reliability factors into DQS.
- **freshness req**: high.
- **public/private**: paraphrase + attribution may surface; raw text never republished.
- **audit req**: attribution must propagate to any derived signal.
- **UI surfaces**: news rail, evidence drawer.
- **downstream**: Evidence, NarrativeSignal, Injury(corroboration).

### 2.6 NarrativeSignal
- **Fields**: subject, signal_type, **allowed_impact_type**, magnitude, direction, source_id.
- **source req**: beat/news/derived; must trace to a real source.
- **confidence req**: mandatory; narrative is the easiest place to overstate.
- **freshness req**: medium–high.
- **public/private**: usually private until validated; effects surface, not the raw narrative.
- **audit req**: must record which `allowed_impact_type` it used.
- **UI surfaces**: evidence drawer, "why" panel (effect only).
- **downstream**: affects **only** Projection / OwnershipProjection / volatility, and **only**
  through declared allowed impact types (see §5.3). Never a direct, free-form input to a pick.

### 2.7 Market
- **Fields**: market_id, game_id, market_type (spread/total/moneyline/prop), participants.
- **source req**: odds provider (`the-odds-api`).
- **confidence req**: low (the market exists); pricing volatility lives in OddsSnapshot.
- **freshness req**: high.
- **public/private**: public (market definition).
- **audit req**: standard.
- **UI surfaces**: odds board, market selector.
- **downstream**: OddsSnapshot, Prop, LineMovement, Recommendation.

### 2.8 OddsSnapshot
- **Fields**: snapshot_id, book_id, market_id, price, line, captured_at.
- **source req**: licensed odds API (`approved_api`); display/storage rights confirmed.
- **confidence req**: low value-confidence (it is a captured fact) but **freshness-gated**.
- **freshness req**: very high — never labeled "current" without re-check.
- **public/private**: public if `commercial_display_allowed` (true for `the-odds-api`).
- **audit req**: immutable snapshot; sequence forms LineMovement.
- **UI surfaces**: odds board, line-movement chart, recommendation context.
- **downstream**: LineMovement, Recommendation, Autopsy (closing-line comparison).

### 2.9 LineMovement
- **Fields**: market_id, from_snapshot, to_snapshot, delta, interval.
- **source req**: derived from ≥2 OddsSnapshots (same market/book).
- **confidence req**: medium (depends on snapshot coverage/gaps).
- **freshness req**: high.
- **public/private**: Pro/Elite feature per tier model.
- **audit req**: references the exact snapshots it was built from.
- **UI surfaces**: line-movement chart, "sharp move" flag.
- **downstream**: Signal, Recommendation context.

### 2.10 Projection
- **Fields**: entity_id, stat, distribution OR point+interval, model_run_id, scope(game/season).
- **source req**: derived (ModelRun); inputs must be cleared sources.
- **confidence req**: mandatory; **must carry an interval, never a bare point** (no-overstate).
- **freshness req**: high (rebuilds on injury/line news).
- **public/private**: gated by tier; confidence scores are a paid feature.
- **audit req**: full lineage to model_run + inputs (replayable).
- **UI surfaces**: projection table, lineup optimizer, prop comparison.
- **downstream**: Recommendation, Lineup, OwnershipProjection (interaction), Autopsy.

### 2.11 OwnershipProjection
- **Fields**: entity_id, slate_id, projected_ownership_pct, model_run_id.
- **source req**: derived; field-behavior model.
- **confidence req**: mandatory (estimate, often wide intervals).
- **freshness req**: medium–high (moves with news/narrative).
- **public/private**: fantasy/DFS feature, tier-gated.
- **audit req**: model_run lineage.
- **UI surfaces**: leverage view, lineup optimizer.
- **downstream**: Lineup construction, Recommendation (contrarian/leverage logic).

### 2.12 ModelRun
- **Fields**: model_run_id, model_version, inputs_ref[], params, started_at, finished_at, status.
- **source req**: N/A (it is the producer); but every input must be a cleared, scored record.
- **confidence req**: emits confidence; carries its own run-health.
- **freshness req**: tied to input freshness.
- **public/private**: internal; only its outputs surface.
- **audit req**: **the** replayability anchor — must reconstruct outputs from inputs+version.
- **UI surfaces**: internal model monitor; "model version" badge on outputs.
- **downstream**: Projection, OwnershipProjection, Signal, Recommendation, CalibrationResult.

### 2.13 Signal
- **Fields**: signal_id, type, subject, magnitude, direction, evidence_ids[], model_run_id(opt).
- **source req**: built from Evidence (which traces to sources).
- **confidence req**: mandatory.
- **freshness req**: medium–high.
- **public/private**: effect surfaces; raw signal often private.
- **audit req**: must list its supporting Evidence and any CounterEvidence.
- **UI surfaces**: "why" panel, evidence drawer.
- **downstream**: Recommendation.

### 2.14 Evidence
- **Fields**: evidence_id, claim, supports_signal_id, source_id, weight, observed_at.
- **source req**: must trace to a registered, cleared source.
- **confidence req**: mandatory (weight reflects source reliability + freshness).
- **freshness req**: varies by underlying fact.
- **public/private**: attribution-bearing evidence may surface; rights-gated content may not.
- **audit req**: attribution propagates to every output that cites it.
- **UI surfaces**: evidence drawer, TrustReceipt detail.
- **downstream**: Signal, Recommendation, Autopsy.

### 2.15 CounterEvidence
- **Fields**: counter_evidence_id, challenges_signal_id, claim, source_id, weight.
- **source req**: registered source; symmetric to Evidence.
- **confidence req**: mandatory.
- **freshness req**: same as the signal it challenges.
- **public/private**: should surface alongside the signal it challenges (honest framing).
- **audit req**: recorded even when the recommendation proceeds anyway (no cherry-picking).
- **UI surfaces**: "what could be wrong" panel.
- **downstream**: lowers Signal/Recommendation confidence; can seed a Falsifier.

### 2.16 Falsifier
- **Fields**: falsifier_id, recommendation_id, condition, **can_flip** (bool), threshold.
- **source req**: derived; condition references observable facts (e.g. injury, line move).
- **confidence req**: mandatory.
- **freshness req**: high — a falsifier is a live tripwire.
- **public/private**: surfacing it is a trust feature ("this changes if X happens").
- **audit req**: if the condition fires, the recommendation state change is recorded.
- **UI surfaces**: recommendation card ("invalidates if…"), alert trigger (Elite).
- **downstream**: can flip / retire a Recommendation; feeds RiskFlag and alerts.

### 2.17 Recommendation
- **Fields**: rec_id, subject (game/player/market), claim, pick_type, line, confidence, tier
  (free/premium), model_run_id, evidence_ids[], counter_evidence_ids[], falsifier_ids[],
  generated_at, model_version.
- **source req**: must reference ≥1 cleared source via its evidence chain.
- **confidence req**: **mandatory and visible** (0–100, calibrated); passes Claim Safety Gate.
- **freshness req**: high; tied to a `generated_at` and re-evaluated against falsifiers.
- **public/private**: free tier sees a limited set without confidence scores; Pro/Elite see all.
- **audit req**: fully versioned and replayable; this is the auditable unit (per CLAUDE.md).
- **UI surfaces**: pick card, slate board, content embeds.
- **downstream**: UserDecision, TrustReceipt, Autopsy, ContentPiece, GSNTransmission.

### 2.18 UserDecision
- **Fields**: decision_id, rec_id, user_id, action (accept/reject/modify), decided_at, stake(opt).
- **source req**: user-generated (first-party event).
- **confidence req**: N/A (it is an action, not a claim).
- **freshness req**: timestamped at decision time.
- **public/private**: private to the user.
- **audit req**: append-only; basis for ManagerGenome and personal autopsies.
- **UI surfaces**: decision log, portfolio, history.
- **downstream**: Portfolio, ManagerGenome, Autopsy, CalibrationResult (personal).

### 2.19 Autopsy
- **Fields**: autopsy_id, rec_id, outcome, source_verdicts[], contradiction_verdict, lessons[].
- **source req**: settled outcome source + the original lineage.
- **confidence req**: reports confidence-vs-reality; does not assert new fact-claims.
- **freshness req**: runs post-settlement (not time-critical, but ordered).
- **public/private**: aggregate calibration is public (track record); per-pick detail tiered.
- **audit req**: adjusts future trust only; never rewrites history (Truth Maintenance).
- **UI surfaces**: track-record page, calibration report, "what we learned".
- **downstream**: CalibrationResult, Source reliability/historical_accuracy updates.

### 2.20 CalibrationResult
- **Fields**: scope (model/source/overall), bucket, predicted, observed, sample_n, computed_at.
- **source req**: derived from settled Autopsies.
- **confidence req**: reports calibration; sample_n must be honest (no thin-sample claims).
- **freshness req**: recomputed on a schedule / on new settlements.
- **public/private**: published calibration is a **public** trust artifact (also a pricing-ladder gate).
- **audit req**: versioned; feeds confidence weighting transparently.
- **UI surfaces**: public calibration page, reliability badges.
- **downstream**: ModelRun confidence weights, Source reliability, Recommendation confidence.

### 2.21 TrustReceipt (high-value, trust domain)
- **Fields**: receipt_id, rec_id, frozen_state (claim+confidence+evidence_ids+model_version+
  generated_at), frozen_at, hash.
- **source req**: snapshots an existing Recommendation; no new external source.
- **confidence req**: freezes the confidence as-shown (so it cannot be retro-edited).
- **freshness req**: a point-in-time freeze by definition.
- **public/private**: shareable proof artifact; user-controlled visibility.
- **audit req**: **immutable** — this is the anti-revisionism guarantee.
- **UI surfaces**: shareable receipt, track-record proof.
- **downstream**: track record, Autopsy comparison (what was shown vs outcome).

---

## 3. Remaining entities (reference / satellite)

- **Sport / League / Season / Week / Slate**: reference scaffolding (time + grouping). Public,
  low confidence req, low freshness (except Slate windows). Anchor for everything.
- **Coach / DepthChart / PracticeReport / NewsItem**: context/evidence feeders into Signal,
  Injury, Projection. Source-required, attribution-bearing.
- **Source / Book**: reference nodes; `Source` is the operational view joined to the rights
  registry (Workstream B §1); `Book` is a sportsbook identity for OddsSnapshot.
- **Prop**: a Player-level Market specialization; same rules as Market/OddsSnapshot.
- **Portfolio / Lineup / Roster / FantasyTeam / Draft / DraftPick / WaiverClaim / Trade**:
  fantasy-domain decision structures built from Player + Projection + UserDecision. Private to
  user; audit req on every roster change.
- **LeagueMemory / ManagerGenome**: durable fantasy memory and **inferred** manager style.
  ManagerGenome is derived, never presented as fact about a person; private.
- **ContentPiece / GSNTransmission / AcademyScenario**: content/teaching domain — generated
  from Recommendations + Evidence; must inherit attribution and pass the Claim Safety Gate.
- **RiskFlag**: a surfaced warning attached to a Recommendation (injury, stale data, thin
  sample, open contradiction). Always visible when present.
- **UserAction / ProductEvent-like**: granular product telemetry (private).
- **RevenueEvent / SubscriptionPlan / UserSegment**: revenue domain (subscribe/upgrade/churn,
  plan definitions, cohorts). Private; billing source of truth is Stripe webhooks server-side.
- **AgentRun / JarvisConversation**: agent-domain — a record of an autonomous/assistant run and
  a user-facing assistant conversation. AgentRun is auditable like ModelRun; JarvisConversation
  is private to the user and must also pass the Claim Safety Gate on anything it asserts.

---

## 4. Key relationships (graph edges)

| Edge | From → To | Meaning |
|---|---|---|
| `plays_for` | Player → Team | roster membership (time-bounded) |
| `appears_in` | Player → Game | participation in a game |
| `belongs_to` | Game → Slate | game is part of a slate |
| `prices` | OddsSnapshot → Market | a snapshot is a price for a market |
| `quotes` | Book → OddsSnapshot | which book a snapshot came from |
| `supports` | Source → Evidence | a source backs a piece of evidence |
| `supports` | Evidence → Signal | evidence backs a signal |
| `challenges` | CounterEvidence → Signal | counter-evidence weakens a signal |
| `can_flip` | Falsifier → Recommendation | a falsifier condition can invalidate a rec |
| `generated_from` | Recommendation → ModelRun | which run produced the rec |
| `references` | Recommendation → Evidence | the evidence a rec cites |
| `accepts_or_rejects` | UserDecision → Recommendation | user acts on a rec |
| `evaluates` | Autopsy → Recommendation | post-hoc review of a rec vs outcome |
| `updates` | CalibrationResult → Model/Source confidence | calibration feeds trust weights |
| `affects` | NarrativeSignal → Projection/OwnershipProjection/volatility | **only via allowed impact types (§5.3)** |
| `freezes` | TrustReceipt → Recommendation | freezes rec state at a point in time |

These edges are the connective tissue: the same `supports`/`references` chain that powers a
market pick also powers a fantasy lineup note and a content explanation. One graph, many
surfaces.

### 4.1 Canonical path (market pick)

```
Source → Evidence → Signal → ModelRun → Projection → Recommendation
   ↑                          (OddsSnapshot/LineMovement also feed ModelRun)
CounterEvidence challenges Signal; Falsifier can_flip Recommendation.
Recommendation → UserDecision → outcome → Autopsy → CalibrationResult → (back to trust weights)
TrustReceipt freezes Recommendation along the way.
```

### 4.2 Canonical path (fantasy)

```
Player/Projection/OwnershipProjection → Lineup/Roster decisions → UserDecision
LeagueMemory + ManagerGenome personalize; Autopsy/Calibration close the loop.
```

---

## 5. Domain groupings

The single graph is partitioned into domains for ownership and reasoning, but the entities
are shared, not copied.

### 5.1 Domains

| Domain | Core entities |
|---|---|
| **market** | Game, Market, Book, OddsSnapshot, Prop, LineMovement, Projection, Signal, Recommendation |
| **fantasy** | Player, Roster, FantasyTeam, Lineup, Draft, DraftPick, WaiverClaim, Trade, OwnershipProjection, LeagueMemory, ManagerGenome |
| **content** | ContentPiece, GSNTransmission, AcademyScenario, NewsItem |
| **trust** | Evidence, CounterEvidence, Falsifier, RiskFlag, Autopsy, CalibrationResult, TrustReceipt |
| **revenue** | RevenueEvent, SubscriptionPlan, UserSegment |
| **agents** | ModelRun, AgentRun, JarvisConversation |

### 5.2 Cross-domain rule

The **trust** domain is not optional decoration: market and fantasy recommendations must
route through trust (Evidence/CounterEvidence/Falsifier → Autopsy → CalibrationResult) before
and after surfacing. Content and agents may only assert what trust has cleared (Claim Safety
Gate). Revenue is downstream of decisions and must never influence what a recommendation says.

### 5.3 Allowed impact types (NarrativeSignal constraint)

A `NarrativeSignal` may influence outputs **only** through a small, declared set of impact
types, and **only** on Projection, OwnershipProjection, or volatility — never as a free-form
input to a pick. Candidate allowed impact types `(uncertain — to be fixed in the contract)`:

- `adjust_projection_mean` (bounded),
- `widen_projection_interval` (raise uncertainty),
- `shift_ownership_estimate`,
- `raise_volatility_flag`.

Anything outside this list is rejected at contract validation. This is what prevents
"narrative" from silently becoming an unaudited driver of recommendations.

---

## 6. Implementation note

Prefer docs + typed contracts now. The deliverable for this workstream is
`apps/web/lib/gse/decision-ontology.ts`: the entity shapes (§2/§3), the edge types (§4), the
domain grouping (§5), and the NarrativeSignal allowed-impact enum (§5.3) — expressed as pure
TypeScript types and validators.

Do **not** propose risky DB migrations now. The ontology can first live as types validated
against existing records (odds, picks, evidence) in memory and in tests. Mapping it onto the
Prisma schema is a later, separate decision; several entities (LeagueMemory, ManagerGenome,
TrustReceipt, AgentRun) likely start as typed contracts over existing tables or as new
append-only stores, not as migrations of core tables.

Hard constraints carried from the platform rules:

- No fabricated entities, sources, or stats; `(uncertain)` is used where unsure.
- Every fact-bearing entity inherits the provenance envelope and passes the Claim Safety Gate.
- Rights posture is read from the existing source-rights registry / clearance engine — never
  re-implemented here.
- Recommendations are versioned, auditable, and replayable; trust state is frozen by
  TrustReceipt and reviewed by Autopsy without rewriting history.

### Open questions (uncertain)

- Final closed set of NarrativeSignal allowed impact types and their numeric bounds.
- Whether ManagerGenome surfaces to users or stays internal until inference quality is proven.
- Edge cardinalities / time-bounding for `plays_for` and `appears_in` across trades and IR.
- How much of the graph is persisted vs derived-on-read in the first implementation.
