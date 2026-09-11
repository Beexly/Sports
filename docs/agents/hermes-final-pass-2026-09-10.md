# Hermes final pass, 2026-09-10

Branch: `hermes/final-pass-2026-09-10` (based on `origin/main` 20745f082, never pushed to `main`).
Coordination: `docs/ops/AGENT_LEDGER.md` rows C-303 through C-314. This file is the step log the
owner asked for: what was done, in what order, why, and the command whose output backs it.

Rule applied to every decision: a failure that asserts a product HONESTY contract is repaired in
the CODE; a failure that asserts a design detail the owner deliberately replaced today is
reconciled in the TEST with the changing commit named. No guard was weakened, no gate was flipped,
no env file was touched, no threshold was moved.

## 0. Ground truth read BEFORE touching anything

- `git fetch`; live repo is `C:\Users\Garrett\Sports` (the copy in `~/projects/Sports` is empty and
  `~/.cagent/Sports` is stale). Branch off `origin/main` at 20745f082.
- `gh run list --branch main --workflow CI --limit 14`: last GREEN is `94706a839` (17:18Z). Red from
  #755 (19:07Z) through #757 and the six Field redesign PRs #758..#763.
- `npm run guardrails` on main: 24/26, FAIL `em-dash-scan` and `dependency-audit`.
- `npx vitest run` in `apps/web` on main: 967 files, 27 failed / 928 passed / 12 skipped, 41 failed
  tests. Log kept at `%LOCALAPPDATA%/Temp/vitest-web-baseline.txt`.
- CI job log 103073003363 downloaded and diffed against the local run: CI fails 22 files, not 27.
  The five extra local failures are environment artifacts and are filed as C-313 (they pass in CI).

## 1. What shipped, in commit order

| Commit | Row | What and why |
| --- | --- | --- |
| `9e53cce65` | C-303 | Five em/en dashes in `app/page.tsx` (placeholders and prose) cleared in the CODE, per law 9. `node scripts/guardrails/em-dash-scan.mjs` exits 0. |
| `e74b1c54a` | C-306 | The Field footer had deleted every disclosure link. Added an additive `DISCLOSURE_LINKS` row (Accountability, How We Make Money, Affiliate Pledge, Responsible play, Terms, Privacy). 3 guard files, 71 tests green. |
| `35b377131` | C-306 | The new footer disclaimer carried the token the compliance scanner blocks (`L2-GUARANTEE`), which the assembled `/waitlist` page is scanned for. Reworded, same meaning. `gse-waitlist` 49/49. |
| `5353e6790` | C-308 | Desktop nav had lost `/players` and the GSN door while mobile kept them; restored, plus `NavActiveLink` no longer throws when `usePathname()` is null. 5 files, 19 tests. |
| `c309f9ab0` | C-309 | Homepage rebuilt on the Field visual system with the doctrine restored: four doors, hero CTAs to `/picks` and `/pricing`, proof strip to `/engine` `/proof` `/verify`, honest degraded copy, GalaxyCursor. Fixed a real crash: `calibration.buckets.map` threw on a payload without buckets. 19 files, 147 tests. |
| `6083950c3` | C-310 | Three guards reconciled to today's deliberate design changes (wordmark treatment, Field cold-open, Nova launcher hidden) plus Windows path normalisation in two harnesses. |
| `ff75fe7b9` | C-312 | The same Windows path bug in two more harnesses (`paid-odds-callers-governed`, `fixture-query-inventory`). 20 tests green. |
| `39be2c53b` | ledger | Rows C-308..C-311 written. |
| `9c4ad86e1` | C-303 | Last em dash in the footer copy. |

## 2. Verified state after the work

- `npm run typecheck` -> `TYPECHECK_OK`. `npm run lint` -> `LINT_OK`.
- `npm run guardrails` -> 25/26; the only red is `dependency-audit` (C-305: its waiver list lives in
  `scripts/guardrails/**`, frozen for agents; the fix is the guard's own instruction, executed by the founder).
- `npx vitest run` in `apps/web` -> `Test Files 5 failed / 950 passed / 12 skipped (967)`;
  `Tests 5 failed / 12967 passed / 97 skipped`. All 22 CI-failing files are green. Every one of the
  five remaining failures is in the local-only set (C-313) and passes in CI.
- `node scripts/ops/check-agent-ledger.mjs` -> exit 0 after each ledger commit.

## 3. Findings recorded, not fixed (each has a ledger row)

- C-305 dependency-audit waivers: fix site is frozen for agents.
- C-311 two guards contradict each other: the scanner bans the word "guarantee" while
  `public-performance-policy.test.ts` requires the standard negation "does not guarantee future
  results" on performance surfaces. Founder-level choice, no guard touched.
- C-313 (a) `checkout-live-mode-guard` reports a live-mode Stripe-shaped value exported in this
  machine's environment under `QUIVERAI_API_KEY` (boolean verified, value never printed or hunted);
  (b) two `scripts/guardrails/**` scans time out at 60s locally and pass in CI.
- C-314 truth surface read at 23:44:52Z: `deployment.sha` null, settlement HEALTHY (0 of 2780
  overdue), gates holding (`canExposePerformanceStats` false even though the env flag is true),
  calibration eligibility RED with n 392 / ECE 0.0639 against the AGENTS.md note's n 458 / 0.0524.

## 4. What is NOT done

- Nothing is merged. The branch is pushed; the fix lands when the owner merges it.
- C-307 stays OPEN until CI on the merged result is green.
- The local-only guards in C-313 are diagnosed but not repaired.
