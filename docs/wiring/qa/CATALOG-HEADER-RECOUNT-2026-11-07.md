# CATALOG HEADER SELF-CLAIMS — RECOUNT (Motif, 2026-11-07)

Row 10 of the recompute queue closed on the salvage claims; this note recounts the catalog header's remaining self-descriptive fields against the file itself (c0c721cc8 tree):

| Header field | Header value | Recount | Verdict |
|---|---|---|---|
| total_equations | 12,304 | 12,304 entries | MATCH |
| total_signal_families | 279 | 279 in families[]; 279 distinct family_codes among entries | MATCH |
| context_mask_bits / words | 288 / 9 | consistent with the matrix header (288) and the dossier Stage A total (288) | MATCH |
| stage_c_spectral_clusters | 25 | the gate's Stage C clusters entries by cluster string; 150 distinct cluster values exist among entries — "25" matches neither the entry clusters (150) nor the dossier router's 7 letter categories; it matches the 25-label source cycle. Label, not a count of anything the gate produces | MISMATCH (definitional) |
| stage_d_max_abs_log_odds_cap | 0.35 | the gate clamps at 0.35 (Stage D); the JAX@BAL dossier receipt also clamps at 0.35 | MATCH |
| all_parameter_bindings_valid | true | gate audit: 0 invalid bindings; coverage check: all 35 names produced by the extractor | SUPPORTED |
| zero_dead_or_stubbed_verified | true | recount: dead_or_stubbed = false on 12,304/12,304; gate_status VALIDATED 12,304; executable_status ACTIVE_WIRED 12,304 | MATCH (as stored fields) |
| zero_synthetic_tanh_templates | true | operator_type recount: 9 types (linear_logit 1,368 + 8 x 1,367); zero entries carry operator_type tanh_template. BUT the gate's own "authentic" test defines authentic as operator_type != tanh_template — a definition the generator satisfies by construction | MATCH (vacuously) |
| authentic_source_verified_count | 12,304 | field-presence count only; verified resolution: 3,245 entries cite files that exist, 1,666-entry matrix chain resolution-tested (CITED-PATH-CENSUS; CATALOG-MATRIX-CITATION-RESOLUTION) | NOT SUSTAINED as verification |
| real_corpus_sources_pooled_count | 13,500 | distinct real_source_file values in the file: 2,577. No field or combination in the file yields 13,500 | NOT REPRODUCIBLE |

Pattern across the header: counts OF the file are accurate; claims ABOUT the file's relationship to the world (verified sources, pooled corpus) are not.
