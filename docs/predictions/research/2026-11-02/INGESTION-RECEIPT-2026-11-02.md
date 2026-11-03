# Neon `lit.premise` Ingestion Receipt — 2026-11-02 / 2026-11-03

- **Executed At (UTC):** `2026-11-03T06:20:50.153848+00:00`
- **Neon Project / Branch / Role:** `summer-brook-99380762` / `dev-lit-vectors-2026-10` / `neondb_owner`
- **Manifest Artifact:** [`data/engine/INGESTION-MANIFEST-2026-11-02.json`](file:///C:/c/wt-week8-forensic/data/engine/INGESTION-MANIFEST-2026-11-02.json) (`348` files scanned in `C:/Users/Garrett/Downloads`, `5` sensitive files excluded unhashed with `sha256: null`, `1` retracted paper flagged as `rejected-retracted-paper`).
- **Pre-Insert `lit.premise` Count:** `5,740` (`0` rows with `premise_key LIKE 'nov02:%'`)
- **Inserted `nov02:%` Count:** `112` rows (`98` Nov 2 rows + `14` Nov 3 primary sources/equations)
- **Post-Insert `lit.premise` Count:** `5,852` (`5,740 + 112 = 5,852`)
- **Record Class Distribution of Inserted Batch:**
  - `HONESTLY_UNCITED_PRIOR` (`verification_tier = 'MSVH_S0_UNCITED'`, `citable = false`): **`111` rows**
  - `REJECTED_CORRUPT` (`status = 'REJECTED'`, `citable = false` — `DOC-NOV03-REJECTED-WANG2022`, Wang 2022/2023 Retracted Hindawi paper `DOI: 10.1155/2023/9830141`): **`1` row**
  - `CITABLE_VERIFIED`: **`0` rows**
- **Mandatory Statement:** **"Nothing in this batch is CITABLE_VERIFIED. All 111 active rows are HONESTLY_UNCITED_PRIOR / MSVH_S0_UNCITED pending backtest promotion, and 1 retracted paper (DOC-NOV03-REJECTED-WANG2022) is REJECTED_CORRUPT."**
