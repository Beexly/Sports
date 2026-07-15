# Claude Continuation Prompt

You are continuing the verified GSE frontier recovery in `Beexly/Sports`.

## Start here

```powershell
git fetch origin --prune
git switch codex/gse-frontier-recovery-2026-07-13
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
```

Read this packet in numeric order, then read:

- `reports/agent-handoffs/FRONTIER_RECOVERY_LEDGER.md`
- `reports/agent-handoffs/FRONTIER_RECOVERY_REALITY_MAP.md`
- `docs/architecture/INTELLIGENCE_DECISION_PERSISTENCE_PROPOSAL.md`

## Commands that define current proof

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
$env:DATABASE_URL='postgresql://gse_build:gse_build@127.0.0.1:65432/gse_build?connect_timeout=1'
$env:AUTH_SECRET='local-build-placeholder-not-production'
npm.cmd run build
npm.cmd run guardrails
git diff --check
```

## First task

Wire `buildPlaybackConsumerBundle()` into an **owner-only, selected-game Cockpit surface** using the existing `GameRoomPlayback`/envelope path:

1. Reuse `requireCockpitAdmin()` before loading data.
2. Use one real persisted game ID supplied by the route or operator; do not add demo events.
3. Return an honest unavailable state when the Game Room envelope is absent or withheld.
4. Render the Twin read model and the deterministic cited Brain answer from the same event stream.
5. Do not expose raw model output, paid fields to PUBLIC, or any causal claim.
6. Add failing-first tests for auth, one-query loading, withheld/unavailable behavior, citations, and raw-output exclusion.
7. Keep each production source file at or below 250 lines and run the exact validation stack.

After that, feed the same settled stream to the postgame autopsy and draft-only Studio adapter. Do not create another truth store.

## Hard directives

- **DO NOT RE-AUDIT.** The audit and reality map are complete.
- **DO NOT REBUILD** the envelope/event/delta/certificate architecture.
- **DO NOT REOPEN** the closed #76-#96 PRs.
- **DO NOT WEAKEN** any trust, entitlement, admin, stale, outage, rights, proof, or draft-only gate.
- Do not change migrations, production DB, billing, auth persistence, legal, canonical URLs, webhooks, secrets, DNS, Vercel protection, or auto-publication without explicit owner authority.
- Preserve untracked `g.id)`, `s.id`, `{`, `pnpm-lock.yaml`, and `pnpm-workspace.yaml`.
- Update draft PR #112; do not create a competing replacement PR.

When blocked by an owner gate, record the exact command and evidence needed, continue the safe queue, and never invent completion.
