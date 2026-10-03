# SUPER_GROK_HEAVY_WAVE2_2026-10-03

Paste this whole file into a new Super Grok Heavy session. You are not an auditor and not a sports desk. You review the Gemini Deep Research wave and the previous research wave, then you wire, test, and push. Trust no claim you did not re-run. A commit message that says 6/6 is not a clear.

Clock: 14:47 CT, 2026-10-03. Branch: Beexly/Sports research/engine-plan-2026-10-03. Picks settled must stay 0. Do not merge. Do not write mind.jsonl. Do not start a second mind_train.py. Pid 29392 is the only writer on mind.jsonl. The budget lane is dead: pid 23736 is gone, pid-file 12556 is dead, mind_budget.jsonl is not there. Restart only that lane into mind_budget.jsonl. If the restart needs a credential file, stop and say so. Do not open the secret. Do not print it.

## Gemini wave, what is real

The extraction payload is in the attached Deep Research Equation Extraction report. Seven rows were marked EXTRACTED. Five were marked NOT_IN_PDF. A later read of the PDFs changed two of those.

Confirmed against the PDF, not against the report:
- Distillation softened softmax is in arXiv 1503.02531, equation (1), PDF page 4: q_i = exp(z_i/T) / sum_j exp(z_j/T). Gemini marked this NOT_IN_PDF. That mark is wrong. The combined distillation loss has no printed equation. Page 5 describes a weighted average of soft and hard cross-entropy. Do not invent the weights.
- DDPM simplified loss is arXiv 2006.11239v2, equation (14), PDF page 5, not page 2: L_simple(theta) = E ||eps - eps_theta(sqrt(alpha_bar_t) x0 + sqrt(1-alpha_bar_t) eps, t)||^2. Implement the squared error of a supplied pair. Do not sample.
- Platt is the survey form 1/(1+exp(-(b s + c))), not the 1999 PDF. The report disagrees with itself on the page, 63 versus 6. Mark the page UNVERIFIED. Do not cite Platt 1999 until that PDF opens.
- Murphy is only the identity BS = REL - RES + UNC, named page 595. The component sums were not extracted. Do not treat the identity as the partition.
- VAE bound is -KL(q||p) + E[log p(x|z)]. A bound above a supplied marginal returns None.
- Bradley-Terry is p_i / (p_i + p_j). Complements must sum to 1. Zero strength returns None.
- Prospect value is x^alpha if x >= 0, else -lambda (-x)^beta. Alpha or beta above 1 returns None. Named page 279.
- Conformal Gamma_0.05 is a symbol, not an algorithm. Do not implement it. Extract the quantile rule or leave it unwired.
- DPO, PPO clip, LoRA, and the Kalman update stayed NOT_IN_PDF in the payload. A later local read found the equations in the PDFs but not the printed page. They stay UNVERIFIED until a page exists. Do not wire them as verified.

Nine local tests of the implementable identities passed in the prior session. The push of grok_eq_verified_20261003.py was swallowed. It is not on origin. Do not claim it landed. Re-implement beside the other identities under docs/research/2026-10-03/engine-plan/eng/, with the test file, then push.

## Previous wave, already on the branch

These commits exist. None is a clear. Claimed test counts were not re-run. Do not send anyone back only to add a citation.
- f721cc17 logistic sigmoid, Bishop PRML 2006 p.114 eq 4.59. Test file present. 5/5 not re-run.
- 169756da discrete KL. Cite should be Kullback and Leibler 1951, not the in-repo pointer.
- f09fa57f ReLU, max(0, x).
- beec64cc Ohm. No-run hold.
- 473d5236 kinetic energy, 1/2 m v^2.
- af83ca93 Snell rearrangement, n2 = n1 sin theta1 / sin theta2.
- 4e9610a3 tanh, (e^x - e^{-x}) / (e^x + e^{-x}), also named 2 sigma(2x) - 1.
- 2c0dbe16 cosine similarity, zero-length returns null.
- ee737b0b Euclidean distance. Docstring names two OpenStax sections. Commit message names one.
- a3a9c449 repo-root eng/grok_eq_gemini_closed.py, nine functions, no test file. Hold.
- 8f5fff6 mind_muse.jsonl, 1,668 rows, 123 equations, 521 paths, no pick language.
- 8382137 ECE, residual add, batch-norm transform, label smoothing, missing-value tests.
- 0fcf38d Adam, Bayes term, Horn-Schunck, LSTM cell, Rescorla-Wagner, simplex weight. Nine tests re-run and passed.
- Page hunt: docs/research/2026-10-03/engine-plan/GEMINI_PAGE_HUNT_2026-10-03.md at a3a9c449.

## Secret

outbox/from-grok/orb/alpaca_adapter.py has a Credentials default. Scrub it before any bus file feeds training. Do not print the secret. Do not commit the secret. Muse writes a scrub receipt, not more posts.

## Work this session

1. Re-run the test file next to f721cc17, 2c0dbe16, and ee737b0b. Report pass or fail. A fail is a hold. A pass is still not a merge.
2. Land the verified Gemini identities in the engine-plan eng folder with tests. Push. Report the SHA.
3. Do not wire DPO, PPO, LoRA, or Kalman as verified. If you open the PDF and can name the printed page, then wire that one and cite the page.
4. Restart the budget lane only, into mind_budget.jsonl, without opening a credential file.
5. Leave pid 29392 alone.
6. Hermes stops API repair as the product. The product is the mind.
7. No pick. No Neon write. No second writer on mind.jsonl.

Done is a SHA, a test count you ran, and the list of rows still UNVERIFIED. An essay is not done.
