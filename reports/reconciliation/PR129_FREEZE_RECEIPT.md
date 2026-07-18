# PR #129 Freeze Receipt

**Date:** 2026-07-18
**Action:** `claude/galaxy-sports-edge-pdcswh` (PR #129) is FROZEN as an evidence and recovery-accounting
source. It is not a release vehicle and will not be bulk-merged.

## Exact state at freeze

- PR: [#129](https://github.com/Beexly/Sports/pull/129), draft, open, `beexly/sports`
- Head branch: `claude/galaxy-sports-edge-pdcswh`
- Head SHA: `43a9f740b2b85d981290d1d598b6057a2c7fbebc`
- Base branch: `main`
- Base SHA at PR open: `0e56c4770e715630eaaac974702336447e367b5a`
- **Current `origin/main` HEAD, re-verified at freeze time:** `0e56c4770e715630eaaac974702336447e367b5a`
  — identical to the PR's base SHA and to `git merge-base origin/main origin/claude/galaxy-sports-edge-pdcswh`.
  `main` has not moved since this branch forked; `pdcswh` is a clean, non-diverged superset of `main`
  with zero merge-conflict risk today. This will drift the moment `main` moves — re-verify before
  relying on it again.
- Diff size: 70 commits, 321 files changed, +33,996 / −803 lines.
- Audit trail: `docs/frontier/DECISION_REGISTER.md` DEC-001 through DEC-064 (each entry cites its own
  evidence, review, and verification commands — this receipt does not re-derive them).

## Why frozen, not merged

1. **Scale.** 321 files and ~34,000 net added lines span settlement, CLV, calibration, proof, billing,
   entitlements, cockpit auth, source-rights, and public-facing content — each individually reviewed
   and red-teamed as it landed (see DECISION_REGISTER.md), but never once verified as a single coherent
   release candidate against current production reality. A 70-commit squash-merge is not how launch
   readiness gets proven.
2. **Mixed provenance.** The branch carries genuinely-shipped, individually-verified capabilities
   (Reality Receipt, SportsIR, cockpit ADMIN hardening, six live-defect fixes, Wave R8/R11/R11.5
   recoveries, five DEC-056 RECOVER_WHOLE_CANDIDATEs) alongside deliberately-dark/unwired modules
   (`multi-market-ensemble.ts`, `synthetic-fade.ts`, `oos-split.ts` — DEC-061/063), deliberately-declined
   work (`model-promoter.ts` — DEC-062, correctly never landed), and open OWNER_GATE items (OG-008,
   OG-009, and others enumerated in the PR body). A bulk merge would activate none of the dark work by
   itself, but it would also make "what is actually live vs. dormant vs. declined" much harder to audit
   from `main` alone — the Decision Register is the source of truth for that distinction and should stay
   the mechanism, not a squash commit message.
3. **No production-reality verification has ever been run against this branch.** Every DEC entry proves
   its own slice is internally correct (tests, typecheck, lint, guardrails, build, red-team). None of
   them prove the *deployed* website, the *live* Stripe configuration, the *actual* OAuth callback host,
   or the *current* database migration state agree with what the code assumes. That is exactly what
   Launch Convergence (LC-000 onward) exists to establish, on a branch that starts from what is actually
   deployed today (`main`), not from a 70-commit accumulation.

## What remains permitted on `pdcswh` going forward

- **Ledger corrections** — fixing DECISION_REGISTER.md, CURRENT_STATE.md, WORKSTREAM_QUEUE.md,
  RECOVERY_WAVES.md, or this receipt when they are found stale or wrong, with cited evidence.
- **Security containment** — e.g. LC-003's handling of the live-shaped `THE_ODDS_API_KEY` found on an
  unlanded historical branch (fingerprint/hash only, never print or use the key itself).
- **Explicitly launch-critical fixes** — only when a Launch Convergence workstream (LC-001 Blocker
  Graph or later) proves a specific item on this branch resolves a verified P0/P1 launch or revenue
  blocker that cannot be more cleanly re-derived directly onto `main`. The default is to port the
  *verified slice* onto a fresh `main`-based branch (per the skill's §2 porting rule: cite exact source
  commits, diff against current `main`, preserve newer hardening, carry its own tests/review/rollback),
  not to keep extending `pdcswh` itself.

## What is explicitly NOT permitted on `pdcswh` going forward

- No new broad frontier features.
- No bulk merge of this branch, in whole or via squash, into `main`.
- No treating this freeze as license to keep building here "because it's already open" — the default
  answer for new work is a fresh branch from `main`.

## Backlog preserved, not abandoned

The following remain named, evidenced backlog items on `pdcswh` / in `RECOVERY_WAVES.md`. They are not
automatic Launch Convergence predecessors and will not be started merely because they are next in the
old queue — they move ahead of Launch Convergence work only if fresh production analysis proves one
resolves a verified P0/P1 launch or revenue blocker:

- Task #75 remainder: the 91-file DFS product tree (`claude/laughing-wozniak-gyryjx`) and
  `happy-goodall-8lkxrb`'s 25-module `lib/gse` layer — both unscoped, each needs its own dedicated
  freeze-contract cycle given their size.
- Task #76 remainder: universal roster paste-import (pure lib exists, no UI in the source branch, needs
  real integration into `/fantasy/connect`), FantasyCoach tooltips (needs mounting into 5 separate tool
  pages), Late-Swap UI (needs a real adapter — DEC-064 documents that the source branch's
  `late-swap-panel.tsx` calls pdcswh's actual `lateSwap` with inverted lock/scratch semantics and
  references a `LateSwapResult` type that doesn't exist on pdcswh's version).
- Task #77: 8 NEEDS_DEDICATED_REVIEW branches named in DEC-056, none individually scoped yet.
- Accumulated OWNER_GATE items: OG-008 (Wave R8 Group C, fantasy public gate), OG-009 (Wave R8 Group A2
  core files — calibration/outage-gate mechanism choice), the `laughing-wozniak-gyryjx`/`happy-goodall`
  model-promoter port (declined, DEC-054 corrected by DEC-062), `claude/crypto-payments`,
  `claude/intraday-odds-scheduler`, `claude/fix-local-setup-PmnyX`'s hardcoded API key, two branches
  carrying founder succession/deceased-member-protocol business content (flagged by filename only, never
  read), `lighthouserc.json` CI wiring, unsealing `/fantasy/contests`'s "Contest Bay", and wiring
  `multi-market-ensemble`/`synthetic-fade`/`oos-split` into live scoring or governance.

## Verification

- `git status --short` clean at freeze time.
- `git log -1 --oneline origin/main` = `0e56c477 fix(settlement): correct side-derivation mis-grade +
  close scanner/CI bypasses (#119)`.
- `git merge-base origin/main origin/claude/galaxy-sports-edge-pdcswh` = `0e56c4770e715630eaaac974702336447e367b5a`
  (identical to `origin/main` HEAD — confirmed non-diverged).
- PR #129 fetched live via GitHub API at freeze time (head SHA, commit/file/diff counts above).

## Rollback

This is a documentation-only, additive action. No code changed, no branch deleted, no PR closed or
merged. To "un-freeze," a future session can simply resume landing work on `pdcswh` and update this
receipt — nothing here is destructive or irreversible.

## Re-entry condition

Re-enter `pdcswh` as an active development target only when a Launch Convergence workstream produces
concrete evidence that a specific frozen-backlog item is a verified P0/P1 blocker, or when the founder
explicitly directs a return to frontier-recovery work over launch convergence.
