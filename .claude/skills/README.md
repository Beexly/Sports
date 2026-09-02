# Agent skills (process capital)

Short, agent-loadable runbooks for high-leverage GSE surfaces. Each skill is a `SKILL.md`
(purpose · commands · failure modes · do-not-dos). Prefer skills over re-deriving doctrine.

`.claude/skills/` is the canonical home, loaded directly by Claude Code. Other agents read
`AGENTS.md` + `CLAUDE.md`, which point here.

| Skill | Path | Description |
|-------|------|--------------|
| autonomy-kernel | [`autonomy-kernel/SKILL.md`](./autonomy-kernel/SKILL.md) | Operate the autonomous plan→act→verify cycle without ever flipping a public gate or inventing data. |
| calibration-pipeline | [`calibration-pipeline/SKILL.md`](./calibration-pipeline/SKILL.md) | Settled picks → time hold-out → CIR → selected-slice ECE → fractional/portfolio Kelly. R&D only until CALIBRATION_ADJUSTMENTS_ENABLED. |
| checkout-attempt | [`checkout-attempt/SKILL.md`](./checkout-attempt/SKILL.md) | Durable CheckoutAttempt + Stripe Idempotency-Key; repair cron exists. |
| clearance | [`clearance/SKILL.md`](./clearance/SKILL.md) | source-router cleared flags must match source-rights-registry (fail-closed). |
| clearance-registry | [`clearance-registry/SKILL.md`](./clearance-registry/SKILL.md) | source-router cleared flags must match source-rights-registry (fail-closed). |
| coding-agent | [`coding-agent/SKILL.md`](./coding-agent/SKILL.md) | Minimal-diff coding on GSE money path. Use when editing webhooks, settlement, outbox, or clearance. Prefer reuse over rewrite. |
| deploy-readiness | [`deploy-readiness/SKILL.md`](./deploy-readiness/SKILL.md) | Pre-ship guards, smoke, and env readiness without inventing secrets. |
| dspy-gepa | [`dspy-gepa/SKILL.md`](./dspy-gepa/SKILL.md) | Offline GEPA/DSPy skill compile for GSE. Use when optimizing agent skills or prompt metrics without live product changes. |
| inference-routing | [`inference-routing/SKILL.md`](./inference-routing/SKILL.md) | MODEL_PRIMARY/MODEL_CHEAP routing and free-lane cost control. Use when changing Claude surfaces or model tiers. |
| max-leverage | [`max-leverage/SKILL.md`](./max-leverage/SKILL.md) | Founder max-leverage unlock for GSE money recovery and free capacity. Use when asked to unlock, free path, or maximize orbit. |
| model-promotion-gate | [`model-promotion-gate/SKILL.md`](./model-promotion-gate/SKILL.md) | Decide whether a challenger model may replace the champion — without re-labeling history or promoting noise. |
| polymarket-hold | [`polymarket-hold/SKILL.md`](./polymarket-hold/SKILL.md) | Polymarket is a compliance hold, not unfinished product work. Use when asked to finish/enable Polymarket markets. |
| settlement-free-path | [`settlement-free-path/SKILL.md`](./settlement-free-path/SKILL.md) | Free-path settle-picks when THE_ODDS_API_KEY is absent; paid path when present. |
| stripe-webhook | [`stripe-webhook/SKILL.md`](./stripe-webhook/SKILL.md) | Stripe webhook handler — retries, idempotency, checkout.session.expired, status codes. |

## Law
- Do not invent secrets. Operator steps live in `docs/ops/OPERATOR.md`.
- Do not rewrite outbox lease, webhook retries, or CheckoutAttempt flow.
- Do not re-enable Polymarket/gamma without counsel-approved registry entry.

See also: `docs/ops/ORBIT_UNLOCK.md`, `docs/ops/CREDITS.md`.

Format: [agentskills](https://github.com/agentskills/agentskills) YAML frontmatter (`name`, `description`) + markdown body.
Offline prompt optimize: `scripts/dspy-gse/` (GEPA-ready; dry-run without dspy).
