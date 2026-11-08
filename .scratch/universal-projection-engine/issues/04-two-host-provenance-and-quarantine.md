# 04: Two-Host Provenance Manifests, ETR Attribution & 107-Repo Supply-Chain Quarantine

**What to build:** Host-independent provenance verification for all DriveFS (`4,512` entries / `458` unique Mega-Sweep books), `Downloads` (`48 -> 40` unique SHA-256 entries), and `107` external GitHub repositories with zero runtime local machine paths and corrected ETR / Mike Leone attribution.

**Blocked by:** `01: Clean-Checkout PBP Fallback & 9/9 Armed Workflow Gate`

**Status:** DONE (`ready-for-agent`)

- [x] `bk-dl-deduplicated-provenance-index.json` contains `472` total unique entries with all 6 mandatory bridge fields and cites Establish The Run (ETR) / Mike Leone (2026-09-06) for the 35-contest, 9,570-lineup Solver audit.
- [x] `external-github-repos-quarantine-manifest.json` records `107` repositories (`34` new + `73` prior) with `all_install_permitted_in_prod_false: true` and explicitly rejects `Blur009/Blur-AutoClicker` and `itbrowser-net/undetectable-fingerprint-browser`.
- [x] `python scripts/wiring/verify_google_drive_and_docs_corpus.py` and `python scripts/wiring/build_bk_dl_and_quarantine_manifests.py` pass with `0` local `Downloads` paths in runtime modules.
