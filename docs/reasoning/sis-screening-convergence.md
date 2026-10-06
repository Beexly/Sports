# SIS screening convergence

Sure Independence Screening does not stop on a p-value. It stops when growing the subspace stops changing the model.

## What is being screened

At dimension \(n\), every constructed feature \(\phi_j\) is scored against the current residual \(r_{n-1}\):

\[
w_j = \mathrm{corr}(\phi_j,\, r_{n-1})
\]

The subspace \(\mathcal{S}_n\) is the \(k\) features with the largest \(\lvert w_j\rvert\). \(\ell_0\) then searches combinations inside \(\mathcal{S}_n\). If the true second descriptor is not in that list, no later step can recover it.

## The two thresholds people confuse

`nf_sis` / \(n_{\text{sis}}\) / \(k\) is a **count**. Keep the top \(k\). That is the knob.

A correlation floor \(\lvert w\rvert > \tau\) is optional and usually worse here. Yardline and yards-to-go are correlated. A floor drops the weaker of the pair even when it is the orthogonal piece the residual needs.

Compressed-sensing scaling from the 2018 paper is a starting guess, not a fitted cutoff:

\[
k \sim \exp\bigl(\#P / (\kappa\, n)\bigr),\qquad \kappa \in [1,10]
\]

Larger dimension forces a **smaller** \(k\) because \(\ell_0\) is combinatorial.

## Convergence, operationally

1. Fit \(n=1\) at \(k \in \{200,500,1000\}\).
2. Record the winning expression and its residual.
3. Fit \(n=2\) at the same three \(k\) values, one residual then ten residuals.
4. Converged means: the selected expressions and the holdout residual do not move when \(k\) doubles.

That plateau is the threshold. TorchSISSO's default \(k=20\) is a materials-lab default for tiny \(N\). Target B has tens of thousands of drives. \(k=20\) can return only field position and look finished while distance never entered \(\mathcal{S}\).

## Multiple residuals

SISSO++ scores each feature as \(\max_i \mathrm{corr}(\phi, r^{(i)})\) over the best \(r\) residuals. One residual plus a small \(k\) is how a correlated second term dies. Fifty residuals recovered a two-term toy that a single residual needed \(k>400\) to see. Yardline vs distance is that pair.

## When to stop adding dimension

Stop when the next dimension's holdout gain is inside the standard error of the last, or when the new descriptor is an operator costume of the last (`sin` of yardline after yardline is already in). MOVE-37 already measured the smooth two-feature identity at AUC 0.604 and the booster at 0.627. A SISSO model that does not clear 0.604 is not converged. It is under the identity.
