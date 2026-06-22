# GSE 2026 — Agent Orchestration (Workstream H)

> **Status:** INTERNAL research doc. Companion to `apps/web/lib/gse/agent-orchestration.ts`.
> **Doctrine:** GSE is a **council of constrained agents**, not one prompt. This doc maps onto / extends the
> existing Agents OS in `apps/web/lib/agents/*` (`agent-registry`, `agent-departments`, `agent-authority`,
> `agent-health`, `agent-queue`, `agent-os`, `agent-capabilities`, `agent-status`, `agent-worker-dispatch`)
> and cockpit `apps/web/app/cockpit/agents/*`. It does NOT duplicate them. Where this doc and shipped code
> disagree, shipped code wins. Existing departments (`agent-departments.ts`):
> Command & Governance · Sports Intelligence · Data & Automation Platform · Customer Surface & Quality ·
> Growth, Community & Finance · Results & Calibration.

---

## 0. Council principles

1. **Constrained, not omniscient.** Each agent has narrow allowed inputs, a fixed output schema, and explicit
   forbidden inputs. No agent sees the whole world; the orchestrator composes them.
2. **No agent acts on the world.** Agents produce *verdicts*; only owner-gated actions, behind a human approval
   gate, ever change anything externally. **No auto-publish. No auto-bet. No money movement.** User agency is preserved.
3. **Disagreement is a feature.** Agents are allowed — expected — to disagree. Disagreement surfaces, it doesn't
   get averaged away silently.
4. **Confidence is calibrated and honest.** Every verdict carries a calibrated confidence; no agent may sound
   more certain than its evidence (shared rule with Workstream F).
5. **Rights-aware by construction.** Any external fact carries a `RightsSnapshot`; the Source Rights agent can veto.
6. **Banned-token firewall.** No agent output may contain tout/casino language (see CLAUDE.md / Workstream F list).
7. **Auditable.** Every run, verdict, disagreement, escalation, and approval is logged.

Each agent is specified along 11 axes: **role · allowed inputs · forbidden inputs · allowed tools · output
schema · confidence protocol · escalation triggers · failure modes · owner-gated actions · public/private
boundary · tests/acceptance.**

---

## 1. Data Reliability Agent
- **Role:** guards data freshness, completeness, and integrity before anything downstream uses it.
- **Allowed inputs:** raw/normalized feeds, timestamps, schema. **Forbidden:** user PII; making projections.
- **Tools:** ingestion adapters (read), freshness checks. **Output:** `{ ok, staleFields[], freshnessAge, confidence }`.
- **Confidence:** based on freshness + completeness coverage. **Escalation:** stale-past-TTL feeds the slate → block + alert.
- **Failure modes:** false-fresh on a frozen feed; silent gaps. **Owner-gated:** force-refresh.
- **Public/private:** quality flags can surface; raw pipeline internal. **Tests:** stale data is blocked, not served (per CLAUDE.md rule 5).

## 2. Source Rights Agent
- **Role:** enforces the scraping clearance + rights doctrine; can **veto** any extraction or surfacing.
- **Allowed inputs:** source url, registry status, `ClearanceResult`. **Forbidden:** evasion tooling; bypassing clearance.
- **Tools:** `clearance-engine.checkClearance()`, `source-rights-registry`, `wrapExtractedRecord()`.
- **Output:** `{ allowed, status, attribution, snapshot }`. **Confidence:** binary on allow/deny.
- **Escalation:** `permission_required` / `blocked_technical_controls` / `excluded` → stop + legal/manual route.
- **Failure modes:** stale registry; missing snapshot. **Owner-gated:** none can override a deny (legal-gated only).
- **Public/private:** verdicts visible in `/cockpit/sources`. **Tests:** `allowed=false` halts the job; no snapshot ⇒ `wrapExtractedRecord` throws.

## 3. Projection Agent
- **Role:** produces player/team projections from cleared structured data.
- **Allowed inputs:** cleared stats/odds/lines, model version. **Forbidden:** scraped article bodies; fabricated stats.
- **Tools:** prediction-engine. **Output:** `{ entity, projection, distribution(floor/ceiling), modelVersion, confidence }`.
- **Confidence:** calibrated vs. historical. **Escalation:** input gaps / out-of-distribution → flag, don't guess.
- **Failure modes:** overfit; stale features. **Owner-gated:** model-version promotion.
- **Public/private:** projections public per tier; internal features private. **Tests:** every projection is versioned + reproducible.

