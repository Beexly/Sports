# Opus 5.5 adversarial review — 2026-10-28

Model: `claude-opus-5-5` via the Neon AI gateway. Input: the cognitive router, its migration, the
seed script, and the canonicalize block, verbatim. Prompt asked for correctness bugs, hash-stability
holes, SQL parameterisation, index problems at 50k rows, and silent-wrong-result paths.

**Every finding below was verified against the filesystem or the live database before being
accepted.** The model cannot check anything, so its claims are treated as leads, not facts.
Verification results are recorded per item at the end.

---

# Review: cognitive router, migration, seed script, `canonicalizeForSeal`

Ordered by severity within each section. Fixes are kept short.

---

## 1. Correctness: SQL and retrieval

### B1. `stageB`: `SET LOCAL hnsw.ef_search` does nothing (stageB, line `await db.query(\`SET LOCAL ...\`)`)
- `SET LOCAL` outside a transaction block only raises `WARNING: SET LOCAL can only be used in transaction blocks` and has no effect.
  - With `pg.Client`, each `db.query` autocommits.
  - With a `Pool`, the two calls may not even run on the same connection.
- The doc comment says ef_search "is restored to its default afterwards." Nothing restores anything. Nothing was set in the first place.
- The `Queryable` interface cannot express "one connection, one transaction," so the router cannot be made correct as typed.
- **Fix:** take a checked-out client and run `BEGIN; SET LOCAL ...; SELECT ...; COMMIT` on it, or use `set_config('hnsw.ef_search', $n, true)` inside the same transaction.

### B2. `stageB`: `LIMIT 250` cannot be honoured by an HNSW scan
- In pgvector, an HNSW index scan returns at most `ef_search` tuples unless iterative scan is on. `hnsw.iterative_scan` defaults to `off` in 0.8.0.
- Even with B1 fixed, if the planner uses the index you get at most 64 or 128 rows, never 250.
- Since B1 means the default of 40 is in force, the real ceiling today is **40**.

### B3. `stageB`: the filtered HNSW scan silently returns almost nothing at 50k
- The query is `WHERE id = ANY(2500 ids) ... ORDER BY embedding <=> $1 LIMIT $3`.
- At 120 rows the planner seq-scans and the result looks perfect. At 50k it can pick the HNSW index, because ORDER BY plus LIMIT on a 50k table makes it attractive. It then:
  1. takes the top `ef_search` nearest neighbours from the whole table;
  2. post-filters to the Stage A set (5% of rows) and to the view's class-A predicate.
- Expected yield is about 0.05 × 40 ≈ 2 rows. There is no error, only a short and arbitrary result list.
- Whether you get 2 or 250 rows becomes a planner-statistics coin flip.
- **Fix:** for 2,500 candidates, do an exact re-rank and keep HNSW out of Stage B. Either:
  - put the candidates in a `MATERIALIZED` CTE and order over that; or
  - `ORDER BY (embedding <=> $1) + 0` to defeat index matching.
- Alternatively, enable `hnsw.iterative_scan = relaxed_order` with `hnsw.max_scan_tuples` raised, inside the transaction, and re-sort afterwards. That is strictly worse here.

### B4. HNSW index is not partial (migration, `idx_lit_premises_class_a_hnsw`)
- The name says "class_a" but there is no `WHERE` clause.
- Any unfiltered or pure-vector path through `v_class_a_literature_premises` has the class-A predicate applied after the ef_search cutoff. That is the same loss as B3.
- **Fix:** `CREATE INDEX ... WHERE record_class='CITABLE_VERIFIED' AND citable AND verification_tier='MSVH_S1_EXACT' AND status='ACTIVE'`, with the view predicate textually identical so the planner can match it.

### A1. `stageA`: `LIMIT $1` with no `ORDER BY` arbitrarily truncates the candidate set
- If a common family fires (wind, pressure) and more than 2,500 rows overlap, you get whichever 2,500 rows the heap scan reaches first, which is effectively physical order.
- Semantically best premises are discarded before Stage B ever sees them. This is silent.
- Rows matching many fired bits are not preferred over rows matching one.
- **Fix:** either rank in Stage A (popcount of the overlap, then order by it), or merge A and B into one statement: filter by mask, exact-rank by distance, `LIMIT 250`. That also saves a Neon round trip and a 2,500-element array bind.

