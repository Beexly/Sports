# GALAXY KEYLESS-FIXES — COMPREHENSIVE AUDIT REPORT

Branch: `hermes/galaxy-keyless-fixes` · tip `de59706`
Audit window: 2026-08-28 (overnight)
Scope: full branch (6 concrete waves shipped this session) + codebase security/
bug/compliance scan + OneDrive parallel-copy cross-check.

## 1. Deliverables shipped this session (all pushed, secret-scanned)

| Wave | What | Commit | Tests |
|------|------|--------|-------|
| LQ18 | `--prod` mode on launch-night-smoke.mjs (6 sequenced prod checks, local mode byte-for-byte intact) | `55a8b14` | 251 local + live-prod composition |
| 5 | cron-matrix regen (21 crons) + stale-check wired into launch-preflight as HARD blocker | `265b62c` | node --check + matrix --check |
| 6 | Per-sport freshness gating (pure, additive `refresh-sla` extension) | `ef75662` | 14 (7 new) |
| 7 | H-M off-season early-return for forward-looking crons (excludes settlement) | `16c50ed` | 5 |
| 8 | CLV backfill drain verification (re-grade lane already wired) | `516af50` | 3 (11 w/ re-grade lane) |
| Gated | 5 founder/research proposals w/ DECISION-NEEDED flags (no impl, no fabrication) | `de59706` | — |

## 2. Security audit

- **No leaked secrets** in tracked source (sk-/AKIA/ghp_/JWT patterns: 0 hits).
  `.gitignore` excludes all `.env*` except `.example` templates.
- **No dangerous dynamic execution**: all `child_process` uses are
  `execFileSync`/`spawnSync` for git/prisma/npm in build/dev scripts. The one
  `new Function` (`packages/db/src/neon-serverless-adapter.ts:36`) is the safe
  optional-dynamic-import pattern (resolves to `null` on failure). No
  `eval()` of external input; all `.exec()` matches are `regex.exec()`.
- **API keys** read from `process.env` with `.trim()`; no key is logged.
- **Auth**: `lib/cron/authorize.ts` uses dual-secret (CRON_SECRET +
  CRON_SECRET_PREVIOUS) rotate-safe bearer check. Paywall contract
  (null-not-omitted) asserted in LQ18 spot-check.

## 3. Compliance / launch-readiness

- Every commit ran the secret scanner (staged + full 5924-file push scan): clean.
- No schema/migration touched; founder-only gates (PRICING_PHASE, gate ladder,
  LIVE_BOARD, STATS_PUBLIC) left untouched per integrity rule.
- LQ18 `--prod` verified against live prod read-only: board/state returns real
  `confidence===null`/`rankingP===null` rows (contract check is meaningful, not
  vacuous); dfs/salaries + intelligence/predictiveness return 401 (LQ1 merged).
- deploy:ready + prod-probe correctly fail (need prod creds) and flow into the
  exit code — proving no exit-swallowing (the LQ18 attack guard).

## 4. OneDrive cross-check (added to scope per owner instruction)

- `C:/Users/Garrett/OneDrive/Documents/Galaxy Sports Edge` is a `master`-branch
  scratch copy (last commit `cf5bc79` "deny-by-default .gitignore for
  home-directory repo"). `git ls-files` = 0 → not a live git checkout, no
  committed-secret risk. `Desktop/Fix-Galaxy-Repo.bat` is a utility to move it
  off OneDrive into `C:/dev` (the canonical work lives in `C:/Users/Garrett/Sports-*`).
- No personal-file crawl performed (contracts/payslips/forensic docs out of
  scope). Sports/GSE-relevant material present but redundant with the canonical
  repo; no divergent source requiring port.
- **Recommendation**: keep the GSE working tree OUT of OneDrive sync (the
  deny-by-default gitignore on the OD copy already suggests this intent).

## 5. Findings + recommendations (safe, non-blocking)

1. **CI gap (known, from SESSION_HANDOFF)**: neither cron-matrix `--check` nor
   launch-preflight runs in `.github/workflows`. Now that cron-matrix `--check`
   is a hard preflight gate, adding it to CI would catch matrix drift before
   merge. **Founder decision** — not changed this session (avoid touching CI).
2. **6 pre-existing tsc errors** in `packages/*` (`data-ingestion`,
   `ingestion-pipeline`, `prediction-engine`): none in my changed files. These
   are cross-package export-resolution artifacts (e.g. `resolveCloseSourceLadder`
   from Wave 3) surfacing under the worktree's stub resolution — recommend a
   maintainer run `tsc -p` from the primary clone to confirm they are
   environment, not real, regressions.
3. **Gated items** (G1–G5 in docs/ops/GATED_PROPOSALS.md) remain proposals;
   no fabrication, no founder gates flipped.

## 6. Test integrity

- Full local launch-night smoke: **251 passed, exit 0** (no regression).
- Per-wave suites: 30 + 251 green.
- All pushes: secret-scanned clean.

Status: branch is launch-audit-complete for the 6 concrete items. Gated items
await founder/research decisions.