## 4. Ownership Agent (DFS)
- **Role:** projects field ownership for DFS contests.
- **Allowed inputs:** contest type, slate, public signal. **Forbidden:** individual users' lineups without consent; PII.
- **Tools:** ownership model. **Output:** `{ entity, projOwnership%, confidence }`. **Confidence:** banded.
- **Escalation:** thin data near lock → widen bands + warn. **Failure modes:** chalk misread.
- **Owner-gated:** none. **Public/private:** aggregate only. **Tests:** never exposes a user's private lineup.

## 5. Market Agent
- **Role:** reads lines, line movement, and market-implied probabilities.
- **Allowed inputs:** odds/lines feeds (The Odds API), timestamps. **Forbidden:** non-cleared sources; outcome claims.
- **Tools:** odds adapter. **Output:** `{ market, line, movement, impliedProb, freshness, confidence }`.
- **Confidence:** from liquidity + freshness. **Escalation:** stale/contradictory books → flag.
- **Failure modes:** stale line read as live. **Owner-gated:** none. **Public/private:** lines public per tier.
- **Tests:** every line carries a fresh timestamp; CLV computed honestly for the proof-gate ladder.

## 6. Injury Agent
- **Role:** tracks injury/availability status and its decision impact.
- **Allowed inputs:** cleared injury/availability feeds, timestamps. **Forbidden:** medical PII speculation; rumor as fact.
- **Tools:** injury feed (cleared). **Output:** `{ entity, status, sourceRef, asOf, confidence }`.
- **Confidence:** source reliability + recency. **Escalation:** conflicting reports → hold + flag (drives Sunday Morning Mode).
- **Failure modes:** stale status; unverified report. **Owner-gated:** none. **Public/private:** status public; source private if rights-limited.
- **Tests:** stale/unsourced status is flagged, never asserted.

## 7. Beat Report Agent
- **Role:** ingests cleared beat-writer signal (facts/quotes within rights) for context.
- **Allowed inputs:** cleared reports, attribution. **Forbidden:** republishing article bodies; uncleared content.
- **Tools:** Source Librarian, cleared text extraction. **Output:** `{ signal, attribution, snapshot, confidence }`.
- **Confidence:** corroboration count. **Escalation:** single-source rumor → low confidence + flag.
- **Failure modes:** rights violation; over-trusting one beat. **Owner-gated:** none.
- **Public/private:** attributed signal only. **Tests:** never extracts protected bodies; attribution propagates.

## 8. Narrative Agent
- **Role:** assembles the human-readable "why" from other agents' verdicts.
- **Allowed inputs:** other agents' verdicts (read). **Forbidden:** inventing evidence; banned tokens; certainty beyond inputs.
- **Tools:** Content/GSN (drafting). **Output:** `{ narrative, citedClaims[], counterCase, confidenceCeiling }`.
- **Confidence:** capped by the weakest cited claim. **Escalation:** thin evidence → say so.
- **Failure modes:** persuasive-but-unsupported prose. **Owner-gated:** none (drafts only; no auto-publish).
- **Public/private:** drafts internal until approved. **Tests:** banned-token scan passes; every claim is cited or marked "(uncertain)".

## 9. Coach Intent Agent
- **Role:** estimates coaching/usage tendencies (snap share, deployment) from cleared data.
- **Allowed inputs:** cleared usage/depth data. **Forbidden:** fabricated insider claims; private team info.
- **Tools:** usage model. **Output:** `{ entity, intentSignal, basis, confidence }`. **Confidence:** banded, often low.
- **Escalation:** speculative → mark low + falsifier. **Failure modes:** over-reading noise.
- **Owner-gated:** none. **Public/private:** signal public, low-confidence labeled. **Tests:** speculation is explicitly bounded.

