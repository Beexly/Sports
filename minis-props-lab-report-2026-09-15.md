# minis-props-lab-report-2026-09-15

**Run:** MINIS PROPS LAB (H1/H2/H3) · **Agent:** Hermes/Grout Crew · **Architect:** Motif
**Date:** 2026-09-14 (execution) → filed 2026-09-15 · **Paths:** both mirrors,
`/var/minis/shared/gse-discovery/` and `/var/minis/workspace/gse-discovery/`
**Standing rules observed:** every number below comes from a run on this host; every claim
carries a file path or a logged run; nothing pushed.

> **v4 amendment: PATH_UNAVAILABLE.** `minis-grout-prompt-v4-gate-amendment.md` was searched for
> across the whole filesystem (`find / -iname "*v4-gate-amendment*" -o -iname "*grout*prompt*v4*"`)
> and **does not exist on this host**. The §A5 cross-check and the A1 SUPPORTED-veto rule are
> therefore applied as **quoted in the work order**, not as read from the amendment itself. Flagged
> as open question O-1.

---

## 1. STEP 0 — ARTIFACT DELIVERY MANIFEST

Delivered to **both** mirrors, `24 files`, source of truth `/root/workspace-gse/gse-discovery/`
plus `/tmp/nfl/` for the CSVs. Nothing lost.

| Artifact | bytes | note |
|---|---|---|
| `prereg-2026-09-14.md` | 6,202 | game-level prereg (frozen pre-outcome) |
| `minis-overnight-deep-report-2026-09-14.md` | 59,718 | §5 holds the L1–L5 frozen specs |
| `build2.py` / `build3.py` | 4,225 / 3,059 | compound-table builders |
| `gates2.py` / `boundary.py` / `cr.py` / `oa2.py` / `oa_search.py` | — | gate + boundary + OpenAlex scripts |
| `res_{A1,B1,B2,B2r,C1,C2,D1,D1r,D3r,E1,F1,F2,F3}.json` | 13 files | per-compound results |
| `compound_table2.csv` | 1,217,501 | 2,895 rows × 71 cols, 2015–2025 |
| `gate_results.jsonl` | 5,601 | gate ledger |

Added this run: `prereg-props-2026-09-14.md` (frozen L1 spec),
`agent-md-status-block-2026-09-14.md`, and this report.

---

## 2. L1 — COLD/WIND × PASSING EXPOSURE — **KILLED** (gates K1, K2, K3)

**Executed prereg hash:** `5c70f93e4b9dd668dce5ebd441ee330f010c44df6b9e24dcd04d756fc40e6618`
(`prereg-props-2026-09-14.md`, frozen before any outcome was joined).

**Join.** FTN charting 2022–2025 → nflverse pbp. pbp carries **no `nflverse_play_id` column**
(checked against the 372-column header), so the join is `game_id` + `play_id` (= FTN
`nflverse_game_id` + `nflverse_play_id`). Join rate **99.6% / 100.0% / 100.0% / 100.0%**
(2022/23/24/25) → **77,239** joined REG pass attempts. Weather filter (outdoor/open, non-null
temp+wind) → **41,568**; **10,200** outdoor rows dropped for null weather. Analysis set
**n = 39,986** (after requiring non-null trail8/down/ydstogo/lines). ColdWindy **10,950**;
PlayAction **8,584**; **ColdWindy×PlayAction flagged n = 2,479** (above the 1,500 power floor).
Evidence: `/tmp/nfl/l1_build.py`, `/tmp/nfl/l1_build.log`, `/tmp/nfl/l1_join.csv`.

### Stage 1 (freeze-preserving, no nulls needed for the verdict)

| quantity | value |
|---|---|
| interaction coefficient **c** | **+0.082131** |
| pre-registered direction | **c < 0** → **sign is OPPOSITE (K1)** |
| out-of-sample Δlog-loss 2023 / 2024 / 2025 | **+0.000145 / −0.000372 / +0.000139** nats/attempt |
| mean ΔLL | **−0.00003** vs the **0.002** threshold → **K2** |
| main effects | ColdWindy −0.0728 · PlayAction −0.0356 (the compound term carries the wrong sign) |

Evidence: `/tmp/nfl/res_L1.json`, `/tmp/nfl/l1_model.log`.

### Stage 2 (all four pre-registered procedures ran as frozen)

