# Quarantined Pending Tests (`tests/pending/`)

- `test_week6_forensic_fixes.py`: Quarantined under Subsystem 5 because it imports `SOVEREIGN_SIGNAL_LEAGUE_BASELINES` and `evaluate_total_steam_exhaustion_gate` from `scripts.sync_week6_db`, which were never landed in tracked source.
- **Restore condition:** File the primary-source mathematical specification for the steam-exhaustion gate and sovereign league baselines, implement them in `scripts/sync_week6_db.py`, and verify the full `pytest` suite passes before moving back to `tests/`.
- **Active replacements:** `tests/test_week8_post_slate_fixes.py`, `tests/test_ledger_truth.py`, `tests/test_mnf_card_integrity.py`, `tests/test_biomech_quarantine.py`, and `tests/test_mutation_guards.py`.