## 10. DFS Optimizer Agent
- **Role:** builds lineups under contest constraints from projections + ownership.
- **Allowed inputs:** projections, ownership, salary, rules, user constraints. **Forbidden:** outcome guarantees; auto-entry.
- **Tools:** optimizer. **Output:** `{ lineup[], expCeiling, expFloor, exposureNotes, confidence }`.
- **Confidence:** distribution-based, never single-outcome. **Escalation:** infeasible constraints → explain.
- **Failure modes:** over-optimization to noise. **Owner-gated:** none (it never submits — user submits).
- **Public/private:** user's lineups private. **Tests:** never auto-enters a contest; Responsible Decision can flag.

## 11. Draft Strategy Agent
- **Role:** advises live/mock fantasy drafts.
- **Allowed inputs:** draft state, board, league memory (confirmed), user prefs. **Forbidden:** "can't-miss" claims; banned tokens.
- **Tools:** Projection, Ownership, League Memory. **Output:** `{ rec, altRec, why, confidenceBand }`.
- **Confidence:** coarse bands under time pressure. **Escalation:** data gap → "best available, heuristic".
- **Failure modes:** ignoring league settings. **Owner-gated:** none. **Public/private:** per-user draft private.
- **Tests:** recommendations respect that league's scoring; never a guarantee.

## 12. League Memory Agent
- **Role:** maintains the per-user League Memory Graph (Workstream G §11).
- **Allowed inputs:** league settings, user inputs, confirmed league memory. **Forbidden:** profiling non-users beyond function; cross-league leakage.
- **Tools:** memory ledger (confirmed). **Output:** `{ leagueGraph, lastSync, confidence }`.
- **Confidence:** sync freshness. **Escalation:** stale roster → re-sync before advising.
- **Failure modes:** stale settings. **Owner-gated:** none. **Public/private:** scoped to league + user.
- **Tests:** no cross-league data leakage; only confirmed memory recalled.

## 13. Waiver Agent
- **Role:** ranks waiver/free-agent moves for a league.
- **Allowed inputs:** league graph, projections, roster needs. **Forbidden:** guarantees; auto-claiming.
- **Tools:** Projection, League Memory. **Output:** `{ rankedTargets[], bidGuidance, why, confidence }`.
- **Confidence:** calibrated. **Escalation:** thin FA pool → say so. **Failure modes:** ignoring roster construction.
- **Owner-gated:** none (advice only — user claims). **Public/private:** per-user. **Tests:** never executes a claim.

## 14. Trade Agent
- **Role:** evaluates and proposes trades.
- **Allowed inputs:** rosters, projections, league graph. **Forbidden:** manipulating a counterparty; guarantees; banned tokens.
- **Tools:** Projection, League Memory, Roster Coach. **Output:** `{ proposal, fairnessRead, valueDelta, risks, confidence }`.
- **Confidence:** banded, shows both sides. **Escalation:** lopsided/exploitative → flag for fairness.
- **Failure modes:** one-sided framing. **Owner-gated:** none (never executes). **Public/private:** per-user.
- **Tests:** presents both sides honestly; never auto-sends a trade.

## 15. Roster Coach Agent
- **Role:** ongoing start/sit + roster construction guidance.
- **Allowed inputs:** roster, projections, injury, matchup. **Forbidden:** risk-free framing; banned tokens.
- **Tools:** Projection, Injury, Market. **Output:** `{ moves[], reasons, confidence }`.
- **Confidence:** per-move. **Escalation:** late news pending → hold (Sunday Morning Mode). **Failure modes:** stale inputs.
- **Owner-gated:** none. **Public/private:** per-user. **Tests:** low-confidence calls flagged; honors freshness.

## 16. Responsible Decision Agent
- **Role:** the guardrail — enforces responsible-play, agency, and safety across all advice.
- **Allowed inputs:** any agent's draft output, user context. **Forbidden:** overriding user agency *toward* risk.
- **Tools:** safety rules, banned-token scanner. **Output:** `{ pass, flags[], requiredEdits[] }`.
- **Confidence:** rule-based (pass/flag). **Escalation:** detected risk pattern / banned token → block + require edit.
- **Failure modes:** missing a subtle tout. **Owner-gated:** none (it constrains, never expands).
- **Public/private:** flags internal; sanitized output public. **Tests:** banned tokens never reach output; no "risk-free"/guarantee phrasing survives.

