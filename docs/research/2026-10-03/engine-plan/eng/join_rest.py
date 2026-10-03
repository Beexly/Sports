"""PIT left-join of already-built intelligence tables onto features_v1.

Run on Beexly only, with the Hermes venv (has pyarrow):
  C:\\Users\\Garrett\\AppData\\Local\\hermes\\hermes-agent\\venv\\Scripts\\python.exe join_rest.py

Does not fit, mint, chart, or walk-forward. Does not read play-by-play.
Does not start join_learn.py. Attaches eng/learn_joined.parquet if it is already there.
tau_hat.csv is NOT joined: intelligence/coaching/data/tau_hat.manifest.json
says point_in_time false ("point fit — not pre-kickoff").
Does not join injuries_2026 or depth_charts_2026.
Does not compute p2s from advstats times_sacked / times_pressured.
Derives under_center_rate on off_tendencies and weekly_tendencies only.
After the home-minus-away diff the identity is the negation of shotgun_rate
(the constant 1 cancels). Ratios, products, and shrinkage are not derived here.
""",
import json
from pathlib import Path

import numpy as np
import pandas as pd

COMPUTE = Path(r"C:\Users\Garrett\_research\ctx-2026-10-03")
FEATURES = COMPUTE / "eng" / "features_v1.parquet"
LEARN_JOINED = COMPUTE / "eng" / "learn_joined.parquet"
OUT = COMPUTE / "eng" / "learn_wide.parquet"
COVERAGE = COMPUTE / "eng" / "learn_wide_coverage.json"

WT = Path(r"C:\Users\Garrett\Sports-wt-engineplan")
ALT = Path(r"C:\Users\Garrett\Sports\.worktrees\calib-boundary")
COACH = WT / "intelligence" / "coaching" / "data"

# Two seasons, strictly before kickoff: asof = season*100+week < game key.
# Season aggregates have no week. They are stamped season*100+99 so they
# become visible only after that season (week numbers stay <= 22).
SEASON_END = 99
MAX_SEASON_LAG = 2

TEAM_MAP = {
    "AZ": "ARI", "LAR": "LA", "OAK": "LV", "SD": "LAC",
    "STL": "LA", "JAC": "JAX", "WSH": "WAS",
}

# Cell keys are not features. Pivot them into the column name.
CELL_KEYS = {
    "pass_rate_cells": ["down_group", "ydstogo_bin"],
    "dc_pressure": ["down", "dist_bin"],
    "second_and_short": ["situation"],
    "sequencing": ["down"],
}

# Explicitly not joined.
EXCLUDED = {
    "tau_hat": "point_in_time false in tau_hat.manifest.json; not a pre-kickoff row",
    "schedule": "id table only (season, week, team, opponent); no numeric feature",
    "qb_starts": "post-game actual starter; PIT ids are features h_qb / a_qb only",
    "qb_season": "season rollup; weekly qb_weekly is the PIT grain (via learn_joined or fallback)",
    "trust_targets": "receiver grain, not one row per qb-week",
    "int_cells": "288-cell grid, not one row per qb-week; parent rate for the EB ladder is not a single column",
    "play_by_play_*": "lake pbp is not re-read",
    "depth_charts_2026": "parquet not a season/week tendency table for this join",
    "injuries_2026": "parquet; availability is already on features_v1",
}

BANNED_ATTACH = {"h_qb_act", "a_qb_act"}

# Non-feature columns dropped before the numeric cast.
DROP_NAMES = {
    "team", "qb_id", "name", "qb_name", "coach", "role", "note", "opponent",
    "context_note", "delta_json", "proxy_label", "challenge_note", "fallback",
    "fallback_level", "fit_stamp", "null_reason", "receiver_id", "receiver_name",
    "top_recv_id", "top_recv_name", "starter_name", "starter_qb_id", "region",
    "wp_bin", "situation", "down", "dist_bin", "down_group", "ydstogo_bin",
    "season", "week", "asof", "src_season", "src_week", "game_id",
}


