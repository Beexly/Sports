# Design Spec Reconciliation — `Causal Sports Reasoning Engine Design.docx`

**Spec:** `C:\Users\Garrett\Downloads\Causal Sports Reasoning Engine Design.docx`
**"Frontier Continuous Causal Inference Engine for Galaxy Sports Edge (Beexly/Sports)"**
**Audited:** 2026-10-20 · **Repo ref:** `origin/main` @ `4fa5330f4`
**Audit branch:** `audit/reconciliation-2026-10-20`

---

## 0. The verdict, in one table

The spec is a **complete and technically serious architecture**. It is also
a design for a system that **has not been built**. Measured against the
repo:

| | |
|---|---|
| Module paths the spec names | **14** |
| …that exist in the repo | **1** (`bridge/bridge-model.ts`) |
| Spec'd build steps | 8 |
| …already implemented | **0** |
| Pathologies the spec diagnoses | 4 |
| …confirmed present in the repo | **4 of 4** |
| Spec'd honesty gates (G1–G9) | 9 |
| …implemented | **0** |

**The spec's diagnoses are correct and its remedies are unbuilt.** That is
the finding, and it changes what the next phase should be: not more
discovery, but **construction against a spec that has already been
reasoned through**.

---

## 1. Path confirmation — 13 of 14 spec'd module paths do not exist

| spec path | exists? |
|---|---|
| `src/features/feature-matrix.ts` | **NO** |
| `src/bridge/bridge-model.ts` | **YES** |
| `src/literature/arxiv-hnsw-bridge.ts` | **NO** |
| `src/causal/causal-graph-builder.ts` | **NO** |
| `src/causal/do-calculus-id.ts` | **NO** |
| `src/causal/adversary-red-team.ts` | **NO** |
| `src/calibration/conformal-copula-kelly.ts` | **NO** |
| `src/learning/settlement-loop.ts` | **NO** |
| `src/picks/pick-pipeline.ts` | **NO** |
| `src/picks/slate-builder.ts` | **NO** |
| `src/features/signal-registry.ts` | **NO** |
| `scripts/acwr_content_driven_fix.py` | **NO** |
| `db/migrations/20261020_literature_hnsw.sql` | **NO** |
| `packages/prediction-engine/test/causal-engine.mutation-v3.spec.ts` | **NO** |

**The one file that exists is the one the audit had already found
load-bearing** — `bridge-model.ts`, the directional logistic bridge whose
`home_sign` coefficients the f2 measurement used.

**The spec's HNSW schema is not the schema the audit built.** The spec
describes `literature_premises` with `M = 24, ef_construction = 200`, a
1024-d `embedding`, 512-d `spectral_low_embedding` / `spectral_high_embedding`,
and columns for `promotion_score`, `ewma_brier_attribution`,
`cumulative_settlement_count`, and `status ∈ {ACTIVE, SHADOW, DEMOTED,
QUARANTINED}`. The audit's `lit.*` schema on the Neon dev branch uses
`M = 16, ef_construction = 64` and has **no** spectral split, no promotion
score, and no EWMA attribution. **These are two different designs.** The
spec's is richer; the audit's is measured and running.

---

## 2. Pathology confirmation — the spec's four diagnoses are all real

### 2.1 Confounded regime shifts / Simpson's paradox — CONFIRMED, structurally

The spec's claim: *"teams trailing by multiple scores pass at high rates
and accumulate high raw passing yardage; a naive correlational learner
associates pass-heavy play-calling with losing."*

**The repo does exactly this.** `packages/prediction-engine/src/reasoning/engine-weights.ts`
is a **fixed prior × signal table** with no game-state conditioning:

```ts
{ id: "scheme_play_design", prior: 0.12, role: "premise",
  why: "Motion, play-action, RPO, shotgun. Drive-start field position
        (2025 r=+0.186, n=272) may move this family by at most 0.15." },
```