## 17. Revenue Agent (owner-only)
- **Role:** business/revenue analysis for the owner (feeds Jarvis Revenue Strategist).
- **Allowed inputs:** funnel, churn, pricing ladder (`pricing-phases.ts`), calibration proof-gates. **Forbidden:** guaranteed-revenue claims; dark patterns; subscriber PII misuse.
- **Tools:** business memory, Trust Ledger, Calibration. **Output:** `{ options[], tradeoffs, requiredMilestone, confidence(range) }`.
- **Confidence:** scenario ranges. **Escalation:** proof-gate unmet → refuse the step-up recommendation.
- **Failure modes:** false precision on forecasts. **Owner-gated:** any pricing/promo change.
- **Public/private:** owner-only. **Tests:** respects FOUNDING→PROVEN→ESTABLISHED→AUTHORITY gates + founding grandfathering.

## 18. Content / GSN Agent
- **Role:** drafts data-backed content (blog/SEO/social) from cleared facts.
- **Allowed inputs:** cleared facts, attributed sources, projections. **Forbidden:** fabricated stats; uncleared bodies; banned tokens; **auto-publish**.
- **Tools:** Claude API (drafting only — not source of truth). **Output:** `{ draft, citedFacts[], attribution, needsApproval:true }`.
- **Confidence:** of factual backing. **Escalation:** unsupported claim → strip or mark "(uncertain)".
- **Failure modes:** hallucinated stat. **Owner-gated:** **publishing is owner-gated** (`/cockpit/content`, bot-outbox).
- **Public/private:** drafts internal. **Tests:** nothing publishes without owner approval; every stat traces to a source.

## 19. UX / Clarity Agent
- **Role:** ensures outputs are clear, accessible, and honestly framed in the UI.
- **Allowed inputs:** rendered output, design tokens, contrast/state rules. **Forbidden:** dark patterns; misleading emphasis.
- **Tools:** clarity/contrast checks. **Output:** `{ clarityScore, issues[], suggestions[] }`.
- **Confidence:** heuristic. **Escalation:** confusing/misleading framing → flag. **Failure modes:** missing ambiguity.
- **Owner-gated:** none. **Public/private:** suggestions internal. **Tests:** no misleading emphasis ships; states (empty/loading/error/locked) honest.

## 20. Red-Team Agent
- **Role:** adversarially attacks high-confidence calls and owner-gated proposals (feeds Jarvis Red-Team mode).
- **Allowed inputs:** any recommendation + evidence. **Forbidden:** strawmanning; manufactured doubt; banned tokens.
- **Tools:** all read APIs, Calibration. **Output:** `{ strongestCounter, likeliestFailure, confidenceAdjustment }`.
- **Confidence:** how much it should lower the call. **Escalation:** finds a fatal flaw → block + route to debate.
- **Failure modes:** missing the real risk. **Owner-gated:** none. **Public/private:** war-room visible.
- **Tests:** every high-confidence call gets a counter-case before surfacing.

## 21. Calibration Agent
- **Role:** measures whether stated confidences match real outcomes; the source of "honest certainty".
- **Allowed inputs:** settled results, prior confidences. **Forbidden:** results-only spin; fabricated track record.
- **Tools:** calibration pipeline. **Output:** `{ buckets[], reliabilityCurve, drift, confidence }`.
- **Confidence:** statistical. **Escalation:** drift beyond threshold → flag model memory candidate.
- **Failure modes:** small-sample over-claim. **Owner-gated:** publishing calibration milestones (proof-gates).
- **Public/private:** public calibration/track record per CLAUDE.md. **Tests:** confidence ceilings derive from this; no "verified track record" phrasing.

## 22. Trust Ledger Agent
- **Role:** the integrity record — tracks claims made vs. evidence + outcomes for accountability.
- **Allowed inputs:** verdicts, sources, outcomes. **Forbidden:** mutating history; hiding misses.
- **Tools:** `apps/web/lib/jarvis/ledgers.ts`. **Output:** `{ claim, evidenceRefs, outcome, status }`.
- **Confidence:** N/A (record of fact). **Escalation:** claim without evidence → flag.
- **Failure modes:** gaps in the record. **Owner-gated:** none. **Public/private:** misses are surfaced, not buried.
- **Tests:** append-only; every public claim is traceable to evidence + outcome.

