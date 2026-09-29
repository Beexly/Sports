# PR Backlog Triage — Beexly/Sports

**Generated:** 2026-09-29 · **Read-only analysis** (no merge/close/rebase/push/comment performed)
**Base of truth:** `origin/main` = `ebca9de011` (`SURF-14 … (#949)`, 2026-09-29 14:45:53 -0500)
**Method:** `gh pr view` (GraphQL) + local `refs/remotes/pr/*` fetched from `refs/pull/*/head`, verified SHA-identical to GitHub's `headRefOid` for all 30.

---

## Scope reconciliation (read this first)

The brief said "30 open PRs … +92,001 / -1,531 across 572 file touches, 17 drafts, 13 ready, 17 mergeable."

- The repo has **163 open PRs**, not 30. Total across all 163: **+640,428 / -16,444, 4,312 files, 126 drafts.**
- The "30" set is reproducible and was identified exactly: **all PRs with `createdAt >= 2026-09-21`** → **n=30, +81,581 / -1,536, 571 files, 17 drafts, 13 ready, 17 mergeable.** That matches the brief on 5 of 6 figures.
- The residual gap (+92,001 vs +81,581, 572 vs 571 files) is explained by the snapshot being taken **before #949 merged and before #950 opened**. #949 is `+11,342 / 5 files` merged and #950 is `+27 / -5 / 2 files` open; swapping #950 out and #949 in closes it.
- **Every classification below is scoped to those 30 PRs.** The other 133 open PRs were not triaged.

`git merge-tree --write-tree origin/main <pr-ref>` was used as an independent conflict oracle. It **agrees with GitHub's `mergeable` on 29 of 30**; the one disagreement (#885) is called out.

---

## Triage table

Legend — **M** = MERGE-AS-IS · **R** = REBASE-THEN-MERGE · **A** = ARCHIVE/CLOSE

