# Launch action plan for the next agent session (written 2026-09-03 01:30 UTC)

Audience: a Claude Sonnet session taking over from the Fable session that
produced PR #685. Read this file, `AGENTS.md`, `CLAUDE.md`, and the decision
record `docs/ops/CLAUDE_DECISIONS_20260902.md` (D1–D13) before touching
anything. The stand-alone report is `LAUNCH_FINAL_20260902.md` at the
repository root (not under `docs/ops/`).

## Where things stand

- Branch `claude/final-launch`, PR #685 (ready for review, stacked on #684).
  The last Fable push carries the cubic third-pass fixes (D13), the watchdog
  vocabulary fix, the hardened agent bash guard and this plan. `git log` shows
  the SHA; the PR body's "Validation" section names the previous head.
- Every gate was green locally at that push: `npm run typecheck` (22
  workspaces), `npm run lint`, `npm run guardrails` 26/26, `npm run lint:brand`
  3,715/3,715, trust-gate OK, the touched apps/web suites, guard selftest
  115/10/55. CI on that head had not finished when this was written.
- The merge of #685 is the owner's decision (baseline migration, ~280 files).
  Do not merge it yourself.

## Laws that bind you (short form; the long form is AGENTS.md)

- Never flip a gate or env flag, never run a cron with a real secret, never
  search for credentials, never fabricate product data, never weaken a guard
  or a test, never `git commit --no-verify`, never push to `main`.
- The brand line is immutable: "We're not AI. We're math you can read."
  Never describe the engine as AI. `npm run lint:brand` and the trust gate
  fail the build on any phrase in `apps/web/lib/positioning-vocab.json`
  (the generic "generated" variant was added on 2026-09-03; quoting a banned
  phrase in a doc trips the gate too, so name the file, not the phrase).
- Verify block before every commit: `npm run typecheck`, `npm run lint`,
  `npx vitest run <touched suites>` from `apps/web` (the `@/` alias resolves
  only from that workspace), `npm run lint:brand` and `npm run guardrails`
  when docs, copy or scripts changed. Stage by name; one task, one commit;
  commit footer `Co-Authored-By: Claude <noreply@anthropic.com>` plus the
  session link; PR bodies end with the Claude Code footer.
- Agent-denied paths: `.claude/settings.json`, `.github/workflows/**`,
  `scripts/guardrails/**`, `.githooks/**`, `.mcp.json`, migrations, schema,
  `package-lock.json`. Edits there happened only through owner-authorised
  labelled node scripts in this engagement; do not route around the guard.
  If the owner authorises such an edit, write a small script in your
  scratchpad and run it with `node <path>`; never `node -e` mentioning the
  path.
- Bot review findings (Devin, cubic, Codacy, Strix) are bug reports: read
  the code first, fix real ones with a tripwire test, answer false ones with
  the evidence line, never resolve a thread you did not address.

## Phase 0: known red items at handoff (added 2026-09-03 01:50 UTC)

These arrived after the plan was first written and were NOT fixed by the
Fable session. Verify each against the code before acting; fix the real
ones in one commit per area with a tripwire test.

CI is red on the last two heads. Root cause was not inspected:

- run 33701803833 on a573e6bbd (Test job)
- run 33703406579 on 358287530 (Test job, check_run 100487352912)
- Prime suspect (cubic, confidence 10): an existing persistence test still
  asserts `updateMany` `where: { id: "game-1" }` after the new `OR` guard in
  `apps/web/lib/data-sources/free-score-persist.ts`. Search
  `apps/web/__tests__` for `"game-1"` together with `updateMany`; update the
  expectation to the guarded shape that
  `free-score-persist-guard.test.ts` already asserts.
- Codacy reports 4 "critical" findings on 358287530; read them, most are
  likely the guard script's regexes. Do not weaken the guard to satisfy a
  linter.

Bot findings still open (Devin round 3, cubic rounds 4 and 5):

1. `apps/web/lib/calibration/confidence-tail.ts` (Devin + cubic P1): the
   loader's `.map()` omits `pickType`, so `byMarket` is always empty in
   production. Forward `pickType: r.pickType` and add a loader test that
   asserts a non-empty `byMarket`.
2. `apps/web/lib/data-sources/settle-backfill.ts` `defaultPersist` (Devin 🔴):
   lacks the FINAL score-disagreement guard the settle runner and
   `free-score-persist.ts` now have. Add the same `SCORE_MISMATCH_CROSS_PATH`
   skip plus the conditional `updateMany` where clause; test it.
3. Same file: `capReached` reads true when overdue count equals `cap`.
   Fetch `cap + 1` and set `capReached = stale.length > cap` (then slice to
   `cap`). Update the existing test.
4. `apps/web/app/api/cron/backfill-team-efficiency` and `ingest-player-stats`
   routes (Devin): apply `isUnpublishedSeasonSignal` from
   `apps/web/lib/ingestion/unpublished-season.ts` as the player-stats routes
   do (404 or ok-with-zero-rows is not an error).
