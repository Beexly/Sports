# Pass 2 — Pickle. The permissive / first-party items pass 1 queued.

**Read-only.** Nothing on `G:` and no Sports checkout was modified. `registry.json` was read from `C:\Users\Garrett\Sports-wt-intel\intelligence\signals\registry.json`; product code was read from that same checkout. `git log` only — no writes.

**Path correction.** The literal path in the prompt, `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26\repo-intel`, does not exist on this machine. The same folder is reachable at **`G:\My Drive\GSE. 10.2.26\repo-intel`** (G: is mounted as `My Drive`). All reads below are from the real folder. Pass 1 quoted a working path — worth correcting the index so the next pass does not fail on it.

**Does not repeat `pickle-repos.md`.** No PolyForm/GPL argument restated except as a one-line queue reference.

---

## 0. The registry is real, and it closes pass 1's blocker

Pass 1 could not close bucket (c) because `intelligence/signals/registry.json` was not in the Drive dump. It is not on the Drive; it is in the product checkout. Verified now.

`registry.json` — 47 signals, exactly. Verified counts:

| | count |
|---|---|
| signals total | **47** |
| `wired.verdict == "no"` | **37** |
| `output_kind` CONTINUOUS_VALUE | **31** |
| `weighted.verdict == "prior_no_evidence"` | **43** |
| `activation_status` ACTIVE / SHADOW_ONLY / BLOCKED_MISSING_SOURCE | 41 / 1 / 5 |
| `trust_weight == "0.0"` | **5** |

**Zero occurrences** in the entire 240 KB file of: `kelly`, `conformal`, `coverage`, `uncert`, `interval`, `bound`, `stake`, `bankroll`, `ev`, `sharp`, `vig`, `readiness`. (45 hits for `edge` are all inside four string labels — "Trench Edge", "Defensive Installation Edge", "Personnel Grouping Edge" — not an edge-detection signal.)

Two facts from this file shape everything below:

1. **The registry has no slot for a staking, edge-detection, or uncertainty method.** No signal id, no field, no `output_kind`. Any claim that kelly.ts or conformal-lite "feeds a signal in the 47-registry" would be me inventing a target.
2. **37 of 47 signals are unwired, and 43 of 47 carry a weight with no evidence behind it.** The registry is not missing methods. It is missing wires.

---

## 1. The permissive set, re-read

