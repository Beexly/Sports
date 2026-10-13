# GEMINI_DEEP_RESEARCH_CLOSED_2026-10-03

You are Gemini 3.8 Deep Research. This is a closed extraction, not a survey. Do not write a sports card. Do not recommend a bet. Do not invent a page number. If the PDF does not contain the equation, return NOT_IN_PDF for that row and move on.

## Already wired. Do not re-derive

These functions already exist and have passing tests. Skip them: Adam moments and step (arXiv 1412.6980), Horn-Schunck brightness constraint, LSTM cell step, Rescorla-Wagner basic update, Bayes term a^p b^q, log loss, binned ECE, residual add y=F(x)+x, batch-norm transform, label smoothing, scaled dot-product attention, Shannon entropy, Nosofsky similarity, expected points.

## Return format

One JSON object. Key "rows", a list. Each row:
{"id": str, "source": str, "url": str, "printed_page": str, "equation_latex": str, "caller_must_supply": [str], "returns": str, "kill_test": str, "status": "EXTRACTED"|"NOT_IN_PDF"}
No essay. No pick. No price. Twelve rows, in the order below. A missing page is NOT_IN_PDF, not a guess.

## Closed tasks

1. Distillation soft target. https://arxiv.org/pdf/1503.02531. Extract the softened softmax q_i = exp(z_i/T) / sum_j exp(z_j/T) and the cross-entropy of the student against q. Page and equation number.
2. Denoising score matching. https://arxiv.org/pdf/2006.11239. Extract the training objective that is the expected weighted L2 between the noise predictor and the added noise. Not the sampler. Page.
3. Platt scaling. Platt, Probabilistic outputs for support vector machines, 1999. P(y=1|s) = 1 / (1 + exp(A s + B)). A and B are fitted, not invented. If the 1999 PDF will not open, use the printed form in the Silva Filho survey only if you cite that page, and mark the 1999 PDF NOT_IN_PDF.
4. Murphy decomposition. Murphy, A new vector partition of the probability score, 1973. Brier = reliability - resolution + uncertainty. Printed form, page.
5. Direct preference optimization. https://arxiv.org/pdf/2305.18290. Extract the DPO loss. Beta is supplied. Not a reward model you train.
6. PPO clip. https://arxiv.org/pdf/1707.06347. Extract the clipped surrogate. Epsilon is supplied. Not an implementation.
7. LoRA. https://arxiv.org/pdf/2106.09685. Extract h = W0 x + B A x. Rank r is supplied. Not a fine-tune.
8. VAE ELBO. https://arxiv.org/pdf/1312.6114. Extract the evidence lower bound as printed. Not a sampler.
9. Conformal prediction. Shafer and Vovk, A tutorial on conformal prediction, JMLR 2008, https://jmlr.org/papers/volume9/shafer08a/shafer08a.pdf. Extract the nested prediction set at level epsilon. Not a sports interval.
10. Bradley-Terry. Bradley and Terry, Rank analysis of incomplete block designs, Biometrika 1952. P(i beats j) = p_i / (p_i + p_j). Page.
11. Kalman update. Kalman, A new approach to linear filtering and prediction problems, 1960. Extract the update x = x_prior + K (z - H x_prior). K is supplied. Not a tracker you invent.
12. Prospect theory value. Kahneman and Tversky, Prospect theory, Econometrica 1979. v(x) = x^alpha if x >= 0, else -lambda (-x)^beta. Alpha, beta, lambda supplied. Not a betting rule.

Done means twelve rows, each EXTRACTED or NOT_IN_PDF, each EXTRACTED row having a page and a latex equation a function can implement without another research pass.
