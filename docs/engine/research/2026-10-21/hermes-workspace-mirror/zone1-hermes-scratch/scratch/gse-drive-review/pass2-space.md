# Pass 2 — Space slice: what the nine unreadable `.gdoc` files cost

**Date:** 2026-10-02 · **Supersedes:** `space-handoffs.md` (pass 1) for the conclusions below.
**Access:** read-only. Nothing on `G:` and nothing in any Sports checkout was modified. Live-checkout checks were `ls` / `cat` / `python json.load` / `git log` only.

## 0. The honest framing — what was recovered and what was not

**The nine `.gdoc` files are still unreadable.** I confirmed the pass-1 diagnosis and it holds: all nine report 179 B, all are `.gdoc`, and the readable `.md` files in the same directory (`branch-atlas.md`, `gse-reasoning-engine-brief-2026-10-02.md`, `GSE-REPO-INTELLIGENCE.md`) open fine.

**The extracts are not the `.gdoc` bodies.** I listed the dump for each extract basename (`ENGINES-MATH`, `build-spec`, `CALIBRATION_MEASUREMENT`, `injury`, `calibration-gates`, `engine-weights`, `calibration-rebuild`, `codex-work`) and got zero hits. The six local extracts are **adjacent** documents — other repos, other dates, other authors — that pass 1 never opened because pass 1 stopped at "0 items extracted."

So the accurate claim is not "the gdoc text is recovered." It is narrower and more useful:

> **Pass 1 treated an unreadable slice as an empty slice.** Because nine named handoffs were unreachable, it never went to the adjacent material — and that material contains live, unresolved decisions about the exact systems those nine filenames name (TASK-016, the coding-agent wire package, the GSE Agent Skill, the Grok 4.7 motif handoff, "What I Was Still Missing"). Those decisions are still unmade. Passing them does not close the `.gdoc` block; it stops the block from being the reason they stay unmade.

Everything below is verified text or file metadata. No measurement is asserted that is not quoted.

---

## 1. Decisions the block hid (owner-gated, QUEUED)

### D1 — QUEUED: The v5.3.0 calibration head has no admissible feature source yet.

`gse-v5.3.0-build-spec.md` §5 sets Workstream 1's features as *"the snapshot factor vector (all existing components) + Workstream 3/4/5 columns when they exist."*

The "existing components" are the 47-signal registry. Read from the live checkout (`intelligence/signals/registry.json`), that registry says:

| dimension | result |
|---|---|
| `traced.verdict` | **`no` for 47 of 47** — *"No committed pick explanation or reasoning trace shows this signal firing on a real pick."* |
| `source_data.class` | **41 `NONE`, 6 `REAL_NOT_COMMITTED`, 0 committed** |
| `producer.class` | 32 `LOCAL_CODE`, 15 `STUB_OR_CONSTANT` |
| `weighted.verdict` | every signal `prior_no_evidence` / `numeric_no_evidence` |
| `activation_status` | 41 `ACTIVE`, 5 `BLOCKED_MISSING_SOURCE`, 1 `SHADOW_ONLY` |

Two of its own evidence strings are decisive:

- *"The registry runner that would blend them has runSignalRegistry has zero non-test call sites: git grep runSignalRegistry -- `*.ts` returns only its own definition (`signal-registry-runner.ts:16`) and the barrel re-export."*
- *"All 22 extension evaluators read 71 env keys with zero writers"* (`docs/ops/wiring-backlog-2026-10-01.md` item 13); `WIND_MPH`, `REDZONE_TRIPS`, `DEFENSIVE_PLAYS`, `SHORT_WEEK_REST` are *"written by no production code."*

And on weights: `trustWeight` is *"a hand-assigned decimal with no measured justification… 'priors wearing a decimal point'"* — while *"packages/prediction-engine/src/signal-scale-table.ts carries genuinely MEASURED weights, but its keys are `pgs.*`, `ngs.*`, `snap.*`, `injury.availability` — a different namespace from the registry's signal ids. It therefore supplies no measured weight to any registry signal."*

