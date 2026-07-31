# Orbit map — what actually moves the needle (wave 1–4)

| Layer | High leverage (in-repo or operator) | Hard non-goal |
|-------|-------------------------------------|---------------|
| **Money out** | Blank `THE_ODDS_API_KEY` for free path; AI Gateway/LiteLLM tags; Flash default | GPU self-host |
| **Money in** | Stripe `checkout.session.expired`; free embed `/embed/edge-index` first | Rebuild CheckoutAttempt |
| **Coding velocity** | `docs/agent-skills/*` SKILL.md; `npm run agent:eval`; GEPA offline on skills | Multica/agent OS vendors |
| **Agent ops** | OPERATOR.md / ORBIT_UNLOCK; flags only for LIVE_BOARD | New locking systems |
| **Agent evaluation** | agent-eval fixtures; promptfoo; CIR distinct-count diagnostic | Academic multi-agent tourism |
| **Inference cost** | model-router PRIMARY/CHEAP env; existing router | Custom gateway rewrite |
| **Own models / labels** | export:settled-picks → timeHoldoutSplit → CIR → selectedSliceEce → CLV → portfolio Kelly; `calibration:offline` | Foundation pretrain |
| **Distribution** | free embed, honest copy guards | Gamma re-enable without counsel |

## Already world-class (do not rewrite)

- Stripe webhook retries + idempotency (`stripeEventId`)
- Outbox lease + `claimVersion`
- CheckoutAttempt create-idempotency
- Free-path law: free only when key **ABSENT**

## Ship surface

- Skills: `docs/agent-skills/`
- Eval: `npm run agent:eval` (16 predicates, $0)
- Export: `npm run export:settled-picks`
- CIR: `centeredIsotonicCalibration` in `@sports/prediction-engine`
- Hold-out / paradox: `timeHoldoutSplit`, `selectedSliceEce`
- Offline pipeline: `npm run calibration:offline`
- Portfolio Kelly: `edge-lab/kelly.ts`
