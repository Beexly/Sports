# HANDOFF — GSE Audit Reconciliation, branch `audit/reconciliation-2026-10-20`

**For the next coding agent. Read this before touching anything.**

**Date:** 2026-10-21
**Repo:** `C:/Users/Garrett/Sports-wt-audit-20261020` (a git worktree of `C:/Users/Garrett/Sports`)
**Branch:** `audit/reconciliation-2026-10-20`
**Remote:** `https://github.com/Beexly/Sports.git`
**HEAD at handoff:** `73effa158` — **identical on `origin`** (local and remote verified equal)
**Scale:** 88 commits ahead of `origin/main`; 259 files changed, +190,749 / −10,465
**Last updated:** 2026-10-21, after the GAP-27 and GAP-21 work (see §14 and §15)

---

## 0. THE ONE RULE THIS AUDIT RAN ON

**A file that exists is not a thing that works. A test that exists is not a thing that runs.**

Eight times in this audit, a guard or a test turned out to be decorative: the class-A guard
was crying wolf on a stale log; the canonical AST was private to a script; the 7.099 CRPS
bar was in three documents and enforced nowhere; the trust gate had a marketing-surface
hole; **20 `node:test` guardrail suites — 322 assertions — had never gated a commit**; four
`apps/web` surface tests read source files that a later change had deleted (three of them
were *born* failing); the G7 circuit breaker's spec rule halted 98.5% of *healthy* families;
and my own G7 test recomputed its expected value with the module's own helper, so it passed
while the code was wrong.

**So: never state that something works without running it and quoting a fresh exit code.**
A test that shares its implementation with the code it tests does not count. Assert the
*stronger* property, not the weaker one that happens to be true.

---

## 1. WHERE THE WORK IS

| | |
|---|---|
| **Branch** | `audit/reconciliation-2026-10-20` |
| **HEAD** | `1b34940f8` (on `origin` — verified equal) |
| **Base** | `origin/main` |
| **Uncommitted** | **none** — working tree clean, 0 untracked files |
| **Records** | `handoff/` (~110 `.md` files) and `reconciliation/` (~110 scripts + JSON ledgers) |

### The documents that matter most

| file | what it is |
|---|---|
| `handoff/00-READ-CANONICAL.md` | the canonical entry point for this body of work |
| `handoff/AUDIT_COVERAGE.md` | what is covered, what is not, and the honest boundary |
| `handoff/G7_CIRCUIT_BREAKER_NOISE_FLOOR.md` | **the G7 finding** (see §4) |
| `handoff/GAP21_PUBLIC_PICKS_ENABLED_READERS.md` | **the 8-reader divergence + the one owner decision** (see §14) |
| `handoff/GAP27_DRAFT_ONLY_X_TRANSPORT.md` | **the X-transport regex gap** (see §15) |
| `handoff/APPS_WEB_SURFACE_FAILURES_CENSUS.md` | **the surface-suite census** (see §5) |
| `handoff/WIRING_FEASIBILITY_THE_FINDING.md` | **why 7 of 9 gates have no live producer** (see §6) |
| `handoff/SPEC_CORPUS_FINDINGS.md` | what the design spec revealed that the repo alone did not |
| `handoff/SPEC_FORMULA_ERRORS_AND_WORKER_CORRECTIONS.md` | where the spec itself is wrong |
| `handoff/TRUST_GATE_HOLE_AND_20_UNRUN_SUITES.md` | the trust-gate hole + the 20 unrun suites |
| `reconciliation/gaps.json` | **28 gaps, 15 blocking the business model** (see §7) |
| `reconciliation/final-report.md`, `final_executive_summary.md` | the audit's own report |

### The gap ledger has NO closure field

`reconciliation/gaps.json` records `id`, `severity`, `title`, `category`, `claim_tested`,
`evidence`, `impact`, `recommended_action`, `blocks_current_business_model` — and **nothing
that says whether a gap is closed**. 28 gaps, 15 blocking, and no way to ask which are
fixed. **Adding a `status` field to each gap is an obvious, cheap, high-value next step**
and is not done.

---

## 2. WHAT IS LANDED AND VERIFIED

Every number below was measured, not assumed. To re-verify from the repo root:

```
node node_modules/typescript/bin/tsc --noEmit -p packages/prediction-engine/tsconfig.json | grep -c "error TS"
cd packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run
cd ../.. && node reconciliation/_audit_unenforced_thresholds.mjs
node reconciliation/_check_class_a_coverage.mjs
node scripts/guardrails/trust-gate.mjs
```

| check | expected | note |
|---|---|---|
| `tsc` errors in `packages/prediction-engine` | **exactly 64** | the baseline; the audit adds zero |
| `packages/prediction-engine` suite | **8,575 passed / 0 failed** (+4 skipped) | 995 files, ~5 min |
| `reconciliation/_audit_unenforced_thresholds.mjs` | exit **0** | the T12 dead-threshold auditor |
| `reconciliation/_check_class_a_coverage.mjs` | exit **0** | the class-A coverage guard |
| `scripts/guardrails/trust-gate.mjs` | exit **0** over 3,740 files | fixed this session |
| `apps/web` surface subset (157 files) | **8 failing, all pre-existing** | down from 10; see §5 |

**The 85 commits, in order, newest first** (`git log --oneline origin/main..audit/reconciliation-2026-10-20`):

