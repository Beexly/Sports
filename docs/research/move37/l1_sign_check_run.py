"""Independent L1 sign verification (attempt 2, 2026-09-14).

Joins nflverse ftn_charting play-action labels (is_play_action) to the local
pbp parquet on (game_id, play_id), then computes the diff-in-diff sign check:
REG season, pass attempts, outdoor games with weather,
ColdWindy = temp <= 40 OR wind >= 15.
"""
import polars as pl

SNAP = "data_snapshot_20260913"
SEASONS = [2022, 2023, 2024, 2025]

frames = []
join_stats = []
for s in SEASONS:
    pbp = pl.read_parquet(
        f"{SNAP}/pbp_{s}.parquet",
        columns=["season", "season_type", "week", "game_id", "play_id",
                 "pass_attempt", "complete_pass", "roof", "temp", "wind"],
    )
    chart = pl.read_parquet(f"ftn_charting_{s}.parquet").select(
        pl.col("nflverse_game_id").alias("game_id"),
        pl.col("nflverse_play_id").cast(pl.Int64).alias("play_id"),
        pl.col("is_play_action"),
    )
    base = (
        pbp.filter(
            (pl.col("season_type") == "REG")
            & (pl.col("pass_attempt") == 1)
            & (pl.col("roof").is_in(["outdoors", "open"]))
            & pl.col("temp").is_not_null()
            & pl.col("wind").is_not_null()
        )
        .with_columns(pl.col("play_id").cast(pl.Int64))
    )
    n_base = base.height
    joined = base.join(chart, on=["game_id", "play_id"], how="inner")
    n_join = joined.height
    join_stats.append((s, n_base, n_join, n_join / n_base if n_base else 0.0))
    frames.append(joined)

df = pl.concat(frames)
df = df.with_columns(
    ((pl.col("temp") <= 40) | (pl.col("wind") >= 15)).alias("coldwindi")
)

print("=== JOIN RATES (attempts matched to charting per season) ===")
for s, nb, nj, r in join_stats:
    print(f"{s}: base={nb} joined={nj} rate={r:.4f}")
print(f"TOTAL: base={sum(b for _, b, _, _ in join_stats)} "
      f"joined={sum(j for _, _, j, _ in join_stats)}")

print("\n=== ANALYSIS FRAME ===")
print(f"n={df.height}")
print(f"ColdWindy={df['coldwindi'].sum()}  PA={df['is_play_action'].sum()}")

cells = (
    df.group_by(["is_play_action", "coldwindi"])
    .agg(n=pl.len(), comp_rate=pl.col("complete_pass").mean())
    .sort(["coldwindi", "is_play_action"])
)
print("\n=== CELL COMPLETION RATES ===")
print(cells)

d = {(r["is_play_action"], r["coldwindi"]): (r["n"], r["comp_rate"])
     for r in cells.iter_rows(named=True)}
n_pa_cw, r_pa_cw = d[(True, True)]
n_np_cw, r_np_cw = d[(False, True)]
n_pa_nt, r_pa_nt = d[(True, False)]
n_np_nt, r_np_nt = d[(False, False)]

effect_cw = r_pa_cw - r_np_cw          # PA effect in cold/windy
effect_nt = r_pa_nt - r_np_nt          # PA effect in neutral
did = effect_cw - effect_nt            # diff-in-diff

print("\n=== DIFF-IN-DIFF ===")
print(f"PA/ColdWindy:     n={n_pa_cw:6d}  comp={r_pa_cw:.4f}")
print(f"nonPA/ColdWindy:  n={n_np_cw:6d}  comp={r_np_cw:.4f}")
print(f"PA/neutral:       n={n_pa_nt:6d}  comp={r_pa_nt:.4f}")
print(f"nonPA/neutral:    n={n_np_nt:6d}  comp={r_np_nt:.4f}")
print(f"PA effect in ColdWindy: {effect_cw:+.4f}")
print(f"PA effect in neutral:   {effect_nt:+.4f}")
print(f"Diff-in-diff (ColdWindy x PA interaction, linear): {did:+.4f}")

# Cheap logit: complete_pass ~ coldwindi + pa + coldwindi*pa (+ down? keep minimal)
import numpy as np
X = np.column_stack([
    np.ones(df.height),
    df["coldwindi"].to_numpy().astype(float),
    df["is_play_action"].to_numpy().astype(float),
    (df["coldwindi"].to_numpy() & df["is_play_action"].to_numpy()).astype(float),
])
y = df["complete_pass"].to_numpy().astype(float)
beta = np.zeros(4)
for _ in range(100):
    p = 1 / (1 + np.exp(-X @ beta))
    p = np.clip(p, 1e-8, 1 - 1e-8)
    W = p * (1 - p)
    grad = X.T @ (y - p)
    H = -(X * W[:, None]).T @ X
    step = np.linalg.solve(H, grad)
    beta -= step
    if np.max(np.abs(step)) < 1e-10:
        break
se = np.sqrt(np.diag(np.linalg.inv(-H)))
print("\n=== LOGIT (complete ~ cw + pa + cw*pa) ===")
for name, b, s_ in zip(["const", "cw", "pa", "cw*pa"], beta, se):
    print(f"{name:6s}  coef={b:+.4f}  se={s_:.4f}  z={b/s_:+.2f}")
print(f"\nInteraction coef sign: {'POSITIVE' if beta[3] > 0 else 'NEGATIVE'} "
      f"({beta[3]:+.4f}) — Minis reported c=+0.082, pre-reg was c<0")
