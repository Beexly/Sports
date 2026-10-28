# SII stability check — only the stacked box survives

2026-10-28. Three conclusions in this stretch already reversed once more data arrived, so SII got
a split-half check before anyone trusts it. Weeks 1–5 against weeks 6–7, motion minus no-motion
EPA within each box bucket.

| Box | wk1–5 gap | wk6–7 gap | Verdict |
|---|---|---|---|
| 7 | **+0.019** (n=2,177/1,302) | **−0.064** (n=806/446) | sign flips |
| 8 | **+0.036** (n=385/252) | **−0.288** (n=140/92) | sign flips |
| 9+ | −0.067 (n=79/61) | −0.680 (n=30/31) | direction holds, magnitude 10× |

## What this means

**Only the 9+ box is directionally stable.** Motion is worse than no-motion against a stacked box
in both halves. Everywhere below 9+, the sign flips between windows and the pooled number is a
blend of two opposite readings.

The pooled 9+ figure of −0.0435 is not a stable estimate. It is the average of −0.067 and −0.680,
on 109 and 61 plays respectively. The true value could sit anywhere in that band.

## Sample sizes

The 9+ bucket is 140 plays across seven weeks. That is small. Two or three explosive plays move it
by tenths of a point. The box-8 bucket is 477 plays and still flips sign.

## Consequence for the metric

- SII at a 9+ box: usable as a **direction**, not as a magnitude.
- SII at 7 and 8: not usable yet. Report the sign only, or wait for the season.
- Any consumer that adds SII into a score needs to know the magnitude is provisional.

## What would fix it

More weeks, which the reconstruction can now take. The 9+ bucket needs roughly 400 plays before
the magnitude settles — call it a full season. Until then the honest output is a direction with a
wide interval, not a point estimate.

## Note

This check is the reason to keep the derivation script and the raw artifact rather than only the
pinned constants. The constants are a snapshot; the split is the claim.
