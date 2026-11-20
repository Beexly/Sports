# Agent skills (process capital)

Short, agent-loadable runbooks for high-leverage GSE surfaces. Each skill is a `SKILL.md` with clear triggers, verified repo paths, commands, failure modes, and completion criteria. `.claude/skills/` and `.agents/skills/` stay synchronized via `node scripts/guardrails/verify-skills-integrity.mjs`.

| Skill | Path | Scope |
|---|---|---|
| autonomy-kernel | [`autonomy-kernel/SKILL.md`](./autonomy-kernel/SKILL.md) | Pure `planAutonomyCycle()` + safe-cron executor (`27` action kinds) |
| calibration-pipeline | [`calibration-pipeline/SKILL.md`](./calibration-pipeline/SKILL.md) | Settled picks -> time hold-out -> CIR -> selected-slice ECE -> fractional Kelly |
| checkout-attempt | [`checkout-attempt/SKILL.md`](./checkout-attempt/SKILL.md) | Durable `CheckoutAttempt` + Stripe `Idempotency-Key` + repair cron |
| claude-delegate | [`claude-delegate/SKILL.md`](./claude-delegate/SKILL.md) | Manual-only Claude Code CLI task delegation (`disable-model-invocation: true`) |
| clearance | [`clearance/SKILL.md`](./clearance/SKILL.md) | Thin alias pointing to canonical `clearance-registry` |
| clearance-registry | [`clearance-registry/SKILL.md`](./clearance-registry/SKILL.md) | Fail-closed `source-router.ts` rights registry |
| coding-agent | [`coding-agent/SKILL.md`](./coding-agent/SKILL.md) | Minimal-diff money-path routing (free-first settlement, idempotency, compliance hold) |
| deploy-readiness | [`deploy-readiness/SKILL.md`](./deploy-readiness/SKILL.md) | Guardrails, contracts, pricing smoke, and production readiness |
| dspy-gepa | [`dspy-gepa/SKILL.md`](./dspy-gepa/SKILL.md) | Offline GEPA/DSPy skill verification (`scripts/dspy-gse/`) |
| grok-delegate | [`grok-delegate/SKILL.md`](./grok-delegate/SKILL.md) | Manual-only Grok Build CLI task delegation (`disable-model-invocation: true`) |
| gse-connected-game-workflow | [`gse-connected-game-workflow/SKILL.md`](./gse-connected-game-workflow/SKILL.md) | Cryptographic 6-stage connected NFL workflow (`Stage 0 -> Stage 5`) |
| inference-routing | [`inference-routing/SKILL.md`](./inference-routing/SKILL.md) | `MODEL_PRIMARY` / `MODEL_CHEAP` / `MODEL_OPUS` routing & free-lane controls |
| max-leverage | [`max-leverage/SKILL.md`](./max-leverage/SKILL.md) | Owner max-leverage unlock checklist (free-first settle, Stripe, credits) |
| model-promotion-gate | [`model-promotion-gate/SKILL.md`](./model-promotion-gate/SKILL.md) | 3-leg paired Brier EB-LCB + CLV non-inferiority gate |
| neon | [`neon/SKILL.md`](./neon/SKILL.md) | Neon workflow pointer with GSE Prisma/secrets overrides |
| neon-postgres | [`neon-postgres/SKILL.md`](./neon-postgres/SKILL.md) | Pooled vs direct Postgres guidance with Prisma 5.22 override |
| polymarket-hold | [`polymarket-hold/SKILL.md`](./polymarket-hold/SKILL.md) | Compliance hold on Polymarket / prediction-market crons |
| settlement-free-path | [`settlement-free-path/SKILL.md`](./settlement-free-path/SKILL.md) | Authoritative free-first `settle-picks` + paid supplement law |
| stripe-webhook | [`stripe-webhook/SKILL.md`](./stripe-webhook/SKILL.md) | Fail-closed Stripe webhook idempotency & status codes |

Repo-only operational loop & design skills live in `.agents/skills/` (`claims-check`, `continuous-corpus-ingestion-and-wiring-loop`, `continuous-post-game-learning-and-pathwise-calibration-loop`, `dk-200pt-dfs-contest-simulation-loop`, `falsifier-run`, `full-board-360-game-dossier-and-firewall-loop`, `gse`, `overnight-autonomous-projection-loop`, `pickpilot-design`, `session-close`).

## Integrity & Evaluation
- Run `node scripts/guardrails/verify-skills-integrity.mjs` to enforce frontmatter, broken-path checks, and `.claude`/`.agents` parity.
- Run `node scripts/dspy-gse/run.mjs --check` (or `npm run dspy:gse` to regenerate `examples.json` from `goldens.json`) and `npm run agent:eval`.
