# [1753] Martingale Approach to Gambler's Ruin Problem for Correlated Random Walks (arXiv:2501.10302)

## 1. Citation and full-text-read statement
**Citation:** Vladimir Pozdnyakov (Univ. of Connecticut) (2025). *Martingale Approach to Gambler's Ruin Problem for Correlated Random Walks*. arXiv:2501.10302. URL: https://arxiv.org/abs/2501.10302
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections; §3.1–3.2 formulas read in full, §§4–5 skimmed).
**Verdict:** ADAPT — one sentence: the closed-form ruin probability for Markov-correlated win/loss increments gives GSE an exact streak-aware ruin gate (persistence p estimated from the engine's weekly record), but the {±1} unit-stake, ≤3-state scope needs extension to variable Kelly stakes.

## 2. Research question
For a correlated random walk (increments forming a Markov chain) — with and without delays ({1,−1} and symmetric {1,0,−1}) — what are the closed-form gambler's ruin probability and expected game duration, via the Optional Stopping Theorem?

## 3. Method / model
Increments {X_n} form a 2-state Markov chain (symmetric case: P(stay)=p=q). Gambler starts at 0, absorbed at −B (ruin) or A (success), τ = absorption time. Martingale approach: linear martingale M_n = (2−2p)S_n + (2p−1)X_n for ruin probability (OST); quadratic martingale M_n = S_n² + aS_nX_n − bn for expected duration. Extended to symmetric CRW with delays {1,0,−1} (§4), a martingale technique for general CRW with delays, and the two-arbitrary-pattern game (§5, e.g., HH vs TH: non-zero payments reduce to i.i.d. symmetric, α = (B−1/2)/(A+B)).

## 4. Mathematics / equations / assumptions
- Ruin probability, symmetric CRW (Eq. 2): α = [B − 1 + (1/2)·1/(1−p)] / [A + B − 2 + 1/(1−p)].
- Arbitrary initial distribution (π_1, 1−π_1) (Eq. 3): α = [B − 1 + π_1/(1−p)] / [A + B + (2p−1)/(1−p)].
- Sanity checks: A=B → α=1/2; p=1/2 (i.i.d.) → α=B/(A+B) (classical); p→1 → α→1/2 (first flip decides); B→∞ → α→1.
- Expected duration (Eq. 4): E(τ) = (1/b)[b − (1+a) + A²α + B²β + a(Aα + Bβ)] with martingale coefficients a, b solved from the chain.
- Delays: symmetric {1,0,−1} closed forms (§4); general CRW with delays via martingale technique.
- Assumptions: 2-state (or 3-state with delays) Markov increments; unit stakes; absorbing boundaries; OST applicability (integrability).

## 5. Dataset / schema
None — probability theory, illustrated with the HH-vs-TH two-pattern coin game. No empirical data.
## 6. Features and target
Not applicable (theory). Inputs: persistence p, boundaries A, B, initial law π_1. Outputs: ruin probability α, expected duration E(τ).

## 7. Validation design
None empirical.

## 8. Exact results and baselines with numbers
No numerical results. Exact formulas (2), (3), (4); the HH-vs-TH worked example (π_1=.25, p=q=1/2 → α=(B−1/2)/(A+B)).

## 9. Code / data availability
None stated.

## 10. Leakage and limitations
Author-flagged: technique relies on indicators of {X_n=1} being expressible via X_n — "likely unsuitable for Markov chains with more than three states"; expected time for the two-pattern game and the waiting-time distribution with delays remain open; unit stakes only (no variable/Kelly staking); increments are ±1 (no magnitude); symmetric chain in the closed forms.

## 11. GSE overlap
All of GSE's current ruin/drawdown math (1749–1752) assumes independent increments; weekly betting P&L is streaky — wins cluster (model hot streaks, correlated picks within a week) and losses cluster. This paper is the streak-aware correction: with persistence p > 1/2, the 1/(1−p) terms inflate effective ruin probability vs the i.i.d. B/(A+B). Per the existing-research map, GSE has no serial-correlation adjustment in its bankroll math. New capability: an exact ruin gate that accounts for streakiness.

## 12. Implementation specification
Build the "streak-aware ruin gate": (a) from the engine's weekly settled P&L sign series, estimate p = P(win_t | win_{t−1}) (and the symmetric q) per market; (b) express bankroll in units of weekly stake; set A = target/profit-goal in units, B = bankroll in units; (c) compute α from Eq. (3); choose stake size so α ≤ 1% (or Garrett's tolerance); (d) recompute weekly as p drifts; (e) extend to {1,0,−1} using §4 to include push/no-bet weeks. Effort: ~0.5 day (estimator + formula + stake solver).

## 13. Reproducible test
Dataset: 2023–2025 NFL weekly engine P&L signs. Estimate p per season; compute the CRW ruin probability vs the i.i.d. B/(A+B) for a 100-unit bankroll and 200-unit goal; simulate the fitted 2-state Markov chain (Monte Carlo) to verify the closed form; compare realized ruin/drawdown frequencies in the backtest against both predictions. Metrics: formula-vs-simulation agreement (must match to Monte Carlo error), realized drawdown frequency vs predicted α.

## 14. Acceptance / rejection gate + improvement experiment
Gate: ADOPT the streak-aware gate if the engine's weekly signs show significant persistence (|p − 1/2| > 0.05, binomial test) AND the CRW α differs from the i.i.d. value by > 20% relative (i.e., the correction matters); REJECT if weekly signs are statistically independent (then the classical formula suffices). Improvement experiment: fit a 2nd-order chain (k=2 memory, "elephant remembers two steps") numerically and test whether the ruin probability moves materially vs k=1 — probing the paper's ≤3-state boundary with real data.

**Verdict:** ADAPT — the exact streak-aware ruin formula is a direct, cheap upgrade to GSE's bankroll gates when weekly results are serially correlated, but it needs the variable-stake extension for Kelly-sized bets.
