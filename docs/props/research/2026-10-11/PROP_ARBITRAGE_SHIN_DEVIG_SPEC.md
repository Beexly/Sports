# Prop Discrepancy & Pinnacle Shade Engine — spec and verification

Artifacts
* `intelligence/props/prop_discrepancy_engine.py`
* `intelligence/props/test_prop_discrepancy.py` (42 tests)
* `outbox/props_ev_board_latest.json`, `outbox/props_ev_board_latest.md`
* Bucket: `docs/props/research/2026-10-11/` (props — per `docs/INDEX.md`)

---

## 1. Headline

**The engine produced zero investment-grade props, and that is the finding.**

It scored 21 props and reported 19 at positive EV — and every single one of those
19 is an artifact the engine caught in its own output. The final board is capped
at tier C across the board (19 C, 2 PASS), because **0 of 21 edges stay positive
on the book's own normal basis.**

Two independent warnings fired:

```
[props] side split: UNDER 21 / OVER 0
[props] WARNING 1: a one-sided board is the signature of a modelling artifact,
        not of 21 independent mispricings.
[props] WARNING 2: only 0 of 21 edges stay positive on the book's OWN normal
        basis. The rest are created by the family swap.
```

### The mechanism

The source sheet's `dk_mu`/`dk_sigma` are the parameters of **DraftKings' own
normal distribution** for each stat, and the sheet's `p_over_at_pp` is the
normal-basis P(over) — verified to reproduce exactly (geno smith: sheet 0.475,
recomputed 0.475).

The task asks this engine to map lines to "Lognormal for continuous yards". Doing
that while holding mean and sigma fixed moves the **median below the mean** for
any right-skewed fit, and the books set their lines **at the mean**. So every
skewed row tips UNDER:

| player | stat | line | p(over) lognormal | p(over) book-normal | family-basis EV | normal-basis EV |
|---|---|---|---|---|---|---|
| geno smith | rush_yards | 11.5 | 0.228 | 0.475 | +42.4% | negative |
| daniel jones | pass_yards | 212.5 | 0.408 | 0.474 | +9.3% | negative |

A lognormal matched to (σ=21.44, μ=10.18) — a coefficient of variation of 2.1 —
genuinely does put most of its mass below 11.5. But that is a statement about the
*family swap*, not about PrizePicks mispricing 21 props in the same direction.
Real markets do not offer 21 identical-side edges.

The engine therefore recomputes every bet on the normal basis and refuses to
promote a row whose edge does not survive it. What is left after that test is
nothing, and "nothing" is the correct output.

**A note on the mission's framing.** The task specified lognormal for continuous
yards, and the engine implements it and tests it. But the honest conclusion is
that **a lognormal is the wrong family for this input**, because the input is not
raw yardage data — it is the parameter set of someone else's normal fit. Swapping
the family while holding those two moments is not a better model of the player; it
is a different distribution wearing the same mean.

---

## 2. The de-vig blocker, stated plainly

> "De-vig sharp book lines (Pinnacle two-way lines using multiplicative and Shin
> de-vigging algorithms)."

**Neither input file contains a price.**

`dk_vs_pinnacle_shade_2026-10-10.csv` columns:
`game, dk_sp_h, pin_sp_h, dk_total, pin_total, total_shade` — line **values**
(-7.5, 41.5), no juice, no moneyline, no two-way quote on either side. Example
row: `PHI@JAX, -7.5, -7.5, 41.5, 42.5, -1.0`.

De-vigging removes a bookmaker's margin from a set of **prices**. With no prices
there is no margin and no implied probability to recover. The engine implements
Shin and multiplicative de-vig completely and tests them hard, and **that code is
unexercised on today's data** — reported rather than papered over. The alternative
was to assume a juice, invent two prices from one line, and then present an
invented margin as a measured one.

`test_shade_sheet_confirms_it_carries_lines_and_no_prices` pins the blocker so it
cannot change silently: if a future sheet adds price columns, that test fails,
which is the signal to wire the de-vig path into the board.

What the shade file *can* support is a labelled sensitivity, which is implemented
separately (§5).

---

## 3. Shin de-vig: implementation and benchmarks

`shin_devig(raw)` solves Shin's model for the insider share `z` by bracketed
root-solve on the sum-to-one condition, returning `(fair_probabilities, z)`.

**Closed-form benchmark (the required "within 0.001" anchor).** For a symmetric
two-way book, Shin's equation reduces to

    z² − B·z + (B − 1) = 0

whose roots are `z = 1` and `z = B − 1`. The meaningful root is **z = B − 1**: the
insider share equals the book's overround. For −110/−110, B = 1.047619 so z must
be **0.047619**, and the engine returns exactly that. Verified to 1e-9 across
−110, −105, −120 and −140 books.

**Independent-solver benchmark.** `_independent_shin_solve` re-solves the model by
a 200,000-point grid scan for the first sign change plus a hand-rolled bisection —
no scipy optimiser, no shared code. Agreement within 0.001 across five books
including (−320, +260).