- `73effa158` GAP-21: eight readers of `PUBLIC_PICKS_ENABLED`, two defaults — and the one decision
- `a6fc8e714` GAP-27: the draft-only guardrail's X pattern missed the ACTUAL transport
- `1b34940f8` ci: put 20 node:test guardrail suites in CI — 322 assertions that never gated a commit
- `ef99c3700` apps/web: fix two "deleted file" surface-guard failures by asserting the STRONGER property
- `2bb16c3e3` G7: the spec's circuit breaker halts 98.5% of HEALTHY families — and now it does not
- `9a2e9aab3` T14: the 50k MCP cognitive router — all sixteen probes landed and pinned
- `d494a71db` the NGS public-exposure test was born failing too — the page it reads is gone
- `aaa76a454` the ledger now asserts the repo-level guards are green
- `a696c2b83` the trust gate had a marketing-surface hole, and 20 node:test suites never ran
- `00108b495` T1/T4/T6/T8/T15/T16: six probes land, each with a sweep that can go red
- `d64ab710d` T15: the 13 fenced internal routes are 12, and the CRPS bar is enforced in no code
- `39cb88f97` the spec corpus: what it revealed that the repo alone did not
- `bbaf830e6` T2/T3/T5/T7 + the spec's named mutation-v4 suite, and the canonical AST in the library
- `48e8191c7` T13: pin the proximal bridge on an unbreakable bow-arc
- `d89939daf` the periodic-ID module held to the same standard, and the sweep found its own bugs
- `a35617abb` the delegate's report was checked, and two of its claims did not survive
- `ef04b70c9` T11: the R5–R10 tests were green with **R8 DELETED**
- `503630a3b` the class-A guard was crying wolf, and the run log was stale
- `e724120ea` X20 was closed, but on the WRONG GRAPH, and the treatment was read as a mean
- `a679af1d7` the E-value was measured by nobody, and no mediator expansion could ever activate
- `a7397add1` the four G3 integration tests existed only in the spec, and a flaky test was hiding a real verdict
- `cf4f4f082` T12 is a real gate now, and it found two constants that gate nothing
- `4e133ee96` the spec's CI gates did not exist, and the barrel was broken
- `22caa7b2f` the FCI header now states its two partial rules, and l_NV is attributed
- `015d5d5f1` A082 quoted the spec's Case-3 equation and then checked something else
- `c3d46e180` the FCI module oriented against a rule, and A083's DGP could not see the question
- `206468c51` the honesty constraint is live in production, and 1099 was wrong
- `000f2ef4d` the honesty invariant is now enforced by the database
- `500521091` the X20 test file, and two of the spec's "existing" modules do not exist
- `fda9213b2` the L1-L4 gate was under-reporting by 238: a basename is not an identifier
- `138071c0f` X20 was NOT fixed: the spec said it was, the code disagreed, and A082 never tested it
- `d40b7f09d` the ITCR gate is wired: a weak reasoning trace refuses a well-identified claim
- `051a62ae4` the proximal bridge is wired: a bow-arc refusal becomes an answer when the confounder is proxied
- `557de8fa7` the semiparametric E-value gate was missing, and the ITCR score had a blind spot
- `3abe91ed8` the proximal bridge now enforces the CI E-value too, and the SE was wrong by n
- `89cbb3b06` the reconciliation record: production is deployed, X20 is resolved, three frontier modules audited
- `b4d628932` three frontier modules, and an audit that their constants actually gate
- `7d6328f14` production is live: schema deployed, 1,099 class-A rows, Recall@20 = 100%
- `79ee59f3c` X20 is RESOLVED, and the module is RIGHT: the spec's equation conditions on a different variable
- `93f4e543b` G4's third conjunct: the placebo test, and two statistics that were wrong
- `09839882e` G3's positivity conjunct: the spec's second number was absent entirely
- `5ac146270` G4 is a CONJUNCTION over two numbers: the CI's own 1.10 was never enforced
- `d1962262f` the builder re-run after A087, and the verifiers audited by reading them
- `db5431fb9` the E-value now GATES the expansion: a constant that was exported and never checked
- `948aaebc5` the reconciliation doc: section 4.4, a refusal that names the measurement
- `e574c7a19` the spec's section 4.4: a refusal that names the measurement that would change the answer
- `72eb2970e` the retrieval claim, measured: 60 activations, every one class-A
- `3cfaef427` exempt the quarantine script from the coverage check
- `cc1c781df` the reconciliation doc: the class filter's real coverage, and the 781 leaked activations
- `87ee6d243` the class filter had 22 read sites to check; it had 77, and 21 of them leaked
- `89c15c594` the builder can no longer regress the corpus: the re-anchoring pass runs as part of it
- `42e49d031` the reconciliation doc, updated to the measured state
- `e806bc6e7` the causal stack is now reachable: discovery → identification → the gate
- `d9c4a4332` the three stages joined: FCI → DYNOTEARS → ADMG, with the spec's projection rules
- `b8ef0611a` the live database was serving an empty corpus: the class filter excluded 5,513 of 5,514 premises
- `c80a6a510` the adversary review: an identified effect still has to be robust to publish
- `9f987d763` the verified-literature term reaches W, and a finite difference caught a transposed gradient
- `b4c0738b4` the shock path can now ask the CONDITIONAL question, and FCI/DYNOTEARS lands
- `422ffdb33` every insert path carries the status the schema now requires
- `08a649207` the spec's exact filter: `record_class = 'CITABLE_VERIFIED' AND status = 'ACTIVE'`
- `05cd21430` name the loaders for what they do: the corpus, and the literature
- `60bc3d5f8` promote the re-anchored corpus: 1,098 admitted, and the labels are true
- `daa5d55e9` one status vocabulary: the re-anchoring pass now uses the builder's
- `3b80b5f27` make the corpus labels true: a status that says WHY, and three more defects
- `f7ebbe833` reconciliation: the L1-L4 gate, end to end
- `0f9a00998` prove Gate G3 blocks the real intervention path, not just the gate module
- `349c24466` Gate G3: an unidentified effect may not be reported as a causal one
- `5f54ee254` one definition of citable: the builder now calls the shared gate
- `ea4093892` complete the 6th edit: three-class partition, and stop fabricating spans downstream
- `d6af20a6c` build the L1-L4 admission gate so it can FAIL: 0 of 5,149 admitted
- `377c5d2c6` RETRACTION: the concept axis's "38.9-point edge" was a definitional artifact
- `83c64eb56` reconcile the supplied design spec against the measured repo
- `538834247` build and run the concept grader: 139 graded, and the directions are noise
- `d7b8925f9` the direction is not recoverable; the METRIC is the real gate
- `3a61d89e2` measure the concept axis: 201 gradeable, and locate the real blocker
- `ce9073f64` build the measure resolver: grade context premises on their own axis
- `7dc40a8a6` measure what in the MIND corpus is gradeable: 5,149 records, 128 gradeable
- `811d58685` stage a live bridge producer: the missing PIT path
- `a60321160` measure the f2 duplicate claim: it holds, and the gate stays
- `b2d87b164` exec summary: record the six honesty defects and the structural finding
- `454c5fedb` fix a category error in residual grounding; five honesty defects in the literature loop
- `6464b3f4a` fix a tautology in the promoted-edge estimate; honest literature coverage
- `91ed59b57` recon integration: 2 corrections to my work, 4 new structural facts
- `99dce8e95` unwired honesty machinery + repo-wide zero-importer sweep
- `f7e6e7e53` continuous causal reasoning: measured map + staged improvements
- `0fdcdefac` chore(recon): gitignore the regenerable branch-list scratch file
- `2575402f6` GSE reconciliation: research-to-code audit + pgvector literature index

