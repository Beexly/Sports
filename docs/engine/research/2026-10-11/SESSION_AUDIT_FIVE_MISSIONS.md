# Session audit — all five missions, verified against disk

Date: 2026-10-12 · Bucket: `docs/engine/research/2026-10-11/` (the machine)
Method: every claim below was re-derived by re-running the producing command or
reading the artifact. Nothing is carried over from a prior summary.

---

## 1. Deliverable ledger (fresh verification)

| # | Mission | Artifact | Verified how | State |
|---|---|---|---|---|
| 1 | SGP Copula Engine | `intelligence/sgp/sgp_copula_engine.py` | file present, 33,588 B | ✅ |
| 1 | | `intelligence/sgp/test_sgp_copula_engine.py` | `26 passed`, exit 0 | ✅ |
| 1 | | `docs/predictions/.../SGP_COPULA_THEORY_AND_HIGHAM_REPAIR.md` | **was MISSING** | 🔧 fixed in audit |
| 1 | | bus `gse/sgp-engine` | **was MISSING** | 🔧 fixed in audit |
| 2 | Free Auto-Settlement | `scripts/ops/free-auto-settle.mjs` | runs, exit 0 | ✅ |
| 2 | | `scripts/ops/free-auto-settle.test.mjs` | node --test: **28 pass, 0 fail** | ✅ |
| 2 | | `docs/engine/.../FREE_SETTLEMENT_DAEMON_SPEC.md` | present, 7,187 B | ✅ |
| 2 | | bus `gse/free-settle` | 1 message found | ✅ |
| 3 | BKM Sweep | `intelligence/physics/bkm_convergence_sweep.py` | runs, exit 0 | ✅ |
| 3 | | `data/snapshots/bkm_convergence_results.json` | 363,331 B | ✅ |
| 3 | | `docs/engine/.../NAVIER_STOKES_256_BKM_CONVERGENCE_SWEEP.md` | present | ✅ |
| 3 | | trainer feed entry | feed 93 rows, doc row present | ✅ |
| 3 | | bus `gse/navier-stokes` | 1 message found | ✅ |
| 4 | Prop Discrepancy | `intelligence/props/prop_discrepancy_engine.py` | runs, exit 0 | ✅ |
| 4 | | `intelligence/props/test_prop_discrepancy.py` | **41 passed**, exit 0 | ✅ |
| 4 | | `outbox/props_ev_board_latest.{json,md}` | written | ✅ |
| 4 | | `docs/props/.../PROP_ARBITRAGE_SHIN_DEVIG_SPEC.md` | present, 9,867 B | ✅ |
| 4 | | bus `gse/props` | 1 message found | ✅ |
| 5 | Voice Watchdog | `intelligence/voice_brain/watchdog_daemon.py` | `--test-voice` exit 0 | ✅ |
| 5 | | `intelligence/voice_brain/voice_interface.py` | expanded, speak() preserved | ✅ |
| 5 | | `docs/engine/.../VOICE_WATCHDOG_DAEMON.md` | present, 8,255 B | ✅ |
| 5 | | bus `gse/voice-daemon` | 1 message found | ✅ |

### Test totals, re-run fresh this session

| Suite | Result | Exit |
|---|---|---|
| `intelligence/sgp/test_sgp_copula_engine.py` | 26 passed | 0 |
| `intelligence/props/test_prop_discrepancy.py` | 41 passed | 0 |
| `intelligence/physics/test_cylindrical_solver.py` | 11 passed | 0 |
| `intelligence/physics/test_aerodynamics.py` | 4 passed | 0 |
| `scripts/ops/free-auto-settle.test.mjs` | 28 pass / 0 fail | 0 |
| **Total** | **110 passing** | all 0 |

Everything committed and pushed; remote head confirmed equal to local by
`git ls-remote` at each step. Five commits: `a5c8c4a7e`, `089d5ec28`, `0d8cb6e3f` +
`61166ce31`, `40693cc09`, `746919745`, `7bb1fbe38`.

### Audit tooling note

A `-q` pytest run whose stdout is redirected in this environment emits the progress
dots but **no final summary line** — the 81-byte log looks like a truncated or
failed run while the exit code is 0. The counts above were obtained with
`-o addopts=""`. Worth knowing before someone reads a quiet log as a failure.

---

## 2. What was missed, and what was done about it

### FIXED — Mission 1 shipped without two of its four deliverables

The code and 26 tests landed, but **the theory doc and the bus broadcast were never
produced**. Both are now filed, and the doc says up front that it was written late so
it cannot be mistaken for having shipped with the code. This is exactly the failure
the "nothing lost" doctrine exists to prevent, and it went unnoticed for a full
mission because the artifact that was missing was the *record*, not the code.

### CORRECTED — a Mission 3 conclusion was falsified by a delayed background probe

Two probes from the Mission 3 investigation completed after that mission was
reported, and one of them **contradicts a conclusion in the delivered report**.

The report claimed the cylindrical scheme "does NOT reproduce its Cartesian 32³
figure (0.9834)". A pole-row sweep across four pole treatments × two operators
attributes the divergence properly and shows that claim's reasoning was wrong:

* **No pole row rescues the vector operator** — all four choices leave a positive
  spectrum (574.2 → 12,509.8 → 4.44e6 for zero/extrapolate at Nr 32/64), so the
  instability is *not* the pole row. It is the discretized `-u_θ/r²` term itself.
* **A pole row IS decisive for the operator without that term** — identical
  interiors differing only in row 0 give spectra 138,741.8 vs 514.8, and the zero
  row produces a **monotone** decay.