**Decision owed:** does WS1 proceed with a logistic head over a vector where 41 of 47 features cannot execute in production, 0 of 47 have committed source data, and every weight is an unmeasured prior — or does the registry get producers and committed data first? Fitting the head as specified produces a calibrated-*looking* probability that is a re-parameterisation of hand-set decimals. That is the single largest thing the block concealed.

### D2 — QUEUED: The brief's "known gap" is understated by one order of magnitude.

`gse-reasoning-engine-brief-2026-10-02.md:63` states the frontier as *"a published pick still does not pass through the reasoning traces."*

The registry's `traced` column says the published pick does not pass through the **47-signal registry** either — 47/47 `no`, and `runSignalRegistry` has zero non-test callers. The gap is not "traces aren't in the pick path"; it is "neither the traces nor the signal registry are in the pick path." The one-number summary (`46 no / 1 partial`) that both the brief and `GSE-REPO-INTELLIGENCE.md:19` quote hides this, because the registry actually carries **five** verdict dimensions per signal (`wired`, `weighted`, `tested`, `traced`, plus `wired_state`) and both documents report only the fifth.

### D3 — QUEUED: Three honesty ledgers exist and were never reconciled.

| ledger | size | content | in the 20-wire program? |
|---|---|---|---|
| signal registry | 47 signals, 5-dimension verdicts | 46 `no` / 1 `partial`; 47/47 untraced | not enumerated |
| wire program | 20 wires, "8 done" | named 6 + "two more pending verification" | yes |
| claim matrix | **10 claims** | 3 `wired`, 3 `measured`, 2 `partial`, 2 `gap`, 0 `refused` | **absent** |

`intelligence/gates/claim_matrix.py` is a real gate — *"A claim is not wired unless the code, the test, and the data file exist… A status of wired with a missing path fails. That is the gate."* It appears in neither the brief's wire list nor the repo-intel delta. One of the three ledgers is the strictest of the three and is not on the scoreboard.

### D4 — QUEUED: Which calibration surface is canonical?

Three ECE implementations, three runtimes, three lineages, no shared definition:

1. `packages/prediction-engine/src/calibration/calibration-gates.ts` — bare 10-bin ECE, gate thresholds, isotonic reject path. Sourced to *"sjpagano."*
2. `apps/web/lib/calibration` (`CALIBRATION_MEASUREMENT_RUNTIME.md`) — Brier, ECE, MCE, confidence buckets, model-version grouping, current/unsettled-season exclusion, *"No model weight changes."* This is the one that **renders on the board**.
3. `intelligence/gates/calibration_rows.json` — 4 rows, **all `fitted: false`**.

The runtime that shows the user a number and the gate that decides whether to ship are different code paths. `GSE-REPO-INTELLIGENCE.md` §6.1 ADOPTs *"ECE with bootstrap confidence intervals… if the CI straddles zero the signal is *unmeasured*, not calibrated."* No bootstrap CI is computed anywhere in the readable set. **Decision owed:** which surface owns the definition of "calibrated," and does the board's number come from the gate that passed?

### D5 — QUEUED: Reddit OAuth credential, beat-writer list, prop vendor — still owner-gated.

v5.3.0 §11 lists all three as founder actions. None appears satisfied in any readable source. WS3 T4 cannot run without the Reddit app; WS3 T2 cannot run without the approved config; **WS4 cannot start at all** without the props-endpoint coverage check (§8: *"First check the existing odds vendor's props endpoint… Only propose a new vendor if coverage is missing. (Founder decides spend.)"*). No document records that the check was run.

---

## 2. Unfinished wires the block hid (QUEUED)

### U1 — QUEUED: The wire scoreboard does not add up, and "8 of 20" is not trustworthy.

`GSE-REPO-INTELLIGENCE.md:24`: *"wires done 2 → 8 of 20. Owed: 12 (W1, W2, W3, W7, W10, W11×5 remaining, W13, W14, W15, W18)."*

- 20 − 8 = 12 owed.
- The list enumerates **10 distinct IDs** (W1, W2, W3, W7, W10, W11, W13, W14, W15, W18). Counting `W11×5` as five instances → **14**. Counting W11 once → **10**.
- Neither is 12. Under both readings the list and the scoreboard disagree.