---

## 3. THE T-PROBES — WHAT EXISTS, AND WHERE

The spec named probes **T1–T16**. Each is a module + a test file + a **mutation sweep**
that can go red.

| probe | module | test | sweep |
|---|---|---|---|
| T1 | `src/learning/settlement-loop.ts` | `test/settlement-loop.t16.spec.ts` (17) | `_mutation_sweep_t16_settlement.mjs` |
| T2 | `src/causal/do-calculus-id.ts` | `test/causal-engine.mutation-v4.spec.ts` | `_mutation_sweep_honesty.mjs` |
| T3 | `src/causal/causal-claim-gate.ts` | `test/causal-engine.mutation-v3.spec.ts` | — |
| T4 | `src/literature/literature-verification.ts` | `test/literature-and-bow-arc.t2t3t5.spec.ts` | — |
| T5 | `src/causal/proximal-bridge-id.ts` | `test/proximal-bridge-id.t13.spec.ts` | `_mutation_sweep_t13_proximal.mjs` |
| T6 | `src/causal/adversary-red-team.ts` | (landed) | — |
| T7 | `src/calibration/conformal-copula-kelly.ts` | `test/conformal-copula-kelly.t7.spec.ts` | — |
| T8 | `src/learning/g7-circuit-breaker.ts` | `test/g7-circuit-breaker.spec.ts` (15) | `_mutation_sweep_g7_circuit_breaker.mjs` (10/10) |
| T11 | `src/causal/fci-pag.ts` (R5–R10 per Zhang 2008) | `test/…` | — |
| T12 | the threshold auditor itself | — | `reconciliation/_audit_unenforced_thresholds.mjs` |
| T13 | `src/causal/proximal-bridge-id.ts` | `test/proximal-bridge-id.t13.spec.ts` | `_mutation_sweep_t13_proximal.mjs` |
| T14 | `src/mcp/mcp-cognitive-router.ts` + `src/features/feature-matrix.ts` + `src/bridge/non-stat-situational-compiler.ts` | `test/mcp-cognitive-router.t14.spec.ts` (18) | `_mutation_sweep_t14_mcp.mjs` (9/9) |
| T15 | `packages/ingestion-pipeline/src/walk-forward-emission-gate.ts` | `packages/ingestion-pipeline/src/__tests__/walk-forward-emission-gate.t15.test.ts` (27) + `apps/web/__tests__/t15-ngs-route-fence.test.ts` (13) | `_mutation_sweep_t15_fence.mjs` |
| T16 | `src/learning/settlement-loop.ts` | `test/settlement-loop.t16.spec.ts` (17) | `_mutation_sweep_t16_settlement.mjs` |

**The mutation-sweep house pattern** — read any one of them before writing another:
`packages/prediction-engine/reconciliation/_mutation_sweep_g7_circuit_breaker.mjs`.
Non-negotiables it encodes:
1. **ONE failure array drives the exit code.** Never a counter that can miss a branch.
2. **Refuse to run against a red baseline**, and say so.
3. **Lock the tree** (age-based staleness, not PID-based — PIDs get reused) so two mutators
   cannot interleave and leave a mutant behind.
4. **Restore every mutated file in a `finally`**, and recover from a leftover backup on start.
5. **Match the fragment against the file's actual line endings** (CRLF vs LF).
6. **Detect by asking "did the named test PASS?"** via vitest's JSON reporter — never by
   pattern-matching the verbose reporter's output shape.
7. **Assert the sweep's own output**, not just its exit code.
8. **Prove the sweep can go red**: run it in a self-test mode that breaks the baseline and
   confirm it exits 1 and says `PHASE 1: SKIPPED -- the baseline is red`.

---

## 4. THE G7 FINDING (the biggest one, and it is new)

`handoff/G7_CIRCUIT_BREAKER_NOISE_FLOOR.md`

The spec says: *"If ECE30−ECE250 > 0.02, Gate G7 halts firing on that market family."*

**Applied literally, that rule halts 393 of 400 PERFECTLY CALIBRATED families** — measured
over 400 families whose forecasts were spread across the probability range and whose
outcomes were drawn *from* those forecasts, so there is no drift at all.

**Why.** A binned ECE is an *absolute* value, and the expectation of an absolute value is
not zero: for a bin with true rate `p` and `N` observations, the observed frequency has
standard error `σ = √(p(1−p)/N)` and the bin's ECE term is `|observed − forecast|`, whose
expectation is `√(2/π)·σ`. So a perfectly calibrated family has a **positive** expected ECE,
and the smaller (30-sample) window has the larger fluctuation. The expected
`ECE30 − ECE250` under the null is therefore positive and large: **measured median 0.1210**,
p05 0.0430 — against a threshold of 0.02, which is **0.219 of one standard error**.

