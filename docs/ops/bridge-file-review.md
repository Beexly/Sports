# Bridge-file review — the 75 rescued `at-risk-bridges` files

**Reviewed:** 2026-09-29 · **Branch reviewed:** `hermes-surf-16b` @ `230639155`
**Subject:** the 75 files (2,319,752 B) preserved on `origin/preserve/at-risk-bridges-2026-09-29`
under `.preserve/at-risk-bridges/`
**Method:** read-only. No file in the repo was modified. All verification ran in a detached
worktree (`%LOCALAPPDATA%\Temp\bridgewt`) pinned to `hermes-surf-16b`.

---

## Verdict

| Class | Meaning | Files | Bytes | Action |
|---|---|---:|---:|---|
| **A** | Ready to wire | **0** | 0 | none |
| **B** | Needs work before wiring | **9** | 944,889 | 6 land as-is once 3 type errors are fixed; 1 is broken |
| **C** | Duplicate / stale | **66** | 1,369,163 | archive; no wiring value |

**The headline: 66 of the 75 files carry no wiring value. They are already in the repo.**
59 are byte-for-byte identical to a tracked file on `hermes-surf-16b`, 4 more are identical to
a tracked file that lives at a *different* path, and 3 are older snapshots of files that have
since been fixed and committed. The rescue was correct to preserve them, but 90% of what it
preserved was already safely in git.

Of the 9 files that are genuinely new: **3 pairs are ready to wire modulo a one-line type fix
each, 1 file has a hard runtime crash, and 3 files ship with no tests at all.**

Nothing here is class A. Two of the three B-files that need fixing are *test* files whose
companion implementation is otherwise perfect, so the remaining work is small and bounded.

---

## How the classification was established

Every claim below is reproducible from the repo. Three independent checks were run.

**1. Byte comparison against git HEAD** (not the working tree — the working tree was being
moved by another process while this review ran, so all comparisons were made against
`git ls-tree`/`cat-file` output for the pinned commit).

**2. Module resolution + typecheck** with the TypeScript 5.9.3 compiler API, compiling each
rescued file *as if* it already sat at its destination path
`packages/ingestion-pipeline/src/<name>.ts`, using that package's own real
`tsconfig.json` (`CommonJS`, `moduleResolution: node`, `strict`, `noUncheckedIndexedAccess`).
Every one of the 21–32 `@sports/prediction-engine/*` deep imports per file resolves to a real
tracked module — **0 unresolved specifiers across all 9 new files.** These files were written
against a real engine API, not an imagined one.

**3. Test execution** under the package's own vitest (2.1.9).

The rescued `.test.ts` files import their implementation via `./<name>-bridge.js`. To get real
diagnostics rather than cascade noise from a missing module, each bridge was compiled
**together with its test sibling**, which is also the correct landing unit (see below).

### Integrity of the rescue itself

The preservation is sound and can be trusted:

- All 75 files are present; manifest `count: 75` and `totalBytes: 2319752` both reconcile exactly.
- **72 of 75** match their recorded SHA-256 and byte count.
- **3** mismatch, and all 3 are fully explained and benign: `research-gse-bridge.ts`,
  `scoredist-bridge.ts`, and `rl-symreg-bridge.test.ts` were stored with CRLF line endings in
  the manifest but checked out with LF, because `.gitattributes` enforces `* text=auto eol=lf`
  repo-wide. For the two large files, re-applying LF→CRLF reproduces the manifest SHA-256
  **exactly** (132,742 B and 113,222 B), proving the content is unmodified and only the line
  endings moved. No content was lost.

---

## Class C — duplicate / stale (66 files)

### C1. Byte-identical to a tracked file at the same path (59 files)

No action. These are already in git. Do not re-add; do not diff them again.

