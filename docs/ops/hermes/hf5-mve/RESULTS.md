# H-F5 MVE RESULTS — BLOCKED before first observation

Generated: 2026-08-20 (build seat). Pre-registration remains un-amended.

The side-adaptive e-process, frozen hyperparameters (lambda=0.3, 6–3h
window, seed=20260820, nParticles=24), side-selection rule, binding-outcome
function, and runner (`scripts/edge-lab/run-mve.ts`) are landed and
unit-tested. Outcome drafts were written before any corpus look
(`docs/ops/edge/2026-08-20-mve-kill-entry-draft.md`).

**The one cycle was not executed.** Runtime `DATABASE_URL` / `DIRECT_URL`
point at localhost Postgres. `pg` connect failed with `28P01 password
authentication failed for user "sports"`. `DATABASE_URL_UNPOOLED` is unset.
No Neon URL is present in process env. No secrets were printed. No
capital, n, or exclusion count was invented. No other window, lambda, or
e-process variant was computed.

Founder re-run (same branch, working Neon URL, do not retune):

```
node --env-file=.env --import tsx scripts/edge-lab/run-mve.ts
```

Then apply the pre-drafted binding outcome to `/kill-ledger` or the
prospective template. One cycle. No reruns after seeing the path.
