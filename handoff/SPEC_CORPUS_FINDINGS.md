# The Spec Corpus — What It Revealed That The Repo Alone Did Not

**Date:** 2026-10-21
**Branch:** `audit/reconciliation-2026-10-20`
**Committed:** `bbaf830e6`

This records what mining the user's document corpus found that reading the repo did not.
It is written because the findings change what "done" means for this audit, and because
three of them are traps that a later session would otherwise walk into.

---

## 1. The corpus is NOT one project. Most of it is not this repo.

`00-INDEX.md` is the index of a **different** project — a Grok Bot Galaxy documentation
pack, with its own `00-INDEX.md` → `01-architecture.md` → `02-...` hierarchy. Reading it
as if it described this codebase is a mistake; it does not.

The files that DO bear on this audit are a smaller, specific set:

| File | What it is |
|---|---|
| `Frontier GSE 50k-Signal Causal Reasoning Engine & ....docx` | the primary spec (T1–T16, Table 5, §10.2) |
| `Reasoning Engine Design pt.2.docx` | the second spec (the §6.3–§8 patch detail, Steps 1–8) |
| `Causal Sports Reasoning Engine Design (1).docx` | a third, parallel rendering of the same engine design (Stages 1–6, the nine formal conditions) |
| `SPEC-A_future-filter.md` | the frozen-filter program: the 7.099 CRPS bar, the sample-size ladder, the holdout contract |
| `RULING-C1_composition.md` | the composition ruling: candidate #1 frozen, `PASS-AND-RECORD`, never scored |
| `prj1-freeze-2026-10-15.md` | the freeze record for that candidate |
| `sigma-d-planning-2026-10-15.md` | the σ_d / DEFF planning computation (measurement infrastructure, no scored look) |
| `jev-emission-gate-eval-protocol-2026-10-16.md` | the emission-gate evaluation protocol |
| `premise-grading-2026-10-15.md` | the premise-grading and shadow-promotion rules |
| `GSE_PRODUCT_CORRECTION_AND_DRIFT_AUDIT.md` | the product doctrine: "The Engine is the Product" |
| `DOCUMENTATION-COVERAGE-LEDGER.md`, `PACKAGE-REGISTER.md` | coverage ledgers for the *documentation* set, not the code |
| `FULL_STACK_DELIVERY (9).md` | a 280 KB self-contained Python stack — a **delivery artifact**, not a spec for this repo |

**The trap:** `FULL_STACK_DELIVERY (9).md` looks like the answer to "what should the engine
be". It is a single-file Python delivery of the *intelligence* side (devig family, ratings,
calibration, Kelly, props). The repo's `intelligence/ratings/engine_math.py` is the
`engine_math.py` from that stack — the CRPS function the gate depends on. It is a
**reference implementation to read**, not a file to copy in.

## 2. The spec's T15 artifact exists on ANOTHER BRANCH — and there are TWO gate files.

This is the single most consequential finding, and the repo alone does not reveal it.

**The spec's T15 row names `walk_forward.json`.** That file does not exist on this branch.
It exists on `origin/grok/walk-forward-2026-10-14` at `dfs/walk_forward/walk_forward.json`
(14,056 bytes). It is the *spec's* artifact — a 570-game, 8-family, Laplace-vs-Gaussian
margin CRPS diagnostic whose `passed` is `false`.

Meanwhile the branch this audit lives on carries a **different** file with a similar name:
`packages/ingestion-pipeline/walk-forward-gate.json` (n=2462, `crps: null`,
`gaussian_close_crps: 7.154021`, `passed: false`).

They are not the same experiment:

| | `walk-forward-gate.json` (this branch) | `walk_forward.json` (other branch) |
|---|---|---|
| n | 2462 | 570 |
| Laplace CRPS | **null — never computed** | 7.0611 (conditional), 7.0203 (one-scale) |
| Gaussian CRPS | 7.154021 | 7.0271 |
| families | 1 | 8 |
| self-admission | "Laplace CRPS 7.1597 was not recomputed: no Laplace margin module on this branch, and none was written" | "The absolute 7.109 / 7.099 bar was not reproduced on this manifest" |

