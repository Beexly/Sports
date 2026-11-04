# PR #1180 merge-review cleanup spec — Q22 third-down sacks (2026-10-19)

Prepared by Motif (proactive research run, 2026-10-19 ~01:15 UTC / Oct 18 ~8:15 PM CT).
Status: PREPARED, not executed. Nothing has been merged, pushed, or sent to Jules from this spec yet.

## Verified facts

- All 88 Jules sessions are complete — none waiting, none failed. Q22 (third-down sacks taken)
  landed as PR #1180, "feat: add third-down sacks expected metric (SHADOW)", from Jules
  session 1485337038336199452. Head commit: 1ed5059c9782a0529545e36059649471b82414f0. PR is open.
  (Source: tracking update 2026-10-19T00:45:51Z on goal_95ab3498c504; PR record read via
  GitHub API, Beexly/Sports pull 1180.)
- GitHub reports PR #1180 not currently mergeable. Its AGENTS.md changes repeat the metric
  note across historical sections instead of one appended entry.
  (Source: same tracking update.)
- The PR's own embedded bot reviews, read from the PR body via the GitHub API, say more:
  - cubic: "AGENTS.md gained a Third-Down Sacks line in every sweep section, with a duplicated
    line in the first section; two section headers also lost their parenthetical annotations."
  - Cursor Bugbot, reviewing head commit 1ed5059: the diff is documentation-only edits to
    AGENTS.md — "No application code, tests, or metric pipeline files appear in this diff."
- That directly conflicts with the Jules PR body, which claims mapper changes, a column
  allowlist, a birth-certificate registry entry as SHADOW, and "83 passing tests" in the
  expected-metrics suite. Both cannot be true of the same head.

## Why this matters

Q22 is a repeat-failure item (original session failed in exploration; retry 1 failed
generically; retry 2 produced this PR). The standing merge-review rule from 2026-10-18 is:
verify the remote diff of any Jules PR is the allowed file set ONLY before merge — agents'
local "clean" claims have repeatedly not matched the remote (PR #1173 carried 7 unrelated
CSVs; PR #1175 had registry churn; PR #1172 was empty through 10 steers). PR #1180 fits that
exact failure pattern. Merging it as-is would either (a) land duplicated AGENTS.md churn and a
merge conflict resolution nobody has reviewed, or (b) worse, close out Q22 as "landed" while
the metric code never arrived — the same silent-loss shape as the first Q15 attempt.

This is Motif's work, not Garrett's: PR branch/conflict cleanup routes to Jules with a
Motif-supplied prompt (2026-10-16 reclassification). The 2-agent merge gate still holds —
this spec authorizes no merge.

## Step 1 — the one check that decides everything (delivery / main agent)

Run: `bin/github-api GET /repos/Beexly/Sports/pulls/1180/files` (connector doc:
~/workspace/custom-connectors/custom.legacy-github/CONNECTOR.md) and record the exact file
list and per-file patch for AGENTS.md. A browser read of the /files page was attempted in
this run and had not returned by handoff, so the file list is still UNVERIFIED at this level.

## Step 2A — if the code files ARE in the diff (mapper, registry, tests)

Cleanup prompt for Jules (keep minimal, repo rules govern):
"PR #1180: collapse the AGENTS.md changes to a single appended Third-Down Sacks entry in the
latest sweep section only. Remove the repeated line from every historical section, remove the
duplicated line in the first section, and restore the two section headers' parenthetical
annotations exactly as on main. Resolve the merge conflict. Do not change any other file.
Re-run the expected-metrics suite and report the result in the PR body."

## Step 2B — if the diff is AGENTS.md only (no metric code)

Do NOT merge. Q22 is not landed. Re-fire Q22 as a fresh Jules session with the same guardrail
used for Q15R/Q22 retry 2, plus one added gate: before the shepherd marks it landed, verify
via the GitHub API that the PR head actually contains the mapper file, the registry entry,
and the tests — a PR whose diff is documentation-only does not count as a landing. Close or
hold PR #1180's AGENTS.md entry until the real build lands, then keep exactly one appended
entry from the real PR.

## What Garrett needs to decide

Nothing. Both branches are Motif-executable under existing standing orders. He only needs to
hear the outcome: whether Q22's code is real in PR #1180 or whether Q22 goes back into the
build queue.

---

## ADDENDUM — file list verified 2026-10-19T01:20:21Z (browser read of the PR /files page)

Step 1 is DONE. The diff is 6 files, +271 / −2, exactly the expected Q22 file set:

1. `AGENTS.md` — 39 changes (37 additions, 2 deletions) — the only problem file, see below.
2. `packages/prediction-engine/src/expected-metrics/__tests__/third-down-sacks.test.ts` — NEW, +83.
3. `packages/prediction-engine/src/expected-metrics/index.ts` — +9 (exports for computeThirdDownSacks, model version, floor constant, types).
4. `packages/prediction-engine/src/expected-metrics/nflverse-pbp-mapper.ts` — +21 (thirdDownDropbackPlays collected for down===3 dropbacks; scope fix from the shepherd steer is in).
5. `packages/prediction-engine/src/expected-metrics/third-down-sacks.ts` — NEW, +102 (v1.0.0, 30-dropback floor, team/QB, YTD / rolling-4 / rolling-8).
6. `packages/prediction-engine/src/metrics/core/metric-birth-certificate-registry.ts` — +19 (SHADOW entry, metricId 'third-down-sacks').

Verdict: **Step 2A applies.** Jules' claims check out — the metric code, registry entry, and
tests are really in the PR. The Cursor Bugbot "documentation-only" summary in the PR body is
WRONG (Bugbot itself reported "couldn't run — usage limit reached"); do not rely on it.

AGENTS.md damage, exact: the identical Third-Down Sacks bullet was inserted into every
'### NEW METRIC / ANGLE ENTRIES' section — 33 insertions total; the first section got the
line TWICE as consecutive duplicates; two section headers were normalized to plain
'### NEW METRIC / ANGLE ENTRIES', losing their parenthetical annotations (those 2 header
replacements are the 2 deletions); one new '### AGENT ACTIVITY' header with a Third-Down
Sacks entry was added at the end of the file. Cleanup = keep ONE entry (the AGENT ACTIVITY
one, or one appended entry in the latest section), remove the other 32 insertions plus the
duplicate, restore both headers verbatim from main.

Checks on head 1ed5059: PASSED — Socket Security, GitGuardian, Codacy (0 issues). REQUIRES
ACTION — Azure Pipelines 'Beexly.Sports' (red X, "requires action with the application").
NEUTRAL — cubic, Cursor Approval Router, Cursor Bugbot, Cursor Security. ChatGPT Codex
review failed on usage limits. Conversation page shows "5 / 10 checks OK". Mergeable/conflict
status was NOT visible to the anonymous browser viewer, so the tracking record's
"not currently mergeable" (2026-10-19T00:45:51Z) stands as the latest word — the conflict is
presumably AGENTS.md churn vs main and should clear with the cleanup; re-verify mergeable
state via the GitHub API after the cleanup push.

Remaining merge-review list for PR #1180, in order:
1. Jules cleanup push: AGENTS.md only, per above.
2. Re-check mergeable state via GitHub API.
3. Determine whether Azure Pipelines "requires action" is a required gate or an app-side
   action before merge — do not merge past an unexplained red X.
4. Then the normal 2-agent merge gate. Nothing in this spec merges anything.
