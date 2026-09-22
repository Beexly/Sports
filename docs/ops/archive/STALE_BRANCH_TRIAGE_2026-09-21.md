# Stale branch triage — Beexly/Sports (2026-09-21)

Compared every pasted stale branch to `origin/main` (`919f27944` after fetch).  
Method: `git rev-list --left-right --count origin/main...branch`, `git cherry`, `git diff --name-only merge-base`, commit subjects.  
**Nothing was deleted.** Remote branch deletion is irreversible — use the command blocks after you approve.

Counts: **17 DELETE_SAFE · 30 DELETE_CANDIDATE · 26 SALVAGE_REVIEW · 4 PR_TRIAGE** (77 total).

---

## 0. PR numbers on the stale list (GitHub truth)

| PR | Branch | State | Action |
|---:|---|---|---|
| 13 | `codex/homepage-finish-doctrine-2026-05-30` | **MERGED** 2026-05-30 | Delete branch |
| 18 | `jarvis/os-foundation-fable5-v1` | **MERGED** 2026-06-13 | 21 unique commits *after* merge → salvage skim |
| 19 | `codex/upgrade-galaxy-statking-to-nfl-intelligence-system` | **MERGED** 2026-06-13 | Delete branch (0 unique) |
| 35 | `codex/enforce-use-of-main-branch-in-git-setup` | **MERGED** | Delete (0 unique) |
| 36 | `adopt/agent-os-runtime` | **MERGED** | Delete (0 unique) |
| 39 | `claude/zealous-noether-inaaa3` | **MERGED** | Delete (0 unique) |
| 48 | `claude/brave-hamilton-g7mlqd` | **MERGED** | Small; delete-candidate (2 commits likely elsewhere) |
| 2 | `fix/overnight-operator-doc-guards-260524` + `claude/magical-volta-KSe4E` | **CLOSED** | Delete-candidate |
| 14 | `claude/awesome-sagan-LOyCa` | **CLOSED** | Skim Mission Control / admin controls then delete |
| 52 | `claude/gracious-albattani-f63wx1` | **CLOSED** | Dynasty/game UI — not core engine; delete after skim |

---

## 1. DELETE_SAFE — zero unique work (17)

Safe: every commit is already in `main` (or `git cherry` shows only `-` equivalents).

```
jarvis/command-interface-v1
jarvis/command-interface-v2
jarvis/intelligence-os-foundation-v1
airwave/gse-gsn-overnight-intelligence-v1
claude/gracious-cori-zwqiqs
claude/festive-cray-knb0xp
claude/vigilant-archimedes-8m5fry
claude/amazing-pascal-qa0586
claude/wonderful-ptolemy-qh7pnq          # PR #18 source tip is other branch; this tip is in main
codex/upgrade-galaxy-statking-to-nfl-intelligence-system   # PR #19 MERGED
claude/friendly-fermat-fy99m2
codex/enforce-use-of-main-branch-in-git-setup              # PR #35 MERGED
adopt/agent-os-runtime                                     # PR #36 MERGED
claude/zealous-noether-inaaa3                              # PR #39 MERGED
feat/sentient-interface-v2
design/2026-flagship
codex/doctrine-fonts-worldclass-hero-2026-05-29            # 2 patches cherry-equivalent to main
```

```powershell
# approve then run (remote):
$dead = @(
  'jarvis/command-interface-v1','jarvis/command-interface-v2','jarvis/intelligence-os-foundation-v1',
  'airwave/gse-gsn-overnight-intelligence-v1','claude/gracious-cori-zwqiqs','claude/festive-cray-knb0xp',
  'claude/vigilant-archimedes-8m5fry','claude/amazing-pascal-qa0586','claude/wonderful-ptolemy-qh7pnq',
  'codex/upgrade-galaxy-statking-to-nfl-intelligence-system','claude/friendly-fermat-fy99m2',
  'codex/enforce-use-of-main-branch-in-git-setup','adopt/agent-os-runtime','claude/zealous-noether-inaaa3',
  'feat/sentient-interface-v2','design/2026-flagship','codex/doctrine-fonts-worldclass-hero-2026-05-29'
)
foreach ($b in $dead) { git push origin --delete $b }
```

