# Corpus & Equations Ingestion Receipt (`2026-11-02` / `2026-11-03` Sanitized Wave 7)

**Target Database:** Neon `summer-brook-99380762` (`gse-postgres`), branch `dev-lit-vectors-2026-10`, table `lit.premise`
**Manifest File:** `data/engine/INGESTION-MANIFEST-2026-11-02.json`
**Feed File:** `brain/feeds/2026-11-02/nov02_multidomain_corpus_and_equations_feed.jsonl`

---

## 1. Track B Sanitization & Deduplication Summary

1. **Non-Domain & Build-Artifact Files Excluded from `lit.premise` (`class: "non-domain-ignored"` / `"build-artifact-ignored"`):**
   - `Charcuterie-Chick-Final.pdf`, `Charcuterie-Chick-Final (1).pdf`
   - `OperaSetup.exe`
   - `CIA-RDP96-00792R000700710002-1.pdf` (also stripped from `evaluate_noyes_systematic_error_gate`, which is grounded strictly in H. Pierre Noyes `9906014v1.pdf`, Steven N. Shore `p26.pdf`, and BIPM GUM metrology)
   - `some_eth_false_exposition.pdf`, `some_eth_false_exposition (1).pdf`
   - `.zip` bundles (`takeout-20261027T043625Z-1-001.zip`, `archive.zip`, `gse-redline-social-packets.zip`, `EYI Package*.zip`, UUID `.zip` files)
   - Test stdout logs (`_vt_full_stdout.log`, `_vitest_full.log`, `_vitest_prediction_engine.log`)
2. **SHA-256 Content Deduplication (`aliases` Array on Canonical Manifest Entry):**
   - All byte-identical `(1)`, `(2)`, and `- Copy` duplicate files in `C:\Users\Garrett\Downloads\` are mapped to their canonical source file via `aliases` in `data/engine/INGESTION-MANIFEST-2026-11-02.json`, keeping `unmatched_source_file_count = 0` without inserting duplicate rows into `lit.premise`.
3. **Sensitive PII & Credential Exclusion (`class: "sensitive-excluded"`):**
   - `galaxysportsedge-f506d7991177.json`, `SSN Passport.pdf`, `Statement 10_26_26 (449K, PDF).pdf`, `gbaxleyID.jpeg`, and `gbpassport.jpeg` remain strictly untouched (`size_bytes: null`, `sha256: null`).

---

## 2. Verified Neon `lit.premise` Execution Receipt (`2026-11-03T08:33:21Z`)

```json
{
  "total_planned": 426,
  "record_class_distribution": {
    "HONESTLY_UNCITED_PRIOR": 423,
    "REJECTED_CORRUPT": 3
  },
  "unmatched_source_file_count": 0,
  "citable_verified_count": 0,
  "neon_insert_result": {
    "executed_at_utc": "2026-11-03T08:33:21.523512+00:00",
    "before_total": 6237,
    "existing_nov02": 497,
    "purged_non_domain_or_duplicate_rows": 72,
    "planned_count": 426,
    "after_nov02": 426,
    "after_total": 6166
  }
}
```
