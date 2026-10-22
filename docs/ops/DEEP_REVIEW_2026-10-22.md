# Forensic Audit — Streams 12–14 and the ingestion batch

Auditor: Hermes (self-audit)
Range: `5e7940e69..314efe3e7` plus this audit's fixes
Rule: every verdict below was produced by a command run in this session; the command
and its output line are quoted. Gates not met are listed at the end, not hidden.

---

## 1. Claim verdict table

| # | Claim | Falsification command | Verdict | Evidence |
|---|---|---|---|---|
| 1 | 1,807 zip entries accounted for | `python -c` sum manifest dispositions | PROVEN | 652+1075+78+2 = 1807 |
| 2 | 1,727 conversation bodies | manifest `textBodies`/`binaryBodies` | **FALSE** | 652 text, 1,075 binary |
| 3 | 78 non-body entries | manifest `nonBodyEntries` | PROVEN | 78 |
| 4 | 2 refused | manifest `refusedServiceEntries` | PROVEN | 2 (auth-mgmt, billing) |
| 5 | 3,358 redactions | sum index `redactions` | **FALSE (stale)** | 1,997 after binary fix |
| 6 | 0 hash mismatches | `mine_grok_export_corpus.py --verify-deep` | PROVEN | `sha256_mismatches=0` |
| 7 | families=6 | `ingest_open_source_football.py --verify` | PROVEN | `families=6` |
| 8 | total_weight=5.944489 | sum six precision weights | PROVEN | Python sum = 5.944489 |
| 9 | capped_movement=0.12 | recompute uncapped, apply min | PROVEN | 0.180384 → 0.12 |
| 10 | cap_bound=True | `0.180384 > 0.12` | PROVEN | true |
| 11 | Tests 49 passed | `npx vitest run` (3 files) | PROVEN | 3 files, 49 tests |
| 12 | 6 pytest passed | `pytest -q` | **FALSE (stale)** | 7 passed |
| 13 | scan clean (21 files) | `scan_sensitive.py` bare | **FALSE (stale)** | clean (180 files, default_paths=True) |
| 14 | 0 errors in new/touched files | `tsc --noEmit` filtered | PROVEN | 0 matching lines |
| 15 | 344 pre-existing errors | `tsc` at HEAD vs base | **UNFALSIFIED** | 344 at HEAD; base set not compared |
| 16 | 0 future rows at week 5 | `fast_pbp_loader.py --verify` | PROVEN | `future_rows=0` |
| 17 | admitted 10,941 | same command | PROVEN | `admitted_rows=10941` |
| 18 | known 16, families 6 | `universal_handoff_feature_compiler.py --verify` | PROVEN | `known_rows=16 families=6` |
| 19 | 1.92 GB / 75 files | `os.walk` over warehouse | **FALSE** | 1.92 GB / **96 files** |
| 20 | 10,941 as-of Week-5 rows | prior feed `meta.rowsKnown` | PROVEN | 10941 |
| 21 | 21,314,650 chars | sum batch `textChars` | PROVEN | 21,314,650 |
| 22 | 66 redactions | sum batch `redactions` | PROVEN | 66 |
| 23 | 88 records | count batch lines | PROVEN | 88 |
| 24 | 23 MB feed | `du -sh` | PROVEN | 23M |
| 25 | repo pre-push secret scan passed | push output | **UNVERIFIED here** | prior session output only |
| 26 | rawUnshrunkDelta=11.9 | sum `familyRawDeltas` | **FALSE before fix** | residual sum was 10.71; now 11.9 with raw fields |
| 27 | shrunkUncappedDelta=8.665 | recompute residual×shrink×weight | **FALSE before fix** | recompute 0.9706; 8.665 was unweighted; split into two fields |
| 28 | precision 2000 | code `1/(0.0004+0.0001)` | PROVEN (assumption) | `DEFAULT_FAMILY_VARIANCE=0.0004`, λ=1e-4 |
| 29 | 80/80 records represented | count record-named tests | **FALSE** | 0/80 named; 8 theme tests |
| 30 | 24/24 posts verified | audit files | **FALSE** | 20/24 valid audits; out_3 mis-mapped 4 posts; 18 mismatch claims open |
| 31 | 625 posts mined | `grep -rIl "625 posts"` | **UNVERIFIABLE** | only the audit block itself |
| 32 | "orthogonalized" | code review `:176-202` | **FALSE label** | market-only residualization |
| 33 | "epistemic variance" | code `coverage-scheme.ts:430` | **FALSE label** | deterministic head variance |
| 34 | "Guided Grad-CAM" | code `:645-666` | **FALSE label** | linear attribution |
| 35 | 0/80 leakage beyond tested case | adversarial frames | **PARTIAL** | negative/NA/string weeks unhandled |