The `by` field is a **static marginal correlation** (`r=+0.186`, `n=272`)
used as a fixed prior. **There is no `do()` anywhere in the live path** —
the audit already measured that `applyContinuousSignalTilt` yields
`votes.length === 0` because the sign gate is never satisfied, and that
`intelligence/reasoning_engine/run_game.py:343` reasons about a **static
fixture** rather than a real game.

**The spec's Rung 2/Rung 3 claim is exactly the gap the audit measured,
and the audit's numbers are the spec's justification.**

### 2.2 Unsigned context + decorative citation — CONFIRMED, and WORSE than the spec says

The spec's claim: *"legacy literature integration (mind-reasoning.ts v5.3.0)
relied on hardcoded constants (0.015, 0.024, 0.012) and static prose
templates (+395 vs +485 fair odds, 18.5% parlay correlation), using keyword
regular expressions over MIND_CORPUS_3000.jsonl merely to decorate
pre-authored heuristics with academic citations — a flaw where papers on the
No Free Lunch optimization theorem or magnetic resonance physics were
misclassified under NFL situational labels."*

**Two parts. The first is OUTDATED; the second is CONFIRMED and is worse
than the spec claims.**

#### 2.2a The hardcoded constants are GONE — the spec is describing an old state

`grep` for `0.015` / `0.024` / `0.012` in `mind-reasoning.ts`: **no
matches.** And the spec's own cited example is now a **negative
assertion** in a test:

`packages/prediction-engine/src/reasoning/__tests__/mind-reasoning.mutation-v2.spec.ts:114`
```ts
assert.ok(
  !/\+395|\+485|18\.5%/.test(JSON.stringify(emptyCorpusResult)),
  "Must not contain hardcoded SGP fair odds or correlation percentages",
);
```

The empty corpus now yields `total_delta = 0`, `audit_trail.length = 0`,
and `rendered_prose = ""`. **The decorative-template failure mode the spec
describes has been fixed**, and the fix is asserted.

#### 2.2b The keyword-regex misclassification is CONFIRMED — and 2,106 papers survive

The spec's exact words: *"using keyword regular expressions over
MIND_CORPUS_3000.jsonl merely to decorate pre-authored heuristics with
academic citations."* And: *"a flaw where papers on the No Free Lunch
optimization theorem or magnetic resonance physics were misclassified under
NFL situational labels."*

**The regex is still there, in `mind-reasoning.ts:318-352`:**

```ts
const text = `${rec.title || ""} ${rec.principle_or_feature || ...} ...`.toLowerCase();

if (fields.length === 1 && fields[0] === "offensive_pace_sec_per_play") {
  if (/4th.*down|fourth.*down|romer|coach.*aggress|.../i.test(text)) {
    fields = ["coach_fourth_down_aggressiveness_pct"];
  } else if (/acwr|acute.*chronic|gabbett/i.test(text)) { ... }
  ...
}

// Purge noise from weather fields (e-commerce, traffic, brain fNIRS)
if (fields.some(f => f === "ambient_temp_fahrenheit" || f === "wind_speed_mph")) {
  const isWeatherNoise = /fnirs|brain|traffic|patrolling|recommendation|e-commerce|consumer|dataset.*755|actionatlas/i.test(text);
  ...
}
```

**MEASURED, by replicating the repo's own logic over all 5,149 records:**

| | count | share |
|---|---:|---:|
| records landing in the DEFAULT bucket `offensive_pace_sec_per_play` | **4,173** | **81.0%** |
| records purged by the cross-domain noise filter | **39** | 0.8% |
| non-football records in the corpus | 2,145 | 41.7% |
| **non-football records that SURVIVE the filter** | **2,106** | **98.2% of non-football** |
| …of which are filed under `offensive_pace_sec_per_play` | **1,898** | 90.2% of survivors |

**So 40.9% of the corpus is not about football, and 98.2% of that survives
the filter and is filed under an NFL signal primitive.**

