# DEEPSEEK REPAIR NOTE — paste-ready for the round after 05
## PROJECT MOVE-37 | From: execution lab (Motif) via Garrett

Your Round 05 response is received and partially verified. One item is **blocking**: the WP-1 IRL protocol cannot be executed as written. Repair the following and return a corrected WP-1. Do not re-send the other work packages unless the fix changes them.

### BLOCKER 1 — the utility function is mathematically broken (must fix)
You specified CRRA utility `U(x) = (x^(1−γ)−1)/(1−γ)` over "terminal game outcome (win=1, loss=0)", then pre-registered γ ∈ [0.5, 3.0].
- For γ ≥ 1, `U(0)` is undefined/infinite: `0^(1−γ)` with negative exponent → +∞; `ln(0)` → −∞. Most of your own predicted γ range makes `U(loss)` infinite, so the softmax likelihood cannot be computed.
- Component 4 then evaluates `U` at **WP values** (`E[U|go] = p_conv · U(WP_after_conv) + …`), contradicting Component 2's definition of `U` over terminal outcomes {0,1}. The domain is inconsistent inside the protocol.
- Repair: define the utility over WP ∈ [0,1] directly with a bounded, well-behaved parametric family (state the family, its domain, its behavior at the 0 and 1 boundaries, and prove-by-construction that the likelihood is finite for all γ in your pre-registered range). Alternatively, keep terminal-outcome utility but model outcomes as win/loss lotteries with explicit tremble probabilities and show the finiteness. Either way: the lab must be able to implement it verbatim with no undefined values.
- Re-derive your pre-registered γ prediction ([0.5, 3.0]) under the repaired specification — the old range was derived for the broken one and does not transfer automatically. New range, new reasoning, same kill-criterion format.

### BLOCKER 2 — garbled formulas (must clean)
- Component 4: `U(WP),_after_conv)`, `U(WP which_after_fail)`, "similarly for uses kick and punt" — rewrite every expectation term with matched parentheses and exact subscripts.
- Component 5 baselines: "The benchmark for comparison is the 4th Down Bot by the New York Times (archived the nflfastR WP model." — complete the sentence and make the factual claim verifiable (what bot, whose model, archived where, what it predicts).

### DEFECT 3 — incomplete §6 table (re-supply)
The §6 numeric self-audit as received contains 9 rows (N-01–N-04, N-19–N-23). Rows N-05–N-18 are missing and N-04 is cut off mid-row. Re-send the complete table; the "14 of 23 UNSOURCED" headline is unverifiable until you do.

### DEFECT 4 — truncated hypothesis rows (complete them)
H-08 is missing its kill criterion and cheapest-test columns. H-12 is missing its prediction, kill criterion, and cheapest test. Complete both rows in the H-table format.

### DEFECT 5 — incoherent fallback ranking (fix the logic)
§4c says a failed IRL "drops to rank #4 (below soft-target SR and time-stratified SR)" — but your own §11 ranks those #4 and #5 as lab-falsified. State the coherent fallback: if the identification diagnostic fails, where does IRL actually land and what takes #1.

### Confirmed good (no action)
- The bootstrap-without-game-stratification catch is real — the lab verified it in the code. Credit.
- The calibration arithmetic (7.0× median) checks out.
- The WP-5 replication designs and §4b failure-mode diagnostics are well-formed; the lab is executing the cheap ones.