Compounding it: the brief itself admits *"tau→DataContext, held-out checker, manifest enforcer, paired audit, two-host ledger, injury gate, **and two more pending verification**"* — so 2 of the 8 counted as done are unverified, which violates the brief's own rule *"a wired signal without a calibration row is not wired"* and its completion-language doctrine. **Nobody recorded which two.** That is exactly the payload a `coding-agent-wire-package-2026-10-02.md` would carry.

### U2 — QUEUED: Every calibration row is unfitted.

`intelligence/gates/calibration_rows.json`, all four `fitted: false`:
- `epa_facets` — *"Week-to-next pass EPA correlation is 0.1425 on 2012 pairs, 2022-2025. Descriptive. No map fitted."*
- `tau_hat_served` — *"Walk-forward passed and was not swapped. BLOCKED-ON-PRECISION."*
- `weather_prior` — *"Wind over 15 is a labeled prior of -1.5 total points. No season was used to fit that number."*
- `nfl_age_conditioned_rest` — *"homeSign is wired. No live writer. No calibration row fitted."*

The brief's *"First calibration rows are in — including valid negative results"* is true and misleading in the same breath as `runSignalRegistry`'s zero callers: **0 of 47 signals have a fitted calibration map.** Note also that the repo-intel delta lists only three rows; the fourth (`nfl_age_conditioned_rest`) exists in neither document.

### U3 — QUEUED: `signal-scale-table.ts`'s measured weights reach nothing.

The registry's own evidence names the one table with genuinely measured weights and then establishes that it addresses a disjoint namespace. Under the brief's governing sequence (*research → wire → weight → calibrate → test*), the measured weights exist and are unwired to the only consumer that needs them. This is a wiring task with a named file on both ends.

### U4 — QUEUED: The published-pick → reasoning-trace wire (brief's stated frontier).

Still open, and per D2 it is a *two-sided* wire (trace **and** registry). `engine-weights.ts` makes it structurally impossible from its side: `composeEngineReading` returns `publishesPick: false` and `tiltIsProbability: false` as literal type annotations, not configuration.

### U5 — QUEUED: The paper implementations are still off `main`, and `historical_strength` still points at Elo.

The live checkout `C:\Users\Garrett\Sports-wt-intel` is on `motif/gse-intelligence-build-2026-10-02` at `1758cfa0d`. `GSE-REPO-INTELLIGENCE.md`'s DELTA header reads *"HEAD `62d3d7c40`, +6 commits since the build"* — but `62d3d7c40` ("Narrow the tilt vote before reading it") is **six commits behind the live tip**. The delta therefore predates the entire paper set (`8afbc63a5`, `9633e4e4e`, `1758cfa0d` and three siblings) and never mentions iWinRNFL, the 4th-down matrix, or the dynamic rating engine.

Meanwhile `engine-weights.ts` declares `historical_strength` (prior 0.08, role `premise`) with the rationale *"Elo is one strength premise, not the product."* The verified iWinRNFL engine (held-out MAE 11.348 on 2024–2025) is **not** the source for that family. Merging the branch is owed; the decision it forces is whether `historical_strength` switches source and whether the unfitted 14 in Φ(margin/14) gets its own calibration row — which repo-intel §6.10's rule (*"The student gets its own calibration row — never inherits the teacher's"*) argues it must.

### U6 — QUEUED: `homeSign` — landed on one side, still unwired on the other.

The registry's single `partial` signal (`nfl_age_conditioned_rest`) carries `_blocked_reason`: *"homeSign +1 landed at `e28e4b808`. Live slate still passes `process.env`. Those keys have no writer."* One wire is landed; the consumer half is not. This is a concrete, single-commit-shaped unfinished wire that no readable document names.

---

## 3. Contradictions the block hid

### C1 — **Sharpest.** Unexplained-steam vs. "the engine does not chase the price."

- `engine-weights.ts`: `market_context` prior 0.05, role **`context_not_objective`**, why: *"The devigged price is context. The engine does not chase it."* `composeEngineReading` routes that role to `withheldShare` and never lets it touch `mass`.
- v5.3.0 §7: *"Unexplained-steam detector (high value — do not skip): cross every beat item's timestamp against `lineMovementSpread/Total` timestamps. A significant line move with **no** preceding public beat item… score it as its own positive factor… This is the closest thing to seeing respected money."*