Of 17 per-repo notes, **two carry an explicit MIT/BSD grant** and **eleven are first-party** (`Beexly` is Garrett's own GitHub org — same org as `Beexly/Sports`, and `C:\Users\Garrett\beexly-dev` exists locally).

**Explicit MIT, third party — 1 repo**

| Repo | Grant | Source line |
|---|---|---|
| `chrisgillam/polymarket_gambot` | **MIT**, and the note's own verdict is `REBUILD` | `external/chrisgillam-polymarket_gambot.md:3`, `:26` |

**Explicit MIT, first party — 1 repo**

| Repo | Grant | Source line |
|---|---|---|
| `Beexly/OmniRoute` | **"Free MIT AI gateway"** in the GitHub description; **"free, MIT-licensed AI model gateway"** in the note body; Garrett's own fork of `diegosouzapw/OmniRoute` | `per-repo/Beexly-OmniRoute.md:4`, `:12` |

`Beexly/SupaAgent` states `LICENSE (MIT)` at `per-repo/Beexly-SupaAgent.md:28` — MIT, but a multi-model MCP council tool. No sports-probability content. Infra, not signal.

**First-party, no stated license — legal to learn and reimplement because it is his own code**

| Repo | The named item | Note line |
|---|---|---|
| `Beexly/autonomous-revenue-engine` | **`conformal-lite/`** — 13 blobs, `core.py`, `cqr.py`, `adaptive_cp.py`, `saocp.py`, `evalue.py`, `meter.py`, `lago.py`, `capi.py`, `__main__.py`, tests | `per-repo/Beexly-autonomous-revenue-engine.md:28` |
| `Beexly/gse-competitive-intel` | **`codex-work/prediction-engine-reference/`** — `kelly.ts`, `poisson.ts`, `scoring.ts`, **`evidence-readiness-matrix.ts`** | `per-repo/Beexly-gse-competitive-intel.md:16`, `:20` |
| `Beexly/Project-Tree` | **`sheaf_integrity`** — multi-source consistency engine; README classes `consistent` / `statistical` / `structural` / **`self_consistent_wrong_vs_ledger`**. README: *"explicitly not part of Beexly/Sports until an explicit founder YES."* Private-to-owner. | `per-repo/Beexly-Project-Tree.md:9`, `:45` |

---

## 2. The named items — the honest answer is that two of three are already built

The question assumed these were unbuilt. Two are not. No code was copied; this is filename-and-symbol presence in the checkout.

### 2a. `conformal-lite` — already reimplemented, module for module

`git grep -ril conformal -- '*.ts'` in `Sports-wt-intel` returns **19 non-test files**. Mapping is close to 1:1:

| `conformal-lite/` | Already in `Sports-wt-intel` |
|---|---|
| `cqr.py` | `apps/web/lib/calibration/cqr.ts`, `cqr-recipe-audit.ts` |
| `adaptive_cp.py` | `apps/web/lib/calibration/aci-durable.ts`, `aci-online-controller.ts` (header: *"Adaptive Conformal Inference Under Distribution Shift, arXiv 2106.00170"*), `aci-state.ts` |
| `saocp.py` | `apps/web/lib/calibration/conformal-pid.ts` — header names *"Adaptive Conformal Inference; add a P-term eta_P\*(err_t - alpha)"*, which is the SAOCP update rule |
| `evalue.py` | `evalue` in 50 files |
| `meter.py` | `coverage` in 385 files; plus `1910-10562-nested-conformal-qoob.ts`, `1904-06019-weighted-split-conformal-covariate-shift.ts`, `localized-conformal.ts`, `2502-06884-two-threshold-conformal-abstention.ts` |
| `core.py` | `conformal-calibration.ts` (`:77` registers "Adaptive conformal inference (ACI) abstain") |
| `enbpi` (EnbPI, not in conformal-lite) | `apps/web/lib/calibration/enbpi.ts` |
| `lago.py`, `capi.py` | **not identified.** No counterpart found. I am not guessing at what these two modules do. |

**Verdict: nothing to steal. conformal-lite is a stale copy of a stack GSE already owns and has extended further (EnbPI, nested conformal, Mondrian, covariate shift) than the 13-blob reference.**

### 2b. `kelly.ts` — already reimplemented, 133 files

`git grep -rl -i kelly -- '*.ts' ':!*test.ts'` → **133 files**, including three purpose-built modules that are not ports of anything:
- `apps/web/lib/calibration/2004-09368-crash-risk-kelly.ts`
- `apps/web/lib/calibration/2505-03585v1-robust-kelly-mmd.ts`
- `apps/web/lib/calibration/2604-20172v2-cover-robbins-stake-multiplier.ts` — conformal coverage + stake multiplier in one file
- plus `apps/web/lib/staking/kelly-investigation.ts`, `apps/web/lib/tracker/bankroll.ts`, `dynamic-risk-budget.ts`

The gambot note's actual lesson — *"Kelly with guardrails: kelly_multiplier plus MAX_PERCENTAGE_BET plus MAX_DOLLAR_BET is defense in depth, full Kelly is acknowledged as too volatile"* (`chrisgillam-polymarket_gambot.md:21`) — is already the shape of `dynamic-risk-budget.ts` and `tracker/bankroll.ts`. **Verdict: already built, and built with the guardrail the note recommends. This is the MIT item pass 1 should have reported as already-landed rather than queued.**

### 2c. `evidence-readiness-matrix.ts` — already reimplemented, 535 lines, and already reading the registry

`packages/prediction-engine/src/evidence-readiness-matrix.ts` exists, is 535 lines, and is exported at `packages/prediction-engine/src/index.ts:257`,`:267`.

It is not a stub. It already implements exactly the shadow taxonomy the method needs:
- `:418` gates on `activationStatus !== "ACTIVE" && !== "SHADOW_ONLY"`
- `:441-451` `deriveStatus` → `BLOCKED` / `ACTIVE` / `SHADOW_READY` / `SHADOW_COLLECTING`
- `:446` **hard rule: any blocker ⇒ `BLOCKED`**
- `:399-401` *"Bootstrap evidence cannot activate scoring."*
- `:413` minimum sample size, `:408` minimum trust level, `:405` staleness horizon

And it already contains the gambot "sharp book as truth" debate, settled: `:421-436` holds `model.trueEv` blocked unless an independent `EdgeLabVerdictInput` artifact reports `logitPoolVerdict === LOGIT_POOL_ADDS_INFORMATION_VERDICT` **and** a tuned firing threshold (`tunedTau !== null`, i.e. "fire nothing" stays blocked). `EdgeLab` code is live in `apps/web/lib/board/gate-certificates.ts`, `gate-consumer.ts`, `gate-rows.ts`, `intelligence-core/universal-wiring.ts`, `ledger/display-guard.ts`, `truthmetrics/consensus-clock.ts`.

**Verdict: already built, already registry-aware, and already encodes the "don't outsource truth to the market" position the gambot note raises at `:22`.**

---

## 3. So: which method is legal *and* actually missing?

Only one.

### `Beexly/Project-Tree` → `sheaf_integrity`. Verified absent: 0 hits.

```
sheaf_integrity     0
sheafIntegrity      0
self_consistent_wrong 0
```

This is the answer, and it is a strong one because **the registry already suffers from the exact defect class this repo is named for.**

Project-Tree's four consistency classes are `consistent` / `statistical` / `structural` / `self_consistent_wrong_vs_ledger` (`Beexly-Project-Tree.md:9`). The last one means: *internally coherent, agrees with itself, and is still wrong against the ledger.* Applied to `registry.json`, **37 of 47 signals are in that class**, and the registry's own evidence strings say so verbatim:

- **30 of the 31 continuous signals** carry this identical `wired.evidence` (the same boilerplate repeats on every one): *"the evaluate body reads process.env keys that no production code writes, so no input data actually reaches it… All 22 extension evaluators read 71 env keys with zero writers."* Their `dataDependencies` **name feeds that do not exist**. A declaration that is consistent with itself and inconsistent with reality is the definition of `self_consistent_wrong_vs_ledger`.
- **`#0 prefetched_exchange`** is `producer.class: STUB_OR_CONSTANT` — *"evaluate is `return null` with the comment 'Handled directly when prefetched rows are passed'"* — while its `source_data.class` is `REAL_NOT_COMMITTED`. It computes nothing and holds no data, yet the registry "declares `isRightsCleared`" while recording no license for the source.
- **`#9 nfl_epa_adj`** carries `license.verdict: "commercial-ok (CC-BY-4.0, nflverse)"` and `source_data.class: "NONE"`. A clean license verdict on data that does not arrive.
- **`#8 polymarket_gamma_internal`** is `SHADOW_ONLY` with `trust_weight "0.5"` — a non-zero weight on a shadow signal, which is the inverse of the convention.

**Mapping to a 47-registry signal as shadow weight zero: this one is not a signal.** It is a classifier over all 47, and the field it belongs in is `wired_state` / `_blocked_reason`, which the registry currently fills with prose rather than a class. Feeding it as a signal weight would be the exact `self_consistent_wrong_vs_ledger` mistake the repo exists to catch.

---

## 4. "Shadow weight zero" — the mechanism, read from source

The phrase is satisfiable today and needs no new code. Three distinct mechanisms exist; which one applies depends on `output_kind`.

### Mechanism A — `trustWeight: 0` on a continuous signal. Already correct, already silent.

`packages/ingestion-pipeline/src/continuous-signal-tilt.ts`:
```
:52   return squashed * Math.min(1, Math.max(0, trustWeight));
:98   const homeSign = homeSignOf(continuous.metadata);
:99   if (homeSign === null) { refused.push({...}); continue; }
:107  const tilt = valueToTilt(signed, signal.trustWeight);
:108  if (tilt === 0) continue;
```
`trustWeight 0` ⇒ `tilt === 0` ⇒ dropped at `:108` **before** it reaches `poolSignalsHierarchically` (`:138`) and before the log-odds add (`:153`). So a signal can compute every run, be observable, and be **arithmetically incapable of moving `adjustedHomeP`**. It also does *not* appear in `refused` — so shadow is clean, not reported as an error. This is the mechanism the prompt is asking about, and it is already fail-closed.

### Mechanism B — `activationStatus: "SHADOW_ONLY"`. Real, but used once.

Only `#8 polymarket_gamma_internal` uses it. `evidence-readiness-matrix.ts:448-449` maps it to `SHADOW_READY` / `SHADOW_COLLECTING` depending on `canContributeWhenActive`, and `plan-compiler.ts:87` gives `SHADOW_ONLY` a `0.6` allocation. Note the inversion in §3: the one signal in shadow is the one carrying a non-zero weight.

### Mechanism C — the signal-ledger shadow composer (PR #988). The cleanest.

`apps/web/lib/ops/signal-ledger-shadow.ts` (114 lines) — header states it *"reads candidates, writes nothing (no DB, no disk, no network); never touches the published pick score, the calibrator, or MODEL_VERSION; promotion of any shadow number into a live path is a separate, founder-gated step."* Plus `signal-ledger-store.ts` (144 lines). Both are `STATUS 2026-10-01: WIRED in shadow` in `docs/ops/wiring-backlog-2026-10-01.md:31`,`:39`. **This path bypasses the probability blend entirely and is the right home for anything new.**

### The one signal that already proves the pattern end-to-end

`nfl_age_conditioned_rest` (`#26`) is the **only** one of the 31 continuous signals that declares a sign: `signal-registry-extensions.ts:205` → `metadata: { ...res, homeSign: 1 }`. `homeSign` appears **zero** times in `signal-registry-definitions.ts` and **once** in `signal-registry-extensions.ts`. It is the only one, and the comment at `:200-204` states the discipline: the number is a margin shift *computed for `ctx.homeTeam` only*, *"There is no away-team branch in the number."*

That justification is exactly what the other 30 lack and what a shadow-weight-zero entry has to supply first. `continuous-signal-tilt.test.ts:139` proves this signal genuinely moves `homeP` in both directions through the real tilt, with the four env keys hand-injected (`ROSTER_SNAP_WEIGHTED_AGE`, `REST_DAYS`, `STARTING_QB_AGE`, `OL_AVG_AGE`) — keys production never writes, which is why the registry still calls it unwired. **Structurally wired, operationally dark on input starvation alone.** That is the distinction pass 1 blurred.

---

## 5. Concrete shadow-weight-zero candidates

Given that the methods are already built, the remaining question is which registry rows could accept a reimplementation at weight zero. Ordered by method fit, all three verified unwired.

| # | Signal | Family | `trustWeight` | Why this one |
|---|---|---|---|---|
| 1 | **`nfl_negative_binomial_redzone_td`** (`signal-registry-extensions.ts:654`) | EFFICIENCY | `"0.10"` hand-assigned | **The only distributional target in the registry.** It models a negative-binomial TD rate and has no coverage guarantee at all. `cqr.ts` is already in the product, so a conformalized-quantile wrapper over this row is a *new* use of existing code, not a port. Continuous ⇒ Mechanism A applies, weight 0 is free. **Best fit in the file.** |
| 2 | **`nfl_luck_fumble_regression`** (`signal-registry-definitions.ts:648`) | LUCK | `"0.0"` | **Already at zero.** `BLOCKED_MISSING_SOURCE`, `producer.class: STUB_OR_CONSTANT`, *"No evaluate is declared."* The luck-regression question is literally *"how much of this result is noise?"* — the question conformal prediction answers, and the only family (`LUCK`, 2 signals) with a hand weight of 0. It is a shadow slot in the literal sense, but it has no producer, so the work is a source adapter first. |
| 3 | **`nfl_rookie_breakout_cohort`** (`signal-registry-extensions.ts:722`) | NARRATIVE | `"0.06"` — lowest non-zero | NARRATIVE is the weakest family (4 signals, `prior_no_evidence` throughout, family prior weight 0.05). Lowest hand weight in the file. Weaker fit than #1. |

**Not proposed: any new signal id for kelly, edge detection, or uncertainty.** The registry has no field for them, and adding ids to make a method look wired is the failure mode `self_consistent_wrong_vs_ledger` is named for.

---

## 6. QUEUED — license wall or unstated, not re-argued

**License-walled (unchanged from pass 1):**
- `Beexly/Sports` — **PolyForm Noncommercial 1.0.0** (`per-repo/Beexly-Sports.md:11`). Governs the system of record itself. Still an owner decision, not a research one.
- `yfpy` — **GPL-3.0** (`GSE-REPO-INTELLIGENCE.md:107`).

**Unstated license → queued despite being first-party-adjacent.** These have a `LICENSE` file or are public but no grant is quoted in the note, so this pass does not open them: `UltimaScraper` (`:22`), `claude-code-best-practice` (`:14`), `awesome-ai-agents-2026` (`:15`), `chick-goodies-kit`, `agent-bus` (no README, `:8`), `espn-groupme-bot`, `Fablechain` (fork, upstream not captured), `Clouds-bruh`, `GSN.Cards`, `gradio-GSN` (upstream Apache-2.0 but *"No Beexly-specific changes were identified"* and no diff run — `Beexly-gradio-GSN.md:64`), `Doug.As-Builders`.
Note: `Project-Tree` was moved *out* of this bucket on the strength of `Beexly-Project-Tree.md:45` — *"a private-to-owner working repo"* — plus the README's own founder-gate language.

**No code was copied from any of them.** This pass read notes and a file tree; it did not open a single source file from any queued repo.

---

## 7. Two caveats that limit everything above

1. **`registry.json` is stale relative to HEAD.** Its `provenance` field says *"Regenerated 2026-10-02T17:57:25Z at HEAD `531b39a43`."* `git log -- intelligence/signals/registry.json` → `ae329b719`; `git log` HEAD → `1758cfa0d`. The registry was generated against a commit that is no longer HEAD, and it says so itself: *"This is not a fresh line-by-line re-read of all 47 evaluators."* Every `wired` verdict in §0 and §4 should be re-confirmed at HEAD before it is used to make a decision. I read it as-is and say so rather than re-deriving the survey.
2. **The registry's own `wired.evidence` text is not fully accurate.** It asserts `homeSign` appears *"in NO signal definition or evaluator."* That is true of `signal-registry-definitions.ts` and false of `signal-registry-extensions.ts:205`, where `nfl_age_conditioned_rest` does declare it. The registry's boilerplate is copy-pasted identically across all 31 continuous rows, which is itself an instance of the §3 defect class. I used the source, not the prose.

---

## Bottom line

- **Legal to learn and reimplement:** 2 explicit-MIT repos (`polymarket_gambot`, `OmniRoute` — plus `SupaAgent`, infra-only) and 11 first-party `Beexly` repos. All of `conformal-lite`, `kelly.ts`, and `evidence-readiness-matrix.ts` are in that set.
- **Already in the product, verified by source:** all three. conformal → 19 files, `cqr.ts` + `aci-*` + `enbpi.ts` + `conformal-pid.ts`. Kelly → 133 files. Evidence-readiness → `evidence-readiness-matrix.ts`, 535 lines, already reading `activationStatus` and already holding `model.trueEv` behind the EdgeLab logit-pool artifact.
- **The one real gap:** `Beexly/Project-Tree`'s `sheaf_integrity`, absent (0 hits), and it names the defect 37 of 47 registry rows currently have.
- **Best shadow-weight-zero target:** `#40 nfl_negative_binomial_redzone_td` — the registry's only distributional signal, unwired, continuous, and pairable with `cqr.ts` which is already written. Mechanism is `trustWeight: 0` → dropped at `continuous-signal-tilt.ts:108` before the probability blend; or cleaner, the PR #988 signal-ledger shadow composer, which never touches the blend at all.
- **Do not** mint a new registry id for kelly, edge, or uncertainty. The registry has no such field, and the honest report is that it doesn't — which is itself the finding.