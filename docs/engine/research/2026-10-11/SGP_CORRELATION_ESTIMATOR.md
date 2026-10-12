# Same-game leg correlations: estimated from play-by-play

Artifact: `intelligence/props/sgp_correlation_estimator.py`
Data: `data/snapshots/sgp_correlations.json`
Bucket: `docs/engine/research/2026-10-11/` (the machine)
Run: `python intelligence/props/sgp_correlation_estimator.py` → exit 0

---

## 1. Why this exists

The session audit ranked this as the **single highest-value unstarted build** in
the set, and it was right for a plain reason: `run_monte_carlo.py` prices
same-game parlays through a Gaussian copula, and a copula needs a correlation
matrix. Until now that matrix was **hand-set and labelled ILLUSTRATIVE**, because
nothing in the repo estimated same-game leg dependence from data.

A price calculator whose dependency structure is invented is not a model of a
market. It is arithmetic on a guess. This closes that gap.

## 2. What it measures

nflverse play-by-play (CC-BY 4.0 — the repo's legal foundation for this class of
work), downloaded for 2024 and 2025, aggregated to player-game level, then reduced
to one observation per team-game:

* **primary QB** = the passer with the most passing yards in that team-game (a
  handoff or injury game has two, and the game's production belongs to the leader);
* **leading receiver** = the receiver with the most receiving yards.

Four legs, measured pairwise across **1,088 team-games in 544 games**:

| | qb_pass_yards | qb_pass_tds | wr_rec_yards | wr_anytime_td |
|---|---|---|---|---|
| **qb_pass_yards** | 1.0000 | 0.4977 | **0.6995** | 0.2692 |
| **qb_pass_tds** | 0.4977 | 1.0000 | 0.3716 | 0.4927 |
| **wr_rec_yards** | 0.6995 | 0.3716 | 1.0000 | 0.3251 |
| **wr_anytime_td** | 0.2692 | 0.4927 | 0.3251 | 1.0000 |

Matrix is **PSD** (min eigenvalue 0.260460), so it is usable as-is and needs no
repair — reported, not assumed.

### Reading the numbers

* **QB yards ↔ WR yards = 0.6995** is the strongest pair, and it should be: a
  leading receiver's yardage is largely *made of* the quarterback's yardage. The
  hand-set matrix guessed 0.65 — close, and now measured.
* **QB TDs ↔ WR anytime TD = 0.4927** is the second strongest, for the same
  structural reason (the receiver scores on a pass).
* **WR yards ↔ anytime TD = 0.3251** is the weakest of the touchdown pairs, which
  is right: a receiver can score on a two-yard catch and finish with 20 yards.
* The hand-set matrix guessed **0.52** for WR-yards↔anytime-TD against a measured
  **0.3251** — it overstated that dependence by 60%, and the whole point of
  estimating is that nobody could have known that from intuition.

## 2b. Cross-side legs: the shootout, not the clock

A real same-game parlay mixes legs from **both teams**, so same-side dependence
is only half the story. The estimator reports a second 4×4 **cross-side block**:
entry `[i][j] = corr(own leg i, opposing leg j)`, over the same 1,088 team-games
counted as 2,176 ordered pairs.

| own ↓ / opposing → | qb_pass_yards | qb_pass_tds | wr_rec_yards | wr_anytime_td |
|---|---|---|---|---|
| **qb_pass_yards** | 0.1725 | 0.1729 | 0.1908 | 0.1485 |
| **qb_pass_tds** | 0.1729 | 0.0698 | 0.1423 | 0.0588 |
| **wr_rec_yards** | 0.1908 | 0.1423 | 0.2011 | 0.0945 |
| **wr_anytime_td** | 0.1485 | 0.0588 | 0.0945 | 0.0065 |

**Every cross-side coefficient is positive.** That is the finding, and it runs
against the mechanism one would assume. The intuitive story is *clock
suppression*: if one offence sustains long drives it takes possessions from the
other, so the two sides should trade off and the cross-correlations should be
negative. They are not.

The measured pattern is a **shootout** — the two passing games rise together. The
strongest cross-side pair is own-receiving-yards ↔ opposing-receiving-yards
(0.2011), i.e. **when one team's lead receiver eats, so does the other's.** The
weakest is own-anytime-TD ↔ opposing-anytime-TD (0.0065, essentially zero), which
is also sensible: scoring is discrete and scarce on both sides, so the shootout
does not extend to the end zone.

### Why this matters for pricing

* Cross-side dependence is **real but an order of magnitude smaller** than
  same-side (0.007–0.201 against 0.27–0.70). A cross-team parlay treated as
  independent is a much smaller error than a same-team one — but the error is
  still **positive**, which means an independence-assuming book *understates* the
  joint probability on both sides, and the edge does not cancel.
* **The sign is not something you can guess.** Choosing it by intuition gets it
  backwards. This is the second number in the build that only measurement could
  supply, after WR-yards↔anytime-TD.

### Two bugs caught while building it

Both were silent, and both are pinned by tests now:

1. **Degenerate columns.** The first version supplied only own-QB and opp-WR
   columns, so the block's diagonal compared a series with itself and read
   exactly `1.0000` — indistinguishable from a same-side matrix. Fixed by
   supplying own *and* opposing versions of all four legs; the estimator now
   **flags an exact 1.0 on the cross diagonal as degenerate**, because that can
   only mean the columns are the same series.
2. **A meaningless PSD claim.** An early draft computed `eigvalsh` on the cross
   block. It is symmetric here (the row set contains both orderings of every team
   pair, so `corr(own i, opp j)` and `corr(own j, opp i)` range over the same
   pairs) — but it is a **cross-correlation block, not a correlation matrix**, and
   its diagonal is a real measurement rather than 1. PSD applies to the joint
   matrix assembled from both sides, not to this block alone, and the report says
   so. A non-zero asymmetry would be a *pairing bug*, and the estimator warns on
   that rather than reporting it as a finding.

---

## 3. What it does not do

* **It does not claim these are the correlations a book uses.** Books publish no
  such numbers.
* **No opponent, weather, or game-script adjustment.** These are raw
  co-movements; those are separate features and separate work.
* **No causal claim.** Two legs moving together is a fact about the joint
  distribution, not a mechanism.
* **Regular season only.** Preseason and postseason have different usage patterns,
  and pooling them would put two regimes inside one coefficient.
* **Anytime TD is 0/1**, so its coefficients are **point-biserial** — numerically
  Pearson, but they answer "does the continuous leg separate the scorers", which
  is a different question from a correlation between two continuous legs. Stated
  in the report's own notes, not just here.

## 4. The runner now uses it

`run_monte_carlo.py` reads `sgp_correlations.json` when it exists and prints which
source it used on every run:

```
correlation source: ESTIMATED from nflverse play-by-play — 1088 team-games,
                    seasons [2024, 2025] (sgp_correlations.json)
```

With measured dependence the 4-leg parlay's alpha lift moves from **+343.07%**
(hand-set) to **+293.87%** (estimated). Both are enormous, and both say the same
thing: **the independence error across four positively-correlated legs is the
dominant term**, far larger than any plausible single-leg edge.

The fallback to the illustrative matrix still exists so a fresh checkout runs, but
it is never silently substituted — a present-but-broken artifact prints a warning
and names the fallback rather than being ignored or trusted.

## 5. A column-name trap, recorded

The estimator first crashed with
`ArrowInvalid: No match for FieldRef.Name(passing_tds)`. This nflverse release
carries **`pass_touchdown` and `rush_touchdown` as PER-PLAY BOOLEANS**, not the
aggregate `passing_tds` / `receiving_tds` columns that much of the documentation
implies. Summing the boolean over a player's plays *is* the count.

The script now states this at the point of use, because the failure mode is
silent-looking: anyone who trusted the documented name would get a schema error
and might "fix" it by inventing a column rather than checking what the file
actually contains.

## 6. Verification

```
python intelligence/props/sgp_correlation_estimator.py
    → exit 0, matrix written, PSD confirmed, 1,088 team-games

python -m pytest intelligence/props/ -o pythonpath=.
    → 57 passed, exit 0   (16 new estimator tests + the 41 existing)
```

The new tests cover: Pearson agreement with numpy, exact ±1 on a linear
relationship, refusal on a zero-variance leg (NaN, not 0), the ≥3-point floor, the
point-biserial identity, hand-computed aggregation sums, anytime-TD zeroing,
leading-QB/leading-receiver selection including a two-QB handoff game, matrix
symmetry and unit diagonal, PSD reporting, the missing-season note, and one
**directional sanity check**: QB-yards↔WR-yards must come back clearly positive,
because if that pair ever reads negative or near zero the *aggregation* is wrong,
not the NFL.

Cross-side coverage adds three: both orderings of every team pair are formed and
no team is ever paired with itself; the cross diagonal is **measured and not
forced to 1** (this is the degeneracy bug, pinned); and the block is symmetric
**because the pairing makes it so**, so a failure there is a pairing bug rather
than a finding.

One test failed on first run and it was mine, not the code's: a fixture whose rows
implied one touchdown while its own docstring claimed two. The code summed
correctly; the expectation was wrong. Fixed the fixture to match its stated intent.

## 7. What is still open

1. **Opponent adjustment.** These are raw co-movements. A correlation conditional
   on the opponent's pass defense is a different and more useful object.
2. **Positional generality.** Only the QB→leading-WR pair is estimated. RB
   receiving, TE legs, and QB rushing are unmeasured.
3. **Time stability.** The matrix pools two seasons. Whether these coefficients are
   stable week to week, or drift with personnel, is untested.
4. **No SGP price is ingested anywhere**, so the alpha still measures the
   *independence error* rather than a real book's mispricing.
5. **The joint 8×8 block is not assembled.** The same-side and cross-side blocks
   are reported separately and each is honest on its own, but a copula spanning
   both teams needs the joint matrix, and nothing yet checks that the assembled
   object is PSD. That check is the next step before the cross block can be used
   to *price* rather than to *describe*.

**Done since the first pass:** cross-side legs (item 2b above) — the estimator
originally measured only same-team dependence, which is half of what a mixed
same-game parlay contains.
