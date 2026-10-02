# morelandjs/melo-legacy

**Stars:** 14 | **License:** NONE (no license file) | **Pushed:** 2019-07-31 | **Language:** Python | **Forks:** 0

## 1. Vision
Make Elo predict *margins*, not just winners: a margin-dependent Elo (MELO) system for the NFL that outputs full spread and over/under point distributions, with hyperparameters tuned by Bayesian optimization (skopt). The README points to the living successor (`morelandjs/melo`); this repo is the frozen legacy.

## 2. The Ask
- **Python 2.7** — dead interpreter.
- numpy, scipy, skopt, and **nfldb** (BurntSushi's NFL database, itself long dead) with `nfldb-update` run to refresh game data.
- `./fig/predict make-plots [season] [week]` to regenerate spread/total figures.

## 3. Constraints
- **No license = study-only**, and the "unmaintained" notice redirects to `morelandjs/melo`.
- **Dead stack:** Python 2.7 + nfldb means nothing here runs without a full port. This is a museum piece, not a dependency.
- Pushed 2019-07-31; the method lives on in the successor repo.

## 4. GSE lens
- **The method is the message: Elo as a distribution, not a point.** MELO predicts spread *and* total distributions — the two numbers that actually price against a sportsbook. GSE's prediction path currently aims at projections/rankings with no designed spread/total distribution layer. If GSE ever prices against market lines (props, spreads), it needs distributional outputs, and margin-dependent Elo is the simplest honest way to get them.
- **Bayesian hyperparameter tuning (skopt) on the rating system itself** is a calibration-hygiene pattern GSE's walk-forward work should note: tune the *rating dynamics*, not just the model weights.
- Honest limit: everything about the implementation is dead. The successor repo (`morelandjs/melo`) is where a living version would be evaluated — this dossier covers the legacy because it's what the search surfaced, but the method reference is what matters.
- No gap manufactured: GSE doesn't need MELO's code; it needs the distributional-output habit.

## 5. Verdict
**REBUILD** — study the margin-dependent Elo method (and check the living `morelandjs/melo` successor before implementing); rebuild distributional spread/total outputs as GSE's own. Nothing here is adoptable as code.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/morelandjs/melo-legacy
- gitdiagram: https://gitdiagram.com/morelandjs/melo-legacy
- star-history: https://star-history.com/#morelandjs/melo-legacy (14 stars)
- github.dev: https://github.dev/morelandjs/melo-legacy
