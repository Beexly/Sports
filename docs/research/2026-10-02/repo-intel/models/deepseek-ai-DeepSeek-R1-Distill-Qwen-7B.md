# deepseek-ai/DeepSeek-R1-Distill-Qwen-7B

**Verified ID:** `deepseek-ai/DeepSeek-R1-Distill-Qwen-7B`. License: MIT (verified from Hub metadata). Not gated. Downloads: 266,017. Likes: 902.

## 1. Vision
Take the reasoning ability of DeepSeek-R1 (a 671B MoE reasoning model) and distill it into a 7B Qwen2.5 student by fine-tuning on R1's long chain-of-thought traces. The thesis: **reasoning is transferable as data** — you don't need RL at the small scale if you can imitate a large model's verified reasoning processes. This model is the public artifact of that claim.

## 2. The Ask
Same footprint as Qwen2.5-7B (bf16, ~14 GB). The interesting config delta (observed by diffing the two configs directly): `rope_theta` reverted from 1,000,000 to **10,000** and `sliding_window` from 131072 to **4096**. DeepSeek's team *removed* the long-context machinery for the distill — reasoning traces are long, but they chose standard positional encoding, implying the distillation recipe didn't need (or couldn't use) Qwen's extended-context RoPE.

## 3. Constraints
- MIT license — the most permissive in this dossier; distill freely, commercialize freely.
- It's a fine-tune of Qwen2.5-7B, so it inherits all Qwen constraints (dense 7B, no tool-use training, English/Chinese-centric reasoning traces).
- Distillation quality is bounded by the teacher's traces: any systematic R1 error (and DeepSeek's own docs note R1's language-mixing and verbosity issues) distills into the student. The student cannot exceed the teacher's reasoning distribution.

## 4. GSE lens
This is the most directly actionable model in Group A for a prediction-engine shop, because **distillation is exactly how we should think about model succession**:
- **Reasoning-as-data:** DeepSeek's recipe was: generate 800K reasoning traces from the big model, SFT the small model on them (public per the R1 paper/report). Our analogue: our best, slowest, most expensive pipeline (full ensemble + all signals + heavy calibration) is the *teacher*; the production model is the *student* trained to imitate the teacher's outputs on historical games. This is how we get a cheap, fast, deployable model that inherits the expensive pipeline's judgment — a concrete answer to "what should our serving stack be" that doesn't require serving the full ensemble.
- **The config diff is the lesson:** DeepSeek changed only `rope_theta` and `sliding_window` vs the base — they *adapted the student's architecture knobs to the distillation task* rather than blindly inheriting them. When we distill, we should similarly re-tune the student's capacity knobs (tree depth, feature count, lookback) for the student regime, not copy the teacher's.
- **Process supervision > outcome supervision:** the R1 recipe's key claim is that training on *how* the teacher reasoned (the trace) beats training on *what* it concluded (the label). For us: when we have rich intermediate signals (quarter-by-quarter win prob, drive-level EPA deltas), training students on the intermediate trajectory — not just final score/spread — should transfer more. This is a testable hypothesis for our walk-forward harness.
- **Calibration caution:** a distilled student inherits the teacher's calibration *and* its miscalibration, with no new ground-truth anchoring. Under our calibration-on-wire rule, a distilled model gets its own calibration row (train years | eval years | metric | n | live-check) — it does not inherit the teacher's calibration. Contaminated or miscalibrated students are discarded, never averaged.

## 5. Verdict
**ADOPT the recipe** (teacher-student distillation of our expensive pipeline into a deployable model; process supervision on intermediate trajectories). License: MIT — cleanest legal posture in the dossier.

## 6. The 4 tricks
- Model page: https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B
- config.json (read directly for this dossier): https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-7B/raw/main/config.json
- Key diff vs Qwen2.5-7B base (observed by direct config diff): `rope_theta: 10000` (was 1000000.0), `sliding_window: 4096` (was 131072); everything else identical (`hidden_size: 3584`, 28 layers, 28/4 GQA, `vocab_size: 152064`).
