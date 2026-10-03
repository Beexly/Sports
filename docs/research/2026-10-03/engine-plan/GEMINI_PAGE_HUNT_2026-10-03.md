# GEMINI_PAGE_HUNT_2026-10-03

Paste this whole file into Gemini 3.8 Deep Research. Then paste it into 3.1 Pro. Return JSONL only. No essay. No sports card.

This session already read these equations from the PDFs. Printed page numbers were not visible. Your only job is the printed page, the equation number, and a kill test. If the page is not on the PDF, write NOT_IN_PDF. Do not replace a missing page with a blog.

1. Distillation. arXiv 1503.02531 section 2. q_i = exp(z_i/T) / sum_j exp(z_j/T). Page needed.
2. PPO clip. arXiv 1707.06347 section 3. L_CLIP = E min(r_t A_t, clip(r_t, 1-eps, 1+eps) A_t). Page needed.
3. LoRA. arXiv 2106.09685 section 4.1 equation (3). h = Wx + BAx. Page needed.
4. DPO. arXiv 2305.18290 equation (7). Page needed.
5. Kalman update. Kalman 1960 ASME. The measurement update x = x_prior + K(z-Hx). Page or NOT_IN_PDF.
6. Murphy 1973 page 595. Do not stop at BS = REL - RES + UNC. Extract the printed sums for REL, RES, and UNC.
7. Shafer and Vovk 2008 page 372. Extract the quantile rule that builds the set. Gamma_0.05 alone is not an equation.
8. Platt 1999 original. The survey form 1/(1+exp(-(bs+c))) is already noted. Find the 1999 printed page or NOT_IN_PDF.
9. Open docs/agent-index/PAPER-CATALOG.md on Beexly/Sports and list every paper id that has no function under eng/grok_eq_*. One row per missing paper.
10. Open docs/2026-09-13-confidence-calibration-baseline.md and extract the printed calibration equation. If the file has no equation, write NO_EQUATION.

Done is ten rows. A row without a page is NOT_IN_PDF. Do not emit a pick.
