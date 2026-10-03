# START HERE — Agent OS Runtime review (RESOLVED + REVIEWED)

**Date:** 2026-06-15 · **Reviewer:** Claude Code · **Repo scope:** `beexly/sports` only.

> This supersedes the earlier "work-not-found" version of this folder. Codex's work
> **was located** on branch `codex/enforce-use-of-main-branch-in-git-setup`
> (commit `3a381d4c` "Export Agent OS runtime visibility patch", based on old main
> `0e70605c` / PR #34 — 138 files, +7057/−69). It was reviewed first-hand, gate-by-gate,
> file-by-file. Everything below is verified, not assumed.

## Verdict in one line

**It is real, it is honest, and it does not weaken a single safety gate. Keep it.**
In fact it is *radically conservative* — it reports **zero** autonomous capacity and is
structurally incapable of showing itself "healthy/green." This is the opposite of the
fake-green you told me to reject. There is **one real, non-safety gap** (DB persistence of
agent tasks is in-memory-only today) and **three duplication seams** with my branch to
converge later. None block adoption.

## Gate results (on Codex's `3a381d4c`, RAW_EXIT read from log, not wrapper echo)

| Gate | Result | Evidence |
|---|---|---|
| `npm run db:generate` | ✅ exit 0 | Prisma client generated |
| `npm run typecheck` | ✅ exit 0 — **all 10 workspaces** | see note ⚠️ |
| 3 named tests | ✅ **29 passed** (3 files) | `jarvis-operating-runtime-cockpit` (3), `agent-os-operating-spine` (17), `agent-os-runtime` (9) |
| `npm run build` | ✅ exit 0 — **187/187 pages** | only the benign Sentry/OpenTelemetry `require-in-the-middle` webpack warning |

⚠️ **The earlier typecheck "EXIT 2" was a false negative.** It came from a stale
`apps/web/.next/types` cache left by my prior builds on *my* branch — it referenced
**my** routes (`calibration/elo-backtest`, `market-backtest`, `backfill-historical-games`)
that don't exist on Codex's branch. After `rm -rf apps/web/.next` + re-generate, typecheck
is clean. Codex's branch has **no** compile errors. (Documented so nobody re-misreads it.)

## The 11 final answers

1. **Did it apply / is it present and reviewable?** Yes — it's a pushed branch
   (`codex/enforce-use-of-main-branch-in-git-setup` @ `3a381d4c`), checked out and reviewed.
   No `git am` needed.
2. **Did tests pass?** Yes — the 3 named tests = **29/29 pass**. They are *meaningful*
   (they lock honesty invariants; see TEST_RESULTS.md), not brittle filler.
3. **Did build pass?** **Yes**, exit 0, 187 pages. The Google-Fonts blocker is **really
   fixed** (fonts made self-contained/offline; a test was *inverted* to assert no
   `next/font/google` / no `googleapis.com`), not a network fluke.
4. **Is it safe to keep?** **Yes.** No existing clearance / source-rights /
   responsible-gaming / premium-gating / Stripe / webhook / readiness file was touched.
   Purely additive. Every safety gate is preserved or strengthened (SAFETY_GATE_REVIEW.md).
5. **What is actually real?** The 23-agent registry + honest status model, `agent-health`
   (`operationalCapacity = 0`), the Jarvis operating assessment, the task router/runtime
   with fail-closed gates, the workflow registry/runner/gates, the NFL identity resolvers
   (incl. the GSIS→Player crosswalk), and the cockpit OperatingRuntimeZone that renders it.
   All wired and tested. (WHAT_IS_REAL.md)
6. **What is typed/designed-only (not effectively live)?** DB persistence of agent tasks:
   the store omits the **required** `CockpitTask.assignedAgent` column, and the
   `OperatorAgent` enum only has 6 of the 23 agents — so against a real Postgres, writes
   throw and silently fall back to in-memory. "Persisted task runtime" is **in-memory-only
   today.** Safe (graceful fallback, honest UI) but currently overstated in naming.
   (WHAT_IS_TYPED_ONLY.md)
7. **What is UI-only?** The cockpit `OperatingRuntimeZone` is a read-only visualization of
   the honest assessment — it adds **no** control that executes anything. (WHAT_IS_UI_ONLY.md)
8. **What is not wired (by design)?** Browser/voice/tool control (pilot/echo/relay) and
   every external action — all `NOT_WIRED` / in `FORBIDDEN_EXTERNAL_ACTIONS`. **All 23
   agents** are NOT_WIRED/DRAFT_ONLY/MANUAL; nothing executes autonomously. (WHAT_IS_BLOCKED.md)
9. **Did Codex overstate anything?** One thing: the handoff doc **PERSISTED_TASK_RUNTIME**
   implies DB-backed persistence that isn't effective yet (see #6). The **owner-facing**
   surfaces do *not* overstate — `companyHealth` can only be CRITICAL/CAUTION/UNKNOWN
   (no "healthy"), `operationalCapacity` shows 0, revenue shows "Unknown… no fake revenue."
10. **What did you fix?** Nothing on Codex's branch (instruction: don't merge/rewrite it;
    the persistence fix is an owner-level Prisma-enum decision, not a silent patch). On
    *my* branch I only (re)wrote this honest handoff. (FIXES_MADE.md)
11. **What next?** Adopt it via a clean, owner-visible integration (Codex rebases the
    additive `lib/` tree onto current main, or a focused PR), then do the 3 convergences:
    (a) extend `OperatorAgent` + map `assignedAgent` so tasks actually persist; (b) dedupe
    calibration Brier/ECE onto `@sports/prediction-engine`; (c) converge CLV onto the
    engine's `clv.ts`/`clv-capture.ts`. (NEXT_BEST_BUILD.md)

## Read next
- `PATCH_REVIEW_REPORT.md` — full breakdown + the structural honesty mechanisms
- `SAFETY_GATE_REVIEW.md` — gate-by-gate (source-rights, owner-approval, public-picks,
  no-fake-data, model-weights, responsible-gaming)
- `DUPLICATION_VS_MY_BRANCH.md` — exact overlaps with `claude/zealous-noether-inaaa3`
- `TEST_RESULTS.md` — raw gate evidence
- `WHAT_IS_REAL.md` / `WHAT_IS_TYPED_ONLY.md` / `WHAT_IS_UI_ONLY.md` / `WHAT_IS_BLOCKED.md`
- `FILES_REVIEWED.md` — every file opened
- `FIXES_MADE.md` · `NEXT_BEST_BUILD.md`
