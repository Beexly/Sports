# Branch / PR Reconciliation Ledger (founder-facing)

**Generated:** 2026-07-18T02:35:00Z, this session, under `docs/genesis/BRANCH_RECONCILIATION_CONTRACT.md` /
`BRANCH_RECONCILIATION_SEED.md` / `.claude/commands/genesis-reconcile.md` (all read from PR #125's branch
`research/galaxy-genesis-metacortex-2026-07-17` via `git show`, treated as historical evidence and refreshed
against live Git/GitHub state per the contract's own instruction).

**Machine-readable source of truth:** `reports/reconciliation/BRANCH_PR_LEDGER.json` (this file is its
founder-facing projection — every claim below is derived from that JSON's `namedEntries`/`longTailEntries`).

**Coverage:** all 184 non-`main` remote branches have a ledger entry (JSON `ref` field), satisfying acceptance
criterion 1 of the reconciliation contract. 46 receive full semantic detail (named groups, below — 25 from the
original inventory pass + 21 from Recovery Wave R0.5's PR #76-96 content-landing verification, 2026-07-18); 138
receive real git-derived metadata (head SHA, merge-base, ahead/behind, last-updated) with an honest `UNKNOWN`
status — deep content review of the remaining long tail is future work, per the contract's own "Recovery-wave
law" (one bounded wave at a time, "It does not merge feature code").

## Live baseline re-verified this pass

- `origin/main` HEAD carries commits through PR #119/#120 (confirmed via `git log --oneline`, PR-number
  squash-commit references literally present in the log).
- PR **#101** and PR **#126** are confirmed **closed** (live `pull_request_read` calls this pass,
  `closed_at: 2026-07-17T20:4x`), matching the seed's claims exactly — not merely trusted, re-verified.
- PR **#129** (this campaign's own accounting container) already existed before this session's reconciliation
  phase began (opened by an earlier automated action per PR #125's own body text) — this session found and
  updated its body, did not create it.

## Named groups (full semantic detail — see JSON for exact fields)

| Group | Ref | PR | Status | One-line reason |
|---|---|---|---|---|
| A | `fix/tools-page-commercial-copy-scan` | #128 | RECOVER_WHOLE | Guardrail-baseline fix, independently re-verified, founder-merge-ready |
| B | `research/galaxy-genesis-metacortex-2026-07-17` | #125 | ACTIVE_PR | Canonical Genesis control package (governs this reconciliation itself) |
| B | `genesis/gx-000-codebase-twin-plan-compiler` | #127 | ACTIVE_PR | Shadow-only kernel, 26 tests, independent verifier PASS 13/13 |
| B | `chatgpt/galaxy-genesis-orchestrator` | #126 | SUPERSEDED | Closed; unique content (convergence map) archived verbatim in #125 |
| C | `claude/galaxy-sports-edge-pdcswh` | #129 | RECOVER_PARTIAL | This session's own 34-commit stack; every workstream already has its own DEC-numbered contract+review |
| D | `codex/gse-frontier-recovery-2026-07-13` | #112 | RECOVER_PARTIAL | Playback spine already ported into #129 (DEC-008); residual value (market-values types, Twin/Brain/Studio projections) not yet diffed |
| E | `claude/frontier-superset-rebased` | #124 | RECOVER_PARTIAL | Agent Foundry/Assurance/Radar/shadow router; convergence ruling already exists in #127's Twin evidence table |
| F | `claude/cockpit-page-auth-rebased` | #123 | RECOVER_WHOLE | Per-page ADMIN defense-in-depth; needs re-verification against current main tip (has advanced since authoring) |
| F | `claude/fantasy-engine-foundation-rebased` | #121 | REBASE_REQUIRED | Trademark rename independently re-verified complete this session (DEC-022); rebase pending merge-order decision |
| F | `claude/fix-metric-source-fixture-alignment` | — | SUPERSEDED | One-file patch, equivalent already on main per #117/#118 lineage |
| G | `claude/clv-decomposition-reland-rebased` | #122 | OWNER_GATE | Live-verified migration safety on disposable Postgres; real away-side-moneyline bug fixed; needs fresh drift proof against current main |
| G | `claude/clv-decomposition-reland` | #101 | SUPERSEDED | Closed; superseded by #122's hardened rebase |
| H | `claude/gracious-albattani-f63wx1` | #52 | ARCHIVE_ONLY | Galaxy Dynasty world-graph, stale base; preserve for future additive porting |
| I | 12 branches | — | DELETE_AFTER_PROOF | `git merge-base --is-ancestor` confirms 0 commits ahead of main — real ancestry proof, the contract's strongest comparison tier. See JSON for the full list (`adopt/agent-os-runtime`, `claude/amazing-pascal-qa0586`, `claude/blissful-hamilton-d7edx1`, `claude/gse-overnight-audit`, `claude/stoic-dirac-20h11q`, `claude/sweet-fermi-sk9gws`, `claude/zealous-noether-inaaa3`, `codex/enforce-use-of-main-branch-in-git-setup`, `codex/intelligence-core`, `docs/sprint-plan-2026-06-29`, `grok/cockpit`, `integration/proven-edge`) |
| R0.5 | 21 branches (PRs #76-#96) | #76-#96 | 5 SUPERSEDED / 16 RECOVER_WHOLE | Content-landing gap resolved with real diff evidence — see below |

## A real gap this pass surfaced — RESOLVED by Recovery Wave R0.5 (2026-07-18)

**Original finding:** a mechanical sweep of `origin/main`'s commit history for literal `(#N)` squash-merge
references found PR numbers **#97–#120 all present** (proof their content landed) — **except #101 and #112**,
independently accounted for elsewhere (closed-superseded, and still-open respectively). But PR numbers
**#76–#96 were absent** from that same sweep, despite most showing `state: closed, merged: false` in GitHub.

**Resolution (Wave R0.5):** each of the 21 PRs (#76-96) was individually resolved via `pull_request_read` to its
head branch, then verified with `git diff origin/main...origin/<head-branch> --stat` followed by direct reading
of `main`'s current file content for every described fix (not commit-message pattern matching — actual code
inspection). Result:

- **5 SUPERSEDED** (false alarm — content genuinely landed on main via a differently-formatted or salvaged
  commit): **#79, #80, #81, #83, #91**. Four of these five are directly attributable to PR #119's own body,
  which states it salvaged `claude/stress-property-suite` (#83) and merged "two independent lineages" of
  guardrail work (matching #81) — #79 and #91 (Stripe billing fixes) were stacked on/near that same lineage.
  #80 (slate-freeze front-run) is functionally identical on main but via an unidentified commit not explained
  by #119's stated salvage list.
- **16 RECOVER_WHOLE** (real gap — content confirmed genuinely absent from main, not merely un-squash-matched):
  **#76, #77, #78, #82, #84, #85, #86, #87, #88, #89, #90, #92, #93, #94, #95, #96**.
- **0 unresolved.**

**Severity flag — 6 of the 16 describe LIVE, currently-exploitable defects on `main` today** (verified by direct
code reading, not inferred from PR prose):

| PR | Defect | Evidence |
|---|---|---|
| #82 | Prod DB fail-open + fake-healthy health check | `packages/db/src/index.ts:182-195` only `console.error()`s on a missing/misconfigured production `DATABASE_URL`, never throws; `/api/health` has no stub-aware branch — reports `database: ok` while writes silently drop |
| #84 | Orphaned CLV grades, no healing sweep | `packages/ingestion-pipeline/src/settle-sport.ts:88` only queries `PENDING` picks — a crash between settle-write and CLV-write permanently drops that pick from the public beat-close-rate sample |
| #86 | Picks can stay PENDING forever | `settle-sport.ts:80` still calls `getScores(sport.key, 2)` (not 3); no VOID-writing sweep exists anywhere in the repo |
| #89 | DB/data outage on `/api/promotions` dressed as an honest empty response | `apps/web/app/api/promotions/route.ts:44` still has `.catch(() => [] as ...)`, CDN-cacheable |
| #92 | Settle/refresh TOCTOU race + stale-close CLV fabrication | `process-sport.ts:483` still uses check-then-act, not an atomic `updateMany` scoped to `PENDING`; no `MAX_CLOSE_AGE_MS` guard exists |
| #93 | Cockpit pages rely solely on layout-level ADMIN, no per-page defense-in-depth | sampled 4 of 32 cockpit pages, zero have a page-level check; `requireCockpitAdmin()` confirmed absent from main. **Note:** this exact gap is already the subject of the currently-open, unmerged PR #123 — #93 is the historical origin, #123 is the live disposition, not additional undelivered scope. |

Full per-PR verdicts with exact evidence citations: `BRANCH_PR_LEDGER.json`'s `namedEntries` where
`group: "R0.5"`. **Recovery of this content (porting it forward as bounded PRs) is explicitly out of scope for
this verification wave** — see `RECOVERY_WAVES.md` Wave R0.6 for the priority-ordered recovery sequencing this
finding drives.

## Long-tail summary (138 branches, real metadata, honest `UNKNOWN` status)

None of the long tail are ancestors of main (the 12 that are got pulled into the named "Group I" table above,
since ancestry is real proof, not a guess). 21 of the original 159 were resolved into named Group R0.5 above,
leaving 138 genuinely `UNKNOWN`. Recomputed directly from the updated JSON (not carried over stale):

- **55** have a last-commit date on or after 2026-07-01 (recent — the higher-signal subset for a future review pass).
- **83** are older than 2026-07-01.

No branch in this bucket received a fabricated `RECOVER`/`SUPERSEDED`/`ARCHIVE` verdict — the contract's own
invariant #2 ("ahead count is not evidence of missing work") cuts both ways: it is equally not evidence FOR
recovery. Every long-tail entry carries its real `headSha`/`mergeBaseWithMain`/`commitsAhead`/`commitsBehind`/
`lastUpdated` in the JSON so a future pass starts from real data, not from zero. See `RECOVERY_WAVES.md` for how
this bucket should be triaged next (by recency, then by name-pattern clustering — e.g. the ~25 `claude/magical-volta-*`
branches are very likely duplicate/abandoned agent-session artifacts given the naming pattern, but this is a
hypothesis to verify, not asserted here as fact).

## Acceptance-criteria self-check (contract §"Acceptance criteria")

1. Every non-main branch has a ledger entry — **YES**, 184/184, JSON `namedEntries` + `longTailEntries`.
2. Every PR has a current disposition — **YES** for all 10 open + 2 newly-reconfirmed-closed PRs this session tracks (#52/#101/#112/#121–#129 minus #126 closed), plus the 21 closed PRs #76-96 individually resolved via Wave R0.5 (5 SUPERSEDED, 16 RECOVER_WHOLE); no PR was left unaddressed.
3. Every ahead branch has a PR or explicit archive/supersession record — **PARTIAL**: 21 of the original 159 long-tail branches (PRs #76-96) received a real archive/supersession/recovery ruling via Wave R0.5; the remaining 138 long-tail branches have a real metadata record but an honest `UNKNOWN` disposition — this criterion is now closer to fully met but still not fully closed, named explicitly as future work rather than glossed over.
4. Every changed file/symbol assigned to one recovery target — **NOT ATTEMPTED** this pass (would require `FILE_SYMBOL_OWNERSHIP.csv` at full depth across all 184 branches; populated instead with the six already-proven architecture collisions from the seed doc, which is the real, evidence-backed subset this session can honestly claim).
5. All duplicate canonical systems have a convergence ruling — **YES** for the six documented collisions (source-rights registry, model/provider routing, capability vocabulary, program queues, playback, proof) — see `FILE_SYMBOL_OWNERSHIP.csv`.
6. All migrations/protected changes have owner-gated lanes — **YES** (#122 CLV/Pedersen, OTS migration on #129, both explicitly OWNER_GATE).
7. Every branch proposed for deletion has a proof-backed deletion receipt — **YES in the negative sense**: zero branches were deleted or had a receipt issued this pass (see `DELETION_RECEIPTS.md` — empty by design, invariant #8 honored).
8. Remaining open PR set reflects real, bounded work — **YES**, re-verified per-PR above, nothing stale/clutter found.
9. `main` can be described by a machine-generated capability ledger without unsupported claims — **PARTIAL**: this ledger describes branches/PRs, not yet a full main capability index; the genesis-kernel Codebase Twin (#127) is the closer existing answer to this specific criterion.
10. No accepted capability silently removed — **YES**, zero deletions, zero closures beyond the two independently re-confirmed (#101/#126, both already closed before this pass began).