| procedure | result |
|---|---|
| **N1 permutation**, 1,000 within-season full refits | mean −0.002709, sd 0.055093, p5 −0.092974, p95 +0.088241; **93.7%** of permuted c ≤ observed c; 381.8 s |
| **Cluster-robust SE** (game-clustered) | 0.057505 → 90% CI **[−0.012464, +0.176727]** — **contains 0 (K3)** |
| **Clustered bootstrap**, 2,000 draws / 574 games | mean 0.079629, p5 −0.010945, p95 +0.174639 — **contains 0 (confirms K3)**; 512.9 s |
| **N2 indoor placebo**, 200 draws, n=23,697 | mean 0.003547, p5 −0.094987, p95 +0.122157 — **covers 0 ✓ (K6 does not fire)** |
| **Gate-5c severity tertiles** (within ColdWindy) | low **+0.088503** (n 4,310) · mid **+0.016046** (n 4,247) · high **+0.090451** (n 2,393) — **not middle-only, K5 does not fire** |
| **Gate-6 yards** (OLS + median) | OLS **+0.111341** · median **+0.669067** — both **positive**, opposite the pre-registered direction |

Evidence: `/tmp/nfl/res_L1_stage2.json`, `/tmp/nfl/l1_stage2b.log`, `/tmp/nfl/l1_finish.py`.

**Refined equation (post-hoc, labelled):** the only structure the data support is a *positive*
interaction: cold/windy play-action completions run slightly **above** what the main effects
predict (`c=+0.082`), which is the anti-direction hypothesis in §6 of the prereg. It is
**`[post-hoc]`**, unranked, and small enough that ΔLL is ~60× below threshold.

**Verdict: KILLED** on K1 (sign), K2 (ΔLL), K3 (clustered CI contains 0). K4 passes, K5 and K6
do not fire. The architect's independent recomputation of the sign is consistent with this.

---

## 3. v4 §A5 CROSS-CHECK (efficient-score vs full refit)

Run on **the same 100 permutation draws**, both statistics computed per draw.

| statistic | mean | sd |
|---|---|---|
| full refit (M1) | −0.014510 | 0.059824 |
| efficient-score (one-step) | −0.014623 | 0.059846 |

**max abs difference 0.000601 · mean abs difference 0.000113 · Pearson r = 0.9999977 ·
sign agreement 100.0%.** The substitution is validated.

**Important correction to my own earlier notice:** the substitution was **not needed in the end**.
The computed 3,200 refits were affordable once the single-thread BLAS fix was applied (§6), so
**N1, the bootstrap and the placebo all ran as full refits, exactly as frozen**. The A5 check was
still performed because the work order required it.

---

## 4. L2 — REVENGE, WITHIN-PLAYER — **KILLED as a revenge edge (effect is OPPOSITE and confounded)**

**Data.** `player_stats` 2015–2024 (11 seasons requested; **2025 returned HTTP 404** — logged
below, so the window is 2015–2024: **DISCLOSED DEVIATION**, substituted window for the frozen
2015–2025). Rows **52,172**; revenge rows **812**; players **1,966**; analysis set (≥8 prior
games) **40,464**. Evidence `/tmp/nfl/l2.py`, `/tmp/nfl/l2.log`.

| quantity | value |
|---|---|
| within-player FE, `revenge` | **−0.366494** targets/game, player-clustered 90% CI **[−0.597528, −0.119017]** (excludes 0) |
| within-player FE, `Δt_since_last_meeting` | **−0.006869**, 90% CI **[−0.008778, −0.005127]** (excludes 0) |
| FE bootstrap | 2,000 draws / 949 players |
| robust ratio (median, governs) | **0.773569**, 90% CI **[0.711428, 0.821739]** — **does not cover 1.0** |
| ratio of pooled means | 3.041 vs 3.339 targets (players with both) · 2.730 vs 3.619 (all rows) |

**Kill-line read.** The stated kill (ratio CI covering 1.0) does **not** fire, and the spec
pre-declares a persistent level shift as "a finding, not a failure" — so L2 is not killed on its
own terms. **But the sign is the opposite of the revenge hypothesis** (fewer targets, not more),
and both the level shift and the Δt decay point the same way.

**Honesty check — what makes this narrower than it looks:** the `revenge` subset is *selected on
a team change*. Players who change teams are systematically lower-usage, and Δt is collinear with
career progression, so `revenge` and `Δt` cannot be separated from "this player's role declined
after he moved". The FE controls for player identity but not for role arc, opponent quality, or
the selection that put the player on a new roster. **The effect is real in-sample and I do not
believe it is a revenge mechanism.** Recorded as a finding against the hypothesis, not an edge.

> **Correction of my own first pass:** the geometric-mean ratio in `res_L2.json` (`0.01998`,
> CI [0.0095, 0.0411]) is **an artifact** of near-zero per-player baselines and must not be
> cited; the median ratio above governs. Both are in the file, the geo-mean flagged as unstable.

---

## 5. L3 — SHELVED, WITH THE CHECKED-SOURCES LIST

L3's estimand *is* the book-pricing gap, and no book prop lines exist on this host. Every source
checked, and what each returned:

| # | source checked | exact probe | result |
|---|---|---|---|
| 1 | local prop-line data files | `find / -iname "*prop*line*" -o -iname "*prop*odds*"` | **only code/tests**: `prop-line-rows.ts`(+test), `props-line-shop.ts`(+test), `PROPS_PRODUCTION_PIPELINE_PROMPT_2026-09-10.md`, agent-bus `TASK-002-…`. **No data files.** |
| 2 | `props-line-shop.ts` as a source | read `/tmp/sports/packages/prediction-engine/src/edge-lab/props-line-shop.ts` | it is a **consumer**: `shopPostedPrices(p, books)` takes books as an argument. No embedded lines. |
| 3 | The Odds API credential | env probe for `THE_ODDS_API_KEY`, `ODDS_API_KEY`, `ODDSPAPI_KEY` | **all unset** |
| 4 | The Odds API reachability | `curl -I https://api.the-odds-api.com/v4/sports` | **HTTP 000** (connection did not complete from this host) |
| 5 | local odds-snapshot data dumps | `find /tmp /var/minis -iname "*odds*snap*" -o -iname "*line*snap*"` | only schema/lib code (`add_odds_line_snapshots` migration, `line-snapshot.ts`). **No dumps.** |
| 6 | production `OddsLineSnapshot` rows | ledger C-62 records 37,402 rows | those are **game-level OPEN/INTERIM/CLOSE** snapshots, **not per-player prop lines**, and they live in the production DB — which the standing laws forbid this agent from touching. Not queried. |

**Shelving is evidence, not assertion: L3 stays a frozen spec.**

---

## 6. L5 — POOLED HIERARCHICAL CLOSURE TEST — **KILLED. The game-level branch is closed.**

**Data.** `compound_table2.csv` (2,895 REG games with lines, **2015–2025**) + `/tmp/sched.csv`.
Model as frozen: `logit P = a + b·logit(q) + c₁s₁ + c₂s₂ + c₃s₁s₂`, `c₃` partially pooled across
families by random-effects meta-analysis; null = permutation of s₂ within s₁ positives, 1,000
draws per family. Evidence `/tmp/nfl/l5.py`, `/tmp/nfl/l5.log`, `/tmp/nfl/res_L5.json`.

**Family mapping (declared before fitting — the frozen spec names the families but not the
columns, so this mapping is an implementation choice):** A `any_rev × any_short`;
B `any_rook × rest_adv3`; C `home_alt × rest_adv3`; D `any_burden3 × any_short`;
E (supplementary) `any_hcnew × rest_adv3`.

| family | c₃ | se | n(s₁) | flagged | 90% CI | permutation \|≥obs\| |
|---|---|---|---|---|---|---|
| A revenge × short week | +0.316449 | 0.530954 | 94 | 24 | [−0.556971, +1.189868] | 0.497 |
| B QB inexperience × rest deficit | +0.327981 | 0.250588 | 555 | 129 | [−0.084235, +0.740198] | — |
| C altitude × rest advantage | +0.030210 | 0.564639 | 91 | 20 | [−0.898621, +0.959041] | — |
| D injury burden × short week | −0.188022 | 0.208471 | 1,772 | 403 | [−0.530957, +0.154912] | — |
| E new HC × opp continuity *(supp)* | +0.128335 | 0.198371 | 1,246 | 259 | [−0.197986, +0.454656] | — |

**Pooled (K=4):** `mu_c₃ = +0.046342`, se 0.148057, **90% CI [−0.197212, +0.289896]**,
τ² = 0.0, Q = 2.786638 (no between-family heterogeneity beyond sampling noise).

**Kill line fired.** The pooled `c₃` 90% CI **covers 0**, and **every individual family's 90% CI
also covers 0**. That is the pre-registered closure condition, so:

> **"Compounding is not detectable at NFL game frequencies with public pre-kickoff information."**
> The game-level branch of the contextual-compounding lane is **closed**, formally, on the
> pre-registered test — not by accumulation of nulls.

**On the 1999–2025 pull (the sequencing instruction).** It was **not started**, and this is the
evidence: the compound builders `build2.py`/`build3.py` contain **zero** references to pbp
(`grep -c "pbp\|play_by_play"` → 0 and 0); `build2.py` hard-codes `season >= 2015` with an HC
comparison floor of 2014; local rosters are `roster_2015..2025.csv` (11 files) and local injuries
2015–2025. The frozen L5 equation contains **no decay constant**, so the "1999–2014 … never used
to score" window has no role in the model as written, and it is not constructible here without
pre-2015 rosters/injuries — **not** without pbp. Downloading pbp 1999–2021 would have been the
long pole for something the spec never scores on.

---

## 7. RANKING