def _norm_team(s: pd.Series) -> pd.Series:
    return s.astype("string").str.strip().replace(TEAM_MAP)


def _cell_token(v) -> str:
    if pd.isna(v):
        return "na"
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    text = str(v).strip()
    if text.endswith(".0"):
        try:
            return str(int(float(text)))
        except ValueError:
            return text
    return text.replace(" ", "")


def _numeric_cols(df: pd.DataFrame) -> list[str]:
    cols = []
    for c in df.columns:
        if c in DROP_NAMES or c in CELL_KEYS.get("_", []):
            continue
        num = pd.to_numeric(df[c], errors="coerce")
        if num.notna().any() and not pd.api.types.is_object_dtype(df[c]):
            # bools are numeric; keep them as 0/1 features
            cols.append(c)
        elif num.notna().sum() >= max(3, int(0.5 * len(df))) and df[c].dtype == object:
            # numeric stored as text
            df[c] = num
            cols.append(c)
    return cols


def _load_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, low_memory=False)
    if "team" in df.columns:
        df["team"] = _norm_team(df["team"])
    if "qb_id" in df.columns:
        df["qb_id"] = df["qb_id"].astype("string")
    if "week" in df.columns:
        df["week"] = pd.to_numeric(df["week"], errors="coerce")
        df = df[df["week"].notna()].copy()
        df["week"] = df["week"].astype(int)
        df["asof"] = df["season"].astype(int) * 100 + df["week"]
    else:
        df["asof"] = df["season"].astype(int) * 100 + SEASON_END
    df["season"] = df["season"].astype(int)
    return df


def _apply_source_floor(name: str, df: pd.DataFrame) -> pd.DataFrame:
    """Null the estimand when the table's own publish floor fails.

    The latest PIT row is still the match. A failed floor does not fall
    through to an older row. Floors below are copied from the table README
    or from c02/c03 buildable-systems, not invented.
    """
    df = df.copy()
    if name == "proe_early_neutral" and "n_plays" in df.columns:
        # coaching/data/README.md: publishable when n_plays >= 25
        bad = pd.to_numeric(df["n_plays"], errors="coerce").fillna(0) < 25
        for c in ("proe", "proe_raw", "proe_se", "pass_rate_actual", "pass_rate_expected"):
            if c in df.columns:
                df.loc[bad, c] = np.nan
    if name == "trust_weekly" and "targets" in df.columns:
        # c02 System 3: min denominator T >= 25 else NULL
        bad = pd.to_numeric(df["targets"], errors="coerce").fillna(0) < 25
        for c in ("hhi", "hhi_lo", "hhi_hi", "n_eff", "top_share", "top2_share", "top_ay_share"):
            if c in df.columns:
                df.loc[bad, c] = np.nan
    if name == "protection_stress" and "null_reason" in df.columns:
        # c02 System 1b: <3 team games NULL; fit pool <32 NULL. The build
        # already writes null_reason (pool<32) and leaves the fit empty.
        bad = df["null_reason"].notna() & df["null_reason"].astype(str).str.strip().ne("")
        if "games" in df.columns:
            bad = bad | (pd.to_numeric(df["games"], errors="coerce").fillna(0) < 3)
        for c in ("stress", "alpha", "beta", "expected_rate", "t_beta"):
            if c in df.columns:
                df.loc[bad, c] = np.nan
    return df


