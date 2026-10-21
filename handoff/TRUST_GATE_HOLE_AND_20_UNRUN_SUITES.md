# The Trust Gate Has a Real Hole, And Its Own Test Was Born Failing

**Branch:** `audit/reconciliation-2026-10-20`
**Date:** 2026-10-21
**Guard:** `scripts/guardrails/trust-gate.mjs`
**Test:** `scripts/guardrails/trust-gate.test.mjs`

---

## 1. The finding

`scripts/guardrails/trust-gate.test.mjs` has been failing since the day it was written.
Nobody noticed, because **CI never runs it** (see §4).

```
✖ a dated @handle digest line in a ROOT memory doc is verbatim third-party data
  AssertionError [ERR_ASSERTION]: [trust-gate] OK - scanned 1 file(s); no banned phrases.
    0 !== 1
    at scripts/guardrails/trust-gate.test.mjs:83:10
```

The test asserts two things about one line:

```js
const digest = "- @sfdata9ers, 2026-09-24 2:31 PM CDT — leaderboard: Allen 2.9, Purdy 2.8, Lock 2.77.\n";
assert.equal(scan({ "AGENTS.md": digest }).code, 0);   // exempt in a root memory doc
const inCode = scan(clean(digest));                      // NOT exempt in scanned source
assert.equal(inCode.code, 1, inCode.out);                // <- THIS FAILS
assert.match(inCode.out, /banned\.lock/);
```

**Measured on the live tree:**

| path | expected | measured |
|---|---|---|
| `AGENTS.md` (a `SCAN_FILES` root doc) | 0 (exempt) | **0** ✓ |
| `packages/thing.ts` (a `SCAN_DIR`) | 1 (flagged) | **0** ✗ |

## 2. The cause, traced to one regex

The guard has two exemptions that both plausibly apply to this line, and they were added
for different reasons:

1. `isVerbatimSocialDigestLine(line)` — `/@\w+/.test(line) && /\d{4}-\d{2}-\d{2}/.test(line)`.
   Scoped **on purpose** to `SCAN_FILES` (`trust-gate.mjs:520-522`): "a marketing surface
   never legitimately carries a dated @handle digest line, so this cannot be used to smuggle
   'lock' into public copy."

2. `LOCK_PROPER_NOUN_SAFE_CONTEXT` — the blank-then-recheck context list, which includes the
   **stat-table surname form** `\bLock\s+\d+\.\d+`. Its own comment (`:325`) says it was added
   for "The x-intel digests in AGENTS.md quote QB leaderboards verbatim, where the same
   surname appears in table shapes the forms above do not cover."

`"Lock 2.77"` matches form 2. So the line is blanked of its "Lock 2.77" **before** the
digest check ever matters, and the ban never fires — **in every file**, not just the memory
docs.

**Verified directly in node (the engine that matters — Python's lookbehind rejects this
pattern outright):**

```
> "Lock 2.77".match(/\bLock\s+\d+\.\d+/gi)
[ 'Lock 2.77' ]
```

## 3. Why the guard is wrong and the test is right

The stat-table form was **written for the memory docs and applied to the whole tree.** Its
own comment scopes it to "the x-intel digests in AGENTS.md", and the digest rule that
precedes it in the same file is explicitly scoped to `SCAN_FILES` for exactly the reason the
test asserts. The two rules disagree about scope, and the broader one wins — so the narrower
one's stated guarantee ("cannot be used to smuggle 'lock' into public copy") is false.

**The hole is real, and it is a MARKETING surface.** Measured on the live tree:

| line in `apps/web/lib/x.ts` | result |
|---|---|
| `"We locked in on that bet at Lock 2.77."` | **PASSES (code 0)** |
| `"That is a lock. Pick it."` | FLAGGED ✓ |
| `"Our model says Lock 2.77 and it is a lock for the day."` | FLAGGED ✓ |

The middle row is the one that matters: **`"We locked in on that bet at Lock 2.77."` is
betting slang in a public marketing surface, and the trust gate does not flag it.** The
stat-table form was meant to spare a *quoted leaderboard row*; it is instead a free pass for
any marketing copy that happens to contain a surname and a decimal.

Note the third row still fires: the blank-then-recheck catches the residual standalone
"lock" elsewhere on the line. The hole is specifically a line whose ONLY "lock" is the
surname-plus-decimal form.

