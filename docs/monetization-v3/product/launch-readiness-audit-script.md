# Launch Readiness Audit Script

**Status:** Engineering-owned. Local preflight script.
**Related decision:** DEC-NEXT-038

## DEC-NEXT-038 - Codify the launch readiness audit

**Decision:** Add a single local script that runs the launch-readiness gate sequence used during the overnight audit.

**Why now:** The pack now has strategy docs, launch playbooks, proof-surface scaffolds, Vault APIs, feature flags, smoke scripts, and environment contracts. The risk is no longer "is there a plan?" It is "did someone remember every gate before a launch window?"

## Script

[audit-launch-readiness.ps1](../../../scripts/audit-launch-readiness.ps1)

Default run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\audit-launch-readiness.ps1
```

Default checks:

- Monetization-v3 validator.
- Exact banned-phrase brand scan.
- DEC-NEXT definition uniqueness.
- Web regression tests.
- Web typecheck.
- Web production build.
- `npm audit`.

Optional checks:

- `-CheckEnv` requires the Vault launch environment contract to pass.
- `-SmokeProd` runs read-only production smoke checks after `PROD_BASE_URL` is confirmed.

## Guardrail

The script does not deploy, mutate production data, create Stripe sessions, assign Discord roles, trigger cron routes, or infer a production hostname.

## Morning Use

Use the default run at the start of the peak block. Add `-CheckEnv` once target environment variables are loaded. Add `-SmokeProd` only after the production hostname is explicitly confirmed.
