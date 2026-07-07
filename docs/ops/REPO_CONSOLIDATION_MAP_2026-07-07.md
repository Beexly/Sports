# Repo Consolidation Map — 2026-07-07

Single source of truth for **what work exists, where it lives, and how to get it to a
shippable `main`.** Written after auditing the full remote (126+ branches). `main` has
not moved in this window (`a7bd5639`); nearly all recent work is stranded on unmerged
branches. This document accounts for all of it.

## TL;DR

- **The GSE expected-metrics IP play is built, proven, and shipped** — our own
  CPOE / RYOE / xYAC computed from open play-by-play and validated against Next Gen
  Stats by correlation. This is build #2 from the NGS handoff, which was approved but
  never done.
- **The entire stranded `codex/sunday-frontier-maxforce` program (176 commits) is now
  consolidated onto `claude/nfl-pbp-expected-metrics-xb069r` and verified GREEN** for
  the first time: **~8,035 tests pass** (907 prediction-engine + 7,128 apps/web), all
  workspaces typecheck clean, all 14 guardrails + 34 eval-contracts pass. It was never
  broken — just never merged or CI-verified.
- **Two large lineages remain stranded and are NOT normally mergeable** — `jarvis/*`
  and `safety/*` share **no common ancestor with `main`** (unrelated histories). They
  are parallel builds needing a human strategic decision, not a merge.

## What shipped this session (on `claude/nfl-pbp-expected-metrics-xb069r`)

1. **Expected-metrics engine** — `packages/prediction-engine/src/expected-metrics/`
   (pure, deterministic, zero-dep): ridge + logistic regression primitives; fit-on-load
   expected-completion (→ GSE-CPOE), expected-rush-yards (→ GSE-RYOE), expected-YAC
   (→ GSE-xYAC); a validation bridge that correlates our per-player numbers against NGS
   ground truth (Pearson/Spearman/RMSE/MAE) with honest per-metric graduation
   thresholds and enforced grain discipline. 22 dedicated tests; CPOE recovers injected
   latent skill at Pearson > 0.85.
2. **Loader + route** — `apps/web/lib/nflverse/expected-metrics.ts` (fetch PBP → fit →
   compute → validate vs full NGS pool) + a premium-gated API route.
3. **Docs** — `docs/math/GSE_EXPECTED_METRICS.md` (metric bible) and
   `docs/data/NGS_GROUND_TRUTH_MAP.md` (nflverse CC-BY-4.0 legal map; NGS is a
   validation referee, never a re-served metric).
4. **Consolidation** — merged the 176-commit codex program on top, resolved the only
   two conflicts (the index.ts export barrel and EXECUTION_LEDGER) by union, and
   verified the whole tree green.

## Branch landscape — the full accounting

| Lineage | Commits vs main | Size | Relationship to main | Status / disposition |
|---|---|---|---|---|
| **`codex/sunday-frontier-maxforce-2026-07-05`** | +176 | ~1,088 files / +70k | **Clean superset** of main | **CONSOLIDATED + GREEN** on this branch. `claude/night-shift` (+97) is its ancestor — fully subsumed. |
| **`jarvis/intelligence-os-foundation-v1`** | +312 | ~1,878 files / +10k | **Unrelated history** (no common ancestor) | Parallel "Intelligence OS" (capability registry, agent council, memory protocol) + cockpit. Needs a strategic decision — see below. |
| `jarvis/command-interface-v1` / `v2` | +310 / +311 | ~1,884 files | Unrelated history | Owner command cockpit ("Mission Control"). Siblings of the OS branch. |
| `jarvis/os-foundation-fable5-v1` | +25 | ~1,910 files / +23k | Unrelated history | Fable-5 OS foundation. Newest jarvis head. |
| **`safety/sports-wip-2026-06-04`** | +185 | ~2,866 files / +67k | **Unrelated history** | Large WIP snapshot (secret-fixture hardening at head). Likely an alternative baseline; audit before adopting. |
| `research/proven-edge` | +5 | ~834 files / +5k | Diverged @`031de51` (related) | Proven-edge research/docs (Frontier Institution §19). Reviewable/mergeable. |
| `integration/proven-edge` | +0 | — | At main | Doc reconcile only; effectively already in main. |
| ~120 other branches (`claude/magical-volta-*`, older experiments) | varies | — | mixed | Mostly superseded experiment/checkpoint branches. Recommend triage + prune. |

### Why jarvis and safety can't just be merged

`git merge-base origin/main origin/jarvis/…` and `…origin/safety/…` return **empty** —
these branches have **no common ancestor with `main`**. A normal merge refuses
(`unrelated histories`); forcing it would produce thousands of conflicts. They are
effectively separate repositories/rewrites. Integrating them is a deliberate product
decision (adopt one as the new baseline, cherry-pick specific features across, or
archive), not a mechanical merge — and should not be done blind.

## Reconciliation — the IP engine vs the codex metrics framework

They are **complementary layers, not duplicates** (verified by reading both):

| Layer | What it is | Where |
|---|---|---|
| **Lower (this session)** | Empirical models **fit on real play-by-play** + **NGS-correlation proof** (`fitLogistic`/`fitRidge` → residual rollups → `buildCalibrationReport`/`graduationVerdict`). | `expected-metrics/` |
| **Upper (codex)** | Governance/scoring/exposure **shell** on hardcoded proxy coefficients: `metric-birth-certificate`, `metric-evidence-cards`, `residual-rollup`, `metric-graduation`, source/payload-rights, shadow-metric lifecycle. | `metrics/` |

The codex shell currently earns its `validationReport.status` from static placeholders;
our correlation-backed `graduationVerdict` is exactly the empirical proof it lacks.

### Next integration step (additive, founder-gated)

- Feed `computeCpoe/Ryoe/YacOverExpected` residuals into codex's `buildMetricResidualRollups`.
- Map our `graduated` verdict → codex's `evaluateMetricGraduation` PASS.
- Promote our `provenance` (modelVersion, featureSchemaHash, sampleSize) into the
  birth-certificate registry.
- Replace the loader's inline NGS fetch with codex's `nflverse-ngs.ts` typed bridge.

## Path to a working, deployed `main`

1. **Open a PR: `claude/nfl-pbp-expected-metrics-xb069r` → `main`.** This is the
   consolidated, green weekend program + the IP play. CI will verify it independently
   (the codex lineage has never had a CI run). Merge once green.
2. **Triage `research/proven-edge`** (small, related) — review and merge or fold in.
3. **Decide the jarvis question.** Is the "Intelligence OS" / cockpit the intended next
   product surface? If yes, adopt one jarvis head as a baseline and forward-port the
   now-consolidated metrics onto it (or cherry-pick jarvis features onto main). If no,
   archive. Do not blind-merge unrelated histories.
4. **Audit `safety/sports-wip`** — determine if it is a stale snapshot (archive) or an
   alternative baseline with unique value (cherry-pick).
5. **Prune** the ~120 superseded experiment branches to make the remaining work legible.

## Verification evidence (this branch, HEAD of consolidation)

- `npm run typecheck` — clean across packages/types, data-ingestion, ingestion-pipeline,
  prediction-engine, apps/web.
- `npx vitest` — prediction-engine **907/907**, apps/web **7,128/7,128**.
- `npm run guardrails` — all 14 scanners + 34 eval-contracts pass; 3,489 files
  secret-scanned clean.