---

## 2. Findings

### P0 — fixed in this audit (7)

1. **Binary assets ingested as text.** `mine_grok_export_corpus.py:82-160`. 1,075
   PNG/MP3/MP4/ZIP entries became 141 MB "text" records. Fix: `is_binary` + hash-only
   asset records. Verify: `text_bodies=652 binary_bodies=1075`, bodies 890→130 MB.
2. **Sanitizer missed 7 provider patterns.** `mine_grok_export_corpus.py:47-70` and
   peers. AWS secret, GitLab, npm, Twilio, SendGrid, HuggingFace, Stripe `pk_live`
   were not caught. Fix: 7 rules; matrix now 21/22 (pk_live is publishable, excluded
   by design). Test: `test_grok_sanitizer_catches_major_provider_patterns_and_binary`.
3. **`scan_sensitive.py` scanned 0 files.** `:106-124`. Fix: default paths + recursive
   expansion. Verify: `clean (180 files, default_paths=True)`.
4. **"625 posts" unsubstantiated.** Only occurrence is the audit block. Correction
   appended to both corpus and locator.
5. **`--verify-deep` closed-zip crash.** `:241-244`. Fix: hash inside `with`.
6. **`rawUnshrunkDelta` not recomputable.** Residual sum was 10.71 vs recorded 11.9.
   Fix: emit `familyRawDeltas`; recompute now 11.899999999999999.
7. **`shrunkUncappedDelta` was the wrong quantity.** Recorded 8.665 was residual×shrink
   before precision weights; the cap used 0.9706. Fix: `shrunkUncappedDelta=weightedSum`,
   new `shrunkUnweightedDelta=8.665`. Test asserts recomputation to 1e-9.

### P1 — open (15)

8. **Orthogonality false — FIXED in Stream 15.** Cholesky whitening (`L L^T = Sigma_reg`), GLS weights, `familyWhitenedResiduals`; test reconstructs L L^T to 1e-10.
9. **Epistemic variance false label — FIXED in Stream 15.** `headDisagreementVariance` primary, `uncertaintyEstimationMethod`, alias retained; bootstrap method supported.
10. **Grad-CAM label — FIXED in Stream 15.** Outer ReLU + guided-backprop double gate, normalized [0,1]; test asserts bounds.
11. **0/80 record-level assertions.** 8 theme tests only.
12. **OSF audit partly invalid.** 20/24 valid; out_3 audited Post numbers 5/6/7/23 but read files 05/06/07/23 (different posts), so its 4 posts are invalid. 18 mismatch claims unadjudicated.
13. **Warehouse not reproducible.** 96 files/1.92 GB, no per-file manifest.
14. **`inputHash` not recomputable — FIXED in Stream 15.** `canonicalInputs` + `canonicalInputsHash` embedded; sha256(canonicalizeJson) test.
15. **`fast_pbp_loader` edge cases — FIXED in Stream 15.** Non-integer/out-of-range weeks rejected; rows coerced/validated/deduped; `filterKnownAt` validates and dedupes too.
16. **18.7 MB single JSONL line.** `user_batch_ingest.jsonl` max record = 18,706,039 B.
17. **CRLF/hash semantics.** Worktree sha256 ≠ committed blob for user_batch
    (`395cc470…` vs `5d1d3ce0…`); `.gitattributes` sets LF but the file was not
    re-checked out. Manifest hashes the text field, not file bytes.
