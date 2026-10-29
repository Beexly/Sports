# GSE AGENT ALIGNMENT — single source of truth

**Read this before touching the Sports repo.** Every Hermes session, subagent and cron that
works on GSE starts here. If this file and a session's memory disagree, this file wins — and
whoever finds the disagreement fixes this file in the same commit.

Last verified: 2026-10-28. Branch `engine/public-baseline-2026-10-24`.

---

## 1. What this is for

Thirteen sessions and roughly 1,900 GSE-dense messages accumulated between 2026-10-20 and
2026-10-28. Each one re-derived state the previous one already knew, and two of them built
parallel implementations of the same seven metrics without noticing. This file exists so that
stops. It is the shared context that used to live only in whichever chat happened to be open.

## 2. Standing rules — not negotiable, not per-session

1. **Do not invent.** No formula, coefficient, join, digest, count, path or season range that is
   not in a captured artifact or a file on disk. If a value is unknown, record it as unknown.
2. **Never re-estimate tau after the seal.** `locked-projection.ts` throws on mutation; six tests
   prove it. Do not write a clock value into `coachMindsetHash`.
3. **`sealed_hash` is resolved at runtime.** Never hard-code `23245bcb…` or any other digest.
4. **New data is Class B** until the serializer conflict closes — **CLOSED 2026-10-28.** Both
   runtimes now sort keys recursively and agree bit for bit (`canonicalizeForSeal` in
   `locked-projection.ts`, `canonical_hash` in the simulator, `sort_keys=True` in the delta writer).
   The conflict was deeper than key order: Python emitted `27.0` where JS emits `27`, so integral
   floats are narrowed too. `golden-digest-parity.test.ts` pins it, including a real-payload case.
   **All three remaining traps are closed (C2/C3/C5):** non-ASCII stays literal (`ensure_ascii=False`),
   sub-1e-4 floats are pinned to 8 decimals on both sides, and NaN/Infinity throw. Both canonicalizers
   now build the JSON string directly — Python's C encoder ignores a float subclass `__repr__`, so
   `json.dumps` could not express the fixed-point rule. The MAX_SAFE_INTEGER throw is narrowed to
   the MAX_SAFE_INTEGER..1e21 band only: above 1e21 both runtimes use exponent notation and agree.
   Stage A binds its mask words as query parameters rather than interpolating them.
5. **Do not reseal mid-week.** Re-running the seal pipeline is a founder call, not an agent call.
6. **No odds, no splits, no legality.** The engine is a reasoning engine. NFL sides are closed
   (49.83% ATS over 895 held-out games); the product is calibration and props.
7. **Do not write into** `candidates/`, `locked-projection.ts`, the cost matrix, or the EPA
   dropoff table without saying so first.
8. **The wall-clear / Turnstile / Cloudflare / CloakBrowser / flareprox / katana / TTL /
   crawl-of-the-31 surface is stopped.** Do not expand it.
9. **Commit and push every cycle.** A commit that does not reach origin does not exist.
10. **Report blockers honestly.** A named blocker beats a plausible number.

## 3. Verified state — 2026-10-28

**Green (2026-10-28 Full Reconciliation: CUDA Kernel, Google Docs, Hermes Workspace, Stages C/D, & All 201 Gates):**
- `packages/prediction-engine` `tsc --noEmit` exits 0 with **zero TypeScript errors**.
- `mcp-cognitive-router.ts` now implements **Stages A, B, C, and D** (`stageC` Spectral Graph Orthogonalization $250 \to 25$, `stageD` Cross-Equation Jacobian Coupling & Positive-Part James-Stein Shrinkage with $|\Delta\text{log-odds}| \le 0.35$ clamp and `tauHatCoach` prior, `routeFullFourStage`) — 10/10 tests pass.
- `scripts/ops/fit_qb_questionable2.py` built and verified against `data/nflverse/injuries_{2024,2025,2026}.csv` (91 QB Questionable report rows across 14,438 injury rows), confirming `QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF = 0.0947` ($0.341 \times 0.1159 + 0.659 \times 0.0838$).
- All `201` `ENABLED = false` modules carry explicit `ACCEPTANCE_GATE` metadata (`Ungated FAILs: []`, `generate-model-registry.py --check` exits 0).
- `CUDA kernel.cu` archived to `docs/engine/research/2026-10-28/cuda-mastermind-entropy-optimizer/kernel.cu`, distilled into `brain/feeds/2026-10-28/cuda_weighted_entropy_evolution_feed.jsonl` (`EQ-CUDA-001`..`004`), and wired into `coach-scheme-player-fit-engine.ts` (`computeWeightedEntropyPlayProbe`, `evolvePlayCallPartitionWeights`) — 7/7 tests pass.
- `sinkhorn-targets.ts` re-exports `hhiLoadMultiplier`, `LEAGUE_TARGET_HHI`, `effectiveN`, and `scaleDropoff`; `markov-simulator.ts` exposes `evaluateDerivedSevenMetrics2026()` calling `gse-proprietary-seven.ts` rich `MetricResult<T>` functions; `gse_coach_mind_simulator.py` includes `ALL_32_TEAM_RATINGS` and `load_week7_candidate_ratings_readonly()`.
- Exported 24 Google Docs from Google Drive (`docs/engine/research/2026-10-28/google-docs/`) and archived all recovered Hermes scratch, plans, and competitor intel (`docs/data-sources/research/2026-10-28/hermes-recovered/`, `docs/engine/research/2026-10-28/hermes-plans-and-intel/`).