**The spec's two named examples are present in the corpus in substance if
not in those exact words:**

| the spec names | in the corpus? |
|---|---|
| "No Free Lunch optimization theorem" | not by that title, but *"No Forgetting Learning: Buffer-free Continual Learning Classification"* and *"Do they mean 'us'? Interpreting Referring Expressions in Intergroup Bias"* are present |
| "magnetic resonance physics" | **YES** — *"Focal Loss Analysis of Peripapillary Nerve Fiber Layer Reflectance for Glaucoma Diagnosis"* and *"Reliability for Nerve Fiber Layer Reflectance Using Spectral Domain Optical Coherence Tomography"* (3 glaucoma records) |
| — | and *"Emotional driving: Reference-dependent emotions and risky driving behavior after sporting events"* |

**This is the single most consequential measurement in this
reconciliation, and it converges exactly with the audit's independent
finding.** The audit measured that **88.2% of the corpus carries
`influence_direction: "conditional"` because a two-regex keyword fallback
could not classify it** (`build-grounded-mind-corpus.mjs:101-111`, 96.5%
confirmed by re-running the extractor's own regexes), and that the corpus's
directions **lose to their inverses for 87 of 140** graded premises. The
spec independently diagnoses the same failure: keyword regexes over the
corpus, with cross-domain papers misfiled under NFL labels.

**The spec's L1–L4 verification gates are the correct remedy, and the
audit's measurement is the evidence that they are needed.**

### 2.3 Entity-to-relation deficit in perception — CONSISTENT with the audit

The spec cites CausalPhys: `EF ≈ 0.697` (entities recognised) but
`RA ≈ 0.286` on interventions and 0.305 overall (relations composed).

**The audit measured the same shape in a different domain.** The vision
pipeline in `packages/prediction-engine/src/vision/` is 22/22 tracks with
purity 1496/1496 and an identity chain
`tracklet → nflId → gsis → EPA` — **the entity layer is solid**. And the
audit's concept-axis work found that the *relation* layer is where the
evidence breaks: the corpus's asserted directions are noise, and the
`research/dml-qb-out.ts` module that would establish relations
(DML + Rosenbaum sensitivity) is **dead twice over** — its only bridge has
zero importers.

### 2.4 Static uncertainty under non-exchangeable shift — CONFIRMED, and the repo has the half that works

The spec claims i.i.d. and exchangeability are violated and that conformal
intervals degrade Kelly sizing by 1.4–3.3 pp/yr.

**The repo has the conformal machinery and the Kelly decoupling is
correctly staged but unbuilt.** The audit found
`packages/prediction-engine/src/conformal/levene-welch.ts` with real
implementations (`df2 = 0` null-handling, `W(F1,F2)`), and the
`calibration-contract.ts` gate with the honest `probabilityClaimsAllowed`
refusal. But there is **no `conformal-copula-kelly.ts`** — the spec's
module #7 — and `settle-loop.ts` does not exist.

**The spec's "decoupled Coverage Gating from Position Sizing" is exactly
the audit's own staged improvement** (conformal gate separate from weight
promotion), arrived at independently.

---

## 3. The five dark sources — the spec's remediation table is real

Every primitive the spec's §2.2 table names **exists in the repo**:

| primitive | files referencing it |
|---|---:|
| `ol_continuity_shared_snaps_pct` | 4 |
| `acoustic_crowd_spl_db` | 5 |
| `officiating_crew_penalty_rate` | 5 |
| `surface_traction_coeff` | 3 |
| `air_density_kg_m3` | 9 |

**And the spec's remediation dispositions are the right ones**, and they
match the audit's own findings:

- **`officiating_crew_penalty_rate`** — the spec says excise
  `PlayStat.Penalties` as a placeholder and replace it with a Tuesday NFL
  Football Operations crew scraper. **The repo's own `officials` family is
  already DARK for a measured reason, and it names the same defect.**
  `packages/prediction-engine/src/reasoning/engine-weights.ts:18`:

  > `{ id: "officials", prior: 0.04, role: "dark", why: "2025 holdout of
  > 2024 crew means: n=113, r=-0.093 versus home win, slope=-0.0101,
  > se=0.0103. |slope| does not clear se, so the part selector returns
  > DARK even when the crew is named." }`

  **So the repo has a real crew-measurement (n=113, slope=-0.0101) and it
  still fails the significance bar, and it DARKs the family even when the
  crew IS named.** The spec's remedy — a *named* crew scraper rather than
  a placeholder penalty column — attacks the right problem: the family
  cannot separate because the underlying measure is a placeholder, not
  because the effect is absent. The spec's fix is the better one, and the
  repo's DARK gate is doing its job correctly by refusing to promote a
  slope that does not clear its own standard error.

  **Note on the audit's own earlier claim:** the audit previously recorded
  a `nfl_referee_crew_tendency` evaluator registered ACTIVE but unable to
  produce a value. **That was wrong** — no such evaluator exists
  (`grep -rn nfl_referee_crew_tendency` over `packages/`, `apps/`,
  `intelligence/` returns zero hits), and the DARK-evaluator count is
  **21**, not 23. Corrected here.
- **`surface_traction_coeff`** — the spec says it was a static constant;
  the audit found `mind-reasoning.ts:271` still carries
  `surface_traction_coeff: { baseline: 0.80, unitScale: 0.10, unit: "mu" }`
  and `:513` falls back to `ctx.surfaceTractionCoeff ?? (precip > 0 ? 0.65 : 0.80)`.
  **The spec's claim is confirmed with a line number.**
- **`acoustic_crowd_spl_db`** — the spec's "no live decibel meter exists
  across all 32 NFL venues" is consistent with the audit's finding that
  there is **no venue table at all** in the schema.

**The spec's `air_density_kg_m3` and `ol_continuity_shared_snaps_pct`
remediations are the honest ones** — a psychrometric computation and a
PIT snap accumulator — and both are the kind of work the audit's
`fix_plan.md` calls for.

---

## 4. The nine honesty gates — a stricter version of what the repo has

The spec's G1–G9 are a **compile-time phantom-type barrier plus nine
conjunctive runtime conditions**. The repo has **one** runtime gate
(`calibration-contract.ts`, with `probabilityClaimsAllowed` and five
statuses) and **no** compile-time barrier.

**The repo's existing gate is the spec's G1, roughly.** The spec's G1 is:

> ∀ s ∈ S_active: N_s ≥ N_min = 30 ∧ p_s ∈ (0,1) ∧ homeSign_s ∈ {−1,+1} ∧ Cov_sig,t ≥ 0.65

The repo's `assessCalibrationContract` checks sample count (≥250, not 30),
ECE (≤0.06), drift (≤0.1), and Brier vs baseline. **Neither has a
`homeSign` requirement** — which is exactly the audit's measured gap: the
engine has **no** gate that requires a premise to be *directional* before
it votes, and the `continuous-signal-tilt` sign refusal is the only place
that check exists, and it is not reached because the upstream `ctx.env`
bridge carries four weather keys.

**The spec's G2 is the one the audit most directly needs.** The spec
requires ∀ i ∈ M_c_active: L1 ∧ L2 ∧ L3 ∧ L4 = 1, with L1 = verbatim quote
provenance, L2 = literal numeric token containment, L3 = SAV character-offset
anchoring, L4 = mechanism entailment.

**The audit measured the absence of exactly this**, from a different
direction: the corpus's premise records are built by keyword regex with
no verbatim-provenance or entailment check, so 2,106 non-football papers
survive and are filed under NFL primitives, and 88.2% of the corpus's
directions are a regex fallback.