These cannot both be followed. A steam factor derived from a market series has exactly one home today, and that home is withheld. Expressing it requires re-roling `market_context` from `context_not_objective` to `premise` — moving 0.05 of the table and reopening the price question the role exists to close. **Unresolved, and it is a doctrine question, not an implementation detail.**

### C2 — The market is forbidden in the edge and dominant in the confidence that ships.

v5.3.0 §2 documents the public formula: `rawEdge = fairProb − americanToImpliedProbability(avgPrice)`; edge component `= clamp((rawEdge+0.05)/0.10, 0, 1) × 25`. **Up to 25 of 100 published confidence points are market-derived.** WS1 then trains the calibrated head on *"the snapshot factor vector (all existing components)"* — i.e. the head inherits the market edge. Meanwhile `engine-weights.ts` withholds it and `calibration_meters` (0.03) is *"meter only… not a signal about this game."* Same product, two opposite rulings on whether the price may move the number.

### C3 — Fixed-prior sum vs. learned per-head coefficients.

`engine-weights.ts` header is the standing rule: *"the edge is the sum of prior × signal across the whole table. A missing signal adds zero. Live signals are not rescaled to fill that hole."* `composeEngineReading` honours it exactly — it tracks `weight` as `coverage` and **never normalises `mass` by it**.

A logistic head fitted per sport × market type (WS1: *"Do not fit one global model"*) **does** renormalise: coefficients absorb missingness, so a family going dark in week *w* silently changes what every other coefficient means that week. The two architectures disagree on the central rule, and `coverage` / `darkShare` / `withheldShare` / `meterShare` are already computed and returned — so the instrumentation to detect the renormalisation exists and nothing consumes it.

### C4 — v5.3.0 contradicts itself on shadow. (See §4.)

### C5 — WS2 gates Premium on a family that is pinned dark.

v5.3.0 §6 makes *"beat-vector agreement"* and §9b makes narrative *"a positive gate input"* and *"a Premium hold"* trigger. But `engine-weights.ts` sets `narrative_contract` prior 0.03, role **`dark`**, why: *"Contract and cohort modules exist. **No week-3 row was joined.**"* A dark family contributes zero and cannot gate. Also relevant: `airwave` (0.05, premise) is already *"AP injury statuses plus beat corroboration"* — so WS3's T1/T2 exist as a premise while WS3 is specified as unbuilt. Two beat desks, one repo, no cross-dedupe specified between them.

### C6 — The injury gate fails closed; the weights composer fails open.

`injury_gate.py` refuses hard: `InjuryNotPublished` before Friday 18:00 ET, *"Reading a committed file is not a pull."* `claims.json` confirms the closed behaviour is wired (`ol_provider`: *"raises on an unpublished week."*).

`composeEngineReading` has **no DataGapError path**. A missing `availability` (prior **0.12**) is pushed to `dark`, `darkShare` grows, and the edge is returned from the remaining weight with `coverage` attached. That is fail-open, against the brief's doctrine: *"the engine fails closed into explicit `DataGapError`, `INVALID`, or abstention states."* The Python provider and the TypeScript weights table never meet, and nothing states which failure mode governs a published number.

### C7 — The isotonic reject path is honest; the accept path selects on the holdout.

`tryIsotonic` fits PAV on train, maps holdout through it, computes `holdoutBrierBefore/After`, and **applies isotonic iff `deltaBrier < 0`** — i.e. the decision to calibrate is made by reading the holdout. `runCalibrationGate` then computes `metrics = computeMetrics(finalProbs, holdoutOutcomes)` on that *same* holdout and decides `passed` from it. Whenever `applied: true`, the reported Brier/log-loss/ECE are the numbers that earned the right to be reported.

This sits against the brief's *"held-out gate on every train/eval split"* and against repo-intel weak point #1 (*"No leakage/temporal-safety machinery… every walk-forward number currently being produced is unverified-until-proven-leak-free"*). The canon doc is also explicit that isotonic *"Needs > ~1,000 samples; bin-sparse above that"* — and `runCalibrationGate` has **no n floor and no CI**. A call with n=20 will happily fit, select, and report.

