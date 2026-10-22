# Confirmed on 2024: tracking separation is ~4x too wide even at max density

Checked the larger 2024 file so the previous conclusion doesn't rest on the sparsest season alone.

## Density differs by season, but not enough
| file | plays | players/play median | mean | max |
|---|---|---|---|---|
| 2023 | 31,690 | **1** | 1.61 | 6 |
| 2024 | 40,331 | **3** | 2.70 | 10 |

2024 is denser (median 3, max 10) — 2023 was unusually sparse. So the subject-only designation holds with
more coverage, but 10 tracked players is still under half a side.

## Separation still breaks, and worse at density
Restricted to plays with >=4 tracked players (7,171 candidate pass plays, 1,676 computable) on 2024:
mean separation **12.82 yd**, median **12.00** — against NGS true separation of ~3.0.

More tracked bodies barely helped (15.5 -> 12.8) because what is missing is not volume, it is the *covering*
defender: the subject set is chosen for the 2027 player-centric task, not for coverage, so the nearest tracked
player is still usually not the man in coverage.

## Conclusion stands, with a season dimension added
Tracking-derived separation is not usable from either file. NGS gamecenter aggregates remain the only true
separation numbers. Any future attempt should work from the subject kinematics directly (speed, acceleration,
orientation, direction of the tracked player) rather than trying to mint a coverage metric from an incomplete
frame.

## Caveats
- 2023 and 2024 only; 2025 (1.02 GB) unverified — by design it should match 2024 more than 2023, but the
  mechanism above predicts it will also fail.
- The dense-play filter is post-hoc and biases toward plays with more tracked subjects, which may correlate with
  play type.
- Nearest-tracked-defender is a lower bound on distance, so the 12.8 figure overstates true separation by
  construction.
