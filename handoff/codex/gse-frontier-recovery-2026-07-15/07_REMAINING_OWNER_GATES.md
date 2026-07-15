# Remaining Owner Gates

These are authority or external-state limits, not unfinished coding excuses.

1. **Decision persistence migration**: approve or reject the additive schema in `docs/architecture/INTELLIGENCE_DECISION_PERSISTENCE_PROPOSAL.md`. Before any schema commit or deploy, require Prisma generation, a disposable shadow DB, and a diff proving only authorized additive objects. Never diff from production in a way that proposes dropping orphaned live objects.
2. **PR #101**: rebase, regenerate Prisma, run the shadow diff, inspect the existing set-A drift, and approve only the four intended additive columns. No production migration was run here.
3. **Production identity**: correlate the deployed Vercel SHA with GitHub. Current deployment identity is unknown.
4. **Vercel protection**: verify whether the production custom domain is publicly reachable. The prior auth-wall report was not revalidated in this lane.
5. **Production DB and cron**: verify environment variables, real Postgres health, odds rows, ingestion-run timestamps, settlement, and external cron history with read-only evidence first.
6. **Live playback proof**: identify one real rights-cleared, eligible persisted record and rerun the browser script against `/room/<real-game-id>` without a fixture.
7. **Merge/deploy**: review PR #112, wait for required GitHub checks, mark ready, merge, and deploy only under repository/owner policy.
8. **Public consumer expansion**: approve product placement before exposing Twin, Brain, autopsy, or Studio projections beyond their current pure/tested adapters.

Protected zones remain billing, auth persistence, legal, canonical URLs, webhooks, production secrets, DNS, migrations, destructive data changes, and automatic external publishing.