## 23. Jarvis Orchestrator
- **Role:** composes the council; routes a request to the right agents; runs debate; assembles the Answer Contract.
- **Allowed inputs:** the request, user/owner identity + scope, confirmed memory. **Forbidden:** bypassing gates; auto-executing.
- **Tools:** routing-rules, agent-council, capability-registry, decision-queue. **Output:** the layered Answer (Workstream F §15).
- **Confidence:** the synthesized, ceiling-capped confidence. **Escalation:** unresolved disagreement / owner-gated action → human approval gate.
- **Failure modes:** averaging away a real disagreement; over-synthesis. **Owner-gated:** routes all owner-gated actions to the gate.
- **Public/private:** scope-enforced. **Tests:** never auto-publishes/auto-bets; disagreements surface; banned tokens never ship.

---

## 24. Orchestration objects

### `AgentRun`
A single agent invocation. `{ id, agentKey, requestId, inputsHash, ranAt, durationMs, status, outputRef, modelVersion }`.
Immutable. Logged to the agent ledger. Links to the inputs it was allowed to see (and proves it saw nothing forbidden).

### `AgentVerdict`
An agent's structured output. `{ runId, agentKey, claim, evidenceRefs[], confidence(0–100, calibrated), counterPoints[], rightsOk, freshnessOk }`.
Confidence is capped by evidence; `rightsOk=false` makes the verdict unusable downstream.

### `AgentDisagreement`
Two+ verdicts conflict. `{ requestId, agents[], axis, positions[], magnitude, resolvable }`.
Never silently averaged. Drives debate; if `resolvable=false`, escalates. Surfaced in the War Room.

### `AgentEscalation`
`{ requestId, reason (stale-data | rights-veto | low-confidence | unresolved-disagreement | safety-flag | owner-gated-action), severity, raisedBy, routedTo }`.
Routes to the right human/queue. Safety + rights escalations cannot be auto-dismissed.

### `HumanApprovalGate`
The only path to a world-changing action. `{ actionId, type (publish | pricing | model-promote | data-force-refresh | promo), proposedBy, evidenceBundle, requiresOwner:true, status, decidedBy, decidedAt }`.
Defaults to **owner-gated**. No agent can self-approve. **No auto-publish / auto-bet / money movement — ever.**

### `MultiAgentDebateSummary`
The auditable record of a debate. `{ requestId, participants[], openingPositions[], counters[], whatWouldChangeMinds[], synthesizedVerdict, residualDisagreements[], confidenceCeiling }`.
Feeds Jarvis's deep-dive "model trace". Preserves dissent rather than erasing it.

---

## 25. Agent War Room — UI requirements

Surfaces the council's reasoning for the owner (extends `apps/web/app/cockpit/agents/*`):

1. **Live council view** — each agent's verdict + confidence for the active request, side by side.
2. **Disagreement spotlight** — conflicts highlighted with magnitude; never hidden behind an averaged number.
3. **Debate timeline** — opening positions → counters → "what would change minds" → synthesis (`MultiAgentDebateSummary`).
4. **Evidence + rights panel** — every cited fact with its `RightsSnapshot` + freshness; rights vetoes shown.
5. **Escalation tray** — open `AgentEscalation`s by severity; safety/rights pinned and non-dismissable.
6. **Approval gate** — pending `HumanApprovalGate` items; owner approves/rejects with the evidence bundle attached.
7. **Health + queue** — agent health (`agent-health.ts`) and queue depth (`agent-queue.ts`) inline.
8. **Audit drawer** — `AgentRun`/`AgentVerdict` history; everything traceable, append-only.
9. **Banned-token + safety status** — confirmation that Responsible Decision passed before anything surfaced.
10. **Owner-only guardrail** — War Room is owner-scoped; no subscriber surface exposes internal disagreement raw.

---

## 26. Request lifecycle (how a council request flows)

Concrete trace of one request through the orchestration objects:

1. **Intake.** Jarvis Orchestrator receives a request, resolves identity + scope, loads confirmed memory only.
2. **Routing.** `routing-rules` selects the relevant agents (e.g., a DFS lineup request → Data Reliability →
   Source Rights → Projection → Ownership → DFS Optimizer → Responsible Decision).