18. **Injection markers unflagged.** 29 `system:` in downloads feed, 1 in batch.
19. **No license/attribution** for third-party text (OSF, X, Grok).
20. **No feed schema/version field.**
21. **No retry/backoff** on nflverse/OSF downloads.
22. **No declared downstream consumer** for any feed.
    28. **HFA regime constants were not the post's.** Post #11 publishes 2.85 / -0.7 / 0.4;
    code used 2.6 / 0.4 / 2.1. Fixed to the published values; test asserts 2.85 and 0.4.
29. **xFG feature set differs.** Post #15 uses GW_FG_Att and Precip; code uses dome and
    altitude. The quadratic kink matches; the regressors do not.
30. **RERUN is OLS, post is LOESS.** `computeRerunPunterMetric` uses ordinary least
    squares; Post #17 uses local regression. No era adjustment.
31. **Rest semantics differ.** Post #18 measures within-game drive rest; code uses
    between-game rest days.
32. **xPass is single-stage logistic; post is xgboost→Stan two-stage** with team effects.
33. **WR1 method differs.** Post #2 ranks by air yards and raw mean EPA; code applies
    EB shrinkage to pre-computed inputs.

(8–33 = 26 findings; 8–15 core correctness, 28–33 doc-code drift.)

### P2 — open (5)

23. Hex over-redaction catches 40-char git SHAs.
24. `tsc` base error *set* never compared, only the count.
25. Aggregator feed accumulates 4 records; "one record" claim stale.
26. Precision 2000 is an assumption (`sd=0.02`), not measured.
27. Redaction count changed 3,358→1,997 with no report diff until now.

---

## 3. Coverage truth

| Surface | Honest numerator |
|---|---|
| X records with a passing named assertion | **0 / 80** |
| X themes exercised | 8 / 8 |
| OSF posts fetched | 24 / 24 |
| OSF posts with an independent audit | **20 / 24 valid** (out_3 mis-mapped; 18 mismatch claims open) |
| vitest | 49 passed; behavioral count **not mutation-certified** |
| pytest | 7 passed |
| Sanitizer providers caught | **21 / 22** (pk_live excluded) |
| Mutations tested | **0 / 20 — gate not met** |

The phrase "80/80 represented by theme groups" is retracted. The number is 0/80 named,
8/80 at theme granularity.

---

## 4. Reproducibility

| Feed | Rebuildable? | Caveat / command |
|---|---|---|
| `grok_export_index.jsonl` | With external input | needs the 759 MB zip at the recorded path; `python scripts/ops/mine_grok_export_corpus.py` |
| `downloads_master_specs.jsonl` | With external input | needs `C:\Users\Garrett\Downloads`; `python scripts/ops/ingest_downloads_master_specs.py` |
| `user_batch_ingest.jsonl` | With external input | 22 named paths under Downloads; `ingest_downloads_batch.py` |
| `osf_runtime_feed.jsonl` | Yes | nflverse release URL recorded; `ingest_open_source_football.py` |
| `universal_handoff_prior_feed.jsonl` | **No** | warehouse 96 files, no manifest/hashes |
| `master_aggregator_runtime_feed.jsonl` | Yes (post-fix) | all inputs now in the record except computedAt |
| `osf-posts/post_*.md` | Yes | committed text + manifest |

Committed blobs are LF; a Windows worktree can be CRLF until re-checkout. Hash consumers
must hash the JSON `text` field, not the file bytes.

---

## 5. Security

