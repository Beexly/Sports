# Process-covariate false-signal scan — Reasoning Agent 8

**Status: ANALYSIS COMPLETE (NOT a prop-line edge claim — no archived Odds prices exist to close the loop to money).**
**Data:** nflverse `ngs_receiving.csv.gz`, `ngs_passing.csv.gz`, `play_by_play_2023.csv`, `play_by_play_2024.csv` (CC‑BY‑4.0).
**Cache:** `C:/Users/Garrett/.cache/ngs/` — `false-signal-v2.json`, `false-signal-v2.md`, `analyze2.py`, `analyze3_sacks.py`.

---

## 1. What "false signal / inverted edge" means here

The covariate bus (`covariate-bus.ts`) is contractually **week t → game t+1**: the latest prior NGS weekly mean is carried forward as a feature for the *next* game, strictly leak-safe (week=0 excluded, week≥kickoffWeek excluded, fail-closed on null). The four binds (catch‑cushion, rec‑td‑cushion, sack‑TTT, comp‑air‑yards‑diff) attach `CovariateCell` to each sample but **no model layer in H0 consumes the covariate yet** (`priced:false` everywhere) — so there is no live edge to lose. The question this scan answers is: *if/when a coefficient is wired on these covariates, where will the lag‑1 covariate fail to predict the next outcome, and where will its sign flip relative to the direction the bind assumes?*

Two complementary diagnostics, both leak‑safe (week‑t quantities only):

1. **Lag‑1** — covariate at week t vs. **next‑game** outcome at week t+1 (the prediction setup).
2. **Same‑week baseline** — covariate vs. outcome in the *same* week, to prove the metric is a real process signal *contemporaneously*. The gap between same‑week and lag‑1 is the false‑signal magnitude.

A region is flagged **~NO‑SIGNAL** when local |r|<0.05; **INVERTED** when the local regression slope flips sign vs. the canonical direction the bind assigns. Canonical directions (what the model would assume):

| covariate → outcome | column sign convention | canonical slope |
|---|---|---|
| cushion → catch% | `avg_cushion` (yards, ↑=more space) | **+** |
| air‑yards‑diff → comp% | `avg_air_yards_differential` = completed−intended (deeper throws = **more negative**) | **+** |
| TTT → comp% | `avg_time_to_throw` (seconds, ↑=slower) | **−** |
| TTT → INT rate | (bind doc: "shorter TTT → higher INT risk") | **−** |
| TTT → sack rate (proxy) | from pbp; longer TTT → more sacks | **+** |

> **Sign‑convention correction logged:** nflverse's `avg_air_yards_differential` is `(completed − intended)`, so it is almost always ≤0 (deeper throws → more negative). "Deeper → lower completion%" therefore reads as a **positive** slope on this column, NOT negative. All results below use the column as shipped.

Statistical note: with n≈850–7200, the lag‑1 correlations are *statistically* significant but |r|≤0.12 → r²≤0.014 → **no practical/betting-scale predictive power**. The inversions are genuine *directional* flips, not large effects.

---

## 2. Results

### R1. cushion → catch%  (n=7210 lag‑1 pairs, 2016–2024)
- **Global lag‑1:** r=0.023, slope=+0.29 (canonical +, but magnitude is noise).
- **Same‑week baseline:** r=0.095, slope=+1.20 → cushion *is* a real (weak) process signal **same week**.
- **Verdict:** at the bus's prediction grain the cushion covariate is a **false signal globally** — the 1‑week transport burns essentially all signal.
- **False‑signal / inverted regions:**
  - Cushion **extremes** (≤4.65 yd, ≥7.20 yd): ~NO‑SIGNAL (floor/ceiling flattening).
  - Cushion **mid‑band 4.65–6.33 yd** ⚠️ **INVERTED** — slope flips to −1.0/-1.1: more cushion associates with *lower* catch%. This is the single cleanest edge inversion.
  - **All volume tiers** (low/mid/high prior‑week targets): ~NO‑SIGNAL — cushion does not predict catch% regardless of target volume.

### R2. air‑yards‑diff → comp%  (n=4130)
- **Global lag‑1:** r=0.033, slope=+0.20 (canonical +, sign correct but r≈0).
- **Same‑week baseline:** r=0.406, slope=+2.49 → strongly predictive **contemporaneously** (deeper throws → lower comp%, as expected).
- **Verdict:** the 1‑week transport cuts the signal from r=0.41 → r=0.03 = **near‑total false‑signal decay**.
- **False‑signal / inverted regions:**
  - Deep‑throw band **[−3.36, −2.40) intended‑air‑yards gap** ⚠️ INVERTED (slope −1.09).
  - **High‑volume QBs** (top prior‑attempt tercile): INVERTED (slope −0.067); **mid‑volume:** ~NO‑SIGNAL.
  - The only sub‑region retaining weak signal: shallow‑throw band [−1.66, −0.92) (r=0.063, slope +2.72) and low‑volume QBs (r=0.090, slope +0.50).