Secondary: `calibrate()` maps by *nearest block centre*, so the "isotonic" map is a coarse step function, not the standard piecewise-constant interpolation. And `computeMetrics`'s ECE is equal-width 10-bin — precisely the binning artifact repo-intel §6.3 ADOPTs `probmetrics` to remove (*"Lp calibration-error estimators (no binning artifacts)… isotonic only for large-n"*).

### C8 — Three ledgers, three definitions of "honest state", zero calibration.

Covered in D3/D4. Stated here because it is a contradiction, not only an omission: the registry (5 dimensions, 47/47 untraced), the wire program (a count that doesn't sum), and the claim matrix (a strict file-existence gate) all disagree about what is true, and the strictest is the one with no scoreboard line.

### C9 — `GSE-REPO-INTELLIGENCE.md`'s delta is stale against the branch it names as HEAD.

Its own header pins `62d3d7c40`; the live tip is six commits ahead at `1758cfa0d`. Its line-19 caveat — *"Provenance honestly notes it is not a fresh line-by-line re-read"* — understates the registry's actual quality (which carries per-dimension `file:line` evidence) while overstating the brief's summary (which reduces five dimensions to one column). Both directions of the same distortion.

---

## 4. Shadow — the spec that says skip shadow, and why that is not permission to skip anything

The prompt's warning is load-bearing here. `gse-v5.3.0-build-spec.md` says both:

- §1(d): *"everything ships **direct to production** — no shadow period (founder override 2026-09-13: 'we're way too far behind'). Safety comes from the kill switch, the conjunction gate (which fails safe — see below), and weekly monitoring, not from waiting."*
- §3: *"…Workstreams 3–5 (new layers, **shadow**) → Workstream 6 (promotion)."*

One document, three weeks of history apart, two opposite instructions. §10 tries to reconcile by distinguishing backtest from shadow (*"that is analysis, not shadow — it stays"*), which is right and does not resolve §3.

**What must not happen, and is visibly starting to happen:** the "no shadow" override is about *shipping the v5.3.0 confidence rollout*. It is not authorisation to declare unwired signals live. The registry's `activation_status` tally shows the conflation:

> **41 `ACTIVE` · 5 `BLOCKED_MISSING_SOURCE` · 1 `SHADOW_ONLY`**

Forty-one signals are labelled ACTIVE while — per their own rows — `runSignalRegistry` has zero non-test callers, 71 env keys have zero writers, four named signals are written by no production code, and 0 of 47 have committed source data. `ACTIVE` here is functioning as *"not yet refused,"* which is the precise inversion of the doctrine:

> *"Shadow before publish. Uncalibrated signals compute in shadow with weight zero. Nothing reaches a published pick until it is wired, weighted, and calibrated."* — brief, Core doctrines

So, explicitly, the four items pass 1 declined to raise, and which this pass raises anyway:

| item | status | why the "no shadow" clause does not excuse it |
|---|---|---|
| WS3 beat desk (T1–T4, trust leaderboard, hold flags) | **unbuilt** | The override removed a *waiting period*, not the requirement to be wired and weighted first. It is still owed work with acceptance criteria. |
| WS3 unexplained-steam detector | **unbuilt, and doctrinally forbidden** (C1) | The override cannot license a signal the weights table withholds. |
| WS4 prop alignment | **blocked on an unrun vendor check** (D5) | Unblocked by a spend decision, not by a shadow ruling. |
| WS5B narrative / incentive tracker | **unbuilt; `narrative_contract` dark** (C5, U-?) | Cannot gate Premium from a dark family. |

One item *is* legitimately cleared by the override and should be recorded as such rather than re-litigated: the `sdv-dev/Copulas` BUSL-1.1 exclusion. `ENGINES-MATH-CALIBRATIONS-RESEARCH.md` resolved it (*"DO NOT DEPEND… use statsmodels (BSD-3, distributions.copula) instead"*) before v5.3.0 was written. Same resolution, same reasoning, for `yfpy` GPL-3.0 (repo-intel weak point #9) — though note the registry found **7 signals with `license` UNKNOWN**, so the standing license gate that weak point #9 asks for has real work waiting and still no tooling.

---

## 5. Still blocked — the nine `.gdoc` files

Unchanged from pass 1, and not closed by this pass. Their bodies remain unrecovered; the extracts are adjacent documents, not substitutes.

What this pass can say is what those nine documents would now have to answer, which is a sharper question than pass 1 could pose:

1. **`coding-agent-wire-package-2026-10-02.md`** — which two of the eight "landed" wires are the *"pending verification"* pair (U1), and what is the correct owed count: 10, 12, or 14?
2. **`TASK-016-v3-consolidated-mission-2026-10-02.md`** (+ its `(1)` duplicate) — note the branch already carries `ae329b719 [hermes-task016] Ledger, injury gate, paired audit, registry states`. TASK-016 appears to have landed *four* of its items. Whether v3-consolidated supersedes it, or was never reconciled with it, is unrecorded.
3. **`handoff-motif-to-grok4.7-2026-10-02.md`** (+ `(1)` duplicate) — the motif handoff vs. the branch state I verified: `historical_strength` still on Elo (U5), `narrative_contract` still dark (C5).
4. **`What I Was Still Missing.gdoc`** — the closest fit to this pass's findings, and the one whose recovery would most change the queue.
5. **`GSE Agent Skill — sketch (draft, not published).gdoc`** — explicitly a draft. Note `~/.claude/skills/` already holds `coding-agent`, `clearance`, `stripe-webhook`, `settlement-free-path`, `calibration-pipeline`, and others. Whether this sketch is the source of any of them is unrecorded.
6. **`NFL Analytics Reverse-Engineering (3).gdoc`** — unassessed.
7. **`GROK 4.gdoc`** — unassessed.

Duplicates remain undistinguishable: both `(1)` copies and their base report 179 B and the same read failure.

**Owner-gated to clear:** export the nine `.gdoc` bodies to `.md`/`.txt`, or repair Drive stub resolution so the shortcut targets resolve to content. Nothing in this pass substitutes for that.

---

## 6. Method and receipts

| step | what | result |
|---|---|---|
| dump listing | `ls` on `GSE. 10.2.26`, filtered for the nine slice names | all 9 present, 179 B, `.gdoc` |
| dump `.md` listing | same, filtered `\.md$` | 3 files: `branch-atlas.md`, `gse-reasoning-engine-brief-2026-10-02.md`, `GSE-REPO-INTELLIGENCE.md` |
| extract provenance | grep of dump for all six extract basenames | **0 hits** — extracts are adjacent, not `.gdoc` bodies |
| registry read | `python json.load` on `intelligence/signals/registry.json` | 47 signals; 46 `no` / 1 `partial`; `traced: no` ×47; `source_data` 41 `NONE` / 6 `REAL_NOT_COMMITTED` / 0 committed; `activation_status` 41 `ACTIVE` / 5 `BLOCKED_MISSING_SOURCE` / 1 `SHADOW_ONLY` |
| claim matrix | `python json.load` on `intelligence/gates/claims.json` | 10 claims: 3 `wired`, 3 `measured`, 2 `partial`, 2 `gap` |
| calibration rows | `cat intelligence/gates/calibration_rows.json` | 4 rows, **all** `fitted: false` |
| branch state | `git log --oneline -12`, `git rev-parse --abbrev-ref HEAD` | `motif/gse-intelligence-build-2026-10-02` @ `1758cfa0d`; `62d3d7c40` is 6 commits back |
| `intelligence/staking/` | `ls` | `kelly.py`, `market.py`, `cvar.py`, `alpha_governor.py`, `screening.py`, `variants.py`, `dgp.py` |

**One discrepancy worth flagging against repo-intel:** weak point #7 states *"no GSE lane has a model-vs-market edge detector or a staking layer (Kelly-with-guardrails is the responsible pattern)."* `intelligence/staking/` contains `kelly.py` and `market.py`. I did not open them and make **no claim** about their state — only that the intel's assertion is not consistent with the directory listing, and should be re-checked before it is used to justify building anything.

**Not asserted anywhere above:** any measurement, coefficient, sample count, or probability that is not quoted from a named file. No fit was invented. No `.gdoc` body was reconstructed or guessed. The one item requiring your judgement rather than more reading is **D1** — whether v5.3.0 WS1 may fit on the current registry, and if not, what the blocking condition is.
