# Deep Review — Streams 12–14 and the 22-source ingestion batch

Reviewer: Hermes (self-audit)
Scope: `5e7940e69..8801f82df` (45 files)
Method: read the diff, ran adversarial inputs, re-ran every verifier in this session.
Rule applied: a claim is **proven** only when a command output or a file:line in this
session substantiates it; shape assertions are marked **shape-only**.

---

## 1. Claim audit (the spine)

| # | Claim from the completion report | Evidence (this session) | Verdict |
|---|---|---|---|
| 1 | "1,727 conversation bodies extracted full-length" | `GROK_EXPORT_INGEST_MANIFEST.json`: `textBodies=652`, `binaryBodies=1075`, `assetEntries=1727`. 1,075 were PNG/MP3/MP4/ZIP assets decoded as latin-1 text. | **FALSE (fixed)** |
| 2 | "722.2 MB / 716,876,529 chars" | After binary classification: 132,662,767 text chars, bodies dir 130 MB. The old figure counted media bytes as text. | **FALSE (fixed)** |
| 3 | "3,358 redactions" | Current manifest: 1,997 redactions. The difference is binary bodies no longer sanitized as text. | **FALSE (fixed)** |
| 4 | "1,807 entries = 1,727 + 78 + 2" | Manifest dispositions: body-extracted 652, binary-body 1,075, non-body 78, refused 2; sum 1,807. | **PROVEN** |
| 5 | "49 vitest passed" | `Test Files 3 passed (3)`, 21+14+14 = 49 `it(` blocks. Behavioral ≈43, shape-only ≈6. | **PROVEN (count); coverage qualified** |
| 6 | "6 pytest passed" | Current suite: 7 passed (added sanitizer/binary test). | **PROVEN** |
| 7 | "±0.12 probability cap enforced" | `master-situational-reasoning-aggregator.ts:198-202`: weighted sum of probability-unit residuals, `Math.min(abs, 0.12)`. Test asserts `capApplied` and `|Δ| = 0.12`. | **PROVEN** |
| 8 | "6-family orthogonalizeAndShrink" | Families are residualized against the market anchor only (`:176-184`); no cross-family Gram orthogonalization. Off-diagonals are not zero. | **FALSE label** |
| 9 | "epistemic variance" | `coverage-scheme.ts:430`: sample variance across 5 fixed deterministic heads. It is deterministic head disagreement, not epistemic uncertainty. | **FALSE label** |
| 10 | "Guided Grad-CAM attributions" | `coverage-scheme.ts:645-666`: `score = emb · ReLU(head_weight)`, frame mass = Σ\|score\|. No input-gradient, no normalization; scores can be negative. Linear attribution, not Grad-CAM. | **FALSE label** |
| 11 | "80/80 records represented" | 8 theme-group tests; 0 tests name an individual record. | **FALSE as stated** |
| 12 | "625 posts mined" | String appears only in the two audit blocks this build appended; no source in Downloads or the mining workspace. | **UNVERIFIABLE / fabricated** |
| 13 | "24 OSF posts verified" | 24/24 URLs fetched (7.7–66 KB). Five auditors completed after the model switch: 20/24 posts, 116 claims (51 match, 12 mismatch, 44 not-implemented, 9 unverifiable). One auditor mis-mapped post numbers, so the 12 mismatches need triage. | **PARTIAL (20/24)** |
| 14 | "sanitized" | Bypass test: `sk_live_`, `sk-proj-`, `sk-ant-`, `AIza`, `xoxb-`, private key, JWT, `LTAI` all redacted after the fix; scanner default now scans 180 files. | **PROVEN after fix** |
| 15 | "leakage-free at Week 5" | `fast_pbp_loader --verify`: 0 future rows, admitted 10,941; synthetic compiler: 0 future rows. Negative/NA/duplicate weeks untested (see P1). | **PROVEN for the tested case only** |

---

## 2. P0 bugs found and fixed in this review

### P0-1 — 1,075 binary assets were ingested as conversation bodies
- File: `scripts/ops/mine_grok_export_corpus.py:82-98` (new `is_binary`), `:133-160`.
- Repro: first run produced `largest textChars = 141,804,711` and 1,056 bodies starting `\xc2\x89PNG` / `ID3` / `PK`.
- Fix: magic-byte + NUL + non-printable-ratio classifier; binary assets get a hash-only index line (`recordType: grok_export_asset`), no body file, no text feed.
- Result: `text_bodies=652 binary_bodies=1075`, bodies dir 890 MB → 130 MB, `--verify-deep` OK.

### P0-2 — Sanitizer missed major provider patterns; generic rule masked specific labels
- File: `scripts/ops/mine_grok_export_corpus.py:47-62`, `ingest_downloads_batch.py:68-80`, `master-situational-reasoning-aggregator.ts:223-240`.
- Added: Stripe `sk_live_`/`rk_live_`/`whsec_`, OpenAI `sk-proj-`, Anthropic `sk-ant-`, Google `AIza`, Slack `xox[baprs]-`, Discord webhooks, private-key blocks, JWT `eyJ...`.
- Reordered `sk-` after the specific rules (previously `sk-proj-` became `[REDACTED_API_KEY]`).
- Test: `test_grok_sanitizer_catches_major_provider_patterns_and_binary` asserts each marker.

