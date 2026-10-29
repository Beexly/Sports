import json
import os
import time
from pathlib import Path

SPORTS_ROOT = Path(r"C:\Users\Garrett\Sports")
NFL_FARM_ROOT = Path(r"C:\Users\Garrett\nfl-farm")
HERMES_ROOT = Path(r"C:\Users\Garrett\.hermes")
OUT_JSON = SPORTS_ROOT / "data" / "engine" / "full_system_telemetry_registry.json"
OUT_MD = SPORTS_ROOT / "docs" / "engine" / "SYSTEM-TELEMETRY-MASTER-MAP.md"


def count_files(base: Path, exts: tuple[str, ...] | None = None) -> tuple[int, list[str]]:
    if not base.exists():
        return 0, []
    matched = []
    for root, dirs, files in os.walk(base):
        dirs[:] = [d for d in dirs if d not in {"node_modules", ".git", ".next", ".turbo", "__pycache__"}]
        for f in files:
            if exts is None or f.lower().endswith(exts):
                rel = Path(root, f).relative_to(base)
                matched.append(str(rel).replace("\\", "/"))
    matched.sort()
    return len(matched), matched


def build_telemetry() -> dict:
    subsystems = [
        {
            "id": "cv_physical_state_estimator",
            "layer": "Layer 1B — Computer Vision & 10Hz Physical State-Estimator",
            "path": "intelligence/vision/",
            "KeyModules": [
                "skeletrack_v2.py (Anisotropic Kalman r_u=0.7, r_v=8.0)",
                "bytetrack_associator.py + kalman_track.py + ball_tracklet.py",
                "pinhole_jacobian.py + osf_torch_field_cv.py + ngs_coordinates.py",
                "ngs_highlight_tracking_loader.py + validate_2026_highlights_all.py",
                "hf_watch_pipeline_app.py + cv_shadow_pipeline.py + roboflow_adapter.py",
                "bdb2027_kinematics.py + falsifier_dryrun.py + falsifier_third_criterion.py",
            ],
            "signalsProduced": [
                "vision.soe_yd (Separation Over Expected, weight 0.085)",
                "vision.pocket_depth_yd (QB Pocket Depth los_x - qb_throw_x, weight 0.065)",
                "vision.art_mean (Angular Rush Threat closing velocity vector, weight 0.075)",
            ],
            "dataCoverage": "W1–W5 committed in *_pre_week6_2026.parquet; W7/W8 raw tracking in tracking_week_7.csv & family_features_week7.parquet -> Extending to *_pre_week8_2026.parquet",
            "status": "WIRED TO NEON (EXTENDING W6–W7 -> PRE-WEEK 8)",
        },
        {
            "id": "ts_cv_tracking_homography",
            "layer": "Layer 1C — Broadcast CV Tracking, Homography & Stabilization",
            "path": "packages/prediction-engine/src/tracking/",
            "KeyModules": [
                "cv-pipeline.ts + cv-homography.ts (Hartley-DLT + RANSAC, 0.0974m RMSE)",
                "pinhole-jacobian.ts + cv-camera-compensation.ts + cv-rotation-deskew.ts",
                "cv-field-landmarks.ts + cv-field-lines.ts + cv-jersey-ocr.ts",
                "cv-movement-primitive.ts + cv-temporal-window-classifier.ts + cv-tracklet-association.ts",
                "kinetic-translation-deficit.ts + sswnp.ts + expected-drive-value.ts",
                "yolo-adapter.ts + yolo-detect.py + stabilize.py",
            ],
            "signalsProduced": [
                "23 continuous tracks (22 players + 1 ball)",
                "Field coordinate projections + Jacobian covariance R_field(u,v)",
                "Kinetic Translation Deficit & Expected Drive Value",
            ],
            "dataCoverage": "79 games, 787 plays, 17,312 tracklets (W1–W5 calibrated; extending W6–W7)",
            "status": "BUILT & VERIFIED",
        },
        {
            "id": "ts_cv_perception_disguise",
            "layer": "Layer 2A — Pre-Snap / Post-Snap Visual Perception & Route Extraction",
            "path": "packages/prediction-engine/src/perception/",
            "KeyModules": [
                "cv-play.ts + cv-play-segmentation.ts",
                "cv-formation-classify.ts + cv-combo-formation-bridge.ts",
                "cv-route-extract.ts + cv-route-combinations.ts",
                "cv-separation-metrics.ts + cv-tendencies.ts",
                "cv-scorebug-ocr.ts + cv-audio-align.ts + cv-field-model.ts",
            ],
            "signalsProduced": [
                "Pre-Snap Formation & Box Defender Count (6/7/8-man box)",
                "Pre-Snap -> Post-Snap Coverage Shell Disguise (e.g., 2-High -> Cover-3 / Zero Blitz)",
                "Route Combination Spacing & Scorebug/Play-Clock Cadence",
            ],
            "dataCoverage": "Active across broadcast replay & highlight frames (nemotron-3.5-super-vl:free + CV pipeline)",
            "status": "BUILT & ACTIVE",
        },
        {
            "id": "ts_film_features_and_vision_factors",
            "layer": "Layer 2B — Film Features, Watch Warehouse & Reasoning Vision Factors",
            "path": "packages/prediction-engine/src/film-features/ + src/reasoning/vision-factors.ts",
            "KeyModules": [
                "film-feature-adapter.ts + player-film-features.ts + team-film-features.ts",
                "route-combo-features.ts + game-script-features.ts + film-priors.ts + film-provenance.ts",
                "shadow/film-shadow-harness.ts (Neon watch.games / watch.frames / watch.tracklets / watch.derived_metrics)",
                "reasoning/vision-factors.ts (Pocket Depth, Pass-Rush Sep, STRAIN sum(1/d^2), Shell Disguise, SOE)",
                "scripts/ops/post_game_film_autopsy.py + apps/web/app/cockpit/film-room/page.tsx",
            ],
            "signalsProduced": [
                "Cumulative Trench STRAIN Surface sum(1/d^2)",
                "5 Spatial Reasoning Covariates injected into Coach Mind",
                "Post-Game Pre-Play Expectation vs Actual Film Autopsies",
            ],
            "dataCoverage": "Neon watch.* store + post-game autopsy JSONs",
            "status": "WIRED TO COACH MIND",
        },
        {
            "id": "nfl_farm_and_x_intel",
            "layer": "Layer 1A — NFL Data Farm (nfl-farm) & Hermes 24/7 Competitor/X-Intel Fleet",
            "path": "C:/Users/Garrett/nfl-farm + docs/research/2026-10-28/full-tables/ + .hermes/competitor-intel/",
            "KeyModules": [
                "nfl-farm/extracted_data/ftn_charting_2026.parquet (15,904 plays, W1–W6 -> pulling W7)",
                "nfl-farm/extracted_data/roster_weekly_2026.parquet (17,602 rows, W1–W7)",
                "nfl-farm/universal_intel.db + knowledge_graph.json + endpoints.jsonl + equations.py",
                "docs/research/2026-10-28/full-tables/*.csv (55 verbatim Week 7 / Weeks 1–7 tables incl. CAR @ GB TNF)",
                ".hermes/competitor-intel/MASTER_MATRIX.md (16 Competitor Engines + 86 Domains + queue.json)",
            ],
            "signalsProduced": [
                "Weeks 1–7 Coverage Shell Usage (fball-insights-defensive-coverage-usage-week7/weeks1-7-2026.csv)",
                "Weekly Trench Pressure & Clean/Pressured EPA Splits (sfdata9ers + sumersports CSVs)",
                "Red-Zone Route Win Rate, TPRR, YPRR & RB xFP (kylem + jagibbs + startsitemff CSVs)",
                "CAR @ GB TNF Simulated Box Score & TD Probabilities (courseiq-simulated-box-score-car-gb-tnf-2026.csv)",
            ],
            "dataCoverage": "55 Week 7 CSVs + W1–W7 Rosters on disk; pulling W7 FTN + W1–W7 PBP/Snaps + 9 Partial SumerSports Vision Charts",
            "status": "ACTIVE (HERMES CYCLE 0/1 EXPANDING)",
        },
        {
            "id": "quad_engine_and_coach_simulator",
            "layer": "Layer 2C & Layer 3 — 3,742-Node Quad-Engine, N_eff Load Scaling & 10,000-Run Simulator",
            "path": "data/engine/quad_engine_crosswalk_registry.json + scripts/ops/ + apps/web/lib/writeups/",
            "KeyModules": [
                "autonomous_quad_engine_harvester.py (2,577 arXiv + 761 OpenAlex + 182 Kaggle + 84 HF + 277 DOCX = 3,742 nodes)",
                "scripts/ops/scheme_effects.py + load_scaling.py (N_eff = 1/HHI) + gse_injury_overlay_v2.py",
                "scripts/ops/market_implied_kernel.py + run_weekly_cadence_tick.py",
                "scripts/ops/generate_slate_writeups.py + apps/web/lib/writeups/coach-writeup-engine.ts",
            ],
            "signalsProduced": [
                "Independent Coach+Vision Fair Spread, Total, Prop Quantiles, Correlated SGP (Sigma_game), and DFS 9-Man Lineups",
                "Compared LAST against live ESPN/market lines (publish ONLY when decision === 'PLAY' & expectedClv > 0; Conf XX/100)",
            ],
            "dataCoverage": "Live 2026 Week 8 ESPN Slate (CAR @ GB TNF + 13 Sunday/MNF games)",
            "status": "REWIRING STALE STUB -> LIVE W8 ESPN + W1–W7 KINEMATICS",
        },
    ]

    dataset_horizons = [
        {
            "dataset": "ESPN Live 2026 Week 8 Scoreboard & Odds",
            "location": "site.api.espn.com (14 games: CAR@GB TNF, BAL@BUF, MIN@DET, KC@DEN, PHI@WSH SNF, CHI@SEA MNF)",
            "currentHorizon": "2026 Week 8 LIVE",
            "consumer": "generate_slate_writeups.py + coach-writeup-engine.ts",
            "status": "LIVE (Rewiring writeup generator off 2024 stub)",
        },
        {
            "dataset": "Physical State-Estimator Kinematics (soe_yd, art_mean, pocket_depth_yd)",
            "location": "intelligence/vision/data/*_pre_week6_2026.parquet + tracking_week_7.csv + family_features_week7.parquet",
            "currentHorizon": "W1–W5 compiled; W7 raw on disk",
            "consumer": "skeletrack_v2.py -> vision-factors.ts -> Neon signals/game_signals",
            "status": "EXTENDING W6–W7 -> *_pre_week8_2026.parquet",
        },
        {
            "dataset": "55 Week 7 / Weeks 1–7 X-Intel Verbatim Tables",
            "location": "docs/research/2026-10-28/full-tables/*.csv (incl. courseiq-simulated-box-score-car-gb-tnf-2026.csv)",
            "locationCount": 55,
            "currentHorizon": "2026 Weeks 1–7 & Week 7",
            "consumer": "build_w1_w7_usage_route_trench_trends.py -> coach-writeup-engine.ts",
            "status": "ON DISK (Wiring into W8 writeups + resolving 9 PARTIAL charts w/ Nemotron VL)",
        },
        {
            "dataset": "FTN Play-Action, Motion, Hash & Box Charting",
            "location": "C:/Users/Garrett/nfl-farm/extracted_data/ftn_charting_2026.parquet (15,904 rows)",
            "currentHorizon": "2026 Weeks 1–6",
            "consumer": "scheme_effects.py + build_w1_w7_usage_route_trench_trends.py",
            "status": "PULLING WEEK 7 DELTA",
        },
        {
            "dataset": "Weekly NFL Rosters & Depth Charts",
            "location": "C:/Users/Garrett/nfl-farm/extracted_data/roster_weekly_2026.parquet (17,602 rows)",
            "currentHorizon": "2026 Weeks 1–7",
            "consumer": "gse_injury_overlay_v2.py + load_scaling.py",
            "status": "COMPLETE THROUGH W7",
        },
        {
            "dataset": "2026 Weeks 1–7 Play-by-Play, Snap Counts & NGS Game Logs",
            "location": "C:/Users/Garrett/nfl-farm/extracted_data/ (play_by_play_2026, snap_counts_2026, player_stats_2026)",
            "currentHorizon": "Pulling W1–W7 full parquet release",
            "consumer": "nfl_2026_w1_w7_trends_and_usage.json -> 10,000-run simulator",
            "status": "HERMES CYCLE 0 PRIORITY #1",
        },
    ]

    payload = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "subsystems": subsystems,
        "datasetHorizons": dataset_horizons,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")

    md_lines = [
        "# GSE MASTER SYSTEM, CV/KINEMATICS & DATASET TELEMETRY MAP",
        "",
        f"- **Generated:** `{payload['generatedAt']}`",
        "- **Purpose:** Single source of truth for every vision, tracking, perception, film-feature, data-farm, simulation, and commercial subsystem so nothing is ever lost or overlooked.",
        "",
        "## 1. Full Subsystem & Codebase Inventory",
        "",
        "| Subsystem / Layer | Repo Path | Key Modules & Equations | Signals Produced | Data Coverage & Status |",
        "|---|---|---|---|---|",
    ]
    for s in subsystems:
        mods = "<br>".join(f"`{m}`" for m in s["KeyModules"])
        sigs = "<br>".join(s["signalsProduced"])
        md_lines.append(
            f"| **{s['layer']}** | `{s['path']}` | {mods} | {sigs} | **{s['status']}** ({s['dataCoverage']}) |"
        )

    md_lines.extend(
        [
            "",
            "## 2. Dataset & Week-Horizon Telemetry",
            "",
            "| Dataset | Location | Current Horizon | Consumer | Status |",
            "|---|---|---|---|---|",
        ]
    )
    for d in dataset_horizons:
        md_lines.append(
            f"| **{d['dataset']}** | `{d['location']}` | `{d['currentHorizon']}` | `{d['consumer']}` | **{d['status']}** |"
        )

    OUT_MD.parent.mkdir(parents=True, exist_ok=True)
    OUT_MD.write_text("\n".join(md_lines) + "\n", encoding="utf-8")
    return payload


if __name__ == "__main__":
    res = build_telemetry()
    print(f"Wrote {OUT_JSON} and {OUT_MD} ({len(res['subsystems'])} subsystems, {len(res['datasetHorizons'])} dataset horizons)")
