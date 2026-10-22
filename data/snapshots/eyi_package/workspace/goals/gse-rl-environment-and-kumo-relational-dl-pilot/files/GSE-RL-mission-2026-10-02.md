# GSE-RL: Verifiable-Reward RL for the GSE Reasoning Engine

*Mission spec written 2026-10-02 by Motif. Status: SPEC — build not started.*

## Thesis

Xiaomi's MiMo-V2.6 release (2026-09-22, MIT-licensed) proves that RL with
verifiable rewards is the current frontier for reasoning models: 30 RL steps,
~750k trajectories, Pro model now tied #1 open-weights in the world. They
released the training framework (fork of `verl`), 7,000+ RL environments with
automatic verifiers, and the weights.

GSE does not need their environments. GSE needs their method, applied to the
one RL environment nobody else has: **1,139 held-out NFL games (2022–2025)
with known outcomes, wired signals, and honest calibration states.**

Every historical game is a labeled episode:
- **State:** pre-game reasoning context (wired signals, lines, injuries, weather)
- **Action:** reasoning trace + pick + probability
- **Reward:** computed from the actual game outcome — no human labeler, no vibes

## The reward function (the moat) — v2 (2026-10-02)

v1 (`correctness ±1 minus K·|prob−outcome|`, K=2) FAILED its Phase 2 sanity
gate: with a 54.9% home base rate, honest base-rate picking scored −0.87 while
abstaining scored 0.0 — RL would have learned to never pick. The gate caught
it before any GPU burned. v2 is a **Brier skill score**, a proper scoring rule:

```
reward = 1 − brier / BRIER_BASELINE
brier = (stated_prob − outcome)²
BRIER_BASELINE = P0·(1−P0), P0 = 0.5485 (frozen 2022–2024 home win rate)
```

- Perfect predictor → +1.0; base-rate predictor (no edge) → ~0.0, same as abstaining
- Worse than base rate → negative; confident-and-wrong (P=0.9, wrong) → −2.27
- Abstention → 0.0, never punished; +0.1 honesty bonus on genuinely thin evidence
- Expected reward is maximized by stating true beliefs — honesty is the gradient
- Verified: 8 unit tests pass; 2022 distribution sane (base-rate +0.003, abstain 0, perfect +1.0)
- The training harness enforces pick/prob coherence separately (incoherent = format violation)

## Architecture

```
Historical games (parquet, frozen vintage)
  → Episode builder (game state → prompt format matching verl's schema:
     prompt / reward_model / extra_info)
  → Base model (see below)
  → verl RL loop (XiaomiMiMo/verl fork or upstream verl-project/verl)
  → Reward = f(actual outcome, stated probability)
  → Updated reasoning model, evaluated walk-forward
```

The episode builder MUST respect the existing honesty machinery:
- As-of fencing on every data read (no future leakage into the "pre-game" state)
- Held-out gate on train/eval splits
- Manifest enforcer on all artifacts

## Base model options

1. **MiMo-V2.6-Distill-Qwen-9B** (recommended start): 9B params, MIT, fine-tuned
   from Qwen3.5-9B on MiMo data. Runnable on rented GPUs (single 8xH100 node
   or equivalent). Small enough to iterate, strong enough to reason.
2. **MiMo-V2.6-Flash** (309B total / 15B active): via API at $0.14/$0.28 per M
   tokens for inference-side experiments; full fine-tune needs serious cluster.
3. **Pro** (1.02T): not practical for us to train. Use via API if needed.

Note: Anthropic has accused Xiaomi of Claude-distillation in the training
pipeline (Sep 2026). MIT license stands regardless; flag for provenance
awareness, not a blocker.

## Build phases

**Phase 1 — Recipe recon (Motif, now):**
- Clone XiaomiMiMo/verl, diff against upstream verl-project/verl
- Document the dataset schema (prompt / reward_model / extra_info / agent_name)
  so the GSE episode builder emits verl-compatible records

**Phase 1 result (2026-10-02, verified):** verl fork cloned to
`~/workspace/mimo-verl`. Dataset schema confirmed via live read of the `code`
subset:
- Keys: `data_source`, `ability`, `agent_name`, `prompt`, `reward_model`, `extra_info`
- `reward_model`: `{'ground_truth': '', 'style': 'rule'}` — rule-based verifier,
  ground truth filled per task
- `extra_info`: `{'dataset_type', 'index', 'instance_id', 'instance_json'}` —
  `instance_json` carries docker image, cwd, and problem statement
- Example: `data_source='opensource-code'`, `ability='swe'`, `agent_name='mimo_swe_agent'`

GSE episode mapping (builder implements this):
- `data_source`: `'gse-nfl'`
- `ability`: `'pick'`
- `agent_name`: `'gse_reasoning_agent'`
- `prompt`: game state — pre-game reasoning context, as-of fenced (no future leakage)
- `reward_model`: `{'ground_truth': <actual game outcome>, 'style': 'rule'}` —
  the rule IS the reward function defined above
- `extra_info`: `{'game_id', 'season', 'week', 'as_of', 'vintage_sha'}` —
  frozen-vintage SHA from the manifest enforcer

**Phase 2 — GSE environment build (builder lane):**
- Episode builder: frozen-vintage game → verl-format record, as-of fenced
- Reward function: implemented, unit-tested on 2022 data (reward for known
  outcomes must equal hand-computed values — no silent drift)
- Sanity: run the reward function over all 2022–2024 games with a dummy
  policy; verify reward distribution is sane before any GPU burns

**Phase 3 — Training run (needs Garrett's GPU call):**
- Even the 9B model needs rented multi-GPU time (estimate: single 8xH100 node,
  days not weeks for a first run — tens of thousands, not millions)
- Start small: 1 RL step on 2022 data, evaluate on 2023, check the gradient
  points the right way before committing to a full run

## What this is NOT

- Not "download their dataset and train on SWE tasks." Their tasks are generic;
  our edge is NFL episodes.
- Not a replacement for the wire → weight → calibrate sequence. RL is the
  *weight/calibrate* step made automatic — it still needs wired signals first.
- **Do not train RL on schedule-only episodes** (coding-agent constraint,
  2026-10-02). The current episodes (form/rest/spread/weather) are a toy state.
  Episodes must carry the wired signals (QB, OL, injuries, coaching) before
  any training run. The episode builder is infrastructure; training waits.
- Not allowed to touch published picks until the RL-trained model clears the
  same gates as everything else: held-out validation, calibration rows, audit.
  A frontier model may read traces and write code; it may not mint a probability.

## Success criteria

1. Episode builder emits verl-compatible records for all 2022–2025 games,
   as-of fenced, with a passing test suite.
2. Reward function unit tests pass on hand-computed 2022 outcomes.
3. A 1-step pilot RL run on the 9B model shows reward improving on held-out
   2023 games vs the base model.
4. Full run only after 1–3 pass review.