* **That stable scheme converges on the audit's number**: 0.976084 at Nr=32 rising
  to **0.982902** at Nr=64, within **0.05%** of the audit's 0.9834.

So 0.9834 *is* reproducible — by the operator lacking the singular collocation
term, which is structurally what a Cartesian grid has (no singular axis node). The
faithful cylindrical vector form carries an extra discretized term that a Cartesian
grid never manufactures, which is why it fails to converge here.

The report is amended in place with the correction marked as such, three attribution
tests now pin it, and the finding is broadcast. **This is the second thing this
audit found by re-running rather than re-reading**, and it is the more consequential
of the two: a delivered conclusion was wrong in a way no amount of re-reading would
have caught.

### CORRECTED — the SGP doc attributed a two-stage guarantee to one stage

The SGP doc claimed the Higham repair "runs automatically inside the copula
constructor (`corr = nearest_psd_higham(corr)`), so **no caller has to know it
happened**". Reading the engine rather than the doc shows that is incomplete in a
way that matters.

Higham maps an indefinite matrix onto the PSD **cone**, and the *boundary of that
cone still fails Cholesky* — PSD is not PD. A correlation estimated from `n`
observations has rank ≤ `n−1`, so its smallest eigenvalues sit at zero and
`np.linalg.cholesky` raises. The actual guarantee is **two stages**:
`nearest_psd_higham` (only when `is_psd` is False) **and** `_make_positive_definite`,
which adds a ridge of exactly the eigenvalue shortfall below `_PD_FLOOR = 1e-10` and
then restores the unit diagonal so the shift cannot move a variance.

The engine was always correct here, and — notably — **the test suite already knew**:
`test_repair_makes_cholesky_succeed_on_an_empirical_matrix` carries the comment
"Higham alone is not enough here". Only the prose was wrong. Doc corrected, and the
test now also asserts `cop.regularized is True`, so the stage that actually makes the
matrix factorable cannot silently stop firing while the Cholesky still succeeds and
nobody notices.

Pattern worth naming: in both this case and the BKM one, the *code and tests* were
sound and the *narrative around them* was wrong. Documentation written from memory of
the design, rather than from reading the implementation, is where the errors in this
session concentrated.

### MEASURED — Mission 3's title says 256³; the sweep stops at 128

Attempting 256 did not complete inside 420 s, so the cost was computed instead of
abandoned: **Nr=256 needs 820 substeps per step — 65,600 RK4 steps at ν=0.005 versus
4,160 at Nr=128** — and its largest positive eigenvalue is **4.42e6** against 574 at
Nr=32, growing as Nr⁴. The run would be expensive *and* pointless: the same artifact
that makes 64 and 128 diverge is 18× larger again. Recorded with the numbers.

### STILL OPEN — the strand that matters most

**Nothing consumes any of the five engines.** A repo-wide search for imports across
`apps/`, `packages/`, `scripts/`, `workers/` returns zero hits outside each engine's
own directory, and nothing schedules either daemon. All five are coded, tested,
documented, broadcast and pushed — and wired to nothing.

That is not a criticism of the five builds; it is the actual remaining distance
between "five verified engines" and "an operating system". The five deliverables were
scoped as standalone engines, and as standalone engines they are complete.

---

## 3. Under-leveraged, ranked by value

1. **Same-game leg correlations have no estimation source.** The SGP engine is a
   price calculator whose dependency structure is an input nobody produces.
   nflverse play-by-play is free and already in the stack — this is the single
   highest-value build in the set, because SGP correlation mispricing is the largest
   structural hole identified.
2. **No prices anywhere in the props path.** Shin de-vig is implemented, tested and
   unexercised because neither harvested sheet carries a price. `THE_ODDS_API_KEY`
   plumbing and `odds-api-client.ts` already exist; the free tier would supply real
   two-way prices and turn the de-vig from tested code into a working tool.
3. **Nothing is scheduled.** The settlement daemon and the voice watchdog both run
   only when a human types the command. Neither is in cron, and the voice daemon's
   whole point is to be ambient.
4. **The props board cannot currently produce an actionable row.** All 21 rows are
   tier C because the input is DraftKings' own normal moments. Fixing the input —
   real yardage distributions, not someone else's fitted mean/sd — is what makes the
   board real.
5. **`bkm_convergence_sweep` needs the pole-regular radial discretization** before
   Nr ≥ 64 is worth running at all. Until then the sweep's value is the *diagnosis*
   (the O(Nr⁴) artifact), not a convergence result.
6. **The voice daemon's tests watcher has no source** until `--test-cmd` or
   `--record-test-result` is wired to a real test run.
7. **Mission 2's `--live` DB path has never executed** (Law 7 keeps agent sessions
   out of the database, correctly). Only its refusal path is verified.

## 4. Research worth doing next

* Estimate same-game leg correlation empirically and re-run the SGP tests against
  measured dependence rather than constructed matrices.
* Pull two-way prices on a small market and check Shin's z against a known sharp
  book's published de-vig — the first real exercise of that code.
* Ask whether the cylindrical divergence is the *discretization* or the *coordinate
  system*: solve the same vortex ring in Cartesian Chebyshev and compare against the
  audit's own 32³/64³ figures (0.9834 / 0.9698) to settle which of the three numbers
  is the odd one out.
* Re-read `dk_mu`/`dk_sigma` as what they are — a normal fit — and rebuild the props
  chain on raw yardage distributions.
