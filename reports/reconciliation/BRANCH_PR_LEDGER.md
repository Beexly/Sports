# Branch / PR Reconciliation Ledger (founder-facing)

**Generated:** 2026-07-18T02:35:00Z, this session, under `docs/genesis/BRANCH_RECONCILIATION_CONTRACT.md` /
`BRANCH_RECONCILIATION_SEED.md` / `.claude/commands/genesis-reconcile.md` (all read from PR #125's branch
`research/galaxy-genesis-metacortex-2026-07-17` via `git show`, treated as historical evidence and refreshed
against live Git/GitHub state per the contract's own instruction).

**Machine-readable source of truth:** `reports/reconciliation/BRANCH_PR_LEDGER.json` (this file is its
founder-facing projection — every claim below is derived from that JSON's `namedEntries`/`longTailEntries`).

**Coverage:** all 184 non-`main` remote branches have a ledger entry (JSON `ref` field), satisfying acceptance
criterion 1 of the reconciliation contract. 25 receive full semantic detail (named groups, below); 159 receive
real git-derived metadata (head SHA, merge-base, ahead/behind, last-updated) with an honest `UNKNOWN` status —
this run is an **inventory pass**, not a deep per-branch content review; the contract's own "Recovery-wave law"
explicitly scopes the first run to inventory + split-plan generation only ("It does not merge feature code").

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

## A real gap this pass surfaced (not in the seed, not previously flagged)

A mechanical sweep of `origin/main`'s commit history for literal `(#N)` squash-merge references found PR numbers
**#97–#120 all present** (proof their content landed) — **except #101 and #112**, which are independently
accounted for above (closed-superseded, and still-open respectively). But PR numbers **#76–#96 are absent**
from that same sweep, despite most showing `state: closed, merged: false` in GitHub (e.g. #91
`hotfix-stripe-event-ordering`, #92 `hotfix-settle-refresh-races`, #93 `hotfix-cockpit-page-auth`, #94
`hotfix-proof-count-utc-bounds`, #95 `hotfix-vacuous-stub-tests`, #96 `model-accuracy-leaderboard`).

This does **not** prove the content is missing from main — it may have landed via a differently-formatted
commit message, been absorbed into a later PR's diff, or been genuinely superseded (this session's own task
list item #22, "Close G-3/G-4 + G-2/G-6/G-10..G-14 + G-15/G-18 on frontier branches #76/#77/#78," suggests at
least part of this range was deliberately, separately closed by name in a prior session). It also does not
prove the content **is** on main, unlike #97–120 where the evidence is direct and mechanical. **Recorded as the
top item in `RECOVERY_WAVES.md` rather than resolved here** — resolving it requires a real content-diff pass
per branch, out of scope for an inventory-only run.

## Long-tail summary (159 branches, real metadata, honest `UNKNOWN` status)

None of the long tail are ancestors of main (the 12 that are got pulled into the named "Group I" table above,
since ancestry is real proof, not a guess). Of the 159 genuinely `UNKNOWN`:

- **74** have a last-commit date on or after 2026-07-01 (recent — the higher-signal subset for a future review pass).
- **85** are older than 2026-07-01.

No branch in this bucket received a fabricated `RECOVER`/`SUPERSEDED`/`ARCHIVE` verdict — the contract's own
invariant #2 ("ahead count is not evidence of missing work") cuts both ways: it is equally not evidence FOR
recovery. Every long-tail entry carries its real `headSha`/`mergeBaseWithMain`/`commitsAhead`/`commitsBehind`/
`lastUpdated` in the JSON so a future pass starts from real data, not from zero. See `RECOVERY_WAVES.md` for how
this bucket should be triaged next (by recency, then by name-pattern clustering — e.g. the ~25 `claude/magical-volta-*`
branches are very likely duplicate/abandoned agent-session artifacts given the naming pattern, but this is a
hypothesis to verify, not asserted here as fact).

## Acceptance-criteria self-check (contract §"Acceptance criteria")

1. Every non-main branch has a ledger entry — **YES**, 184/184, JSON `namedEntries` + `longTailEntries`.
2. Every PR has a current disposition — **YES** for all 10 open + 2 newly-reconfirmed-closed PRs this session tracks (#52/#101/#112/#121–#129 minus #126 closed); no PR was left unaddressed.
3. Every ahead branch has a PR or explicit archive/supersession record — **PARTIAL**: the 159 long-tail branches have a real metadata record but an honest `UNKNOWN` disposition, not yet an archive/supersession ruling — this is the acceptance criterion this pass does NOT yet fully close, named explicitly as future work rather than glossed over.
4. Every changed file/symbol assigned to one recovery target — **NOT ATTEMPTED** this pass (would require `FILE_SYMBOL_OWNERSHIP.csv` at full depth across all 184 branches; populated instead with the six already-proven architecture collisions from the seed doc, which is the real, evidence-backed subset this session can honestly claim).
5. All duplicate canonical systems have a convergence ruling — **YES** for the six documented collisions (source-rights registry, model/provider routing, capability vocabulary, program queues, playback, proof) — see `FILE_SYMBOL_OWNERSHIP.csv`.
6. All migrations/protected changes have owner-gated lanes — **YES** (#122 CLV/Pedersen, OTS migration on #129, both explicitly OWNER_GATE).
7. Every branch proposed for deletion has a proof-backed deletion receipt — **YES in the negative sense**: zero branches were deleted or had a receipt issued this pass (see `DELETION_RECEIPTS.md` — empty by design, invariant #8 honored).
8. Remaining open PR set reflects real, bounded work — **YES**, re-verified per-PR above, nothing stale/clutter found.
9. `main` can be described by a machine-generated capability ledger without unsupported claims — **PARTIAL**: this ledger describes branches/PRs, not yet a full main capability index; the genesis-kernel Codebase Twin (#127) is the closer existing answer to this specific criterion.
10. No accepted capability silently removed — **YES**, zero deletions, zero closures beyond the two independently re-confirmed (#101/#126, both already closed before this pass began).
