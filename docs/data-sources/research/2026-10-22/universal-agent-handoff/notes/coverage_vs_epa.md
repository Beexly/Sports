# Coverage type vs EPA on 64,037 pass plays

Descriptive value table on labelled pass plays — mean EPA by coverage (offense-signed as supplied):

| coverage | n | mean EPA |
|---|---|---|
| PREVENT | 203 | −0.401 |
| COVER_0_MAN | 3,454 | −0.086 |
| COVER_2_ZONE | 8,789 | −0.060 |
| COVER_1_MAN | 13,764 | −0.042 |
| COVER_3_ZONE | 20,897 | −0.025 |
| COVER_4_ZONE | 10,338 | −0.024 |
| COVER_2_MAN | 890 | −0.010 |
| COVER_6_ZONE | 5,702 | 0.000 |

Man vs zone: **−0.0486 (n=18,108) vs −0.0299 (n=45,929)**, Mann-Whitney **p = 1.6e-20**. Man is worse
for the defence by ~0.019 EPA, driven overwhelmingly by Cover 0 (all-out blitz) at −0.086 and Cover 1
at −0.042.

## Caveats that matter
1. **Sign convention is ambiguous here.** Every mean is negative, and even passes average −0.015 while
   runs average −0.116 — so these are not the usual offense-positive EPA values. Treat the ranking as
   relative, do not quote absolutes.
2. Coverage is *chosen*, so this is not causal: teams play Cover 0 when they expect a blitz-beating
   quick throw, which is exactly when it loses EPA.
3. A `p.cov` collision with `DataFrame.cov` silently broke two attempts before being spotted — use
   `p["cov"]` on these frames.

## Reading
Cover 6 (quarter-quarter-half) at 0.000 and Cover 2 man at −0.010 are the neutral end; Cover 0 is the
costliest call in the book. That ordering is stable enough across 64k plays to be a usable prior when
grading a defence, and it gives the coverage model a target worth predicting.
