# Operon

Operon is the C++ symbolic-regression library from HEAL (Burlacu, Kronberger, Kommenda, GECCO 2020). Python is `pyoperon`. It is the accuracy leader on a lot of SRBench black-box sets because it does **nonlinear least squares on the constants** inside every candidate tree, not because it has wiser operators than gplearn.

## What is different from gplearn

gplearn evolves structure and treats constants as another gene. Operon evolves structure, then runs Levenberg–Marquardt (automatic differentiation) on the numeric coefficients. A tree that is almost right gets a fair error. A `sin√min` costume that only worked because the constants were frozen at genetic values gets exposed.

Default symbols: `add,sub,mul,div,constant,variable`. Extra symbols exist (`fmin`, `fmax`, `aq`, `pow`, `abs`, `sin`, `cos`, `tanh`, `exp`, `log`, …). For a Target B rerun, leave trig off.

Default objective is `r2`. Valid single objectives include `r2`, `nmse`, `rmse`, `mse`, `mae`, plus `length` / `mdl` for multi-objective NSGA-II. There is no built-in `LogitMarginLoss`. Drive scored / not scored is still a regression unless you recode the label and accept R² on a 0/1 target, or wrap a custom objective. That is the same class of mistake as MOVE-37 if you ignore it.

## How to point it at Target B

```python
from pyoperon.sklearn import SymbolicRegressor

y = scored.astype(float)          # 0/1, honest only as a ranking check
reg = SymbolicRegressor(
    allowed_symbols="add,sub,mul,fmin,fmax,constant,variable",
    objectives=["r2", "length"],  # NSGA-II front
    population_size=1000,
    generations=200,
    max_length=16,
)
reg.fit(X_train, y_train)
```

Read the Pareto front. Keep the shortest model whose holdout AUC is within epsilon of the best. If that model is an affine function of yardline and ydstogo, Operon agrees with the ablation and nothing new enters the tilt.

## What Operon is for in this repo

A **ceiling check**, not a week-3 signal. It answers: given a fast local-search GP, does any short formula beat the two-feature identity already measured at AUC 0.604? If yes, that formula is a candidate helper. If no, MOVE-37 is closed.

Do not paste an Operon tree into `engine-reading.mjs` because SRBench said Operon wins on average. The holdout on 2024–2025 drives is the only number that matters.
