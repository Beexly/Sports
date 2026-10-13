# Hermes — execute the 6 verified fixes (independently confirmed by two audits)

You already validated this split against the real code and found the same result an independent Claude session found: of the launch plan's 12 "red items," 6 are real bugs, 6 are already fixed or describe files/behavior that don't exist, 1 is unconfirmed. Both audits agree on which is which. Stop re-verifying — execute.

Do NOT act on items 1, 7, 8, 9, 10, or 12 from the plan doc's Phase 0 list. They are confirmed false or already fixed on `claude/final-launch` head `6ac0cbc2` (or whatever is current — `git fetch` first and confirm you're still on this branch before starting).

## Execute these 6, one commit each, verify block before every commit

Branch off `main` (not off `claude/final-launch` unless PR #685 is still open and unmerged — check `gh pr view 685` first and say which base you used). Claim each item in `docs/ops/AGENT_LEDGER.md` before starting it; mark DONE with the real SHA when it lands. One task, one commit, files staged by name (never `git add -A`). Verify block before each commit: `npm run typecheck && npm run lint && npx vitest run <touched suites>` (from `apps/web`), plus `npm run lint:brand` and `npm run guardrails` if docs/scripts changed.

**1. `apps/web/lib/data-sources/settle-backfill.ts` — `defaultPersist` missing score-disagreement guard.**
`defaultPersist` writes `game.homeScore`/`awayScore` unconditionally whenever both are non-null, with no check against an existing differing score. `apps/web/lib/data-sources/free-score-persist.ts` has the reference pattern: a `SCORE_MISMATCH_CROSS_PATH` check before its conditional `game.updateMany`. Port the same guard shape into `settle-backfill.ts`'s `defaultPersist`. Add a test asserting a disagreeing score does not overwrite.

**2. Same file — `capReached` off-by-one.**
Currently `capReached: stale.length >= cap`. Should be `>` — reached only when MORE than a cap's worth are overdue, not exactly a cap's worth. Fetch `cap + 1` rows if needed so the comparison is meaningful, change `>=` to `>`, slice to `cap` for the actual persisted batch. Update the existing test for this field.

**3. `apps/web/app/api/cron/backfill-team-efficiency/route.ts` and `apps/web/app/api/cron/ingest-player-stats/route.ts` — missing `isUnpublishedSeasonSignal` guard.**
Neither route calls `isUnpublishedSeasonSignal` (from `apps/web/lib/ingestion/unpublished-season.ts`), while sibling routes `backfill-player-data/route.ts` and `refresh-player-stats/route.ts` already do. Apply the same pattern those two use — a 404 or ok-with-zero-rows during an unpublished season is not an error.

**4. `scripts/ops/merge-duplicate-games.ts` — `computeCanonicalFillData` score-pair branch.**
Currently `if (canonical.homeScore == null && canonical.awayScore == null)` — only fires when BOTH are null. Must fire when EITHER is null: change `&&` to `||`. Re-read the surrounding function body yourself before editing — don't trust any prior summary of what the "before/after" code looks like, including this one; grep the actual current lines first. Update/add a test with exactly one canonical score null.

**5. `apps/web/lib/ops/game-merge-plan.ts` — rename `canonicalPickId` → `referencePickId`.**
Rename the field and every usage/type/test reference for accuracy (settled picks on earlier aliases are referenced, not canonical). Typecheck must stay clean across all call sites — grep the whole repo for `canonicalPickId`, not just this one file.

**6. `scripts/smoke-prod.sh` — cold-start timeout.**
Multiple `curl --max-time 6` / `--max-time 8` calls, no retry logic, so a cold Vercel function can report `000` and register as a false FAIL. Add one retry with a short backoff, or downgrade a `000` to WARN instead of FAIL. Keep `WARNS`/`FAILS` counters consistent with the rest of the script's existing pattern.

## Item 11 (unconfirmed) — resolve it, don't skip it

Both audits flagged this one as needing a closer read rather than confirmed real or false. Before executing, re-check the plan doc's exact wording for item 11 against current `scripts/smoke-prod.sh` behavior, decide real-or-not yourself, and say which in your report. If real, fix it as a 7th item with its own commit and verify block.

## Before opening/updating the PR

Run `/qa`, then `/review-pr` against your branch, resolve every Critical/High finding with a tripwire test or an evidence-line reply (never a silent resolve). Run `/preflight` before recommending merge.

## Do not touch (already fixed — confirmed by two independent audits)

- `confidence-tail.ts` already threads `pickType` through and populates `byMarket`.
- `external-watchdog.yml` already omits `set -e` with an explanatory comment.
- `owner-runbook.mjs` already checks both the Vercel env var and the GitHub secret.
- `scripts/guardrails/agent-bash-guard.mjs` already handles `env -S`/`--split-string` and `git diff/log/show --output=` as protected writes, with self-test cases for both.
- `.claude/commands/review-pr.md` and `canary.md` are already correct.
- No `apps/web/__tests__/process-sport.test.ts` exists — don't create one speculatively.

## Laws, non-negotiable

Never flip a gate or env flag; never run a cron with a real secret; never weaken a guard or test; never push to `main` directly, and never push directly to `claude/final-launch` outside a reviewed PR either. Brand line "We're not AI. We're math you can read." is immutable. Agent-denied paths (`.claude/settings.json`, `.github/workflows/**`, `scripts/guardrails/**`, `.githooks/**`, `.mcp.json`, migrations, schema, `package-lock.json`) — none of the 6-7 items above should require touching these; if one does, stop and ask rather than routing around the restriction.

## Report back

State: which base branch you used, the SHA for each of the 6-7 fixes, verify-block results, whether item 11 was real, and current CI status on the resulting head. Then stop — do not proceed to merge or to the plan doc's later phases without confirmation.
