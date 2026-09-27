# The Well × GSE Movement Module — Engine Alignment
**Date:** 2026-09-26 · **Status:** research alignment (methods-only; no code copied)
**Pairs with:** `~/workspace/research/2026-09-26-movement-module-spec.md` (the movement spec — read that first; this doc only describes what The Well *changes or adds* to it)

## 0. Verified facts about The Well

- Paper: Ohana et al., "The Well: a Large-Scale Collection of Diverse Physics Simulations for Machine Learning," NeurIPS 2024 Datasets & Benchmarks track, arXiv:2412.00568 (v2, Feb 2025).
- Repo: github.com/PolymathicAI/the_well — 4,465 stars, active (commit ad50de0, 1,205 commits). `pip install the-well`.
- 16 datasets, 15 TB total, individual sets 6.9 GB–5.1 TB. All are **grid-based field simulations** stored as HDF5 `(n_traj, n_steps, *spatial_dims)`, fp32, uniform grids, constant Δt. Splits: 0.8/0.1/0.1 over trajectories.
- The 16 (from paper Table 1): acoustic_scattering, active_matter, convective_envelope_rsg, euler_multi_quadrants, gray_scott_reaction_diffusion, helmholtz_staircase, MHD, planetswe, post_neutron_star_merger, rayleigh_benard, rayleigh_taylor_instability, shear_flow, supernova_explosion, turbulence_gravity_cooling, turbulent_radiative_layer_2D, turbulent_radiative_layer_3D (+ viscoelastic_instability, deprecated for a processing error → use v2).
- Benchmark protocol (paper §4): **forward problem — predict the next snapshot from a 4-step history**. Baselines: FNO, Tucker-factorized FNO, U-Net, modernized U-Net with ConvNeXt blocks (CNextU-Net); 12-hour single-H100 time-box; metric **VRMSE** (variance-scaled RMSE: predicting the field mean scores exactly 1.0 — preferred over NRMSE because centered normalization doesn't downweight nonzero-mean fields).
- **Key empirical result (paper Table 3):** autoregressive rollouts from one-step-trained models degrade badly — "notably worse performance overall even on relatively short rollouts, indicating the difficulty of performing autoregressive rollouts from one-step training alone." CNextU-Net wins 8/17 one-step experiments; rollout rankings shuffle. This is the cautionary core of the transfer story.

## 1. License audit (code and data separately)

| Artifact | License | Verdict | Source |
|---|---|---|---|
| Repo code (`the_well` package, benchmark scripts, models) | **BSD-3-Clause** | ✅ Commercial reuse OK with attribution (keep copyright notice) | GitHub repo page, "License: BSD 3-Clause" (verified 2026-09-26) |
| The 16 datasets (HF `polymathic-ai/*`) | **CC BY 4.0** | ✅ Commercial use **allowed** with attribution (credit the dataset + cite the paper). This is *more permissive* than the BDB-2026 data (CC BY-NC 4.0). | HF API `cardData.license: "cc-by-4.0"` on `polymathic-ai/active_matter` (verified 2026-09-26); matches the repo's `scripts/huggingface/DATASET_README_HEADER_TEMPLATE.md` (`license: cc-by-4.0`) |
| Benchmark checkpoints (`polymathic-ai/FNO-active_matter`, etc.) | Not verified; presumed research artifacts | ⚠️ Irrelevant anyway — PDE-surrogate weights have no use in the engine | — |

**Bottom line:** unlike the Big Data Bowl data, Well *data* is commercially usable (CC BY 4.0, attribution required). The binding constraint is not legal — it's the domain gap (§5). Do not let the green license light justify GPU spend without a hypothesis.

## 2. Dataset triage for engine purposes

**Only one dataset is even arguably relevant: `active_matter`.**
- What it is: continuum theory of rod-like active particles in a Stokes fluid — concentration (scalar), velocity (vector), orientation tensor, strain-rate tensor fields on a 256×256 grid, 81 timesteps, 360 trajectories, 51.3 GB. The paper's own framing: "systems composed of agents… that transform chemical energy into mechanical work… long-range hydrodynamic and steric interactions."
- Why it's the closest: collective multi-agent-ish dynamics, orientation/velocity coupling, phase transitions (isotropic→nematic) — the only dataset whose *phenomenology* rhymes with 22 interacting players.
- Why it's still far: it is a **continuum field theory on a grid, not discrete agents**. No identities, no intentions, no plays. You cannot pretrain a player model on it and expect transfer.
- Verdict: **do not download for pretraining.** *Optionally* download the train split only as a **protocol sandbox** — a cheap dynamics problem on which to validate rollout/pushforward training recipes (§3.2) before spending NGS-data GPU on them. 51 GB is affordable; the other 15 TB is not useful.

**The other 15: skip for engine work.** MHD, supernovae, Rayleigh-Bénard, acoustic scattering, etc. are continuum fluid/wave problems with zero structural overlap with discrete agent tracking. (They remain relevant to the *discovery* lane's Navier-Stokes interests, not the engine.)

## 3. Transferable techniques → concrete integration points

Each item names the technique, its provenance, exactly what changes in the movement spec, and cost. All are methods-only; reimplement from these descriptions.

### 3.1 Pushforward-style stability training → new Phase 1b (or Phase 4)

- **Provenance:** Brandstetter et al., "Message Passing Neural PDE Solvers," ICLR 2022. Unroll 2 steps; **gradients flow only through the last step** (stop-grad on the first); equivalently, an adversarial-style stability loss penalizing sensitivity to perturbed inputs `A(u+ε)`. Plus **temporal bundling**: predict K steps at once, backprop the last. Self-contained — applies to any autoregressive architecture. The Well paper's Table 3 is the motivation: one-step training → rollout collapse.
- **What changes in the spec:** The spec's independent per-horizon decoder heads are already a form of temporal bundling (good — this is why the spec sidesteps the worst pathology). Add an *optional* stability fine-tune: during training, with probability p=0.5, feed the model's own detached 10-frame displacement prediction back as pseudo-history for the 20-frame head; backprop only through the 20-frame head. This closes the train/test distribution gap for the longest horizon without making the whole model autoregressive.
- **Cost:** ~1 extra forward pass per training step when active. No architecture change. Acceptance: 20-frame validation RMSE does not regress; rollout-stability probe (§3.4) improves or holds.
- **Do NOT do:** full autoregressive rollout training through all horizons — the spec's bundled-head design is the better tradeoff; pushforward is a stabilizer, not a redesign.

### 3.2 Scheduled input-noise as the pushforward analog → amend §7

- **Provenance:** Brandstetter's adversarial-perturbation view of pushforward (perturbation scale σ ≈ 1% of input range); also the "stability loss" framing in follow-up work (PDE-Refiner, NeurIPS 2023).
- **What changes in the spec:** §7 already has position jitter σ=0.1 yd — keep it, and reframe it explicitly as the pushforward-noise analog (robustness to the model's own error distribution). Add a **noise schedule**: σ ramps 0.05 → 0.2 yd over the first 30 epochs (curriculum: clean dynamics first, robustness later). Log σ per epoch as a file-verifiable training parameter.
- **Cost:** zero extra compute. Acceptance: no validation-RMSE regression; jittered-input inference degrades gracefully (measure ΔRMSE at σ∈{0.1,0.2,0.3}).

### 3.3 VRMSE diagnostic → amend §8 training log

- **Provenance:** The Well benchmark metric (paper §4.1, App. E.3). VRMSE = RMSE / std(target), so 1.0 = "predicts the mean."
- **What changes in the spec:** add **VRMSE per horizon** to the training log alongside raw RMSE. Rationale (theirs, adopted): raw RMSE isn't comparable across horizons (2.0s displacements have larger natural scale than 0.5s) or across seasons (scheme drift changes target variance). VRMSE makes "are we actually learning dynamics vs. just predicting the mean displacement" legible at a glance. Gate suggestion: require VRMSE < 0.9 on every horizon before Phase 2 — i.e., the model must beat the mean predictor by a real margin everywhere, not just on average.
- **Cost:** one division. No training change.

### 3.4 Rollout-stability probe → new test + evaluation protocol

- **Provenance:** The Well Table 3 evaluation protocol (rollouts initiated from simulation start; time-windowed VRMSE at steps 6–12 and 13–30).
- **What changes in the spec:** add `test_rollout_stability` (synthetic fixture): chain the model's own outputs — predict 5f displacement, advance pseudo-history, predict next 5f, repeat to 20f — and assert the chained 20f error is within 2× the direct 20f-head error. This is a *diagnostic*, not a training target: if it fails badly, that's the empirical trigger to activate §3.1 pushforward training. Also adopt their windowing idea in evaluation reports: report error in early (5f) vs late (20f, landing) windows separately rather than a single RMSE number.
- **Cost:** inference-only. Acceptance: probe runs deterministically on the fixture; windowed errors logged.

### 3.5 Physics-constraint losses — validation of the spec's direction, one addition

- **Provenance:** The Well paper §4.2 "Moving Beyond the Baselines" lists **physical constraints** (conservation laws, boundary conditions) as the top future direction — the PDE-field analog of the spec's `L_dir`/`L_cap`. The field's consensus: constraints beat pure data fitting for stability.
- **What changes in the spec:** the existing `L_dir` + `L_cap` are the right family; add one cheap sibling — **acceleration-consistency loss**: the displacement's implied acceleration `a_impl = 2·(d̂ − v·Δt)/Δt²` must satisfy `|a_impl| ≤ a_max` (a_max = 8 yd/s², hinge, weight 0.1). It penalizes "teleport-then-stop" predictions that pass the velocity cap but violate acceleration physics. Same guardrail philosophy as `L_cap`: should be ~0 at convergence.
- **Cost:** a few lines. Acceptance: `L_cap ≈ 0` *and* accel-hinge ≈ 0 at convergence; no RMSE regression.

### 3.6 What the paper says about architectures — mostly "don't"

- FNO/spectral operators are **grid-only**; they do not apply to 22 discrete agents. The spec's set-transformer (permutation-invariant, relational) is the correct discrete analog of "respect the problem's symmetries" — the paper's own analysis (§4, boundary-condition discussion) shows architecture choice must follow problem structure, and one-model-fits-all fails. No change to §5.
- The paper's "no entity positional encoding" equivalent: their models bake in grid structure; ours must *not* bake in player order (spec §5 already requires this; test 8 enforces it). The Well corroborates the principle.

## 4. Download / experiment recommendations

| Action | Verdict |
|---|---|
| Download `active_matter` train split (~40 GB of the 51.3 GB) as a protocol sandbox | **Optional, cheap** — only if validating §3.1/§3.2 recipes before NGS-GPU spend |
| Download any other Well dataset for engine work | **No** |
| Pretrain the movement model on Well data/weights | **No** — no evidence of cross-domain transfer; domain gap too large (§5) |
| Reuse `the_well` package code (BSD-3-Clause) | **Yes where useful** — the `WellDataset` loader pattern and VRMSE metric implementation are clean references for our own loader/metrics (attribution kept) |
| Cite in engine docs | If any Well-derived method ships, cite Ohana et al. 2024 (NeurIPS) + CC BY 4.0 attribution for any data touched |

## 5. Honest limits — where the analogy breaks

1. **Fields vs. agents.** Every Well dataset is a continuum field on a uniform grid. GSE tracks 22 discrete agents with identities, roles, and a ball. Architectures (FNO, U-Net) and most intuitions do not cross this gap. Only *training protocols* transfer.
2. **Deterministic PDEs vs. decision-making humans.** Well dynamics are deterministic given initial conditions (chaotic, but deterministic). Football has irreducible strategic stochasticity — a WR's break depends on coverage reads, not just physics. That's *why* the spec outputs calibrated uncertainty (§8); Well baselines are deterministic point predictors and the paper never addresses uncertainty. Do not import their determinism.
3. **Noise-free sims vs. 10 Hz NGS.** Well snapshots are exact solver states. NGS tracking has measurement noise, dropouts, and 0.1s quantization. Techniques validated on clean sims (e.g., exact pushforward) need the noise-robustness framing of §3.2 to survive contact with real data.
4. **Problem shape differs.** Well: 4-step history → 1-step-ahead, dense field. GSE: 10-frame history → bundled multi-horizon (5f/10f/20f/landing), sparse agents. The spec's bundled heads already avoid the exact failure mode (rollout collapse) that motivates most of the neural-PDE stability literature. Import the diagnostics and stabilizers, not the problem framing.
5. **No transfer-learning evidence.** The paper gestures at "physics foundation models" as future work; Walrus (Polymathic's foundation model trained on the Well) exists but targets PDE fields. There is **no published evidence** that pretraining on physics sims helps discrete multi-agent sports tracking. Treat any such proposal as an experiment requiring a cheap probe first — never a roadmap item.
6. **Scale mismatch in validation.** Well baselines are 12-hour H100 runs on GB-scale fields. Our module targets <2M params training overnight on play-level data. Protocol ideas must be re-validated at our scale; don't assume their hyperparameter regimes (lr schedules, batch sizes) transfer.

## 6. Net recommendation for the engine

Adopt **§3.2 (scheduled jitter), §3.3 (VRMSE diagnostic + 0.9 gate), §3.4 (rollout-stability probe), §3.5 (accel-consistency loss)** — all cheap, all additive to the existing spec, none requiring architecture changes. Keep **§3.1 (pushforward fine-tune)** in reserve, triggered only if the §3.4 probe shows chained-horizon instability. Download nothing unless running the protocol sandbox. The Well's real gift to GSE is not data or weights — it's the field's hard-won lesson that **one-step training lies about multi-step stability**, plus a metric (VRMSE) that keeps everyone honest about whether the model is actually learning dynamics.
