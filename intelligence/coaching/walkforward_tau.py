"""Walk-forward tau. Fit on seasons before the eval season. Do not replace the served table here."""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from coaching.coach_risk import TauFitter, load_fourth_downs

DATA = os.path.join(ROOT, "coaching", "data")
paths = [os.path.join(DATA, f"play_by_play_{y}.parquet") for y in (2022, 2023, 2024, 2025)]
fd = load_fourth_downs(paths)
results = []
for eval_year in (2023, 2024, 2025):
    train_years = [y for y in (2022, 2023, 2024, 2025) if y < eval_year]
    fitter = TauFitter(fd[fd.season.isin(train_years)])
    fitter.fit(seasons=train_years)
    ev = fd[fd.season == eval_year]
    g = fitter.hamming_gate(ev)
    results.append({"eval_year": eval_year, "train": train_years, "n": int(g["n"]), "delta_pp": round(float(g["delta_pp"]), 4), "pass": bool(g["pass"])})
    print(results[-1])
out = os.path.join(ROOT, "reasoning_engine", "traces", "tau-walkforward.json")
json.dump({"protocol": "fit seasons < eval year, hamming on that year, opponent half", "results": results, "served_table_replaced": False}, open(out, "w"), indent=2)
print("wrote", out)
