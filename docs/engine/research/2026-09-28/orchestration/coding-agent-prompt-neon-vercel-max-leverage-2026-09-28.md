# Coding-agent prompt: Neon + Vercel MAX leverage implementation (2026-09-28)

Repo: Beexly/Sports. Branch: `motif/orchestration-v4-2026-09-28`. Everything lands on the remote — nothing lives local-only.

## The job

Implement ALL of the Neon + Vercel max-leverage research. Read these first — they are the spec, ranked by value x feasibility with real numbers:

- `docs/data-sources/research/2026-09-28/neon-max-leverage-audit-2026-09-28.md` (round 1)
- `docs/data-sources/research/2026-09-28/neon-max-leverage-round2-2026-09-28.md` (round 2 synthesis) + `neon-max-leverage-round2/round2-laneA.md`, `round2-laneB.md`, `round2-laneC.md` (detail)
- `docs/engine/research/2026-09-28/vercel-max-leverage-2026-09-28.md` (round 1)
- `docs/engine/research/2026-09-28/vercel-max-leverage-round2-2026-09-28.md` (round 2 synthesis) + `vercel-max-leverage-round2/r2-gateway-shootout.md`, `r2-caching.md`, `r2-platform.md` (detail)
- `docs/engine/research/2026-09-28/consolidation-neon-vercel-vs-paid-services-2026-09-28.md` (killing redundant spend: 4 LLM routers -> 1, Sentry, HF PRO, Upstash)
- Repo `AGENTS.md` sections: NEON BRANCH-ONLY TESTING, NEON COST & LEVERAGE (+ROUND 2), VERCEL COST & LEVERAGE (+ROUND 2)

## How to work

You are an elite model — use your own reasoning and intelligence. There are no guardrails from me on HOW you implement: if you see a better way than the research describes, or additional leverage the research missed, build it. Improve freely. The repo's own rules in AGENTS.md are the only rails — they are standing founder directives, not suggestions.

Highest-impact items to start with: pooled connection cutover (`?pgbouncer=true` + `directUrl` for CLI), preview-deploy cost controls (the fleet's push cadence is the unbounded tail risk), firewall bot rules (dashboard), ISR the public projections/rankings pages (with the public/private fence as cache policy — internal surfaces stay `force-dynamic`), Fluid sizing on all 23 crons (512MB / maxDuration 120-180), AI Gateway pilot scaffolding (budget-capped key, one lane — do not top up past the free $5 tier without a founder decision), signals chain -> 1 Vercel Workflow trial on preview, pg_cron enablement path prepared (needs the founder's Neon API key — do everything up to that tap), Sentry resolution, Upstash permanently off the buy list.

## Founder taps — do everything else, surface these as the only blockers

- Neon API key (console -> API keys): gates `neon deploy`, pg_cron, schedule triggers, branch janitor, real plan-tier/burn confirmation
- Neon console 5 min: plan tier, burn by line item, project region (Functions need us-east-1/us-east-2/eu-central-1/ap-southeast-1), Object Storage eligibility
- Neon-Managed Vercel integration install (never the Vercel-Managed "Native" flavor)
- Vercel Spend Management budget + alerts (default $200 too high)
- AI Gateway pilot decision (free tier first — first top-up forfeits it)
- SENTRY_DSN set in prod? On what tier?
- DeepSeek data posture decision (only model family without a no-prompt-training agreement)

## Deliverable

Push every change to the remote branch. Report back: what you implemented (with measured before/after where possible), what you improved beyond the research, what genuinely needs a founder tap, and what's queued for evaluation with the reason. Do not mark anything dead without evidence.