5. `scripts/ops/merge-duplicate-games.ts` `computeCanonicalFillData` (cubic):
   the score-pair branch must run when EITHER canonical score is null
   (`||`, not `&&`).
6. `apps/web/lib/ops/game-merge-plan.ts` (cubic): settled picks on earlier
   aliases are not indexed as references; rename `canonicalPickId` to
   `referencePickId` for accuracy.
7. `apps/web/__tests__/process-sport.test.ts` (cubic): restore `warnSpy` in
   `afterEach` or `finally` so a failing assertion cannot leak the spy.
8. `.github/workflows/external-watchdog.yml` (cubic; agent-denied path,
   owner-authorised labelled node script only): GitHub's default shell is
   `bash -e`, so add an explicit `set +e` before the fallible `curl`/`jq`
   calls, or the poll still aborts before the paging block.
9. `scripts/ops/owner-runbook.mjs` HEALTH-ALERT-WEBHOOK verify (cubic):
   check both stores, `vercel env ls production | grep HEALTH_ALERT_WEBHOOK_URL`
   AND the `gh secret list` grep, before the curl.
10. `scripts/guardrails/agent-bash-guard.mjs` (cubic; agent-denied path,
    same edit procedure, work on a scratchpad copy and run its selftest
    first): attached `env -Ssudo …` bypasses split-string unwrapping;
    combined xargs flags `-rn1` are not recognised; quoted
    `git diff --output="x"` bypasses `redirect-output-ask` because the rule
    sees the quote-stripped view (evaluate it against the raw command).
    Selftest baseline is 115 denied / 10 ask / 55 allowed; every case must
    stay intact.
11. `scripts/smoke-prod.sh` (cubic): an 8-second `--max-time` can report
    `000` on a cold Vercel function; retry once or downgrade to WARN.
12. `.claude/commands/review-pr.md` (`Bash(npm run test*)` → `Bash(npm run test)`),
    `.claude/commands/canary.md` (guard the empty `--url=` with
    `${ARGUMENTS:+-- --url=$ARGUMENTS}`), `docs/ops/OPERATOR_TASKS.md`
    HENRYGD-REG row (also set `derived_analytics_allowed: false`).

After the push, reply on each thread with the SHA (or the reason it is
left as is) and resolve only the ones you addressed.

## Phase 1: take over the PR watch (first 10 minutes)

1. Subscribe to PR activity for #685 and #684 (`subscribe_pr_activity`), and
   schedule an hourly self check-in with `send_later` until both PRs are
   merged or closed. The Fable session's watch and check-in were stopped so
   they no longer spend its budget.
2. Check CI on the current head: the pull_request-event run of `ci.yml` is
   the one that counts; the push-event run is always cancelled by the branch
   concurrency group (expected, not a failure). If the Test job is red, open
   the job log, find the failing file, fix and push. The last two red runs in
   this engagement were both test mocks missing a new import (precedent:
   `ops-public-surface-truth-rate-limit.test.ts` needed `getPlatformConfig`).
3. Read `Claude Approvals` if the repo runs it, and the check-runs list.

## Phase 2: close cubic's third-pass threads on GitHub

cubic posted 38 review threads on head a573e6bbd at 01:05 UTC. Every one was
verified against the code in the Fable session; the fixes are in the last
push and recorded in D13. The threads themselves are still open on GitHub.
Do this once, frugally:

1. `pull_request_read` with `get_review_comments` (paginate; `perPage` 40) and
   collect the unresolved threads from review run `1b4a120d…` (the third
   pass). Their subjects and outcomes:
   - Fixed (reply "Fixed in <SHA>" with one line each, then resolve):
     external-watchdog.yml (three threads: status vocabulary, fetch/parse
     failures reaching the pager, `--fail`), settle-picks `persistFreeScores`
     overwrite, settle-picks scoped `priorOverdueCount`, settle-backfill cap
     (answered with `capReached`, see below), market-coverage (two threads:
     tombstones, stale/started picks), cockpit stub mode, confidence-tail
     markets (`byMarket`), merge-duplicate-games (options, `--limit` counts,
     score pair, effective canonical: four threads), owner-runbook (seven
     threads), LAUNCH_FINAL (two threads), agent-bash-guard (seven threads)
     and `.claude/settings.json` `git diff --output` (the guard now
     classifies `--output` targets).
   - Answered, left as is (reply with the reason from D13, then resolve):
     confidence-tail database aggregation and learning-eligibility; merge
     tool per-group transactions and the dry-run collision preview;
     backfill pagination (cap 200 against 88 overdue; `capReached` now
     exposes saturation); game-identity concurrency race (D9);
     `.claude/settings.json` SessionStart `npm ci` hook (owner-frozen; D9).