**The 7.099 bar's real rule is a CONJUNCTION**, not a single comparison. From
`walk_forward.json`:

> `rule.passed_if`: `delta_conditional_vs_gaussian >= 0.01 AND n >= 150`
> `models.gate_rule`: "cleared only if a model has n >= 150, beats same-games Gaussian 13.45
> by >= 0.01, AND CRPS <= 7.099 (unreproduced bar); frozen manifest only"

So a gate that checks only `crps <= 7.099` is wrong twice over: it ignores two of the three
criteria, and the CRPS criterion is the one the artifact itself calls **unreproduced** — on
the larger unfrozen nflverse cross-check (n=2494) *every* family's CRPS is above 7.099, and
the same-games Gaussian 13.45 baseline on the frozen manifest is itself below 7.099, which
makes the bar **not informative** there.

**The rule's own source is in this repo:** `intelligence/ratings/engine_math.py:273`
`crps_gaussian(mu, sd, x)` — the function the gate file names as the origin of 7.154021.

**The repo already documents this.** `reconciliation/gaps.json` **GAP-02** (severity
`CRITICAL`, `blocks_current_business_model: true`):

> `packages/ingestion-pipeline/walk-forward-gate.json -> "passed": false, "crps": null,
> gaussian_close_crps: 7.154021 (gate requires CRPS <= 7.099)`
> `recommended_action`: "Decide the gate's real scope. Either (a) make every publish path
> consult readEmissionGate(), or (b) delete the gate from the TS path and re-home it where
> it has meaning. Also resolve the outstanding CRPS<=7.099 criterion."

and **GAP-15** recommends: "Implement the Laplace margin module the gate needs, or re-scope
the gate to the Gaussian CRPS it actually measures and restate the threshold."

**The live defect, confirmed by reading the code:** `walk-forward-emission-gate.ts` is 36
lines and checks `parsed.passed === true` only. It **never reads the CRPS**. The gate is
closed today only because `passed` happens to be `false`. A commit that wrote
`passed: true` would open it on a CRPS of 7.154021 — above the 7.099 bar.

**The trap:** the *live* publish path is not the one the gate guards. `generate-signal-slate`
calls `generateSignalSlate` with **no** `emissionGate` override, so it reads the file, and it
is closed — but it is closed on the path that produces **nothing** (0 picks). GAP-02 records
that the path that *actually published* (`scripts/publish_late_sun_mon_live_free.py`) has
**no gate at all** and is on no cron. That claim was sent back for independent verification
rather than taken on the gaps.json author's word.

## 3. The repo already had a 28-gap audit. The work was reconciling against it, not
discovering from scratch.

`reconciliation/gaps.json` is a machine-readable audit of 28 gaps with `audited_ref:
origin/main@4fa5330f4` and, in two cases, `blocks_current_business_model: true`. It is
regenerated by `reconciliation/_build_gaps.py` (which itself quotes the
`walk-forward-gate.json` provenance in a check).

**The trap:** `gaps.json` is dated against `origin/main`, while this audit branch is
`48e8191c7` on `audit/reconciliation-2026-10-20`. Its findings are *point-in-time* and
some may have been fixed. It is a map, not a verdict — every gap it names still has to be
re-measured against the current tree before it is treated as open.

## 4. `intelligence/` is a second, parallel codebase that the T1–T16 table does not mention.

The repo carries `intelligence/` — `afcrps.py` (CRPS/ensemble loss), `engine_math.py`
(devig, BT/Elo, Dixon-Coles, `crps_gaussian`, `pit_histogram`, `deflated_sharpe`),
`newregime/` (Laplace-approximated GPs), `keel/`, `gates/`, `doctrine/`, `jev/`. The spec's
T-table names `packages/prediction-engine/src/...` for every probe and never mentions it.

