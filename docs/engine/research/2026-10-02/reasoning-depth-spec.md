# Reasoning Depth Spec — NFL Intelligence Engine

**Created:** 2026-10-01/02, after Steelers @ Browns TNF (Browns 24, Steelers 16)
**For:** Coding agent — post-audit build. Pairs with `tnf-intelligence-program-2026-10-01.md` (Tracks 1–3: QB profiles, coaching tendencies, trust-signal intake).
**Status:** Spec. No code. Implementation-ready: data structures, API shape, test assertions.

---

## 1. Why this exists

Tonight's card went 4-4, and the four losses shared one failure mode: **the analysis was stat-deep but reasoning-shallow.**

The pressure-funnel stack (Watson under 187.5, game under 38.5, Watt over 0.5 sacks, both-teams-2+ FGs) was built on a true fact — Pittsburgh's pass rush vs Cleveland's injured interior OL — treated as physics. At halftime Watson was 14/17 for 181 yards, zero sacks, ~130 rating, Browns up 21-10. Final: Watson 223 yards (blew past the under), 24-16 Browns.

The counter-evidence **existed before kickoff** and was even quantified in tonight's own research track:

- Todd Monken's 2026 quick-game proxy: **0.639** vs league average **0.508**
- Average air yards: **8.33 → 6.12**; deep rate **0.120 → 0.060**
- Early-down pass rate across the team switch: **0.424 → 0.562**

No reasoning layer connected "Monken throws it short and fast" to "the pass rush can't get home" to "the under thesis is dead." The data was in the building. Nothing walked it down the hall.

Garrett's directive: the engine needs **reasoning levels, depth of intelligence, and complex reasoning comparable to Grok 4.x** — applied over the full NFL intelligence corpus (inside the game, outside the game, around the game). This spec defines what that means, mechanically.

---

## 2. What "Grok 4.x-class reasoning" means — grounded mechanisms