2. One summary comment on the PR mapping the round to the commit, as was
   done for the second pass (see the existing "cubic review round" comment
   for the format). Always end GitHub posts with the attribution footer:
   a blank line, `---`, then `_Generated by [Claude Code](https://claude.ai/code)_`.
3. Update the PR body: add item 11 (cubic third pass) under "What changed",
   set the "Validation (final head …)" SHA, and add the watchdog fix to the
   owner handoff line (the GitHub secret is now part of the set command).

## Phase 3: if the bots post a fourth round

Same rule, same budget discipline. Batch: read all threads first, group by
file, fix real ones in one commit per area, verify, push once, then reply
and resolve. Expect diminishing returns; a finding that asks for a design
change (locks, pagination, DB aggregation) is answered, not built, four days
from kickoff unless it is a correctness defect on the money or settlement
path.

## Phase 4: owner tasks (you cannot do these; keep them visible)

`npm run ops:runbook` prints each with the exact command and verification.
In priority order for Week 1:

1. `FORCE_NO_BET_IF_STALE=true` in Vercel Production; verify with
   `curl -sS https://www.galaxysportsedge.com/api/ops/public-surface-truth | jq -e '.gates.forceNoBetIfStale == true'`.
2. `HEALTH_ALERT_WEBHOOK_URL` in Vercel AND as the GitHub Actions secret
   (`gh secret set HEALTH_ALERT_WEBHOOK_URL --repo Beexly/Sports`); point an
   uptime monitor at `/api/health?strict=1`.
3. Supersede or void the stale published PENDING picks (live count:
   `.stalePendingPicks` on the truth surface; 21 on 2026-09-02) before the
   Sept 5 kickoffs.
4. Renew or remove `THE_ODDS_API_KEY` (dead since 2026-08-24; both states are
   safe now).
5. Elite alert env then `WATCHLIST_ALERTS_ENABLED=true`; decide the NFL
   moneyline pause.
6. After the first production deploy: `npm run db:migrate:status`, then
   `npm run launch:ready`.
7. PRE-COMMIT-BRAND, MCP-VERCEL-KEY, SANDBOX-NET, HENRYGD-REG, NEON-RO,
   CONN-PRUNE, PUSH-PROTECT, BRANCH-PROTECT (rows in
   `docs/ops/OPERATOR_TASKS.md`).

## Phase 5: launch day (Friday 2026-09-05)

Follow `docs/ops/LAUNCH_DAY_RUNBOOK.md` (ten minutes). Watch, read-only:

- `npm run launch:ready` after the deploy: every row PASS or an explained
  WARN; "stale-data kill switch" must be PASS.
- The settle cron response (`/api/cron/settle-picks`, owner runs it with the
  real secret; you read the Vercel log): `path` is `free` or `free+odds-api`,
  `starved` false, `staleBackfill.capReached` false. A `starved: true` cycle
  is a score-spine outage: check `/api/cron/free-spine-health` and the RCA
  block in the same response.
- `/api/ops/public-surface-truth`: `marketCoverage.degraded` (CFB totals
  under a zero-key slate is expected and visible), `confidenceTail.verdict`
  (inverted today; nothing publishes it as probability), `stalePendingPicks`
  (must be 0 before kickoff).
- Do not open PERFORMANCE_STATS, LIVE_BOARD, PUBLISH_LEDGER or
  CALIBRATION_ADJUSTMENTS. D2 and D3 explain why the sample does not clear
  the floors (Brier ≤ 0.22, ECE ≤ 0.05, beat-close ≥ 52.4%).

## Phase 6: after Week 1 settles

- `npm run ops:merge-games` dry run first; read
  `scripts/ops/out/merge-duplicate-games-plan-<ts>.json` (groups,
  pickConflicts, refusedGroups) with the owner before `--execute`.
- If `staleBackfill.capReached` ever reads true two hours in a row, add
  cursor pagination to `apps/web/lib/data-sources/settle-backfill.ts`.
- If `picks` grows past ~50k rows, move the confidence-tail summary to a
  database aggregation (`groupBy` on confidence/result/modelVersion).
- The identity race in `resolveCanonicalGame` (D9): advisory lock or a
  canonical identity key, a design change for a quiet week.

## Things already settled; do not redo them

- The calibration floors, the ≥80 tail (152 picks, 61 wins, 40%: inverted,
  monitored, not shipped), CFB totals degrading visibly, alias-not-move
  merges, the plain `CREATE INDEX` (2,584-row table), the `.claude/**`
  policy exception, no `stale-while-revalidate` on the board: all decided
  with evidence in D1–D13. Re-litigate only with new data.
- Local quirk: `npx tsc` directly on `scripts/ops/merge-duplicate-games.ts`
  reports an `import.meta` error because that invocation compiles to
  CommonJS; the root `npm run typecheck` is the real gate and passes.
- Run vitest from `apps/web` for anything importing `@/...`; `cd` persists
  between Bash calls, so prefix commands with `cd /home/user/Sports &&`.
