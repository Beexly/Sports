# Rollback Playbook

How to revert a bad deploy or bad data state, safely.

## Rollback ladder

Always try the cheapest, most reversible option first.

### Step 1 — Kill switch

If the bad behavior is gated on a kill switch (see `FEATURE_FLAG_KILL_SWITCHES.md`), flip it.
Effect: immediate, no deploy required, no DB write. Use this first whenever possible.

### Step 2 — Launch mode demotion

If multiple capabilities are misbehaving, set `GALAXY_LAUNCH_MODE=internal-calibration`.
Effect: hides public picks, performance stats, paywall. Educational and methodology surfaces remain available.
Decision rule: do this if more than one trust-critical surface is showing wrong data.

### Step 3 — Code rollback (git revert)

For a bad commit shipped to production:

```
git revert <bad-sha> -m 1            # if it was a merge commit
git revert <bad-sha>                  # plain commit
git push origin <release-branch>
```

Then redeploy the release branch.

**Never** force-push to undo. The history is the audit trail.

### Step 4 — Image rollback

If the platform supports it (Vercel / Fly / containerized), pin to the previous deployment artifact:

```
# Vercel
vercel rollback <deployment-url>

# Containerized
kubectl set image deployment/web web=<previous-image-sha>
```

This is faster than re-building from a revert commit. Use when minutes matter.

### Step 5 — DB-level rollback

For a bad migration:

1. Pause writes via launch-mode demotion.
2. Run the down migration.
3. Verify with smoke tests against staging restore.
4. If down migration is destructive, restore from snapshot per `BACKUP_RESTORE_DRILLS.md`.

**Never run a destructive DB rollback without a current snapshot.**

### Step 6 — Data-level rollback

For bad data (mass-published wrong picks, telemetry pollution):

1. Identify the bad batch via `model_version` or `generated_at` window.
2. Set `is_published = false` on the affected rows (do NOT delete — keep audit trail).
3. Communicate via status page T5 template (trust incident).
4. Backfill correct data when ready.

## Pre-flight checklist before any rollback

- [ ] Have I identified the actual bad SHA / batch / migration?
- [ ] Is there a faster kill switch I'm skipping?
- [ ] Have I taken a current snapshot if the rollback touches state?
- [ ] Have I declared the incident per `INCIDENT_RESPONSE_MATRIX.md`?
- [ ] Have I posted the T1 (investigating) status update?

## Post-rollback verification

After any rollback:

1. Run smoke against the rolled-back surface.
2. Verify no constitutional invariant weakened during the change (no certainty copy slipped in, no methodology field exposed).
3. Run `npx vitest run tests/runtime-convergence/` against the rolled-back state.
4. Update status page (T3 mitigated → T4 resolved).
5. Schedule post-mortem.

## Anti-patterns

- "Just push the fix forward" — when the production state is wrong, get to a known-good state first, then roll forward.
- Rolling back code without rolling back DB migrations that the code wrote.
- Skipping the snapshot because "this should be quick."
- Force-pushing to clean up history.
- Bypassing pre-commit hooks with `--no-verify`.
