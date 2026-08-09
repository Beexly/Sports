# Investigate: Platt scaling IRLS

## Model
\[
p_{\mathrm{cal}} = \sigma(A \cdot \mathrm{logit}(p_{\mathrm{raw}}) + B)
\]
MAP prior \(A\sim\mathcal N(1,1)\), \(B\sim\mathcal N(0,1)\).

## IRLS / Newton
Each iteration on logistic NLL + Gaussian prior:
- Gradient \(g = X'(p-y) + \Sigma_0^{-1}(\theta-\theta_0)\)
- Hessian \(H = X'WX + \Sigma_0^{-1}\), \(W=\mathrm{diag}(p(1-p))\)
- \(\theta \leftarrow \theta - H^{-1}g\)

Code: `platt-scaling.ts` · diagnostics: `platt-irls-investigate.ts`

## Read A, B
| | Meaning |
|--|---------|
| A < 1 | Raw overconfident → compress toward 0.5 |
| A > 1 | Sharpen (use carefully) |
| B ≠ 0 | Global under/over shift |

## Product law
**Apply OFF** until Murphy **RES** improves and holdout floors pass. Platt is not a PROVEN unlock.
