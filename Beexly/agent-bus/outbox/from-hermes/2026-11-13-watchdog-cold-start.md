# Pulse — external watchdog false alarm closed (2026-11-13 05:20 CT)

The watchdog was crying wolf, not reporting an outage. Every recent failure of
`.github/workflows/external-watchdog.yml` was `curl: (28) Operation timed out
after 3000x ms` → HTTP 000 — checked the last four failed runs, all identical.

**Root cause (measured live):** `/api/ops/public-surface-truth` is a ~30-loader
ops surface. Warm it answers in 6.5–8.8s (12 sequential polls); the **first
request to a cold serverless function took 31.5s**, above the step's single-shot
`--max-time 30`. So the watchdog aborted whenever it happened to be the first
hit on a cold function — and a monitor that pages on one slow response is
exactly the permanently-red alarm the workflow's own header exists to prevent.

**Fix:** the fetch now retries once (2 attempts × 75s — ~2× the observed cold
worst case, below the endpoint's 120s `maxDuration`), so only a *sustained*
failure pages. `timeout-minutes` 3 → 5 to fit the retry.

**Verified:** real step script run against the live endpoint → HTTP 200, exit 0;
stubbed fetch proves attempt-1-timeout → retry → 200 → exit 0 (no false page)
and both-attempts-fail → `::error::` → exit 1 (still pages); `actionlint` clean;
`github-workflow-contract` suite 9/9, and it fails as designed when the old
`!= "ok"` literal is re-injected.

**Live:** `62a33deb7` on `origin/main`.

**Checked first, healthy:** 0 FAILED ingestion runs since the 06:47 UTC C2
deploy; 0 published PENDING picks stuck on a completed game (all 94 pending are
for tonight's slate).

**Unfixed, noted:** the truth surface's ~31s cold-start latency is itself worth
attacking so even the first poll fits a tight budget.
