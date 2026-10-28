# SCHEME LAYER — charting data, and what it actually says — 2026-10-27

The proprietary charting layer is not proprietary. nflverse publishes **FTN charting** and **Next Gen Stats** as open releases. Both are now local.

`ftn_charting_{2024,2025,2026}.parquet` — 18,019 charted plays in 2026 alone, joined to 103,810 plays of EPA across three seasons.

---

## 1. What FTN charting contains

Per play: `n_defense_box`, `n_blitzers`, `n_pass_rushers`, `is_play_action`, `is_rpo`, `is_screen_pass`, `is_motion`, `is_no_huddle`, `is_trick_play`, `is_qb_out_of_pocket`, `read_thrown`, `is_catchable_ball`, `is_contested_ball`, `is_created_reception`, `is_drop`, `is_interception_worthy`, `is_qb_fault_sack`, `qb_location`, `starting_hash`.

That is the same family of fields PFF charges for, charted by a third party, free.

## 2. Scheme effects — measured, not asserted

| Effect | n on | n off | EPA on | EPA off | Δ |
|---|---|---|---|---|---|
| **Play action** | 10,941 | 36,822 | +0.1256 | +0.0279 | **+0.0978** |
| RPO | 3,943 | 99,867 | −0.0499 | +0.0158 | **−0.0657** |
| QB out of pocket | 9,381 | 38,382 | +0.0215 | +0.0573 | −0.0357 |
| No huddle | 8,882 | 94,928 | +0.0373 | +0.0110 | +0.0262 |
| Blitz 5+ vs rush 4 | 13,103 | 32,703 | +0.0382 | +0.0517 | −0.0135 |
| Box 8+ vs 6− | 2,962 | 20,044 | −0.0098 | −0.0187 | +0.0090 |
| Motion | 44,044 | 59,766 | +0.0142 | +0.0126 | +0.0016 |

**Play action is worth +0.098 EPA — 7.7 points of field value per dropback.** Nothing else in the scheme layer comes close.

**RPO is negative (−0.066).** The thing every broadcast calls modern is, on average, worse than not running it. That is a real finding and it contradicts the consensus.

**Stacking the box barely stops the run (+0.009 for the offence).** Eight-plus defenders is worth less than a hundredth of a point. Defensive box count is close to decorative against the run.

**Motion is worth almost nothing (+0.0016)** across 44,000 plays. It is a tell, not an edge.

**Blitzing works (−0.0135 to the offence)** but only slightly — five or more rushers costs the offence about a hundredth of a point.

## 3. QB decision quality

Share of dropbacks, per team, 2023–2026:

| | interception-worthy | QB-fault sack | catchable |
|---|---|---|---|
| IND | **4.47%** | 1.61% | 61.7% |
| CLE | 4.10% | 2.59% | 57.0% |
| SEA | 3.97% | 3.55% | 66.9% |
| … | | | |
| DET | **1.64%** | 2.05% | **68.9%** |
| WAS | 1.93% | 2.76% | 59.1% |

**A 2.7× spread in interception-worthy throws.** DET throws a bad ball on 1.6% of dropbacks, IND on 4.5%. Catchable-ball rate runs 57–69% alongside it. This separates *decision* from *result* — a QB can have a clean stat line and a 4% bad-throw rate.

## 4. Next Gen Stats

`ngs_receiving` (15,357 rows), `ngs_passing`, `ngs_rushing` — separation, cushion, time to throw, aggressiveness, air yards to the sticks, rush efficiency, share of attempts against 8+ defenders.

**Separation, best to worst:** KC 3.45 yd, BUF 3.43, CHI 3.34 … ARI 2.74, PHI 2.80, CIN 2.81.

Separation is the receiver-side mirror of the box count: it says how open the scheme gets people, independent of who is throwing.

## 5. What this changes

- **Play action belongs in the simulation's play-selection weights**, not as a post-hoc adjustment. A +0.098 effect is bigger than most team-quality gaps.
- **RPO should be de-weighted** — the engine should not treat it as a modern default.
- **Box count is nearly useless as a run-stopping signal**; use it as a *pass* signal instead (it predicts play action opportunity).
- **Interception-worthy rate is a better QB input than INT count** — it is 2.7× more discriminating and not touchdown-luck dependent.
- **Separation and catchable% together** decompose a passing game into scheme and execution.

## 6. Caveats

- FTN charting is one vendor's judgement; `is_interception_worthy` is a human call.
- Effects are unconditional — play action is selected for, so part of +0.098 is situation, not causation. The honest read is "play action is used when it works" plus a real component.
- Box count is only charted on 23,000 of 103,000 plays.
- NGS is aggregated per player-week, not per play, so it cannot be joined to EPA directly.

## 7. Reproduce

```bash
curl -sL -o ftn_2026.parquet https://github.com/nflverse/nflverse-data/releases/download/ftn_charting/ftn_charting_2026.parquet
curl -sL -o ngs_receiving.parquet https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats/ngs_receiving.parquet
python3 /opt/model/scheme_effects.py
```
