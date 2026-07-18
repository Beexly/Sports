# Deletion Receipts

**Status: empty by design.** Zero branches were deleted, and zero deletion receipts were issued, during this
reconciliation pass. Per `docs/genesis/BRANCH_RECONCILIATION_CONTRACT.md` invariant #8 ("No branch deletion
without a deletion receipt. The receipt must prove all unique useful changes are merged, deliberately archived,
or explicitly rejected with reasons.") and the Recovery-wave law's own scoping of a first run to inventory
only, this pass produces **candidates**, not receipts.

## Deletion-receipt candidates identified this pass (not yet actioned)

The 12 branches below are pure ancestors of `origin/main` (`git merge-base --is-ancestor <branch> origin/main`
returns true; 0 commits ahead) — the contract's own strongest comparison-method tier (#1, exact commit
ancestry). This is real, mechanical proof, not an inference from branch-ahead counters (which the contract's
invariant #2 explicitly forbids treating as evidence).

| Branch | Head SHA prefix | Evidence |
|---|---|---|
| `adopt/agent-os-runtime` | see `BRANCH_PR_LEDGER.json` | 0 commits ahead of `origin/main` |
| `claude/amazing-pascal-qa0586` | see JSON | 0 commits ahead |
| `claude/blissful-hamilton-d7edx1` | see JSON | 0 commits ahead |
| `claude/gse-overnight-audit` | see JSON | 0 commits ahead |
| `claude/stoic-dirac-20h11q` | see JSON | 0 commits ahead |
| `claude/sweet-fermi-sk9gws` | see JSON | 0 commits ahead |
| `claude/zealous-noether-inaaa3` | see JSON | 0 commits ahead |
| `codex/enforce-use-of-main-branch-in-git-setup` | see JSON | 0 commits ahead |
| `codex/intelligence-core` | see JSON | 0 commits ahead |
| `docs/sprint-plan-2026-06-29` | see JSON | 0 commits ahead |
| `grok/cockpit` | see JSON | 0 commits ahead |
| `integration/proven-edge` | see JSON | 0 commits ahead |

**Why no receipt was written even for these:** a genuine deletion receipt, per the contract, should be issued
as its own explicit, reviewable step — not silently bundled into an inventory pass, so that branch deletion
(an irreversible action outside this agent's authority to perform without explicit instruction, and never
performed by this agent regardless) has its own clear audit trail separate from "we did an inventory." Writing
the receipt is a cheap, low-risk next action; actually deleting the branches remains the repository owner's
decision and action.

## No other deletions proposed

Every other branch this pass touched (the 25 named-group entries, the 159 long-tail entries) is either an
active PR, an owner-gated protected-zone lane, or an honestly `UNKNOWN`-status branch pending dedicated review.
None qualifies for a deletion receipt under the contract's invariant #1 ("Improve, do not remove. Nothing is
deleted, closed, or declared obsolete until its unique value is proven absent or assigned elsewhere.").
