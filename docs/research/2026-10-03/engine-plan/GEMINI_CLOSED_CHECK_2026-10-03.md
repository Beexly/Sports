# GEMINI_CLOSED_CHECK_2026-10-03

This is a verification lane, not an open research task. Gemini 3.8 Deep Research reads only the PDF. It returns MATCH or MISMATCH against the equation already wired. It does not invent a sports use. It does not write a card.

For each row, open the PDF, find the equation number, and return one line: arxiv_id, equation_number, MATCH or MISMATCH, printed_page. If the PDF does not contain the equation, return NOT_IN_PDF.

1. 1512.03385 eq 1. Wired: y = F(x, {W_i}) + x. Eq 2: y = F(x, {W_i}) + W_s x.
2. 1502.03167 Algorithm 1. Wired: y = gamma * (x - mu) / sqrt(var + eps) + beta.
3. 1503.02531 eq 1. Wired: q_i = exp(z_i / T) / sum_j exp(z_j / T). Eq 2 gradient: (1/T) * (q_i - p_i).
4. 2006.11239 eq 14. Wired: mean squared error between epsilon and epsilon_theta of the noised x0. Not a sampler.
5. 1706.04599. Wired ECE: sum over bins of (n_m / n) * |acc - conf|. Temperature softmax is the same form as 1503.02531 eq 1.
6. 1412.6980 Algorithm 1. Already wired and tested at 0fcf38d. Do not re-derive. Confirm only that bias-corrected moments are inputs, not fit inside the function.
7. 1706.03762 eq 1. Already on the branch as scaled dot-product attention. Confirm the 1/sqrt(d_k) factor. Do not re-derive.

Closed by tests in this commit: identity shortcut, projection shortcut, batch-norm scale-shift, temperature softmax sums to 1, higher T flattens, distill gradient, simple noise loss. A mismatch from Gemini opens one function, not a new research essay.