### A2. Empty-mask path does not "match everything" (stageA, `if (empty)`)
- It returns an arbitrary 2,500 of 50k rows (5%). Stage B then ranks within that random sample.
- The comment's claim is false at scale.
- **Fix:** an empty mask should skip Stage A and run a pure vector search over the class-A set. That is the one place the partial HNSW index (B4) belongs.

### A3. Stage A does not filter `embedding IS NOT NULL`
- Null-embedding rows consume Stage A slots and are then dropped in Stage B, so results shrink silently.
- Add `AND embedding IS NOT NULL` in Stage A, or make `embedding` `NOT NULL`.

### A4. The GIN index is dead weight, and the migration comment contradicts the router
- The migration says the prefilter "is a plain array-overlap test." The router says `&&` is wrong and uses `(context_mask[i] & w) <> 0`.
- That predicate is per-element arithmetic. GIN `array_ops` cannot serve it, so `idx_lit_premises_context_gin` is never used and only costs write amplification.
- At 50k, Stage A is a seq scan over the full view on every call. That is tolerable in raw CPU, but each row carries a TOASTed 4 KB vector in the heap, plus visibility checks.
- **If you want an indexable Stage A:** store set bit *positions* (`int[]` of family ids 0–278) and use `context_positions && $1::int[]`. That is exactly what GIN `&&` is for. Keep the 9-word form only as a derived column if something else needs it.

### A5. No shape constraint on `context_mask`; the default `'{}'` silently never matches
- `context_mask[k]` on `'{}'` or on a short array is `NULL`, so every `(... & w) <> 0` term is `NULL` and the row is excluded.
- Rows inserted without a mask become invisible to every non-empty query. Arrays with a non-1 lower bound (`'[0:8]={...}'`) shift every word by one.
- **Fix:** add `CHECK (array_length(context_mask,1) = 9 AND array_lower(context_mask,1) = 1)` and `DEFAULT '{0,0,0,0,0,0,0,0,0}'`.

### A6. Overlap vs containment semantics
- The predicate is "row shares at least one fired bit."
- A premise tagged {wind, cold} matches when only wind fired. That is exactly the "premises that cannot apply" case the `buildContextMask` doc says to prevent.
- If premise masks mean *preconditions*, the test should be containment: `(row_word & ~query_word) = 0` for every word, with at least one bit set. Decide which semantics you want and write it down. The current code implements the weaker one.

### M1. `buildContextMask`: NaN displacement sets a bit
- `s.displacement === 0` is false for `NaN`, so a NaN displacement fires the family.
- Use `if (!(Math.abs(s.displacement) > 0) || !(s.n >= MIN_SAMPLE)) continue;`. That rejects NaN and ±0.
- `n = Infinity` also passes; consider `Number.isFinite`.

### M2. `stageA`: mask words are interpolated into the SQL text
- This is not injectable: `maskToArray` coerces with `| 0`.
- However, every distinct mask produces distinct SQL text, so there is no prepared-statement or plan reuse and plan-cache churn on Neon.
- Pass `$2::int[]` and write the predicate against `$2[i]`, or use `EXISTS (SELECT 1 FROM generate_subscripts(...) ...)`.
- The bit-31 literal `-2147483648` parses as `int8` (unary minus on an `int8` constant). It happens to work through sign extension. Parameterising as `int4[]` removes the subtlety.

### M3. Stage A then Stage B is two statements with no snapshot
- Rows can change class or status between the two queries. This is minor, and it disappears if you merge them (see A1).

---

## 2. `canonicalizeForSeal`: cross-runtime hash holes

Ordered by likelihood of biting.

### C1. Integer-like keys are reordered by the JS engine
- `out` is a plain object. JS enumerates own keys that are canonical array indices (`"0"`, `"2"`, `"10"`, …) in **ascending numeric order before all other keys**, regardless of insertion order.
- For keys `{"10","2","a"}`:
  - Python `sort_keys` produces `"10","2","a"`.
  - `JSON.stringify(out)` produces `"2","10","a"`.