def _collapse(df: pd.DataFrame, name: str, entity: str) -> tuple[pd.DataFrame, list[str]]:
    cell = CELL_KEYS.get(name, [])
    present = [c for c in cell if c in df.columns]
    value_cols = [c for c in _numeric_cols(df) if c not in present and c not in ("asof",)]
    # keep value cols that are not the entity
    value_cols = [c for c in value_cols if c != entity]
    if not present:
        keep = [entity, "season", "asof"] + value_cols
        out = df[keep].copy()
        for c in value_cols:
            out[c] = pd.to_numeric(out[c], errors="coerce")
        out = out.drop_duplicates([entity, "asof"], keep="last")
        return out, value_cols
    df = df.copy()
    df["_cell"] = df[present].apply(lambda r: "|".join(_cell_token(v) for v in r), axis=1)
    idx = [entity, "season", "asof"]
    pieces = []
    new_cols = []
    for c in value_cols:
        wide = df.pivot_table(index=idx, columns="_cell", values=c, aggfunc="first")
        wide.columns = [f"{col}__{c}" for col in wide.columns.astype(str)]
        new_cols.extend(list(wide.columns))
        pieces.append(wide)
    if not pieces:
        out = df[idx].drop_duplicates()
        return out, []
    out = pd.concat(pieces, axis=1).reset_index()
    out = out.drop_duplicates([entity, "asof"], keep="last")
    return out, new_cols


def _asof_side(games: pd.DataFrame, table: pd.DataFrame, entity_col: str, entity: str, num_cols: list[str]) -> pd.DataFrame:
    """Backward as-of, strict: last source row with asof < gk, same entity.

    pandas merge_asof rejected the left key as unsorted (by-group order is
    not a global order). searchsorted on each entity avoids that check.
    """
    g = games[["game_id", "season", "week", "gk", entity_col]].rename(columns={entity_col: entity})
    g[entity] = g[entity].astype("string")
    g["gk"] = pd.to_numeric(g["gk"], errors="coerce")
    t = table.rename(columns={"season": "src_season"}).copy()
    t[entity] = t[entity].astype("string")
    t["asof"] = pd.to_numeric(t["asof"], errors="coerce")
    t = t.dropna(subset=[entity, "asof"])
    t = t.sort_values([entity, "asof"], kind="mergesort")
    m = g.copy()
    for c in num_cols:
        m[c] = np.nan
    m["src_season"] = np.nan
    if t.empty:
        return m
    groups = {k: grp for k, grp in t.groupby(entity, sort=False)}
    asof_idx = []
    for i, row in m.iterrows():
        ent = row[entity]
        gk = row["gk"]
        if pd.isna(ent) or ent == "" or ent == "<NA>" or pd.isna(gk):
            asof_idx.append(-1)
            continue
        grp = groups.get(ent)
        if grp is None:
            asof_idx.append(-1)
            continue
        pos = int(np.searchsorted(grp["asof"].to_numpy(), gk, side="left")) - 1
        asof_idx.append(pos if pos >= 0 else -1)
        if pos >= 0:
            src = grp.iloc[pos]
            m.at[i, "src_season"] = src["src_season"]
            for c in num_cols:
                m.at[i, c] = src[c]
    ok = (
        m["src_season"].notna()
        & ((m["season"] - m["src_season"]) >= 0)
        & ((m["season"] - m["src_season"]) <= MAX_SEASON_LAG)
    )
    m.loc[~ok, num_cols] = np.nan
    return m


def _diff_frame(games: pd.DataFrame, table: pd.DataFrame, name: str, entity: str, home_col: str, away_col: str) -> pd.DataFrame:
    table = _apply_source_floor(name, table)
    collapsed, num_cols = _collapse(table, name, entity)
    if not num_cols:
        return pd.DataFrame({"game_id": games["game_id"]})
    h = _asof_side(games, collapsed, home_col, entity, num_cols)
    a = _asof_side(games, collapsed, away_col, entity, num_cols)
    h = h.set_index("game_id")
    a = a.set_index("game_id")
    # align to games order
    h = h.reindex(games["game_id"].values)
    a = a.reindex(games["game_id"].values)
    out = pd.DataFrame({"game_id": games["game_id"].values})
    for c in num_cols:
        hv = pd.to_numeric(h[c], errors="coerce").to_numpy()
        av = pd.to_numeric(a[c], errors="coerce").to_numpy()
        both = np.isfinite(hv) & np.isfinite(av)
        diff = np.where(both, hv - av, np.nan)
        out[f"{name}__{c}"] = diff
    return out


