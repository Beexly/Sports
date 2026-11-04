"""Week 9 dual-slate DraftKings packet builder.

Two slates, two roster structures, one deterministic run:

  * TNF Showdown  — JAX@BAL 11/05/2026  (1 CPT + 5 FLEX, 50k cap, CPT scores 1.5x)
  * Sunday Main   — 11 games 11/08/2026  (QB/2RB/3WR/TE/FLEX/DST, 50k cap)

Inputs are the REAL DraftKings salary exports:
  C:/Users/Garrett/Downloads/DKSalaries (2).csv  (570 rows, 11 games)
  C:/Users/Garrett/Downloads/DKSalaries (3).csv  (104 rows, JAX@BAL showdown)

PROJECTION PROVENANCE — read before trusting any number here:
Projections are anchored to DraftKings' own `AvgPointsPerGame` season average.
Variance is a documented 0.55 * mean sigma, and within-team correlation comes from
a one-factor model. Neither is a fitted forecasting model; the stochastic structure
is what is being modelled. This script emits a RESEARCH ARTIFACT, not a play set:
per GSE publication doctrine nothing here may be surfaced to a customer until it
passes the full 5-stage engine and the snap-by-snap JEV gate.

Both packets are written as JSON (machine) and Markdown (human) so the markdown can
be regenerated from the JSON without re-running the optimizer.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.ops.dfs_stochastic_milp_optimizer import (  # noqa: E402
    GSEFullSlateSimulator,
    build_default_covariance_bonus_matrix,
    optimize_dfs_portfolio,
    select_submodular_marginal_win_portfolio,
    simulate_dirichlet_multinomial_field,
    verify_dk_salaries_slate_identity,
)

DOWNLOADS = Path("C:/Users/Garrett/Downloads")
TNF_SRC = DOWNLOADS / "DKSalaries (3).csv"
MAIN_SRC = DOWNLOADS / "DKSalaries (2).csv"
TNF_DEST = "dk_salaries_week9_tnf_showdown_jax_bal_2026_11_05.csv"
MAIN_DEST = "dk_salaries_week9_main_slate_2026_11_08.csv"

SALARY_CAP = 50000
CLASSIC_SCORABLE = {"QB", "RB", "WR", "TE", "DST"}
SHOWDOWN_SCORABLE = {"QB", "RB", "WR", "TE", "K", "DST"}
SIGMA_FRACTION = 0.55  # documented sigma = 0.55 * mean


# ---------------------------------------------------------------------------
# slate loading
# ---------------------------------------------------------------------------
def _split_game_info(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    gi = d["Game Info"].astype(str)
    d["away"] = gi.str.extract(r"^(\w+)@(\w+)", expand=True)[0]
    d["home"] = gi.str.extract(r"^(\w+)@(\w+)", expand=True)[1]
    d["game_id"] = d["away"] + "@" + d["home"]
    return d


def load_classic_slate(csv_path: str | Path) -> pd.DataFrame:
    """Normalize a DraftKings Classic export into optimizer columns."""
    raw = pd.read_csv(csv_path)
    raw = _split_game_info(raw)
    raw = raw[raw["Position"].isin(CLASSIC_SCORABLE)].copy()
    raw["Salary"] = pd.to_numeric(raw["Salary"], errors="coerce")
    raw["AvgPointsPerGame"] = pd.to_numeric(raw["AvgPointsPerGame"], errors="coerce").fillna(0.0)
    raw = raw[(raw["Salary"].fillna(0) >= 2000) & (raw["Salary"].fillna(0) <= SALARY_CAP)]
    raw = raw.drop_duplicates(subset=["ID"])
    if "Status" in raw.columns:
        raw = raw[raw["Status"].fillna("").astype(str).str.upper() != "O"]
    raw["opponent"] = np.where(
        raw["TeamAbbrev"] == raw["away"], raw["home"], raw["away"]
    )
    out = pd.DataFrame({
        "name": raw["Name"].astype(str),
        "position": raw["Position"].astype(str),
        "team": raw["TeamAbbrev"].astype(str),
        "opponent": raw["opponent"].astype(str),
        "game_id": raw["game_id"].astype(str),
        "salary": raw["Salary"].astype(int),
        "projection": raw["AvgPointsPerGame"].astype(float).round(3),
        "role": "",
        "dk_id": raw["ID"].astype(str),
    }).reset_index(drop=True)
    return out


def load_showdown_slate(csv_path: str | Path) -> pd.DataFrame:
    """Normalize a DraftKings Showdown export.

    Showdown exports carry each player twice: once at ``CPT`` (salary already
    1.5x, scoring 1.5x) and once at ``FLEX``. The CPT row is kept as its own
    candidate so the 1.5x multiplier is priced by DraftKings, not re-derived.
    """
    raw = pd.read_csv(csv_path)
    raw = _split_game_info(raw)
    raw = raw[raw["Position"].isin(SHOWDOWN_SCORABLE)].copy()
    raw["Salary"] = pd.to_numeric(raw["Salary"], errors="coerce")
    raw["AvgPointsPerGame"] = pd.to_numeric(raw["AvgPointsPerGame"], errors="coerce").fillna(0.0)
    raw = raw[raw["Salary"].fillna(0) >= 200]
    raw["opponent"] = np.where(
        raw["TeamAbbrev"] == raw["away"], raw["home"], raw["away"]
    )
    out = pd.DataFrame({
        "name": raw["Name"].astype(str),
        "position": raw["Position"].astype(str),
        "roster_slot": raw["Roster Position"].astype(str),
        "team": raw["TeamAbbrev"].astype(str),
        "opponent": raw["opponent"].astype(str),
        "game_id": raw["game_id"].astype(str),
        "salary": raw["Salary"].astype(int),
        "projection": raw["AvgPointsPerGame"].astype(float).round(3),
        "dk_id": raw["ID"].astype(str),
    }).reset_index(drop=True)
    out["slot"] = np.where(out["roster_slot"].str.upper() == "CPT", "CPT", "FLEX")
    return out


# ---------------------------------------------------------------------------
# classic slate packet
# ---------------------------------------------------------------------------
def build_classic_packet(
    csv_path: str | Path,
    lineups: int = 3,
    sims: int = 400,
    opponents: int = 300,
    seed: int = 42,
) -> dict:
    ident = verify_dk_salaries_slate_identity(str(csv_path))
    if not ident.get("is_week9_live_file"):
        raise SystemExit(f"REFUSING: {csv_path} is not a Week 9 slate: {ident}")

    players = load_classic_slate(csv_path)
    games = (
        players.groupby("game_id", as_index=False)
        .agg(away=("team", "first"))
        .assign(wind_mph=0.0)
    )
    sim = GSEFullSlateSimulator(players, games, num_sims=sims, seed=seed, copula_nu=4)
    fpts, _cov = sim.simulate_slate()

    mu = fpts.mean(axis=0)
    sd = fpts.std(axis=0)
    opt_df = players.copy().rename(columns={"name": "player"})
    opt_df["projection"] = mu
    opt_df["sd"] = sd

    bonuses = build_default_covariance_bonus_matrix(opt_df)
    portfolio = optimize_dfs_portfolio(
        opt_df,
        num_lineups=lineups,
        max_overlap=5,
        salary_cap=float(SALARY_CAP),
        min_teams=3,
        require_qb_stack=True,
        require_bring_back=True,
        covariance_bonuses=bonuses,
    )

    name_to_idx = {n: i for i, n in enumerate(players["name"])}
    lineup_scores = np.vstack([
        fpts[:, [name_to_idx[p] for p in lu["player"]]].sum(axis=1) for lu in portfolio
    ])

    field = simulate_dirichlet_multinomial_field(players, num_opponents=opponents, seed=seed)
    opp_totals = field.astype(np.float64) @ mu
    win_threshold = float(np.percentile(opp_totals, 99.0)) if opp_totals.size else 0.0

    sub = select_submodular_marginal_win_portfolio(
        scenario_lineup_scores=lineup_scores.T,
        winning_threshold=win_threshold,
        k_portfolio_size=min(lineups, len(portfolio)),
    )
    win_prob = (lineup_scores > win_threshold).mean(axis=1)
    best_i = int(np.argmax(win_prob))

    return {
        "slate_name": "week9_sunday_main_11_game",
        "slate_identity": ident,
        "players_scored": int(len(players)),
        "games": int(players["game_id"].nunique()),
        "sims": int(sims),
        "opponent_rosters": int(opponents),
        "win_threshold_p99": round(win_threshold, 2),
        "portfolio_size": int(len(portfolio)),
        "submodular": {k: v for k, v in sub.items() if isinstance(v, (int, float, str, list))},
        "best_lineup_index": best_i + 1,
        "lineups": [
            {
                "index": i + 1,
                "salary": int(lu["salary"].sum()),
                "proj_sum": round(float(lu["projection"].sum()), 2),
                "win_prob_vs_p99_field": round(float(win_prob[i]), 4),
                "teams": sorted(set(lu["team"].astype(str))),
                "players": lu[["player", "position", "team", "opponent", "salary", "projection"]]
                .round({"projection": 2})
                .to_dict("records"),
            }
            for i, lu in enumerate(portfolio)
        ],
    }


# ---------------------------------------------------------------------------
# showdown slate packet
# ---------------------------------------------------------------------------
def _showdown_roster_ok(lineup: pd.DataFrame, cap: int = SALARY_CAP) -> tuple[bool, str]:
    if len(lineup) != 6:
        return False, f"needs 6 roster slots, got {len(lineup)}"
    if int(lineup["salary"].sum()) > cap:
        return False, f"over cap: {int(lineup['salary'].sum())}"
    if int((lineup["slot"] == "CPT").sum()) != 1:
        return False, "needs exactly 1 CPT"
    if int((lineup["slot"] == "FLEX").sum()) != 5:
        return False, "needs exactly 5 FLEX"
    return True, "ok"


def _greedy_showdown_lineup(cands: pd.DataFrame, cap: int = SALARY_CAP) -> pd.DataFrame | None:
    """Greedy value fill: 1 CPT then 5 FLEX, respecting the cap."""
    cpt_pool = cands[cands["slot"] == "CPT"].sort_values("value_ratio", ascending=False)
    flex_pool = cands[cands["slot"] == "FLEX"].sort_values("value_ratio", ascending=False)
    for _, cpt in cpt_pool.iterrows():
        chosen = [cpt]
        spent = int(cpt["salary"])
        used_names = {str(cpt["name"])}
        for _, flex in flex_pool.iterrows():
            if len(chosen) == 6:
                break
            if str(flex["name"]) in used_names:
                continue
            if spent + int(flex["salary"]) > cap:
                continue
            chosen.append(flex)
            used_names.add(str(flex["name"]))
            spent += int(flex["salary"])
        if len(chosen) == 6:
            return pd.DataFrame(chosen).reset_index(drop=True)
    return None


def _improve_showdown_lineup(
    lineup: pd.DataFrame, cands: pd.DataFrame, cap: int = SALARY_CAP, max_swaps: int = 60
) -> pd.DataFrame:
    """Deterministic single-slot swap hill climb on projected points."""
    best = lineup.copy().reset_index(drop=True)
    best_pts = float(best["projection"].sum())
    flex_pool = cands[cands["slot"] == "FLEX"]
    cpt_pool = cands[cands["slot"] == "CPT"]
    for _ in range(max_swaps):
        improved = False
        for slot in range(len(best)):
            current = best.loc[slot]
            pool = cpt_pool if current["slot"] == "CPT" else flex_pool
            for _, cand in pool.iterrows():
                if str(cand["name"]) in set(best["name"].astype(str)) - {str(current["name"])}:
                    continue
                trial = best.copy()
                trial.loc[slot] = cand
                ok, _why = _showdown_roster_ok(trial, cap)
                if not ok:
                    continue
                pts = float(trial["projection"].sum())
                if pts > best_pts + 1e-9:
                    best, best_pts, improved = trial.reset_index(drop=True), pts, True
                    break
            if improved:
                break
        if not improved:
            break
    return best


def build_showdown_packet(
    csv_path: str | Path,
    lineups: int = 3,
    sims: int = 400,
    opponents: int = 300,
    seed: int = 42,
) -> dict:
    ident = verify_dk_salaries_slate_identity(str(csv_path))
    if not ident.get("is_week9_live_file"):
        raise SystemExit(f"REFUSING: {csv_path} is not a Week 9 slate: {ident}")

    raw = pd.read_csv(csv_path)
    raw = _split_game_info(raw)
    raw = raw[raw["Position"].isin(SHOWDOWN_SCORABLE)].copy()
    raw["Salary"] = pd.to_numeric(raw["Salary"], errors="coerce")
    raw["AvgPointsPerGame"] = pd.to_numeric(raw["AvgPointsPerGame"], errors="coerce").fillna(0.0)
    raw = raw[raw["Salary"].fillna(0) >= 200]

    cands = pd.DataFrame({
        "name": raw["Name"].astype(str),
        "position": raw["Position"].astype(str),
        "slot": np.where(raw["Roster Position"].astype(str).str.upper() == "CPT", "CPT", "FLEX"),
        "team": raw["TeamAbbrev"].astype(str),
        "game_id": raw["game_id"].astype(str),
        "salary": raw["Salary"].astype(int),
        "projection": raw["AvgPointsPerGame"].astype(float).round(3),
    })
    # CPT rows already carry the 1.5x multiplier in both salary and the DK average.
    cands["value_ratio"] = cands["projection"] / cands["salary"].clip(lower=1)
    cands = cands.drop_duplicates(subset=["name", "slot"]).reset_index(drop=True)

    base = _greedy_showdown_lineup(cands)
    if base is None:
        raise SystemExit("no feasible showdown lineup under the cap")

    portfolios: list[pd.DataFrame] = []
    pool = cands.copy()
    for _ in range(lineups):
        lu = _greedy_showdown_lineup(pool)
        if lu is None:
            break
        lu = _improve_showdown_lineup(lu, pool)
        portfolios.append(lu)
        # forbid exact repeats by dropping the CPT used so the next pass differs
        used_cpt = lu[lu["slot"] == "CPT"]["name"].astype(str).iloc[0]
        pool = pool[~((pool["slot"] == "CPT") & (pool["name"].astype(str) == used_cpt))]

    # --- simulation: one-factor within-team correlation, sigma = 0.55 * mean --
    rng = np.random.default_rng(seed)
    names = cands["name"].astype(str).to_numpy()
    proj = cands["projection"].astype(float).to_numpy()
    team = cands["team"].astype(str).to_numpy()
    sigma = np.maximum(proj * SIGMA_FRACTION, 0.5)
    team_factor = {t: rng.standard_normal(sims) for t in np.unique(team)}
    draws = np.empty((sims, len(cands)))
    for i in range(len(cands)):
        common = team_factor[team[i]]
        draws[:, i] = proj[i] + sigma[i] * (0.6 * common + 0.8 * rng.standard_normal(sims))
    draws = np.clip(draws, 0.0, None)

    idx = {n: i for i, n in enumerate(names)}
    lineup_scores = np.vstack([
        draws[:, [idx[str(n)] for n in lu["name"]]].sum(axis=1) for lu in portfolios
    ])

    # field: sample 1 CPT + 5 FLEX per opponent, weighted by salary share, under cap
    cpt_rows = cands[cands["slot"] == "CPT"]
    flex_rows = cands[cands["slot"] == "FLEX"]
    cpt_w = cpt_rows["salary"].to_numpy(float)
    cpt_w = cpt_w / cpt_w.sum()
    flex_w = flex_rows["salary"].to_numpy(float)
    flex_w = flex_w / flex_w.sum()
    opp_totals = np.zeros(opponents)
    for o in range(opponents):
        spent = 0
        chosen_idx: list[int] = []
        order = rng.choice(len(flex_rows), size=min(len(flex_rows), 40), replace=False, p=flex_w)
        ci = int(rng.choice(len(cpt_rows), p=cpt_w))
        spent += int(cpt_rows.iloc[ci]["salary"])
        chosen_idx.append(int(cpt_rows.index[ci]))
        for j in order:
            row = flex_rows.iloc[j]
            if spent + int(row["salary"]) > SALARY_CAP:
                continue
            chosen_idx.append(int(flex_rows.index[j]))
            spent += int(row["salary"])
            if len(chosen_idx) == 6:
                break
        opp_totals[o] = draws[:, chosen_idx].sum(axis=1).mean()
    win_threshold = float(np.percentile(opp_totals, 99.0)) if opp_totals.size else 0.0
    win_prob = (lineup_scores > win_threshold).mean(axis=1)
    best_i = int(np.argmax(win_prob))

    return {
        "slate_name": "week9_tnf_showdown_jax_bal",
        "slate_identity": ident,
        "roster_structure": "1 CPT (1.5x) + 5 FLEX",
        "candidates": int(len(cands)),
        "sims": int(sims),
        "opponent_rosters": int(opponents),
        "win_threshold_p99": round(win_threshold, 2),
        "portfolio_size": int(len(portfolios)),
        "best_lineup_index": best_i + 1,
        "lineups": [
            {
                "index": i + 1,
                "salary": int(lu["salary"].sum()),
                "proj_sum": round(float(lu["projection"].sum()), 2),
                "win_prob_vs_p99_field": round(float(win_prob[i]), 4),
                "teams": sorted(set(lu["team"].astype(str))),
                "players": lu[["name", "position", "slot", "team", "salary", "projection"]]
                .round({"projection": 2})
                .to_dict("records"),
            }
            for i, lu in enumerate(portfolios)
        ],
    }


# ---------------------------------------------------------------------------
# markdown rendering
# ---------------------------------------------------------------------------
def _lineup_table(lineups: list[dict]) -> str:
    lines = ["| # | Salary | Proj | Win prob vs p99 | Teams |", "|---|---|---|---|---|"]
    for lu in lineups:
        lines.append(
            f"| {lu['index']} | ${lu['salary']:,} | {lu['proj_sum']} | "
            f"{lu['win_prob_vs_p99_field']} | {', '.join(lu['teams'])} |"
        )
    return "\n".join(lines)


def _roster_blocks(lineups: list[dict], slot_col: str | None = None) -> str:
    blocks = []
    for lu in lineups:
        head = f"### Lineup {lu['index']} — ${lu['salary']:,} / proj {lu['proj_sum']}"
        rows = ["| Slot | Player | Pos | Team | Salary | Proj |", "|---|---|---|---|---|---|"]
        for p in lu["players"]:
            slot = p.get(slot_col, p.get("position", "")) if slot_col else p.get("position", "")
            name = p.get("player", p.get("name", ""))
            rows.append(
                f"| {slot} | {name} | {p.get('position','')} | {p.get('team','')} | "
                f"${int(p.get('salary',0)):,} | {p.get('projection','')} |"
            )
        blocks.append(head + "\n\n" + "\n".join(rows))
    return "\n\n".join(blocks)


def render_markdown(packet: dict, title: str, source_csv: str, dest_csv: str) -> str:
    lines = [
        f"# {title}",
        "",
        f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        f"**Source salary export:** `{source_csv}`",
        f"**Archived copy:** `data/dfs/{dest_csv}`",
        "",
        "## Slate identity",
        "",
        "```json",
        json.dumps(packet.get("slate_identity", {}), indent=2),
        "```",
        "",
        "## Run parameters",
        "",
        f"- roster structure: {packet.get('roster_structure', 'QB/2RB/3WR/TE/FLEX/DST')}",
        f"- candidates scored: {packet.get('candidates', packet.get('players_scored'))}",
        f"- Monte Carlo sims: {packet.get('sims')}",
        f"- adversarial field rosters: {packet.get('opponent_rosters')}",
        f"- p99 field win threshold: {packet.get('win_threshold_p99')} points",
        f"- portfolio size: {packet.get('portfolio_size')}",
        "",
        "## Portfolio",
        "",
        _lineup_table(packet.get("lineups", [])),
        "",
        "## Rosters",
        "",
        _roster_blocks(packet.get("lineups", []), slot_col="slot" if "slot" in json.dumps(packet) else None),
        "",
        "## Provenance and honesty",
        "",
        "- Projections are anchored to DraftKings' own `AvgPointsPerGame`; the per-position",
        "  decomposition and the 0.55 * mean sigma are documented modelling choices, not a",
        "  fitted forecasting model.",
        "- Win probabilities are measured against a p99 adversarial-field threshold from",
        "  `simulate_dirichlet_multinomial_field` / salary-share field sampling, not against",
        "  the actual contest field.",
        "- RESEARCH ARTIFACT. Not a published play set. Nothing here may be surfaced to a",
        "  customer until it passes the 5-stage engine and the snap-by-snap JEV gate.",
        "",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def build_all(
    out_dir: str | Path = ROOT / "data" / "dfs",
    docs_dir: str | Path = ROOT / "docs" / "dfs" / "research" / "2026-11-03",
    lineups: int = 3,
    sims: int = 400,
    opponents: int = 300,
    seed: int = 42,
    tnf_src: str | Path = TNF_SRC,
    main_src: str | Path = MAIN_SRC,
) -> dict:
    out_dir = Path(out_dir)
    docs_dir = Path(docs_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    docs_dir.mkdir(parents=True, exist_ok=True)

    written: list[str] = []
    for src, dest in ((tnf_src, TNF_DEST), (main_src, MAIN_DEST)):
        src = Path(src)
        if src.exists():
            shutil.copyfile(src, out_dir / dest)
            written.append(str(out_dir / dest))

    classic = build_classic_packet(main_src, lineups=lineups, sims=sims, opponents=opponents, seed=seed)
    showdown = build_showdown_packet(tnf_src, lineups=lineups, sims=sims, opponents=opponents, seed=seed)

    packets = {
        "week9_sunday_main_11_game": classic,
        "week9_tnf_showdown_jax_bal": showdown,
    }
    for name, packet in packets.items():
        jp = out_dir / f"{name}_packet_2026_11_03.json"
        jp.write_text(json.dumps(packet, indent=2), encoding="utf-8")
        written.append(str(jp))

    main_md = docs_dir / "WEEK-9-SUNDAY-MAIN-SLATE-11-GAME-OPTIMIZER-PACKET.md"
    main_md.write_text(
        render_markdown(classic, "Week 9 Sunday Main Slate (11 games) — Optimizer Packet",
                        str(main_src), MAIN_DEST),
        encoding="utf-8",
    )
    written.append(str(main_md))

    tnf_md = docs_dir / "WEEK-9-TNF-SHOWDOWN-JAX-BAL-OPTIMIZER-PACKET.md"
    tnf_md.write_text(
        render_markdown(showdown, "Week 9 TNF Showdown JAX@BAL — Optimizer Packet",
                        str(tnf_src), TNF_DEST),
        encoding="utf-8",
    )
    written.append(str(tnf_md))

    summary = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "classic": {k: v for k, v in classic.items() if k != "lineups"},
        "showdown": {k: v for k, v in showdown.items() if k != "lineups"},
        "files_written": written,
    }
    return summary


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out-dir", default=str(ROOT / "data" / "dfs"))
    ap.add_argument("--docs-dir", default=str(ROOT / "docs" / "dfs" / "research" / "2026-11-03"))
    ap.add_argument("--lineups", type=int, default=3)
    ap.add_argument("--sims", type=int, default=400)
    ap.add_argument("--opponents", type=int, default=300)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--tnf-csv", default=str(TNF_SRC))
    ap.add_argument("--main-csv", default=str(MAIN_SRC))
    args = ap.parse_args(argv)

    summary = build_all(
        out_dir=args.out_dir,
        docs_dir=args.docs_dir,
        lineups=args.lineups,
        sims=args.sims,
        opponents=args.opponents,
        seed=args.seed,
        tnf_src=args.tnf_csv,
        main_src=args.main_csv,
    )
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