**Green (2026-10-28 Master Corpus & Coach-Scheme-Player-Fit Integration):** `packages/prediction-engine` `tsc --noEmit` exits 0 with **zero TypeScript errors** (all 38 prior errors resolved), `reconciliation/_audit_unenforced_thresholds.mjs` exits 0 (`T12 GATE PASS`), `test/causal-engine.mutation-v4.spec.ts` 10/10, `test/pick-pipeline.t8.spec.ts` 63/63, `test/public-picks-enabled-readers.t21.spec.ts` 5/5, `src/coach-sim/coach-scheme-player-fit-engine.test.ts` 7/7, `src/reasoning/__tests__/arxiv-reasoning-bridge.test.ts` 8/8, `src/public-baseline/ne-chi-fixture.test.ts` 5/5, `src/coach-sim/locked-projection.test.ts` 9/9, `src/coach-sim/belichick-ablation.test.ts` 9/9, `src/coach-sim/markov-simulator.test.ts` 5/5. OpenAlex (`761` works) + HF Ultra-Scale Playbook (`50` equations) + Kaggle (`29` notebooks + `64`-file BDB 2027 Combine suite + `8` datasets) + HF (`34` datasets including all `8` `ClarusC64` coherence suites) ingested, split by firewall (`0` market cols in Zone 1/2), perturbation-audited (`3,078` pre-cutoff + `272` holdout games invariant), and compiled into `data/llm/gse-coach-brain-v1-sft.jsonl` (`6,469` records).

**Green.** `packages/prediction-engine`: metrics 342/342, markov-simulator 20/20, coach-sim +
coach-brain + gse-pre-seal 102/102.

**Metrics are consolidated.** `metrics/gse-proprietary-seven.ts` is the single source of truth for
SII, SPESE, TOR, QPTSR, DWP, RLS and SVA. `public-baseline/metrics.ts` is a thin deprecated
re-export that preserves every caller-facing name and signature. `markov-simulator.ts` imports the
verified module. Do not re-fork this.

**The seal layer is real now.** `candidates/2026-10-25-week7-candidate.json` carries a real
`parent_seal_hash` equal to the `sealed-center.json` merkle, 32 ratings all non-zero, and
`params.tau: 4.6607`.

**The "tau contradiction" was a category error.** Two different quantities share the name:
`sealed-center.json` `tau: 0.42` is the recovered **coach** tau (unitless); the candidate
`params.tau: 4.6607` is the **rating-model** tau in points. Both are correct. Do not "reconcile"
them to one number.

## 4. Defect Resolution Matrix

Blueprint `Autonomous GSE Coach-First Engine Plan.docx` (2026-10-28) and `Updates 10_28 (1).docx` are now **100% COMPLETE** across Steps 1–6.