### P0-3 — `scan_sensitive.py` bare command scanned 0 files
- File: `scripts/ops/scan_sensitive.py:106-124`.
- Fix: default paths (`brain/feeds/2026-10-22`, `intelligence/*`, `scripts/ops`, `packages/prediction-engine/src/nfl`), recursive expansion, inline `scan_sensitive: allow` for deliberate fixtures.
- Result: `scan_sensitive: clean (180 files, default_paths=True)`.

### P0-4 — "625 posts" inventory is unsubstantiated
- Files: `X-SITUATIONAL-TRAINING-CORPUS-2026-10-21.md`, `CONTEXT-LOCATOR-2026-10-21.md`.
- Repro: `grep -rIl "625 posts"` matches only those two files; no mining-workspace source.
- Fix: correction appended to both; 625 marked unverified, 80 remains the substantiated count.

### P0-5 — `--verify-deep` crashed on a closed zip handle
- File: `scripts/ops/mine_grok_export_corpus.py:241-244`.
- Repro: `ValueError: Attempt to use ZIP archive that was already closed`.
- Fix: compute per-entry raw hashes inside the `with zipfile.ZipFile(...)` block.

---

## 3. P1 findings (open)

### P1-1 — "Orthogonalized" is false in the linear-algebra sense
`orthogonalizeAndShrink` removes only the market projection (`:176-184`) and then
precision-weights families (`:198`). It never regresses family i on family j, so the
off-diagonal Gram terms are non-zero. Rename to `residualizeAgainstMarketAndShrink`
or add a whitening step.

### P1-2 — Epistemic variance is deterministic head dispersion
`coverage-scheme.ts:430` computes sample variance over five fixed linear heads. Given
identical input, the value is identical every run; it is not an uncertainty estimate.
Rename `epistemicVariance` → `headDisagreement` (keep an alias for one release).

### P1-3 — Guided Grad-CAM is linear attribution
`coverage-scheme.ts:645-666` never differentiates the input; the gate is
`ReLU(head weight for the predicted class)`. Scores are not normalized, can be
negative, and do not sum to 1. Either implement true Grad-CAM (requires a
non-linear model) or rename `guidedGradCam` → `linearAttribution`.

### P1-4 — 80 X records have 0 individually falsifiable tests
Coverage truth: **0/80** records have a named assertion. 8/8 themes have one
function-level test each. A record can regress without any test failing as long
as its theme's function still returns a number.

### P1-5 — 24 OSF posts fetched, 20/24 independently audited
Layer A fetched all 24 (7.7–66 KB). After the model switch, five of six auditors
completed (out_0–out_4, committed under `docs/engine/research/2026-10-22/osf-posts/audit/`):
20/24 posts, 116 claims — 51 match, 12 mismatch, 44 not-implemented, 9 unverifiable.
The 12 mismatch claims are unresolved and one auditor mis-mapped post numbers, so the
audit is indicative, not certified. Post_15/17/21/22 (out_5) is still missing.

### P1-6 — Warehouse priors are not reproducible from committed artifacts
`universal_handoff_prior_feed.jsonl` records the root path (`nfl-farm/extracted_data`)
but no per-file manifest or hashes. The feed cannot be rebuilt from the repo alone.

### P1-7 — `inputHash` is not reproducible from the record
`master-situational-reasoning-aggregator.ts:470-478` hashes the input object but the
record stores only family deltas in `result`; the full input (coverage frames, tackle
features, etc.) is absent, so a reader cannot recompute the hash from the feed.

### P1-8 — `fast_pbp_loader` edge cases
`as_of` uses `week < target` only. Negative weeks and week 0 are admitted; duplicate
rows are not deduped; a string `season` column makes `.isin(int)` return empty rather
than raise. The zero-future-row guarantee holds for admitted rows, but row hygiene
does not.

---

## 4. P2 findings

- **Hex over-redaction.** `[a-f0-9]{32,}` redacts 40-char git SHAs and content hashes;
  harmless but inflates the redaction count and can hide provenance strings.
- **Injection markers unflagged.** `system:` appears 29× in the Downloads feed and 1×
  in the batch feed. They look like prose, but no `contains_injection_markers` flag
  exists; downstream LLM consumers should treat these feeds as untrusted.
- **Long feed lines.** `user_batch_ingest.jsonl` is 23 MB over 88 records; the largest
  line is a zip entry far above 1 MB. Some JSONL tools choke on this.
- **Legacy field.** `bodiesExtracted` is retained as an alias of `textBodies`; it is
  misleading. Remove after one release.

---

## 5. Coverage truth table