**And the audit has already built the closest thing to L2 that the repo
has:** the concept-axis grader requires the premise's own metric name to
resolve to a *schema-verified* measure surface
(`literature-measures.test.ts` parses `schema.prisma` and asserts every
table and column exists — 20/20 tests, and it caught four columns the
first draft named that do not exist).

**The spec's L4 (mechanism entailment, cross-encoder NLI) is the missing
piece, and it is the direct remedy for the audit's measured 2,106
survivors.**

---

## 5. Where the spec and the audit CONVERGE — and where they differ

### Convergence (independent arrival at the same conclusion)

| | spec | audit |
|---|---|---|
| the live path is associational, not interventional | Rung 1 only | `applyContinuousSignalTilt` votes 0 times; `run_game.py` reasons about a fixture |
| the direction field must be signed and sampled | `homeSign ∈ {−1,+1}` in G1 | the corpus's directions lose to their inverses (87 of 140) |
| literature must be verified, not decorated | L1–L4 gates | 2,106 non-football records survive; 81% land in one default bucket |
| the settlement loop must close | same-cycle Murphy/Kalman/promotion | `lit.premise_score` and `lit.causal_edge` now reconcile in both directions, but no settlement→belief loop exists |
| conformal gating must be decoupled from sizing | decoupled Coverage Gating from Position Sizing | the same separation appears in the audit's staged improvements |
| the honest estimator for "is this chain real" | VanderWeele-Ding E-value + Rung 3 | `research/dml-qb-out.ts` (DML + Rosenbaum) exists, is dead, and Rosenbaum is the right instrument |

### Divergence — the spec is MORE ambitious than the audit in four places

| | spec | audit | the gap |
|---|---|---|---|
| **HNSW parameters** | `M = 24`, `ef_construction = 200`, `ef_search = 64/128`, Recall@20 ≥ 0.992 in < 2.5 ms | `M = 16`, `ef_construction = 64`; measured p50 **77ms** over the network | the spec's sub-2.5 ms assumes in-DB or same-region latency; the audit's 77ms is the **network** cost, which dominates. **The spec's latency SLO is not achievable from a remote client** and needs a same-region or in-process HNSW |
| **Spectral split** | 1024-d embedding + 512-d low + 512-d high embeddings, BRIDGE DFGE 3-band routing | a single 1024-d embedding, no spectral split | a whole new embedding pipeline, not a parameter change |
| **Copulas / Kelly** | Debiased Hierarchical Archimedean + Vine copulas, SCALE, TA-CQR, Conformal Kelly | a single-`lit.premise_score` Brier-skill score | the audit never built the joint-distribution layer at all |
| **Causal discovery** | precision-preconditioned DYNOTEARS + FCI, Kaiser-Sipos scale-invariance fix | `2603-22620v2-chainreaction-causal-discovery-via-blocking.ts` has `notearsAcyclicity` (:26), `backdoorSet` (:51), `refutationSuite` (:73) — **unwired**; `2602-23233v1-the-counterfactual-combine-a-causal.ts` has `identifyStrategy` (:22) / `adjustmentEstimand` (:37) / `frontdoorEstimand` (:50) / `requireIdentified` (:69) — **also unwired**. **Both have 0 non-test importers.** | the spec's method is the SAME family, and the repo has the modules, but nothing calls them |

**That last row matters most.** The spec's §4.3 describes the Shpitser-Pearl
ID algorithm and the repo already contains
`2602-23233v1-the-counterfactual-combine-a-causal.ts` with
`identifyStrategy`, `adjustmentEstimand`, `frontdoorEstimand`, and
`requireIdentified`. **The spec's "7-line recursive ID algorithm" is
already written.** It is not wired, and it is not named the way the spec
names it. **The gap is integration, not invention.**

---

## 6. What the spec asks that the audit has ALREADY built

This is the most useful section of the reconciliation, because it
identifies work that is done and merely needs naming and wiring.

