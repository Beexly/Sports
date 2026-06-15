# Prompt eval gate (promptfoo)

The guardrail that lets us safely **downgrade Claude models per surface** to capture the
savings that `apps/web/lib/claude-api/model-economics.ts` quantifies — without dropping
quality on anything readers see.

## Why
`model-router.ts` keeps every surface on Sonnet until a flip is *validated*. This gate is
the validation: it runs the active model and the cheaper candidate over representative
inputs and judges parity. Only flip the one line in `SURFACE_TIER` after the candidate
passes here.

## Run
```bash
npm run eval:prompts
```
Requires `ANTHROPIC_API_KEY` (and `GROQ_API_KEY` to also test the internal tier). Costs a
few cents per run.

## Workflow
1. `surfaceEconomics()` tells you the highest-savings flip (e.g. calibration-insight
   Sonnet→Haiku ≈ 67%, brief Sonnet→Haiku).
2. Put that surface's real system+user prompt into `promptfooconfig.yaml`.
3. `npm run eval:prompts` → confirm the candidate passes the rubric + cost/latency asserts.
4. If it passes, flip that surface's tier in `model-router.ts` (`SURFACE_TIER`). If not,
   leave it on the active model.
5. The cost ledger (`ClaudeApiCallRecord`) confirms the realized savings.

Never flip a user-facing surface (studio/journal/content) without a clear pass — quality
is the product.
