# Unwired Honesty Machinery — a fifth dark cluster

**Discovered while verifying the dark-source census. It is significant
enough to have its own document.**

**Audited ref:** `origin/main` @ `4fa5330f4` · **Measured:** 2026-10-20

---

## The finding

`intelligence/trust/` is a complete, carefully-documented honesty subsystem —
**and nothing outside its own test directory imports it.**

```
$ grep -rn 'from trust import\|import trust$' --include='*.py' . \
    | grep -v node_modules | grep -v 'trust-signals'
intelligence/trust/tests/test_trust.py:14:  import trust
intelligence/trust/tests/test_trust.py:15:  from trust import abstention as abs_mod
intelligence/trust/tests/test_trust.py:16:  from trust import enbpi as enbpi_mod
intelligence/trust/tests/test_trust.py:17:  from trust import evidence_guard as eg_mod
intelligence/trust/tests/test_trust.py:18:  from trust import leakwall as lw_mod
intelligence/trust/tests/test_trust.py:367:  from trust import calibration_chain_stages
```

**Six hits. All six are the test file.**

**Tier note (corrected 2026-10-20):** by a three-tier measurement these
modules are `PACKAGE_INTERNAL_ONLY` — imported by
`intelligence/trust/__init__.py:40`, but with **nothing outside
`intelligence/trust/` importing that**. The distinction matters because a
naive "has an importer" test would call them wired. See
`reconciliation/zero_importer_sweep.json` and `recon_integration.md` §1.1.

---

## What is in it

| Module | What it implements | Source of the spec |
|---|---|---|
| `intelligence/trust/evidence_guard.py` | **a 15-test publish guard.** `evaluate(artifact)` returns SHIP / HOLD / BLOCKED; `publish(artifact)` maps any non-SHIP to HOLD; `live_pick_value(artifact_id, number)` | `buildable-systems.md` SYS-22, from `predictions/research/2026-09-22/RESCUE.md` |
| `intelligence/trust/proofledger.py` | **the Wilson edge-claim floor.** "Wilson 95% LB >= 52.4% to claim edge on any source"; default 50% null; `MIN_SAMPLE_N = 30` | `ENGINEERING_PRINCIPLES:24`, `syntheses.md` S2 |
| `intelligence/trust/leakwall.py` | fail-closed leak rules, composed with a feature store having `(event_ts, creation_ts)` semantics | `syntheses.md` S3, `CARDS_EDGE_VALIDATE` r42 |
| `intelligence/trust/enbpi.py` | EnbPI early-season conformal intervals | SYS-03 / SYS-36 |
| `intelligence/trust/abstention.py` | NNTD selective-classification abstention gate | `arxiv-deep/1778-selective-classification-via-neural-network-training.md:28-31,40` |
| `intelligence/trust/calibration.py` | the production calibration chain | SYS-21, `syntheses.md` S2 |

### The two that matter most under the current business model

**`evidence_guard.py`** is precisely the gate the mandate's Phase 5 asks
for — "an evidence-guard publish gate":

```python
# intelligence/trust/evidence_guard.py:22
HARD_BLOCK_BRIER_DELTA = 0.03  # [INFERENCE] hard-block at/above this vs baseline

# :44
_check("sample_floor", False, lambda a: (a.get("n") or 0) >= 30),

# :72
def evaluate(artifact):
    """Run the 15-test guard. 15/15 -> SHIP; any hard-block failure -> BLOCKED;

# :88
    if ev.get("brier", 0.0) - ev.get("baseline_brier", 0.0) >= HARD_BLOCK_BRIER_DELTA:

# :108
def publish(artifact):
    ... HELD from publishing; BLOCKED artifacts additionally enter the quarantine
```

**This is the guard the repo's own research says every published artifact
should pass — and it is not in the publish path.** The published pick goes
out through `process-sport.ts` into `picks`, and `evidence_guard.evaluate`
is never called on it.

**`proofledger.py`** is the numeric floor the engine's own edge claims
should clear:

```python
# intelligence/trust/proofledger.py:11
MIN_SAMPLE_N = 30

# :14
def proof_ledger_floor():
    """Wilson 95% lower bound must clear 52.4% before any edge claim is admitted."""
```

