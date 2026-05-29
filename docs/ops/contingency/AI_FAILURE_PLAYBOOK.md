# AI Failure Playbook

Galaxy uses AI in two places: content generation (blog) and the
Decision Coach (deferred to C55+). This playbook covers failures in
both.

## State at RC

- Content generation: enabled in worker tier, no user-facing live path.
- Decision Coach live AI: **disabled** (`COACH_LIVE_AI_ENABLED=false`). All coach responses are canned text from `lib/coach/canned-responses.ts`.

## Failure modes

### Provider failure

| Mode | Detection | Response |
|---|---|---|
| Anthropic 5xx | Worker retry exhausted | Pause cron, alert, no user impact |
| Anthropic 429 | Rate limit | Exponential backoff, no user impact |
| Anthropic auth | 401 | Rotate per `SECRETS_ROTATION_PLAYBOOK.md` |
| Provider deprecation | Model removed | Pinned model identifier in env; rotate to supported model |

### Output failure

| Mode | Detection | Response |
|---|---|---|
| Content safety filter rejects prompt | API returns `content_filter` | Log + skip, never retry the rejected prompt verbatim |
| Output hallucinates facts | Manual review / autopsy detects | Quarantine output, do not publish, route to editorial review |
| Output leaks methodology | `scanForbiddenPhrases()` trips | Drop output, alert, audit prompt for leakage path |
| Output uses certainty language | Trust gate scan trips | Drop output, retry with stricter system prompt |

### Coach failure (when C55+ enables live AI)

| Mode | Response |
|---|---|
| Prompt injection attempt | `checkBoundaries()` blocks → return canned response |
| Stake advice requested | Boundary check refuses → return responsible-play link |
| Loss-triggered manipulation pattern | Restraint layer flags → suppress, log |
| Sensitive PII in prompt | Reject before transmission, do not send to provider |
| Provider outage | Fall back to canned response for the matching prompt id |

## Coach boundary invariants (cannot be weakened by any failure)

These are enforced by `lib/ai-governance/assistant-boundaries.ts` and tested by `tests/runtime-convergence/coach-boundaries.test.ts`. They never weaken:

1. No specific stake recommendation
2. No certainty claims about pick outcomes
3. No methodology disclosure
4. No system-prompt disclosure
5. No regulatory advice (geofence bypass, tax, etc.)
6. No personal financial / portfolio advice

When live AI is enabled, every output must pass these checks before display. A failure to pass = fall back to canned response, log the event.

## Detection signals

- Trust-gate phrase scan catches forbidden language in stored output.
- Telemetry event `restraint.brain_q_refused` fires when boundary blocks an output.
- Manual editorial review covers a sample of every batch.

## Kill switch sequence

When AI output is misbehaving:

1. `COACH_LIVE_AI_ENABLED=false` (drops live coach to canned).
2. Pause content cron (drops blog generation).
3. Quarantine any unreviewed output already in DB by setting `isPublished=false`.
4. Audit recent prompts for the injection vector.
5. Update system prompt or boundary rules.
6. Re-enable only after the prevention test is in place.

## Re-enable criteria

Before flipping `COACH_LIVE_AI_ENABLED=true`:
- All 6 boundary invariants pass adversarial tests.
- Methodology leakage scanner passes against 100 random outputs.
- Provider outage fallback proven to return canned responses.
- Sample-size editorial review of 50 outputs flagged no trust drift.

## What never happens during AI failures

- Galaxy never displays AI output that failed boundary checks.
- Galaxy never says "we don't know" by silently returning a generic response — failures route to canned or to "AI temporarily unavailable, see methodology."
- Galaxy never logs prompt text or PII to the AI provider beyond what the boundary layer allows.
- Galaxy never disables boundary checks to "see what AI would say."
- Galaxy never ships an AI feature without a fallback path.