- Sanitizer: 21/22 provider patterns pass, 1 excluded (Stripe publishable).
- Known bypasses not covered: base64/URL-encoded keys, split-across-lines, homoglyphs.
- Scanner/sanitizer drift remains (scanner lacks AWS-secret and HF rules; sanitizer
  lacks scanner's provider-prefix lengths). Not yet asserted equal.
- Prompt-injection markers exist in ingested text (29+1 `system:`); no flag field.
- Downloaded nflverse CSV is not checksum-verified against a published digest.

---

## 6. Self-incrimination memo

**Q1 — What I did not test, and what I traded for it.**
1. Mutation testing (0/20). Traded for breadth of claim verification.
2. Property-based tests (hypothesis/fast-check). Not run.
3. Distribution tests (10,000-input histograms). Only one 100-seed claim exists; not run.
4. The 80-record table. Not built.
5. The 24-post equation table. Only agent free-text claims, not line-level.
6. Fresh-clone hash test. Only worktree-vs-blob, not a clone.
7. Two-process append test for `emitMindFeedRecord`.
8. Empty/NaN/Inf matrix for every public function.
9. tsc error-set diff at base.
10. Cross-language TS/Python intermediate diff (LCG parity asserted, never diffed).
11. Sanitizer encoding bypasses (base64/URL/homoglyph).
12. Downloader 429/partial-failure behavior.

**Q2 — Where I am most likely fooled by my own prior output.**
13. I quoted `VERIFY OK` strings from earlier turns before re-running them; I re-ran
    most, but the 25th claim (repo pre-push scan) is still prior-turn only.
14. I accepted "1,727 bodies" because the manifest said so; the manifest was produced
    by the same broken classifier.
15. I accepted "80/80 represented" until I counted `it(` blocks.
16. I accepted `shrunkUncappedDelta` as the capped value until I recomputed it.
17. I accepted the subagent `out_3.md` mapping until I noticed post_05 was team ability.

**Q3 — Findings that are only restatements of prior caveats (not discoveries).**
18. No trained weights / deterministic heads — already caveated.
19. numpy not torch — already caveated.
20. 890 MB local bodies — already caveated (and wrong size).
21. 344 tsc errors — already caveated, still unproven at base.

**Q4 — What a hostile reviewer reading only the diff/feeds would conclude.**
22. The "conversation corpus" is mostly media.
23. Three result fields are mislabeled (orthogonal, epistemic, Grad-CAM).
24. The X coverage is 8 theme tests, not 80 records.
25. The report's redaction count and file count are stale.
26. The 18.7 MB line will break naive JSONL consumers.

**Q5 — What would look bad if discovered later.**
27. A real Alibaba key reached the index excerpt before the pattern existed.
28. 1,075 binaries were called conversation bodies.
29. 625 was invented in a "gap audit".
30. The cap's recorded pre-image did not match the capped quantity.
31. The scanner's bare command was a no-op during the original verification.
32. Tests are shape-heavy and mutation-uncertified.

---

## 7. Residual risk register

| Risk | Owner | Trigger to revisit |
|---|---|---|
| Orthogonality/label drift | engine owner | before any consumer reads the feed |
| 0/80 record coverage | engine owner | next X-corpus change |
| 12 OSF mismatch claims | research owner | before citing any post constant |
| Warehouse irreproducibility | data owner | before retraining a prior |
| 18.7 MB line | feed owner | first downstream JSONL parser failure |
| Injection markers | security owner | before any LLM consumes feeds |
| Sanitizer encoding bypasses | security owner | next ingestion of third-party text |
| CRLF hash drift | release owner | first fresh-clone verification |

---

## 8. Gates not met (honest)

- Mutation testing: 0/20 mutations run (framework not installed; hand-mutation deferred).
- 80-record table: not built; 0/80 remains the numerator.
- 24-post equation table: not built at line level; 20/24 agent claims only.
- Property-based tests: not written.
- Fresh clone: not performed; worktree-vs-blob only.
- Concurrency test: not performed.
- Base tsc error-set comparison: not performed.

These are audit gaps, not passes.