- The digests differ. Any config keyed by family id, week, or season triggers this.
- **Fix:** do not round-trip through an object. Emit the string directly, iterating the sorted key list and concatenating `JSON.stringify(k) + ":" + ...`.

### C2. `ensure_ascii` mismatch
- Python `json.dumps` defaults to `ensure_ascii=True`, which escapes every non-ASCII character as `\uXXXX`, plus DEL (0x7F). `JSON.stringify` emits raw UTF-8.
- Any `é`, `—`, `°`, or emoji in a sealed string produces different bytes.
- **Fix:** either pin `ensure_ascii=False` on the Python side, or escape non-ASCII in TS to match exactly (lowercase hex, surrogate pairs, 0x7F).

### C3. Float formatting differs outside the integral case
- JS `Number#toString` and Python `float.__repr__` both produce shortest round-trip digits, but switch to exponent notation at different thresholds and format the exponent differently.

| Value | JS | Python |
|---|---|---|
| `0.00001` | `0.00001` | `1e-05` |
| `1e-7` | `1e-7` | `1e-07` |
| `2.5e-5` | `0.000025` | `2.5e-05` |

- Small probabilities, learning rates, and tolerances are exactly what lives in a model config.
- Narrowing integral floats does not help here.
- **Fix:** emit floats with a single shared formatter, or forbid non-integral floats in sealed payloads (store scaled ints or decimal strings).

### C4. Large integers
- JS prints `1e21` and above as `1e+21`. Python's narrowed `int` prints `1000000000000000000000`.
- Ints above 2^53 are exact in Python but already corrupted in JS before hashing.
- **Fix:** reject `|x| > Number.MAX_SAFE_INTEGER` in TS.

### C5. NaN and ±Infinity
- `JSON.stringify` emits `null`. Python emits `NaN` / `Infinity` because `allow_nan=True` by default.
- Hashes differ, and worse, TS silently seals a corrupted value.
- **Fix:** throw on non-finite numbers in TS, and set `allow_nan=False` in Python.

### C6. Key sort order uses UTF-16 code units
- `.sort()` with no comparator compares UTF-16 code units. Python compares code points.
- They disagree when keys mix astral characters (surrogates 0xD800–0xDFFF) with U+E000–U+FFFF.
- This is rare, but it is free to fix: `sort((a, b) => cmpCodePoints(a, b))`.

### C7. `__proto__` key is dropped
- `out["__proto__"] = obj` sets the prototype instead of creating a property. `JSON.parse` *does* create an own `__proto__` property, so a payload that came from JSON loses that key and hashes differently.
- **Fix:** use `Object.create(null)`, `Object.defineProperty`, or the C1 string-builder fix, which avoids the problem entirely.

### C8. Non-plain objects collapse silently
- `Date`, `Map`, and `Set` become `{}`.
- Typed arrays become `{"0":..,"1":..}`, which also hits C1. A `Uint32Array` mask in a config would be one example.
- `toJSON` (Decimal libraries, `Date`) is bypassed because you rebuild the object before `JSON.stringify` sees it.
- **Fix:** throw unless `Object.getPrototypeOf(v) === Object.prototype || null`.

### C9. Non-JSON values
- Functions or symbols as object values are returned as-is, then dropped by `JSON.stringify` (as `null` inside arrays).
- `undefined` inside arrays becomes `null`.
- Each of these silently changes the hash. Throw instead.

### C10. Excerpt integrity
- Code appears before `import` statements, there is a truncated header (`ashing the same`), and `createHash`'s import is not visible.
- Hoisting makes this legal, but it looks like a bad merge. Confirm `createHash` is actually imported from `node:crypto` and not shadowed.

---

## 3. Seed script

### S1. Rerun corruption (insert, then update)
- `id` comes from a loop counter and the insert is `ON CONFLICT DO NOTHING`, so a rerun keeps the old text and embedding.
- The following `UPDATE` then overwrites `context_mask` from the *new* sentence at that index.
- If any source doc changed, `P-SEED-007`'s premise text, embedding, and mask now describe different sentences. Nothing errors.
- **Fix:** derive the id from a hash of the sentence text, insert the real mask in a single statement, and use `ON CONFLICT DO UPDATE` or fail loudly.

