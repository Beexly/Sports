# GATE PERTURBATION BATTERY (Motif, 2026-11-07)

Purpose: the consumption test the wiring night is built around — does the Python catalog gate's output actually move when game inputs move? Base context: CIN home vs ATL, wind 8 mph, temp 55F. Router run per variant (full 12,304 routed each time).

| Variant | Active families | Clamped delta | vs base |
|---|---|---|---|
| base | 263 | +0.030821 | — |
| wind 8 -> 25 mph | **279 (all)** | -0.093997 | -0.124818 |
| temp 55 -> 20F | 263 | +0.131485 | +0.100664 |
| spread home -3 (posted_spread_home/spread_home) | 263 | +0.035893 | +0.005072 |
| rest differential +3 days | 263 | +0.043909 | +0.013088 |
| precipitation=True + total_line 47 (extractor's real keys) | 263 | **+0.306321** | **+0.275500** |

Two wrong-key results, kept because they are the finding: passing `precipitation_flag` or `total_points` directly changes NOTHING (delta identical to base) — the extractor never reads those keys from the top level. precipitation_flag is DERIVED inside extract_normalized_game_state_bindings from env/game `precipitation` (bool) or `precip_prob >= 0.25`; total enters as `total` / `total_line` / `posted_total` (default 45.5, normalized (x-45)/14). A caller using the catalog's own binding names as context keys would silently evaluate the base game. Per-entry check under the corrected keys: 2,004 entries bind total_line; 1,748 of them change value — the gate is genuinely sensitive once fed in its own dialect.

Verdict: the gate is input-sensitive and family-activation is regime-driven (wind alone activates all 279 families). The integration risk is not the gate — it is the caller dialect: context keys must match the extractor's expected names, and nothing in the tree validates that mapping.

(Re-written after the ~04:35 CT service restart wiped /tmp before the first push landed; numbers are from the executed runs recorded in the session log.)
