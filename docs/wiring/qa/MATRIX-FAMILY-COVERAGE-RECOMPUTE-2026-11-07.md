# MATRIX FAMILY-COVERAGE — INDEPENDENT RECOMPUTE (Motif, 2026-11-07)

Rotation item from the LANE2 gap statement: the thousand-equation matrix's claimed family coverage, recomputed from the file itself (qa-repo HEAD c0c721cc8, data/engine/thousand_equation_matrix_2026.json).

Header (the file's own numbers): total_equations 1666; citable_verified_count 1340; computed_count 326; inference_quarantined_count 0; load_bearing_count 1666; signal_families_count 279.

Recomputed from the 1,666 entries: **258 distinct signalFamilyIdx values**, range 12–276. **21 family indices absent: 0–11, 17, 262–265, 268, 275, 277–278.** So the matrix's entries touch 258 of the 279 families its header claims — 21 families have zero matrix entries, including the first twelve (indices 0–11). This matches the DeepSeek salvage recount exactly (258 / absent list identical), so the salvage figure is now confirmed by two independent computations.

Context: the catalog router run tonight activated 263 of 279 families on one sample context — a different mechanism (displacement threshold over catalog families), not in conflict with this count.