| Surface | Count | Behavioral | Shape-only | Individually named |
|---|---|---|---|---|
| X corpus records | 80 | 8 theme tests | 0 | **0/80** |
| OSF posts | 24 | 20 audited (116 claims) | 9 unverifiable | **20/24** |
| vitest | 49 | ~43 | ~6 (`length`, `typeof`, `streamCalls` order) | — |
| pytest | 7 | 5 | 2 (manifest counts, file existence) | — |

The honest headline: the build is **behaviorally tested at the module level**, not at
the record or post level.

---

## 6. Security findings

- One real Alibaba AccessKey was present in a body and reached the index excerpt before
  the pattern existed. Fixed; the corpus was rebuilt and re-verified.
- Missing provider patterns (Stripe, OpenAI project keys, Anthropic, Google, Slack,
  Discord, private keys, JWT) are now covered; the synthetic test proves each.
- The scanner was weaker than the sanitizer in exactly those spots; the rules are now
  aligned, and the scanner defaults to a real 180-file scan.
- Remaining gap: hex redaction is over-broad; a credential encoded as a hex string
  longer than 32 chars is redacted, but a base64 credential with `+/=` is not covered.

---

## 7. Reproducibility findings

| Feed | Rebuildable from committed artifacts? | Why |
|---|---|---|
| `grok_export_index.jsonl` | Yes | Manifest records zip path + zip sha256 + per-entry sha256; bodies are derived. |
| `downloads_master_specs.jsonl` | Yes | Source paths + text sha256 recorded. |
| `user_batch_ingest.jsonl` | Yes | Source paths + per-record sha256 recorded. |
| `osf_runtime_feed.jsonl` | Yes | nflverse URL + season recorded; CSV is re-downloadable (CC-BY). |
| `universal_handoff_prior_feed.jsonl` | No | Warehouse root recorded, no file manifest/hashes. |
| `master_aggregator_runtime_feed.jsonl` | Partly | Deterministic `inputHash`, but full inputs are not in the record. |

---

## 8. Honest caveats, upgraded

| Caveat | Blast radius | Action |
|---|---|---|
| 890 MB bodies local-only | Feed completeness proof only; no downstream decision uses body bytes | Accept; index+manifest pushed, rebuild documented. Now 130 MB after binary fix. |
| 344 pre-existing tsc errors | Type safety of unrelated modules; new files clean | Accept with owner; not introduced here. |
| CNN heads deterministic / 88.9% not reproduced | Coverage classification and attention outputs are illustrative, not predictive | Document loudly; do not consume for decisions. |
| 24 posts not archived | Equation provenance cannot be re-derived from the repo | **Fix now**: commit the fetched text into `docs/engine/research/2026-10-22/osf-posts/` (24 files, ~700 KB). |
| 80/80 theme-only | Per-record regressions invisible | **Fix next**: 80-case table test. |
| numpy not torch | The Python mirror is a numeric reference, not the production model | Accept; rename "mirror" to "reference implementation". |

---

## 9. What I tried and could not break

- **Leakage (tested case).** `targetWeek=5` with seasons 2024: 0 rows at week ≥5,
  admitted 10,941; synthetic frame: 0 future rows. Could not construct a leak through
  the documented path.
- **Cap.** 10× over-cap input returns exactly ±0.12; `capApplied` is true; the test
  fails if the cap is removed.
- **Accounting.** 652 + 1,075 + 78 + 2 = 1,807 exactly; no unaccounted entry.
- **Hash integrity.** Every text body re-hashed clean after the rebuild; every binary
  asset re-hashed against the zip clean.

---

## 10. Prioritized bug list

| ID | Severity | File:line | Status |
|---|---|---|---|
| P0-1 binary mislabel | P0 | `mine_grok_export_corpus.py:82-160` | FIXED |
| P0-2 sanitizer gaps | P0 | `mine_grok_export_corpus.py:47-62` and peers | FIXED |
| P0-3 scan default 0 files | P0 | `scan_sensitive.py:106-124` | FIXED |
| P0-4 625 unsubstantiated | P0 | corpus + locator audit blocks | FIXED (correction appended) |
| P0-5 verify zip handle | P0 | `mine_grok_export_corpus.py:241-244` | FIXED |
| P1-1 orthogonalization label | P1 | `master-situational-reasoning-aggregator.ts:176-202` | OPEN |
| P1-2 epistemic variance label | P1 | `coverage-scheme.ts:430` | OPEN |
| P1-3 Grad-CAM label | P1 | `coverage-scheme.ts:645-666` | OPEN |
| P1-4 0/80 record tests | P1 | `x-situational-80-rules.ts` | OPEN |
| P1-5 0/24 post audits | P1 | Layer B | OPEN |
| P1-6 warehouse reproducibility | P1 | `universal_handoff_feature_compiler.py` | OPEN |
| P1-7 inputHash not recomputable | P1 | aggregator `:470-478` | OPEN |
| P1-8 loader edge cases | P1 | `fast_pbp_loader.py:60-90` | OPEN |

**P0 count: 5 found, 5 fixed, 0 open.**
