# HERMES BUILD QUEUE — 2026-08-20

Autonomous build queue. Work top to bottom. **Never stop to ask a question:
if a task is blocked, mark its ledger row BLOCKED with the reason and move to
the next task.** Read `docs/business/GSE-BUSINESS-PLAN-2026.md` and
`docs/ops/MASTER-PLAN-2026-08-19.md` first. Production deployed at 90aa7652 —
the blocker is gone; this queue is the launch build.

## Standing rules (every task)

- Branch per task: `hermes/b<N>-<slug>` from latest
  `origin/claude/cron-config-placement-verify-qsl19t`. One task, one branch,
  one ledger row. **Never push to main.** Claude merges.
- Before every commit, ALL of: `npx tsc --noEmit -p apps/web` (0 errors),
  `node scripts/guardrails/trust-gate.mjs` (OK), `node
  scripts/ops/check-agent-ledger.mjs` (OK, check the real exit code — do not
  pipe it). Run the specific test files you touched with vitest.
- Copy rules, non-negotiable: never the words "exploitable", "fade",
  "guaranteed", "beat the book", "edge" as a promise; every metric ships with
  a "What this measures / what it does not" block; ECE copy must carry the
  confidence-echo caveat and render the LIVE value, never a hardcoded number.
- Sealed paths untouched: packages/db/prisma, .github, scripts/guardrails,
  apps/web/lib/ai-control-plane, .env*, package-lock.json.
- Update your ledger row to UNPUSHED with branch + headline when done, then
  push the branch.

## B-1 — The Kill Ledger page (route `/kill-ledger`)

Public page. Four dated entries from the merged research docs
(`docs/ops/hermes/l1*-*/RESULTS.md`, `docs/ops/edge/*`): market-level
close-prediction (L-15), per-book shading (L-16A), cross-book lead-lag
(L-16B), price-path geometry (L-17). Each entry renders: the mechanism in
plain English, the pre-registered rule, the observed numbers, the verdict,
and a link to the evidence doc path. Page thesis line: "We test the
strategies this industry sells. When they fail, we publish the failure."
Closing line: "We test things so you don't have to learn the hard way."
Style-match the existing public pages (Nav, Footer, RiskDisclosure).
Add to footer + sitemap. Tests: page renders all four entries; copy contains
no banned claim words; each entry names its pre-registered threshold.

## B-2 — BookGrade + PulseScore v1 (route `/bookgrade`)

Static data file `apps/web/lib/truthmetrics/bookgrade-v1.ts` transcribed
EXACTLY from `docs/ops/hermes/l18-book-metrics/RESULTS.md` (totals only for
BookGrade — spread BPQI must NOT appear as price quality; note says why).
Render: per-book table (mean deviation vs consensus close, n, clustered t),
PulseScore table (fraction of polls with a changed quote — mybookieag 0.51,
FanDuel 0.070, William Hill 0.061 pattern), provenance block (241 MLB
clean-close games, 2026-05-22 to 2026-08-20, method one-liner). Mandatory
copy: "A quality score, not a betting signal. It tells you what a price
historically cost at a book, not which side to take." Free surface shows the
tables; deeper history is a Pro upsell placeholder only (no fake data).
Tests: data file matches RESULTS.md numbers; page carries the
what-this-measures block; the word "fade" absent.

## B-3 — "What this number measures" glossary component

`apps/web/components/ui/metric-honesty.tsx`: small component taking
{ measures, doesNotMeasure, caveat? } and rendering the standard block. Wire
into `/bookgrade` (B-2) and `/calibration/market` (its ECE is the MARKET's —
say so). Do NOT touch /api/ops or cron code. Tests: component renders both
lists; both pages import it.

## B-4 — Verify button on public pick cards

The API already returns `proofReceipt.contentHash` on every public pick and
`/api/proof/receipts` + `/verify` exist. Add a small client component on the
public pick card: "Verify this pick" reveals the content hash, the committed
timestamp, and a link to `/verify` with instructions. No new crypto — UI
wiring only. Tests: renders when contentHash present, hidden when null.

## B-5 — Zero-affiliate pledge page — **BLOCKED until founder F-6 sign-off**

Spec ready: dated pledge text, machine-readable JSON assertion at
`/api/pledge/affiliate-free` (checks the affiliate-structural-separation
guard's own posture), violation clause ("any violation is published here
within 24h"). Build NOTHING until the ledger shows F-6 DONE by founder.

## After the queue

Do not invent new tasks. If all buildable tasks are done or blocked, stop
and report. The next queue comes after Claude merges and reviews.
