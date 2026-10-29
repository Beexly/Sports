# GSE Direction Review — Are We All Moving the Same Way? (2026-10-27)

**Artifact:** `artifacts/gse-direction-review-2026-10-27.md`
**Question answered:** Do the Hermes sessions, the Antigravity CLI sessions, the architecture documents, the weekly packets, and the repo itself describe and pursue the same system?
**Method:** Read-only. Git ancestry analysis, module existence checks, test-suite runs, document thesis extraction. Nothing was modified.

---

## Answer: YES on architecture. YES on code lineage. NO on status reporting.

Three of four layers agree completely. The disagreement is entirely in the fourth layer — the documents that *describe* the work — and it is caused by an environment split plus stale counts, not by anyone pursuing a different goal.

| Layer | Verdict | Evidence |
|---|---|---|
| Architecture / doctrine | **COHERENT — one system** | 5 of 7 documents are mutually consistent layers of the same design |
| Code lineage | **LINEAR — nothing lost** | HEAD is 263 commits ahead of the audit branch; only 1 redundant commit outside HEAD |
| Antigravity + Hermes sessions | **ALIGNED — same work** | 14 sessions / 33,218 steps, all describing the same pipeline |
| Status reporting | **DIVERGENT** | Stale test counts, wrong module paths, forked seal hashes, "sealed" claims resting on placeholder artifacts |

---

## 1. Architecture layer — coherent, not competing

Five documents describe **one system in five layers**, not five competing visions:

| Document | Role in the single system |
|---|---|
| `Master Execution Report_ The Belichick.docx` (30,276 words) | **Master plan.** Establishes the epistemic inversion: sportsbook lines have zero causal influence on football physics; exiled from the generative spine (Class A) to late-binding comparison (Class B at Step N). |
| `GSE Sealed Architecture Primary Sources.docx` (5,640 words) | **Mathematical foundations.** Bottom-up Belichick-Adams simulation locked Tuesday 04:00 CT into `coachMindsetHash`; Sinkhorn-Knopp + EPA dropoff for mid-week updates; conformal residuals for market comparison. |
| `GSE Continuous Learning Architecture Plan.docx` (11,411 words) | **Ingestion/learning architecture.** Three-Zone Epistemic Firewall + Bi-Temporal Provenance Graph. Zone 1 (Class A pre-seal), Zone 2 (compile-time AST firewall, Sinkhorn under fixed cost matrix), Zone 3 (Class B late-binding diagnostics). |
| `Neuro-Symbolic and Causal Architecture…docx` (11,769 words) | **Failure diagnosis.** Autopsy of the 2026-10-22 production failures: sequential execution inversion (28-line early-abort in `situational-trace.ts`), static pre-wiring veto, first-order heuristic veto, `universal-wiring.ts` as passive formatter. Prescribes the unified PIT DAG. |
| `GSE Omni-Cognitive World Model Architecture.docx` (9,943 words) | **Situational engine + ingestion pipeline.** Layer 1 = closing market line; Layer 2 = deliberative cognitive engine. Four empirical evaluators (altitude, referee, red-zone, coaching) wire into factor breakdowns. |

Shared vocabulary across all five: `coachMindsetHash` as the immutable seal; Sinkhorn-Knopp under fixed cost matrix; finite-sample split conformal residuals; Class A / Class B epistemic separation. That is not coincidence — it is one design expressed at five altitudes.

**Two documents flagged as non-GSE:**
- `_goal set.docx` (6,564 words) — an execution checklist (fix 289 barrel re-export errors, consolidate `PROB_PER_POINT`, invariant tests for `!ENABLED` refusals). Zero architectural thesis. **Keep as engineering task list, not canon.**
- `10_23 (1).docx` (11,402 words) — API reconnaissance for FTN Fantasy and scores24.live. **Keep as source-intel, not canon.**

---

## 2. Code lineage layer — linear, nothing lost

This is the strongest finding. The repo is **not** forked into competing directions.

| Branch | Divergence vs HEAD |
|---|---|
| `audit/reconciliation-2026-10-20` | HEAD ahead 263 / branch ahead **0** |
| `integration/belichick-ablation-reconciled` | HEAD ahead 20 / branch ahead **0** |
| `integration/unified-gse-2026-10-24` | HEAD ahead 31 / branch ahead **0** |
| `integration/semantic-pressure-2026-10-24` | HEAD ahead 30 / branch ahead **1** |
| `hermes/ship-night-findings` | HEAD ahead 256 / branch ahead **0** |
| `hermes/c375-testwall-2026-10-20` | HEAD ahead 354 / branch ahead **0** |
| `origin/main` | HEAD ahead 349 / branch ahead **0** |

**Every branch is an ancestor of HEAD except one commit.** That means the work described in the Antigravity sessions — the Omni-Cognitive v6.0 pipeline (137/137 tests, 23 gaps closed), the Causal Inference Engine (22/22 tests, commit `0d61bc795`), the markov-simulator fixes — **is all inside HEAD's ancestry.** Nothing is stranded on a dead branch.

All six commits the session miner named exist: `27f3c439f`, `577b580dc`, `379101c93`, `f63ab1625`, `5190664fd`, `0d61bc795`.