def _coaching_specs() -> list[tuple[str, str, str, str]]:
    """(file stem, entity column in the csv, home key on features, away key)."""
    team = [
        "adjustments", "coach_defense", "coach_offense", "dc_pressure",
        "def_pressure_weekly", "def_tendencies", "off_tendencies",
        "pass_rate_cells", "proe_early_neutral", "rz_mix", "script_elasticity",
        "second_and_short", "sequencing", "tempo", "timeouts", "weekly_tendencies",
    ]
    return [(n, "team", "home", "away") for n in team]


def _qb_fallback_specs() -> list[tuple[str, str, str, str, Path]]:
    qb_dir = WT / "intelligence" / "qb-behavior" / "data"
    if not (qb_dir / "qb_weekly.csv").exists():
        qb_dir = ALT / "intelligence" / "qb-behavior" / "data"
    return [
        ("qb_weekly", "qb_id", "h_qb", "a_qb", qb_dir / "qb_weekly.csv"),
        ("trust_weekly", "qb_id", "h_qb", "a_qb", qb_dir / "trust_weekly.csv"),
        ("protection_stress", "team", "home", "away", qb_dir / "protection_stress.csv"),
    ]


def _attach_learn_joined(base: pd.DataFrame, notes: dict) -> pd.DataFrame:
    if not LEARN_JOINED.exists():
        notes["learn_joined"] = {"attached": False, "reason": "file missing"}
        return base
    lj = pd.read_parquet(LEARN_JOINED)
    notes["learn_joined"] = {
        "attached": True,
        "rows": int(len(lj)),
        "cols": int(lj.shape[1]),
        "path": str(LEARN_JOINED),
    }
    if "game_id" not in lj.columns:
        notes["learn_joined"]["attached"] = False
        notes["learn_joined"]["reason"] = "no game_id"
        return base
    n_dup = int(lj["game_id"].duplicated().sum())
    if n_dup:
        lj = lj.drop_duplicates("game_id", keep="last")
        notes["learn_joined"]["duplicate_game_ids_dropped"] = n_dup
    banned = [c for c in lj.columns if c in BANNED_ATTACH]
    extra = []
    skipped = []
    for c in lj.columns:
        if c == "game_id" or c in base.columns or c in BANNED_ATTACH:
            continue
        if pd.api.types.is_numeric_dtype(lj[c]):
            extra.append(c)
        else:
            skipped.append(c)
    notes["learn_joined"]["banned_dropped"] = banned
    notes["learn_joined"]["non_numeric_skipped"] = skipped
    notes["learn_joined"]["columns_attached"] = extra
    if not extra:
        return base
    return base.merge(lj[["game_id"] + extra], on="game_id", how="left")


