# Neon `lit.premise` Ingestion Receipt — 2026-11-02 / 2026-11-03

- **Executed At (UTC):** `2026-11-03T07:45:55.230223+00:00`
- **Neon Project / Branch / Role:** `summer-brook-99380762` / `dev-lit-vectors-2026-10` / `neondb_owner`
- **Manifest Artifact:** [`data/engine/INGESTION-MANIFEST-2026-11-02.json`](file:///C:/c/wt-week8-forensic/data/engine/INGESTION-MANIFEST-2026-11-02.json) (`378` files scanned in `C:/Users/Garrett/Downloads`, `5` sensitive files excluded unhashed with `sha256: null`, `3` retracted Hindawi papers flagged as `rejected-retracted-paper`, **`unmatched_source_file_count: 0`**).
- **Initial Pre-Insert `lit.premise` Count:** `5,740` (`0` rows with `premise_key LIKE 'nov02:%'`)
- **Wave 1 Inserted `nov02:%` Count:** `112` rows (`5,740 -> 5,852`)
- **Wave 2 Inserted `nov02:%` Count:** `131` rows (`5,852 -> 5,871`)
- **Wave 3 Inserted `nov02:%` Count:** `145` rows (`5,871 -> 5,885`)
- **Wave 4 Inserted `nov02:%` Count:** `160` rows (`5,885 -> 5,900`)
- **Wave 5 Inserted `nov02:%` Count:** `173` rows (`5,900 -> 5,913`)
- **Wave 6 Complete Master Sweep `nov02:%` Count:** **`497` rows** (`5,913 -> 6,237`, covering 100% of the `369` non-sensitive files across Garrett's master `Downloads` sweep with `0` unmatched source files, plus 9 new Wave-6 production & research equations `EQ-NOV03-021..029`)
- **Final Post-Insert `lit.premise` Count:** **`6,237`** (`5,740 + 497 = 6,237`)
- **Record Class Distribution of Inserted Batch (`497` rows):**
  - `HONESTLY_UNCITED_PRIOR` (`verification_tier = 'MSVH_S0_UNCITED'`, `citable = false`): **`494` rows**
  - `REJECTED_CORRUPT` (`status = 'REJECTED'`, `citable = false`): **`3` rows**
    1. `DOC-NOV03-REJECTED-WANG2022` — Wang 2022/2023 Retracted Hindawi paper (*Sports Feedback System Based on Video Digital Processing Technology*, `DOI: 10.1155/2023/9830141`)
    2. `DOC-NOV03-REJECTED-SONG2022` — Song 2022/2023 Retracted Hindawi paper (*Data Fusion Algorithm for Myocardial Proteomics and Its Research in Sports*, retracted 1 Nov 2023)
    3. `DOC-NOV03-REJECTED-LI2022` — Li 2022 Retracted Hindawi paper (*Research on Application of Sports Training Performance Prediction Based on Convolutional Neural Network*, retracted 8 Dec 2022)
  - `CITABLE_VERIFIED`: **`0` rows**
- **Mandatory Statement:** **"Nothing in this batch is CITABLE_VERIFIED. All 494 active rows are HONESTLY_UNCITED_PRIOR / MSVH_S0_UNCITED pending backtest promotion, and 3 retracted Hindawi papers (DOC-NOV03-REJECTED-WANG2022, DOC-NOV03-REJECTED-SONG2022, DOC-NOV03-REJECTED-LI2022) are REJECTED_CORRUPT."**
