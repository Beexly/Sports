# Machine-side queue status — worktree & clone inventory, and at-risk work

**Scope:** every git worktree and every clone of this repo present on this machine (Windows, `C:\Users\Garrett`), and which of them hold work that exists nowhere on `origin` and would therefore be lost.
**Method:** read-only. `git worktree list`, `git fetch origin --prune` (refresh only), `git status --porcelain` per worktree, `git rev-list --left-right --count origin/main...<branch>`, `git for-each-ref --points-at` for push state, `git cat-file -e origin/main:<path>` for file existence, `gh pr list` for PR coverage. No file in the repo was edited, nothing committed, nothing pushed.
**Snapshot taken:** 2026-09-29 ~15:30–15:40 CDT.
**Reference point:** `origin/main` = `4611da083f12d3c8218716ebe236d0863286e9b0` ("SURF-16: the provenance guard from #949 was itself wrong (35 vs 52) (#950)"), confirmed live via `git ls-remote origin refs/heads/main` immediately after fetch.

---

## 1. Inventory — how many checkouts exist

### 1.1 Git roots (5 separate clones of this repo, not 1)

| Path | Kind | Origin | HEAD state | Evidence |
|---|---|---|---|---|
| `C:/Users/Garrett/sports` | **PRIMARY clone** | `Beexly/Sports` | 65 registered worktrees | `git worktree list \| wc -l` → 65 |
| `C:/Users/Garrett` | **Superrepo clone of the same repo** | `Beexly/Sports` | 10,769 tracked files, 586 dirty files, branch `Autonomous-Revenue-Engine` | `git -C /c/Users/Garrett rev-parse --show-toplevel` → `C:/Users/Garrett`; `git ls-files \| wc -l` → 10769 |
| `C:/Users/Garrett/XiaomiMiMoProjects/.mimo-sessions/2026-09-24/use any skills, tools, connectors, plugi/repo` | **3rd clone** | `Beexly/Sports` | 3 worktrees, all merged to main | `.git` files in the 9 `Sports-wt-wire*` dirs point at this path |
| `C:/Users/Garrett/Desktop/Sports-langfuse` | Stale clone | `Beexly/Sports` | last commit 2026-09-06, 312 MB `.git` | `git log -1` → `b50f18389 2026-09-06 Install Langfuse SDK for tracing` |
| `C:/Users/Garrett/Sports-local-backup-20260924` | 2nd clone, **different remote** | `Beexly/Sports-local-backup-20260924` (1 head) | `defd141` "backup: preserve Sports worktree pre-push state 2026-09-24" | `git remote -v` |

> The superrepo finding is the one most likely to be missed by a `Sports*` directory scan: **`C:\Users\Garrett` itself is a clone of `Beexly/Sports`**, so any `Sports-*` directory that is not itself a worktree silently resolves to the superrepo's `Autonomous-Revenue-Engine` branch. `git -C SportsDB rev-parse --show-toplevel` returns `C:/Users/Garrett`, not an error — a trap for any tooling that assumes "no `.git` means not a repo."

### 1.2 Worktrees in the primary clone (65)

- **38 clean** — nothing at risk.
- **27 dirty** — hold uncommitted work (table in §3.2).
- **21 are 1000+ commits behind main** — these are the re-rooted port branches. They share no history with main beyond the root commit:
  ```
  wire/port-contract: NO-COMMON-ANCESTOR (unrelated history) | root=4a7d07feb016a8218fa01b349ce901fd416718cf subject=Initial commit
  hermes/clv-decided-disclosure-20260920: NO-COMMON-ANCESTOR | root=4a7d07feb016...
  hermes/nfl-adv-metrics-2026-09-17: NO-COMMON-ANCESTOR | root=4a7d07feb016...
  hermes/v528-week1: NO-COMMON-ANCESTOR | root=4a7d07feb016...
  ```
  This is the mechanical cause of the "~406 commits behind" symptom: these branches were ported onto a fresh root, so `git rev-list --count` reports their entire history as "ahead" (2,164–3,043 commits) and "not merged," while almost all of their *content* is already in main.
- Staleness distribution (commits behind `origin/main`): **18 on main, 26 at 1–49 behind, 21 at 1000+**.
- One entry is already dead: `C:/Users/Garrett/AppData/Local/Temp/mainbase` is flagged **prunable** by `git worktree list`.

### 1.3 Worktree directories on disk that are NOT registered (9, all in the MiMo clone)

`git worktree list` in the primary clone does not see these, so any inventory built from it will miss them. They are linked worktrees of the MiMo clone, registered in that clone's `worktrees/` admin dir, not in the sports repo's.