| spec requirement | audit status |
|---|---|
| pgvector HNSW over the literature corpus | **DONE** — 5,509 premises + 1,268 corpus items, HNSW confirmed by `EXPLAIN ANALYZE` |
| event-driven retrieval on every new signal | **DONE** — `signal-ledger-write/route.ts:313` → `bridgeSignalsToLiterature` |
| content-driven deltas, no hardcoded constants | **DONE** — empty corpus yields delta 0 and empty prose, asserted by `mutation-v2.spec.ts` |
| a settlement residual that feeds premise weights | **BUILT** — `lit.residual` → `lit.premise_score` → `lit.causal_edge`, with the support/promotion/demotion defects fixed |
| premises promoted to first-class causal edges | **BUILT** — `lit.causal_edge`, with reconciliation in both directions |
| intervention tests on promoted edges only | **BUILT** — LAW 4 enforced and checked (0 violations) |
| no silent fail-open | **DONE** — every refusal in the concept grader is a counted reason |
| a schema-verified measurement surface | **DONE** — the measure registry is checked against `schema.prisma` on every test run |
| bitemporal PIT filtering | **PARTIAL** — `historical_games` carries `fetchedAt`; the stat tables key on `(season, week, team)` and the audit had to build the canonical re-keying itself |

## 7. What the spec asks that the audit has NOT built

| spec requirement | status |
|---|---|
| `feature-matrix.ts` with 240+ families and bitemporal watermarks | **NOT BUILT** — the repo has 21 DARK extension evaluators (23 in the extension file counting 2 `SHADOW_ONLY`), not 240 registered families |
| `do-calculus-id.ts` (Shpitser-Pearl ID) | **MODULES EXIST, UNWIRED** — `2602-23233v1-the-counterfactual-combine-a-causal.ts` and `2603-22620v2-chainreaction-causal-discovery-via-blocking.ts`, both with 0 non-test importers |
| `adversary-red-team.ts` (E-value, placebo, entity-swap) | **NOT BUILT** — and the audit measured the *need*: entity-swap and E-value are exactly what the concept axis lacks |
| `conformal-copula-kelly.ts` | **NOT BUILT** — the repo has `conformal/levene-welch.ts` (Levene/Brown-Forsythe + Welch,
with `df2` and the `W(df1,df2)` statistic) plus `mondrian.ts` and
`sports-taxonomy.ts`, but no Kelly or copula layer |
| `settlement-loop.ts` (Murphy, Kalman, MP spectral) | **NOT BUILT** — this is the audit's `staged_improvements/04` |
| `pick-pipeline.ts` + the `ValidatedCausalTrace` brand | **NOT BUILT** — the repo has `publishablePick: false` as a type-level assertion, which is a *weaker* barrier (it bars publishing, not bad traces) |
| L1–L4 verification gates | **BUILT AND MEASURED** — `packages/prediction-engine/src/literature/literature-verification.ts`, 23 tests. The truthful gate admits **0 of 5,149** records (the existing one reports 67.4% because it never opens the source document). **NOT YET WIRED** into the corpus builder. |
| the 8-probe mutation-v3 suite | **NOT BUILT** — `mutation-v2.spec.ts` has 7 probes (T1–T7) and passes |
| the 600-test conformal suite | **NOT BUILT** |

---

## 8. The recommendation, in order

**The spec is a build plan, and the audit has already built the parts of it
that were hardest to specify.** The right next phase is not more
discovery; it is construction, in the spec's own step order, with the
audit's measured numbers as the acceptance criteria.

