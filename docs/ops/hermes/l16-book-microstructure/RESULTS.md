# L-16 book-level microstructure

Reused the L-15 `hermes_ro` extract (queried 2026-08-19T17:54:49Z on Neon branch `hermes-census-l15-20260819`; 241 MLB clean-close games; same four entry windows). `espn_public` excluded — not an executable book. Shin de-vig as in L-15 / `edge-lab/devig.ts`. Primary market = totals (over-probability). Decision rules were fixed before looking.

**A — per-book shade.** e = p_book_entry − p_median_close. t-stat uses Liang-Zeger SEs clustered by game. Anti-shade bet: when |p_book − p_median_entry| ≥ 0.005, take the other side; CLV vs the consensus close (identity: high book → bet under → CLV = e). Kill if no book has |t|>2 with n≥50, or no such book has positive mean CLV on ≥150 bets.

**B — lead-lag.** r_b,t = p_b,t − p_b,t−1 at the ~19-min cadence. ρ₁(A,B) = Pearson corr(r_A,t, r_B,t+1). A leads B only if ρ₁(A,B)>0.1 and ρ₁(B,A)≤0 **and** Benjamini-Hochberg q<0.05. Pairs that clear the raw cut only are dead. Time split: 241 games sorted by commence, first 120 for pair selection, last 121 for CLV. Simulate: leader |r|≥0.005 and follower |r|<0.005 → trade the follower in the leader's direction vs consensus close. Kill if no qualifying pair has positive mean CLV on ≥150 holdout trades.

## Totals

| Test | Result | Detail |
|---|---|---|
| A shade | DEAD | 11 books, 863–947 labels each. Largest \|t\| is betus +1.48 (mean e = +0.12pp, n=901). Nobody clears \|t\|>2. Anti-shade CLV is +1.2 to +1.8pp on the \|dev\|≥0.005 subset, but that is fade-the-outlier noise, not persistent shade, and the first kill clause already fires. |
| B lead-lag | DEAD | 110 ordered pairs. Raw-lead count = 0. BH-lead count = 0. Largest ρ₁ is bovada→draftkings 0.075 (reverse +0.054). Nothing is above 0.1 with a one-way reverse. No pair is simulated. |

Spread and moneyline were computed for honesty and do not save totals. Every spread book posts a significant e; that is different posted spread *numbers* (home-cover p at −1.5 is not comparable to −2.5), not vig-shade. Moneyline has one book (fanatics) at t=−2.18 with +0.8pp CLV on 163 bets — below the 150-bet bar for the other three |t|>2 names, and not the totals question. B is dead on all three markets (H2H max ρ₁=0.18 but reverse is also positive, so not a one-way lead).

## Verdict

**Both dead. Minute-cadence MLB totals is closed.** No book persistently shades the totals close. No book leads another at our 19-minute cadence. Do not build a copier or a fade-the-soft screen on this corpus.