def main() -> None:
    if not FEATURES.exists():
        raise SystemExit(f"features table missing: {FEATURES}")
    base = pd.read_parquet(FEATURES)
    if "game_id" not in base.columns:
        raise SystemExit("features_v1 has no game_id")
    base["season"] = pd.to_numeric(base["season"], errors="coerce").astype("int64")
    base["week"] = pd.to_numeric(base["week"], errors="coerce").astype("int64")
    base["gk"] = base["season"] * 100 + base["week"]
    base["home"] = _norm_team(base["home"])
    base["away"] = _norm_team(base["away"])
    for c in ("h_qb", "a_qb"):
        if c in base.columns:
            base[c] = base[c].astype("string")
    games = base[["game_id", "season", "week", "gk", "home", "away", "h_qb", "a_qb"]].copy()

    notes: dict = {
        "not_scored": True,
        "pit": "asof season*100+week strictly before the game, lag <= 2 seasons; home minus away",
        "qb_ids": "h_qb / a_qb only; h_qb_act and a_qb_act never joined",
        "excluded": EXCLUDED,
        "floors": {
            "proe_early_neutral": "n_plays < 25 nulls proe, proe_raw, proe_se, pass_rate_actual, pass_rate_expected",
            "trust_weekly": "targets < 25 nulls hhi, n_eff, top_share, top2_share, top_ay_share (fallback path only)",
            "protection_stress": "null_reason set or games < 3 nulls stress, alpha, beta, expected_rate (fallback path only)",
            "tau_hat": "not joined",
        },
    }
    wide = _attach_learn_joined(base.drop(columns=["gk"]), notes)
    joined_qb = bool(notes.get("learn_joined", {}).get("attached"))

    pieces = [wide]
    used = []
    missing_files = []
    for stem, entity, home_col, away_col in _coaching_specs():
        path = COACH / f"{stem}.csv"
        if not path.exists():
            missing_files.append(str(path))
            continue
        raw = _load_csv(path)
        part = _diff_frame(games, raw, stem, entity, home_col, away_col)
        pieces.append(part.drop(columns=["game_id"]))
        used.append(stem)
    if not joined_qb:
        for stem, entity, home_col, away_col, path in _qb_fallback_specs():
            if not path.exists():
                missing_files.append(str(path))
                continue
            raw = _load_csv(path)
            if stem == "trust_weekly" and "situation" in raw.columns:
                # one row per qb-week-situation; pivot situation, do not collapse
                CELL_KEYS["trust_weekly"] = ["situation"]
            part = _diff_frame(games, raw, stem, entity, home_col, away_col)
            pieces.append(part.drop(columns=["game_id"]))
            used.append(stem + " (fallback; learn_joined absent)")
    notes["tables_joined"] = used
    notes["missing_files"] = missing_files
    notes["qb_source"] = "learn_joined.parquet" if joined_qb else "qb-behavior csv fallback"

    # pieces[0] carries game_id; later pieces are row-aligned to games
    # _diff_frame returns games order. learn_joined merge preserves base order
    # only if game_id is unique. Reindex via game_id to be safe.
    out = pieces[0]
    for part in pieces[1:]:
        part = part.copy()
        part.index = games.index
        out = pd.concat([out.reset_index(drop=True), part.reset_index(drop=True)], axis=1)

    # c03 M07: under_center_rate = 1 - shotgun_rate.
    # Home-minus-away already happened. The constant cancels:
    # (1-sg_h)-(1-sg_a) = -(sg_h-sg_a). Emit the negation, never 1-diff.
    # A null shotgun diff stays null. Not applied to any other shotgun_rate.
    derived = []
    for stem in ("off_tendencies", "weekly_tendencies"):
        src = f"{stem}__shotgun_rate"
        dst = f"{stem}__under_center_rate"
        if src not in out.columns or dst in out.columns:
            continue
        sg = pd.to_numeric(out[src], errors="coerce").to_numpy(dtype=float)
        out[dst] = np.where(np.isfinite(sg), -sg, np.nan)
        derived.append(dst)
    notes["derived"] = {
        "under_center_rate": derived,
        "formula": "under_center_rate = 1 - shotgun_rate",
        "on_diff": "-(home_shotgun - away_shotgun); the +1 cancels",
        "source": "docs/engine/research/2026-10-02/corpus-deep/deep/c03/buildable-systems.md M07",
    }

    new_cols = [c for c in out.columns if c not in base.columns or c == "gk"]
    new_cols = [c for c in new_cols if c != "gk"]
    coverage = {}
    n = len(out)
    for c in new_cols:
        s = pd.to_numeric(out[c], errors="coerce")
        coverage[c] = round(float(s.notna().mean()), 6) if n else None
    notes["rows"] = int(n)
    notes["cols"] = int(out.shape[1])
    notes["new_columns"] = len(new_cols)
    notes["coverage"] = coverage
    notes["features_rows"] = int(len(base))
    notes["y_non_null"] = int(pd.to_numeric(out["y"], errors="coerce").notna().sum()) if "y" in out.columns else None

    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.to_parquet(OUT, index=False)
    COVERAGE.write_text(json.dumps(notes, indent=2), encoding="utf-8")
    print(f"rows={n} cols={out.shape[1]} new={len(new_cols)} not_scored=true")
    print(f"wrote {OUT}")
    print(f"wrote {COVERAGE}")


if __name__ == "__main__":
    main()
