# Claim Evidence Ledger

Machine-readable ledger: `CLAIM_EVIDENCE_LEDGER.json`.

This ledger classifies the highest-risk claims from the OneNote/prompt/addendum lane and the current FABLE docs/code. It is not marketing copy. It is a downgrade machine: a claim either has evidence, is partially proven, is unsupported, is false, is blocked, needs legal review, or needs owner decision.

Current status counts:
- Proven: source registry mapping, AWS gate default-off behavior, calibration surfaces, drift primitives, active-learning ranking, GitHub navigation.
- Partially proven: metric derivation inventory is mapped to repo modules but still needs per-metric formulas and sample windows.
- Unsupported or false: historical `legal cleared`, `.5+ gain`, `superior edge`, `parity+`, AWS-live, AWS-labeling-live, broad readiness language, and complete competitive-edge claims.
- Blocked: MC Dropout implementation until an ML runtime is approved.

## OneNote And Historical Prompt Claims

| Historical claim | Source | Current repo evidence | Status | Why downgraded | What would prove it | Owner/legal/data/model decision needed |
| --- | --- | --- | --- | --- | --- | --- |
| `legal cleared` | OneNote / historical prompts | source-specific registry only | unsupported | source registry is not broad legal review | legal marker per source/use | legal |
| `superior edge` / `parity+` | OneNote / historical prompts | competitive docs only | unsupported | no incumbent benchmark | reproducible benchmark and lawful data | owner/model/legal |
| `.5+ gain` | OneNote / historical prompts | validation protocol only | unsupported | no replay report with CI | baseline/split/leakage check/replay | model |
| `Ground Truth Plus integrated` | OneNote / historical prompts | local manifest only | false | no AWS labeling job/provider | AWS config plus owner cost approval | owner/data |
| `green cycles` | OneNote / historical prompts | command log/typecheck decision | false until checks pass | full typecheck had blocker | all final commands pass | owner |
| `official NGS-like parity` | OneNote / historical prompts | approximation strategy only | unsupported | no official tracking-data license proof | contract and source-specific proof | legal/data |
| `full leverage complete` | OneNote / historical prompts | service scorecard and gates | unsupported | AWS is scored/gated, not live-complete | adopted services with evidence and approvals | owner/AWS |

Run:

```bash
npm run fable:evidence
```
