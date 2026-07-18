# Deletion Receipts

**Status: 12 receipts issued (2026-07-18), zero branches deleted.** Per `docs/genesis/
BRANCH_RECONCILIATION_CONTRACT.md` invariant #8 ("No branch deletion without a deletion receipt. The receipt
must prove all unique useful changes are merged, deliberately archived, or explicitly rejected with reasons."),
the 12 receipts below are the required proof step. **A receipt authorizes nothing by itself** — branch
deletion is an irreversible action this agent does not perform under any circumstance without explicit
founder instruction, per every standing directive of this campaign. Issuing the receipt now (rather than
leaving it as an unactioned "candidate," the prior state of this document) closes the audit-trail gap the
contract's invariant #8 exists to prevent: a founder who later says "delete these" should not have to
re-derive the proof — it is already here, dated and evidenced.

## 12 receipts — pure ancestors of `origin/main`, re-verified 2026-07-18

Each branch below was independently re-verified this pass (not inherited from the earlier candidate list
without re-checking) via `git fetch origin` + `git merge-base --is-ancestor <branch> origin/main` (returns
true for all 12) + `git rev-list --count origin/main..<branch>` (returns `0` for all 12) — the contract's own
strongest comparison-method tier (#1, exact commit ancestry), not an inference from branch-ahead counters
(invariant #2 explicitly forbids treating those as evidence on their own).

**What "0 commits ahead of `origin/main`, ancestor=true" proves:** every commit reachable from the branch tip
is already reachable from `main`'s current tip. There is no tree state, file content, or history on the
branch that does not already exist on `main`. This is the mechanical, exhaustive proof invariant #8 requires
— not a sampled diff, not a file-count heuristic, but full commit-graph ancestry.

| # | Branch | Head SHA | Ancestor of `main` | Commits ahead | Disposition |
|---|---|---|---|---|---|
| 1 | `adopt/agent-os-runtime` | `4c1c31cd` | YES | 0 | All content merged. Safe to delete once founder authorizes. |
| 2 | `claude/amazing-pascal-qa0586` | `aa1630b5` | YES | 0 | All content merged. Safe to delete once founder authorizes. |
| 3 | `claude/blissful-hamilton-d7edx1` | `d1ce2732` | YES | 0 | All content merged — this is the de-paywall pivot + `postinstall: prisma generate` fix branch named in `docs/strategy/BRANCH_RECONCILIATION.md` §1 as merging to `main` first during a prod firefight; its ancestry confirms that merge completed. Safe to delete once founder authorizes. |
| 4 | `claude/gse-overnight-audit` | `4082c2f9` | YES | 0 | All content merged. Safe to delete once founder authorizes. |
| 5 | `claude/stoic-dirac-20h11q` | `d7be9eb5` | YES | 0 | All content merged. Safe to delete once founder authorizes. |
| 6 | `claude/sweet-fermi-sk9gws` | `9198f20f` | YES | 0 | All content merged. Safe to delete once founder authorizes. |
| 7 | `claude/zealous-noether-inaaa3` | `48c41e35` | YES | 0 | All content merged. Safe to delete once founder authorizes. |
| 8 | `codex/enforce-use-of-main-branch-in-git-setup` | `3a381d4c` | YES | 0 | All content merged. Safe to delete once founder authorizes. |
| 9 | `codex/intelligence-core` | `30f8c455` | YES | 0 | All content merged. Safe to delete once founder authorizes. |
| 10 | `docs/sprint-plan-2026-06-29` | `9e739b38` | YES | 0 | All content merged. Safe to delete once founder authorizes. |
| 11 | `grok/cockpit` | `49bc81eb` | YES | 0 | All content merged. Safe to delete once founder authorizes. |
| 12 | `integration/proven-edge` | `5687b411` | YES | 0 | All content merged. Safe to delete once founder authorizes. |

**Invariant #8 disposition for all 12: "merged."** No unique useful change is being archived or rejected —
by definition of 0-commits-ahead ancestry, there is nothing on any of these 12 branches that isn't already on
`main`.

**OWNER GATE — this receipt is proof, not authorization.** Deleting these 12 branches on GitHub is a
founder action (`git push origin --delete <branch>` or the GitHub UI), never performed by this agent.
Re-verify ancestry immediately before deleting if significant time has passed since 2026-07-18, since a
force-push or history rewrite on any of these refs (unlikely, but not impossible) would invalidate this
receipt.

## No other deletions proposed

Every other branch this pass touched (the 25 named-group entries, the 159 long-tail entries) is either an
active PR, an owner-gated protected-zone lane, or an honestly `UNKNOWN`/still-being-triaged-status branch
(R11.5's ongoing long-tail work; 114+ of 138 individually evidenced as of DEC-052, several genuinely valuable
RECOVER_WHOLE and pre-authorized cherry-pick candidates named — see `RECOVERY_WAVES.md` and
`docs/frontier/DECISION_REGISTER.md` DEC-046 through DEC-054). None of those qualifies for a deletion receipt
under the contract's invariant #1 ("Improve, do not remove. Nothing is deleted, closed, or declared obsolete
until its unique value is proven absent or assigned elsewhere.") — several are the opposite of deletion
candidates; they are recovery candidates.
