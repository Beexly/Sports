# Canonical Environment Note — Cycle 2026-W44 (2026-10-27)

**Artifact:** `artifacts/canonical-env-2026-10-27.md`
**Status:** OPERATIVE. This is the authoritative environment declaration for this cycle.
**Companion:** `artifacts/CANONICAL-ENVIRONMENT-2026-10-27.md` holds the long-form rationale and is retained as an appendix; it is not independently authoritative.
**Scope:** No reseal. No mutation of tau, the cost matrix, or the EPA dropoff table. Nothing in this note changes engine parameters.

---

## 1. Declared live seal

**Windows `C:/Users/Garrett/Sports` is the canonical environment for cycle 2026-W44.**

| Field | Value |
|---|---|
| `merkle` (live seal) | `23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b` |
| `week` | `2026-W44` |
| `tau` | `0.42` |
| `sealed_at` | `2026-10-25T04:00:00-05:00` |
| On-disk record | `candidates/sealed-center.json` (sha256 `249698c1d7948b977ac2de5778dc78c9d6654faa67e113bdea171268ffd154ae`) |
| HEAD | `c75d2707c` on `engine/public-baseline-2026-10-24` |

### Verification citations (re-checked this pass)

- `packages/prediction-engine/src/coach-brain/coach-brain-inference.test.ts:12` — `const mockMerkle = '23245bcbba04f1470c5b0f60b83358c6af44c2b20c70e244d8b7a1a0eb686e8b';`
- `packages/prediction-engine/src/gse-pre-seal/run_week7_injury_operator.py:116` — literal merkle comparison in the `seal_ok` check.

### Portability defect found while verifying (reported, not fixed)

`run_week7_injury_operator.py:116` compares against the Windows merkle as a **hard-coded rejecting gate**. On the sandbox seal it will evaluate `seal_ok = false` and refuse. This is the exact failure mode the "resolve at runtime; do not hard-code as a rejecting gate" rule prohibits. It is reported here as a finding; no code change was made in this pass because the operator script's refusal behaviour is a human decision.

---

## 2. Non-canonical digests

Neither of these may be cited as the active seal in any Windows artifact. Neither is a valid seal chain on this tree.

| Digest | What it actually is | Where it appears | Why it is not canonical |
|---|---|---|---|
| `faab28271513678c` | Sandbox seal reference (truncated form). The 64-char literal in the candidate files is `faab2827c4e9b8a1d2f3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5` — **sequential hex, not a SHA-256 of any payload**. | `artifacts/CANONICAL-ENVIRONMENT-2026-10-27.md:16,26`; `artifacts/telemetry-schema-2026-10-27.md:27`; both quarantined candidate JSONs | Belongs to `/root/beexly-sports` @ `db4b1899`. Not reachable from this session. The candidate literal is fabricated, so even as a sandbox reference it fails hash validation. |
| `85b5cd3303c540492b23019d913aabd9179945a72c490579124e6e57dcad68b8` | Plan author's verification fixture. | `scripts/feeds/delta_telemetry.py:20,48` (documented fallback constant `DOCUMENTED_FIXTURE_HASH`); `artifacts/*.md` prose | **Zero occurrences in `packages/prediction-engine/src`.** It is a fixture from another environment, demoted to a documented fallback only when no seal center is present. |

### Consequence recorded

`delta_telemetry.py::resolve_sealed_hash()` resolves in order: `$GSE_SEALED_HASH` → `<repo>/candidates/sealed-center.json` → `DOCUMENTED_FIXTURE_HASH`. On this tree step 2 succeeds, so the writer uses `23245bcb…` at runtime. The fallback exists only so the script is not brittle when the seal center is absent; it is not a rejecting gate and does not hard-code the fixture as the only valid digest.

---

## 3. Exact condition under which the sandbox seal would be re-verified

The sandbox seal (`faab28271513678c` / repo `/root/beexly-sports` @ `db4b1899`) is re-verified **only when all three conditions hold simultaneously**:

1. The sandbox's branch state is fetched and diffed against Windows HEAD `c75d2707c`, and the diff shows sandbox work that HEAD does not contain.
2. The sandbox produces a `sealed-center.json` whose `merkle` field is recomputed from that environment's own locked projection and reproduces its own `coachMindsetHash` — i.e. the digest is a real SHA-256 over a real payload, not the sequential-hex placeholder.
3. The founder approves promoting the sandbox to canonical for a cycle.

Until all three hold, the sandbox is recorded as **"other environment."** Records written under it must not be merged into Windows delta logs; the writer's `SEAL_HASH_MISMATCH` guard enforces this mechanically.

---

## 4. Unresolved seal-layer facts on this tree

| # | Fact | Status |
|---|---|---|
| U1 | The two candidate JSONs carry `params.tau = 0.001`; `sealed-center.json` carries `tau = 0.42`. | **Unresolved.** Two tau values coexist. Do not "fix" by mutating either mid-week. Quarantined candidates moved to `candidates/_quarantine/`. |
| U2 | `candidates/*.json` were never tracked by git (`git status` shows `?? candidates/`). | **Unresolved.** Not committed as sealed — deliberately. |
| U3 | `candidate-baseline.ts` reads/writes `candidates/2026-10-25-week7-candidate.json`, which has now moved to `_quarantine/`. | **Consequence:** `loadCandidate()` returns `null` until the next operator write recreates a candidate at the original path. This is the intended "fail loudly" behaviour, not a regression. |
| U4 | Real ratings pipeline to regenerate genuine seal artifacts. | **BLOCKED** — no pipeline available on Windows. Missing file: a ratings source feeding `writeCandidate()`. |

---

## 5. What this note does NOT do

- It does not reseal. The seal stays at `sealed_at = 2026-10-25T04:00:00-05:00`.
- It does not change tau, the 5×5 cost matrix, or the `SealedEpaDropoffTable`.
- It does not claim the simulator invariance leg ran — `gse_coach_mind_simulator` is absent on Windows and that leg is SKIP.