### R3. TTT → comp%  (n=4130)
- **Global lag‑1:** r=−0.062, slope=−2.13 (canonical −, correct sign, weakest "real" signal of the set).
- **Same‑week baseline:** r=−0.227, slope=−7.80 → real contemporaneous pressure effect.
- **Verdict:** the strongest retained lag‑1 signal **but still practically null** (r²≈0.004); a false signal at scale.
- **False‑signal / inverted regions:**
  - TTT **extremes** (≤2.54s quick game and ≥2.98s slow): ~NO‑SIGNAL (tails flatten).
  - TTT **mid‑band 2.82–2.98s** ⚠️ INVERTED (slope +1.9, slower → higher comp%).
  - **High‑volume QBs:** ~NO‑SIGNAL (r=−0.031) — TTT stops predicting comp% for high‑attempt passers.

### R4. TTT → sack rate  (n=858; pbp 2023–2024 only; per‑QB‑game sacks/dropbacks)
- **Global lag‑1:** r=+0.118, slope=+0.021 (canonical +, correct sign, r²≈0.014).
- **Same‑week baseline:** r=+0.038 (weak even contemporaneously — sacks are noisy / pressure‑driven).
- **Verdict:** TTT is a **weak, unstable** predictor of sacks; the only relationship with a remotely usable signal, and even that is marginal.
- **False‑signal / inverted regions (the key TTT finding):**
  - TTT **< 2.74s** (quick/medium releases): weakly positive slope (+0.05 to +0.10) — canonical holds.
  - TTT **≥ 2.74s** (slow releases) ⚠️ **INVERTED** — slope turns **negative** (−0.004 to −0.031): *longer* time‑to‑throw associates with *fewer* sacks. Counter‑intuitive and exactly the kind of region where a model wired to assume "+TTT = +sacks" would be systematically wrong. Plausible driver: high‑TTT games cluster on designed deep shots / max‑pro from cleaner pockets, or mobile QBs who release slowly but escape pressure.

---

## 3. Consolidated false‑signal map

| covariate → outcome | global r (lag‑1) | same‑wk r | INVERTED region(s) | ~NO‑SIGNAL region(s) |
|---|---|---|---|---|
| cushion → catch% | 0.023 | 0.095 | mid cushion 4.65–6.33 yd; (all 3 volume tiers, no signal) | cushion extremes ≤4.65 & ≥7.20; all volume tiers |
| air‑yards‑diff → comp% | 0.033 | 0.406 | deep band [−3.36,−2.40); high‑vol QBs | mid volume; 4 of 5 x‑quintiles |
| TTT → comp% | −0.062 | −0.227 | TTT 2.82–2.98s; (high‑vol: no signal) | TTT tails <2.54 & >2.98; high‑vol QBs |
| TTT → sack rate | 0.118 | 0.038 | TTT ≥ 2.74s (slow releases) | TTT ≥ 2.74s overall (signal collapses & flips); same‑week near‑null |

---

## 4. Why this happens (mechanism)

The covariates are real process signals **same week** (cushion r=0.095–air‑yards r=0.406–TTT r=0.227) but the bus uses them **one game later**. Weekly NGS aggregates are high‑variance (1 game of ~8–15 targets/passes), so the week‑t mean carries little identity‑stable information about week‑(t+1). Gameplan/opponent/scheme shifts between weeks dominate the player‑level persistence, so the carried‑forward covariate regresses to ~its own mean → r→0. The inversions at the distributional tails (extreme cushion/air‑yards/TTT) are the familiar floor/ceiling + selection artifacts where the metric is decoupled from the outcome mechanism.

---

## 5. Actionable warnings for H0.8

1. **Do not wire a raw lag‑1 coefficient on any of these three covariates yet.** Globally they carry ~zero exploitable signal at the bus grain, and they flip sign in specific regions — a naive linear edge would be a coin‑flip at best and directionally wrong in the bands above.
2. **If a coefficient must be introduced, gate on context:** exclude the inverted/silent regions (mid cushion, deep‑throw + high‑vol, slow‑TTT ≥2.74s) — i.e. the model should `priced:false` (drop) samples falling in the inverted bands, mirroring the binds' existing fail‑closed contract.
3. **Reduce variance before transport:** the loss from same‑week → lag‑1 (0.41→0.03 for air‑yards‑diff) argues for a shrinkage target (e.g. exponential‑moving 3‑week mean, or regress toward position/league mean) before carrying forward, plus a per‑player reliability gate (min targets/attempts). This is the "CLF v0 shrinkage" lane on the EDGE‑HUNT roadmap — it is now empirically justified by the numbers above.
4. **TTT→INT is doubly unsafe:** lag‑1 is null (r=−0.005) and the *same‑week* signal (r=+0.054) even **contradicts** the bind doc's "shorter TTT → higher INT risk" (data weakly favors the standard "longer TTT → more INT"). Treat the bound TTT as a pressure proxy for **sacks/comp%** (R3/R4), not INTs.
5. **SACKS caveat:** R4 uses pbp 2023–2024 only (2 seasons); extend over more years for a stable estimate before trusting the ≥2.74s inversion.

**Attribution:** Data via nflverse (`nflverse-data` release assets `ngs_*`, `play_by_play_*`), CC‑BY‑4.0. Analysis script + JSON: `C:/Users/Garrett/.cache/ngs/`.
