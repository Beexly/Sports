# Manifest provenance

Every committed data file gets a manifest beside it: source, producer, sha256, bytes, row count or cell count, date range, license, and whether the fit is point-in-time.

No manifest means the file is a fixture, even if a test is green.

Reference: intelligence/coaching/data/tau_hat.manifest.json. The served table and the held-out gate are different objects. The manifest says so. Do not cite the served table as having been validated at the held-out number.

nflverse inputs are CC-BY-4.0. TimesFM 3.0 outputs are Non-Commercial and must not appear in a commercial manifest as if they were nflverse.