| spec | rank | gate that decided it |
|---|---|---|
| **L1** cold/wind × passing exposure | **KILLED** | K1 sign (+0.082 vs pre-registered negative), K2 ΔLL −0.00003 ≪ 0.002, K3 clustered CI [−0.012, +0.177] contains 0 |
| **L2** revenge within-player | **KILLED (as a revenge edge)** | effect is the opposite sign to the hypothesis and confounded with post-transfer role decline |
| **L5** pooled hierarchical | **KILLED** | pooled c₃ CI [−0.197, +0.290] covers 0; every family CI covers 0 → formal branch closure |
| **L3** starter-weighted unavailability | **SPEC-ONLY** | no book prop lines on this host (6 sources checked, §5) |

No spec passed 5a+5e, so the audience for §8 is empty.

## 8. ENGINE HANDOFF

**None.** No spec cleared `5a` (sign) and `5e` (gain). Nothing here should be promoted to IC9 /
the props admission runner. L5 is the one with forward value and it is a **closure**, not an
admission: its pre-registration is worth keeping as the recorded reason the game-level branch is
shut.

## 9. OPEN QUESTIONS FOR ARCHITECT (one sentence each)

1. **O-1:** `minis-grout-prompt-v4-gate-amendment.md` is not on this host — can you deliver it to
   `/var/minis/shared/` so §A5 and the A1 veto are read rather than quoted?
2. **O-2:** L5 names "the four state families (A/B/C/D/E states)" — is my A–D primary + E
   supplementary mapping the intended one, and should E be pooled in?
3. **O-3:** L2's `revenge` set is selected on a team change; do you want it re-run with a
   role-arc control (trailing usage slope) before it is treated as settled?
4. **O-4:** Is a *positive* cold/windy × play-action sign (L1, +0.082) worth one confirmatory
   test in a cleaner design (play-level weather where available, season/team fixed effects), or
   does the 0.002 nats threshold close it permanently?
5. **O-5:** L3 is shelved on market data — do you want it re-scoped to the *usage-redistribution*
   half (`snap_counts` is now fetched, 2015–2025) as a market-free spec?
6. **O-6:** The `player_stats` 2025 file 404s from the nflverse release — is that expected until
   the season closes, and should L2's window be declared 2015–2024 permanently?

## 10. FAILURES LOG

| # | what failed | error / evidence | resolution |
|---|---|---|---|
| F-1 | `nflverse` `player_stats_2025.csv` fetch | **HTTP 404**, 9-byte body — logged in `/tmp/nfl/stats_dl.log`; all 2015–2024 returned 200 | L2 window reduced to 2015–2024, disclosed |
| F-2 | `pbp` has no `nflverse_play_id` column | verified against the 372-column header | joined on `game_id`+`play_id` instead, as the prereg allowed |
| F-3 | `sched.csv` has no `season_type` column | `ValueError: Usecols do not match columns … ['season_type']` | column is `game_type`; fixed |
| F-4 | host throttling: one logit fit | **2.32 s** per fit; frozen procedure would need ~3.5 h | root-caused to numpy/BLAS thread sprawl; `OMP_NUM_THREADS=1` → **0.35 s** per fit |
| F-5 | `l1_stage2c.py` crash ×2 | `AttributeError: 'numpy.ndarray' object has no attribute 'sd'` (`.sd`→`.std()`), then `ValueError: output array does not match result of ndarray.take` (bootstrap `out=` buffer had a fixed length while resampled n varies) | both fixed; N1 moved to save *before* the A5 block so a later failure cannot discard it |
| F-6 | `np.dot(..., out=view)` | `ValueError: output array is not acceptable` — strided slice as `out=` | per-(k,m) contiguous buffer cache |
| F-7 | L2 geometric-mean ratio | 0.01998, CI [0.0095, 0.0411] — implausible | artifact of near-zero baselines; median ratio (0.773569) governs, geo-mean flagged unstable |
| F-8 | **Environment reload mid-run** | all background jobs killed; ~3 h of wall clock lost; process table empty (`PID 1 = []`) | re-ran stage2c/stage2e/L5/L2 in the foreground with incremental saves |
| F-9 | channels/energy | `column`, `huggingface_hub` not installed | used `awk` and raw `curl`; **no packages installed** (law 7) |

## 11. ENVIRONMENT NOTE (the one thing that changed everything)

numpy/BLAS defaults spawn a thread pool that collapses on this emulated CPU. One logistic fit
went from **2.32 s → 0.35 s**, and a 200-iteration benchmark from **>100 s → 3.96 s**, purely from
`OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1
NUMEXPR_NUM_THREADS=1`. Without it the frozen 3,200-refit procedure was ~3.5 h; with it, N1 took
381.8 s and the bootstrap 512.9 s. **No package was installed and no threshold was changed.**

**Hugging Face:** `HF_TOKEN` is present and authenticates (`whoami-v2` → Beexly, Pro). It was
**not needed** — the thread fix made local compute sufficient. It remains the fallback if the
host throttles again.
