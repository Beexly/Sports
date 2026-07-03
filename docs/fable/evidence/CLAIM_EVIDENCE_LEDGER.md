# Claim Evidence Ledger

Machine-readable ledger: `CLAIM_EVIDENCE_LEDGER.json`.

This ledger classifies the highest-risk claims from the OneNote/prompt/addendum lane and the current FABLE docs/code. It is not marketing copy. It is a downgrade machine: a claim either has evidence, is partially proven, is unsupported, is false, is blocked, needs legal review, or needs owner decision.

Current status counts:
- Proven: source registry mapping, AWS gate default-off behavior, calibration surfaces, drift primitives, active-learning ranking, GitHub navigation.
- Partially proven: metric derivation inventory is mapped to repo modules but still needs per-metric formulas and sample windows.
- Unsupported or false: historical `legal cleared`, `.5+ gain`, `superior edge`, `parity+`, AWS-live, AWS-labeling-live, broad readiness language, and complete competitive-edge claims.
- Blocked: MC Dropout implementation until an ML runtime is approved.

Run:

```bash
npm run fable:evidence
```
