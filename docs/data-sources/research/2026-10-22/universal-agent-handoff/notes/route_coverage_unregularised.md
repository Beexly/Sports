# Unregularised check: the coverage finding holds, CORNER's survival does not

Previous note warned that Ridge on 80 sparse dummies shrinks residuals toward zero and bounds the result.
Reran unregularised: OLS, interaction cells restricted to n>=30 (51 of 86 cells kept).

| route | n | base YOE | OLS +cells |
|---|---|---|---|
| SCREEN | 217 | 2.710 | 0.293 |
| CROSS | 300 | 1.713 | 0.028 |
| GO | 112 | 1.380 | 0.207 |
| SLANT | 141 | 1.236 | **0.997** |
| POST | 84 | 1.166 | 0.308 |
| FLAT | 153 | 1.085 | **0.693** |
| CORNER | 56 | 0.330 | **0.054** |
| IN | 124 | −1.162 | −0.206 |
| HITCH | 350 | −2.112 | −0.320 |
| OUT | 258 | −2.229 | −0.126 |

Corr 0.632 (Ridge gave 0.507), shrinkage 78–100%. **The shrinkage artefact was small** — unregularised
fitting reproduces the same collapse, so the previous upper-bound caveat can be relaxed: route×coverage
genuinely absorbs the great majority of route YOE.

## One retraction
CORNER's apparent survival (Ridge +0.979) was **the shrinkage artefact**, not signal: under OLS it falls to
+0.054. On 56 holdout plays Ridge had over-pulled it toward the mean. Withdrawn.

SLANT (+0.997 on n=141) and FLAT (+0.693 on n=153) survive unregularised and are the only two routes that
do. Both are leverage routes — payoff determined by the defender's relationship to the receiver, not the
route's depth. That is now a twice-confirmed result and the defensible version of this thread.

## Standing caveats
- Surface increases with the interaction count (51 cells), and holdout cells still thin; per-route n of
  56–350 is small for a strongly interacted model.
- Play-level coverage label still cannot represent route-specific matching; the interaction is a proxy for
  it, not the thing itself.
- Survivorship (completions only) and at-the-pass separation remain.