---

## 2. SALVAGE FIRST — extract value before delete (ranked)

These have **unique** commits not in `main`. Read diffs; cherry-pick or copy tests/docs if useful; then delete.

### Tier A — calibration / CLV / engine math (do these first)

| Branch | Unique | Why it matters |
|---|---:|---|
| **`claude/pensive-brown-yql6ld`** (PR #48 closed) | 14 | **Dixon-Coles** Poisson correction, multi-market ensemble, synthetic fade, **calibration ladder**, public reliability diagram + Wilson + edge significance, proof CSV export. Directly on the accuracy/calibration mission. |
| **`claude/review-pending-requests-k46ywu`** | 20 | **CLV beat-the-close proof** + bootstrap-filter leak-close tests, nflverse catalog coverage, path_to_yes on 180 sources, Haiku cost cut on brief/calibration-insight. |
| **`claude/happy-euler-trkihe`** | 3 | **Performance segments: units / win% / ROI / CLV per sport × market** (`lib/tracker/segments.ts` + tests). Tiny, high leverage. |
| **`claude/gse-moat-aplus-clv-2026-06-03`** | 3 | **CLV adapter** + P0 billing/security salvage + brand GSE/GSN resolve. |
| **`claude/laughing-thompson-x9xr6f`** | 2 | Sleeper consensus signal, multi-year weighted stats, real player model / projections pool (fantasy data path). |

**Tier A extract order:** `happy-euler` (3 commits) → `gse-moat-aplus-clv` → `pensive-brown` engine tests → `review-pending-requests` CLV proof tests → `laughing-thompson` data path.

### Tier B — product/fantasy surfaces (conflicts with D3 “live data or delete”)

| Branch | Unique | Notes |
|---|---:|---|
| **`claude/adoring-babbage-gq7v77`** | 24 | Full fantasy suite: mock draft, trade analyzer, contest sim, late-swap, auction values, Scoring Zone, academy. **Many tools were later parked by LAST_PLAN D3.** Salvage only modules with a real data path (DFS optimizer, props, roster import). Do not resurrect sample-data tools. |
| **`jarvis/os-foundation-fable5-v1`** (PR #18 **MERGED**) | 21 | Post-merge Jarvis layers A–H, executive intelligence v2, fantasy coach. Merge landed; leftover commits may be unmerged polish. Skim `docs/ai/jarvis` + tests. |
| **`claude/awesome-sagan-LOyCa`** (PR #14 closed) | 5 | Mission Control admin, promote-admin script, Today’s Board. **Admin/security sensitive** — review before any revival. |

### Tier C — large archaeology (skim, keep docs only if unique)

| Branch | Unique | Notes |
|---|---:|---|
| **`claude/compassionate-ramanujan-qqt5nb`** | **336** | Huge. Highlights: keyless settlement fallback (calibration sample growth), TTS voice pool, cockpit dispatch loop, go-live accounting. Mostly superseded UI. Cherry-pick settlement fallback + go-live docs if still absent. |
| **`claude/determined-keller-dUcdG`** | 112 | Galaxy 2026 plan lock, launch memos, pricing redesign — **docs/plans**, little engine math. Copy `docs/` only if not on main. |
| **`safety/sports-wip-2026-06-04`** | 30 | Research packets (`docs/research/top-20-rd`, workstreams), podcast pipeline, Hobby cron config. Research docs may be unique. |
| **`claude/magical-volta-yiUwL`** | 59 | Test-coverage wave (jarvis/performance/board). Port tests if gaps remain. |
| **`claude/keen-ptolemy-d0pbK`** (+`-codex`, `-audit`) | 48–50 each | Cockpit pick-narrator, provenance endpoint, telemetry prune. Three near-clones — salvage from **one** (`-audit` has security patches). |
| **`claude/magical-volta-wXkx2`** | 48 | More test coverage. Merge with yiUwL skim. |
| **`claude/nifty-hopper-au7wib`** | 20 | a11y WCAG AA contrast. Likely superseded by later cosmic design — **check one contrast file** then drop. |
| **`claude/serene-hopper-rtjsfq`** | 4 | Provenance fusion / entity graph — **contains `Bump MODEL_VERSION to v6.0.0`**. Never merge blindly (L11). Steal library modules only, strip version bump. |
| **`claude/sports-prediction-platform-6F7Wa`** | 16 | settle-picks tests, TheSportsDB client, Privacy/Terms. Settlement tests worth porting. |
| **`claude/funny-lovelace-cjaj4b`** | 19 | Error boundaries + command palette + nav. Low risk, low novelty. |

### Tier D — overnight `magical-volta-*` noise (mostly delete after one security grep)

Pattern: run logs + DEV_FAKE_ADMIN hardening + Prisma generate + lockfile. **Same security fix appears on many branches.** Grep once on `origin/main` for `DEV_FAKE_ADMIN` production guard; if present, delete the whole family:

```
claude/magical-volta-3wohz9, 6wcpd8, fxd4qj, l6gYN, ivova, tvJpG, IZmcH, 5uUdq,
PJIyk, sMbwH, rVNsV, byz01z, n8sbdm, 8aaB4, bIyZe, AUmbs, KSe4E, yiUwL, wXkx2, dwEVQ, 4kilty
```
Keep only `yiUwL` / `wXkx2` if their **tests** are still missing on main.

---

## 3. DELETE_CANDIDATE (after 10-minute skim)

Small unique sets; commit messages look like overnight/UI/local-setup. Verify nothing under `packages/prediction-engine` or `docs/calibration` then delete:

```
claude/galaxy-sports-corporate-structure-Cni9A
claude/debug-previous-fix-WYyxi, debug-previous-fix-g06Wz, fix-local-setup-PmnyX
claude/clever-bohr-po46pm
claude/dazzling-newton-NFI8X
claude/adoring-knuth-mhg8m4
claude/website-visual-design-i5hqM
claude/eloquent-faraday-WKktj
claude/brave-hamilton-g7mlqd          # PR #48 MERGED
claude/galaxy… (fable5 public world)  # galaxy/fable5-2026-public-world-v1
garrett/resource-dump-2026-06-15      # 1 file resource dump — copy to docs/research/incoming if wanted
feat/sentient-interface               # 1 commit, 63 files UI — superseded
```

`claude/awesome-sagan-LOyCa` and `claude/gracious-albattani-f63wx1` are **PR_TRIAGE / closed** — skim then delete.

---

## 4. What not to do

- Do **not** merge `claude/serene-hopper-rtjsfq` as-is (MODEL_VERSION v6 bump without L11 scorecard).
- Do **not** revive fantasy tools from `adoring-babbage` that violate D3 (sample data).
- Do **not** force-delete anything still holding an **open** PR you care about (none of the 77 stale list except leftovers of merged #18).
- Prefer **cherry-pick / copy files** over merging 100+ commit branches into `main`.

---

## 5. Suggested cleanup sequence (no engine regression)

1. Delete **DELETE_SAFE** batch (§1) — zero risk.
2. Cherry-pick Tier A: `happy-euler` segments → CLV adapters → `pensive-brown` Dixon-Coles/ensemble **tests** into a `mimo/salvage-tier-a` worktree; run typecheck/vitest.
3. One security grep: `DEV_FAKE_ADMIN` on main → delete magical-volta family if covered.
4. Port `settle-picks` tests from `sports-prediction-platform` if `packages/ingestion-pipeline` still red on those mocks.
5. Skim Tier B fantasy; keep only live-data tools (LAST_PLAN D3).
6. Delete remaining DELETE_CANDIDATE + closed-PR leftovers.
7. Optional: archive Tier C research docs into `docs/ops/archive/branch-salvage-2026-09-21/` then delete branches.

---

## 6. One-liner for the founder

**~17 branches are free deletes today; ~5 branches still hold real CLV/calibration/engine math you should steal first (`pensive-brown`, `review-pending-requests`, `happy-euler`, `gse-moat-aplus-clv`, `laughing-thompson`); the magical-volta overnight farm is noise; one branch (`serene-hopper`) illegally bumps MODEL_VERSION.**
