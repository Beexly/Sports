# Reconstruction Engine — proprietary trajectory-feature estimation

## What this is
A model that ESTIMATES trajectory-level geometric features (separation,
closing speed, pursuit angle, and eventually the full motor/ScLERP family)
from **legal, cleared, public aggregates** GSE already ingests: nflverse
Next Gen Stats aggregates, PFR advanced stats, and play-by-play context.

It is the one honest route to something no competitor has: the output of
**our** model. Nobody else has it because nobody else built it. It is
exclusive by construction, not by license.

## What this is NOT — the labeling law (non-negotiable)
- This is **RECONSTRUCTED**, never **MEASURED**. Every value this engine
  emits carries a provenance tag that says so. A value without provenance is
  a bug the type system refuses to compile.
- It is never presented to a user as real tracking. Per the founder honesty
  doctrine: no synthetic/estimated data presented as measured truth. Where a
  reconstructed feature ever surfaces, it is labeled "estimated from public
  aggregates" in plain language.
- It ships **shadow-gated** (RECONSTRUCTION_FEATURES_ENABLED, default off).
  Reconstructed features may be logged and evaluated but do not move a public
  confidence number until the edge-lab harness proves the feature earns it.

## Why it is powerful anyway
An estimate that is *systematically* good beats no signal at all. The edge
is not "we have the tracking" — it is "we reconstruct the parts that matter,
we know our own error bars, and we prove the lift on held-out data." Honest
uncertainty is a feature, not an apology.

## The compounding play
The engine is designed so a real 10Hz feed (SkillCorner is the affordable
door; see handoff/.../TRACKING-10HZ-PLAYBOOK.md) drops in as the
**calibration set**. Reconstruction error gets measured against ground truth
and the model tightens. The two paths compound; they never compete.

## Contract
- Inputs: only cleared aggregates (nflverse ngs/pfr_advstats/pbp). No raw
  NFL frames, no Big Data Bowl data, no broadcast scraping. Ever.
- Output: `ReconstructedFeature<T>` — value + interval + provenance. Pure
  functions, no I/O, fully unit-tested.
- Consumers read features, never raw estimates without their provenance.
- Reality Ladder: every feature is [PROPOSED] until edge-lab promotes it.
