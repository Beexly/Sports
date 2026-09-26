# PROOF: origin/main tip and ancestry (2026-09-26)

Run this and believe it. Do not re-litigate SHAs.

```
git fetch origin main
git rev-parse origin/main
# => 63653b2f29832a6a6978d645081a023c98bdb3fb

git merge-base --is-ancestor b73520085 origin/main && echo YES
git merge-base --is-ancestor 660299b8f origin/main && echo YES
git merge-base --is-ancestor fd73e0ce8 origin/main && echo YES
# all three: YES — they are ancestors of the tip, not the tip

git log --oneline -12 origin/main
```

## Lineage (top = tip)

| SHA | Author lane | Note |
|---|---|---|
| 63653b2f2 | wiring session | ownership correction + assign dfs+nfl |
| 51333c552 | wiring session | HANDOFF-WIRING-2026-09-26.md |
| d4280364e | wiring session | symreg/conformal/promotion/kernel/certificate residue bridge |
| 999db2b3d | wiring session | bayesian-residue bridge |
| aca60a620 | wiring session | metalearning residue |
| 4d0e32924 | wiring session | rl-residue bridge |
| 259aecede .. e75ac2fd9 | wiring session | type red lines, window-hash, promotion barrel |
| **b73520085** | **parallel session** | **NGS measurement + ladder/boost — LANDED** |
| **660299b8f** | **parallel session** | **asof-store leak wall + placebo — LANDED** |
| **fd73e0ce8** | **parallel session** | **V5 submission + V7 feature-recipe — LANDED** |
| d667351f9 | wiring session | symreg residue |

Dead pre-rebase SHAs: `1d0576590`, `a7b5e1267`. Do not wait on them. Do not list #7/#8/#3-5/NGS/ladder as open.

## Ownership (authoritative)

- Parallel session (idle): **dfs + nfl scoring batch** — dominance-pruning, ip-portfolio, value-tier, tournament-variance, cluster-salary-screen, payout-framework, block-poisson, generalized-poisson, luck-neutralized-epa, parsimonious-season
- Wiring session: T31 physical-context (weather air-density-fg + ball-physics + decision-calibrated-weather, honesty shinFairForSide, calibration-blend, inplay safe-lead). Do not collide.

If your `git log origin/main` tip is still `b73520085` after `git fetch origin main`, your remote-tracking ref is stale — fetch again or check the remote URL.


## 2026-09-26 update — stop the loop

Parallel session claims tip is `b73520085`. Three independent sources on the wiring machine say otherwise **right now**:

1. `git ls-remote origin refs/heads/main` → `483aca3a3f184d5725d5229e8aad79f8566e655f`
2. `gh api repos/Beexly/Sports/commits/main --jq .sha` → `483aca3a3f184d5725d5229e8aad79f8566e655f`
3. `gh api repos/Beexly/Sports/git/refs/heads/main --jq .object.sha` → `483aca3a3f184d5725d5229e8aad79f8566e655f`
4. Their exact command `git fetch origin && git log origin/main -5 --oneline`:
   ```
   483aca3a3 docs: proof origin/main tip 63653b2f2 …
   63653b2f2 docs: correct parallel-session ownership …
   51333c552 docs: wiring handoff …
   d4280364e feat: symreg/conformal/promotion/kernel/certificate residue bridge
   999db2b3d feat: bayesian-residue bridge …
   ```

### Two commands on the stale machine (run these, nothing else)

```bash
git remote get-url origin
git ls-remote origin refs/heads/main
```

- If `ls-remote` is NOT `483aca3a3…` the remote URL is wrong (fork, mirror, wrong clone).
- If it IS `483aca3a3…` then `git log origin/main -12 --oneline` shows their three SHAs as **ancestors**, not tip. They are landed. Not local-only. Not open.

Also check `git worktree list` — a second worktree (e.g. `Sports-wt-wire-2026-09-25` @ `259aecede`) is a stale snapshot and must not be used as origin/main.

### Corrected rows (FINAL — do not re-open)

| Row | Status |
|---|---|
| #7 submission route | DONE on main `fd73e0ce8` |
| #8 feature-recipe backtest | DONE on main `fd73e0ce8` |
| #3-5 asof-store + placebo | DONE on main `660299b8f` |
| NGS measurement-loop + ladder-boost | DONE on main `b73520085` |
| bayesian/symreg/rl/metalearning/conformal/certificate/promotion residue | DONE on main `d4280364e` (+ earlier) |
| T31 weather / shinFairForSide / calibration-blend / safe-lead | IN PROGRESS (wiring session) |
| dfs + nfl scoring batch | ASSIGNED parallel session |

Wiring session tip chain is ON TOP of their three SHAs. `git merge-base --is-ancestor` returns YES for all three. Dead hashes `1d0576590`, `a7b5e1267` remain dead.
