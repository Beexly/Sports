# WEEKLY SUMMARY — `engine/public-baseline-2026-10-24`

**Written:** 2026-10-28 01:06 CST (06:06Z), updated 01:20 CST after the `e071b4990` push
**Branch:** `engine/public-baseline-2026-10-24`
**HEAD:** `e071b49901e0849d9c53e3b71ce50b3b7127112d`
**Remote:** identical (`ahead/behind = 0 0`) — push confirmed against `origin` by `git rev-parse HEAD origin/...`

> This file did not exist before 2026-10-28. It was requested as "WEEKLY_SUMMARY.md" during Plan C
> (documentation closeout). It replaces no prior artifact; nothing was overwritten.

---

## 1. Build status — `public-baseline-2026-10-24`

| Layer | Status | Evidence |
|---|---|---|
| Code layer (committed + pushed) | **COMPLETE** | HEAD `e071b4990` == origin, `0 0` |
| Test sweep (14 directories) | **COMPLETE — green** | 311 files / 2,257 tests passed, exit 0 |
| Reasoning bridge citations | **COMPLETE — committed + pushed** | `e071b4990`, 3 files, `src/reasoning` 59/59 |
| Working tree | **NOT complete — 31 modified + 16 untracked under `packages/`** | `git status --porcelain -- packages/` |
| Seal artifact layer (`candidates/`) | **OPEN — needs founder call** | `candidates/` is untracked (`??`) |
| Blockers (Google Doc append, QB estimator) | **OPEN** | see §4 |

**Do not read "build complete" as "everything is committed."** The code that was pushed is green.
The working tree still carries real, uncommitted work (31 modified + 16 untracked under `packages/`),
and the seal artifact layer is deliberately parked. The arXiv reasoning-bridge citation corrections
*are* now committed and pushed (`e071b4990`) — they are no longer part of the dirty tree.

---

## 2. What landed in `a37bdae82`

Commit subject: `fix(coach-sim): non-divergent tau estimator + sinkhorn target allocation wiring`

Six files, 663 insertions / 178 deletions:

| File | Change |
|---|---|
| `src/gse-pre-seal/verify_engine.py` | Replaced the divergent `lambda = sigma^2/tau^2` fixed-point iteration with a single lightly-penalised fit (lam=2) plus one method-of-moments pass. The iteration collapsed to the zero vector and floored `tau^2` at `1e-6` — the provenance of `tau = 0.001` in the quarantined candidates. |
| `src/coach-sim/locked-projection.ts` | Routed injury-overlay reallocation through `sinkhornTargetAllocation`, so active-set shares are the column marginal of an entropy-regularised transport plan. Seal checks 0/1/2 unchanged. |
| `src/coach-sim/sinkhorn.ts` | New (187 lines). |
| `src/coach-sim/sinkhorn.test.ts` | New (218 lines). |
| `src/coach-sim/sinkhorn-targets.ts` | Rewritten (263 lines changed). |
| `src/coach-sim/weekly-cadence-orchestrator.ts` | One-line change. |

Verified by the commit's own message: `src/coach-sim` 7 files / 74 tests passed, including tau
recovery and mutated-tau rejection. Independently re-run this session:
`locked-projection.test.ts` 9/9 and `belichick-ablation.test.ts` 9/9.

---

## 2b. Reasoning bridge — committed and pushed as `e071b4990`

The Layer-2 Situational Reasoning bridge (`packages/prediction-engine/src/reasoning/arxiv-reasoning-bridge.ts`)
is implemented, tested green, **and now committed and pushed** as `e071b4990`
(`fix(reasoning): correct two fabricated arXiv citations in situational bridge`).
Three files, 48 insertions / 16 deletions:

| File | Change |
|---|---|
| `arxiv-reasoning-bridge.ts` | Header corpus count `2,179` → `2,446`. Two fabricated/incorrect citations replaced (see below). |
| `__tests__/arxiv-reasoning-bridge.test.ts` | 7 lines — assertions updated to the corrected premises. |
| `corpus-evaluator.ts` | 3 lines — doc comment / count alignment. |

**Citation corrections (both were real arXiv IDs pointing at unrelated papers):**

