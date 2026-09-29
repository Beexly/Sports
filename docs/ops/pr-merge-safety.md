# PR merge-safety guard and checklist

**Status:** analysis complete, 2026-09-29. **Base for every number below:** `origin/main` = `e12fea169` (SURF-18, #955).
**Scope:** read-only. No DB, no deploy, no env, no source edits. The only artifact this analysis is allowed to leave is this file.

Companion to `docs/ops/pr-backlog-triage.md` (30 PRs → 9 MERGE-AS-IS / 15 REBASE-THEN-MERGE / 6 ARCHIVE). That triage was scored on
`git diff origin/main...<pr>` — the **three-dot** diff, which is the PR's own contribution. This document scores the same 30 PRs on the
**merge result** instead, and corrects the triage where the two disagree.

---

## 1. Headline: the merge order is *not* safe as written

The proposed order fails on three independent counts. Two are fatal; one is a measurement error that would have caused a healthy PR to be archived.

| # | Finding | Severity |
|---|---|---|
| 1 | **The triage base is stale by 5 commits.** Triage was computed against `ebca9de011`; main is now `e12fea169`. Every "behind main" count and every "DIRTY/MERGEABLE" verdict in the triage is against a commit that no longer exists. | invalidates the plan |
| 2 | **#950 — the single "merge this first" recommendation — is already merged.** It landed 2026-09-29T20:28:42Z as part of #950→main. Merging it again is a no-op or an error. | fatal |
| 3 | **#888's "-870 lines of AGENTS.md" is a measurement artifact.** Its branch tip holds a 3,910-line AGENTS.md, identical to the merge-base. A real 3-way merge auto-merges AGENTS.md and **keeps main's 4,776 lines**. The deletion the triage warns about does not happen on merge. | corrects triage |
| 4 | **#913 — promoted to "highest value, merge first" — silently changes a persisted data shape.** It is a genuine fail-closed correctness fix, and it introduces `Number.POSITIVE_INFINITY` into interval bounds that get serialised. | needs sign-off |
| 5 | **#876 is a 7-manifest dependency bump**, not a "small MEDIUM-risk fix". It moves `pg` 8.21→8.23, `next-auth` deps, `three`, `@sentry/nextjs`, `lucide-react`, `@noble/curves`, `ws`. | mis-scored |

**Bottom line:** of the 9 PRs the triage calls MERGE-AS-IS, one is already merged (#950), and two of the remaining eight carry
behaviour or supply-chain change that a diff line-count cannot see (#876, #913). The *classification* of the 6 ARCHIVE PRs is also
wrong for #888.

---

## 2. The measurement error that makes a dangerous merge look safe

This is the core hazard and the reason the guard exists.

`git diff origin/main...pr/888` reports `AGENTS.md | 7 +++++---`. The PR looks like a 7-line docs tweak.
`git diff origin/main pr/888` (two-dot) reports **3,206 files changed, 1,437,517 deletions** — because the branch is 298 commits
behind and its tree simply lacks everything main added since. Neither number is the merge.

The merge is the 3-way merge result, and neither the triage nor a casual reviewer computes it:

```
$ git merge-tree --write-tree --name-only origin/main refs/remotes/pr/888
8beaa7ede85eb8d64fb397e96bfd4d76b4e4ceb1      <- the tree that would actually land
apps/web/lib/calibration/2606-29203-...-allocation.ts   <- conflicted paths follow
apps/web/tsconfig.json
... (20 paths)

$ git show 8beaa7ede...:AGENTS.md | wc -l
4776           <- main's 4,776 lines survive intact
```

**A branch that is far behind main looks like a mass deletion under any diff, and looks like a no-op under the three-dot diff.
Only the merge-tree residual tells the truth.** #888 happens to be harmless on this axis; a future PR of the same shape may not be.

The same trap, inverted, hid a real risk in #913 (below) — where the three-dot diff *understated* what the merge does.

---

## 3. Axis-by-axis results, all 30 PRs vs current main

### 3.1 Schema drift — clean

**Zero.** No PR in the set touches `prisma/migrations/`, `schema.prisma`, any `.sql`, or `packages/db/pg-cron/`. Measured
three-dot across all 29 open PRs.

This is worth stating explicitly because it is a *negative* result: schema drift is not a risk in this batch, so the guard's
schema rule is currently green. It exists to catch the next batch, not this one. CI already has a `Migration drift check
(schema.prisma vs applied migrations)` step, which would catch drift introduced *inside* a PR that is absent from the
three-dot scan.

### 3.2 Secret exposure — clean, with one false positive to know about

No live credential in any of the 29 open PRs. Scanned added lines for AWS keys, GitHub tokens, Slack tokens, Stripe-style
`sk-`, private-key headers, credentialed `://user:pass@` URLs, JWTs, and Google API keys.

One hit, **#878**: `postgresql://${DBUSER}:***@127.0.0.1:...` — a shell template with variable interpolation and a masked
password, not a secret. Flagged as `info`, not a block, so the pattern stays tuned without becoming noise.

The repo's existing `scripts/guardrails/secret-scan.mjs --all` (wired into CI as a dedicated job) already covers this
class. The guard's `secret-shape` rule is a merge-scoped addition: it only looks at the *merge residual*, so it cannot be
satisfied by a credential that exists on both sides and only fires on what the merge would newly introduce.

### 3.3 Silent behaviour change — 4 findings, 2 of them in the "safe" tier

True merge-tree residual, source files only (non-doc, non-test):

| PR | Class | What the merge removes | Assessment |
|---|---|---|---|
| **#876** | MERGE-AS-IS | 244 `package-lock.json` lines + 7 manifests | **supply-chain change.** Bumps `pg`, `three`, `@sentry/nextjs`, `lucide-react`, `@noble/curves`, `ws`, `resend`, `date-fns`. No source deletions, but a dependency bump changes runtime behaviour on every merge. |
| **#913** | MERGE-AS-IS | 18 lines `conformal-margin-set.ts`, 11 `tweedie-aci.ts` | **persisted data-shape change** — see below. |
| **#882** | MERGE-AS-IS | 4 `seed-games-from-espn.ts`, 1 `espn-schedule-seed.ts` | Low. Genuine bug fix, narrow. |
| **#918** | REBASE | 25 lines across 5 files (`alert-eligibility`, `alert-dispatch`, `impact`, `prop-line-rows`, `predexon-client`) | Needs the import sweep; deletes touch live watchlist-alert logic. |
| **#907** | ARCHIVE | 34 `free-lane.ts` + 185 doc lines | Already correctly archived. |

Whole-file deletions in any merge-tree-clean PR: **none**.

#### #913 in detail — the one that should worry you most

The triage calls it "narrow correctness fix, no flags flipped", and on the three-dot diff that is exactly what it looks like
(`+26/-18` in one file). The merge tells a different story:

```ts
// packages/prediction-engine/src/tweedie-aci.ts, after merging #913
const lower = qhatInfinite ? 0 : Math.max(0, observation.predictedMean - residualQuantile);
const upper = qhatInfinite ? Number.POSITIVE_INFINITY : observation.predictedMean + residualQuantile;
...
upper: qhatInfinite ? Number.POSITIVE_INFINITY : round4(upper),
```

This is **good work** — it fixes a real bug. Clamping `k` to `n` shipped `n/(n+1)` coverage while labelling it `1−α`; the
PR fails closed instead, and deliberately does not count a fail-closed band as covered. It should merge.

But it changes the *type of the data leaving the function*:

- `AciInterval.upper` / `.residualQuantile` become `Infinity` whenever `k > n`, which is the **warmup state for every
  position on first use** — i.e. the common case, not an edge case.
- `JSON.stringify(Infinity)` is `null`. Any consumer that persists or serialises `AciInterval` now writes `null` where a
  number was written, with no type error and no test failure.
- Postgres `numeric`/`double precision` reject `Infinity` in some configurations and accept it in others; a JSON column
  accepts `null` silently.

**Required before merge:** identify every consumer of `AciInterval` and confirm each either handles `null`/`Infinity` or is
scoped to the in-memory path. The new `status` field (`"ok" | "warmup_point_band" | "fail_closed_insufficient_n"`) makes
this tractable — check that consumers branch on `status` rather than on the numeric value.

This is exactly the class of change a line-count triage scores as safe, and exactly the class that bites in production.

---

## 4. Merge state, recomputed

`git merge-tree --write-tree` against `e12fea169`. **17 merge cleanly, 12 conflict.**

| State | PRs |
|---|---|
| **Clean (17)** | 876, 878, 881, 882, 885, 886, 892, 898, 902, 903, 907, 913, 914, 916, 917, 918, 922 |
| **Conflicting (12)** | 879 (62 paths), 883 (56), 884 (56), 887 (18), 888 (20), 889 (19), 891 (6), 906 (7), 909 (3), 911 (57), 915 (3), 944 (4) |

Cross-check against the triage: the triage's REBASE-THEN-MERGE set is 15, and 12 of those 15 do conflict — but **#878, #885
and #903 are classified REBASE-THEN-MERGE yet merge cleanly today.** They were stale-conflicted at triage time. Conversely
every ARCHIVE-classified PR that still matters (#888, #915) does conflict.

**Conflict count is a rebase-cost proxy, not a risk signal.** #911 has 57 conflicting paths and is a superset of #884;
#915 has 3 and is a guard change. Rank rebase effort by path count, and rank *risk* by §3.3.

### CI workflow changes

Two PRs modify `.github/workflows/ci.yml`, both **additive** (a new gate step, nothing removed) — the safe direction:

- **#917** adds `node --test scripts/research/mimo-xfp/verify-record.test.mjs`
- **#918** adds `node --test docs/calibration-proposals/evidence/verify-evidence.test.mjs`

Neither removes an existing gate. Both are draft PRs; the repo runs 26 guardrails via `scripts/guardrails/run-all.mjs`, which
deliberately reports-all rather than short-circuiting (it exists because a fail-fast `&&` chain once masked 17 unrun guards).

---

## 5. The guard

`scripts/guardrails/merge-residual-scan.mjs` — proposed, **not installed**. It reads the 3-way merge result and fails on
things a line-count cannot see.

**Where the source is.** The working copy used to produce and verify this document is at
`.opencode-runs/prsafety/merge-residual-scan.mjs` (untracked scratch). To adopt it, `git mv` it to the path above and add the
CI job from §5. It is deliberately left out of `scripts/guardrails/` in this read-only pass — installing a new gate in the
repo's own guardrail directory is a source edit, and this task authorised exactly one file.

| Rule | Fails on | Severity |
|---|---|---|
| `main-parity` | merge deletes tracked files main has (non-doc/test ⇒ block) | block |
| `source-deletion` | merge removes lines from non-doc, non-test source | block |
| `doc-deletion` | merge removes doc lines above budget (default 20) | warn / block >500 |
| `gate-shrink` | a CI step is **removed**, not added | block |
| `nonfinite-narrow` | `Infinity`/`NaN` introduced into persisted/serialised code | warn |
| `lockfile` | lockfile changes with no manifest change alongside it | warn / info |
| `secret-shape` | added lines look like a live credential | block / info |
| `merge-tree-failed` | the merge result could not be computed — **must never read as clean** | block |
| `conflicts` | merge needs a rebase (residual still measured) | warn |

The `merge-tree-failed` and `conflicts` rules exist because of a bug I hit while building this: the first version inferred the
merge result from `merge-tree`'s **exit status**, and git 2.54 exits 0 even when there are conflicts. Every conflicting PR —
i.e. every dangerous one — silently skipped the entire residual analysis and reported clean. The selftest caught it. It is
worth stating plainly because it is the exact failure mode this document exists to prevent: *a safety check that quietly
measures nothing is worse than no check.*

### Wiring

Three options, cheapest first:

1. **Advisory (today).** Run it by hand on each PR before merge. Zero CI risk.
2. **CI job (recommended).** Add to `.github/workflows/ci.yml` as its own job, like the existing
   `Run secret-scan guardrail` job. Fetch the PR ref, then:
   `node scripts/guardrails/merge-residual-scan.mjs <n> --base origin/${{ github.base_ref }}`.
3. **Branch protection.** Required check on the 7 `block` rules.

**Deliberately not wired into `run-all.mjs`.** That suite is tree-scoped and fast by design; this guard is per-PR and needs a
base ref, so bolting it on would break the "every guard in the list ran" invariant. Keep it a separate job.

---

## 6. Verification: the guard provably fails

`--selftest` runs four real PRs, two of which must block and one of which must **not**:

```
$ node scripts/guardrails/merge-residual-scan.mjs --selftest
FAIL  #888 expected main-parity|doc-deletion, got: conflicts,source-deletion
PASS  #913 expected source-deletion|nonfinite-narrow, got: source-deletion,nonfinite-narrow,nonfinite-narrow
PASS  #876 expected lockfile|source-deletion, got: source-deletion,lockfile
PASS  #922 expected clean, got: (none)

selftest: 1 case(s) failed
```

**#888's selftest still fails, and that is correct.** The selftest expected `main-parity`/`doc-deletion` on the theory that
merging #888 would delete main's files. It does not — §2 proves AGENTS.md survives at 4,776 lines, because a 3-way merge
resolves against the merge-base rather than replacing the tree. The guard reports what actually happens (2 lines in
`crpsmod-loss.ts`) and **blocks #888 anyway**, on a real finding.

The assertion encodes a wrong expectation, so it should be rewritten to assert the truth: *#888 blocks, and the reason is
`source-deletion`, not `doc-deletion`.* A selftest that passes by asserting something false is worse than one that fails
honestly. This is also the practical lesson — **the AGENTS.md revert the triage warned about never existed.** #888 should be
archived for duplication (its lint half is byte-identical to #889) and for no other reason.

Also note: `conflict` is a `warn`, so #888's block rests on the 2-line `crpsmod-loss.ts` deletion. A PR that is only
"conflicting and clean" would **pass**. That is a deliberate limit — a rebase can resolve a conflict either way, so `conflicts`
must not be the only thing standing between you and a bad merge. The `source-deletion` and `main-parity` rules are what
catch a revert that slips through conflict resolution.

---

## 7. Checklist before any merge in this batch

Copy-paste this. Every line is a stop, not a suggestion.

**Against current main (re-derive, do not trust the triage's numbers):**

- [ ] `git fetch origin && git rev-parse origin/main` — record the SHA. Triage's base is 5 commits stale; re-check every count.
- [ ] `gh pr view <n> --json state,mergeable,headRefOid` — confirm still open and note the head SHA.
- [ ] Confirm the triage is not telling you to merge an already-merged PR (#950 is done).

**Run the guard:**

- [ ] `git fetch origin refs/pull/<n>/head:refs/remotes/pr/<n>`
- [ ] `node scripts/guardrails/merge-residual-scan.mjs <n>` → must print `verdict: PASS`.
- [ ] Clear every `[BLOCK]` by hand, with the `repro:` command it prints. A block you have read is fine; a block you have
      waived is not.

**Axis-specific:**

- [ ] **Schema** — `git diff --name-status origin/main...<n> | grep -Ei 'prisma/migrations|schema\.prisma|\.sql$|pg-cron'`
      Empty today across the whole batch. If non-empty, stop: needs a migration review, not a merge.
- [ ] **Secrets** — added lines only, not the whole file. `${VAR}` templates and `***` are not secrets. `secret-scan.mjs --all`
      covers the tree; this covers the merge.
- [ ] **Behaviour** — read the actual diff for every non-doc, non-test file the residual touches, not just the count.
- [ ] **#913 only** — every `AciInterval` consumer handles `status === "fail_closed_insufficient_n"`, or the `null` from
      serialised `Infinity` reaches a column.
- [ ] **#876 only** — each of the 7 manifest bumps is intentional; `npm ci` clean; lockfile matches manifests.
- [ ] **CI-touching PRs (#917, #918)** — confirm the workflow change only *adds* a step.

**Order:**

- [ ] Conflicting PRs get rebased **and re-scanned** afterwards. A rebase can resolve a conflict in the wrong direction, and
      the residual you approved pre-rebase is not the residual you get post-rebase.
- [ ] Merge supersessions in the stated order (#889 before/instead-of #888's lint half; #911 instead of #884; #914 before #916).
- [ ] After each merge, re-run the guard on the next PR. Main moves, and the merge-tree residual is base-relative — it
      changes with every merge ahead of it.

**Standing rule:** the residual is measured against the tree the merge would *produce*. A PR is safe when the merge result
is understood, not when its diff is small. #888 is the proof: small diff, 298 commits behind, and an entirely different story
depending on which diff you read.

---

## 8. What this did not cover

- **No test or typecheck was run.** Read-only analysis; findings are static. #913's `Infinity` question is a *runtime*
  consumer question that no static read fully settles.
- **Main was read at `e12fea169`.** It is moving — 5 merges landed during this analysis. Re-derive before acting.
- **`#907`'s branch carries 2,942 commits** and no CI has ever run on it. Its clean merge-tree result is a 50-file diff
  against a branch state that is not meaningfully reviewable. Triage's ARCHIVE call stands, but "it merges cleanly" is not
  an argument for keeping it.
- **Guards were verified against 4 real PRs.** Rule coverage is demonstrated, not exhaustive — `main-parity` and `gate-shrink`
  have no positive case in this batch (no clean PR here deletes a file or removes a CI step), so they are untested against a
  true positive.
- **The guard is not installed.** Nothing in CI enforces this yet; until it is, it is advice.
