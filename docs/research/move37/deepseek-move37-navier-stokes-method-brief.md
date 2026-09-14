# PROJECT MOVE-37 — THEORIST BRIEF: NAVIER-STOKES METHOD TRANSLATION

**Paste-ready prompt for DeepSeek. Send as a parallel research track — it does not
block the REPAIR-03 lab execution.**

---

## Context (verified, September 2026)

OpenAI announced that an internal AI system resolved the Navier-Stokes
existence-and-smoothness Millennium Prize Problem: it found a finite-time
blowup — a scenario where an initially smooth fluid at rest develops a
singularity in finite time. Method, as reported: ~1,000 agents on the Euler
cousin problem first (~50 hours), then ~10,000 agents on full Navier-Stokes
(~11 hours), ~88 hours total, ~$15M in compute, producing a 165-page proof with
step-by-step formal verification. The model was described only as
"significantly more capable" than GPT-6 Astra. Competing claims exist:
Alpöge & Buckmaster released a zero-viscosity solution (Sept 7, built with
Claude/Codex/Astra); Anandkumar (Caltech) released a PINN-based zero-viscosity
solution. Credit is disputed.

Our lane (MOVE-37) was founded on this breakthrough as inspiration. This brief
is about the METHOD, not the result.

## Your task

Study the breakthrough as an engineering method and translate it into a
concrete, executable upgrade of our discovery loop. Answer all five:

**1. Reconstruct the method.** What did "10,000 agents in different
configurations" most likely mean architecturally? Parallel conjecture
generators? Adversarial prover/verifier pairs? Search over proof sketches with
formal verification as the filter? Give your best reconstruction with reasons,
and name what evidence would confirm or refute each hypothesis.

**2. Port the verification layer.** Their kill criterion was formal proof
checking — a verifier that cannot be gamed. Our equivalents are pre-registered
kill lines, dumb-baseline duels, and permutation nulls. Specify the strongest
verification layer we could build: what would a "formal verification" grade
kill criterion look like for a claimed sports discovery? Design it, don't
describe it.

**3. Find our Euler problem.** They solved the easier cousin first, then
scaled. What is the simplified discovery task we should solve before the full
one? Name it precisely: dataset, estimand, success criterion, and why solving
it first de-risks the full problem.

**4. Design the swarm loop.** Replace our 1-theorist + 1-lab architecture with a
swarm. Specify: how many theory agents, how their configurations differ, what
generates candidates, what filters them, what the verification layer from (2)
checks, the compute budget per round, and the kill criteria at each stage.
Include a diagram in words.

**5. Name the failure modes.** The three most likely ways porting this method
to sports discovery fails, each with a concrete test that would reveal it.

## Constraints (hard)

- Everything must be executable by our lab: 2 CPUs, 3GB RAM,
  numpy/pandas/scipy/scikit-learn, nflverse data. No $15M budgets.
- Calibrate ambition to our compute. A design we cannot run is a fantasy.
- Every claim about the Navier-Stokes work itself goes in a claim table with
  source and tier (CONFIRMED / INFERRED / SPECULATIVE / UNSOURCED), same as
  your REPAIR-03 §6. Unsourced claims about the breakthrough are marked, not
  hidden.
- Do not relitigate settled kills (W1–W4 stay dead). Build on the current
  8-family atlas (IRL, T3, T7, T9, W5–W8).
