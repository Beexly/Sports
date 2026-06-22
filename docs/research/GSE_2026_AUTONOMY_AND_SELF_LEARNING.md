# GSE 2026 — Autonomy, Self-Working Operations & Self-Learning

**Status:** research blueprint (no code shipped by this doc)
**Owner question:** *"How do we make this more autonomous? self-working? self-learning? How do we make the AI systems better functioning?"*
**Scope:** a concrete plan that EXTENDS the existing GSE layer (`apps/web/lib/gse/*`) — data-excellence (`scoreDataQuality`/`scoreCalibrationHealth`), agent-orchestration (`scoreAgentTrust`), memory-policy (`scoreMemoryUsefulness`), plus the Agents OS, calibration, calibration-drift, synthetic monitoring, and the cockpit. It does **not** duplicate those runtimes — it adds the *self-learning* and *autonomy-grading* contracts on top.
**Hard rule that survives every section below:** more autonomy never means auto-publishing content, auto-betting, auto-pricing, or removing an owner gate. Autonomy is *earned, bounded, and reversible*. Owner-gated actions stay gated.

---

## 0. The new layer this doc proposes

One new module, `apps/web/lib/gse/self-learning.ts`, holding pure, testable scoring contracts that mirror the existing GSE pattern (typed `GseScore` outputs via `makeScore`, rationale + flags, no `any`, no fabricated metrics):

| New function | Returns | One-line job |
|---|---|---|
| `scoreDriftRisk(signals)` | `GseScore` (higher = riskier) | How likely the world has shifted under a model since last calibration. |
| `scoreModelPromotionReadiness(signals)` | `GseScore` (higher = readier) | Whether a challenger has earned the right to replace the champion. |
| `classifyAutonomyLevel(capability)` | `{ level: AutonomyLevel; guardrail; reasons }` | Where a capability sits on the L0–L5 ladder and what gate holds it there. |
| `scoreLearningLoopHealth(signals)` | `GseScore` (higher = healthier) | Is the self-learning loop actually closing (capture→settle→calibrate→act)? |
| `scoreForecastQuality(signals)` | `GseScore` (higher = better) | Proper-scoring-rule view (Brier/log/CRPS + calibration) of a model's settled record. |

These reuse the existing primitive (`gse-scoring-systems.ts`) and depend one-way on it, exactly like `data-excellence.ts`. Five new rows get appended to `GSE_SCORING_SYSTEMS`. Nothing in this doc touches pricing, picks publishing, or wagering logic.

> **Integrity note.** Every number below that looks like a threshold (PSI 0.25, ≥100 settled, 52.4% break-even) is a *published convention or arithmetic fact*, cited inline, not a measured GSE result. GSE has no track-record numbers to report yet; the loop's whole purpose is to *earn* them honestly.

---

## 1. The self-learning loop

### Pattern