This is where the CRPS function lives, and where `intelligence/newregime/nggp.py` uses
"Laplace-approximated calibrated uncertainty" — i.e. **the Laplace machinery the gate file
says was never written may exist under a different name.** That is a lead to verify, not a
conclusion.

## 5. The `dfs/walk_forward/` subsystem is absent from this branch entirely.

`dfs/walk_forward/` exists on `origin/grok/walk-forward-2026-10-14` with ~30+ artifacts
(`PRJ1-FREEZE.json`, `baseline_repro_2026-10-14.json`, `bqp_result.json`, `conformal_results.json`,
`cvi.py`, `bqp_swcc.py`, …). This branch has **no `dfs/` directory at all**.

The audit branch is a *different line of work* from the walk-forward line. That is not a
defect — it is context, and it means the T15 gate's subject matter is developed on a
sibling branch. Any T15 work here is pinning the *consumer* of the artifact, and the
artifact itself must be read across branches (via `git show origin/<branch>:<path>`).

**The trap:** the file `walk_forward.json` does not exist here, so a gate that reads it
must either (a) be tested against a synthetic fixture with that exact shape, or (b) read
the file across a branch at test time. Option (a) is what a unit test should do; option
(b) makes the test depend on a remote ref, which is fragile.

## 6. The `7.099` bar appears in exactly three places, and they agree.

- `SPEC-A_future-filter.md` §5.3: the relative gate `r* = (7.154021 − 7.099) / 7.154021
  ≈ 0.007691`, with `7.109` appearing as the absolute bar in the larger-n framing.
- `walk_forward.json` `models.gate_rule` and every family's `le_abs_bar_7.099` flag.
- `packages/ingestion-pipeline/walk-forward-gate.json`'s `cvi` block: "CVI scale delta does
  not reach CRPS <= 7.099."

**And the one place it does NOT appear is the code.** The gate module never mentions it.
That is the gap: the bar is specified in three documents and enforced in none.

## 7. What this changes about the audit's definition of done

The T1–T16 table is not the whole spec. The spec also has:
- **§6.1–§6.5** (pt2): the module-by-module patches, including §6.3's Proximal Bridge and
  §6.5's live E-value wiring.
- **§7** (pt2): an 8-step execution sequence mapped to HEAD `f7ebbe833` — Steps 7 and 8
  (wire the ITCR gate / conformal-copula-kelly / HonestyPublishGate; run the settlement
  loop, regenerate the dashboard, run complete CI) are **entirely unstarted** in this
  branch.
- **Step 10** (frontier): dashboard regeneration, a bus receipt, and a push. The bus
  artifacts (`bus/gse/claimed/.../status.json`, `RESULT.md`) do not exist in this repo —
  they belong to **Beexly/agent-bus**, the spec's second target repository, which is not
  cloned locally.

So "T1–T16 green" is **not** "the spec is done". The falsification suite is the guardrail;
the 10-step sequence is the work, and Steps 7–10 remain.

## 8. Rules adopted for reading this corpus

1. **A file in `Downloads/` is a hypothesis, not a finding.** Every claim in it is
   re-measured against the repo before it is acted on. The `walk_forward.json` finding is
   the model: the file was read off a branch, the CRPS bar was traced to
   `engine_math.py`, and the defect was confirmed in the gate module's own source.
2. **A number in a spec is a starting point, not a threshold.** The spec says "968
   CITABLE_VERIFIED"; the repo measures 1,098 and its own audit trail explains the
   correction (1,019 from the builder + 79 from the re-anchoring pass). The gate asserts
   *convergence* and *agreement between the two copies*, not 968.
3. **A finding documented in `gaps.json` is re-verified, not inherited.** It is dated
   against a different ref.
4. **Cross-branch facts are read with `git show origin/<branch>:<path>`,** and any test that
   depends on them uses a synthetic fixture with the same shape instead.