| Family | Files | Bytes |
|---|---:|---:|
| `bayesian-bridge` (+test) | 2 | 16,037 |
| `bayesian-pairing-bridge` (+test) | 2 | 14,288 |
| `bayesian-residue-bridge` (+test) | 2 | 20,599 |
| `certificate-bridge` (+test) | 2 | 12,462 |
| `continual-learning-bridge` (+test) | 2 | 18,372 |
| `dfs-bridge` (+test) | 2 | 36,263 |
| `edge-lab-bridge` (+test) | 2 | 16,895 |
| `edge-lab-honesty-bridge` (+test) | 2 | 30,854 |
| `edge-lab-honesty2-bridge` (+test) | 2 | 86,071 |
| `ensemble-bridge` (+test) | 2 | 6,321 |
| `experimental-models-bridge` (+test) | 2 | 68,264 |
| `inplay-bridge` (+test) | 2 | 8,946 |
| `invention-tracking-bridge` (+test) | 2 | 99,782 |
| `metalearning-conformal-bridge` (+test) | 2 | 23,008 |
| `monitoring-bridge` (+test) | 2 | 13,527 |
| `nfl-batch-bridge` (+test) | 2 | 29,425 |
| `physical-context-bridge` (+test) | 2 | 33,460 |
| `props-hb-bridge` (+test) | 2 | 40,192 |
| `props-metrics-bridge` (+test) | 2 | 91,170 |
| `props-player-bridge` (+test) | 2 | 14,732 |
| `publish-guards-bridge` (+test) | 2 | 16,919 |
| `research-causal-bridge` (+test) | 2 | 35,519 |
| `rl-residue-bridge` (+test) | 2 | 18,289 |
| `rl-symreg-bridge` (+test) | 2 | 28,548 |
| `score-model-bridge` (+test) | 2 | 13,937 |
| `signals-bridge` | 1 | 141,377 |
| `sizing-bridge` (+test) | 2 | 169,311 |
| `symreg-conformal-residue-bridge` (+test) | 2 | 34,338 |
| `calibration-kelly-bridge` (+test) | 2 | 10,025 |
| `gate-certificate-bridge` | 1 | 2,379 |
| `composed-metric-payload-fixture-bridge` | 1 | 2,645 |
| **total** | **59** | **1,153,955** |

### C2. Identical content at a *different* repo path (4 files)

These 4 are absent at the path the rescue recorded, but each is **byte-identical** to a tracked
file under its real path. The rescue directory layout was wrong, not the content. Restoring them
at the recorded paths would create duplicate modules.

| Rescued path | Actual tracked path (identical bytes) | Bytes |
|---|---|---:|
| `apps/web/lib/api-v1/rpcp-conformal-bridge.ts` | `apps/web/lib/calibration/rpcp-conformal-bridge.ts` | 6,746 |
| `apps/web/lib/api-v1/rpcp-conformal-bridge.test.ts` | `apps/web/lib/calibration/rpcp-conformal-bridge.test.ts` | 1,843 |
| `apps/web/lib/api-v1/workflow-task-bridge.ts` | `apps/web/lib/workflows/workflow-task-bridge.ts` | 1,025 |
| `apps/web/lib/api-v1/api-v1-composed-metric-payload-bridge.test.ts` | `apps/web/__tests__/api-v1-composed-metric-payload-bridge.test.ts` | 3,112 |
| **total** | | **12,726** |

### C3. Stale snapshots of files that were since fixed (3 files)

Each rescued file's content matches an **older commit exactly**, and the current HEAD version
is strictly better. These are the only C-class files that differ, and they differ because the
repo moved on after the rescue snapshot was taken.

| Rescued file | Rescued content == | HEAD is | Verdict |
|---|---|---|---|
| `packages/ingestion-pipeline/src/markets-odds-bridge.ts` (74,719 B) | `fa8800e3f` (2026-09-26) | `c01a51c9a` (2026-09-27) | **stale** |
| `packages/ingestion-pipeline/src/markets-odds-bridge.test.ts` (58,793 B) | `fa8800e3f` (2026-09-26) | `5af07b8ea` (2026-09-26) | **stale** |
| `packages/ingestion-pipeline/src/signals-bridge.test.ts` (68,970 B) | `80cd59f80` (2026-09-26) | `4ec893557` (2026-09-26) | **stale** |
| **total** | | | **202,482** |

