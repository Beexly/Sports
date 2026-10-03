# Agent and Claude Command Inventory

Generated 2026-09-23 11:20 CT.

## Method

- Enumerated `.agents/skills/` and `.claude/commands/` with `ls -la`.
- Measured directory sizes with `du -sh`; exact totals were measured with `du -sb`.
- Counted items with `git ls-files`.
- Counted outside references with `git grep -l "<item>" -- . ':(exclude)<source directory>'`; a reference count is the number of matching files, not occurrences.

## Summary

| Area | Items | Size (`du -sh`) | Exact bytes | Items with zero outside references |
|---|---:|---:|---:|---:|
| `.agents/skills` | 8 | 1.1M | 1,077,726 | 0 |
| `.claude/commands` | 34 | 12.0K | 12,055 | 21 |
| **Total** | **42** | **1.1M** | **1,089,781** | **21** |

## `.agents/skills`

| Name | Size | References outside `.agents` |
|---|---:|---:|
| `higgsfield-brandkit` | 285K | 1 |
| `higgsfield-generate` | 112K | 1 |
| `higgsfield-marketplace-cards` | 4.0K | 1 |
| `higgsfield-product-photoshoot` | 12K | 1 |
| `higgsfield-soul-id` | 9.0K | 1 |
| `higgsfield-video-explainer` | 24K | 1 |
| `higgsfield-websites` | 812K | 1 |
| `higgsfield-youtube-thumbnail` | 29K | 1 |

## `.claude/commands`

| Name | Size | References outside `.claude/commands` |
|---|---:|---:|
| `accuracy.md` | 1.0K | 0 |
| `audit.md` | 1.0K | 11 |
| `audit-auth.md` | 1.0K | 2 |
| `audit-db.md` | 1.0K | 0 |
| `audit-deps.md` | 1.0K | 0 |
| `audit-odds.md` | 1.0K | 2 |
| `audit-picks.md` | 1.0K | 2 |
| `audit-secrets.md` | 1.0K | 0 |
| `audit-stripe.md` | 1.0K | 2 |
| `audit-types.md` | 1.0K | 0 |
| `calibrate.md` | 1.0K | 0 |
| `check-claims.md` | 1.0K | 3 |
| `color-roles.md` | 1.0K | 0 |
| `contrast.md` | 1.0K | 2 |
| `debug.md` | 1.0K | 0 |
| `design-tokens.md` | 1.0K | 0 |
| `focus-anchor.md` | 1.0K | 0 |
| `grade-audit.md` | 1.0K | 0 |
| `lint.md` | 1.0K | 0 |
| `motion.md` | 1.0K | 0 |
| `perf.md` | 1.0K | 2 |
| `polish.md` | 1.0K | 0 |
| `polish-view.md` | 1.0K | 0 |
| `preflight.md` | 1.0K | 0 |
| `repro.md` | 1.0K | 0 |
| `responsive.md` | 1.0K | 2 |
| `safety-check.md` | 1.0K | 2 |
| `states.md` | 1.0K | 2 |
| `test-gaps.md` | 1.0K | 0 |
| `trace.md` | 1.0K | 0 |
| `tune-prompts.md` | 1.0K | 0 |
| `tune-thresholds.md` | 1.0K | 0 |
| `ui-audit.md` | 1.0K | 2 |
| `visual-qa.md` | 1.0K | 2 |

## Relevance assessment

All eight `.agents/skills` are plainly unrelated to the sports-prediction platform: their names and opening content describe Higgsfield brand, image, video, website, marketplace, and identity tooling. The 34 Claude commands are clearly intended for this platform from their names and first ten lines: they cover the GSN/cockpit, picks, odds, Stripe, auth, DB, calibration, claims, and launch QA. Thirteen commands have outside references; 21 have zero outside references. No files were deleted.
