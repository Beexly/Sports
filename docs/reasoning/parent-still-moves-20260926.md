# What should still move LAC at BUF

Parent note, 2026-09-26. Branch `grok/reasoning-layer-2026-09-26` at `62772551a` before this pass. `publishes_pick` stays false. No new prior. No push.

The edge already on this game is the sum of the live parts in `docs/reasoning/week3-engine-readings.md`. Home-positive. Coverage 0.68. Those parts are not candidates.

| already a part | grain | signed | points | why it stays the representative |
|---|---|---:|---:|---|
| on_field_efficiency | 2025 prior + 2026 weeks 1-2 opponent-adjusted blend (pass EPA residual, rush EPA residual, CPOE, explosive-pass rate, interception luck). NGS special-teams pace is the sibling, capped at 0.15 | 1.000 | 0.140 | A second CPOE (pbp and NGS) would be the same family twice. |
| scheme_play_design | Charted motion, play-action, RPO, shotgun on prior-week plays. Drive-start field position is the sibling, capped at 0.15 (2025 r=+0.186, n=272) | 0.034 | 0.004 | Field position is the residue that survived ablation. It is not the MOVE-37 sin formula. |
| availability | Injury-report out list. LAC 6 out, BUF 2 out | 0.667 | 0.080 | Outs are the availability row. Questionable skill players are airwave, so they are not counted again. |
| schedule_and_body | `games.rest_diff` = 3. Slope +0.4108 margin points per extra day, se 0.2535, n=544 | 0.088 | 0.007 | Rest cleared \|slope\| > se. Travel is not a second live body signal. |
| historical_strength | Elo on this `game_id` | 0.556 | 0.044 | One strength premise. |
| trench_personnel | `qb_hit` per dropback. 2025 walk-forward r=0.241, n=250 | 0.749 | 0.037 | Tackle-out drag already moves the lineup ledger and the out list. It is not a second trench edge. |
| chemistry | Quarterback this week versus the weeks 1-2 snap leader. Herbert and Allen are still those leaders | 0.000 | 0.000 | The family is live. This game's row is zero. |
| airwave | Questionable and doubtful skill wire. Prior 0.05 | -0.208 | -0.010 | SiriusXM audio is not this row. |

## Not a part, and why it is not EPA-on-EPA

These four candidates could still change the sum. None of them is another expected-points residual. `selectPart` in `packages/prediction-engine/src/reasoning/part-selector.ts` returns DARK for each, and honesty (f1) is the winning term. The same four decisions are applied to all sixteen week-3 games.

1. **officials** — grain `games.referee`. A crew's historical home margin is a person effect, not play efficiency. 2024 crew means that cleared |mean| > se (7 of 17) were applied to 2025 regular-season games (n=113). Versus home win: r=-0.093, slope=-0.0101, se=0.0103. |r| clears 0.08. |slope| does not clear se, and the sign flipped. LAC at BUF also has `referee` null. A named crew does not enter either. ATL at GB (Shawn Smith) is the same decision.

2. **weather_physics** — grain `schedules.weather` wind. Wind slope -0.135 per mph, se 0.1618, n=349 outdoor games. Temperature slope +0.0294 per °F, se 0.0388. Both sit inside one standard error. A play-by-play weather column would be this same family. It does not move the sum.

3. **narrative_contract** — grain `contracts` (dollars and years, not expected points). No contract table is joined, so r, slope, and se were not stored. The prior 0.03 stays dark. Do not invent a salary.

4. **coaching** — grain fourth-down go rate, not EPA. 2025 walk-forward r=-0.0136 on 255 games. |r| is under 0.08. `nfl4th` is the named sibling and is not a second live coaching signal.

Market spread (+7) and total (49.5) stay context. Brier, ECE, Kelly, and Bradley-Terry stay meters. Nutrition, cognition, raw RFID, PFF, the other research gates, consumer picks, and SiriusXM audio are unwired on purpose. There is no row, and a weight without a row is a lie.

## Scalarizer

The procedure is `selectPart`. It is not a paragraph that runs once.

Minimize Tchebycheff. Ideal point is (0, 0, 0). λ = (0.5, 0.3, 0.2).

- f1 = 0 when |r| ≥ 0.08 and |slope| > se, else 1
- f2 = 1 when this direction already has a representative, else 0
- f3 = 1 when the week-3 game has no row, else 0

g = max(λ_i f_i). Duplication as the winning term → DARK. Honesty failing as the winning term → DARK. Missing week-3 row as the only failure, with a real fit → STORED. g = 0 is the only path to a new LIVE part, and it uses the prior already on that family.

The eight parts above are persisted in `packages/prediction-engine/src/reasoning/live-edge-registry.ts`. Their points for this game sum to the edge 0.30259224777263855.