**The two-root trap, worth recording.** The model has two roots for a two-way
book: the meaningful one, and a degenerate `z → 1` root. A naive bisection over
the whole interval converges to the degenerate one — my first "independent"
benchmark did exactly that and reported z = 0.99999 against the engine's correct
0.047619. I nearly changed correct engine code to match a broken test. The
benchmark solver now scans for the **first** crossing, and the reason is documented
in its docstring so the next person does not repeat it.

**Favourite-longshot correction.** Shin moves the favourite up and the longshot
down relative to multiplicative; pinned as a test.

**Fair vs arbitrage books.** A booksum of exactly 1 is a *fair book* — a legitimate
input returning z = 0. Only a booksum **below** 1 (arbitrage) raises.

---

## 4. Breakeven rates: derived, not assumed

Both published constants are reproduced from their payout structure:

| Market | Stated | Derived | Source |
|---|---|---|---|
| 5-flex | 0.542 | **0.542525** | payouts 10x / 2x / 0.4x on 5/5, 4/5, 3/5 |
| 2-pick | 0.571 | **0.571429** | 1.75x total return ⇒ 1/1.75 |

EV is per unit staked, from profit odds `(1−b)/b`: `EV = p·(1−b)/b − (1−p)`. Kelly
is `f* = (p(1+b) − 1)/b`, quartered for staking and clamped at 0.

---

## 5. Line-shade sensitivity (the defensible use of the shade file)

`shade_scenario` rescales a player's expected volume by
`pin_total / dk_total` and recomputes the probability. The ratio is an explicit
modelling coefficient, **not a measurement**, and it is:
* reported beside the primary number, never folded into it;
* pinned by `test_shade_is_reported_beside_ev_and_never_inside_it`, which asserts
  EV is bit-identical with and without shade context.

All 21 props join to a shade game via an explicit `PLAYER_GAME` map (declared so
the join is auditable, not inferred by name matching) with a test asserting no
player is left unjoined.

---

## 6. Defects found and fixed during construction

| # | Defect | Fix |
|---|---|---|
| 1 | **`NegBinFit(var == mean)` raised `ZeroDivisionError`** instead of a typed error | Raises `ValueError` with the moments |
| 2 | **Under-dispersed count stat crashed the board** (sd below √mean has no NB fit) | Falls back to a `PoissonFit` that carries an `underdispersed` flag — degrades honestly, never claims a good fit |
| 3 | **Shin raised on a margin-free book** (+100/+100, booksum exactly 1) | Returns z = 0; raises only for arbitrage (booksum < 1) |
| 4 | **My independent Shin benchmark converged to the degenerate root** | Grid-scan for the first crossing + bisection; engine code was correct and unchanged |
| 5 | Board promoted artifact edges to tier A | Tier gate now requires the edge to survive the normal basis (this is why the final board is all-C) |

Defect 5 is the one that matters: without it this engine would have reported 19
actionable props. It was caught by reading the output for a one-sided pattern, not
by a test, which is why the warnings are now printed on every run.

---

## 7. Verification

```
python -m pytest intelligence/props/test_prop_discrepancy.py -o pythonpath=.
→ 42 passed, exit 0

python intelligence/props/prop_discrepancy_engine.py
→ exit 0; 21 props scored; tiers {'C': 19, 'PASS': 2}; 0 edges survive the normal basis
```

Required tests present and passing: Shin benchmark within 0.001 (against both the
closed form and the independent solver), and negative-binomial CDF against Poisson
(in the equi-dispersed limit, against direct summation, and the fatter-tail
property).

Coverage also includes: implied-probability round trips, de-vig normalisation,
favourite-longshot direction, NB moments, underdispersion rejection, lognormal
moment reproduction, monotonicity in the line, the normal-vs-lognormal right-tail
divergence, zero-mass-below-zero, EV zero exactly at breakeven, EV against
hand-computed payoff arithmetic, Kelly monotonicity and quarter-scaling, tier
gating, real-sheet parsing (21 props / 14 games), rank ordering and JSON
serialisability, side/probability self-consistency, missing-shade handling, and
alt-market breakeven strictness.

## 8. Known limits

* **The de-vig path is unexercised on real data** — no prices in either sheet.
* **The Pinnacle shade is a sensitivity, not a price.** Nothing here de-vigs a
  sharp book, because the input cannot support it.
* **Every number is model-vs-model.** The board prices PrizePicks lines against
  DraftKings' own fitted moments. That is not a market probability and cannot
  become one without prices.
* **No discrete-count props exist in today's sheet** (all 21 are yardage), so the
  negative binomial is exercised by tests only, not by live rows.
* The `PLAYER_GAME` join is hand-maintained; a roster move silently drops shade
  context (a test asserts the map covers the current sheet, not future ones).