### S2. Non-atomic write leaves dead rows
- The row is inserted with a 9-zero mask, then updated, with no transaction.
- A crash between the two statements leaves a row that never matches any non-empty mask (see A5).

### S3. Duplicated mask logic
- The seed script re-implements bit packing instead of calling `buildContextMask(maskFor(s))` and `maskToArray`. The two copies will drift.
- `Array.from(new Uint32Array(9)).map(() => 0)` is a placeholder that should not exist.

### S4. The "proof" run cannot detect B1–B3 or A1–A2
- At 120 rows every query seq-scans, Stage A never hits the 2,500 cap, and `stageBLimit: 5` is under every ef_search ceiling.
- **Fix:** add a check that runs `EXPLAIN` on the Stage B query and asserts no `Index Scan using idx_lit_premises_class_a_hnsw`. Also assert `hits.length === min(stageBLimit, candidates.length)`.

### S5. Unvalidated environment and embedding shape
- `GATEWAY!`, `TOKEN!`, and `DB!` are unchecked; a missing variable requests `undefined/v1/embeddings`.
- The embedding length is not asserted to be 1024. pgvector will error on a mismatch, which is acceptable, but fail earlier with a clear message.

### S6. Asymmetric embedding without a query instruction
- `qwen3-embedding-0.6b` is an instruction-tuned asymmetric embedder. Queries are expected to carry an `Instruct: …\nQuery: ` prefix; documents are not.
- Embedding the query bare lowers Stage B recall. This is not an error, just worse ranking.

---

## 4. Migration and minor items

- **View column list is frozen.** `CREATE OR REPLACE VIEW ... SELECT *` captures the columns at creation time. Columns added later will not appear, and the router will error on them.
- **Index parameters are not reapplied.** `CREATE INDEX IF NOT EXISTS` never applies changed `m` / `ef_construction`.
- **Index builds block writes.** Neither index uses `CONCURRENTLY`. On a populated Neon branch, building HNSW with `ef_construction = 200` on 50k × 1024 blocks writes for the duration.
- **Build after load.** Build HNSW after the bulk load, with `maintenance_work_mem` raised; incremental inserts give a slower, lower-quality graph.
- **Zero query vector.** Cosine distance is NaN, so `similarity` is NaN and those rows sort unpredictably. Reject zero or non-finite query vectors in `toVectorLiteral`.

---

## Verification of the top findings

| Finding | Verified? | Evidence |
|---|---|---|
| B1 `SET LOCAL` is a no-op outside a transaction | **CONFIRMED** | `show hnsw.ef_search` = 40 default; still 40 after `SET LOCAL`; 128 inside `BEGIN`. The ef_search call never took effect. |
| B2 HNSW yields at most ef_search tuples | **CONFIRMED** | Follows from B1 — `LIMIT 250` could never be met at ef 40. |
| C1 integer-like keys reorder in JS | **CONFIRMED** | `{"10":1,"2":1}` serialises as `{"10":1,"2":1}` from Python but JS object enumeration yields `2` before `10`. |
| C3 float exponent formatting differs | **CONFIRMED** | Python `1e-05`, JS `0.00001`. |
| C5 `JSON.stringify(NaN)` → `null` vs Python `NaN` | **CONFIRMED** | Direct check. |
| C7 `__proto__` key vanishes | **CONFIRMED** | `o['__proto__']={x:1}` stringifies to `{}`. |
| A5 empty mask array never matches | **CONFIRMED** | `('{}'::int[])[1] IS NULL` = true, so every bitwise term is NULL and the row is invisible. |

## Fixed in this commit

B1/B2 (transaction-scoped `set_config`, exact re-rank by default), C1 (string builder instead of an
object round-trip, which also throws on NaN/Infinity/functions/symbols/non-plain objects), A5
(CHECK on mask shape plus a nine-zero default), M1 (NaN displacement guard), A3 (`embedding IS NOT
NULL` in Stage A).

## Not fixed

A4 — GIN cannot serve the per-element bitwise predicate. The index is currently unused; the fix is a
set-position column or a `bit(288)` column with `&`. Recorded in the migration comment.