Every mechanism below is a documented property of the Grok 4 model family. Each is mapped to its NFL-intelligence equivalent. Sources are listed in §9; claims without a cited source are marked SPEC (our design choice, not xAI's).

### 2.1 Thinking depth as a runtime dial (Grok 4.1 / 4.7)

**What xAI built:** Grok 4.1 ships two modes — a fast low-latency mode and a multi-step "Thinking" mode that spends extra reasoning tokens on hard problems (theaitrack.com; codecademy.com). Grok 4.5+ exposes `reasoning_effort` (`low` / `medium` / `high`, plus `xhigh` on 4.6/4.7) as an API-level depth lever; reasoning is built-in and cannot be disabled (prompt-atlas; anyaa-labs). Grok 4.7's training specifically targeted multi-step, multi-hour agentic flows and self-verification to cut hallucinations on extended knowledge work (i10x.ai).

**NFL equivalent:** Reasoning depth is not a vibe — it is a **budgeted, selectable parameter** on every engine analysis. A Tuesday-morning futures scan can run shallow; a Sunday card with real exposure runs at maximum depth. The engine must support at least four depth tiers and must route automatically (see §4).

### 2.2 Multi-agent parallel reasoning with debate (Grok 4 Heavy / 4.20)

**What xAI built:** Grok 4 Heavy spawns multiple specialized agents per query — e.g., one for research, one for code, one for data analysis — coordinated by a higher-level controller that synthesizes (macaron.im; medium.com). Grok 4.20 runs four named specialized agents that think in parallel and **debate each other in real time** before a captain agent aggregates the strongest elements and resolves conflicts; contradictions are caught before output, which xAI credits for the hallucination reduction (nextbigfuture.com).

**NFL equivalent:** No single reasoning pass produces a pick. For any bet recommendation at depth ≥ L3, the engine runs **parallel specialist tracks** — at minimum:

| Agent | Job | Tonight's example |
|---|---|---|
| `stat-agent` | Numbers: lines, splits, rates | PIT pressure rate, CLE OL injuries |
| `scheme-agent` | Coaching/scheme layer | Monken quick-game 0.639, air yards 6.12 |
| `behavior-agent` | QB behavioral profile | Watson INT-under-pressure splits; Rodgers trust-target HHI |
| `signal-agent` | Trust signals / news | Rodgers–Metcalf video; injury reports |
| `adversary-agent` | Kill the thesis | "What breaks the pressure funnel?" (see §4, L4) |

A **synthesizer** resolves conflicts with explicit precedence rules (§5). The adversary-agent is mandatory, not optional — it is the structural fix for tonight.

### 2.3 Self-verification loops (Grok 4.7)

**What xAI built:** Grok 4.7's training emphasized self-verification on long agentic flows; parallel tool use lets the model cross-check as it works (i10x.ai; venturebeat.com). In the 4.20 council, one agent's role is active verification of the others' claims before synthesis (nextbigfuture.com).

**NFL equivalent:** Every factual claim in a reasoning trace carries a **verification status**: `CORPUS` (sourced from ingested data), `COMPUTED` (derived by engine code, reproducible), `SINGLE_SOURCE` (one outlet, uncorroborated), `INFERENCE` (model judgment, flagged). A pick cannot ship with a load-bearing `SINGLE_SOURCE` or `INFERENCE` claim unless the checklist records the gamble explicitly (§5).

### 2.4 Parallel tool use + adaptive tool planning (Grok 4.1)

**What xAI built:** Grok 4.1 executes multiple tool calls concurrently and plans tool sequences over several turns — "adaptive reasoning" that reduced some 4-step research tasks to 1–2 steps (venturebeat.com). Native tool integrations (web search, code execution, vector DB, image analysis) are first-class runtime citizens the model invokes autonomously (macaron.im).

**NFL equivalent:** The reasoning layer calls **data tools, not vibes**: profile lookups (QB/coach/OL), corpus search across all ingested research, live injury/news feeds, market-line pulls. Tool calls run in parallel per reasoning level; the trace records which tool returned what, so any number is auditable to its source.

### 2.5 Long-horizon coherence (Grok 4.1 / 4.7)

**What xAI built:** Long-horizon RL keeps output quality stable across 1–2M token contexts; the model holds a consistent thread over millions of tokens for long tasks (venturebeat.com; prompt-atlas; macaron.im).

**NFL equivalent:** A reasoning trace for one gameweek routinely spans: 32 team profiles × coaching staffs, QB behavioral profiles, OL metrics, trust-signal feed, market history, and the full research corpus. The engine's context management must hold **all of it simultaneously** — the failure mode tonight was not missing data, it was data that never met. SPEC: the trace object (§6) is the unit of coherence; nothing downstream may consume a conclusion without its trace.

### 2.6 Encrypted, portable reasoning state (Grok 4.x API)

**What xAI built:** xAI returns encrypted reasoning content that the caller passes back to continue reasoning across requests — the documented way to preserve agentic tool-calling state (anyaa-labs).

**NFL equivalent:** Reasoning traces are **persisted, content-addressed artifacts**, not ephemeral logs. A Wednesday trace for Sunday's games must be resumable Thursday when injury news lands, with the new information merged as a new reasoning level, not a restart. (Storage: repo or DB per coding-agent choice; format per §6.)

---

## 3. Mechanism → NFL mapping (worked example: tonight's miss)

The exact chain tonight's card failed to walk:

| Step | Grok mechanism | NFL instantiation | Tonight's value |
|---|---|---|---|
| 1 | Direct retrieval | stat-agent: PIT pass-rush rank, CLE OL injuries | True — the card's starting fact |
| 2 | Cross-signal correlation | scheme-agent: Monken 2026 quick-game 0.639 (league-high), air yards 8.33→6.12 | Existed pre-kickoff in Track 2 output |
| 3 | Causal chain | injured OL → Monken compensates with quick game (Weeks 1–3 proven) → pressure can't land → Watson's yards come short/YAC | Never constructed |
| 4 | Adversarial verification | adversary-agent: "What breaks the pressure thesis? TTT < 2.3s + quick-game > 60% → sacks don't materialize." Both true pre-kickoff | Never asked |
| 5 | Multi-agent synthesis | synthesizer: 4 legs share ONE failure mode (pressure must land) → correlated parlay of a single thesis → reject stack, keep Browns +2.5 (mispriced side) | Never run |

The card's actual result (4-4, all four losses on the funnel) is what L4 exists to prevent: **correlated-thesis detection**. Four bets that all require the same causal link are one bet with four receipts.

---

## 4. Reasoning levels L1–L5

Depth is a property of the **analysis**, selected per task, with mandatory escalation triggers. Higher levels include all lower-level outputs in the trace.

### L1 — Direct lookup
- **What:** Answer from a single profile, table, or line. No cross-referencing.
- **Example:** "Watson's season INT rate is X." "The total is 38.5."
- **Output:** value + source pointer + verification status.
- **Auto-escalates to L2 when:** the question involves a matchup (two entities), a line vs a number, or any injury/lineup flag is present.

### L2 — Cross-stat correlation
- **What:** Two or more signals combined; correlations and splits surfaced.
- **Example:** "Watson's INT rate under pressure vs clean, by quarter and score state" (Track 1 output). "Monken quick-game rate vs league average."
- **Output:** correlated findings + the joint table + which correlations are computed vs asserted.
- **Auto-escalates to L3 when:** a bet recommendation is requested; or the L2 output contains a **causal claim** ("pressure will overwhelm the OL"); or two L2 signals disagree (stat-agent vs scheme-agent conflict).

### L3 — Causal chain
- **What:** Explicit cause → mechanism → outcome chains, each link sourced. Scheme → adjustment → outcome.
- **Example:** "CLE interior OL injuries → Monken shifts to quick game (0.639 rate, 6.12 air yards, Weeks 1–3) → PIT pressure rate projects below its season average → Watson dropback EPA holds → under 187.5 requires a deep-dropback game script that Monken hasn't run all season."
- **Requirements:** every link carries verification status; any `INFERENCE` link is flagged; the chain lists its **breaking conditions** (the observable facts that would falsify each link).
- **Auto-escalates to L4 when:** real exposure is attached (a published pick, a card, anything Garrett could bet); or the L3 chain's conclusion contradicts the market by more than a threshold (SPEC: |edge| > 5% implied); or any link is `INFERENCE`/`SINGLE_SOURCE`.

### L4 — Adversarial
- **What:** A dedicated adversary-agent attempts to kill the L3 thesis. Mandatory outputs:
  1. **The breaking-condition check:** are tonight's falsifiers already true? (Tonight: yes — TTT/quick-game thresholds met pre-kickoff.)
  2. **Correlated-thesis detection:** do multiple recommended legs share one causal link? If yes, they are bundled as ONE thesis with combined exposure, never presented as independent edges.
  3. **The strongest counter-argument,** steelmanned with numbers, not dismissed.
  4. **Pre-mortem:** "It is Monday and this card went 0-4. What happened?" — written before the games.
- **Auto-escalates to L5 when:** the adversary cannot kill the thesis (it survives → needs full synthesis); or the card contains 3+ legs; or Garrett requests "the full picture."

### L5 — Synthesis across corpus + live signals
- **What:** The synthesizer merges all specialist tracks, the adversary's report, the full research corpus (keyword + semantic retrieval over all ingested material), live signals (injury, weather, market movement), and Garrett's football hierarchy (OL → coaching/scheme → QB, §2 of the program doc).
- **Output:** the final recommendation **plus** the complete trace: every level's output, every tool call, every verification status, the adversary's pre-mortem, and the checklist verdict (§5).
- **Rule:** L5 is the only level permitted to produce a public-facing pick or a multi-leg card. Anything shallower is labeled `ANALYSIS-DRAFT — not for publication`.

### Escalation summary

| Trigger | Escalate to |
|---|---|
| Matchup / line-vs-number / injury flag | L1 → L2 |
| Bet requested, causal claim made, or signal conflict | L2 → L3 |
| Real exposure, market contradiction > 5%, or weak-link (`INFERENCE`/`SINGLE_SOURCE`) load-bearing | L3 → L4 |
| Thesis survives adversary, 3+ legs, or "full picture" requested | L4 → L5 |
| Public pick or multi-leg card | Must be L5 |

SPEC: the coding agent implements escalation as a state machine; skipping levels is a logged exception, never silent.

---

## 5. No-blind-spots: the mandatory reasoning checklist

**The rule:** before the engine produces any pick, card, or game analysis at L3+, it must check **every** intelligence track. Not "consult if relevant" — check, and record the verdict per track, including "checked, nothing material."

Garrett's words: *"There better not be a single thing our engine doesn't understand or know about NFL football — inside the game, outside the game, around the game — everything."*

### The five mandatory tracks

| # | Track | What "checked" means | Tonight's miss it would have caught |
|---|---|---|---|
| 1 | **QB behavioral profile** (Track 1) | Starter + relevant backup profiles loaded; INT-by-situation, pressure splits, trust-target HHI, scramble triggers reviewed | Watson's pressure splits; Rodgers' trust-target concentration (Wilson) |
| 2 | **Coaching / scheme tendencies** (Track 2) | HC + OC/playcaller + DC profiles loaded; YoY deltas; situational fingerprints (early-down pass, 4th-down aggression, quick-game rate) | Monken 0.639 quick-game, 6.12 air yards |
| 3 | **Offensive line** | Unit health (injuries, practice participation), continuity, pressure-rate allowed vs expected; DL/OL matchup graded | CLE's two missing interior starters — *and the adjustment it forces* |
| 4 | **Trust signals** (Track 3) | Social/video/news intake swept for both teams: QB trust, frustration, role changes, coach quotes | Rodgers–Metcalf video; Wilson's rising role |
| 5 | **Scheme matchup** | OL-vs-DL, scheme-vs-scheme: does the offense's structure neutralize the defense's strength? | Quick game neutralizes pass rush — the exact L3 chain |

### Checklist verdict values (per track)

- `CLEAR` — checked, material factored into the chain.
- `NOTHING-MATERIAL` — checked, nothing moves the needle. (Still recorded — silence is not evidence.)
- `DATA-GAP` — the track has no usable data (e.g., no charting for man/zone). Recorded as a gap; the L4 adversary must assume the worst plausible value for the gap.
- `CONFLICT` — track disagrees with another track. Escalates to L4 automatically; the synthesizer resolves with precedence: **live-verified > computed > corpus > single-source > inference**.

### The gate

```text
IF any track is UNCHECKED → analysis is INVALID at L3+. Halt, do not downgrade silently.
IF any track is DATA-GAP and load-bearing → L4 adversary assumes worst-plausible, flags exposure.
IF 2+ tracks are CONFLICT → L5 required regardless of leg count.
```

SPEC: implement as a blocking validator in the pipeline. The checklist is part of the persisted trace, rendered in any human review UI.

---

## 6. Data structures

### 6.1 Reasoning trace (the unit of coherence)

```jsonc
{
  "trace_id": "trace_20261002_pit_cle_w04",
  "game": {"away": "PIT", "home": "CLE", "week": 4, "season": 2026},
  "depth": "L5",
  "escalation_log": [
    {"from": "L1", "to": "L2", "trigger": "matchup+injury_flag", "at": "2026-10-02T00:11:00Z"},
    {"from": "L2", "to": "L3", "trigger": "bet_requested", "at": "2026-10-02T00:12:00Z"},
    {"from": "L3", "to": "L4", "trigger": "real_exposure", "at": "2026-10-02T00:14:00Z"},
    {"from": "L4", "to": "L5", "trigger": "thesis_survived+3_legs", "at": "2026-10-02T00:19:00Z"}
  ],
  "levels": {
    "L1": {"claims": [{"text": "...", "value": 187.5, "source": "market/fanduel", "verification": "CORPUS"}]},
    "L2": {"correlations": [{"signals": ["monken_quickgame_0.639", "league_avg_0.508"], "method": "COMPUTED", "note": "Track 2 output"}]},
    "L3": {"chains": [{"links": [
        {"cause": "CLE missing 2 interior OL starters", "verification": "CORPUS"},
        {"mechanism": "Monken compensates with quick game (0.639 rate W1-3)", "verification": "COMPUTED"},
        {"outcome": "PIT pressure rate projects below season avg", "verification": "INFERENCE", "breaking_condition": "TTT > 2.6s or quick-game < 0.55"}
      ]}]},
    "L4": {
      "breaking_conditions_met": true,
      "correlated_theses": [["watson_under_187.5", "under_38.5", "watt_sacks_o0.5", "both_2fg"]],
      "shared_link": "pit_pressure_lands",
      "counter_argument": "If PIT stunts into quick-game windows, pressure converts to hits→INTs (Watson INT-under-hit 3-5% vs 0.8-3.2% clean, Track 1)",
      "pre_mortem": "It is Monday and the funnel went 0-4: Monken's quick game held (as W1-3), Watson took what was given, game stayed over on garbage time."
    },
    "L5": {
      "recommendation": "REJECT pressure-funnel stack as correlated single thesis. Browns +2.5 is the mispriced side.",
      "corpus_hits": ["coaching-tendencies/profiles/todd-monken.md", "qb-behavioral-profiles/profiles/deshaun-watson.md"],
      "live_signals": []
    }
  },
  "checklist": {
    "qb_behavior": "CLEAR",
    "coaching_scheme": "CLEAR",
    "offensive_line": "CLEAR",
    "trust_signals": "CLEAR",
    "scheme_matchup": "CONFLICT"
  },
  "tool_calls": [{"tool": "profile_lookup", "args": {"coach": "todd-monken"}, "returned": "quickgame_0.639", "at": "..."}],
  "label": "FINAL"
}
```

### 6.2 Verification statuses (closed enum)

`CORPUS` | `COMPUTED` | `SINGLE_SOURCE` | `INFERENCE`

- `CORPUS`: ingested from a sourced dataset or document. Traceable to file/row.
- `COMPUTED`: derived by engine code from `CORPUS` inputs. Reproducible — the trace stores the code version + inputs hash.
- `SINGLE_SOURCE`: one outlet, uncorroborated. Cannot be load-bearing at L4+ without explicit flag.
- `INFERENCE`: model judgment. Must carry its breaking condition (§4 L3).

### 6.3 Checklist verdicts (closed enum)

`CLEAR` | `NOTHING-MATERIAL` | `DATA-GAP` | `CONFLICT` | `UNCHECKED`

`UNCHECKED` is valid only below L3. At L3+, `UNCHECKED` on any track invalidates the trace.

---

## 7. API shape (for the coding agent)

```typescript
// Depth selection
type ReasoningDepth = "L1" | "L2" | "L3" | "L4" | "L5";
type Verification = "CORPUS" | "COMPUTED" | "SINGLE_SOURCE" | "INFERENCE";
type ChecklistVerdict = "CLEAR" | "NOTHING-MATERIAL" | "DATA-GAP" | "CONFLICT" | "UNCHECKED";

interface AnalysisRequest {
  game: { away: string; home: string; week: number; season: number };
  question: string;                    // "should we bet Watson under 187.5?"
  exposure: "none" | "analysis" | "published_pick" | "card";
  requested_depth?: ReasoningDepth;    // floor; engine may escalate, never de-escalate silently
  resume_trace_id?: string;            // §2.6: resume Wednesday's trace on Thursday
}

interface SpecialistOutput {
  agent: "stat" | "scheme" | "behavior" | "signal" | "adversary";
  claims: Claim[];                     // each with verification + source
  conflicts_with?: string[];           // trace_ids or claim ids it disputes
}

interface ReasoningTrace { /* §6.1 */ }

// Core functions
function analyze(req: AnalysisRequest): Promise<ReasoningTrace>;
// Runs specialists in parallel per level, escalates per §4 triggers,
// blocks on the §5 checklist gate. Never returns a pick below L5.

function adversaryReview(trace: ReasoningTrace): Promise<AdversaryReport>;
// L4: breaking-condition check, correlated-thesis detection, steelman, pre-mortem.

function validateChecklist(trace: ReasoningTrace): ChecklistResult;
// §5 gate. Returns INVALID with the unchecked track named, or PASS.

function correlatedTheses(legs: BetLeg[], trace: ReasoningTrace): ThesisBundle[];
// Groups legs sharing a causal link. A 4-leg funnel on one link = 1 thesis.
```

SPEC notes for the implementer:
- Specialists run in parallel (Grok 4.1 parallel tool use, §2.4); the synthesizer is sequential after them (Grok 4.20 think → debate → consensus, §2.2).
- `analyze()` with `exposure: "published_pick" | "card"` MUST return depth L5; anything else is a contract violation, surfaced loudly.
- Traces persist content-addressed; `resume_trace_id` merges new signals as a new level, never a rewrite (§2.6).
- The `adversary` specialist is not a tone — it is a separate prompt/context with the explicit job of falsification, given the same data access as the others.

---

## 8. Test assertions (mandatory)

These are runnable acceptance tests. The Steelers–Browns Week 4 case is mandatory — it is the regression test for the exact failure that created this spec.

### T1 — The funnel must die at L4 (MANDATORY)
> **Given** the Steelers–Browns Week 4 setup (PIT pass rush, CLE missing 2 interior OL starters, Monken 2026 quick-game 0.639 / air yards 6.12 in Track 2 data, Watson Track 1 profile), **when** the engine is asked for a card at depth L5, **then** the trace must:
> - contain an L3 chain linking OL injuries → Monken quick-game compensation → pressure neutralization, with the breaking condition `TTT > 2.6s or quick-game < 0.55`;
> - have the adversary mark `breaking_conditions_met: true` (both thresholds were satisfied in Weeks 1–3 data);
> - bundle `watson_under_187.5`, `under_38.5`, `watt_sacks_o0.5`, `both_teams_2fg` as ONE correlated thesis on the shared link `pit_pressure_lands`;
> - NOT recommend the funnel stack. `recommendation` must contain `REJECT` for the stack.
>
> **Assert on the trace object, not on prose.** If any assertion fails, the reasoning layer is not wired.

### T2 — Checklist gate blocks blind analysis
> **Given** an analysis request where the trust-signal track has no data for a team, **when** `validateChecklist` runs at L3, **then** it returns `DATA-GAP` (not `UNCHECKED`, not silent), and the L4 adversary's report assumes the worst-plausible trust-signal value with the assumption recorded.

### T3 — Escalation triggers fire
> **Given** an L2 analysis containing the causal claim "pressure will overwhelm the OL," **when** the pipeline processes it, **then** `escalation_log` shows L2 → L3 with trigger `causal_claim`. **Given** a 3-leg card surviving L4, **then** the log shows L4 → L5.

### T4 — Correlated-thesis detection
> **Given** N legs whose L3 chains share ≥1 causal link, **when** `correlatedTheses` runs, **then** they are bundled into a single `ThesisBundle` with `shared_link` named, and the UI/API presents them as one thesis with combined exposure — never as N independent edges.

### T5 — Verification statuses propagate
> **Given** a trace where the load-bearing link of an L3 chain is `INFERENCE`, **when** validated at L4, **then** the trace is flagged `weak_link: true`, the breaking condition is present and machine-checkable, and any published output carries the flag.

### T6 — Garrett's hierarchy is honored (L5 synthesis)
> **Given** any L5 game analysis, **when** the synthesis is inspected, **then** the trace shows OL evaluated before scheme, and scheme before QB-behavior — the hierarchy from the program doc §2 — with each layer's verdict recorded. A trace that jumps to QB props without the OL and scheme layers is invalid.

### T7 — Resume, don't restart
> **Given** a persisted L4 trace from Wednesday and new Thursday injury news, **when** `analyze({resume_trace_id})` runs, **then** the returned trace contains the original levels unchanged plus a new level entry for the news, and `escalation_log` records the merge. The Wednesday reasoning is never silently rewritten.

---

## 9. Sources (Grok 4.x reasoning claims)

1. Grok 4.1 two modes (fast "tensor" vs multi-step "Thinking" "quasarflux"), #1 LMArena Thinking 1483 Elo, 28% latency reduction, stable 1M-token context, improved parallel tool orchestration — https://theaitrack.com/xai-grok-4-1-release/
2. Grok 4.1 Thinking vs non-Thinking variants, silent rollout Nov 1–14 2025, 64.78% user preference — http://codecademy.com/article/what-is-grok-4-1
3. Grok 4 Heavy as multi-agent (specialized agents + controller), parallel retrieval+reasoning, native tool integrations (web/code/vector-db/vision) as first-class runtime — https://macaron.im/blog/grok-xai-evolution
4. Grok 4 as multi-agent system; Grok 4 Heavy deep multi-agent reasoning; frontier reasoning benchmarks — https://medium.com/@hcorso39/what-is-xai-grok-grok-1-to-grok-5-explained-2025-1b36ee16efd0
5. Grok 4.20 four-agent council (think → debate → consensus), real-time cross-validation, hallucination reduction via contradiction-catching — https://www.nextbigfuture.com/2026/02/how-the-xai-grok-4-20-agents-work.html
6. Grok 4.7 four reasoning tiers (low–xhigh), training on multi-step multi-hour agentic flows + self-verification — https://i10x.ai/news/grok-4-7-xai-500k-context-enterprise-model
7. Grok 4.1 Fast parallel tool use, adaptive reasoning planning tool sequences, long-horizon RL, τ²-bench agentic leadership — https://venturebeat.com/ai/grok-4-1-fasts-compelling-dev-access-and-agent-tools-api-overshadowed-by
8. `reasoning_effort` depth lever (low/medium/high/xhigh), built-in reasoning cannot be disabled, "think harder" as antipattern — https://github.com/dim-s/prompt-atlas/blob/HEAD/references/models/grok.md
9. Encrypted reasoning content carried across requests to preserve agentic state; reasoning.effort-as-agent-count on 4.20-multi-agent — https://github.com/anyaa-labs/agent-skills/blob/HEAD/agent-architect/model-profiles/xai.md
10. Grok 4 Heavy parallel reasoning trajectories before synthesis (test-time compute); Think/DeepSearch modes — https://systems-analysis.info/eng/Grok_%28xAI%29

All other design decisions in this spec are marked SPEC — they are our architecture, inspired by the above, not xAI's.

---

## 10. Definition of done

- [ ] `analyze()` implements L1–L5 with the §4 escalation state machine; level-skipping is a logged exception.
- [ ] Five specialist agents (stat, scheme, behavior, signal, adversary) run in parallel at L3+; synthesizer resolves conflicts with §5 precedence.
- [ ] §5 checklist gate blocks any L3+ output with an `UNCHECKED` track; verdicts persisted in the trace.
- [ ] `correlatedTheses()` bundles shared-link legs; UI/API never presents them as independent edges.
- [ ] Traces persist content-addressed and resumable (§2.6, T7).
- [ ] All of §8 passes, **including T1 on the Steelers–Browns Week 4 fixture** — the engine must kill the pressure-funnel stack on the exact data available pre-kickoff.
- [ ] No public pick or multi-leg card is producible below L5 (contract violation otherwise).

---

*End of reasoning-depth spec. Companion docs in this package: QB behavioral profiles, coaching tendencies, trust-signal intake registry. The intelligence program is Tracks 1–3 (the data) + this spec (the mind that reasons over it).*