3. **Gating inputs.** Each agent runs as an `AgentRun` and may see only its allowed inputs; forbidden inputs are
   withheld at dispatch, not by trust.
4. **Verdicts.** Each emits an `AgentVerdict` with calibrated, ceiling-capped confidence and `rightsOk`/`freshnessOk`.
   A `rightsOk=false` or stale-data verdict is dropped from synthesis (and may escalate).
5. **Disagreement check.** Conflicting verdicts form an `AgentDisagreement`; if material, a debate runs and is
   recorded as a `MultiAgentDebateSummary` (positions → counters → falsifiers → synthesis). Dissent is preserved.
6. **Safety pass.** Responsible Decision scans the synthesized output: banned-token firewall + agency/risk check.
   A failure forces edits or blocks.
7. **Escalation / approval.** Unresolved disagreement, a rights veto, a safety flag, or any world-changing step
   raises an `AgentEscalation`; world-changing steps route to a `HumanApprovalGate` (owner-gated, never self-approved).
8. **Answer.** Jarvis assembles the layered Answer Contract (Workstream F §15) with the synthesized,
   honesty-capped confidence and the model trace from the debate summary.
9. **Audit.** Every run, verdict, disagreement, escalation, and approval is logged to the agent ledger.

Nothing in this flow publishes, bets, or moves money. The only state changes that touch the outside world pass
through a `HumanApprovalGate`.

## 27. Acceptance criteria (cross-agent)

These are the council-wide tests every agent set must satisfy (per CLAUDE.md: tests + types + build required):

| Invariant | Acceptance test |
|---|---|
| No auto-publish | Content/GSN output cannot ship without an approved `HumanApprovalGate`. |
| No auto-bet / money movement | No agent or orchestrator path executes a wager, claim, trade, or payment. |
| Rights enforced | `Source Rights` veto (`allowed=false`) removes the record from all downstream output. |
| Freshness enforced | Stale-past-TTL data is blocked, not served (CLAUDE.md rule 5). |
| No fabricated stats | Every surfaced stat traces to a cleared source or is marked "(uncertain)". |
| Honest confidence | Synthesized confidence ≤ calibration-supported ceiling; no false precision. |
| Banned tokens never ship | Responsible Decision firewall blocks all tout/casino phrasing before surfacing. |
| Disagreement preserved | Material `AgentDisagreement`s are surfaced, never silently averaged. |
| Owner-gated stays owner-gated | Pricing/publish/model-promote require owner approval; no self-approval. |
| Memory discipline | Only `APPROVED` memory is recalled; candidates never treated as facts. |
| Auditability | Every `AgentRun`/`AgentVerdict`/escalation/approval is logged + traceable. |
| Scope isolation | No cross-user data leakage; War Room internals are owner-only. |

## 28. Mapping to existing Agents OS (do not duplicate)

| This doc | Existing implementation |
|---|---|
| Agent identity/registry | `apps/web/lib/agents/agent-registry.ts`, `agent-os.ts` |
| Departments | `apps/web/lib/agents/agent-departments.ts` |
| Owner-gated authority | `apps/web/lib/agents/agent-authority.ts` |
| Health / status | `apps/web/lib/agents/agent-health.ts`, `agent-status.ts` |
| Queue / dispatch | `apps/web/lib/agents/agent-queue.ts`, `agent-worker-dispatch.ts` |
| Capabilities | `apps/web/lib/agents/agent-capabilities.ts` |
| Council + routing | `apps/web/lib/jarvis/agent-council.ts`, `routing-rules.ts`, `capability-registry.ts` |
| War Room UI | `apps/web/app/cockpit/agents/*`, `apps/web/app/cockpit/agents/[agentKey]/` |
| Rights veto | `apps/web/lib/scraping/clearance-engine.ts`, `source-rights-registry.ts` |
| Audit ledger | `apps/web/lib/jarvis/ledgers.ts`, `ledger-types.ts` |

**Caveat:** Exact agent keys in the registry, which of these 23 roles already exist vs. are proposed, and the
precise object field names are **(uncertain)** from this doc — verify against `agent-registry.ts` and
`agent-orchestration.ts` before implementing. Map new roles onto existing departments; do not create a parallel
registry. Code is source of truth.
