Removes `synchronize` from `neon_workflow.yml`'s pull_request triggers. One line, and the largest single line in the Neon bill stops growing.

**What it was doing:** `synchronize` fires on every push to an open PR. Each firing created a preview branch held 14 days (deleted only on `closed`). With 35 open PRs being actively pushed to, the measured operation log shows ~10.6 creations/day, 46 already gone.

**Nothing read those branches.** The migrate step and schema-diff action are commented out, and no other workflow references `db_url`. I re-read the workflow on main to confirm both halves before changing anything.

**Why it was the biggest item:** `docs/ops/cost-neon.md` measures Sept 1-29 at **$157.86**, reconciling to the cent. Branch-hours are **$61.95 — 39%, the largest line.** An hour-by-hour simulation of the 38 branches that still exist accounts for only 3,916 of 29,737 excess branch-hours, so **87% of the branch charge is churn, not standing state.** This line is the churn.

**Safe to land:** branches are still created on `opened`/`reopened`, so a new PR still gets one. The `closed` trigger still deletes, so no new orphans. What stops is the duplicate-per-push.

**If you re-enable the migration steps:** they need the branch to match the PR head, which is what `synchronize` was for. Re-add it *in the same commit* that uncomments the migration. The file says this where someone would be tempted.

**Not done:** the 35 existing branches still need deleting for the $8.16 standing-state portion — each maps to a still-open PR.

**Not verified:** the actual invoice. No billing endpoint is reachable from here, so the decomposition is list-price arithmetic against measured usage.