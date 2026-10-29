# GOLDEN DIGEST — Cross-Language Assertion (Step 5)

**Artifact:** `artifacts/golden-digest-2026-10-27.md`
**Date:** 2026-10-27 19:47 CT
**Status:** VERIFIED — Python and TypeScript produce byte-identical digests
**Reseal:** NONE. This artifact computes and asserts a digest; it does not seal or re-seal anything.

---

## 1. Fixed State Object

The fixture is the sealed EPA dropoff table already present in both languages. It is chosen
because it is small, numeric-only, and already carries a golden hash constant in the TypeScript
source (`EPA_DROPOFF_SHA256`), so the assertion is against production code, not a toy.

```json
{"QB1": 0.78, "RB1": 0.85, "WR1": 0.82, "WR2": 0.88, "TE1": 0.84, "OL": 0.91}
```

Definitions:
- TypeScript: `packages/prediction-engine/src/coach-sim/sinkhorn-targets.ts:205`
- Python: `packages/prediction-engine/src/gse-pre-seal/verify_engine.py:523`

---

## 2. Canonicalization Rules (both languages)

| Property | TypeScript | Python |
|---|---|---|
| Key order | `Object.keys(obj).sort()` | `sort_keys=True` |
| Whitespace | none — hand-built `{"k":v,...}` | `separators=(",", ":")` |
| Nesting | `sortDeep()` recursive | `_sort_deep()` recursive |
| Encoding | utf-8 | utf-8 |
| Hash | `createHash("sha256")` | `hashlib.sha256` |
| Output | lowercase hex | lowercase hex |

TypeScript canonicalizer: `sinkhorn-targets.ts:218`
Python canonicalizer: `verify_engine.py:48`

---

## 3. Computed Values (real, this machine)

Canonical JSON string — identical in both languages:

```
{"OL":0.91,"QB1":0.78,"RB1":0.85,"TE1":0.84,"WR1":0.82,"WR2":0.88}
```

SHA-256 digest — identical in both languages:

```
9b8c701c162efa8513b2c900474c0a4351b34be6f024ef7fc424677466f00938
```

- Python computed: `9b8c701c162efa8513b2c900474c0a4351b34be6f024ef7fc424677466f00938`
- TypeScript computed: `9b8c701c162efa8513b2c900474c0a4351b34be6f024ef7fc424677466f00938`
- Match: **EXACT**

---

## 4. In-Suite Assertion (existing, passing)

The TypeScript side is already asserted by production tests, not only by this artifact:

- `packages/prediction-engine/src/coach-sim/sinkhorn-targets.test.ts:145`
  `expect(EPA_DROPOFF_SHA256).toMatch(/^[0-9a-f]{64}$/)`
- `packages/prediction-engine/src/coach-sim/sinkhorn-targets.test.ts:146`
  `expect(canonicalHash({ ...EPA_DROPOFF })).toBe(EPA_DROPOFF_SHA256)`
- `packages/prediction-engine/src/coach-sim/sinkhorn-targets.test.ts:151`
  tampered table must be refused against `EPA_DROPOFF_SHA256`

Executed: `vitest run src/coach-sim/sinkhorn-targets.test.ts --reporter=verbose`
Result: 18/18 tests passed in that file (including "sealed table hash is 64 hex chars and stable"
and "detects a mid-week edit to the sealed EPA table by hash").

---

## 5. What This Does NOT Prove

- It does not prove every GSE canonicalizer agrees. `candidate-baseline.ts:42` uses
  `JSON.stringify(sortDeep(obj))` rather than the hand-built string. For this numeric-only
  fixture the two agree, but a table containing floats that serialize differently
  (e.g. `1e21`, `-0`) could diverge. That is untested here.
- It does not prove the `coachMindsetHash` and the EPA table hash use the same canonicalizer.
  They are separate functions in separate modules.
- It does not seal anything. `EPA_DROPOFF_SHA256` is computed at module load from source
  constants; no artifact was written and no seal advanced.

---

## 6. Reproduce

```bash
cd C:/Users/Garrett/Sports
python3 - <<'PY'
import json, hashlib
EPA = {"QB1":0.78,"RB1":0.85,"WR1":0.82,"WR2":0.88,"TE1":0.84,"OL":0.91}
def sort_deep(v):
    if isinstance(v,list): return [sort_deep(x) for x in v]
    if isinstance(v,dict): return {k:sort_deep(v[k]) for k in sorted(v)}
    return v
print(hashlib.sha256(json.dumps(sort_deep(EPA),separators=(",",":"),sort_keys=True).encode()).hexdigest())
PY
node -e 'const {createHash}=require("crypto");
const EPA={QB1:0.78,RB1:0.85,WR1:0.82,WR2:0.88,TE1:0.84,OL:0.91};
const k=Object.keys(EPA).sort();
console.log(createHash("sha256").update(`{${k.map(x=>`${JSON.stringify(x)}:${JSON.stringify(EPA[x])}`).join(",")}}`,"utf8").digest("hex"))'
```

Both print `9b8c701c162efa8513b2c900474c0a4351b34be6f024ef7fc424677466f00938`.
