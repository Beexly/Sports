# dependency-audit D4 — root-cause diagnosis (2026-09-04 re-audit)

**For the owner of `scripts/guardrails/dependency-audit.mjs`.** That path is
forbidden to the night/re-audit agent sessions (AGENTS.md rule 2; night order
§3), so this is a written hand-off, not a fix. Night-order decision D4
(HERMES_ALL_NIGHT_2026-09-04.md) already knew the shape: "The guard misreads a
degraded `npm audit`" — this doc pins the exact mechanism and what to do.

## Observed behaviour

Across the 2026-09-04 night (waves 2, 3, 4, 5) the `dependency-audit` guard
failed 4 times, all on heads with ZERO manifest/lockfile changes:

    [dependency-audit] FAIL — 2 stale waiver(s); the vulnerability is gone,
    so remove the entry: next, postcss

Same heads passed it on other runs (26/26 on baseline, m1, m3, m4, m6, m7,
and on the final merged head — re-verified by the re-audit at 10:26 CST,
guards exit 0). It was treated as a flake and re-run around.

## Root cause — the script's staleness test equates "absent from one response" with "fixed"

`dependency-audit.mjs` (~line 105):

```js
const stale = ACCEPTED.filter((a) => !offenders.some((o) => o.name === a.package));
```

`offenders` comes from ONE `npm audit --json --omit=dev` invocation. If that
response is degraded — registry timeout short-circuiting the tree walk, a
partial bulk-advisory response, proxy/CA hiccups — `next` and `postcss` are
missing from `vulnerabilities` for a reason that has nothing to do with being
fixed. The script then reports them as STALE, and the failure message is
actively FALSE in that state: it instructs the operator to delete waivers
whose vulnerabilities are still live.

Verified live during this re-audit (10:32 CST, repo root): the advisory IS
still present — `npm audit --json --omit=dev` reports `vulnerabilities: {next,
postcss}`, `next.severity = "high"`, metadata 280 prod deps. So the 4 night
failures were all false STALEs from degraded responses, not real fixes. The
correct signal (fail closed / retry) is currently a misleading one (fail with
"remove the waiver").

The mirror hazard exists too: a degraded response can also HIDE a real new
critical/high, silently passing the gate. Both directions share one fix.

## Proposed fix (path owner to implement)

1. **Sanity-check the response before trusting absence.** If
   `report.metadata?.dependencies?.prod` is missing/0, or the vuln object is
   absent entirely, treat the run as INDETERMINATE (exit non-zero with an
   explicit "degraded audit response — indeterminate" message, or retry once
   with backoff). Never derive staleness from a response that failed its own
   sanity check.
2. Optionally record the advisory `range`/`title` in each ACCEPTED entry and
   only call a waiver stale when the response was healthy AND the advisory id
   is absent — absence + healthy response is then real evidence.
3. Keep the expiry path (`reviewBy`) as is; it is not affected.

Until fixed, the operational rule from D4 stands: a red `dependency-audit`
with "stale waiver" text on a manifest-unchanged head is a degraded-audit
false positive — note it, re-run, do not edit the ACCEPTED list.