A closed loop: **outcome capture → settlement → calibration update → drift detection → candidate model → shadow / champion-challenger eval → promotion gate → deploy → monitor → rollback.** The same idea SRE and MLOps teams call a *retraining/monitoring loop* ([Databricks MLOps workflow](https://docs.databricks.com/aws/en/machine-learning/mlops/mlops-workflow), [Dataiku monitoring & feedback](https://knowledge.dataiku.com/latest/mlops-o16n/model-monitoring/concept-monitoring-feedback.html)).

**Why it works.** Sports models decay: rosters, schemes, market efficiency, and our own data feeds all move. A loop that *settles real outcomes* and feeds them back is the only honest way to keep confidence scores meaning what they say. Without the loop, calibration is a one-time claim; with it, calibration is a maintained property.

### Real techniques GSE adopts (each cited, each bounded)

- **Online / incremental learning** — update model state per settled event instead of full retrains. The [River](https://riverml.xyz) library is the reference design for streaming learners; the *idea* GSE borrows is incremental update + a guard, not the dependency. Used only for **secondary** signals (e.g., source-reliability priors, feed-health priors), never to silently rewrite a public confidence model.
- **Bandits / Thompson sampling for model & strategy selection** — when several candidate models or blends are plausible, treat "which model serves this slate" as a multi-armed bandit and sample by posterior reward (settled Brier improvement). Thompson sampling maintains a posterior per arm and samples from it, naturally trading exploration for exploitation ([Thompson sampling, Wikipedia](https://en.wikipedia.org/wiki/Thompson_sampling); [bandits in MLOps deployment, arXiv 2503.22595](https://arxiv.org/pdf/2503.22595)). GSE constraint: exploration is **shadow-only** — a "challenger arm" never changes a user-facing pick; it competes on logged predictions until it passes the promotion gate.
- **Active learning** — spend scarce attention (human review, extra data pulls, agent debate budget) on the games/players where the model is *most uncertain and most consequential*, not uniformly. This is uncertainty sampling; GSE ranks by `decision_fragility` × stake.
- **Reject inference** — a labeling-bias guard. Our settled set is skewed: we publish/track the picks we were confident in, so the unsettled/declined population is unobserved. Reject inference (a credit-scoring technique for the rejected-applicant problem) reminds us to *down-weight* calibration claims to the population we actually settled, and to flag selection bias rather than generalize past it.
- **Continual learning + catastrophic-forgetting guards** — when we update, we must not lose old-but-valid regimes (e.g., a model that learned playoff dynamics shouldn't forget regular-season ones). Guard: keep a frozen **regression suite** of historical settled events; any candidate must not regress on it (a replay/rehearsal guard, the standard mitigation for catastrophic forgetting).

### Concrete GSE implementation

- **Capture & settlement** already exist (pick lifecycle, grading, `apps/web/lib/calibration`). The loop adds a **`scoreLearningLoopHealth`** that checks each stage is firing: are outcomes being captured? settled within SLA? fed to calibration? drift checked? — and flags a *stalled* loop (e.g., settlements lagging) before it silently rots.
- **Drift** → `scoreDriftRisk` (section 2).
- **Promotion** → `scoreModelPromotionReadiness` (section 2), gating the existing model-version field on picks (`model_version` per CLAUDE.md).
- **Deploy/rollback** → a deploy is just bumping the champion `model_version`; rollback is reverting it. Both are owner-visible events in the cockpit; an *auto-rollback* on a hard calibration regression is allowed (it's a safety reversal toward the known-good state, never a new public claim), but an *auto-promote* is **owner-gated**.

### Risks & guardrail

- **Risk:** feedback loops amplify their own bias (we learn from picks we chose to make). **Guardrail:** reject-inference down-weighting + a logged "settled population ≠ all candidates" caveat that propagates to any calibration surface.
- **Risk:** online learning drifts a model in real time with no audit. **Guardrail:** online updates touch *priors only*; the public confidence model changes only via the versioned promotion gate.
- **Guardrail (trust/agency):** the loop can propose a challenger and even auto-revert to the last good champion, but **promoting** a new public-facing model requires the human approval gate (same `HumanApprovalGate` the agent layer already defines). No pick is published, no price changes, no bet is placed by this loop — ever.

---

## 2. Model & data monitoring

### Pattern

Three monitors run continuously: **input drift**, **data quality**, and **calibration over time** — each with alerting thresholds and a **champion-vs-challenger promotion contract**.

### Drift detection — the methods, and when GSE uses each

| Method | Detects | GSE use | Cited convention |
|---|---|---|---|
| **PSI** (Population Stability Index) | feature-distribution shift vs a reference window | per-feature feed monitoring (e.g., line distribution, pace) | PSI > 0.25 = meaningful drift; 0.1–0.25 = watch ([StatsTest](https://www.statstest.com/drift-detection-ks-test-psi-interpret-signals); [Practical ML](https://practicalml.net/Detecting-data-drift/)) |
| **KL / JS divergence** | distribution distance (KL is PSI's asymmetric cousin) | small-sample / categorical features | PSI is, up to binning, a symmetrized KL ([Evidently](https://www.evidentlyai.com/blog/data-drift-detection-large-datasets)) |
| **KS test** | whether two samples share a distribution (continuous) | numeric features, large samples | reject null ⇒ drift ([DataCamp](https://www.datacamp.com/tutorial/understanding-data-drift-model-drift)) |
| **ADWIN / Page-Hinkley** | *streaming* change points (concept drift) | settled-outcome stream: did model→reality break? | adaptive window splits on significant difference ([Medium, Shukla 2025](https://medium.com/@shukla.shankar.ravi/navigating-data-drift-in-the-ai-ecosystem-a-practical-guide-to-detection-methods-and-monitoring-cc82a3911885)) |

**Why it works.** Data drift (inputs look different) and concept drift (the input→outcome relationship changed) have different fixes; using distribution tests for the former and sequential detectors for the latter catches both ([MetricGate, feature vs concept drift](https://metricgate.com/blogs/feature-drift-vs-concept-drift/)).

### Concrete GSE implementation — `scoreDriftRisk`

Pure function over `DriftSignals`:

```
DriftSignals {
  psi: number;                 // max per-feature PSI vs reference window
  ksPValue: number | null;     // smallest KS p-value across numeric features
  klDivergence: number | null; // categorical features
  adwinAlarmed: boolean;       // streaming concept-drift detector fired
  sampleSinceReference: number;// settled events since the reference window
  feedHealth: FeedHealth;      // reuse data-excellence FeedHealth
}
```

Banding mirrors the cited conventions: PSI ≥ 0.25 → very-high contribution, 0.1–0.25 → moderate, < 0.1 → low; an ADWIN alarm or KS p < 0.01 lifts the band; small `sampleSinceReference` caps `confidence` at `tentative` (we don't cry drift on noise). Orientation: **higher = riskier**. This *extends* the existing calibration-drift system rather than replacing it — calibration-drift watches outcome calibration; `scoreDriftRisk` watches the *inputs* that precede it.

### Data-quality monitor

Already covered by `scoreDataQuality` per item and `scoreSourceIntegrity` per source. The monitoring layer adds an **aggregate**: rolling rate of items below the quality floor, feed-health transitions (`healthy→degraded→stale`), and missing-confirmation rate — surfaced as a daily watchlist, not a new score.

### Calibration monitoring

`scoreCalibrationHealth` (existing, in data-excellence) is the per-snapshot view. Monitoring tracks it **over time**: reliability-curve drift, Brier trend, per-confidence-bin coverage. Murphy's decomposition (uncertainty / resolution / reliability) lets us say *why* it moved ([Wikipedia, scoring rule](https://en.wikipedia.org/wiki/Scoring_rule)).

### Champion-vs-challenger promotion contract — `scoreModelPromotionReadiness`

A challenger may replace the champion **only if all gates pass** (this is the standard shadow/dark-launch pattern — challengers score the same live inputs but their predictions are *logged, never served* ([DataRobot challengers](https://docs.datarobot.com/en/docs/mlops/monitor/challengers.html); [ModelOp champion-challenger](https://www.modelop.com/ai-governance/glossary/champion-challenger-testing))):

```
PromotionSignals {
  shadowDays: number;            // min shadow period observed
  settledSample: number;         // settled events the challenger was scored on
  challengerBrier: number;       // proper score (lower better)
  championBrier: number;
  calibrationRegressed: boolean; // challenger worse-calibrated on any bin?
  forgettingRegressionPassed: boolean; // beats frozen historical suite
  ownerApproved: boolean;        // the human gate
}
```

Gates, each citeable to the pattern:
1. **No calibration regression** (`calibrationRegressed === false`) — sharper-but-overconfident is a *fail*, not a win.
2. **Minimum settled sample** — below it, `confidence` is capped and the function flags "insufficient sample"; GSE's own ladder uses **≥100 settled** as the first proof gate (CLAUDE.md PROVEN tier), so we reuse that floor.
3. **Shadow period served** — challenger must have run shadow for the configured `shadowDays`.
4. **Proper-score improvement** — `challengerBrier < championBrier` by a margin, not noise.
5. **Forgetting guard passed** — beats the frozen historical regression suite.
6. **Owner approval** — the score can reach "ready" but **promotion still requires `ownerApproved`**; the function returns ready-but-gated, never auto-promotes.

### Risks & guardrail

- **Risk:** a challenger games the offline metric and fails live. **Guardrail:** shadow on *live* logged inputs (not just holdout) before any promotion.
- **Risk:** alert fatigue from over-sensitive thresholds. **Guardrail:** two-tier thresholds (watch vs alarm) and require sample minimums before alarming.
- **Guardrail (trust/agency):** promotion is the most consequential autonomous-looking step, so it is the **most** human-gated. The system computes readiness; the owner promotes.

---

## 3. Autonomy taxonomy — the L0–L5 ladder

### Pattern

Borrow SAE J3016's driving-automation levels as a shared vocabulary for *product capability* autonomy, where each level is a formal statement of **operational risk, who's in the loop, and the technically-enforced boundary** — not a slogan ([CSA, Levels of Autonomy for Agentic AI](https://cloudsecurityalliance.org/blog/2026/01/28/levels-of-autonomy); [ASDLC L1–L5](https://asdlc.io/concepts/levels-of-autonomy/); [Datasaur, Agents→Autonomy](https://datasaur.ai/blog/from-agents-to-autonomy-a-practical-framework-for-agentic-ai-levels-1-5)).

**Why it works.** "Autonomy boundaries must be technically enforced, not just policy-documented" — the boundary *is* the autonomy level ([ASDLC](https://asdlc.io/concepts/levels-of-autonomy/)). A shared ladder also lets a capability **auto-demote** under anomaly (drop from L3 to L1 if drift alarms or a feed breaks), which several frameworks call out as the key safety move.

### GSE ladder definition (`classifyAutonomyLevel`)

| Level | Name | What the system may do unattended | Human role | GSE guardrail at this level |
|---|---|---|---|---|
| **L0** | Manual | nothing automatic | does everything | n/a — fully manual |
| **L1** | Assist | suggest, draft, compute; output easy to verify | reviews & executes all | every output labeled draft/suggested; no side effects |
| **L2** | Supervised batch | run repeatable jobs (data refresh) on schedule; flag exceptions | reviews exceptions, owns outputs | self-reports failures; quality floor or it stops |
| **L3** | Conditional autonomy | act within a machine-checked boundary; route edge cases to a queue | on-the-loop; handles escalations | boundary engine permits / blocks+logs / escalates; auto-demotes on anomaly |
| **L4** | High autonomy (bounded domain) | operate unattended inside a *narrow, low-stakes, reversible* domain | spot-audits; can override | reversible only; hard caps; no public-facing or money-moving acts |
| **L5** | Full autonomy | unattended across open domains | none | **GSE deliberately ships NOTHING at L5.** Reserved/forbidden for any owner-gated, public, or wagering capability. |

`classifyAutonomyLevel(capability)` takes a capability descriptor (side-effect type, reversibility, public boundary, stake, whether a machine-checkable boundary exists, current monitor health) and returns `{ level, guardrail, reasons, maxLevelAllowed }`. Two hard rules baked in:
- Any capability that is **public-facing, money-moving, or owner-gated** has `maxLevelAllowed = L3` — it can *propose* autonomously but never *commit* without the gate.
- If a relevant monitor is unhealthy (`scoreDriftRisk` high, feed broken), the function **auto-demotes** the returned level. Autonomy is conditional on monitoring being green.

### Mapping GSE capabilities (the guardrail at each)

Full table in §8. Headline: data refresh can reach L3; projections L2–L3; content drafting L1 (publishing forever L0-for-the-machine / owner action); picks generation L2 internally but **publishing is owner action**; pricing changes are **L0 for the machine** — proposal-only, always owner-gated (CLAUDE.md: pricing has a single source of truth and named proof gates).

### Risks & guardrail

- **Risk:** level inflation ("it's been fine, let's let it ship"). **Guardrail:** `maxLevelAllowed` is a property of the *capability class* (public/money/owner-gated → capped), not of recent luck.
- **Guardrail (trust/agency):** the ladder's top two rungs are off-limits to anything that touches users' money, public claims, or the owner's voice. The machine's ceiling for those is "propose, with a receipt."

---

## 4. Agent-orchestration quality

### Pattern

Make the LLM/agent layer *measurable and bounded*: offline + online **eval harness**, **LLM-as-judge with explicit rubrics**, **prompt/version registry**, **structured-output validation**, **tool-use guardrails**, **retrieval grounding**, **self-consistency/debate**, **deterministic fallbacks**, **cost/latency budgets**, and **observability/tracing**.

**Why it works.** "Decide whether you're evaluating the base model or the product (prompts, retrieval, tools, guardrails)" — product evals ask only whether the system solves the task accurately, safely, consistently ([LLM Evaluation in 2025, Medium](https://medium.com/@QuarkAndCode/llm-evaluation-in-2025-metrics-rag-llm-as-judge-best-practices-ad2872cfa7cb)). GSE's agent council already has per-role contracts; evals turn those contracts into *pass/fail tests*.

### Concrete GSE implementation (extends `agent-orchestration.ts`, reuses `scoreAgentTrust`)

- **Eval harness (offline + online).** Offline: a fixed set of graded scenarios per agent role, asserting the role's `acceptance` clause (e.g., the Injury Agent never presents stale status as current). Online: sampled live runs scored the same way. This is the promptfoo/DeepEval pattern — deterministic assertions + model-graded rubric assertions + score rollups ([LLM eval in 2025](https://medium.com/@QuarkAndCode/llm-evaluation-in-2025-metrics-rag-llm-as-judge-best-practices-ad2872cfa7cb)). Eval pass-rate becomes the `calibratedReliability` input that `scoreAgentTrust` already consumes — closing the loop between *evals* and *earned autonomy*.
- **LLM-as-judge with rubrics.** A judge model scores agent outputs against a per-role rubric (input + output + rubric → score + reasoning), the standard formulation ([Langfuse, LLM-as-a-judge](https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge); [Ragas, align LLM-as-judge](https://docs.ragas.io/en/stable/howtos/applications/align-llm-as-judge/)). Guard against judge bias: align the judge to a small human-graded set first; report judge precision/recall, not just its scores.
- **Prompt/version registry.** Every agent prompt is versioned (id + hash + changelog), so an eval result is attributable to a prompt version and a regression is bisectable. Mirrors the model-version discipline GSE already applies to picks.
- **Structured-output validation.** Every agent already declares an `outputSchema`; enforce it with a schema validator and treat a parse failure as a hard fail that triggers the deterministic fallback — one of the measurable guardrails (rules / JSON-schema + a strict-rubric judge, with pass-rate, precision/recall, p95 latency tracked) ([10 LLM Guardrails You Can Measure, Medium](https://medium.com/@connect.hashblock/10-llm-guardrails-you-can-measure-with-evals-8f224cc83c9f)).
- **Tool-use guardrails.** Each role already declares `allowedTools`; enforce at call time — a tool not in the allowlist is blocked and logged, and evasion tools can never enter the registry (CLAUDE.md scraping posture).
- **Retrieval grounding.** Agents answer from the Evidence Engine / approved sources with citations, not free recall — the Ragas faithfulness / context-precision idea: grounded answers reduce hallucination and are *checkable* ([Ragas](https://docs.ragas.io/en/stable/howtos/applications/align-llm-as-judge/)). An ungrounded claim is a flag.
- **Self-consistency / debate.** The council already escalates on disagreement; promote *productive* disagreement — Red-Team Agent attacks the strongest version, multiple samples vote, and unresolved conflict escalates rather than getting averaged into false confidence.
- **Deterministic fallbacks.** If the LLM path fails validation, exceeds budget, or low-confidences, fall back to the structured/rules path (odds and settled data are the source of truth, per CLAUDE.md — the model is content-only). The product degrades to *honest and quiet*, never to *confident and wrong*.
- **Cost/latency budgets + tracing.** Per-run token/cost/latency budgets with p95 tracking; full tracing spans per agent run (token consumption, cost per operation, error rate, duration) — the LLM-observability pattern ([OpenObserve LLM observability](https://www.businesswire.com/news/home/20260429034926/en/OpenObserve-Introduces-AI-Native-Observability-Platform-with-Autonomous-AI-SRE-Agent-to-Unify-Infrastructure-Application-and-LLM-Monitoring)).

### Risks & guardrail

- **Risk:** LLM-as-judge inherits the generator's blind spots / is gameable. **Guardrail:** human-aligned judge calibration set + report judge agreement; never let the judge alone unlock autonomy.
- **Risk:** eval overfitting (teaching to the test). **Guardrail:** rotate held-out scenarios; track online pass-rate, not just offline.
- **Guardrail (trust/agency):** a high eval score raises an agent's *trust tier* toward `advisor`/`operator` but **never** unlocks an owner-gated action — `scoreAgentTrust` already encodes "owner-gated actions are never unlocked by this score."

---

## 5. Self-working operations

### Pattern

The platform runs and heals itself for the *boring, reversible* work, and escalates the rest: **scheduled jobs, self-healing/auto-retry, synthetic monitoring, autonomous backfill, anomaly→ticket, and an owner daily brief.**

**Why it works.** Self-healing workflows = detect → triage/investigate → RCA → remediate, with autonomous recovery built into the pipeline so degradation is fixed without a human for known failure classes ([Self-Healing Observability Pipelines](https://eudoxuspress.com/index.php/pub/article/download/4046/2936/8050); [DevOps.com, Agentic AIOps](https://devops.com/agentic-ai-in-observability-platforms-empowering-autonomous-sre/)). The frontier reports faster MTTR from agentic AIOps — but GSE adopts the *pattern*, not unverifiable headcount claims.

### Concrete GSE implementation (extends Agents OS + synthetic monitoring already in the repo)

- **Job scheduling.** Data refresh, settlement, calibration, drift checks run on schedule (BullMQ/Redis per stack). `scoreLearningLoopHealth` watches that each stage actually ran on time.
- **Self-healing.** Known-failure remediations are L2/L3: retry with backoff, fail over to the `fallbackSourceId` already on every `DataSourceRecord`, mark a feed `degraded/stale` and stop trusting it — all reversible, all logged. Unknown failures escalate.
- **Synthetic monitoring.** Already present; extend with probes that assert the *self-learning* invariants (settlement SLA met, calibration snapshot fresh, drift job ran), not just uptime.
- **Autonomous backfill.** When a feed recovers, backfill the gap automatically — but every backfilled record carries its `RightsSnapshot` and lineage (CLAUDE.md envelope rules); a backfill that would exceed source rights is blocked, not forced.
- **Anomaly→ticket.** A monitor alarm (drift high, calibration regressed, feed broken) opens a structured ticket with an RCA stub (which monitor, which signal, suspected cause) — the incident-detection→triage→RCA flow — so the owner gets a *diagnosis*, not just a red light.
- **Owner daily brief.** One automated digest: loop health, drift watchlist, calibration trend, agent eval pass-rates, open tickets, and any challenger *ready but awaiting your approval*. This is the surface that makes autonomy legible — the owner sees what the system did and what it's *asking permission* to do.

### Risks & guardrail

- **Risk:** auto-remediation masks a real upstream problem (silently failing over forever). **Guardrail:** every self-heal is ticketed and time-boxed; repeated heals escalate.
- **Risk:** backfill replays stale data as if fresh. **Guardrail:** backfilled records keep their *original* timestamps; freshness scoring treats them honestly (CLAUDE.md: no stale data).
- **Guardrail (trust/agency):** self-working ops covers infrastructure, never *judgment*. It can restart a job; it cannot publish a pick, change a price, or place a wager. The daily brief always routes those to the owner.

---

## 6. Forecasting improvement

### Pattern

Score forecasts with **proper scoring rules**, make **calibration the north-star**, consider **extremizing ensembles**, and enforce **backtesting discipline + leakage prevention**.

**Why it works.** Proper scoring rules reward forecasts that are *sharp subject to calibration* — they can't be gamed by hedging ([Proper scoring rules, arXiv 2504.01781](https://arxiv.org/html/2504.01781v1); [Wikipedia, scoring rule](https://en.wikipedia.org/wiki/Scoring_rule)).

### The scores GSE uses, and why each

| Rule | Property | GSE use |
|---|---|---|
| **Brier** | bounded, intuitive, decomposes into reliability/resolution/uncertainty (Murphy) | primary binary-pick score; the promotion gate compares Brier |
| **Log loss** | maximal sensitivity to *over-confidence* (punishes sharp wrong) | over-confidence alarm — penalizes low-entropy, confidently-wrong picks ([proper scoring rules survey](https://www.emergentmind.com/topics/proper-scoring-rules)) |
| **CRPS** | robust to tails, indifferent to over/under-dispersion | for *distributional* projections (player props), not just binary picks |

**Calibration as north-star.** GSE's pricing ladder is *already* calibration-gated (PROVEN = ≥100 settled + published calibration; ESTABLISHED = verified CLV ≥ 52.4% — the break-even win rate at standard -110 odds, an arithmetic fact). So calibration isn't a vanity metric here; it's the gate on what we're allowed to claim and charge. `scoreForecastQuality` composes Brier/log/CRPS + reliability-curve error into one settled-record view, with `confidence` capped until the sample is large enough (reusing the ≥100 floor).

**Extremizing ensembles.** When several independent models agree, the consensus is often *under*-confident; a calibrated extremizing transform can sharpen it — but **only after** calibration verifies it, and only for internal ranking. GSE applies this cautiously and never to inflate a public confidence number (that would invert the trust posture).

**Backtesting discipline + leakage prevention.** Backtests use strictly point-in-time data (only what was known *before* the event); any feature that could encode the outcome is leakage and is excluded. Walk-forward / out-of-time splits, never random splits across time. Reject-inference (§1) reminds us the backtest population is the *settled* one, not all candidates.

### Risks & guardrail

- **Risk:** chasing sharpness at the cost of calibration (looks impressive, is overconfident). **Guardrail:** log loss + the no-calibration-regression promotion gate catch it.
- **Risk:** subtle leakage inflates backtest scores. **Guardrail:** point-in-time feature store + a leakage checklist in the eval harness; a "too-good" backtest is treated as a leakage suspect, not a victory.
- **Guardrail (trust/agency):** forecast *quality* improvements change internal ranking and what we *may* claim; they never auto-publish a stronger claim. Any public calibration number passes the existing claim-safety scanner and the owner gate.

---

## 7. The end-to-end self-learning loop (diagram + steps)

```
                          ┌───────────────────────────────────────────────────┐
                          │            OWNER DAILY BRIEF (cockpit)            │
                          │  loop health · drift watchlist · calibration trend │
                          │  agent eval pass-rates · tickets · "ready: approve?"│
                          └───────────▲───────────────────────────┬───────────┘
                                      │ legible                    │ owner approves / declines
                                      │                            ▼
 (1) CAPTURE        (2) SETTLE        (3) CALIBRATE        (8) PROMOTION GATE  ── owner-gated ──┐
 predictions   ──▶  real outcomes ──▶ scoreCalibration ──▶ scoreModelPromotion                 │
 + model_version    graded            Health (existing)    Readiness  ✗fail→stay champion       │
      │                  │                  │                   ▲                                │
      │                  │                  ▼                   │ all gates pass                 ▼
      │                  │           (4) DRIFT DETECT      (7) SHADOW / CHAMPION-CHALLENGER  (9) DEPLOY
      │                  │           scoreDriftRisk        challenger scores LIVE inputs,    bump champion
      │                  │           PSI/KL/KS/ADWIN       predictions LOGGED not served     model_version
      │                  │                  │                   ▲                                │
      │                  │      high drift?  ▼                   │ candidate built                ▼
      │                  └────────────▶ (5) PRIORITIZE ──▶ (6) CANDIDATE MODEL           (10) MONITOR
      │                          active learning:          online priors / blend;              ── regression? ──┐
      │                          fragility × stake         bandit picks arm (shadow)           │                │
      │                                                                                         ▼                │
      └──────────────────────────────  AUTO-ROLLBACK to last-good champion on hard regression ◀┘ (safety only)  │
                                        (reversal allowed; promotion never auto)                                  │
                                                                                                                  │
   reject-inference caveat ("settled ≠ all candidates") + forgetting guard (frozen historical suite) span steps 3–8
```

**Numbered steps**

1. **Capture** every prediction with its `model_version`, confidence, and inputs ref (existing pick lifecycle).
2. **Settle** against real outcomes; grade them (existing grading).
3. **Calibrate** — update `scoreCalibrationHealth`; track reliability curve over time.
4. **Detect drift** — `scoreDriftRisk` on inputs (PSI/KL/KS) + ADWIN on the settled stream.
5. **Prioritize** — active learning routes scarce attention to high-fragility, high-stake games; high drift opens a ticket.
6. **Candidate model** — build a challenger (new blend, updated priors); a bandit may choose which arm to *shadow*.
7. **Shadow** — challenger scores the same *live* inputs; predictions are **logged, never served**.
8. **Promotion gate** — `scoreModelPromotionReadiness`: no calibration regression, ≥ min settled sample, shadow period served, Brier improvement, forgetting-guard passed. Passing yields **ready-but-owner-gated**.
9. **Deploy** — on owner approval, bump champion `model_version`. (Auto-**rollback** to last-good is allowed on hard regression; auto-**promote** is not.)
10. **Monitor** — back to step 1; a hard calibration regression triggers auto-rollback and a ticket; the owner brief shows everything.

---

## 8. Capability → autonomy map (≥12 rows)

`classifyAutonomyLevel` produces this; "Current" reflects today's posture, "Target" the safe ceiling.

| Capability | Current (L0–L5) | Target | Guardrail | Next step |
|---|---|---|---|---|
| Data refresh (scheduled feed pulls) | L2 | L3 | quality floor + `fallbackSourceId` failover; auto-demote on feed break | wire `scoreDriftRisk` into the refresh job |
| Data backfill after recovery | L1 | L3 | RightsSnapshot + lineage per record; rights-exceeding backfill blocked | autonomous gap-fill within rights only |
| Source-rights clearance | L3 | L3 | `permission_required`/`excluded` hard-stop; evasion tools never registered | keep at L3; never higher (legal) |
| Projections (players/teams) | L2 | L3 | always emit distribution/band; labeled *modeled*; versioned | shadow challenger projections |
| Ownership estimates (DFS) | L2 | L3 | labeled *modeled, not measured* on every surface | calibrate vs post-hoc ownership |
| Calibration computation | L2 | L3 | gated behind ≥100 settled sample; never publish thin | auto-snapshot + trend monitor |
| Drift detection | L1 | L3 | watch vs alarm two-tier; alarm opens a ticket | ship `scoreDriftRisk` |
| Model promotion (champion swap) | L0 (for machine) | **L3 cap — propose only** | all promotion gates + **owner approval**; auto-rollback only | ship `scoreModelPromotionReadiness` (ready-but-gated) |
| Content drafting (GSN) | L1 | L1 | draft-only; data-backed; claim-safety scan | keep drafting; publishing stays owner action |
| Content **publishing** | L0 (for machine) | **L0 cap** | owner action; never machine-published | unchanged — forbidden to automate |
| Picks generation (internal) | L2 | L3 | sourced from real data; versioned; fragility-flagged | shadow challenger pick models |
| Picks **publishing** | L0 (for machine) | **L0 cap** | owner-gated; server-side tier enforcement | unchanged |
| Pricing / tier changes | L0 (for machine) | **L0 cap** | single source of truth + named proof gates; owner-gated | propose-only experiments via Revenue Agent |
| Agent council runs | L2 | L3 | per-role contracts; escalate on disagreement; owner-gated actions stay gated | eval-harness pass-rate → `scoreAgentTrust` |
| Self-healing ops (retry/failover) | L2 | L3 | reversible only; every heal ticketed & time-boxed | extend synthetic monitors |
| Anomaly→ticket + RCA stub | L1 | L3 | diagnosis-only; never auto-acts on judgment | wire monitors to ticket loop |
| Owner daily brief | L2 | L3 | read-only digest; surfaces *asks*, never acts | automate the digest |

> Every "L0 cap (for machine)" row is a deliberate ceiling: the machine may *prepare and propose*, but committing is the owner's act. No row reaches L4/L5 for anything public, money-moving, or owner-gated.

---

## 9. Top 10 highest-leverage upgrades (ranked, with build sketch)

1. **`scoreDriftRisk` + drift job** *(input-drift monitor)*. **Build:** new fn over `DriftSignals` (PSI/KL/KS/ADWIN), banded to cited thresholds; a scheduled job computes it per feature window and opens a ticket on alarm. **Why #1:** drift is the silent killer of calibrated confidence; cheap to add, guards everything downstream.
2. **`scoreModelPromotionReadiness` + shadow harness** *(safe model evolution)*. **Build:** challenger logs predictions on live inputs; the fn enforces the six gates; cockpit shows "ready — approve?" Owner promotes. **Why:** turns "we improved the model" into an *auditable, reversible, gated* event.
3. **Agent eval harness → `scoreAgentTrust` feedback loop** *(better AI systems)*. **Build:** per-role offline + sampled-online scenarios asserting each `acceptance` clause; pass-rate feeds `calibratedReliability`. **Why:** makes agent trust *earned by measured behavior*, not declared.
4. **`scoreLearningLoopHealth` + owner daily brief** *(make autonomy legible)*. **Build:** checks each loop stage fired on SLA; the brief digests loop health, drift, calibration trend, eval rates, and pending approvals. **Why:** an owner who can *see* the loop will trust more autonomy; opacity is the real blocker.
5. **`classifyAutonomyLevel` + auto-demotion** *(formalize the ceilings)*. **Build:** capability descriptor → level + guardrail + `maxLevelAllowed`; demote when a monitor is unhealthy. **Why:** encodes "public/money/owner-gated ⇒ propose-only" as code, not vibes.
6. **`scoreForecastQuality` (Brier/log/CRPS + calibration)** *(north-star metric)*. **Build:** compose proper scores over the settled record; cap `confidence` under the ≥100 floor. **Why:** one honest number to drive promotion and (eventually, gated) public claims.
7. **LLM-as-judge with aligned rubrics + prompt registry** *(measurable agent quality)*. **Build:** versioned prompts; a judge aligned to a small human-graded set; report judge precision/recall. **Why:** scalable quality signal that's itself checkable.
8. **Anomaly→ticket loop with RCA stubs** *(self-working ops)*. **Build:** monitor alarms open structured tickets (which monitor, signal, suspected cause). **Why:** turns red lights into diagnoses; multiplies the owner's time.
9. **Active-learning prioritizer** *(spend attention well)*. **Build:** rank games/players by `decision_fragility` × stake; route review + extra pulls + debate budget there. **Why:** uncertainty where it matters most improves the model fastest per unit effort.
10. **Forgetting-guard regression suite + leakage checklist** *(don't regress, don't cheat)*. **Build:** frozen historical settled set every challenger must not regress on; point-in-time feature checklist in the eval harness. **Why:** protects against catastrophic forgetting and the "too-good backtest" leakage trap.

---

## 10. What this explicitly does NOT do

- No auto-publishing of content or picks. Drafting is autonomous; publishing is the owner's act.
- No auto-betting / wagering. GSE forecasts and explains; it never places a wager.
- No auto-pricing. Pricing has a single source of truth and named proof gates (CLAUDE.md); changes are owner-gated proposals.
- No L4/L5 for anything public, money-moving, or owner-gated — those are capped at "propose, with a receipt."
- No fabricated metrics. Every threshold here is a cited convention or arithmetic fact; GSE reports calibration only after the ≥100-settled floor, with the reject-inference caveat attached.

---

## Sources

- Databricks — MLOps workflow (retraining/monitoring loop): https://docs.databricks.com/aws/en/machine-learning/mlops/mlops-workflow
- Dataiku — Monitoring and feedback in the AI project lifecycle: https://knowledge.dataiku.com/latest/mlops-o16n/model-monitoring/concept-monitoring-feedback.html
- DataRobot — Challengers (shadow/dark-launch challengers): https://docs.datarobot.com/en/docs/mlops/monitor/challengers.html
- ModelOp — Champion-Challenger testing (definition): https://www.modelop.com/ai-governance/glossary/champion-challenger-testing
- River — online/streaming ML library: https://riverml.xyz
- Thompson sampling — Wikipedia: https://en.wikipedia.org/wiki/Thompson_sampling
- Multi-armed bandits in MLOps deployment (arXiv 2503.22595): https://arxiv.org/pdf/2503.22595
- StatsTest — Drift detection: KS test, PSI, interpreting signals: https://www.statstest.com/drift-detection-ks-test-psi-interpret-signals
- Practical ML — Detecting data drift: https://practicalml.net/Detecting-data-drift/
- Evidently — Comparing 5 drift-detection methods on large datasets: https://www.evidentlyai.com/blog/data-drift-detection-large-datasets
- DataCamp — Understanding data drift and model drift: https://www.datacamp.com/tutorial/understanding-data-drift-model-drift
- MetricGate — Feature drift vs concept drift: https://metricgate.com/blogs/feature-drift-vs-concept-drift/
- Shukla (Medium, Oct 2025) — Navigating data drift, detection methods (PSI/KL/KS/ADWIN): https://medium.com/@shukla.shankar.ravi/navigating-data-drift-in-the-ai-ecosystem-a-practical-guide-to-detection-methods-and-monitoring-cc82a3911885
- CSA — Levels of Autonomy for Agentic AI (Jan 2026): https://cloudsecurityalliance.org/blog/2026/01/28/levels-of-autonomy
- ASDLC — Levels of Autonomy (L1–L5 scale, technically-enforced boundaries): https://asdlc.io/concepts/levels-of-autonomy/
- Datasaur — From "Agents" to Autonomy (Levels 1–5): https://datasaur.ai/blog/from-agents-to-autonomy-a-practical-framework-for-agentic-ai-levels-1-5
- LLM Evaluation in 2025 (Medium) — metrics, RAG, LLM-as-judge, best practices: https://medium.com/@QuarkAndCode/llm-evaluation-in-2025-metrics-rag-llm-as-judge-best-practices-ad2872cfa7cb
- Langfuse — LLM-as-a-judge: https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge
- Ragas — Align an LLM as a Judge (faithfulness/context metrics): https://docs.ragas.io/en/stable/howtos/applications/align-llm-as-judge/
- 10 LLM Guardrails You Can Measure With Evals (Medium): https://medium.com/@connect.hashblock/10-llm-guardrails-you-can-measure-with-evals-8f224cc83c9f
- OpenObserve — AI-native LLM observability (token/cost/latency tracing): https://www.businesswire.com/news/home/20260429034926/en/OpenObserve-Introduces-AI-Native-Observability-Platform-with-Autonomous-AI-SRE-Agent-to-Unify-Infrastructure-Application-and-LLM-Monitoring
- Self-Healing Observability Pipelines (Eudoxus Press): https://eudoxuspress.com/index.php/pub/article/download/4046/2936/8050
- DevOps.com — Agentic AI in observability platforms (autonomous SRE): https://devops.com/agentic-ai-in-observability-platforms-empowering-autonomous-sre/
- Proper scoring rules for estimation and forecast evaluation (arXiv 2504.01781): https://arxiv.org/html/2504.01781v1
- Scoring rule — Wikipedia (Brier, log, CRPS, Murphy decomposition): https://en.wikipedia.org/wiki/Scoring_rule
- Proper Scoring Rules: Foundations & Applications (EmergentMind): https://www.emergentmind.com/topics/proper-scoring-rules

---

### Coherence note for implementers

This doc adds **one** module (`apps/web/lib/gse/self-learning.ts`) with five pure scoring functions and the `AutonomyLevel` type, plus five rows in `GSE_SCORING_SYSTEMS`, plus jobs that wire existing systems (calibration, calibration-drift, synthetic monitoring, Agents OS, cockpit) into a closed loop. It **reuses** `GseScore`/`makeScore`, `FeedHealth`, `HumanApprovalGate`, `scoreAgentTrust`, `scoreCalibrationHealth`, and the pricing proof-gate floors. It introduces **no** new way to publish, price, or wager. Per the Autonomous Loop Protocol, the implementing change is not complete until tests, types, and build pass — `self-learning.ts` ships with a `gse-contracts.test.ts` extension covering each new score's bands, caps, and gates.

---

## Appendix A — Implementable contract sketches

These are *design sketches* for `apps/web/lib/gse/self-learning.ts`, in the existing GSE style (pure functions, `GseScore` out, rationale + flags, no `any`). They are not yet shipped; they show an implementer the exact shapes and banding logic. Thresholds are the cited conventions from §2 and §6.

### A.1 `scoreDriftRisk` — banding logic

```
// orientation: higher_is_riskier
function scoreDriftRisk(s: DriftSignals): GseScore {
  let risk = 0; const flags: string[] = [];
  // PSI is the spine (StatsTest/Practical ML conventions)
  if (s.psi >= 0.25) { risk += 55; flags.push("PSI >= 0.25: meaningful input drift"); }
  else if (s.psi >= 0.10) { risk += 25; flags.push("PSI 0.10-0.25: watch"); }
  // KS p-value and KL reinforce
  if (s.ksPValue != null && s.ksPValue < 0.01) { risk += 20; flags.push("KS p<0.01: distribution shift"); }
  if (s.klDivergence != null && s.klDivergence > 0.5) risk += 10;
  // ADWIN = streaming CONCEPT drift (the dangerous kind)
  if (s.adwinAlarmed) { risk += 25; flags.push("ADWIN alarm: input->outcome relationship moved"); }
  // feed health gates trust in the inputs themselves
  if (s.feedHealth === "stale" || s.feedHealth === "broken") flags.push("feed unhealthy: drift read unreliable");
  // small sample => can't cry drift on noise
  const conf: ScoreConfidence = s.sampleSinceReference >= 200 ? "supported"
    : s.sampleSinceReference >= 50 ? "tentative" : "speculative";
  if (s.sampleSinceReference < 50) flags.push("sample < 50 since reference: low-confidence drift read");
  return makeScore("drift_risk", risk, { confidence: conf, rationale: [...], flags });
}
```

**Acceptance tests:** PSI 0.30 → very_high band; PSI 0.05, no alarms → very_low; ADWIN alarm alone → at least moderate; sample 10 → `confidence === "speculative"` regardless of PSI.

### A.2 `scoreModelPromotionReadiness` — gate logic

```
// orientation: higher_is_better, but HARD GATES cap it
function scoreModelPromotionReadiness(s: PromotionSignals): GseScore {
  const flags: string[] = []; let ready = 0;
  const brierGain = s.championBrier - s.challengerBrier; // >0 means challenger better
  // HARD GATES (any failure hard-caps the score low)
  if (s.calibrationRegressed) { flags.push("BLOCK: calibration regressed"); return makeScore("model_promotion_readiness", 15, { confidence: "supported", rationale: ["calibration regression is a hard block"], flags }); }
  if (s.settledSample < 100) { flags.push("BLOCK: settled sample < 100 (PROVEN-tier floor)"); return makeScore("model_promotion_readiness", 20, { confidence: "tentative", rationale: ["insufficient settled sample"], flags }); }
  if (!s.forgettingRegressionPassed) { flags.push("BLOCK: failed frozen historical suite (catastrophic forgetting)"); return makeScore("model_promotion_readiness", 20, { confidence: "supported", rationale: ["forgetting guard failed"], flags }); }
  // SOFT contributions
  if (brierGain > 0.01) ready += 45; else if (brierGain > 0) { ready += 20; flags.push("Brier gain inside noise band"); }
  if (s.shadowDays >= 14) ready += 25; else flags.push(`shadow period ${s.shadowDays}d < 14d`);
  if (s.settledSample >= 500) ready += 20; // ESTABLISHED-tier richness
  // OWNER GATE is informational here — score can be "ready" but caller must check ownerApproved
  if (!s.ownerApproved) flags.push("READY BUT OWNER-GATED: promotion requires human approval");
  const conf: ScoreConfidence = s.settledSample >= 500 ? "well_supported" : "supported";
  return makeScore("model_promotion_readiness", ready, { confidence: conf, rationale: [...], flags });
}
```

**Acceptance tests:** `calibrationRegressed: true` → score ≤ 20 even with huge Brier gain; `settledSample: 80` → blocked; all gates pass but `ownerApproved: false` → high score *and* the owner-gated flag present (never auto-promotes).

### A.3 `classifyAutonomyLevel` — ceiling + demotion logic

```
type AutonomyLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5";
function classifyAutonomyLevel(c: CapabilityDescriptor): AutonomyClassification {
  const reasons: string[] = [];
  // HARD CEILING: anything public/money/owner-gated caps at L3 (propose-only).
  let maxLevelAllowed: AutonomyLevel = "L5";
  if (c.publicFacing || c.moneyMoving || c.ownerGated) { maxLevelAllowed = "L3"; reasons.push("public/money/owner-gated => max L3 (propose, never commit)"); }
  if (!c.reversible) maxLevelAllowed = min(maxLevelAllowed, "L3"); // irreversible acts stay gated
  if (!c.machineCheckableBoundary) maxLevelAllowed = min(maxLevelAllowed, "L2");
  // CURRENT level = capability's design level, then AUTO-DEMOTE on unhealthy monitors.
  let level = c.designLevel;
  if (c.monitorHealth === "unhealthy") { level = demoteToL1(level); reasons.push("monitor unhealthy => auto-demote to L1"); }
  level = min(level, maxLevelAllowed);
  return { level, maxLevelAllowed, guardrail: guardrailFor(level, c), reasons };
}
```

**Acceptance tests:** a pricing capability (`moneyMoving: true`) returns `maxLevelAllowed === "L3"` no matter its `designLevel`; a drift-detection capability with `monitorHealth: "unhealthy"` demotes to `L1`; content *publishing* (`ownerGated, !reversible`) never returns above L3 and its guardrail names the owner action.

### A.4 New rows for `GSE_SCORING_SYSTEMS`

| id | orientation | surface | misuse risk to encode |
|---|---|---|---|
| `drift_risk` | higher_is_riskier | internal | crying drift on small samples; ignoring concept drift while watching only inputs |
| `model_promotion_readiness` | higher_is_better | internal | promoting on offline Brier alone; skipping the shadow period |
| `learning_loop_health` | higher_is_better | internal | green loop-health masking a stalled settlement queue |
| `forecast_quality` | higher_is_better | mixed | publishing a thin-sample score; rewarding sharpness over calibration |
| `autonomy_level` | higher_is_riskier | internal | level inflation on a public/money/owner-gated capability |

Each row follows the existing `ScoringSystemSpec` shape (purpose, inputs, outputScale "0–100", v1 pointing at `self-learning.ts`, fn name). `autonomy_level` is expressed as a 0–100 risk proxy for the registry even though `classifyAutonomyLevel` also returns the discrete `AutonomyLevel` — keeping it in the registry lets the cockpit and red-team audit see it alongside the other 24 scores.
```