This is not a cosmetic difference. The rescued copies are the versions the repo **deliberately
moved away from**, and in both cases the HEAD version is the one with the reasoning fixed:

- `markets-odds-bridge` — the rescued copy calls `fitAlpha` with a flat `ProbVector[]` and an
  `as` cast at the call site, then documents a "KNOWN KERNEL DEFECT" around it. The HEAD copy
  removed the call entirely and replaced the cast with a named
  `ALPHA_FIT_UNAVAILABLE` constant, so the refusal reason is a first-class value rather than a
  comment. Commit `4ec893557` is literally titled *"stop the flat fitAlpha call"*.
- `signals-bridge.test.ts` — the rescued copy asserts a **non-convergence** it calls a
  "MEASURED KERNEL LIMITATION" (`expect(r.ok).toBe(false)`, reason
  `"did NOT converge in 1000 iterations"`). The HEAD copy asserts **success** after pinning
  the additive gauge. The rescued test encodes the old, incorrect belief about a kernel that
  was subsequently fixed.

**Landing any of these three would be an active regression** — it would reintroduce a test
that asserts a bug still exists. Treat as archive-only.

---

## Class B — needs work before wiring (9 files)

These 9 are the entire real value of the rescue: 944,889 bytes of genuinely new
implementation (209 exported functions, 182 exported types) that exists nowhere in the repo. None
is exported from `packages/ingestion-pipeline/src/index.ts` — that is the wiring step, and for 6
of them it is the only step left.

**Landing unit:** implementation and test must land in the same commit. Three of the test files
import `./<name>-bridge.js`, so a test landing without its implementation is a hard compile
failure (measured: `ratings-bridge.test.ts` alone produced **150** cascading type errors when its
implementation was absent).

### B1. `scoredist-bridge.ts` + `.test.ts` — land with 1 change

`scoredist-bridge.ts` (110,474 B, 2,749 L) · `scoredist-bridge.test.ts` (52,400 B, 1,246 L)

- **Typecheck: 0 errors, 0 warnings** — both files, compiled together.
- **Tests: 78 passed / 78** (`✓ packages/ingestion-pipeline/src/scoredist-bridge.test.ts (78 tests) 90ms`).
- 17 of 17 import specifiers resolve.
- 44 exported functions. Deterministic-RNG contract honoured: every `Math.random` hit in the file
  is prose in a docblock promising never to use it; the code uses a counter-based LCG.
- Exports `PMF_SUM_TOLERANCE = 1e-9`, which its own test asserts against.

**Work:** none required. Land, then add the `index.ts` export block.

### B2. `research-gse-bridge.ts` + `.test.ts` — land with 1 change

`research-gse-bridge.ts` (129,791 B, 2,952 L) · `research-gse-bridge.test.ts` (49,742 B, 1,122 L)

- **Typecheck: 0 errors, 0 warnings** — both files, compiled together.
- **Tests: 47 passed / 47** (`✓ research-gse-bridge.test.ts (47 tests) 2412ms`), including the
  three slow ones (NB2 moment identity 988 ms, capital null-suite violation rate 536 ms, planted
  comparison with paired standard error 618 ms).
- 17 of 17 import specifiers resolve. 16 exported functions, 41 exported types.
- Header claims are honest: "Everything here is pure. No I/O, no clock, no `Math.random`, no
  database." The only `Math.random` match in the file is inside that sentence.

**Work:** none required. Land, then add the `index.ts` export block.

### B3. `ratings-bridge.ts` + `.test.ts` — 2 one-line test fixes