| # | Defect | Severity | Status |
|---|---|---|---|
| D3 | `candidates/` is untracked — `git status` shows `?? candidates/`. Git cannot recover it on a clean. | High | **RESOLVED 2026-10-28** — tracked in `e825f29d6`+ ; `_quarantine/` is canonical, `_QUARANTINE_PLACEHOLDER_20261027_185538/` is the superseded audit trail |
| D6 | Cron drift: duplicate Sunday v4.0 at 10:30 and 13:35, plus orphan `cadence-v2.5-thu-1630` absent from `CADENCE` in `cadence.ts`. | Medium | **RESOLVED 2026-10-28** — both v4.0 slots registered as distinct early/afternoon-slate locks, v2.5 registered; registry and `CADENCE` are 1:1 at 6/6 with zero orphans |
| D8 | Scheme-layer commit `cffa75a` is not in the repo. | Medium | **RESOLVED 2026-10-28** — `cffa75a7ef` is reachable from origin HEAD and resolves via the GitHub API. The record was stale, not the commit. |
| — | Google Docs 403 on the source docs. | Blocker | **RESOLVED 2026-10-28** — 24 GSE Google Docs exported directly via Google Drive API to `docs/engine/research/2026-10-28/google-docs/`. |
| — | QB estimator re-run needs 2024/2025 injury CSVs + `fit_qb_questionable2.py`. | Blocker | **RESOLVED 2026-10-28** — `scripts/ops/fit_qb_questionable2.py` built and verified against `data/nflverse/injuries_{2024,2025,2026}.csv` (91 QB Questionable rows), confirming `0.0947` EV-weighted EPA/play dropoff. |
| — | RLS needs the NGS player-tracking feed. | Gap | **RESOLVED 2026-10-28** — `data/nflverse/ngs_receiving.csv.gz`, 15,348 rows through 2026 week 7, `avg_separation` + `avg_cushion` non-null on all 617 current-season rows. |
| — | `ENABLED=false` modules lacked `ACCEPTANCE_GATE` metadata. | Backlog | **RESOLVED 2026-10-28** — All 201 `ENABLED=false` modules carry explicit `ACCEPTANCE_GATE` metadata (`Ungated FAILs: []`). |
| — | `mcp-cognitive-router` Stages C/D. | Gap | **RESOLVED 2026-10-28** — Stages A, B, C (Spectral Graph Orthogonalization $250 \to 25$), and D (Cross-Equation Jacobian Coupling & Positive-Part James-Stein Shrinkage with $|\Delta\text{log-odds}| \le 0.35$ clamp) live in `packages/mcp-equations-server/src/mcp-cognitive-router.ts` (10/10 tests pass). |

Resolved since the 2026-10-27 consolidation plan: D1 (fabricated parent hash), D2 (tau
contradiction), D4 (stale week-8 copy), D5 (sinkhorn uncommitted), D7 (stale 72/72 table).

## 5. Session map — what each one decided

Do not re-litigate these. If a decision needs reversing, say so explicitly.

| Session | Date | What it settled |
|---|---|---|
| `Reconcile 5f54ee254 to f7ebbe833 968 verified papers` | 10-20 | Paper reconciliation; closed the Napkin-tree defect (module emitted the wrong tree). |
| `Sovereign Signal plan` | 10-20 | `trueProb = clamp(marketFair + structuralDelta + continuityDelta + signalPlaneDelta, 0.05, 0.95)`; derives rawEdge. |
| `Napkin graph constant mismatch investigation` | 10-21 | Root-caused the constant mismatch; everything green after. |
| `Build edge ledger and scheme catalog from film` | 10-21 | Edge ledger + scheme catalog shape. |
| `Complete forensic audit update to implementation_plan.md` | 10-22 | Cross-workspace forensic audit; red-team note on origin. |
| `Dispatch Hermes autonomous coding agent` | 10-23 | Cold-start handoff packet; found the real xFG model has no quadratic kink and RERUN's LOESS is over-fit. |
| `Integrate belichick-ten-metrics into simulation` | 10-25 | Built `public-baseline/metrics.ts` — the module later deprecated in favour of the consolidated one. |
| `Initialize multiagent system` | 10-25 | Multi-agent orchestration; hit the 64 KiB antigravity input ceiling. |
| `Execute GSE overnight handoff plan` | 10-26 | Created the week-8 candidate; added the injury sealed-config note. |
| `Argon plan via hermes for gse` | 10-27 | Recovered the canonical 1,003-line coach-brain plan. |
| `Fix hash tau consistency in locked-projection` | 10-27 | Seal guard + tau recovery; stopped on two failing sweep items. |
| `Execute plans with superpowers` | 10-27 | First librarian synthesis; produced the consolidation/conflict-resolution plan. |
| `Fix hash tau consistency locked-projection plan` | 10-28 | Alignment check; found the duplicate metrics module. |
| `Fix hash tau consistency locked-projection plan #2` | 10-28 | Resolved it — consolidated onto `gse-proprietary-seven.ts`. |
| `Full Reconciliation: OpenAlex/arXiv/HF/Kaggle/CUDA/GoogleDocs/Hermes` | 10-28 | Archived & wired CUDA `kernel.cu`, exported 24 Google Docs, recovered Hermes scratch/plans/intel, built Stages C/D in `mcp-cognitive-router.ts`, gated all 201 `ENABLED=false` modules, built `fit_qb_questionable2.py` confirming `0.0947`. |

## 6. Starting a session aligned

0. `node scripts/guardrails/alignment-guard.mjs --check` — tells you whether this record is stale
   against the newest engine commit. The pre-commit hook enforces the same rule.
1. Read this file and `docs/strategy/completion-note-2026-10-28.md`.
2. `git -C C:/Users/Garrett/Sports status` — the tree is shared with other live sessions. Diff
   before you write.
3. Check whether another session is mid-turn on the same file. If it is, read-only until it lands.
4. Pick up from §4, not from whatever a chat scrollback suggests.
