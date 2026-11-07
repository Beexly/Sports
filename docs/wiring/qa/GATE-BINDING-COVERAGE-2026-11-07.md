# GATE BINDING COVERAGE — VERIFIED COMPLETE (Motif, 2026-11-07)

Rotation check on intelligence/reasoning/equation_gate.py's consumption path (main HEAD c0c721cc8): does the gate's binding extractor actually produce every parameter name the catalog entries ask for? An entry whose binding name is missing from the extractor output evaluates with x=0.0 silently (bindings.get(name, 0.0)) — a whole class of entries could be running on zeros without any error.

Result: **no silent-zero class exists.** The catalog uses 35 distinct parameter-binding names across all 12,304 entries; extract_normalized_game_state_bindings() produces 39 keys; every one of the 35 catalog names is present. The 4 extractor keys no catalog entry uses (is_indoor, precip_prob, short_week, total_points) feed the router's regime-mask logic instead — used, just not by entries.

Filed with the LANE2 census: the gate's consumption of the catalog is complete at the binding level as well as the file level. The remaining known gap in the consumption chain is downstream of the gate (whether router/audit outputs reach a published surface — the untested disconnect question), not inside it.
