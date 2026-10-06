# Rescue 2026-09-26 (6/6): un-blocking the trust gate (PR #915) + the host-toolchain blocker

- From: hermes → (Garrett / Mimo)
- Created: 2026-09-26
- Status: partially done — #915 is an improvement, not a guarantee (read "Honest status")
- Repo: `Beexly/Sports` · branch: `hermes/fix-trust-gate-surname`
- PR: [#915](https://github.com/Beexly/Sports/pull/915) (draft)

---

# Part A — PR #915: the trust gate was failing on an NFL surname

## The finding

`main` is failing the **Trust gate (banned phrases on public copy)** job, so
**every open PR is red** — including PRs that touch no marketing copy. I
reproduced the scan locally against the real rule set: 21 hits, all in
`AGENTS.md`, and three kinds of false positive:

| Text | What it actually is |
|---|---|
| `Drew Lock`, `D. Lock`, bare `Lock` in leaderboard lists | **An actual NFL passer.** `AGENTS.md` carries verbatim social-post digests, so his surname appears as *data* |
| `server-side lock` | A mutex in the odds-engine sync prose |
| `guaranteed-valid structured outputs` | An engineering adjective (already reworded on `main` by someone else, so this PR touches no memory-doc prose) |

Nobody calls a bet "D. Lock", and a quoted leaderboard is third-party data, not a
claim this platform makes.

## The fix — three narrow exemptions, shaped like the two the rule already had

- `LOCK_PROPER_NOUN_SAFE_CONTEXT` blanks `Drew Lock`, `D. Lock`,
  `server-side lock`. A residual standalone "lock" on the same line still hits.
- `isVerbatimSocialDigestLine()` skips `banned.lock` on a line carrying both an
  `@handle` and an ISO date — **only in the root memory docs** (`SCAN_FILES`). A
  marketing surface never legitimately carries a dated @handle digest line, so
  this cannot be used to smuggle "lock" into public copy. The same line under
  `packages/` still fails, and a test asserts exactly that.

## The part that was missing: the guard had no behavioural test

Its exemptions were only asserted **at the source level** (a test greps the file
for strings), so a regression that re-blanked a legitimate phrase — or quietly
dropped the slang ban — would still have passed. New suite runs the **real
script** against throwaway repos and asserts exit codes, with a negative control
for every exemption:

```
node --test scripts/guardrails/trust-gate.test.mjs  →  7 passed, 0 failed
```

Covers: slang still refused ("that's a lock", "lock of the day", "a true lock"); a
digest line mixing `Drew Lock` **and** "the Bills are a lock this week" still
fails; `D.Lock`/`D. Lock`/`server-side lock`/lockfile names clean; "guaranteed
winner"/"risk-free"/"easy money" still fail; `"guaranteed"` as a **code identifier**
still fails.

## Honest status

- The full-tree scan **cannot be completed on the authoring host** — the guard's
  recursive async walk over `apps/web` dies silently (exit 0, no output). So I
  verified the root-docs and `packages/verifier` surfaces with the real rules
  (**0 hits**, was 21) and the behaviour with the new suite, but I **cannot prove
  from here that the job goes fully green**. Other files in `apps/web` may carry
  hits I could not enumerate; the ones I checked (`trust-claims.ts`) are already
  exempt by design.
- #915's CI still shows the trust gate red. Treat that as **unproven** rather than
  as a failed fix: check the job's actual output before spending more time on it.
- If the maintainers would rather not exempt the surname at all, the alternative is
  normalising the digest lines in `AGENTS.md` (e.g. `D. L.`) — but that edits
  verbatim quotes, which I would not do silently.

---

# Part B — BLOCKER: this host cannot run the repo's own test or typecheck toolchain

This is the single biggest constraint on autonomous work in this repo, and it is
worth fixing on purpose rather than rediscovering every session.

**`vitest` cannot run.** Every `node` invocation here is launched with
`--jitless --max-old-space-size=512 --no-lazy`, which removes real WebAssembly.
`/lib/wasm-polyfill.js` then installs a fake `globalThis.WebAssembly` whose
`instantiate()` returns a hardcoded **llhttp** stub regardless of the module
bytes. Vite's import analysis gets that stub back as an AST and reports:

> `Failed to parse source for import analysis … invalid JS syntax`

on files that are **provably valid** (compiling `vite/dist/client/env.mjs`
standalone succeeds). Passing `--no-jitless` to a Worker throws
`ERR_WORKER_INVALID_EXEC_ARGV`, so it is not escapable from a vitest config. **Any
Vite-based runner is dead on this host.**

**`tsc` is worse: it lies.** `tsc --noEmit` on a one-line file with an obvious type
error exits **0 with empty output**. A positive control confirms it. Via the TS
API, `require('typescript')` + `createSourceFile` work, but `createProgram()` is
killed by the heap cap. **An empty typecheck result here means "killed", never
"clean".**

**What works instead, and is what these rescues used:**

1. **Make the repo's own tests runnable under plain node.** A ~200-line vitest
   shim (`describe`/`it`/`expect`, `toBeCloseTo`, asymmetric matchers, `.rejects`,
   hooks) plus an esbuild pass. That produced real evidence for #914 and #916:
   108 and 168 tests passing, including the package's own 28 hand-computed
   statistics pins. It is strictly better than a hand-written harness, which is
   how the earlier attempts produced three false "failures" that were my own
   expectations being wrong.
2. **`node --test` for anything that already uses it** — the factors pre-registration
   gate, the trust gate, and the two new record guards all run natively.
3. **GitHub Actions is the only real gate** for `npm ci`, typecheck, lint and the
   vitest suites. `.github/workflows/ci.yml`'s `test` job runs on `ubuntu-latest`
   with real Postgres.

**Ask:** if anyone wants local vitest back, the fix is a node build **with** WASM
(not `--jitless`) for test runs. Nothing in the repo needs to change.
