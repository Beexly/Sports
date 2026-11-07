# STAGE 1B UNIFORMITY — V2: IT IS NOT THE CAP (Motif, 2026-11-07)

Corrects and supersedes the open question in STAGE1B-UNIFORMITY-2026-11-07.md. That note left two candidate explanations — the 0.35 cap binds universally, or the router's context doesn't vary. The receipts themselves settle it, one level deeper than v1 read:

**Every Stage-D input is also identical across all 19 dossiers:**
- stage_d_unclamped_log_odds_delta = 1.096888 (all 19)
- stage_d_raw_log_odds_delta = 1.096888 (all 19)
- stage_d_james_stein_shrinkage_factor = 0.916978 (all 19)
- stage_a_context_mask_bits_active = 288 of 288 (all 19 — every context bit on, for every game)
- TS telemetry context_mask_words[0] = 4095 (all 19; remaining words 0)

So the cap is NOT the explanation: the values arriving at the cap are already the same number for ARI@SEA as for JAX@BAL. And a 288/288 active mask for every matchup means the "context" the router stage consumed did not encode anything game-specific at all — with every bit on, family activation (258 = the matrix's static coverage) and the Stage-C cluster sums are constants of the matrix, not functions of the game. The Stage 1B receipt block is, in full, a constant function of the matchup.

**Where the game-specific context exists but didn't reach:** the workflow builds merged_game_context via build_dynamic_matchup_situational_context(away, home, week, QBs…) (workflow line 2024, inside Stage 1B) and passes it to the PYTHON gate's router (line 2330) — whose output lands in the receipt as equation_gate_12304_clamped_delta (line 2407), a different field from the cognitive_router block examined here. The uniform block comes from the TS/matrix router path (telemetry: thousand_equation_matrix_count 1666, mask words as above). So inside one Stage 1B receipt, the Python path received a per-game context and the TS path — the one whose numbers headline the receipt — effectively received all-bits-on. Whether the all-on mask is a caller bug (mask never populated per game) or a design placeholder, the receipts cannot distinguish; the TS module was not executed tonight (premise DB absent, DOSSIER findings). But the fix location is now narrow: the mask construction feeding the TS router in the Stage 1B path, not the cap and not the shrinkage.

**Runbook consequence (updated):** treat the cognitive_router Stage-D delta as a constant, not a signal, until the mask varies per game and the receipts show it. The Python gate's per-game delta (equation_gate_12304_clamped_delta) is the only Stage 1B number with demonstrated per-context variation tonight (perturbation battery + three executed contexts).