All six named test modules exist on HEAD:
- `src/mcp/adaptive-skill-tree-router.ts` + test
- `src/slate/rolling-horizon-lifecycle.ts` + test
- `src/picks/selective-abstention-tiers.ts` + test
- `src/enterprise/universal-world-model-sdk.ts` + test
- `test/gate-registry.t24.spec.ts`
- `packages/ingestion-pipeline/src/settlement-learning-loop.ts` + test

**The one unmerged commit is redundant.** `ea8bd2951 fix(coach-sim): semantic inversion` sits 1 ahead on `integration/semantic-pressure-2026-10-24`. HEAD already contains that fix — same variable name `defMetricsForOffense`, same "Semantic inversion" comment — and goes further, adding blitz-EPA-cell logic the branch lacks. HEAD is the superset. The branch commit can be dropped without loss.

---

## 3. Session layer — 14 Antigravity sessions, all on the same thread

33,218 steps across 2026-09-19 → 2026-10-25. Every substantive session describes the same pipeline:

| Session | Steps | What it actually did |
|---|---|---|
| Sports Engine Handoff And Execution Plan | 553 | markov-simulator semantic inversion, trips-weighted pressure, realistic ablation suite |
| GSE Omni-Cognitive World Model v6.0 Phase V | 2,962 | Layer-2 reasoning unshackled (`corpusWeight: 1.0`), 80-record situational corpus, settlement learning loop, premise registry |
| GSE Causal Inference Engine Plan Review | 1,260 | 6-layer reasoning ladder, 5-horizon rolling emission, three-tier epistemic stratification, enterprise SDK |
| Monday Night Football Betting Analysis | **15,214** | GSE Executive Master Plan 2026-10-16, 81-agent roster, mind architecture, product-drift audit |
| Sports Betting Engine Bug Fix | 1,181 | Week 6 DFS zero-bias signal plane; 5 structural blind spots fixed |
| Situational Training Corpus Research | 1,465 | 39 papers synthesized, WITHHOLD-gate root-cause autopsy |
| Practical Engineering Improvements | 3,645 | Engineering doctrine, frontier quant report, 225 deterministic tests |
| Autonomous Machine Pipeline Status | 2,731 | NEXUS-2026 13-pillar, Together AI fine-tune `ft-1fe4ef0b-c215` (loss 1.0967), 146/146 tests |
| NFL Week 6 Forensic Review | 390 | structural model totals, two-high shell rates, gate logic |
| Project Planning And Strategy | 4,909 | foundational planning (brain dir logs only) |
| 4 minor sessions | ~1,000 | grunt instructions, signal promotion, convergence checkpoint, DFS content packet |

The doctrine repeated in the biggest sessions — "THE REASONING ENGINE," sports as test harness, epistemic inversion — is the same doctrine in the Belichick Master Report. Same direction.

---

## 4. Status-reporting layer — this is where the divergence lives

Four concrete divergences, all documentation defects rather than strategic disagreement:

| # | Divergence | Reality | Cause |
|---|---|---|---|
| S1 | Test counts | "72/72" (audit), "137/137" (v6.0 session), "22/22" (causal session), "106/106" (synthesis). Actual: **102 passing** in coach-sim/coach-brain/gse-pre-seal. | Each count is a snapshot from its own moment on its own branch. None is current. |
| S2 | Module paths | WS6/6b files reported "live" but absent on Windows; `settlement-learning-loop.ts` reported in `prediction-engine` but actually in `ingestion-pipeline`; `conformal-diagnostic.ts` reported missing but in `gse-pre-seal/`. | Three different environments, three different directory layouts. Reports cite the author's machine. |
| S3 | Seal hash fork | Windows `23245bcb…`; sandbox `faab2827…`; plan fixture `85b5cd33…` (appears zero times in Windows src). | Two machines, two seals, plus a third fixture value in the doc. |
| S4 | "Sealed" claims | `candidates/` is untracked; week-8 candidate is a byte copy of week-7; `parent_seal_hash` is sequential hex. | The seal artifacts were never committed or regenerated. |

**None of these is a strategic disagreement.** They are bookkeeping failures across machines.

---

## 5. What this means for the four asks

The user's stated direction — sealed coach baseline, epistemic inversion, calibration over pick-selling — is pursued consistently in:
- the architecture documents (5/5 core docs),
- the code (2,277 TypeScript files in prediction-engine; 1,085 test files),
- the 14 Antigravity sessions,
- and the Hermes plans.

**Nobody is building a different product.** The work is one project reported from several machines with several stale snapshots.

The gap to close is therefore **not strategic**. It is: pick one canonical environment, fix the four status divergences, regenerate the seal artifacts, and stop letting per-machine snapshots stand in for current truth.

---

## 6. Recommended resolution order

1. **Declare Windows canonical for this cycle** (it's where the active HEAD, the 102 passing tests, and the real seal center are). Record the sandbox seal as "other environment" in the artifact set.
2. **Drop the redundant branch commit** `ea8bd2951` — HEAD already carries the fix plus more.
3. **Regenerate the candidate seal artifacts** from real ratings; commit `candidates/`.
4. **Correct the test-count record** to a single current run rather than four historical snapshots.
5. **Fix the WS6/6b path claims** — mark them sandbox-only in the repo README until ported.
6. **Open the four unexamined zip archives** (2.87 GB) — the only genuinely unknown region left.

---

## 7. Bottom line in one sentence

The architecture documents, the code, and all fourteen CLI sessions point at the same system and the same doctrine — the only thing moving in different directions is the paperwork.
