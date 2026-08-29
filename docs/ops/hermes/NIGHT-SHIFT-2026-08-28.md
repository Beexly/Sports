# NIGHT SHIFT — continuous audit/test/fix loop (2026-08-28, run until morning)

You do not stop tonight. You loop. Every pass: build → audit → fix minutiae →
log → loop again. Two attempts per item, then mark BLOCKED with the exact
error in the night log and MOVE ON — a blocked item with honest error text is
a success; stopping is the only failure. Branch: `hermes/night-shift-1` off
LATEST `origin/main` (fetch first). Push after every 5 commits or 30 minutes,
whichever first.

## HARD RAILS (violating one discards the run)
- NO schema.prisma/migrations · NO gate/env flips · NO new dependencies ·
  NO `npm audit fix --force` · NO scraping/new sources · NO deleting or
  skipping tests to get green.
- **Guardrail scripts (`scripts/guardrails/*`) are READ-ONLY tonight** — you
  may ADD test cases, never change scanner logic (a review closed a bypass
  hole there today; logic changes wait for daylight review).
- Every fix commit: smallest possible diff, verify block first
  (`npm run typecheck` grep-count 0 · lint exit 0 · the touched suite green).
- One fix = one commit, staged by name. If a "fix" grows past ~30 lines,
  it is not minutia — log it as FOUND-LARGE and move on.

## THE LOOP (repeat until morning, in this exact order)

**Lane 0 — dispatch backbone (only while tasks remain):** finish the next
incomplete task from `GREEN-BOARD-DISPATCH-2026-08-28.md` (GB-3 → GB-4 →
GB-5 → Phase D-1 → D-2 → D-3 → D-4 → D-5). One task per pass, then continue
to Lane 1 — the audit ring runs every pass regardless.

**Lane 1 — full test battery.** Run, in order, recording pass/fail counts:
prediction-engine vitest · ingestion-pipeline vitest · data-ingestion vitest
· apps/web vitest (full) · `npm run typecheck` · every guardrail scanner
(trust-gate, no-unsupported-performance-claims, commercial-copy-scan,
em-dash-scan, draft-only, secret-scan) · `node scripts/ops/check-agent-ledger.mjs`
· `node scripts/check-deploy-readiness.mjs` (env failures in a sandbox are
EXPECTED — record only NON-env findings) · `node scripts/lib/gate-flip-readiness.mjs`
if runnable. ANY red that is small and in-scope → fix now; else log.

**Lane 2 — code minutiae sweep (rotate one per pass, cycle through all):**
1. `eslint . --ext .ts,.tsx` over apps/web with --max-warnings=0 — fix every
   unused var/import (the class that has blocked deploys before).
2. Dead links + 404 routes: grep public pages for hrefs to non-existent
   routes; fix or remove.
3. Stale comments that lie about the code (docblocks contradicting behavior)
   — correct the comment, never the code, unless the code is a proven bug.
4. TODO/FIXME census: collect into the night log with file:line; fix any
   that are one-liners.
5. Unused exports / dead files report (do not delete without certainty —
   log candidates).
6. Test-gap sweep: for each core lib module without a test file, add ONE
   table-driven test of its pure functions (small, honest, no mocks of the
   thing under test).

**Lane 3 — front-end minutiae (rotate one per pass):**
1. States audit: every public page renders honest empty/loading/error states
   (fix missing ones with existing patterns).
2. Contrast/a11y: WCAG AA on touched pages — fix tokens/labels/alt/focus
   rings; keyboard nav on nav + pricing + board.
3. Responsive: 360px/768px/1280px breakpoints on the five doors — fix
   overflow, wrapped buttons, unreadable tables (tables get overflow-x
   containers).
4. Copy pass: one public page per cycle — cut words ≥30%, grade-7 voice,
   jargon out (per Phase D rules), scanners must stay green.
5. Console noise: eliminate client console errors/warnings on public pages.

**Lane 4 — security minutiae (rotate one per pass):**
1. Secret scan full tree + `.env*` hygiene + no keys in comments/fixtures.
2. Auth guards: every /api route either public-by-design (list them) or
   carries auth/rate-limit — add `consumeRateLimit` to unprotected
   human/* readiness routes (known deferred item) and any others found.
3. Headers: security headers config matches vercel.json expectations.
4. Dependency audit (report-only: `npm audit` findings logged, NO auto-fix).
5. Input validation: API routes parsing query/body without zod/schema —
   log; fix only trivial ones.

**Lane 5 — data honesty minutiae:** grep public surfaces for hardcoded
numbers that look like stats; verify each is either static copy (allowed) or
variable-fed; log violations (do not silently edit numbers — fix the wiring
or flag).

## THE NIGHT LOG (the deliverable that proves the night happened)
Append to `docs/ops/hermes/NIGHT-LOG-2026-08-28.md` after EVERY pass:
```
## Pass N — HH:MM
fixed: <count> (one line each: file — what)
blocked: <count> (one line each: file — exact error)
found-large: <items for daylight>
suites: engine X/X · pipeline X/X · web X/X · tsc 0 · scanners green/red
```
Commit the log with each push. Never batch it. Never summarize away a
failure. If every lane is green and no dispatch tasks remain: raise depth —
run Lane 2.6 test-gap additions until morning. There is always a next test.

Morning handoff: final log entry = totals for the night + the top 5
FOUND-LARGE items ranked for the daylight crew.