**The guard's own comment already names the fix's shape** — the digest rule is scoped to
`SCAN_FILES` "on purpose". The stat-table forms need the same scoping.

## 4. Why nobody noticed: CI does not run the file

The repo has **23 files importing `node:test`**. CI invokes `node --test` on **3** of them:

```
node --test scripts/vercel-skip-build.test.mjs
node --test docs/calibration-proposals/evidence/verify-evidence.test.mjs
node --test scripts/guardrails/ai-transport-import-boundary.test.mjs
```

The other **20** are run by no CI step. Measured by running all 20:

```
343 tests, 342 pass, 1 fail
```

The single failure is the one above. So **343 assertions in 20 files — including
`sealed-holdout-open-scan`, `commercial-copy-scan`, `no-unsupported-performance-claims`,
`trust-gate`, and the MIND falsification suite — have never gated a commit.**

The MIND suite is the one that matters most for this audit: it is
`packages/prediction-engine/src/reasoning/__tests__/mind-reasoning.mutation-v2.spec.ts`,
and its **Probe T1** is the in-quote numeric perturbation probe — *mutating `numeric_claim`
from 0.024 to 0.048 scales `total_delta` by exactly 2x and updates the rendered prose without
a legacy string* — which is **the same property the goal spec's Table 5 T1 row names**,
applied to the MIND engine's corpus rather than the literature corpus. It passes 11/11 under
`node --test` and vitest reports **"No test files found"** for it, because the
prediction-engine vitest config's include pattern is `["src/**/*.test.ts", "test/**/*.spec.ts",
"test/**/*.test.ts"]` and the file is `src/**/*.spec.ts`.

**So the spec's T1 assertion was already implemented and already passing — in a file CI
never executed.**

## 5. The provenance of the broken test

Both the guard and the test landed in the **same commit**, `f251d230c` (2026-10-17):
`trust-gate.mjs` +659 lines, `trust-gate.test.mjs` +152 lines. The test file **did not
exist before that commit.**

So the test was **born failing** — it was written against a mental model of the guard that
did not match the guard that shipped with it. The stat-table form was added in the same
change that introduced the test asserting the stat-table form would not apply outside the
memory docs. The contradiction was never resolved, and never observed, because the file is
not in CI.

## 6. What this means for the audit's own claim about T1

Two T-numberings exist and they are **not** the same numbering:

- the **MIND suite's** Probe T1..T10 — about `mind-reasoning.ts` and the MIND artifact;
- the **goal spec's** Table 5 T1..T16 — about `arxiv-hnsw-bridge.ts` and the literature corpus.

They are different probes. But the *algorithm* is duplicated: `mind-reasoning.ts` already
implements the content-driven delta in full — `total_delta`, `consensus_ratio`, the 0.20
deadband, the 0.10 clamp, `rendered_prose` — and the new
`src/literature/arxiv-hnsw-bridge.ts` implements it again, on the literature corpus. The new
module says so itself, in its header, and lists the two deliberate differences (the ACWR
hazard law is a MIND-engine law, and the corpus is the literature schema's). That is
honest work; the duplication is a fact to record, not a defect to hide.

The reference implementation is `acwr_content_driven_fix.py` in the corpus: same clamp
(`FIELD_DELTA_CLAMP = 0.10`), same weight table (`causal: 1.0, correlational: 0.5,
theoretical: 0.3`), same L2 rule ("numeric claim must be a literal substring of the evidence
quote"), same schedule-confound rule (ACWR forced to theoretical 0.3 without
`current_session_load`).

## 7. The fix

1. **Scope the stat-table forms to `SCAN_FILES`**, exactly as the digest rule is scoped, so
   the stat-table blank cannot be used to smuggle "lock" into public copy. The proper-noun
   forms (`Drew Lock`, `D. Lock`, `server-side lock`) and the roster-parenthetical form stay
   unscoped — those are legitimate in ANY file, because they are proper nouns and engineering
   prose, not quoted data.
2. **Add the 20 unrun `node:test` files to CI**, so the guardrails and the MIND falsification
   suite are actually executed.
3. **Keep the failing assertion.** It is the test that found the hole; fixing the guard to
   satisfy it is correct, and deleting or weakening it would be the exact failure this
   audit exists to catch.