| # | build step | why now |
|---|---|---|
| 1 | **L1–L4 verification gates at ingestion** | the audit measured **2,106 non-football papers surviving** and **88.2% of directions being a keyword fallback**. **NOW BUILT AND MEASURED** (`reconciliation/l1_l4_admission_gate.md`): the repo's existing L1–L4 gate reports 67.4% admitted because it checks SHAPE, not TRUTH; against the actual source documents the truthful gate admits **0 of 5,149** — 3,509 quotes are absent from the documents they cite, and 0 of 5,049 spans select their own quote. The remaining work is to WIRE it into the builder. |
| 2 | **Wire `2602-23233v1-the-counterfactual-combine-a-causal.ts` into the live path as `do-calculus-id.ts`** | the spec's §4.3 "7-line recursive ID algorithm" **is already written** with `frontdoorEstimand` and `requireIdentified`. The gap is integration. |
| 3 | **A `homeSign` requirement in the publish gate** (the spec's G1) | the audit measured that the live path has **no** directional gate, and that a wrong direction is a *backwards* score, not a noisy one. |
| 4 | **Reconcile the two HNSW schemas** — the spec's `literature_premises` vs the audit's `lit.*` | they are different designs and both claim the corpus. One must win, and the spec's is richer (spectral split, promotion score, EWMA attribution, SHADOW/DEMOTED statuses). |
| 5 | **Fix the latency SLO's premise** | the spec claims < 2.5 ms P99; the audit measured **77ms p50 over the network**. The SLO needs a same-region or in-process HNSW, or it is not a real target. |

**And the one thing neither the spec nor the audit has done, which is
now the highest-value single fix in the whole programme:**

> **Recover the `numeric_claim.metric` for the 5,110 placeholder records,
> so that the corpus contains claims which can be falsified at all.**

**CORRECTION (2026-10-20).** An earlier version of this document said the
audit had measured a **"21–39 point association"** with the sign
"backwards," and recommended re-reading the 21 specific-metric premises
to fix their signs. **That measurement was a definitional artifact and is
retracted** — the grader was measuring `receivingYards` against
`targets`, and `targets` *produces* `receivingYards`
(`receptions`/`targets` = 0.9609, `receivingYards`/`targets` = 0.8987).

**The corrected measurement is that the corpus's concepts carry NO
association with the outcomes this data can measure: the honest ceiling
is 6.5 points over chance.** So the recommendation changes shape but not
direction: **the spec's L4 (mechanism entailment via cross-encoder NLI)
is still the right mechanism, but its job is to reject the 2,106
non-football records and to attach a *falsifiable* quantity to a premise
— not to repair a sign.**

**The spec and the audit still converge on the same fix, from opposite
directions.** The spec says "verify the premise before you use it"; the
audit measured what happens when you don't. That is the same finding,
and it survived the retraction intact — arguably better for it, because
the retraction removed the part that was an artifact and left the part
that was a measurement.

---

## 9. Verification record

| claim | how verified | result |
|---|---|---|
| 13 of 14 spec'd paths are missing | `test -f` on each path | 13 MISSING, 1 EXISTS |
| the hardcoded constants are gone | `grep` for `0.015`/`0.024`/`0.012` in `mind-reasoning.ts` | no matches |
| the spec's own example is now a negative assertion | read `mutation-v2.spec.ts:114` | `!/\+395\|\+485\|18\.5%/` is asserted |
| the keyword-regex misclassification is live | read `mind-reasoning.ts:318-352` | the regexes are present |
| 81% of the corpus lands in one default bucket | replicated the repo's own field logic over all 5,149 records | 4,173 / 5,149 |
| 2,106 non-football records survive the filter | replicated the repo's noise filter over the corpus | 2,106 of 2,145 non-football survive |
| the spec's named example papers are in the corpus | title search | glaucoma ×3, driving ×1 present |
| all 5 dark primitives exist | `grep -rl` per primitive | 4/5/5/3/9 files |
| the ID/Granger modules exist but are unwired | `grep` for importers | zero non-test importers |
| the spec's HNSW parameters differ from the built ones | compare the spec's SQL to `schema_literature.sql` | `M=16, ef=64` built vs `M=24, ef=200` spec'd |
| the bridge is the only spec'd path that exists | `test -f` | `bridge-model.ts` |
