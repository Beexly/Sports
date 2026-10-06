# @Matt_barlowe (Matthew Barlowe) — source notes (read 2026-09-21)

- Author: Matthew Barlowe | @Matt_barlowe (not verified). Bio (verbatim): "your boos mean nothing i've seen what makes you cheer. Жизнь прожить — не поле перейти." Joined Dec 2024; 983 following / 440 followers.
- Account type: independent analytics modeler/blogger publishing under "Barlowe ANALYTICS" branding — age-curve modeling, coaching-decision posts.

## Post inventoried
- URL: https://x.com/matt_barlowe/status/2101707476416557418 — 11:18 AM · Sep 20, 2026 (1 reply / 0 reposts / 7 likes / 3 bookmarks / 521 views).
- Text (verbatim): "Here are the derivatives of each positions age curve. The value indicates the rate of increase at each age. positive is spa effect is increasing negative is decreasing. The flatness at the end comes from just linear extrapolation at the end of the splines."
- Self-reply (~13h later): "Age for the zeros of the derivative: RB: 24.53 years, WR: 25.33 years, QB: 26.67 years" (61 views).

## Chart: "QB + RB + WR AGE DERIVATIVE"
- Subtitle (verbatim): "Local slope of fitted EPA age contributions · three-position comparison".
- Sample (as stated): "2013-2025 / 2016-2025 seasons · RB: 149,694 carries · 533 RBs · WR: 134,254 targets · 807 WRs · QB: 200,377 dropbacks · 188 QBs". Data: "NFL play-by-play".
- Axes: Y = "Age derivative of fitted EPA contribution" (+0.04 / +0.02 / 0 / −0.02 / −0.04). X = "Age on September 1 (years; days / 365.25)", 21 to 45.
- Curves: RB (red, EPA/rush/year): ~+0.005 at 21, crosses zero ≈ 24.5, ~−0.005 by 27, ~−0.008 by 30, flat ~−0.007 to ~37, then linear-extrapolation tail. WR (teal, EPA/target/year): ~+0.028 at 21, steep decline, crosses zero ≈ 25.3, ~−0.02 by 28, ≈ −0.024 from 30+ to ~37, flat tail. QB (blue, EPA/dropback/year): ~+0.010 at 21, crosses zero ≈ 26.7, gradual decline to ~−0.013 by ~35, flat ≈ −0.013 from 37 to 45.
- Shading = 94% pointwise intervals. Vertical dashed guides = fitted knots; linear tails continue beyond the outer knot.
- Interpretation box (verbatim): "Interpretation: each line is the derivative with respect to one additional year of the fitted within-position age contribution. QB is EPA/dropback/year; RB is EPA/rush/year; WR is EPA/target/year. Negative values mean the fitted age contribution declines locally with age; this is not a total EPA difference or a causal aging effect. Reference: QB is blue, RB is red, and WR is teal. The curves are differentiated directly from their stored natural-cubic spline bases. Vertical guides mark the fitted knots; linear tails continue beyond the outer knot."
- Footer: "Barlowe ANALYTICS", "NFL play-by-play · 2013-2025 / 2016-2025 / Derivative of natural cubic spline · 94% pointwise intervals".

## Key numbers (author's own)
- Peak-age zeros of the derivative: RB 24.53 yr, WR 25.33 yr, QB 26.67 yr. (Zero of the derivative = age at which the fitted age contribution stops increasing — i.e., the modeled peak.)

## GSE relevance
- New methodological source: natural-cubic-spline age curves differentiated directly from stored spline bases, with 94% pointwise intervals. Peak-age estimates (RB 24.5 / WR 25.3 / QB 26.7) are usable priors for player aging in projection blends — but note the author's own caveat: "not a total EPA difference or a causal aging effect." Small account (440 followers); methodology quality is independent of reach.