| # | Title (abbrev) | Branch | +/− | Files | Draft | Merge state | Class | Evidence |
|---|---|---|---|---|---|---|---|---|
| 917 | port xFP research pre-reg + results | hermes/port-xfp-research | +19,676 | 20 | D | MERGEABLE | **R** | Zero file overlap with 914/916/918; 19 new paths absent from main; `merge-tree` CLEAN but 161 behind |
| 914 | port frozen-holdout verifier + factor specs | hermes/port-verifier-harness | +18,141 | 89 | D | MERGEABLE | **R** | keystone of port family; 88 new paths; CLEAN but 174 behind — merge first, then 916 |
| 918 | port rest of docs-cleanup-calib | hermes/port-docscleanup-rest | +10,617 | 54 | D | MERGEABLE | **R** | 44 new paths, 0 shared with 914/917; CLEAN; 161 behind |
| 907 | live-wip handoff audit reports | hermes/live-wip-2026-09-24 | +8,632 | 49 | D | MERGEABLE | **A** | **ahead=2,938** — branch carries whole divergent history, not a reviewable unit; 45 report files, 0 CI checks ever ran |
| 909 | complete ethandojo handoff composition | agent/ethandojo-handoff-v2 | +8,008 | 33 | R | DIRTY | **R** | 33 new files, **0 real changes to existing files**; only conflict is append-only ledger `IMPLEMENTED.md` |
| 944 | rotate signal-ledger shard by hour | hermes/shard-rotation | +2,975 | 30 | R | DIRTY | **R** | **genuine prod bug** (80k/118k rows silently dropped); fix verified absent from main; only 10 behind — cheapest rebase in backlog |
| 879 | adopt hermes doctrine/catalog/nflverse loaders | cursor/wire-port-contract-79e9 | +2,570 | 48 | R | DIRTY | **A** | **Superseded by #881** (all 5 #881 paths ⊂ #879; 11 files already identical on main); 19 conflicts |
| 916 | wire 4 papers into holdout scorecard | hermes/verifier-integrity-metrics | +1,698 | 10 | D | MERGEABLE | **R** | **contains #914's commits** (`--is-ancestor`); 85/89 shared files identical to #914 — merge *after* #914 |
| 884 | TeamRankings/research power-ratings wiring | mimo/wire-nfl-mlb | +1,576 | 55 | R | DIRTY | **R** | flags default-off; **superseded by #911** which contains it; 6 conflicts, 293 behind |
| 883 | calib+CLV: tail shrink, market_clv | mimo/calib-clv | +1,571 | 53 | R | DIRTY | **R** | 10 files already on main, 3 add/add conflicts; 86% identical to #884 — merge after 884/911 or split |
| 881 | adopt feature-store contract + catalog | wire/port-contract | +1,495 | 5 | D | MERGEABLE | **M** | 5 self-contained new files, 0 existing files touched, CLEAN; delivers what #879 also claims |
| 885 | text-to-event semantic alignment (1210.4854) | cursor/text-event-align | +674 | 3 | D | **DIRTY** | **R** | additive invent module, 3 new files; GitHub says CONFLICTING, `merge-tree` says CLEAN — **verify manually** |
| 902 | shadow calibration e-process scaffold | gse/eprocess-calib-shadow | +576 | 3 | D | **CLEAN** | **M** | only PR in backlog with zero failed checks; 3 new files, all additive/shadow |
| 891 | OpenCode Zen NFL/MLB calib + CLV | gse/opencode-nfl-mlb-cal | +531 | 9 | R | DIRTY | **R** | 8 new files, 2 conflicts (1 add/add on `FREE_MODEL_LANES.md`); low-risk additive |
| 906 | expose total drop reasons (WP24/C-86) | gse/wp24-c86-totals | +529 | 10 | D | DIRTY | **R** | 1 conflict (`scoring.ts`); self-reported 5/5 tests green |
| 898 | disabled MLB independent model shadow | gse/mlb-independent-model | +472 | 5 | D | **CLEAN** | **M** | CLEAN, zero failures, 3 new files, explicit null/publish guards |
| 887 | agent-safe #822 checkout health runbook | agent-safe-822-monitor-docs | +420 | 22 | R | DIRTY | **A** | 6 files already on main, 4 conflicts, **293 behind**; runbook content stale vs merged #942/#943 |
| 892 | markets steam/surprise (1301.0594) | cursor/markets-steam-surprise | +327 | 4 | R | DIRTY | **M** | `merge-tree` CLEAN despite GitHub DIRTY; 3 new files + 1 small edit; trust-gate reword already on main |
| 876 | bump production-deps (dependabot) | dependabot/…85aa58edd2 | +275 | 7 | R | MERGEABLE | **M** | standard Dependabot group bump, 7 files, CLEAN, 12 behind; isolated from the port family |
| 915 | fix trust-gate "Drew Lock" false positive | hermes/fix-trust-gate-surname | +216 | 2 | D | DIRTY | **A** | **net revert** — residual vs main is `-19` lines; `LOCK_PROPER_NOUN` + test file **already on main** |
| 878 | Cloud Agent env (Postgres+Redis) | cursor/cloud-agent-environment | +186 | 5 | D | MERGEABLE | **R** | mutually exclusive with #886 (same file, different design); pick one; 294 behind |
| 913 | fail-closed conformal quantile when rank>n | hermes/port-tcv-failclosed | +130 | 4 | D | MERGEABLE | **M** | 4 files, CLEAN, narrow correctness fix, no flags flipped |
| 922 | evening X sweep + competitive intel (docs) | grok/x-sweep-2026-09-26 | +126 | 3 | R | MERGEABLE | **M** | docs-only, 3 new files, no production surface touched |
| 903 | cite-eligible snapshot-like improves | gse/improves-cite-eligible | +34 | 5 | D | **CLEAN** | **R** | CLEAN + zero failures, but renames an exported type — needs import sweep before ready |
| 888 | AGENTS.md banned-phrase rewrites | ci/trust-gate-agents-md | +30 | 14 | R | DIRTY | **A** | **would delete 870 lines** of the 2026-09-27 docs-bucket reorg; its lint half is duplicated by #889 |
| 950 | SURF-16: #949's provenance guard was wrong | hermes-surf-16-provenance-fix | +27 | 2 | R | MERGEABLE | **M** | **0 behind main** (built on merged #949); fixes a guard that under-reported 35 vs 52; CI green |
| 889 | wave1 calibration lint unused-vars/prefer-const | ci/web-calibration-lint | +23 | 13 | R | DIRTY | **R** | pure lint fix, 4 conflicts; **superset of #888's lint half** — keep this one |
| 911 | fix 9 red tests in #884 (mock export) | hermes/fix-884-mock | +22 | 9 | D | MERGEABLE | **R** | **contains #884's commits** — 55/55 shared files identical; merge this *instead of* #884 |
| 886 | Cloud Agent env (stub-DB, no Docker) | cursor/setup-cloud-agent-env | +17 | 1 | D | MERGEABLE | **A** | superseded choice for #878 — 1 file, mutually exclusive, no independent value |
| 882 | unify ESPN externalId to odds-key form | cursor/c-85-espn-externalid | +7 | 4 | D | MERGEABLE | **M** | tiny, CLEAN, fixes a real third-fixture-shape bug |

