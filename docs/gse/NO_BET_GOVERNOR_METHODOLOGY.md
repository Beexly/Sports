# GSE No-Bet Governor Methodology

Updated: 2026-07-05

Status: public-safe methodology examples, shadow-only. This document explains how GSE can say no without exposing protected formula details, raw provider payloads, private model internals, or outcome-certainty claims.

Code source: `apps/web/lib/gse/no-bet-methodology.ts`

Tests: `apps/web/__tests__/no-bet-methodology.test.ts`

## Doctrine

No bet is a governed decision, not an empty state.

The no-bet governor can suppress action when evidence, freshness, source rights, calibration posture, model agreement, or responsible-gaming boundaries are not ready. A strong-looking model read cannot override a hard safety or evidence gate.

Public explanations may show:

- reason code
- plain-language trigger
- current public decision state
- evidence needed to reopen review
- source and review boundary

Public explanations must not show:

- protected formula details
- raw provider payloads
- restricted tracking rows
- private model internals
- sponsor influence
- individualized staking instructions
- performance promises
- public probability language that has not earned review approval

## Public Reason Codes

| Reason code | Public state | Trigger | Public-safe explanation |
| --- | --- | --- | --- |
| `missing_required_data` | `HARD_PASS` | A required evidence field is absent or unusable at review time. | GSE is passing because a required evidence field is missing. The model is allowed to wait until the record is complete. |
| `stale_market_context` | `HARD_PASS` | The market context is older than the freshness window for the decision. | GSE is passing because the market context is stale. Movement without freshness is not enough to support action. |
| `source_rights_blocked` | `HARD_PASS` | A source is unknown, blocked, or not approved for the intended use. | GSE is passing because one source is not approved for this use. Rights discipline overrides model interest. |
| `calibration_drift` | `HARD_PASS` | Recent calibration evidence shows the probability contract is drifting. | GSE is passing because calibration drift is active. A model that is drifting does not get to speak louder. |
| `calibration_debt` | `PASS` | The model has not earned the public probability contract for this context. | GSE is passing because the probability claim bar is not met. Confidence and probability stay separate. |
| `model_disagreement` | `WATCH` | Independent model votes diverge enough to require a counter-case review. | GSE is watching because the model parliament disagrees. The disagreement has to be explained before action. |
| `responsible_gaming` | `HARD_PASS` | The context requires responsible-gaming restraint or personalization is requested. | GSE is passing because responsible-gaming discipline overrides the signal. The system does not personalize wagering advice. |

## Reopen Gates

A no-bet state can only reopen when the specific blocker is repaired. Examples:

- Missing required data: required source fields are present, fresh, and approved for modeling use.
- Stale market context: a fresh market snapshot, book dispersion review, and time-to-start context are available.
- Source rights blocked: a source-rights policy and payload-rights review allow the intended surface.
- Calibration drift: a fresh drift check returns inside policy bounds and the model card is reviewed.
- Calibration debt: sufficient settled evidence exists and the validation note is updated.
- Model disagreement: the parliament disagreement review and counter-case note are complete.
- Responsible-gaming override: responsible-gaming review, jurisdiction handling, and age policy are clear, with no personalized staking instruction.

## Copy Rules

Allowed:

- "No bet is the current decision because the evidence chain is not ready."
- "The market read is stale, so movement is not treated as a clean signal."
- "The source policy blocks this use, so the metric cannot drive a public decision."
- "Calibration drift forces restraint until the model earns public probability language again."
- "Model disagreement moves the state to watch or pass until the conflict is explained."
- "Responsible-gaming context can override every other signal."

Not allowed:

- turning a no-bet state into a hidden directional call
- implying private information
- implying that line movement alone proves anything
- converting confidence into public probability
- using sponsor language to change the governor
- suggesting individualized staking behavior

## Implementation Notes

- `computeGseActionScore()` owns the shadow decision seam.
- `computeNoBetStrength()` produces the no-bet pressure and hard-pass reasons.
- `calibrationActionCap()` and `calibrationRequiresHardPass()` prevent public action when probability claims are unearned or drifting.
- `PUBLIC_NO_BET_METHODOLOGY_EXAMPLES` is the public-safe copy source for examples.
- Tests scan all public strings through media claim safety, no-claim guard, and performance-claim guard.

## Boundary

This is local methodology and copy governance only. It does not publish a pick, open an API route, send content, place a wager, activate a partner offer, approve a model version, claim legal clearance, or promote any metric to public production status.