`ratings-bridge.ts` (151,907 B, 3,645 L) · `ratings-bridge.test.ts` (38,955 B, 951 L)

- **Implementation typecheck: 0 errors, 0 warnings.** 31 exported functions, 28 exported types; 26 of 26 specifiers resolve.
- **Tests: 41 passed / 41** (`✓ ratings-bridge.test.ts (41 tests) 291ms`).
- **Work: 2 type errors, both in the test file**, and both are the repo's own established idiom
  away:

  ```
  L166 TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number | bigint'.
  L167 TS2345: Argument of type 'number | undefined' is not assignable to parameter of type 'number | bigint'.
  ```

  These are `expect(d.omega[3]).toBeGreaterThan(d.omega[2])` under the package's
  `noUncheckedIndexedAccess: true`. `.test.ts` files are **inside** the typecheck scope
  (`include: ["src/**/*.ts"]`), so this fails `tsc --noEmit` and would block the package's
  `typecheck` script. The repo already fixed the identical pattern in 7 sibling test files using
  a `?? 0` guard — e.g. `markets-odds-bridge.test.ts` has 11 such guards, `invention-tracking-bridge.test.ts` 15.
  Apply the same two-line guard. Trivial, and the tests already pass at runtime.

### B4. `calibration-conformal-bridge.ts` — 1 type error, no test

`calibration-conformal-bridge.ts` (140,509 B, 3,587 L) — **no test file was rescued for this bridge.**

- 21 of 21 specifiers resolve. 33 exported functions, 17 exported types.
- **1 type error (TS2769) at L745:**

  ```ts
  const wins = labels.reduce((s, y) => s + y, 0);
  ```

  `binaryLabels` (L462) returns `ReadonlyArray<0 | 1>`, so TypeScript infers the accumulator as
  `0 | 1` rather than `number` and the overload does not match. Root cause is fully isolated:
  the identical pattern at **L897 and L2107 does *not* error**, because there it reduces
  `input.outcomes` (typed `readonly number[]`), not the narrowed `(0|1)[]`. So this is a
  one-site fix — annotate the accumulator (`reduce<number>(...)`) or widen at L743. It is a
  compile-time-only error: a mixed-label sample was exercised at runtime and returned a correct
  typed refusal.
- **Work:** the type fix, plus a test file. This is the largest untested surface in the rescue.

### B5. `decision-ensemble-bridge.ts` — clean, but untested

`decision-ensemble-bridge.ts` (138,338 B, 3,583 L) — **no test file was rescued.**

- **Typecheck: 0 errors, 0 warnings.** 27 of 27 specifiers resolve.
- 38 exported functions, 7 exported types — a large surface, and entirely unexercised by tests.
- **Smoke-tested:** module loads; of 37 callable evals, 36 return a correctly typed
  `ok: false` verdict on empty input and 0 return an untyped value. One,
  `evalInstabilityGate`, throws on `undefined` (it destructures without a guard) — worth a
  test that pins the intended refusal.
- **Work:** a test file. No code change strictly required.

### B6. `root-research-bridge.ts` — **broken, do not wire**

`root-research-bridge.ts` (132,773 B, 3,643 L) — **no test file was rescued.** The largest
eval surface in the rescue: 47 exported functions, 63 exported types.