## Authoritative counts (computed, not hand-summed)

| Class | Count | PRs |
|---|:--:|---|
| **MERGE-AS-IS** | **9** | 876, 881, 882, 892, 898, 902, 913, 922, 950 |
| **REBASE-THEN-MERGE** | **15** | 878, 883, 884, 885, 889, 891, 903, 906, 909, 911, 914, 916, 917, 918, 944 |
| **ARCHIVE/CLOSE** | **6** | 879, 886, 887, 888, 907, 915 |
| **Total** | **30** | all 30, no PR unclassified, no PR double-counted |

The borderline call, and why it went the way it did:

- **#903 → REBASE-THEN-MERGE.** It is GitHub-`CLEAN` with zero failed checks, which is why it looks mergeable. But it renames an exported type (`SituationSnapshotLike` → `SituationEventRecord`) and its own body warns "update imports if you used the old name." A type rename is not a rebase problem, but it is not a "merge as-is" problem either — it needs an import sweep across callers before the green CI on *this* branch means anything. **The one reclassification I would revisit** if the sweep comes back clean: promote #903 to MERGE-AS-IS.
- **#907 → ARCHIVE/CLOSE** despite being GitHub-`MERGEABLE`, because "mergeable" describes conflict state, not reviewability. Its branch carries 2,938 commits of divergent history and CI never ran a single check on it.

---

## Duplicate / supersession map

### Exact supersessions (one must be closed)
| Keep | Close | Proof |
|---|---|---|
| **#881** | **#879** | All 5 of #881's paths are present in #879; #879 adds 43 more files. 11 of #879's files are **byte-identical to main** already. Same PORT-CONTRACT deliverable. |
| **#911** | **#884** | `git merge-base --is-ancestor pr/884 pr/911` → true. 55/55 shared files have **identical hunks**. #911 = #884 + the mock-export fix for its 9 red tests. |
| **#916** | **#914 (ordering, not closure)** | `is-ancestor pr/914 pr/916` → true; 85/89 shared files identical. **Keep both** — #916 is the corrected whole. Merge #914 first or merge #916 alone. |
| **#889** | **#888 (lint half only)** | #888 = #889's 13 lint files + an `AGENTS.md` rewrite. 13/13 shared files **identical hunks**. |
| **#878 or #886** | one of the two | Both write `.cursor/environment.json`, mutually exclusive designs (Docker+Postgres vs stub-DB). Recommend **#878**. |