**What would have happened.** A circuit breaker that halts 98.3% of healthy families is
worse than no circuit breaker: it takes publishing offline for every market family,
permanently, and it *looks like the gate is working* because it fires. A gate that reports
success by refusing everything.

**The fix, measured** (400 calibrated + 400 drifting families):

| rule | false halts | true halts |
|---|---|---|
| spec only (`diff > 0.02`) | 397 | 400 |
| bias-corrected (`diff > bias + 0.02`) | 137 | 400 |
| **bias-corrected + 2 SE** | **0** | **400** |
| bias-corrected + 3 SE | 0 | 395 |

Two standard errors keeps every true drift caught with no false halts; three loses five
true catches for no gain. Confirmed through the module itself over 200+200: the spec's rule
would halt **197 of 200** calibrated families, the gate halts **0**, and it catches **200 of
200** drifting ones.

**The spec's number is still there.** `G7_ECE_HALT_THRESHOLD` remains 0.02 and remains a
*component* of the floor. **Both verdicts are reported** — `specHalt` (the spec's rule alone)
and `halt` (the rule as it must be applied to be usable) — with the bias excess, both
standard errors, and the floor.

**Also in that module:** the spec's rule is about a MARKET FAMILY and the existing rule was
per-call, so nothing grouped the samples by family. The group key is the repo's own
`sport|market` shape — the shape `selective-publish-runtime.ts` builds and
`proven-path-engine.ts` splits — because a key of any other shape produces a halt list that
never matches the durable pause reader, and the "gate" would silently never fire.

### The sweep caught a weakness in my own test — read this before writing any test

My first version of the noise-floor test recomputed the expected floor with `eceNoise` —
**the same function the module uses** — so changing `eceNoise` moved both sides together
and the test still passed. The mutation *"the standard error is computed with the wrong
rate"* survived. The fix was a second test that recomputes the bias and standard error
**independently from the bin structure**, with no reference to the module's helper, and the
mutation was repointed at it.

**This is the third time in this audit a test that shared its implementation with the code
passed while the code was wrong.** The other two: the canonical AST (private to a script)
and the 7.099 bar (in three documents, enforced nowhere).

---

## 5. THE apps/web SURFACE CENSUS

`handoff/APPS_WEB_SURFACE_FAILURES_CENSUS.md`

The surface subset is **157 of the 959** `apps/web/__tests__` files (those matching
surface / fence / gate / calibration / trust / ngs / picks / honesty / proof / board).

```
BEFORE:  Test Files  10 failed | 146 passed |  1 skipped (157)
         Tests       15 failed | 1465 passed |  3 skipped (1483)
AFTER:   Test Files   8 failed | 148 passed | 1 skipped (157)
         Tests       13 failed | 1467 passed | 3 skipped (1483)
```

**All were pre-existing** — none of the failing test files, and none of the source files
they read, appear in this audit's diff.

**Two fixed here**, both by asserting the *stronger* property:
- `internal-surface-fence` read `app/intelligence/metrics/page.tsx`, which no longer exists.
  Now: a fenced page must either be present and call its own gate, **or be absent entirely**
  — a page that does not exist is a *stronger* form of dark.
- `fictional-data-honesty` had **two** different causes: `app/intelligence/page.tsx` was
  deleted, and `app/fantasy/dfs/page.tsx` no longer renders fiction at all (its fixture
  fallback was removed in favour of `loadCurrentDfsSlate()`, but the identifier survives in
  a *historical comment*, so the keyword predicate still fired). A disclosure is now required
  only while a page actually renders fiction, tested against comment-stripped source.
  **A stale allow-list entry is still surfaced on the console**, so the list can be pruned
  deliberately rather than by accident.

### The one that matters and is NOT fixed — a live leak

`public-picks-gate-parity.test.ts` fails with:
```
x BOTH endpoints go dark when PUBLIC_PICKS_ENABLED is off
  AssertionError: /api/picks must be dark: expected 200 to be 503
x the dark slate response leaks no board shape
  AssertionError: expected '{"success":true,"data":{"date":"2026-…' not to contain 'totalPicks'
```

**This is the same surface as the T15 NGS exposure.** `/api/picks` returns **200 with a full
board payload** when `PUBLIC_PICKS_ENABLED` is off, and that endpoint also reaches
`db.nextGenStat` through the intelligence bundle and renders NGS prose
(`CPOE +8.4, sep 3.90y, YAC+ +1.10`) into `intelligence.why[]` for a possibly-anonymous
caller, with `PUBLIC_PICKS_ENABLED` defaulting **on**.

**Investigated but deliberately NOT changed — here is the analysis, so you do not repeat it.**
The route *does* have the 503 gate (`apps/web/app/api/picks/route.ts:74`,
`if (!gates.canExposePublicPicks) return jsonNoStore(bootstrapGateResponse("Public picks"), { status: 503 })`).
The failure is the **default**, and it is a genuine contradiction in the repo:

| source | says |
|---|---|
| `packages/prediction-engine/src/platform-config.ts:166` | `parseBool(env, true)` — **absent = ON** |
| `packages/prediction-engine/src/honesty/commit-reveal.ts:35` | `env["PUBLIC_PICKS_ENABLED"] === "true"` — absent = OFF |
| `apps/web/app/api/ops/public-surface-truth/route.ts:783` | `=== "true"` — absent = OFF |
| `apps/web/lib/product/board-surfaces.ts:58` | `truthy(...)` — absent = OFF |
| `apps/web/lib/cockpit/jarvis-data.ts:530` | `envTrue(...)` — absent = OFF |
| `apps/web/lib/data-sources/free-settlement-runner.ts:990` | `=== "true"` — absent = OFF |
| `.env.example` | `PUBLIC_PICKS_ENABLED="false"` |
| `docs/calibration-proposals/2026-08-25-...md:143` | *"the public board is behind `PUBLIC_PICKS_ENABLED` (default `false`, `platform-config.ts`)"* — **the doc cites the file that contradicts it** |
| `platform-config.ts`'s own header | *"Every gate defaults to the SAFEST option — explicit opt-in required for each. Phase 0 (default): ingest + score + internal admin only, no public surface."* |
| `docs/ai/jarvis/JARVIS_OPERATOR_BRIEF.md:53` | *"picks stay internal until you open it"* |

**So the repo has ONE parser that defaults ON, against nine that say OFF, and against its
own file's stated doctrine.** Two things block acting on it unilaterally:
1. **Production already returns 404 for `/api/picks` and `/api/picks/daily-slate`** on
   `sportsegg.com` — so the live surface is not currently exposed at that path, and the
   blast radius of flipping the default is **not measurable from here**.
2. **Flipping the default is a behavioural change to a live public endpoint.** The test has
   been red long enough that nobody is certain the current behaviour is the *intended* one;
   the alternative is that the endpoint was deliberately changed and the test was not
   updated. **That is the owner's call, not the audit's.** It is GAP-21.

**The cheapest correct step is available and does not need the owner:** add a
`status`/`default_reconciled` note to GAP-21 with the table above, and make the
`platform-config.ts` default a single exported constant with a test that pins the
*agreement* between the parsers, so the day the owner decides, the change is one line.

### The other six open failures

`b2b-v1-scope-field-gate` (a PREMIUM-scope key still gets `pModel`),
`compliance-scanner-payments-surfaces` (pricing copy still contains underwriting tokens),
`in-play-exclusion-surface` (3: undefined element, missing `data-testid`),
`picks-mobile-tap-targets` (the CTA lost its tap-target classes),
`picks-paywall-copy-truth` (3: the entitlement filter, the daily cap, the confidence gate),
`public-surface-local-time` (the Central stamp is `America/Chicago`, not `UTC`),
`td-board` (an unlicensed pool is not labelled fictional).

**No shared cause** — they are independent behavioural failures, recorded so they are a
known count rather than a surprise.

### The pattern, as a count

Four separate tests in this repo read a source file that a later change deleted:
`ngs-public-exposure` (fixed), `internal-surface-fence` (fixed), `fictional-data-honesty`
(fixed), and `trust-gate` (fixed). **Three of the four were born failing and none was
observed** — because `apps/web`'s suite is not run in CI the way the prediction-engine
suite is, and the `node:test` guardrails were not run at all.

---

## 6. WHY SEVEN OF NINE GATES HAVE NO LIVE PRODUCER

`handoff/WIRING_FEASIBILITY_THE_FINDING.md`

The G1–G9 integrity pipeline is **100% dead code**. Two exhaustive investigations found that
**seven of the nine gates have no live evidence producer anywhere in the repo** — no
`AdversaryRedTeamVerdict`, no `ItcrGateResult`, no `CausalCertificate` outside of tests.

**This is why wiring is delicate.** Feeding a gate a rubber-stamped verdict so it *appears*
wired is **worse than no gate**, because the gate then reports "passed" on evidence nobody
produced. The finding is recorded rather than papered over.

The wiring that IS legitimate, and is being done now:
- The G7 module feeds the **live durable-pause mechanism**
  (`apps/web/lib/ops/ranking-pause-durable.ts` persists a per-group pause list;
  `apps/web/app/api/picks/route.ts` reads it and drops a paused group's picks;
  `apps/web/lib/proven-path-engine.ts` splits the key on `|`). **The consumer is live — the
  producer was missing.** That is the one wiring that is safe to do.
- `selective-publish-runtime.ts:320` computes exactly the `marketFamilyKey` format the G7
  breaker emits. **That is the join point.**

---

## 7. THE 28 GAPS — AND THE ONE THING MISSING FROM THE LEDGER

`reconciliation/gaps.json` — 28 gaps: **6 CRITICAL, 10 HIGH, 8 MEDIUM, 4 LOW**; **15 block
the current business model**: GAP-01, 02, 03, 04, 06, 07, 08, 09, 13, 17, 18, 21, 23, 25, 26.

**The ledger has no closure status.** Nothing records which of the 28 this audit closed.
**Adding a `status` field to each gap is cheap, high-value, and not done.**

The gaps most relevant to a next agent:

| id | severity | one-line |
|---|---|---|
| GAP-01 | CRITICAL | Oct-18 published picks are **clamped into a fixed window**, not the engine's output |
| GAP-02 | CRITICAL | The walk-forward emission gate is closed on the path that produces nothing |
| GAP-03 | CRITICAL | The Week 6 publish path (Python) bypasses the entire TS honesty/gate stack |
| GAP-21 | CRITICAL | The public-picks gate is never consulted at mint time; `isPublished` defaults true |
| GAP-24 | MEDIUM | **No gate registry exists**, so gate state is not a queryable fact |
| GAP-23 | HIGH | Nine of 37 integrity gates are unwired, dark, or off by default |

**GAP-24 is the cheapest unbuilt thing in the whole audit.** The action is: *"Build a gate
registry: one table of gate id, file:line, what it checks, default state, and whether it
blocks at mint, at read, or only in audit. The audit's own gate inventory is a usable first
draft."* The inventory already exists as `reconciliation/_census_dark_corrected.py` and the
gate lists in `handoff/` — it needs to become a queryable artifact, not a document.

---

## 8. THE node:test GAP — NOW CLOSED, BUT 7 SUITES ARE STILL RED

**20 suites / 322 assertions** now gate a commit (commit `1b34940f8`), added as a CI
**matrix** so a failure names the suite that broke. The list is **explicit, not globbed**, on
purpose: a new guardrail suite is not picked up automatically, because a suite that fails on
its first appearance should be added after it has been seen green.

**Still red and deliberately excluded** (a red suite is not a gate) — the seven
`apps/mobile/tests/*.test.js` files: `calibration`, `client`, `format-entitlements`,
`offline-queue`, `purchases`, `trust`, `voice`. **They fail today** and are not in CI.

**Note:** `handoff/NODE_TEST_SUITES_IN_CI.md` is **referenced by the CI comment but does not
exist yet** — the CI file says "their status is recorded in `handoff/NODE_TEST_SUITES_IN_CI.md`"
and that file was never written. **Write it.** It is a 5-minute task and the CI comment
currently points at nothing.

---

## 9. THE T15 NGS LEAK — RECORDED, NOT FIXED

`apps/web/app/api/picks/route.ts` reaches `db.nextGenStat` through `loadBundleSurfaces` and
renders NGS prose into `intelligence.why[]` for a possibly-anonymous caller. Verified
empirically: `reason()` produces
`"NGS receiving: … — CPOE +8.4, sep 3.90y, YAC+ +1.10, RYOE/att +0.60, aDOT share 33.3%"`,
and the route calls `projectPickIntelligenceForViewer(raw, true)`, which keeps `why[]` for
every tier including anonymous FREE (`PUBLIC_PICKS_ENABLED` defaults on).

It is listed in `KNOWN_PUBLIC_NGS_EXPOSURES` in
`apps/web/lib/fences/no-raw-ngs-fence.ts`, and a test asserts that list is **exactly** the
set of anonymously-reachable NGS routes, so a new anonymous route fails CI rather than
joining the list quietly.

**Closing it is a product change** — stripping NGS observations from the public intelligence
projection — and is the same gate as the `/api/picks` finding in §5. **One decision, two
symptoms.** It is the owner's call.

Also measured and recorded: the spec's list of 13 fenced routes is actually **16** —
5 ops/cron (CRON_SECRET) + 10 nflverse metric surfaces (premium entitlement) + 1 public.
`ops/public-surface-truth` is on the spec list but serves **no** NGS data (its "ngs" hits
are substrings of "signals"; its "separation" hits are the ranking-polarity law
`positive_separation_required`). Four routes serving NGS-derived data are **absent** from the
spec list: `cron/signal-ledger-write`, `cron/refresh-player-stats`, `ops/id-crosswalk`, and
`picks/route.ts`. The count is a pinned constant, so a new NGS route fails CI until the
registry is updated on purpose.

---

## 10. THE T14 DEVIATIONS — READ BEFORE CHANGING THAT MODULE

`handoff/` has no separate T14 file; the deviations are in the delegate's report and in the
module header. The ones that matter:

1. **The corpus is scaled.** Fixture = 1,200 records / 301 survivors, not 50,000 / 2,500. The
   design targets are asserted as *constants* (50,000 / 2,500 / 250 / 50); the funnel's
   *behaviour* is exercised on the scaled corpus because a 2,500-node HNSW build costs
   minutes per mutation round (the sweep runs the gate 10×). **Stated in the test header.**
2. **No pgvector.** The repo has no pgvector dependency, so Stage B is a self-contained
   multi-layer HNSW (m=24, ef_construction=200, m_L=1/ln(24), hnswlib's heuristic
   *including* its re-add of pruned candidates — without that re-add the measured recall was
   0.974, below the floor, so the **index** was fixed, not the floor).
3. **The spec's `ef_search` contradicts its top-K.** ef=64/128 cannot return 250 neighbours
   (an ef-wide search returns ≤ ef), so the base layer expands to `max(ef_search, top-K)` and
   `ef_search` stays the reported exploration width. Documented in the code.
4. **288 ≠ 4×64.** The brief's "four 64-bit words" is off (4×64=256). 288 = 9×32 exactly, so
   the mask is a `bigint` exposed as nine 32-bit words, with 279 families in bits 0–278 and
   9 reserved headroom bits.
5. **The share model is a documented construction, not measured data.** First-order effects
   sum to zero per mechanism; a dampening coupling transfers |shrunk cross term| from the
   shared target to the seam. **The coefficients are the module's own, not observations from
   a game.**
6. **"A reinforcing pair does not shrink"** — a 2-mechanism reinforcing pair has m=2 → the
   factor is exactly 1 → not shrunk; and because the spec's formula is sign-independent, a
   *reinforcing triple* (m=3, all γ≥0) **is** shrunk, to prove the factor is not a proxy for
   the sign of γ.

Measured headline values: `γ(004|010) = −1` (negative), `γ(004|022) = +1`, `γ(010|022) = −1`;
reallocation amount 0.020825396829596037; share `{0.25996825396300494, 0.47103174603699505,
0.269}` (sums to 1); Stein factor 0.8677248678998348; first-order ΔY 0.081 → coupled ΔY
0.06538095237780298 (the joint effect is *smaller* than the sum); **measured Recall@20 =
0.9960132890365448** (HNSW top-20 vs brute-force top-20, 301 queries).

---

## 11. WHAT IS IN FLIGHT RIGHT NOW

**One delegated wiring task was running when this handoff was written:**
`delegation id deleg_15b51503`, subagent `sa-0-6f642442`, transcript at
`C:\Users\Garrett\AppData\Local\hermes\cache\delegation\live\deleg_15b51503\task-0.log`.

**Goal:** wire the G7 breaker and the T16 settlement loop into the live publish path, with a
test that **fails without the wiring**, and commit + push to this branch.

**Status at handoff:** the call chain was confirmed but **no files had been written**. It
was steered to land the G7 producer first, prove the test goes red without the wiring, and
commit — with an explicit instruction that an honest *"here is the call chain and here is
why the producer cannot be added safely"* is a better result than more investigation with no
artifact.

**CHECK FIRST:** `git log --oneline origin/audit/reconciliation-2026-10-20` — it may have
landed after this document was written. **If it did not**, the lead survives in the
transcript: `packages/prediction-engine/src/selective-publish-runtime.ts:320` computes
exactly the `marketFamilyKey` format the G7 breaker emits. That is the join point.

**A previous attempt at this same task was interrupted** after ~2.5 h of investigation and
wrote **zero** files. Its investigation was not preserved, so the lead above is what remains.

## 12. THINGS THAT ARE TRUE AND EASY TO GET WRONG

- **`reconciliation/gaps.json` has no closure status field.** Do not assume a gap is closed.
- **`handoff/NODE_TEST_SUITES_IN_CI.md` does not exist**, but CI references it. Write it.
- **The `apps/web` full suite (959 files) CRASHES under concurrent load** (a vitest worker
  exit) and takes >20 minutes. Scope any `apps/web` run to the specific files you touch.
  The 157-file surface subset is the reproducible measurement.
- **`tsc` baseline is exactly 64 errors in `packages/prediction-engine`.** Your change must
  add zero. Do not "fix" pre-existing errors — they are other agents' in-flight work.
- **The repo uses `noUncheckedIndexedAccess: true`** — non-null assertions (`!`) are the
  house convention. Follow it.
- **`node --test` output uses `ℹ pass N`, not `# pass N`.** The `#` form is a different
  reporter; matching the wrong one silently reports **0**.
- **A multi-line heredoc `git commit` message is rejected by the environment's guard.**
  Write the message to a file and use `git commit -F <file>`.
- **The user's standing rule: `git push -u origin <branch>` after EVERY cycle's commit.**
  A commit that does not reach origin does not exist.
- **The working tree is SHARED.** Other agents run tests in it. Do not `git checkout` a
  branch, do not `git stash`, do not reset. Commit only your own files.
- **`scripts/publish_late_sun_mon_live_free.py` bypasses the entire TypeScript honesty/gate
  stack** (GAP-03). `grep` finds it in no cron/vercel/shell config, so it may be dead — but
  it is the Python publisher that produced the clamped Week 6 output in GAP-01.

---

## 13. THE RECOMMENDED NEXT FOUR THINGS

1. **~~Write `handoff/NODE_TEST_SUITES_IN_CI.md`~~ — DONE.** CI pointed at it and it did
   not exist. It now also carries the correction that the `apps/mobile` suites are
   *unbuilt*, not red (145/150 after a build; 5 real pre-existing failures).
2. **Add a `status` field to all 28 entries in `reconciliation/gaps.json`**, and close the
   ones this audit actually closed. The audit has **no closure record at all**, which is the
   single biggest bookkeeping hole in the work.
3. **Build the GAP-24 gate registry** — one queryable table of gate id, file:line, what it
   checks, default state, and whether it blocks at mint, at read, or only in audit. The
   inventory already exists. This is the cheapest unbuilt thing in the audit and it makes
   every other gap checkable.
4. **Settle GAP-21 with ONE command, then one line of code.** Run
   `printenv PUBLIC_PICKS_ENABLED PUBLIC_PICKS` in the production environment. The founder's
   law is already recorded (`docs/ops/OPEN_LEDGER.md`: *"Explicit YES only"*, and
   `PUBLIC_PICKS_ENABLED true → false` as a law-enforcement action) — **the default for an
   unset variable is OFF, and `platform-config.ts:166` does not implement it.** Which of
   the two variable names is truthy decides whether the fix is an env change or a code
   change; the decision table is in `GAP21_PUBLIC_PICKS_ENABLED_READERS.md` §6b. **Either
   way, also reconcile `board-surfaces.ts:58` to read ONE name** — a gate opened by a
   different variable than the one that governs it is not one gate.

**Two newly-verified things a next agent should not re-derive:** the T15 NGS leak is
**not currently live** in production (zero markers in the live body), and the
`apps/mobile` suites are **not failing** — they are never built.

**And one thing to be careful about:** the honest temptation in this audit is to wire a gate
so that it *looks* done. Seven of nine gates have no live evidence producer, and feeding
them rubber-stamped verdicts would be **worse than no gate** — the gate would report
"passed" on evidence nobody produced. The G7 wiring is safe because the consumer (the
durable-pause mechanism) is already live and the producer's verdict is computed from real
settled bets. Do not extend that pattern past where the evidence is real.

---

## 14. GAP-21 — EIGHT readers of one env var, TWO defaults, and the one decision

`handoff/GAP21_PUBLIC_PICKS_ENABLED_READERS.md`

`PUBLIC_PICKS_ENABLED` is read in **eight** places. **Seven** treat an unset variable as
OFF. **One** treats it as ON — and that one is the one that gates the live board:

```
packages/prediction-engine/src/platform-config.ts:166
  publicPicksEnabled: parseBool(process.env["PUBLIC_PICKS_ENABLED"], true)   <-- ON
```

**The two subsystems that matter most disagree inside one process.** The route that serves
the board asks `platform-config` (ON when unset); the honesty module that decides whether a
public commitment exists asks its own parser (OFF when unset).

**Everything else in the repo already says the outlier is wrong** — its own header
(*"Every gate defaults to the SAFEST option"*), `.env.example` (`"false"`), a doc that
cites the very file and says *"default `false`"*, and **the repo's own test**
(`public-picks-gate-parity.test.ts` deletes the variable and asserts 503 — **it is RED**).

**Live production, measured, with the caveat stated.** `/api/picks` 200, `daily-slate` 200,
`public-surface-truth` 200, `canExposePublicPicks` true. The "PUBLIC_PICKS ON" hint comes
from a **strict** parser, so **production explicitly sets the variable** — meaning flipping
the default would not change the live deployment, only unset-variable environments.
**The live SHA is not an ancestor of this branch, so live semantics are not attributed to
local code.**

**A CORRECTION to an earlier record:** the live `/api/picks` body has **zero** NGS markers
(`CPOE`, `avgSeparation`, `avgYacAboveExpectation`, `nextGenStat`, `RYOE`, `aDOT` — all
0). The ten initial "NGS" hits were the substring inside `"STANDINGS"`. **The T15 NGS leak
is conditional, not currently live.** The earlier record of it as a live exposure was
overstated.

**THE FOUNDER ALREADY DECIDED — and the code diverges from that decision.**
`docs/ops/OPEN_LEDGER.md` (the live operator ledger) records, verbatim:

```
- Explicit YES only: LIVE_BOARD · PUBLISH_LEDGER · public picks ladder · Phase C · #226
- 2026-07-30: `PERFORMANCE_STATS_ENABLED` true → false. `PUBLIC_PICKS_ENABLED` true → false.
  Both were live in violation of founder law.
```

**So the default for an unset variable is OFF — that is the recorded decision, and
`platform-config.ts:166` does not implement it.** An earlier version of this record called
it "the owner's call"; **that was wrong**, and this is the correction.

**Not changed here, for a reason about VERIFICATION, not permission:** the audit cannot
observe the production environment's two variable names. Live shows the board ON, and the
"PUBLIC_PICKS ON" hint comes from `board-surfaces.ts:58` —
`truthy(env["PUBLIC_PICKS"]) || truthy(env["PUBLIC_PICKS_ENABLED"])` — so **one of the two
names is truthy, and which one is not observable from outside the deployment.** If it is the
*short* name, the default is the bug. If it is the *long* name, the founder's flip was undone
by an environment change and the default is not implicated. **Those need different
responses, and only one is a code change** — so the next agent should run the one command
that settles it (`printenv PUBLIC_PICKS_ENABLED PUBLIC_PICKS` in the production env); the
decision table is in `GAP21_PUBLIC_PICKS_ENABLED_READERS.md` §6b.

**A second defect, one level up:** `board-surfaces.ts` reads `PUBLIC_PICKS ||
PUBLIC_PICKS_ENABLED` while every other reader reads `PUBLIC_PICKS_ENABLED` only. **A gate
that can be opened by a different variable than the one that governs it is not one gate.**
Reconciling them to a single name is correct in both cases and is safe in both.

**Also not changed** — consulting the gate at mint time changes *what gets published*, and
the founder's recorded decision governs the *gate*, not the *mint path*.

**What was added:** `test/public-picks-enabled-readers.t21.spec.ts` (4 tests) that pin the
table, require exactly one ON reader, and **fail if a ninth reader is added**. The mutation
check caught a weakness in the test itself — the first scan missed a ninth reader written in
the direct-read form. That is the **fourth** time in this audit a test passed while the code
it should catch was wrong.

**The decision, in one line:** *should an environment where the variable is UNSET serve the
public picks board?* If no (the doctrine, the test, `.env.example` and 7 of 8 readers all
say no) it is **one line** in `platform-config.ts:166` and the red test goes green.

---

## 15. GAP-27 — the guardrail's X pattern missed the ACTUAL transport

`handoff/GAP27_DRAFT_ONLY_X_TRANSPORT.md`

`workers/twitter-bot/x-client.js:19` hard-codes `https://api.x.com`. The guardrail's
pattern was `api\.twitter\.com` — and **`api.twitter.com` appears nowhere in the tracked
tree**, because X renamed the host. The old pattern **did not match** `api.x.com` (measured
false), so a file hard-coding the live host passed clean. **The guardrail was green for the
wrong reason.**

**The gap's recommended action was incomplete.** It said *"add `api\.x\.com`; this is a
one-line fix."* Applied literally, that **turns CI red** — 9 hits, 8 in the transport's own
`*.test.js`. The regex was a symptom; the missing half is a **named boundary**.

**What was done:** the pattern now matches the live host **and** still the legacy one; the
transport became a **named, documented** allow-list entry (zero engine importers, triple-
gated at send time, draft-only outbox); and the test-file rule — which covered `.ts` but
**not `.js`** — was completed.

**A new 5-test suite** asserts the pattern matches the real transport, that the fix did not
narrow it, that the exception covers **exactly** three files, and — the one that matters —
that the exception is **revoked automatically** if the transport ever becomes reachable from
the engine. Both mutations (revert the regex; widen the whitelist) are caught, and the
source was verified byte-identical after restore.

---

## 16. WHAT CHANGED SINCE THIS HANDOFF WAS FIRST WRITTEN

| | |
|---|---|
| HEAD | `1b34940f8` → **`73effa158`** (88 commits ahead of `origin/main`) |
| suite | 8,571 → **8,575** passed, 0 failed |
| CI matrix | 20 → **21** guardrail suites |
| new docs | `GAP21_PUBLIC_PICKS_ENABLED_READERS.md`, `GAP27_DRAFT_ONLY_X_TRANSPORT.md` |
| new tests | `test/public-picks-enabled-readers.t21.spec.ts` (4), `scripts/guardrails/draft-only.test.mjs` (5) |
| git safety | **437** local-only commits were on no remote → now **0**; all 15 carrier branches pushed to `origin/backup/local/*` |

**Two corrections the next agent should know about:**

1. **The `apps/mobile` suites are not red — they are unbuilt.** They import a compiled
   build from `/tmp/gsebuild` and the app's own `verify.sh` SKIPS them when it is absent.
   After building: **150 tests, 145 pass, 5 real pre-existing failures** (4 in
   `client.test.js` — cache/ETag handling, three of them an uninitialised cache handle;
   1 a repo-wide source-scan guard).
2. **The T15 NGS leak is not currently live in production** (zero markers in the live
   body). It is reachable in code and is recorded as a *conditional* exposure.

**The wiring task was in flight at handoff time** (`deleg_15b51503`, transcript at
`C:\Users\Garrett\AppData\Local\hermes\cache\delegation\live\deleg_15b51503\task-0.log`),
steered to land the G7 producer with a test that fails without the wiring. **Check
`git log --oneline origin/audit/reconciliation-2026-10-20` before starting that work** — it
may have landed after this document was written. The lead, if it did not:
`selective-publish-runtime.ts:320` computes the same `marketFamilyKey` the G7 breaker emits.
