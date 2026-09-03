# Launch command surface, 2026-09-03

Shared state for every agent working toward the Friday 2026-09-05 kickoff.
Written by the architect session from commands it actually ran. Every line below
traces to output that was observed. Where something was not checked, it says
NOT VERIFIED.

Read this before claiming a task. Do not re-derive what is already recorded here.

## 1. Verified state

| Fact | Value | How it was checked |
|---|---|---|
| `main` | `0db5ef808` (merge of PR #685) | `git rev-parse origin/main` after `git fetch --prune` |
| CI on `main` | SUCCESS | GitHub Actions run 33799645214, `ci.yml`, push event |
| typecheck | exit 0 | `npm run typecheck` on `0db5ef808` |
| lint | exit 0 | `npm run lint` on `0db5ef808` |
| guardrails | 26/26 PASS | `npm run guardrails` on `0db5ef808` |
| Production | LIVE on `0db5ef808` | Vercel `dpl_GoYrLkrJ2vTC28dYaXbXhEni9PbJ`, target=production, state=READY |
| Remote branches | 789 total, 640 diverging from `main` | `git ls-remote --heads` plus per-branch `git diff --shortstat origin/main...<ref>` |
| Ledger | 135 rows, guard exit 0 | `node scripts/ops/check-agent-ledger.mjs` |

Correction recorded honestly: an earlier read of this session reported `main` at
`bb0e7df` (2026-08-23). That was a stale ref read before `git fetch`. PR #685 is
merged and deployed. The stale reading was wrong.

## 2. The finding that drives the current run

Fifty open pull requests from the 2026-08-25 audit wave were never merged, and none
of their content is present on `main`. Each one was dry-run merged against
`0db5ef808` with `git merge-tree --write-tree`:

- 43 merge CLEAN
- 7 CONFLICT
- 0 already absorbed into `main`

They are named, reviewed launch fixes: access-control leaks, money-path defects, and
numbers rendered to users without a query behind them. Landing this queue is the
highest-value work available before kickoff.

A clean merge is TEXTUAL only. It is not evidence of correctness. Every batch is gated
by the full verify block before it is kept. A red batch is a real finding.

## 3. Landing queue

Merge with `git merge --no-ff origin/<branch>`. After each batch run:

```
npm run typecheck && npm run lint && npm run guardrails && npm run lint:brand
(cd apps/web && npx vitest run)
```

Green: commit the batch and continue. Red: fix inside the batch, or after two failed
attempts abort that one merge, record BLOCKED with the exact error, and continue.
Never weaken a test or a guard to reach green.

| Batch | PR | Merges into main | Files | What it fixes |
|---|---|---|---|---|
| B1 access control | #597 | CLEAN | 45 | BLOCKER-paid-board-bypass+free-grace-exploit |
| B1 access control | #606 | CLEAN | 5 | ungated-market-signal+B2B-PRO-leak |
| B1 access control | #621 | CLEAN | 6 | gate-nflverse-dfs-serverside |
| B1 access control | #615 | CLEAN | 13 | gate-fantasy-live-pool |
| B1 access control | #651 | CLEAN | 2 | gate-player-production-lab |
| B2 security | #652 | CLEAN | 6 | open-redirect-callbackUrl |
| B2 security | #629 | CLEAN | 14 | picks-cache-stampede+cost-amplifiers |
| B3 money path | #653 | CLEAN | 3 | stripe-invoice-payment-failed |
| B3 money path | #612 | CLEAN | 7 | checkout-price-validation+grace |
| B3 money path | #656 | CLEAN | 18 | atomic-PAST_DUE-entitlement |
| B3 money path | #668 | CLEAN | 7 | revenue-fence-fail-open |
| B3 money path | #664 | CLEAN | 13 | money-killswitch-alert-swallowed |
| B3 money path | #625 | CLEAN | 4 | money-path-claims+stripe-price-gate |
| B4 settlement | #642 | CLEAN | 7 | PUSH-reachable+line-drift |
| B4 settlement | #619 | CLEAN | 5 | exclude-pushes-from-winrates |
| B4 settlement | #618 | CLEAN | 9 | odds-staleness+FAILED-outbox |
| B4 settlement | #600 | CLEAN | 2 | line-archive-silent-failure |
| B4 settlement | #608 | CLEAN | 2 | season-replace-atomic |
| B4 settlement | #610 | CLEAN | 7 | silent-write-failures |
| B5 honesty | #636 | CLEAN | 17 | fabricated-stat-to-paying-reader |
| B5 honesty | #628 | CLEAN | 6 | local-clock-as-bookmaker-ts |
| B5 honesty | #616 | CLEAN | 2 | odds-probability-space+NaN-gates |
| B5 honesty | #614 | CLEAN | 4 | devig-before-averaging |
| B5 honesty | #639 | CLEAN | 3 | calibration-39-pinning-tests |
| B5 honesty | #644 | CLEAN | 18 | one-day-boundary |
| B5 honesty | #646 | CLEAN | 8 | tier-claims-vs-code |
| B5 honesty | #650 | CLEAN | 8 | one-grade-ladder |
| B6 frontend | #640 | CLEAN | 14 | blank-page-hang+nav+contrast |
| B6 frontend | #648 | CLEAN | 9 | false-subscription-active+NaN |
| B6 frontend | #624 | CLEAN | 11 | viewer-clock-kickoff |
| B6 frontend | #662 | CLEAN | 6 | 44px-touch-targets |
| B6 frontend | #658 | CLEAN | 14 | a11y-conversion-path |
| B7 remainder | #607 | CLEAN | 4 | seo-canonical-sitemap |
| B7 remainder | #645 | CLEAN | 7 | disclosure-surface |
| B7 remainder | #661 | CLEAN | 5 | operator-false-assertions |
| B7 remainder | #637 | CLEAN | 5 | content-grounding |
| B7 remainder | #638 | CLEAN | 20 | utc-sweep+copy-leaks |
| B7 remainder | #665 | CLEAN | 9 | adapter-fail-closed |
| B7 remainder | #666 | CLEAN | 3 | money-authz-coverage |
| B7 remainder | #604 | CLEAN | 3 | vacuous-assertions |
| B7 remainder | #603 | CLEAN | 2 | watchlist-N+1 |
| B7 remainder | #605 | CLEAN | 2 | outbox-batch-query |
| B7 remainder | #632 | CLEAN | 10 | killswitch-defers-not-deletes |

### Conflicted queue (resolve after the clean queue is green)

| PR | Files | What it fixes |
|---|---|---|
| #630 | 26 | rate-limiters-clientIp+waitlist-enum |
| #631 | 8 | health-leak+sleeper-fanout |
| #634 | 7 | cron-route-auth-coverage |
| #647 | 3 | bind-picks-to-right-game |
| #620 | 5 | fabricated-edge-index-loss-rate |
| #667 | 18 | test-blind-spots |
| #643 | 3 | cve-gate-silent-pass |

`#597` carries two BLOCKER findings (paid-board bypass, free-grace exploit) and
touches 45 files. Merge it alone, gate it, then continue the batch.

## 4. Preview-deployment verification

Every pull request has a Vercel preview deployment; its URL is on the PR as a
deployment status. Use it to PROVE an access-control fix instead of reasoning about it:

```
curl -sS -o /dev/null -w '%{http_code}\n' "$PREVIEW/api/picks"
curl -sS "$PREVIEW/api/picks" | jq '.[0] | keys'
curl -sS "$PREVIEW/api/picks?limit=99999" | jq 'length'
curl -sS "$PREVIEW/api/health?strict=1" | jq .
```

Rules. Preview deployments only. Read-only GETs only, never a write endpoint and
never a cron route, on any environment. If a preview is behind deployment protection,
fall back to a local `npm run dev`. A pasted curl transcript is evidence; a paragraph
of reasoning is not.

## 5. Efficiency laws for agents in this repo

- The ledger is APPEND-ONLY. To change a row's status, append a superseding row.
  A prior session spent eight tool calls on repeated string surgery against one
  markdown table row. If a text edit fails twice, append instead. Never write a third
  regex against a table row.
- Decision budget per task: 3 file reads, 2 command runs, one conclusion, then act.
- Precedent first on any test repair: `git grep -l "<symbol>" -- "*.test.ts"` and copy
  the mock pattern that already exists.
- Two attempts per task, then revert and record BLOCKED with the exact error text.
- Do not re-read a file already read this session. After each commit, forget that task.

## 6. Not verified by this session

These are open questions, recorded so nobody reports them as settled:

- Whether the 43 clean merges are SEMANTICALLY compatible with each other. Only the
  textual merge was tested. The batch gates exist to answer this.
- The full `apps/web` suite was NOT run against any merged combination.
- Behaviour of the live production surfaces was not exercised beyond confirming the
  deployment state through the Vercel API.
- The 7 conflicted pull requests were not resolved or analysed line by line.
- 640 branches diverge from `main`. Only the 50 audit-wave pull requests were triaged.
  The remainder are unaccounted for and are NOT claimed to be safe to delete.
