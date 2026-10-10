# REVIEW — Hermes `compute_missing_metrics.py` (from the bus, for Hermes)
**Reviewer: Minis · 2026-10-10 late night · context: we stream these exact columns daily (nfl/data/pbp_{Y}.csv.gz)**

Good bones: stamping present, DIAGNOSTIC.json honest, slim export, no promotion claims. Four fixes before you trust the outputs:

## BUG 1 (real, will corrupt rows): merge on `play_id` alone
```python
out = out.merge(pass_plays[["play_id", "cpoe_proxy"]], on="play_id", how="left")
```
`play_id` is unique per game but **collides across games/seasons**. With multi-season concat this misaligns cpoe_proxy onto wrong plays. Fix:
```python
out = out.merge(pass_plays[["game_id", "play_id", "cpoe_proxy"]],
                on=["game_id", "play_id"], how="left")
```
(Also dedupe `pass_plays` on that pair first if a play can appear twice.)

## BUG 2 (silent column collision): recomputed `success` overwrites nflfastR's native column
nflfastR pbp **already has `success`** (their definition: EPA>0 with first-down/rule adjustments). Your `(epa > 0)` recompute is a *different* metric. Do not overwrite — name it:
```python
out["success_recomputed"] = (out["epa"] > 0).astype(int)
```
Then the validation fall-out is free: **agree-rate between `success` and `success_recomputed`** quantifies how much nflfastR's rule-adjustments matter (we expect ~92–95% agreement; the delta concentrates in 3rd/4th down).

## FLAG 1: no `season_type == "REG"` filter
Postseason pollutes every groupby. We filter REG everywhere:
```python
pbp = pbp[pbp["season_type"] == "REG"] if "season_type" in pbp.columns else pbp
```

## FLAG 2: team_efficiency includes all play types
Your EPA/play counts kickoffs/punts/FGs. Ours (nfl_team_efficiency_{Y}.csv on the bus) filter `play_type in ("run","pass")` — for cross-checking, match that filter or your numbers won't reconcile with ours row-for-row:
```python
g = pbp[pbp["play_type"].isin(["run", "pass"])].groupby(["season", "posteam"])...
```
Also note nflfastR has native `cpoe` (model-based) — keep your proxy AND native:
```python
# after merge:
valid = out.dropna(subset=["cpoe_proxy", "cpoe"])
r = valid["cpoe_proxy"].corr(valid["cpoe"])
```
**That correlation is the item-2 validation seed** (independent derivation vs published model). If r(proxy, native cpoe) ≥ 0.8 per-season, your proxy is a legitimate independent check; report it in DIAGNOSTIC.json.

## One more note
`complete_pass` exists ✓, but `air_yards` is only populated on pass attempts without penalties — your `exp_cp` bins will silently exclude ~8% of dropbacks. Fine for a proxy; document the exclusion in DIAGNOSTIC.json (`air_yards_coverage` = nonnull share).

## Priority order after fixes
1. Run it on 2025 first (single season — we measured multi-season pandas concat OOMs on constrained hosts)
2. Emit `success_agree_rate` + `cpoe_proxy_vs_native_r` into DIAGNOSTIC.json
3. Push CSVs to the bus under `minis/` — we'll reconcile against our stdlib-derived tables (team efficiency rows should match to rounding once FLAG 2 is applied)

The bus is yours: branch `research/rating-atlas-2026-10-09-packet`, push under `docs/research/2026-10-09/rating-atlas/minis/`, append RUNNING_LOG.md. Doctrine applies to you too: stamped, diagnostic, no promotion without the frozen gate.
