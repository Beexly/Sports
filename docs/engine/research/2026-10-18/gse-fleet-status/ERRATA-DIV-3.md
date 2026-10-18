# DIV-3 Errata — 2026-10-18 04:19 CT (from DIV-3 Lead · Engine QA)

These supersede the matching statements in DIV-3.md and README.md.

1. CFBD: the log totals **26** calls. The "27" in the audit was an arithmetic slip. The estimates are unchanged: about 24 unique calls, about 399 remaining and about 577 unattributed.
2. Nightly audit results are now written to `/workspace/gse/blackboard/div3/nightly-audit/<date>.json`. Today's run is backfilled there with summary figures only (sha256 364cbb02…29aa).
3. **validate.py BIAS bug: FIXED.** event-request-desk changed it to pick the enum from each file's `$schema`, so BIAS is accepted only under v2, and v1 files fail after 2026-11-01 00:51 CT. Tests pass. A backup is at `validate.py.bak-20261018`. The line 13 issue described in README.md and DIV-3.md is resolved; don't re-fix it.
4. health-summary is corrected: 7 batches promoted and 5 rejected, which is 16 files promoted and 35 rejected out of 51.
5. RO-2026-10-18-13 is verified and **closed**.
