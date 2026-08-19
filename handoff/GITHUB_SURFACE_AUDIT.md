# GitHub Surface Audit — 2026-08-16

Verified via the `gh` API. Canonical owner casing is **`Beexly`**, not `BeeXly`.

---

## 1. FINDING: `main` is completely unprotected, and 14 installed apps can write to it

Independently re-verified:
```
gh api repos/Beexly/Sports/branches/main/protection  -> 404 "Branch not protected"
gh api repos/Beexly/Sports/rulesets                  -> []
gh api repos/Beexly/Sports/hooks                     -> 1 live webhook (Codacy)
```

**Why this is the headline.** Vercel auto-deploys `main` to Production. There is no branch
protection, no ruleset, and no required review. **14 installed GitHub Apps hold `contents=write`**,
which is a direct push to the branch that deploys to your customers. Two of them
(`vercel`, `cloudflare-workers-and-pages`) additionally hold `administration=write` — they can change
repo settings themselves. Nine hold `workflows=write` on a repo whose Actions secrets include
`CRON_SECRET`, `CRON_TARGET_URL`, and `NEON_API_KEY`.

This is not "a vendor might be evil." It is: a compromise at ANY of ~14 third-party vendors becomes a
production deploy with no gate. That is a supply-chain surface far larger than the npm one already
hardened this session, and it was invisible to every code-level audit because it lives in account
config, not in the repo.

**Mitigation is free and takes minutes** (owner-only — these are account settings):
1. Enable branch protection on `main`: require a PR, disallow force-push, disallow deletion.
   Even with you as the only reviewer this stops app-driven direct pushes.
2. Uninstall the unused apps (list below).
3. Remove the Codacy webhook if Codacy is not in use.

## 2. FINDING: GitHub Actions are 100% failing on a billing block

Last 100 runs: **100 failures**. Last success **2026-08-15T14:35:31Z**. Failing jobs show
`runner_id: 0`, `steps: []`, `billable.total_ms: 0`, and an empty log archive — the jobs never
received a runner. GitHub's own annotation:

> "The job was not started because recent account payments have failed or your spending limit needs
> to be increased."

**Consequences that matter more than the noise:**
- **The external watchdog added earlier this session (`.github/workflows/external-watchdog.yml`) is
  INERT.** It was supposed to be the outside-Vercel alarm for exactly the dead-scheduler failure that
  has now been ongoing ~28 hours. It has never run and will not run until billing is resolved. This
  correction matters: the "nothing outside Vercel is watching" gap was reported as closed. It is not.
  **Compensating control added the same day:** the local PowerShell sprint watchdog now polls
  `/api/ops/public-surface-truth` every loop and appends to `handoff/PROD_HEALTH_ALERT.md` when
  `schedulerLiveness != ok` or settlement is CRITICAL. That runs on this machine, needs no account,
  and works today — but it stops when the 72h sprint ends, so it is a bridge, not the answer.
- `external-cron.yml` fires 6 schedules × 9 jobs and fails every few minutes, generating pure noise.
- Any CI-based security tooling is dead until this is fixed — which is why the security stack chosen
  this session deliberately favored local/pre-commit/pre-push controls over CI.

Money decision, so nothing was changed. Also note: `gh api user` returns `plan: null` — the token
lacks the `user` scope, so the plan/minutes could NOT be read. Not inferred.

## 3. Installed apps — 23 found, only 2 functional

Enumerated indirectly via check-suites (a PAT cannot call `/user/installations`). **23 is a FLOOR,
not a ceiling** — apps without `checks` permission are invisible to this method (Neon is almost
certainly installed given `NEON_API_KEY` + `neon_workflow.yml`, but did not appear). The true list is
at github.com/settings/installations.

**Only `github-actions` and `socket-security` ever reach `completed`. The other 21 sit at
`status: queued` forever** — installed, permissioned, inert.

**KEEP:** `vercel` (real deploy path), `socket-security` (the only working third-party check),
`renovate` (inert but worth configuring — it is the free Dependabot alternative that does not need
Actions minutes), `claude` (only if you use `@claude` in PRs).

**REMOVE — unused, and each is write-access to your deploy branch:**
`kilo-code-bot` (widest permission set on the list — contents+workflows+actions+deployments+hooks+
vulnerability_alerts write), `cloudflare-workers-and-pages` (administration=write; you deploy on
Vercel), `render` (competing host), `mergify`, `cubic-dev-ai`, `stainless-app`, `testdriverai`
(ran twice on 2026-08-10, dead since), `azure-boards`, `azure-pipelines`, `codacy-production`
(also owns the one live webhook), `apollo-graphos` (no GraphQL here), `google-cloud-build`,
`axe-linter`.

**REMOVE — free tier does not cover a private repo:** `coderabbitai` (paid on private),
`sonarqubecloud` (free tier is public-repo-only), `codecov` (needs CI, which is dead).

**Note:** removing the `posthog` GitHub App does NOT affect the PostHog SDK in the app — different
things.

## 4. What was NOT verifiable, stated plainly

- Account plan and Actions minutes: token lacks `user` scope. Not inferred.
- The full installed-app list: requires a GitHub App token or the settings UI.
- Whether Neon's app is installed: strongly implied by secrets/workflow, not confirmed via API.