**Every published edge should clear a Wilson 95% lower bound of 52.4% on
at least 30 settled samples before the claim is admitted.** That check
exists, is correct, and runs on nothing.

---

## Why this is a bigger deal than it looks

The prior phase's reconciliation found (GAP-01) that the Oct-18 published
picks carried `pick_grade = "STRONG_PLAY"` for every pick, hardcoded, with
`trueProb` clamped to `[0.6020, 0.6160]`.

**`evidence_guard.publish()` is the mechanism that would have prevented
that.** A 15-test guard that hard-blocks when a claimed Brier improvement
is >= 0.03 against baseline, requires n >= 30, and maps any non-SHIP
verdict to HOLD — wired at the mint site — would have caught a hardcoded
`STRONG_PLAY` immediately.

So the repo contains, unwired:

1. the guard that would have caught the worst published defect found in
   the audit, and
2. the numeric floor that would have prevented a graded edge claim without
   30 settled samples.

Both were written from the repo's own research (`RESCUE.md`,
`ENGINEERING_PRINCIPLES:24`). Both are tested. Neither runs.

---

## The fix — and the honest complication

**Fix:** call `evidence_guard.evaluate(artifact)` at the publish site and
map its verdict onto `isPublished` and `pick_grade`.

**The complication:** the guard is Python and the publish path is
TypeScript. Three options, in order of cost:

1. **A subprocess call at mint.** `evidence_guard.evaluate` is a pure
   function over an artifact dict. The call would be ~200 ms of Python
   startup per pick — too slow inside a loop over 80,000 rows.
   **Verdict: only viable for a per-pick guard on the final slate, not
   inline in the mint loop.**
2. **Port the 15 checks to TypeScript.** The checks are simple predicates
   over an artifact dict. A faithful port is mechanical, and it would need
   a test asserting the TS port and the Python original agree on a fixture
   set. **Verdict: the right answer, with a parity test.**
3. **A side-car service.** The engine already has a Python service
   boundary (`intelligence/integration/api.py`, `reason_game`). Add the
   guard as an endpoint and call it per slate. **Verdict: viable, more
   machinery.**

**Recommendation: option 2 with a parity test.** The guard's value is that
it is *the* guard; a second implementation that can drift is worse than
none. So the parity test is not optional — it is the deliverable.

**And the wiring is the same wiring `intelligence/trust/` has needed all
along.** Which is the point: this is not one orphaned module, it is a
subsystem that was built, tested, documented with provenance, and never
connected to the thing it was built to protect.

---

## The broader pattern, stated once

Across this whole mandate, the same shape has appeared four times:

| Subsystem | Built | Tested | Provenance documented | Wired |
|---|---|---|---|---|
| `intelligence/trust/` (publish guard, Wilson floor, leak wall) | yes | yes | yes | **NO** — zero importers outside its own test |
| `intelligence/reasoning/` (L1–L5, adversary, breaking conditions) | yes | yes | yes | **NO** — zero callers outside `intelligence/` |
| `packages/prediction-engine/src/causal/` (21 modules) + 3 arXiv do-calculus modules | yes | yes | yes | **NO** — 8 carry `ENABLED = false` |
| `packages/prediction-engine/src/reasoning/` (corpus evaluator, mind reasoning, arxiv bridge) | yes | yes | yes | **partial** — on the publish path, but hardcoded-path, 0 items on Vercel, and the output reaches no number |

**The repo's engineering quality is high and its wiring discipline is the
weak link.** Every one of these subsystems was written to a research spec,
with the spec cited in the file header, and a test file. What is missing is
the last mile.

**That is the honest finding of the continuous-causal mandate.** The engine
does not lack causal reasoning. It lacks the connections.

---

## Coverage note

This cluster was found by verifying the recon agent's dark-census leads
rather than by the census itself. The census (`dark_sources_census.json`)
covers `signal-registry-extensions.ts`; **this document covers a family the
census did not reach.** There may be more. A repo-wide "module has zero
non-test importers" sweep is the obvious next measurement, and it is cheap
— the same import-graph walk this audit has run three times already would
do it.
