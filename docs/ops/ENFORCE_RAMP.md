# ENFORCE Ramp Runbook (intended future shape)

**Status as of this writing:** no surface registry or live ramp mechanism
exists in the codebase — this document describes the INTENDED future shape.
`canRampEnforce()` (`apps/web/lib/ai-control-plane/enforce-gate.ts`) and the
`SRQC_DRILL=1` script (`scripts/srqc-enforce-drill.ts`) are the safety-rail
primitives built so far; the registry itself (a `SurfaceRegistry` +
`admitRouted` + kill switch) is separate, not-yet-built work that the owner
has said to hold until they give further signal. Nothing described below is
wired up, reachable from production, or turned on anywhere.

## Intended ramp shape, per surface

```
0% -> canary 1% -> 10% -> 50% -> 100%
```

- `globalEnforceEnable` default: `false`.
- Kill switch tested monthly.
- Widen a step only if:
  - shadow false-positive notes are clean for the current window, AND
  - cashOs (or the relevant business/cost metric for that surface) is not
    regressing.

## Today's actual primitives

1. **`canRampEnforce(args)`** — a pure boolean gate a FUTURE registry-based
   ramp mechanism can call before widening a surface further. It checks:
   - `shadowDays >= 14`,
   - `falseRefuseRate` (if known) `<= 0.05`,
   - a drill has passed (`drillPassedAt` non-null),
   - that drill passed within the last 90 days.

   It is currently unconsumed by any production code path. It exists purely
   as a ready-made, independently tested safety predicate.

2. **`scripts/srqc-enforce-drill.ts`** — a lab/staging-only script, gated
   behind `SRQC_DRILL=1`, that proves the synthetic REFUSE path actually
   works end to end:
   - builds a synthetic ledger-event window that projects a GE2 violation,
   - feeds it through `evaluateSrqcAdmissionForLab` with `SRQC_ENFORCE=1` set
     ONLY in a synthetic env object it constructs itself (never
     `process.env`, never any persistent config),
   - asserts the result is `REFUSE`,
   - asserts that calling `admitUnderSRQC` directly with the default
     `mode="SHADOW"` on the SAME events still returns `ADMIT`, proving
     SHADOW-by-default is unaffected,
   - prints one JSON line:
     `{ kind: "srqc_enforce_drill", passed, at, ge2Detected, enforceRefused, shadowStillAdmits }`.

   It does not touch any database, any live traffic, or any feature flag.
   Exit code 2 if `SRQC_DRILL` is not `"1"` (refuses to run outside explicit
   opt-in); 0 on pass; 1 on any assertion failure.

## What is intentionally NOT here yet

- No `SurfaceRegistry` (which surfaces exist, what % of traffic each is at).
- No `admitRouted` (or equivalent) call site that actually consults
  `canRampEnforce` or the registry to route a fraction of real traffic
  through ENFORCE.
- No kill switch implementation (the "tested monthly" line above describes
  an intended operational habit once a kill switch exists, not a claim that
  one exists today).
- No dashboard, alert, or automation that widens a step automatically. Every
  step in the ramp above is a human decision, mirroring how `SrqcVersion`
  activation already works (`scripts/activate-srqc-version.mjs` — a human,
  run by hand, never CI/cron).

Building the registry and wiring `canRampEnforce` into a real admission path
is out of scope for this change and should not be started without explicit
owner sign-off.