- **7 type errors — and the first five are a hard runtime crash, not a cosmetic type complaint.**

  ```
  L2816 TS2304: Cannot find name 'isBounded01'.
  L2827 TS2304: Cannot find name 'isBounded01'.
  L2889 TS2304: Cannot find name 'isBounded01'.
  L2958 TS2304: Cannot find name 'isBounded01'.
  L2959 TS2304: Cannot find name 'isBounded01'.
  L3552 TS18048: 'idx' is possibly 'undefined'.   (x2)
  ```

  `isBounded01` is **referenced 5 times and defined 0 times anywhere in the file.** This was
  confirmed at runtime, not merely inferred from the typechecker — calling two of the five
  sites with well-formed, fully-typed input:

  ```
  evalGoKickFrontier  ->  thrown: ReferenceError: isBounded01 is not defined
  evalPublishPolicy   ->  thrown: ReferenceError: isBounded01 is not defined
  ```

  `evalGoKickFrontier` is the worst case: `isBounded01(pConvert)` is the **first executable
  line** of the function, so that eval throws on *every* possible input, valid or not. It
  cannot return a value at all. `evalPublishPolicy` and `evalTunedPolicy` are gated behind a
  sample floor, so they only crash once that floor is met — which makes this worse, not better,
  because it is a latent crash on the production path that no test would catch.

  The remaining 2 errors are `noUncheckedIndexedAccess` narrowing at L3552.
- **Smoke test:** of 45 callable evals, 28 return typed verdicts and **17 throw** on empty input.
- **Work:** define `isBounded01` (the module already has sibling validators — `isFiniteNumber`,
  `checkBounded` — so this is a small, local fix), fix L3552, and add a test file. Do not wire
  before all three are done. This file is the one genuinely damaged artifact in the rescue.

---

## Summary of required work

| File(s) | Class | Blocking work |
|---|:---:|---|
| `scoredist-bridge.ts` + `.test.ts` | B | none — wire after landing |
| `research-gse-bridge.ts` + `.test.ts` | B | none — wire after landing |
| `ratings-bridge.ts` + `.test.ts` | B | 2× `?? 0` guard in the test (L166–167) |
| `calibration-conformal-bridge.ts` | B | 1 reduce accumulator annotation (L745) + **write a test** |
| `decision-ensemble-bridge.ts` | B | **write a test** |
| `root-research-bridge.ts` | B | **define `isBounded01`** (5 sites, crashes at runtime) + L3552 + **write a test** |
| 66 files (C1–C3) | C | archive; none should ever be re-landed |

Net: 3 files need a one-line type fix each, 3 files need tests written, and 1 function needs
defining. Everything else is already in the repo.

---

## Method notes, for anyone re-running this

**Why a detached worktree was necessary.** The main checkout was being moved by another process
during this review — `git branch --show-current` returned `hermes-surf-16b` at the start and
`preserve/at-risk-venn-2026-09-29` minutes later. All conclusions are pinned to
`hermes-surf-16b` @ `230639155` and were computed from `git ls-tree`/`git cat-file` blob hashes,
never from the working tree. If you re-run this later, pin the commit explicitly.

**Regression baseline.** The full package suite was run twice in the worktree — once with the 9
new files present, once with them removed — to confirm they introduce no regressions:

| | Test files | Tests |
|---|---|---|
| Baseline (9 files absent) | 35 failed / 56 passed / 1 skipped (92) | 249 failed / 1,132 passed / 6 skipped |
| With the 9 new files | 35 failed / 59 passed / 1 skipped (95) | 249 failed / 1,298 passed / 6 skipped |

**Identical failure count before and after (35 files / 249 tests).** The 166 new tests all pass
and add zero failures. Note those 35 pre-existing failures are unrelated to this rescue and
predate it — they are a separate open item.

**One caveat on the harness.** The worktree could not be given its own `node_modules` (junction
creation was declined), so `@sports/*` was resolved with a vitest `alias` pointed at the worktree's
own `packages/`, and the typecheck used TypeScript `paths` mapping rather than filesystem
symlinks. Both approaches resolve to the pinned worktree's sources and neither writes to the
repo — but the vitest runs are the one piece of evidence produced via a modified resolution
path, so they are worth re-confirming with a normal install if anything here is going to be
merged on the strength of it.

**Read-only confirmation.** No file in `C:/Users/Garrett/sports` was created, modified, or
deleted. The worktree and all scratch scripts live under `%LOCALAPPDATA%\Temp`.