1. **Premise 7 — Acoustic Crowd Pressure & Referee Bias.** Cited `2608.01234`, which is a real ID
   belonging to an unrelated LLM self-evolution paper. Replaced with `2607.18922`, "Towards a
   reproducible cross-venue method for quantifying crowd noise in stadiums". The concept was narrowed
   honestly: crowd noise is measurable and interferes with communication/concentration; the
   *officiating skew* is an empirical inference and is now labelled as such, not attributed to a paper.
2. **Premise 8 — Circadian Travel Dysrhythmia.** Cited `2607.09876`, a real ID belonging to an
   unrelated camera-trap video-retrieval paper. No arXiv work supports a first-quarter jet-lag penalty,
   and the best evidence points the other way — medRxiv 2023 "Jet Lag Does Not Impact Football
   Performance" and the causal replication (PubMed 40481637) find no reliable time-zone effect.
   Relabelled `EQ-CIRCADIAN-001`, marked direction **CONTESTED**, retained only as a diagnostic flag.

**Verified this session:** `src/reasoning` — 13 test files, 59 tests, exit 0. So the corrections do not
break the bridge. Committing them is outstanding work, not incomplete work.

---

## 3. Test sweep — measured, not quoted

Two foreground runs, both exit 0:

| Run | Files | Tests |
|---|---|---|
| `src/decision` + `src/markets` | 75 | 618 |
| `src/experimental src/bayesian src/props-dfs src/ensemble src/injuries src/causal src/rl src/research src/metrics src/eval src/engine src/signals` | 236 | 1,639 |
| **Total** | **311** | **2,257** |

**Caveat:** this is 311 of the package's 1,090 test files. A full-package run was attempted three
times and never produced output — in the Hermes gateway shell, `background=true` kills vitest
before collection and the entire log comes back as the 19-byte string `stdin is not a tty`
(neither `< /dev/null` nor `winpty` fixed it). A full-package figure would need a foreground run
under the 600s cap, chunked. **No full-package pass/fail claim is made here.**

---

## 4. Open blockers (unchanged by this push)

| Blocker | Reason | To close |
|---|---|---|
| Google Doc append | Docs API not enabled in project 868513040414 | Enable API, or append manually |
| QB estimator re-run | `data/gse-dataset/current/` has only `injuries_2026.csv`; no 2024/2025 CSVs; `/opt/model/fit_qb_questionable2.py` absent | Supply CSVs + script; the `0.0947` constant stands unconfirmed |
| `candidates/` artifact commit | Sealed artifact; consolidation plan §3.5 reserves regeneration/commit to a founder call | Founder decision |

---

## 5. Stale records corrected this session

Each of these files now carries a dated `STATUS CORRECTION — 2026-10-28` block at its head; their
bodies are preserved as originally written.

| File | Stale claim corrected |
|---|---|
| `2026-10-25-overnight-completion.md` | "No commits, no pushes, no PRs" |
| `2026-10-26-finish.md` | "(uncommitted, no push)" |
| `2026-10-27-autonomous-blockers.md` | HEAD/origin = `32dd20878` |
| `2026-10-27-autonomous-completion.md` | "Local HEAD: `bba67aaa1`" / "local HEAD `32dd20878` == origin" |
| `2026-10-27-ocr-and-sinkhorn-final.md` | HEAD/remote = `c75d2707c` |
| `2026-10-27_174705-gse-consolidation-conflict-resolution.md` | "HEAD: `c75d2707c`"; D5 "Sinkhorn wiring uncommitted" now resolved |

---

## 6. Requested-but-not-found paths (recorded honestly)

Plan C named two targets that do not exist on this machine. Nothing was invented to satisfy them.

| Requested | Reality |
|---|---|
| `C:\Users\Garrett\.hermes\plans\2015-10-14\AGENTS.md` | The directory does not exist. `.hermes\plans` is flat: 8 `.md` files, no subdirectories. There is no `AGENTS.md` anywhere under `.hermes\plans`. The only `AGENTS.md` on the machine that matters is `C:\Users\Garrett\Sports\AGENTS.md` (19,079 lines, repo governance contract) — **not** a plan document and **not** edited here. |
| `WEEKLY_SUMMARY.md` | Did not exist and never existed in git history. Created fresh at `C:\Users\Garrett\.hermes\plans\WEEKLY_SUMMARY.md` (this file). |