| Directory | Branch | HEAD | Dirty |
|---|---|---|---|
| `Sports-wt-wire-2026-09-25` | `wire/continue-every-item-2026-09-25` | `ccdf84bb1` | **52 files (50 untracked)** |
| `Sports-wt-wire-2026-09-26` | `wire/continue-every-item-2026-09-26` | `80cd59f80` | 1 untracked |
| `Sports-wt-wire-2026-09-26-integrator` | `wire/every-item-2026-09-26-integrator` | `80cd59f80` | 0 |
| `Sports-wt-wire-2026-09-26-propsdfs` | `wire/props-dfs-consolidation-2026-09-26` | `63ddc0d18` | 4 untracked |
| `Sports-wt-wire-2026-09-26-inv-alias` | `wire/inv-alias-2026-09-26` | `80cd59f80` | 1 untracked |
| `Sports-wt-wire-2026-09-26-inv-dupes` | `wire/inv-dupes-2026-09-26` | `80cd59f80` | 1 untracked |
| `Sports-wt-wire-2026-09-26-inv-research` | `wire/inv-research-2026-09-26` | `80cd59f80` | 1 untracked |
| `Sports-wt-wire-2026-09-26-inv-root` | `wire/inv-root-2026-09-26` | `80cd59f80` | 1 untracked |
| `Sports-wt-wire` | `Autonomous-Revenue-Engine` (superrepo) | `724bfc71a` | 586 (the superrepo, not distinct work) |

**Command-count:** 65 registered + 9 unregistered = **74 checkout directories**, across **5 git roots**.

---

## 2. The headline: ~2.1 MB of source code exists nowhere on origin

`Sports-wt-wire-2026-09-25` holds **50 untracked files, 2,146,276 bytes (2,096 KB), that are not in `origin/main` and not in any origin ref.**

Evidence — blob not even in the object store, so there is no git-level recovery path:
```
blob sha of untracked packages/ingestion-pipeline/src/decision-core-bridge.ts: 98d14a89d5e9d360439a1fda7b76c6c3d46c09cb
-> blob NOT in object store: exists ONLY as a file on disk
```

The 50 files are named `*-bridge.ts` / `*-bridge.test.ts` pairs under `packages/ingestion-pipeline/src/` — one per domain, each with a test. Largest: `decision-core-bridge.ts` (113,637 B), `props-tracking-nfl-bridge.ts` (109,390 B), `experimental-risk-bridge.ts` (88,763 B), `ratings-strength-bridge.ts` (84,588 B), `markets-price-bridge.ts` (84,240 B), `calibration-quality-bridge.ts` (76,034 B), `ensemble-model-bridge.ts` (73,116 B), `metrics-core-bridge.ts` (67,931 B), `sizing-kelly-bridge.ts` (64,545 B), `props-tracking-nfl-bridge.test.ts` (65,525 B), `causal-effect-bridge.ts` (56,230 B) and ~38 more.

**The branch commits are safe; only the working files are not.** All three MiMo branch tips resolve into the sports clone and are ancestors of `origin/main`:
```
--- wire/continue-every-item-2026-09-25 tip=ccdf84bb17
    object EXISTS in sports repo clone
    -> IN origin/main (SAFE, already merged)
--- wire/continue-every-item-2026-09-26 tip=80cd59f806
    -> IN origin/main (SAFE, already merged)
--- main tip=80cd59f806
    -> IN origin/main (SAFE, already merged)
```
So the 2.1 MB is uncommitted work layered on already-merged history. It is invisible to `gh pr list`, invisible to the 163 open PRs, and a single `git worktree remove --force` or an `rm -rf` destroys it with no trace.

---

## 3. At-risk list

### 3.1 Unpushed branches whose commits exist nowhere on origin

Scan of all 123 local branches: **91 have ahead>0 but ARE on origin** (safe), **20 are fully contained in main** (safe), **10 are stranded**.

For each stranded branch I then diffed its file list against `origin/main` to separate "real work" from "already-merged look-alike."

