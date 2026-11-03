"""Coverage shell baseline on BDB 2025 (16,124 plays).

The previous baseline used BDB 2021's 1,028 plays and a tracking file that turned
out to contain 14-15 players per frame, so defence geometry was fiction. This
trains on play-level labels instead: formation, personnel, box count and game
situation, with no player coordinates required. Fewer features, 15.7x the data,
and every input is independently verifiable.

Reports both the fine-grained PFF coverage call and the coarse man/zone family,
plus per-class recall - because the rule-based attempt scored 41-45% on Cover 4/6
and that is exactly the failure a real model has to beat.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent


def load() -> pd.DataFrame:
    plays = pd.read_csv(HERE / "plays.csv", low_memory=False)
    return plays


def pick_cols(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Numeric/categorical context that exists at the snap."""
    cand = [
        "down", "yardsToGo", "defendersInTheBox", "numberOfPassRushers",
        "absoluteYardlineNumber", "quarter", "gameClock", "personnelO",
        "personnelD", "offenseFormation", "receiverAlignment", "dropbackType",
        "passLocationType", "preSnapHomeScore", "preSnapVisitorScore",
        "yardlineNumber", "possessionTeam",
    ]
    cols = [c for c in cand if c in df.columns]
    X = df[cols].copy()

    # gameClock is mm:ss in some files and numeric in others, so convert it
    # unconditionally rather than relying on dtype == object.
    if "gameClock" in X.columns:
        txt = X["gameClock"].astype(str)
        if txt.str.contains(":").any():
            parts = txt.str.split(":", expand=True)
            mins = pd.to_numeric(parts[0], errors="coerce")
            secs = pd.to_numeric(parts[1], errors="coerce")
            X["gameClock"] = mins * 60 + secs
        else:
            X["gameClock"] = pd.to_numeric(X["gameClock"], errors="coerce")

    # pandas "string" dtype is neither object nor category, so test numerically
    # instead of enumerating dtypes. Anything non-numeric becomes a code.
    from pandas.api.types import is_numeric_dtype

    for c in X.columns:
        if not is_numeric_dtype(X[c]):
            X[c] = pd.factorize(X[c].astype(str))[0]
    return X, cols


def train(df: pd.DataFrame) -> dict:
    from sklearn.ensemble import HistGradientBoostingClassifier
    from sklearn.model_selection import GroupKFold
    from sklearn.metrics import accuracy_score, f1_score, confusion_matrix

    X, cols = pick_cols(df)
    groups = df["gameId"].to_numpy() if "gameId" in df.columns else np.arange(len(df))

    out = {"n_plays": int(len(df)), "features": cols}
    for target in ("pff_passCoverage", "pff_passCoverageType"):
        if target not in df.columns:
            continue
        y = df[target].astype("category")
        classes = list(y.cat.categories)
        yc = y.cat.codes.to_numpy()
        keep = yc >= 0
        Xk, yk, gk = X[keep], yc[keep], groups[keep]

        gkf = GroupKFold(n_splits=5)
        preds = np.full(len(yk), -1)
        for tr, te in gkf.split(Xk, yk, groups=gk):
            m = HistGradientBoostingClassifier(max_iter=400, learning_rate=0.08,
                                               max_depth=8, random_state=0)
            m.fit(Xk.iloc[tr], yk[tr])
            preds[te] = m.predict(Xk.iloc[te])

        cm = confusion_matrix(yk, preds, labels=list(range(len(classes))))
        per_class = {}
        for i, c in enumerate(classes):
            tot = cm[i].sum()
            per_class[c] = round(float(cm[i, i] / tot), 3) if tot else None
        out[target] = {
            "n": int(len(yk)),
            "accuracy": round(float(accuracy_score(yk, preds)), 4),
            "macro_f1": round(float(f1_score(yk, preds, average="macro")), 4),
            "majority_baseline": round(float(pd.Series(yk).value_counts(normalize=True).max()), 4),
            "class_counts": {c: int((yk == i).sum()) for i, c in enumerate(classes)},
            "per_class_recall": per_class,
        }
    return out


def main() -> int:
    df = load()
    print(f"plays: {len(df)}")
    for c in ("pff_passCoverage", "pff_passCoverageType"):
        if c in df.columns:
            print(f"\n{c}:\n{df[c].value_counts(dropna=False).head(12).to_string()}")
    res = train(df)
    print("\n=== RESULTS ===")
    print(json.dumps(res, indent=1))
    (HERE / "shell_bdb25_results.json").write_text(json.dumps(res, indent=1), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
