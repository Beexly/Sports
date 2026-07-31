# Agent skills (process capital)

Short, agent-loadable runbooks for high-leverage GSE surfaces. Each skill is a `SKILL.md`
(purpose · commands · failure modes · do-not-dos). Prefer skills over re-deriving doctrine.

| Skill | When to load |
|-------|----------------|
| [settlement-free-path](./settlement-free-path/SKILL.md) | Free settle / THE_ODDS_API_KEY / cron settle-picks |
| [stripe-webhook](./stripe-webhook/SKILL.md) | Webhook status codes, idempotency, Dashboard events |
| [clearance](./clearance/SKILL.md) / [clearance-registry](./clearance-registry/SKILL.md) | source-router cleared flags vs registry |
| [deploy-readiness](./deploy-readiness/SKILL.md) | Pre-ship guards and smoke |
| [checkout-attempt](./checkout-attempt/SKILL.md) | CheckoutAttempt + Stripe Idempotency-Key |

## Law
- Do not invent secrets. Operator steps live in `docs/ops/OPERATOR.md`.
- Do not rewrite outbox lease, webhook retries, or CheckoutAttempt flow.
- Do not re-enable Polymarket/gamma without counsel-approved registry entry.

See also: `docs/ops/ORBIT_UNLOCK.md`, `docs/ops/CREDITS.md`.