| Branch | Local tip | Behind | Ahead | On origin? | Files unique to it (not in main) | Verdict |
|---|---|---|---|---|---|---|
| `wire/port-contract` | `7d09134dd` | 333 | 3021 | yes, but `origin` is at `2f7e00443` (differs) | **9** of 2,007 differing | Genuinely unique slice; **PR #881 open** |
| `hermes/clv-decided-disclosure-20260920` | `b791cb174` | 333 | 2891 | origin at `2b2b7804a` | **0** — `git rev-list --count origin/<same>..<local>` → 0 | **Already on origin.** Re-root artifact, no local-only commits |
| `hermes/nfl-adv-metrics-2026-09-17` | `f6658cb1d` | 333 | 2883 | origin at `f04127861` | **0** — 0 local-only commits | **Already on origin.** Re-root artifact |
| `hermes/v528-week1` | `3f09ae631` | 333 | 2431 | origin at `2d313557a` | **5** of 151 | Genuinely unique slice; **no PR** |
| `mimo/handinhand-20260925` | `99ee040ee` | 139 | 4 | **no origin ref at all** | 4 files | **Stranded**; 4 commits: ratings-bridge wire-up, D1–D4 review fixes, alias `fitAlpha` |
| `gse/consensus-bookset-reconstruct` | `93c90345e` | 274 | 3 | **no origin ref** | 7 files | **Stranded**; consensus→mint-time binding, independent-reasoning gate |
| `founder/week3-narrative-live-2026-09-27` | `b972dca36` | 48 | 2 | **no origin ref** | 11 files | **Stranded**; `narrative_contract` STORED→LIVE, `MODEL_VERSION` v5.2.7→v5.3.0 |
| `feat/situation-join-nflverse-espn` | `a03779590` | 287 | 1 | origin at `4b064b586` | **1** (`docs/ops/SITUATION_SIGNAL_PLUGINS.md`) | Near-duplicate of origin; 1 doc only |
| `cursor/wire-port-contract-79e9` | `e3af5b943` | 288 | 3 | origin at `c7cb0baf9` | **43** of 129 | Genuinely unique; **PR #879 open** |
| `hermes/ledger-0928` | `3fa66a0b7` | 11 | 1 | origin at `d1a6edcba` | **0** of 2 | Fully covered by origin (`#944 hermes/shard-rotation` is the same title) |

PR coverage check on the stranded set:
```
wire/port-contract                    881 wire/port-contract
cursor/wire-port-contract-79e9        879 cursor/wire-port-contract-79e9
hermes/v528-week1                     NO OPEN PR
feat/situation-join-nflverse-espn     NO OPEN PR
hermes/ledger-0928                    NO OPEN PR
mimo/handinhand-20260925              NO OPEN PR
gse/consensus-bookset-reconstruct     NO OPEN PR
founder/week3-narrative-live-2026-09-27 NO OPEN PR
hermes/clv-decided-disclosure-20260920 NO OPEN PR
hermes/nfl-adv-metrics-2026-09-17     NO OPEN PR
```

The 9 unique files in `wire/port-contract` are the only part not already in main:
```
docs/ops/ENGINE_DOCTRINE.md
docs/research/2026-09-21/wiring/IMPLEMENTED.md
docs/research/2026-09-22/full-tables/README.md
docs/research/2026-09-22/full-tables/magicsportsguy-cardio-index-week2.csv
docs/research/2026-09-22/full-tables/samhoppen-composite-power-ratings-week3.csv
packages/prediction-engine/src/__tests__/frontier-signal-catalog.test.ts
packages/prediction-engine/src/frontier-signal-catalog.ts
packages/verifier/src/__tests__/nflverse-releases.test.ts
packages/verifier/src/loaders/nflverse-releases.ts
```
The 43 unique files in `cursor/wire-port-contract-79e9` are mostly dated research CSVs under `docs/research/2026-09-23|24/full-tables/` plus 4 source modules (`1301-0594-information-incorporation-surprise`, `2108-02419v1-bbe-implementer`, `frontier-signal-catalog`, `nflverse-releases`) and a stray `wire/CQR-TEST`.

The 5 unique files in `hermes/v528-week1` are **code with no PR**:
```
apps/web/__tests__/admin-trigger-refresh-action.test.ts
apps/web/__tests__/jynx-or-live-proof.test.ts
apps/web/__tests__/ops-public-surface-truth-anon-hygiene.test.ts
apps/web/lib/admin/trigger-refresh-action.ts
apps/web/lib/admin/trigger-refresh.ts
```

### 3.2 Uncommitted work in registered worktrees (27 worktrees, 129 dirty files)

Only the worktrees whose dirty files are **absent from `origin/main`** are genuinely at risk — the rest are edits on top of pushed branches, recoverable from the pushed ref. Per-worktree check via `git cat-file -e origin/main:<path>`:

| Worktree | Branch | Dirty | Files not in main | Size | Lines | Nature |
|---|---|---|---|---|---|---|
| `Sports-wt-wire-2026-09-25` *(unregistered)* | `wire/continue-every-item-2026-09-25` | 52 | **50** | **2,146,276 B** | — | **Source code + tests, no git trace** |
| `Sports-round2` | `claude/sports-prediction-launch-rtiexc-r2` | 6 | 6 | 7,825,934 B | 1103 | **Vercel debug dumps** (`vercel-1000.json` 6.96 MB, `vercel-logs.json` 766 KB) + 3 `truth-*.json`. Large but logs, not source |
| `Sports` (primary) | `hermes-surf-16b` | 8–11 | 5 | 1,108,376 B | 385 | 1.07 MB data fixture + `docs/ops/provenance-decision-brief.md` (27 KB) |
| `Sports-flash-0918` | `hermes/2026-09-18-flash` | 7 | 5 | 38,561 B | 981 | **Code, and 4 files are STAGED** |
| `Sports-wt-wp24-drop` | `gse/wp24-c86-totals-drop-reasons` | 3 | 3 | 40,639 B | 681 | `pnpm-lock.yaml`/`pnpm-workspace.yaml` edits + scratch |
| `Sports-lane-bc-20260920` | `hermes/lane-bc-20260920` | 27 | 7 | 28,072 B | 690 | **Code, 7 new source/test files** |
| `Sports-wt-on-0927-B` | `overnight/2026-09-27-B` | 2 | 1 | 24,471 B | 472 | `docs/reasoning/SESSION-B-PROMPT.md`; branch **not on origin** |
| `Sports-wt-src` | `hermes/sources-rapidapi-registration` | 3 | 2 | 13,483 B | 415 | **Code**: new `rapidapi-sportsbook2-client.ts` + test |
| `Sports-wt-fix` | `hermes/fix-populator-defects` | 2 | 1 | 5,123 B | 138 | **Code**: signal-ledger-populator test; branch **not on origin** |
| `Sports-664-finish` | `claude/g2-effective-perf-gate` | 4 | 1 | 6,336 B | 172 | **Code**: perf effective-gate test; branch **not on origin** |
| `Sports-wt-night-lane2` | `mimo/night-lane2-2026-09-26` | 4 | 1 | 4,549 B | 100 | feature-catalog/module-ledger JSONL; branch **not on origin** |
| `Sports-wt-speckit` | `wt/speckit-fleet` | 5 | 1 | 3,639 B | 96 | `.cursor/` + `.opencode/` config |
| `Sports-fe93` | `hermes/fe-c93` | **33** | 2 | 3,936 B | 113 | 31 modified web pages, only 2 new |
| `Sports-ncaaf-cal` | `hermes/ncaaf-calibration-2026-09-04` | 3 | 1 | 2,797 B | 49 | CFB PBP shape doc |
| `Sports-wt-pickle` / `-mimo` / `-bunny` | `wt/opencode-*` | 2 each | 2 each | 2,846 B | 57 | Duplicated ops docs, same 2 files in 3 worktrees |
| `Sports-wt-mimo-1` | `opencode/wire-mimo-2026-09-23` | 4 | 1 | 1,728 B | 14 | `CLAIM_EVIDENCE_LEDGER` |
| `Sports-wt-wire-2026-09-26-propsdfs` *(unregistered)* | `wire/props-dfs-consolidation-2026-09-26` | 4 | **4** | 43,469 B | — | **2 new experimental modules + tests** |
| `Sports-eprocess`, `-glass-ledger`, `-improves-quote`, `-mlb-model`, `-nobet-regret` | various | 1–2 | 0–1 | 0 B | 0 | `.opencode-runs/` only — noise |

Notable details:

- `Sports-flash-0918` has **4 files staged in the index** (`venn-width-harness.ts` + test, the measurement doc, `measure-venn-widths.ts`). Staged-but-uncommitted files survive a `git checkout`/`git reset --hard` *less* predictably than untracked ones; they are also absent from main.
- The branch named in the task context, `hermes-surf-16-provenance-fix` (`47fe369cc`), **is on origin and has 0 local-only commits** — its 7 commits ahead of main are pushed, and it is not in main yet. Its worktree (`Sports`) does hold uncommitted files.
- The superrepo `C:/Users/Garrett` has 586 dirty files, but they are Hermes/agent skill installs (`.agents/skills/**`, `.claude/settings.json`, `.grok/config.toml`) — not Sports work. Its branch `Autonomous-Revenue-Engine` (`724bfc71a`) **is an ancestor of `origin/main`** (safe).

---

## 4. Recommended recovery order

Ranked by value-at-risk ÷ effort. Every step 1–3 is a copy or a push of work that is the only copy on this machine.