### Content-identical overlaps (not duplicates, but merge-order hazards)
- **#883 ↔ #884**: 38/44 shared files identical (86%). Both are the mimo calib/CLV fleet; **#883 also collides with #887 on 4/13**. Merge 884 → 911 → then 883, or split 883's `market_clv` from its tail-shrink.
- **#879 ↔ #911**: 10/34 shared files identical — #879 drags the same calibration lint edits as #911/#889. Another reason to close #879.
- **#914 ↔ #916 ↔ #881**: 2/2 shared files identical on `nflverse-releases.{ts,test.ts}`. Whichever verifier port lands first, the other must rebase.

### Port family (mutually exclusive by construction — verified 0 shared files)
`#914` (verifier core) · `#916` (scorecard on top of 914) · `#917` (xfp research) · `#918` (rest of branch) — **0 shared file paths across 914/917/918.** These are a hand-split of one ~406-commit-behind worktree, and they are correctly disjoint. **Merge order: 914 → 916 → {917, 918}.**

### Not duplicates
`#907`, `#944`, `#906`, `#891`, `#885`, `#898`, `#902`, `#922`, `#882`, `#913`, `#876`, `#950` each carry content no other open PR has (blob-level check: `newPath > 0` and `realChange` present).

---

## Two PRs that are actively harmful if merged

**#888 — would delete 870 lines of live documentation.**
Residual diff vs main is `AGENTS.md | 874 +---, 4 insertions, 870 deletions`. The deleted block is the **2026-09-27 docs-bucket reorg** (the `docs/research/<date>/` retirement table). #888's branch is 293 commits behind and predates that reorg; "merging" it silently reverts it. Its only unique value (the lint fixes) is already in #889.

**#915 — is a pure revert of an already-landed red-team fix.**
Residual diff vs main is `scripts/guardrails/trust-gate.mjs | 19 ---` — 19 deletions, zero additions. Main **already contains** `LOCK_PROPER_NOUN_SAFE_CONTEXT` and already has `scripts/guardrails/trust-gate.test.mjs`. #915 would strip the `GUARANTEED_CONTRACT_FIELD_FILE` exemption added 2026-09-27 for `packages/data-ingestion/src/nflverse/rows.ts`. Its own body concedes `guaranteed-valid` was "already reworded on `main`."

---

## Highest-value merge first (evidence-backed)

1. **#950** — 0 behind main, CI green, 27 lines. Fixes a guard that reported 35 defects when the real count is 52. Zero risk.
2. **#944** — the only *production data-loss* fix in the backlog: 80,000 of 118,402 ledger rows (32.4%) never written, silently, every tick. Verified the shard-rotation fix is **absent from main** (`signal-ledger-writer.ts` on main contains no `shard`/`hour` logic at all). Only 10 commits behind → cheapest rebase. Conflict is one ledger row.
3. **#882, #913, #922, #876** — small, clean, independent.

---

## Verification notes / caveats

- **#885 conflict disagreement:** GitHub reports `CONFLICTING/DIRTY`; `git merge-tree --write-tree origin/main refs/remotes/pr/885` exits 0 (clean). Likely a stale cached `mergeable` on GitHub's side, since #885 is 293 commits behind. **Re-check in the UI before acting.**
- **#907 `ahead=2,938`:** the branch carries a full divergent history rather than a reviewable delta. Its 49 files are 45 new handoff-audit reports + 4 edits, and **CI never ran a single check** on it. Nothing here is 8,632 lines of reviewed work.
- **All 30 refs verified** SHA-identical between local `refs/remotes/pr/<n>` and GitHub's `headRefOid`. No classification rests on a stale local ref.
- `mergeStateStatus=UNSTABLE` on 13 PRs reflects failing/pending CI, **not** conflicts. Those PRs are still REBASE-classed only where the rebase is the real blocker; the drafts additionally need review before they can merge at all.
- The 133 other open PRs (of which **102 are `claude/*` branches, 97 of those drafts**) are outside this scope and are a much larger backlog than the 30 triaged here.