**1. `Sports-wt-wire-2026-09-25` — 2.1 MB, 50 files, no git trace.** Highest value and the most fragile item in the queue: 50 untracked `*-bridge.ts` source+test files whose blobs are not in the object store. Do this first, before any worktree cleanup. Cheapest safe action is a copy out of the tree (e.g. `robocopy` to a path outside any worktree), then commit onto a new branch off `origin/main` and open a PR. Value: it is the largest coherent body of unrecovered implementation work on the machine.

**2. Branches with real unpushed commits and no PR** — recover before anything is pruned:
- `hermes/v528-week1` — 5 unique files of **working code** (`apps/web/lib/admin/trigger-refresh*.ts` + 3 tests), no PR. Newest-to-oldest is irrelevant; the code is the value.
- `mimo/handinhand-20260925` — 4 commits, no origin ref at all, ratings-bridge live path.
- `gse/consensus-bookset-reconstruct` — 3 commits, no origin ref, consensus mint-time binding.
- `founder/week3-narrative-live-2026-09-27` — 2 commits, no origin ref, narrative STORED→LIVE.

**3. Uncommitted code in registered worktrees, by size of genuine new code:**
- `Sports-lane-bc-20260920` — 7 new files / 690 lines (`line-archive-freshness.ts`, `waitUntil.ts`, `simulated-column-denylist.ts`, `pick-tier.ts`, 2 lane tests). Branch is on origin, so only the 7 files are at risk.
- `Sports-wt-src` — new `rapidapi-sportsbook2-client.ts` + test, 415 lines.
- `Sports-wt-fix` — new signal-ledger-populator test; **branch not on origin**, so both the files and the branch need pushing.
- `Sports-664-finish` — new perf effective-gate test; **branch not on origin**.
- `Sports-flash-0918` — 981 lines, 4 files staged; recover the index first.
- `Sports-wt-wire-2026-09-26-propsdfs` — 2 new experimental modules + tests (43 KB).

**4. `wire/port-contract` / `cursor/wire-port-contract-79e9`** — already have PRs #881 and #879, so the branches are not lost. Remaining value is the 9 + 43 unique files that the PRs do not carry (mostly dated research CSVs and 4 modules). Lowest urgency: recovering the branch costs nothing because the PRs already hold it. Port these files onto a fresh branch off main rather than resurrecting the re-rooted histories.

**5. Safe to ignore (verified, not inference):**
- `hermes/clv-decided-disclosure-20260920`, `hermes/nfl-adv-metrics-2026-09-17` — 0 local-only commits; content already on origin.
- `hermes/ledger-0928` — 0 of 2 files unique; covered by PR #944.
- Superrepo `Autonomous-Revenue-Engine` and `claude/signal-architecture-rebuild-bq7l8i` (`724bfc71a`) — ancestors of `origin/main`; 586 dirty files are agent-skill installs, not Sports work.
- MiMo clone's 3 branches — all tips in `origin/main`.
- `Sports-eprocess`, `-glass-ledger`, `-improves-quote`, `-mlb-model`, `-nobet-regret` — `.opencode-runs/` scratch only.
- `Sports-round2` — 7.8 MB is Vercel logs; low value despite the size.
- `C:/Users/Garrett/AppData/Local/Temp/mainbase` — already prunable; safe to remove.

**Do not do until steps 1–3 are done:** `git worktree remove` on any of the 74 directories, `git clean -fdx` in any of them, or the `/simplify`-style cleanup that prunes worktrees with unpushed work. `git worktree prune` alone is safe (it only drops admin entries for already-deleted directories) and will clear `mainbase`.

---

## 5. What was not checked

- No DB access: no `DATABASE_URL`, no `psql`, and the local `neonctl` is the Neon platform CLI, not a SQL client. Claims in dirty worktree files about row counts (e.g. "84,500 → 0") were **not** verified against a database.
- The 21 re-rooted branches were assessed by **file existence in `origin/main`**, not by content diff. A file can exist in main with different contents; the unique-file counts in §3.1 are therefore a lower bound on divergence, not an exact measure.
- Dirty-file byte counts are disk size, not diff size; large JSON fixtures inflate them.
- Six Cursor Cloud Agents are already working the odds blackout, PR backlog triage, the provenance fix decision, the `.cursor` environment conflict, the deploy-lag audit, and duplicate-logic consolidation. This report deliberately covers none of those; overlap to avoid is the PR *triage* (the PR-coverage column here is a lookup used to classify at-risk branches, not a re-triage of the backlog).
