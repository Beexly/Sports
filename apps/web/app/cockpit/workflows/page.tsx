import Link from "next/link";
import { buildIntelligenceGrowthSnapshot } from "@/lib/intelligence/growth-observatory";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";

export const dynamic = "force-dynamic";

const LIVE_APPS = [
  { name: "Live Production Site (galaxysportsedge.com)", url: "https://www.galaxysportsedge.com", path: "https://www.galaxysportsedge.com", status: "PROD" },
  { name: "Local Dev Mirror (5 Revenue Pillars + Paywall)", url: "http://localhost:3000", path: "/", status: "ONLINE" },
  { name: "OnlyFans/WagerTalk Paywall Storefront", url: "https://www.galaxysportsedge.com/packages", path: "/packages", status: "ONLINE" },
  { name: "1. Game Picks Board (Coach Mind First)", url: "https://www.galaxysportsedge.com/picks", path: "/picks", status: "ONLINE" },
  { name: "2. Player Props & N_eff Target Shares", url: "https://www.galaxysportsedge.com/fantasy/props", path: "/fantasy/props", status: "ONLINE" },
  { name: "3. Correlated SGP Matrix (Sigma_game)", url: "https://www.galaxysportsedge.com/sgp-projections", path: "/sgp-projections", status: "ONLINE" },
  { name: "4. DFS 10,000-Sim Writeup & Lineup Dossier", url: "https://www.galaxysportsedge.com/fantasy/dfs", path: "/fantasy/dfs", status: "ONLINE" },
  { name: "5. Cockpit Film Room & 10Hz CV Tracklets", url: "https://www.galaxysportsedge.com/cockpit/film-room", path: "/cockpit/film-room", status: "ONLINE" },
  { name: "Interactive Code & Telemetry Graph (Understand-Anything :5173)", url: "http://127.0.0.1:5173/?token=gse-telemetry-2026", path: "http://127.0.0.1:5173/?token=gse-telemetry-2026", status: "1,315 NODES" },
  { name: "Live Intelligence & Reasoning Observatory", url: "https://www.galaxysportsedge.com/intelligence/observatory", path: "/intelligence/observatory", status: "ONLINE" },
  { name: "Standalone Mind Observatory & Hub (:8788)", url: "http://127.0.0.1:8788/index.html", path: "http://127.0.0.1:8788/index.html", status: "ONLINE" },
  { name: "Telegram VIP Bot (@GalaxySportsEdge_bot)", url: "https://t.me/GalaxySportsEdge_bot", path: "https://t.me/GalaxySportsEdge_bot", status: "GATED VIP" },
];

const AUTONOMOUS_WORKFLOWS = [
  { window: "24/7 Continuous", name: "Hermes Low-Cost/Free-Model Competitor & X-Intel Sweep (16 Engines + 55 Tables + 86 Domains)", script: ".hermes/competitor-intel/MASTER_MATRIX.md + docs/research/2026-10-28/full-tables/*.csv", state: "ACTIVE ($0 QUOTA)" },
  { window: "Cycle 0/1 Continuous", name: "10Hz Physical State-Estimator & CV Kinematics (SkeleTrack v2 + ByteTrack + Hartley-DLT Homography)", script: "python intelligence/vision/skeletrack_v2.py && python intelligence/vision/validate_2026_highlights_all.py", state: "EXTENDING W6–W7 -> PRE-W8" },
  { window: "Cycle 0/1 Continuous", name: "Multimodal Broadcast & Pass/Route Chart Extraction (nvidia/nemotron-3.5-super-vl:free + perception/)", script: "packages/prediction-engine/src/perception/cv-route-extract.ts + cv-formation-classify.ts", state: "ACTIVE ($0 VL)" },
  { window: "Continuous Daily", name: "Priority #1 Quad-Engine Harvester (Kaggle+arXiv+OpenAlex+HF+DOCX -> 3,742 Nodes)", script: "python scripts/ops/autonomous_quad_engine_harvester.py", state: "ACTIVE" },
  { window: "Sun 16:00 CT (4:00 PM)", name: "Post-Game Coach Film & Telemetry Autopsy (SUN_EARLY)", script: "python scripts/ops/post_game_film_autopsy.py --slot SUN_EARLY", state: "ACTIVE" },
  { window: "Sun 19:30 & 22:45 CT", name: "Afternoon & SNF Post-Game Film Autopsies", script: "python scripts/ops/post_game_film_autopsy.py --slot SUN_LATE", state: "ACTIVE" },
  { window: "Thu & Mon 22:45 CT", name: "TNF & MNF Post-Game Film Autopsies", script: "python scripts/ops/post_game_film_autopsy.py --slot TNF", state: "ACTIVE" },
  { window: "Mon–Tue 04:00 CT", name: "Empirical Bayes BTL, Inverse-MDP τ & Counter-Matrix Seal", script: "python scripts/ops/run_weekly_cadence_tick.py --slot TNF --phase MON_TUE_FINE_TUNE_SEAL", state: "ACTIVE" },
  { window: "Tue 04:00 CT", name: "TNF T-48h Early-Morning 10,000-Run Simulation (Out 06:00 CT)", script: "python scripts/ops/run_weekly_cadence_tick.py --slot TNF --phase T_MINUS_48H_EARLY_SIM", state: "ACTIVE" },
  { window: "Fri 04:00 CT", name: "Sunday Slate T-48h Early-Morning 10,000-Run Simulation (Out 06:00 CT)", script: "python scripts/ops/run_weekly_cadence_tick.py --slot SUN_EARLY --phase T_MINUS_48H_EARLY_SIM", state: "ACTIVE" },
  { window: "Sat 04:00 CT", name: "MNF T-48h Early-Morning 10,000-Run Simulation (Out 06:00 CT)", script: "python scripts/ops/run_weekly_cadence_tick.py --slot MNF --phase T_MINUS_48H_EARLY_SIM", state: "ACTIVE" },
  { window: "On Sim Lock (06:00 CT)", name: "Coach Writeup Generator & Gated Telegram/Whop Broadcaster", script: "python scripts/ops/run_telegram_bot_daemon.py", state: "ACTIVE" },
];

const SUBSYSTEM_INVENTORY = [
  {
    layer: "Layer 1B — Computer Vision & 10Hz Physical State-Estimator",
    repoPath: "intelligence/vision/",
    modulesAndEquations:
      "skeletrack_v2.py (Anisotropic Kalman r_u=0.7, r_v=8.0) • bytetrack_associator.py • kalman_track.py • ball_tracklet.py • pinhole_jacobian.py • osf_torch_field_cv.py • ngs_coordinates.py • ngs_highlight_tracking_loader.py • validate_2026_highlights_all.py • hf_watch_pipeline_app.py • cv_shadow_pipeline.py • roboflow_adapter.py • bdb2027_kinematics.py",
    signalsProduced:
      "vision.soe_yd (Separation Over Expected, w=0.085) • vision.pocket_depth_yd (los_x - qb_throw_x, w=0.065) • vision.art_mean (Angular Rush Threat closing vector, w=0.075)",
    horizonAndStatus:
      "WIRED TO NEON — W1–W5 in *_pre_week6_2026.parquet; W7/W8 raw tracking in tracking_week_7.csv & family_features_week7.parquet -> Extending to *_pre_week8_2026.parquet",
  },
  {
    layer: "Layer 1C — Broadcast CV Tracking, Homography & Stabilization",
    repoPath: "packages/prediction-engine/src/tracking/",
    modulesAndEquations:
      "cv-pipeline.ts • cv-homography.ts (Hartley-DLT + RANSAC, 0.0974m RMSE) • pinhole-jacobian.ts • cv-camera-compensation.ts • cv-rotation-deskew.ts • cv-field-landmarks.ts • cv-field-lines.ts • cv-jersey-ocr.ts • cv-movement-primitive.ts • cv-temporal-window-classifier.ts • cv-tracklet-association.ts • kinetic-translation-deficit.ts • sswnp.ts • expected-drive-value.ts • yolo-adapter.ts",
    signalsProduced:
      "23 continuous 10Hz tracks (22 players + 1 ball) • Field coordinate projection + Jacobian covariance R_field(u,v) • Kinetic Translation Deficit & Expected Drive Value",
    horizonAndStatus:
      "BUILT & VERIFIED — 79 games, 787 plays, 17,312 tracklets calibrated (extending W6–W7)",
  },
  {
    layer: "Layer 2A — Pre-Snap / Post-Snap Visual Perception & Route Extraction",
    repoPath: "packages/prediction-engine/src/perception/",
    modulesAndEquations:
      "cv-play.ts • cv-play-segmentation.ts • cv-formation-classify.ts • cv-combo-formation-bridge.ts • cv-route-extract.ts • cv-route-combinations.ts • cv-separation-metrics.ts • cv-tendencies.ts • cv-scorebug-ocr.ts • cv-audio-align.ts • cv-field-model.ts",
    signalsProduced:
      "Pre-Snap Formation & Box Defender Count (6/7/8-man box) • Pre-Snap -> Post-Snap Coverage Shell Disguise (2-High -> Cover-3 / Zero Blitz) • Route Combination Spacing & Play-Clock Cadence",
    horizonAndStatus:
      "BUILT & ACTIVE — Paired with nvidia/nemotron-3.5-super-vl:free for broadcast & chart vision",
  },
  {
    layer: "Layer 2B — Film Features, Watch Warehouse & Spatial Reasoning Factors",
    repoPath: "packages/prediction-engine/src/film-features/ + src/reasoning/vision-factors.ts",
    modulesAndEquations:
      "film-feature-adapter.ts • player-film-features.ts • team-film-features.ts • route-combo-features.ts • game-script-features.ts • film-priors.ts • film-provenance.ts • shadow/film-shadow-harness.ts (Neon watch.*) • reasoning/vision-factors.ts • scripts/ops/post_game_film_autopsy.py",
    signalsProduced:
      "Cumulative Trench STRAIN Surface sum(1/d^2) • 5 Spatial Reasoning Covariates injected into Coach Mind • Post-Game Pre-Play Expectation vs Actual Film Autopsies",
    horizonAndStatus:
      "WIRED TO COACH MIND — Persists to Neon watch.games / watch.frames / watch.tracklets / watch.derived_metrics",
  },
  {
    layer: "Layer 1A — NFL Data Farm (nfl-farm) & Hermes 24/7 X-Intel Fleet",
    repoPath: "C:/Users/Garrett/nfl-farm + docs/research/2026-10-28/full-tables/ + .hermes/competitor-intel/",
    modulesAndEquations:
      "ftn_charting_2026.parquet (15,904 plays) • roster_weekly_2026.parquet (17,602 rows) • universal_intel.db + knowledge_graph.json + equations.py • 55 verbatim Week 7 / Weeks 1–7 X-Intel CSVs (incl. courseiq-simulated-box-score-car-gb-tnf-2026.csv) • 16 Competitor Engine Spines",
    signalsProduced:
      "Weeks 1–7 Coverage Shell Usage (fball_insights) • Trench Pressure & Clean/Pressured EPA (sfdata9ers + sumersports) • Red-Zone Route Win Rate, TPRR, YPRR & RB xFP • CAR @ GB TNF Sim Box Score",
    horizonAndStatus:
      "ACTIVE — 55 Week 7 CSVs + W1–W7 Rosters on disk; Hermes Cycle 0 pulling W7 FTN + W1–W7 PBP/Snaps + 9 Partial SumerSports Charts",
  },
  {
    layer: "Layer 2C & Layer 3 — 3,742-Node Quad-Engine, N_eff & 10,000-Run Simulator",
    repoPath: "data/engine/quad_engine_crosswalk_registry.json + scripts/ops/ + apps/web/lib/writeups/",
    modulesAndEquations:
      "autonomous_quad_engine_harvester.py (2,577 arXiv + 761 OpenAlex + 182 Kaggle + 84 HF + 277 DOCX = 3,742 nodes) • scheme_effects.py • load_scaling.py (N_eff = 1/HHI) • gse_injury_overlay_v2.py • market_implied_kernel.py • generate_slate_writeups.py • coach-writeup-engine.ts",
    signalsProduced:
      "Independent Coach+Vision Fair Spread, Total, Prop Quantiles, Correlated SGP (Sigma_game), and DFS 9-Man Lineups — Compared LAST vs Market (decision === 'PLAY' & expectedClv > 0; Conf XX/100)",
    horizonAndStatus:
      "LIVE — Rewiring generate_slate_writeups.py off 2024 stub onto Live 2026 Week 8 ESPN Slate (CAR @ GB TNF + 13 Sun/MNF games)",
  },
];

const DATASET_HORIZONS = [
  {
    dataset: "ESPN Live 2026 Week 8 Scoreboard & Odds",
    location: "site.api.espn.com (14 games: CAR@GB TNF, BAL@BUF, MIN@DET, KC@DEN, PHI@WSH SNF, CHI@SEA MNF)",
    horizon: "2026 Week 8 LIVE",
    consumer: "generate_slate_writeups.py + coach-writeup-engine.ts",
    status: "LIVE (Replacing stale 2024 stub)",
  },
  {
    dataset: "Physical State-Estimator 10Hz Kinematics (soe_yd, art_mean, pocket_depth_yd)",
    location: "intelligence/vision/data/*_pre_week6_2026.parquet + tracking_week_7.csv + family_features_week7.parquet",
    horizon: "W1–W5 compiled; W7 raw on disk",
    consumer: "skeletrack_v2.py -> vision-factors.ts -> Neon signals/game_signals",
    status: "EXTENDING W6–W7 -> *_pre_week8_2026.parquet",
  },
  {
    dataset: "55 Week 7 / Weeks 1–7 X-Intel Verbatim Tables",
    location: "docs/research/2026-10-28/full-tables/*.csv (incl. courseiq-simulated-box-score-car-gb-tnf-2026.csv)",
    horizon: "2026 Weeks 1–7 & Week 7",
    consumer: "build_w1_w7_usage_route_trench_trends.py -> coach-writeup-engine.ts",
    status: "ON DISK (Wiring into W8 writeups + 9 PARTIAL charts via Nemotron VL)",
  },
  {
    dataset: "FTN Play-Action, Pre-Snap Motion, Hash & Box Charting",
    location: "C:/Users/Garrett/nfl-farm/extracted_data/ftn_charting_2026.parquet (15,904 rows)",
    horizon: "2026 Weeks 1–6",
    consumer: "scheme_effects.py + build_w1_w7_usage_route_trench_trends.py",
    status: "PULLING WEEK 7 DELTA",
  },
  {
    dataset: "Weekly NFL Rosters & Depth Charts",
    location: "C:/Users/Garrett/nfl-farm/extracted_data/roster_weekly_2026.parquet (17,602 rows)",
    horizon: "2026 Weeks 1–7",
    consumer: "gse_injury_overlay_v2.py + load_scaling.py",
    status: "COMPLETE THROUGH W7",
  },
  {
    dataset: "2026 Weeks 1–7 Play-by-Play, Snap Counts & NGS Game Logs",
    location: "C:/Users/Garrett/nfl-farm/extracted_data/ (play_by_play_2026, snap_counts_2026, player_stats_2026)",
    horizon: "Pulling W1–W7 full parquet release",
    consumer: "nfl_2026_w1_w7_trends_and_usage.json -> 10,000-run simulator",
    status: "HERMES CYCLE 0 PRIORITY #1",
  },
];

const ENGINE_PROCESSING_BY_ITEM = [
  {
    item: "1. Game Picks (Sides, Moneylines & Totals)",
    route: "/picks",
    stage1CoachMind:
      "Coordinator play-call DNA by down/distance/score-state, defensive coverage shell rotations (Cover-0 blitz, Cover-1, Tampa-2, Cover-3, Quarters), 10Hz CV Pocket Depth (los_x - qb_throw_x), Angular Rush Threat (art_mean), Trench STRAIN sum(1/d^2), Tuesday-to-Sunday coach-speak, travel/weather/referee vectors.",
    stage2DataAndMath:
      "3,742 Quad-Engine nodes + Hermes 16 competitor engine spines (538 Elo/QBEL, nfelo offseason priors, nflfastR EPA/WP, nfl4th decision EV, MELO margin tables) + 55 verbatim Week 7/8 X-Intel tables + neutral-script seconds/snap & PROE.",
    stage3Simulation:
      "10,000 play-by-play & drive-by-drive Monte Carlo simulations computing independent win probability, margin distribution, and combined total points.",
    stage4BookLast:
      "Compared LAST against de-vigged sharp market lines. Publishes ONLY when decision === 'PLAY' and expectedClv > 0 (Confidence rendered strictly as XX/100).",
  },
  {
    item: "2. Player Props (Receiving, Rushing, Passing & Usage)",
    route: "/fantasy/props",
    stage1CoachMind:
      "Receiver alignment (slot vs boundary) vs opposing corner/safety shell funnel, 10Hz CV Separation Over Expected (vision.soe_yd), pre-snap motion target boosts, RB goal-line/2-minute snap share, and QB time-to-throw vs blitz rate.",
    stage2DataAndMath:
      "Non-linear Effective Load Scaling (N_eff = 1 / HHI where HHI = sum(s_i^2)) + Injury Cascade v2 redistribution + NGS/SkeleTrack route separation & catch-probability residuals + 55 Hermes X-Intel YPRR/TPRR/air-yard tables.",
    stage3Simulation:
      "10,000 correlated player-stat simulations capturing target, carry, air-yard, and red-zone touch distributions across game scripts.",
    stage4BookLast:
      "Compared LAST against prop lines & Underdog/PrizePicks implied probabilities to isolate tail-volume mispricings.",
  },
  {
    item: "3. Correlated Same-Game Parlays (SGP)",
    route: "/sgp-projections",
    stage1CoachMind:
      "Causal game-script chains: e.g., how an early road favorite passing lead forces the trailing home QB into 42+ dropbacks and elevates opposing WR1 catch-up volume, or how an elite pass rush (high art_mean & STRAIN) pairs with RB1 clock-bleed carries + UNDER.",
    stage2DataAndMath:
      "Gaussian/Student-t copula & within-game covariance matrix (Sigma_game) across 3,742 Quad-Engine equations + SportsProps possession-MC correlation priors.",
    stage3Simulation:
      "Joint probability P(Leg_1 ∩ Leg_2 ∩ Leg_3) measured directly from the 10,000 simulated game worlds rather than independent multiplication.",
    stage4BookLast:
      "Compared LAST against sportsbook SGP pricing (which carries a 15-30% structural hold) to expose positive-EV correlated tickets (e.g., Fair +251 vs Market +345).",
  },
  {
    item: "4. DFS Master Writeups & 20-Max Lineup Construction",
    route: "/fantasy/dfs",
    stage1CoachMind:
      "Full coaching & environment writeup per game: Neutral pace, no-huddle rate, Pass EPA/play, coverage shell funnels, 10Hz CV separation (soe_yd) & trench win rates, and why a game is a 4-man shootout stack vs an RB+DST leverage spot.",
    stage2DataAndMath:
      "N_eff = 1 / HHI target concentration + Injury Cascade v2 + Hermes pydfs-lineup-optimizer / MILP combinatorial constraints + Showdown Captain duplicate-bucket tables.",
    stage3Simulation:
      "Scores EVERY active QB, RB, WR, TE, and DST simultaneously across all 10,000 simulated slate worlds, preserving full team & bring-back covariance.",
    stage4BookLast:
      "Compares LAST against DFS salaries and Dirichlet-Multinomial field ownership (arxiv-2603.24989) to output: (1) 80th-Pct Floor Cash Core, (2) 1.5x Showdown Captain Leverage, and (3) 20-Max GPP Stacks (QB + 2 Pass Catchers + Opposing Bring-Back + Sub-$4.5k Value Filler).",
  },
  {
    item: "5. OnlyFans/WagerTalk In-Place Paywall Vault & Telegram VIP",
    route: "/packages",
    stage1CoachMind:
      "Publishes the Free Pace-of-Play, Neutral Tempo & Coaching Scheme Matchup Teaser above the fold so every visitor sees our football intelligence immediately.",
    stage2DataAndMath:
      "Zero-DOM-Leak Server Redaction (`getRedactedTeasersForWindowSlot` + `verifyPackagePurchase`) ensures locked HTML never contains secret pick sides, prop players, SGP legs, or DFS lineups.",
    stage3Simulation:
      "5 A-La-Carte Packages ($25/$38 TNF, $35/$53 Sunday 5% Card, $29 Sunday DFS 20-Max Pack, $69 Weekend 3-Day, $99 Weekly 7-Day) backed by sealed SHA-256 simulation receipts.",
    stage4BookLast:
      "1-Click Stripe Instant Checkout or inline Receipt/Whop Key unlocks picks in-place on the card AND unlocks `/picks`, `/props`, `/parlays`, and `/dfs` inside `@GalaxySportsEdge_bot`.",
  },
];

export default function CockpitWorkflowsHubPage() {
  const snap = buildIntelligenceGrowthSnapshot();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-sky-400">
              GSE Autonomous Operating System &bull; Coach, CV Kinematics &amp; Reasoning Mind First &bull; Book Last
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              Master Visual Architecture &amp; Telemetry Graph: All Apps, CV/Kinematics, Datasets &amp; Workflows
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {snap.quadEngineCounts.totalCanonicalNodes.toLocaleString()} Canonical Quad-Engine Nodes &bull; 10Hz Physical State-Estimator (SkeleTrack v2 + ByteTrack + Hartley-DLT) &bull; 55 W7 X-Intel CSVs &bull; 10,000-Sim Pipeline
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="http://127.0.0.1:5173/?token=gse-telemetry-2026"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold"
            >
              Interactive 1,315-Node Graph (:5173)
            </a>
            <Link href="/packages" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold">
              Open Paywall Storefront (/packages)
            </Link>
            <Link href="/cockpit/film-room" className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold">
              CV Film Room (/cockpit/film-room)
            </Link>
            <Link href="/fantasy/dfs" className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold">
              DFS 10,000-Sim Writeup (/fantasy/dfs)
            </Link>
            <Link href="/intelligence/observatory" className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold">
              Intelligence Observatory
            </Link>
          </div>
        </header>

        {/* INTERACTIVE SVG VISUAL ARCHITECTURE GRAPH */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                1. End-to-End Visual System, 10Hz Computer Vision &amp; Dataflow Graph (Coach &amp; Vision Mind First &rarr; Book Last)
              </h2>
              <p className="text-xs text-slate-400">
                Complete topology showing how the 10Hz Physical State-Estimator (`intelligence/vision/`), Broadcast CV Tracking (`tracking/`), Visual Perception (`perception/`), Film Features (`film-features/`), `nfl-farm`, and the 3,742-node Quad-Engine feed all 5 gated commercial surfaces.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
              LIVE SYSTEM + CV TELEMETRY TOPOLOGY
            </span>
          </div>

          <div className="overflow-x-auto">
            <svg
              viewBox="0 0 1200 620"
              className="w-full min-w-[960px] h-auto rounded-xl border border-slate-800 bg-slate-950 p-3"
              role="img"
              aria-label="GSE End-to-End Visual Architecture Graph"
            >
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                </marker>
                <marker id="arrowGold" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
                </marker>
                <marker id="arrowGreen" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                </marker>
              </defs>

              {/* Column Headers */}
              <text x="130" y="28" fill="#38bdf8" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                LAYER 1: CV, KINEMATICS &amp; DATA FARM
              </text>
              <text x="415" y="28" fill="#a855f7" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                LAYER 2: PERCEPTION &amp; COACH MIND FIRST
              </text>
              <text x="720" y="28" fill="#f59e0b" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                LAYER 3: 10,000 SIMS &amp; BOOK/SALARY LAST
              </text>
              <text x="1040" y="28" fill="#10b981" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                LAYER 4: LIVE APPS &amp; PAYWALL VAULTS
              </text>

              {/* Layer 1 Boxes */}
              <rect x="20" y="42" width="225" height="106" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
              <text x="30" y="62" fill="#38bdf8" fontSize="11.5" fontWeight="bold">10Hz Physical State-Estimator</text>
              <text x="30" y="78" fill="#cbd5e1" fontSize="9.5">• intelligence/vision/skeletrack_v2.py</text>
              <text x="30" y="92" fill="#cbd5e1" fontSize="9.5">• Anisotropic Kalman (r_u=0.7, r_v=8.0)</text>
              <text x="30" y="106" fill="#cbd5e1" fontSize="9.5">• ByteTrack + Ball Tracklet + Pinhole</text>
              <text x="30" y="120" fill="#cbd5e1" fontSize="9.5">• vision.soe_yd, art_mean, pocket_depth</text>
              <text x="30" y="136" fill="#fbbf24" fontSize="9.5" fontFamily="monospace">W1–W5 built -&gt; Extending W6–W7</text>

              <rect x="20" y="158" width="225" height="102" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
              <text x="30" y="178" fill="#38bdf8" fontSize="11.5" fontWeight="bold">Broadcast CV &amp; Homography</text>
              <text x="30" y="194" fill="#cbd5e1" fontSize="9.5">• src/tracking/cv-homography.ts (DLT)</text>
              <text x="30" y="208" fill="#cbd5e1" fontSize="9.5">• RANSAC 0.0974m RMSE + Deskew</text>
              <text x="30" y="222" fill="#cbd5e1" fontSize="9.5">• 23 continuous tracks (22 + ball)</text>
              <text x="30" y="236" fill="#cbd5e1" fontSize="9.5">• Kinetic Translation Deficit + SSWNP</text>
              <text x="30" y="250" fill="#34d399" fontSize="9.5" fontFamily="monospace">79 games · 787 plays · 17,312 tracks</text>

              <rect x="20" y="270" width="225" height="102" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
              <text x="30" y="290" fill="#38bdf8" fontSize="11.5" fontWeight="bold">nfl-farm &amp; 55 W7 X-Intel CSVs</text>
              <text x="30" y="306" fill="#cbd5e1" fontSize="9.5">• ftn_charting_2026 (15,904 plays)</text>
              <text x="30" y="320" fill="#cbd5e1" fontSize="9.5">• roster_weekly_2026 (17,602 W1–W7)</text>
              <text x="30" y="334" fill="#cbd5e1" fontSize="9.5">• 55 Verbatim W7 / W1–W7 CSV Tables</text>
              <text x="30" y="348" fill="#cbd5e1" fontSize="9.5">• CAR@GB TNF CourseIQ Sim Box Score</text>
              <text x="30" y="362" fill="#34d399" fontSize="9.5" fontFamily="monospace">Pulling W7 FTN + W1–W7 PBP/Snaps</text>

              <rect x="20" y="382" width="225" height="102" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
              <text x="30" y="402" fill="#38bdf8" fontSize="11.5" fontWeight="bold">Priority #1 Quad-Engine Spine</text>
              <text x="30" y="418" fill="#cbd5e1" fontSize="9.5">• 2,577 arXiv + 761 OpenAlex Papers</text>
              <text x="30" y="432" fill="#cbd5e1" fontSize="9.5">• 182 Kaggle + 84 Hugging Face</text>
              <text x="30" y="446" fill="#cbd5e1" fontSize="9.5">• 277 DOCX OMML Equations</text>
              <text x="30" y="460" fill="#cbd5e1" fontSize="9.5">• 16 Competitor Engine Spines</text>
              <text x="30" y="474" fill="#38bdf8" fontSize="9.5" fontFamily="monospace">3,742 Canonical Nodes Wired</text>

              <rect x="20" y="494" width="225" height="102" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
              <text x="30" y="514" fill="#38bdf8" fontSize="11.5" fontWeight="bold">Multimodal Vision &amp; GPU Fleet</text>
              <text x="30" y="530" fill="#cbd5e1" fontSize="9.5">• nvidia/nemotron-3.5-super-vl:free</text>
              <text x="30" y="544" fill="#cbd5e1" fontSize="9.5">• Grok 4.7 + Uncensored DeepSeek 1017</text>
              <text x="30" y="558" fill="#cbd5e1" fontSize="9.5">• Kaggle T4x2 GPU + 30TB GDrive Vault</text>
              <text x="30" y="572" fill="#cbd5e1" fontSize="9.5">• 56.06 GB Free on C:\ (Offloaded)</text>
              <text x="30" y="586" fill="#34d399" fontSize="9.5" fontFamily="monospace">Hermes Gateway PID 20340 ONLINE</text>

              {/* Layer 2 Boxes (Perception & Coach Mind First) */}
              <rect x="295" y="42" width="245" height="132" rx="8" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
              <text x="307" y="64" fill="#c084fc" fontSize="11.5" fontWeight="bold">1. Visual Perception &amp; Film Features</text>
              <text x="307" y="80" fill="#cbd5e1" fontSize="9.5">• src/perception/cv-formation-classify.ts</text>
              <text x="307" y="94" fill="#cbd5e1" fontSize="9.5">• cv-route-extract.ts &amp; route-combinations</text>
              <text x="307" y="108" fill="#cbd5e1" fontSize="9.5">• Pre-Snap -&gt; Post-Snap Shell Disguise</text>
              <text x="307" y="122" fill="#cbd5e1" fontSize="9.5">• Trench STRAIN Surface sum(1 / d^2)</text>
              <text x="307" y="136" fill="#cbd5e1" fontSize="9.5">• Neon watch.games / frames / tracklets</text>
              <text x="307" y="154" fill="#c084fc" fontSize="9.5" fontFamily="monospace">src/reasoning/vision-factors.ts</text>

              <rect x="295" y="186" width="245" height="132" rx="8" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
              <text x="307" y="208" fill="#c084fc" fontSize="11.5" fontWeight="bold">2. Coaching &amp; Scheme Reasoning</text>
              <text x="307" y="224" fill="#cbd5e1" fontSize="9.5">• Play-caller DNA (down/dist/score)</text>
              <text x="307" y="238" fill="#cbd5e1" fontSize="9.5">• Coverage Shell Funnels (Cover-0/1/2/3/4)</text>
              <text x="307" y="252" fill="#cbd5e1" fontSize="9.5">• Blitz Rate vs QB Pressure-to-Sack</text>
              <text x="307" y="266" fill="#cbd5e1" fontSize="9.5">• OL/DL Pass &amp; Run Trench Win Rates</text>
              <text x="307" y="280" fill="#cbd5e1" fontSize="9.5">• Pre-Snap Motion &amp; 11/12/21 Personnel</text>
              <text x="307" y="298" fill="#c084fc" fontSize="9.5" fontFamily="monospace">4-Stage Cognitive Router (3646-&gt;25)</text>

              <rect x="295" y="330" width="245" height="125" rx="8" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
              <text x="307" y="352" fill="#c084fc" fontSize="11.5" fontWeight="bold">3. Pace, N_eff &amp; Injury Cascade v2</text>
              <text x="307" y="368" fill="#cbd5e1" fontSize="9.5">• Neutral-Script Sec/Snap &amp; No-Huddle</text>
              <text x="307" y="382" fill="#cbd5e1" fontSize="9.5">• Pass Rate Over Expectation (PROE)</text>
              <text x="307" y="396" fill="#cbd5e1" fontSize="9.5">• Effective Receivers N_eff = 1 / HHI</text>
              <text x="307" y="410" fill="#cbd5e1" fontSize="9.5">• Non-Linear Target &amp; Touch Scaling</text>
              <text x="307" y="424" fill="#cbd5e1" fontSize="9.5">• OL/CB/WR Injury Redistribution</text>
              <text x="307" y="440" fill="#c084fc" fontSize="9.5" fontFamily="monospace">load_scaling.py + injury_v2.py</text>

              <rect x="295" y="467" width="245" height="128" rx="8" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
              <text x="307" y="489" fill="#c084fc" fontSize="11.5" fontWeight="bold">4. Post-Game Film Autopsy &amp; Context</text>
              <text x="307" y="505" fill="#cbd5e1" fontSize="9.5">• Sun 16:00, 19:30, 22:45 CT + TNF/MNF</text>
              <text x="307" y="519" fill="#cbd5e1" fontSize="9.5">• Pre-Play Expectation vs Observed Snap</text>
              <text x="307" y="533" fill="#cbd5e1" fontSize="9.5">• Tuesday vs Sunday Coach-Speak Audit</text>
              <text x="307" y="547" fill="#cbd5e1" fontSize="9.5">• Mon–Tue Empirical Bayes BTL Seal</text>
              <text x="307" y="563" fill="#c084fc" fontSize="9.5" fontFamily="monospace">post_game_film_autopsy.py</text>

              {/* Layer 3 Boxes (10,000 Sims -> Book Last) */}
              <rect x="595" y="55" width="250" height="230" rx="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
              <text x="608" y="78" fill="#fbbf24" fontSize="12" fontWeight="bold">T-48h 04:00 CT 10,000-Run Sim</text>
              <text x="608" y="96" fill="#fde68a" fontSize="10" fontFamily="monospace">Tue 04:00 (TNF) · Fri 04:00 (Sun) · Sat 04:00 (MNF)</text>
              <text x="608" y="114" fill="#cbd5e1" fontSize="10">• Live 2026 Week 8 ESPN Slate (14 games)</text>
              <text x="608" y="129" fill="#cbd5e1" fontSize="10">• TNF: CAR @ GB (GB -3.5, O/U 47.5)</text>
              <text x="608" y="144" fill="#cbd5e1" fontSize="10">• Simulates every play &amp; drive 10,000x</text>
              <text x="608" y="159" fill="#cbd5e1" fontSize="10">• Scores ALL QBs, RBs, WRs, TEs, DSTs</text>
              <text x="608" y="174" fill="#cbd5e1" fontSize="10">• Preserves within-game covariance (Sigma_game)</text>
              <text x="608" y="189" fill="#cbd5e1" fontSize="10">• Computes independent Fair Spread, Total,</text>
              <text x="608" y="204" fill="#cbd5e1" fontSize="10">  Prop Quantiles, SGP Joint Prob &amp; DFS Ceilings</text>
              <text x="608" y="228" fill="#fbbf24" fontSize="10" fontFamily="monospace">weekly-cadence-orchestrator.ts</text>
              <text x="608" y="246" fill="#34d399" fontSize="10" fontFamily="monospace">Locks &amp; Publishes by 06:00 CT</text>

              <rect x="595" y="310" width="250" height="240" rx="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
              <text x="608" y="333" fill="#fbbf24" fontSize="12" fontWeight="bold">BOOK &amp; SALARY GATE LAST</text>
              <text x="608" y="351" fill="#cbd5e1" fontSize="10">• Compares Independent Football Truth vs:</text>
              <text x="608" y="366" fill="#cbd5e1" fontSize="10">  1. De-vigged Market Spread &amp; Total</text>
              <text x="608" y="381" fill="#cbd5e1" fontSize="10">  2. Player Prop Implied Probabilities</text>
              <text x="608" y="396" fill="#cbd5e1" fontSize="10">  3. Book SGP Hold (15–30% Structural Hole)</text>
              <text x="608" y="411" fill="#cbd5e1" fontSize="10">  4. DFS Salaries &amp; Dirichlet Field Ownership</text>
              <text x="608" y="431" fill="#f87171" fontSize="10" fontWeight="bold">• HARD GATE: Never publish decision=PASS</text>
              <text x="608" y="446" fill="#f87171" fontSize="10" fontWeight="bold">  or expectedClv &lt; 0. Conf strictly XX/100.</text>
              <text x="608" y="468" fill="#34d399" fontSize="10" fontFamily="monospace">coach-writeup-engine.ts</text>
              <text x="608" y="486" fill="#34d399" fontSize="10" fontFamily="monospace">verify-purchase.ts (Zero DOM Leak)</text>

              {/* Layer 4 Boxes (5 Revenue Pillars + Paywall + Telegram + Film Room) */}
              <rect x="905" y="42" width="275" height="75" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
              <text x="918" y="63" fill="#34d399" fontSize="11" fontWeight="bold">Pillar 1: Calibrated Game Picks (/picks)</text>
              <text x="918" y="79" fill="#cbd5e1" fontSize="10">Sides &amp; Totals · XX/100 Conf · +CLV Only</text>
              <text x="918" y="95" fill="#94a3b8" fontSize="9" fontFamily="monospace">galaxysportsedge.com/picks</text>

              <rect x="905" y="128" width="275" height="75" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
              <text x="918" y="149" fill="#34d399" fontSize="11" fontWeight="bold">Pillar 2: Player Props Lab (/fantasy/props)</text>
              <text x="918" y="165" fill="#cbd5e1" fontSize="10">N_eff Target Shares · soe_yd &amp; Trench Edges</text>
              <text x="918" y="181" fill="#94a3b8" fontSize="9" fontFamily="monospace">galaxysportsedge.com/fantasy/props</text>

              <rect x="905" y="214" width="275" height="75" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
              <text x="918" y="235" fill="#34d399" fontSize="11" fontWeight="bold">Pillar 3: Correlated SGPs (/sgp-projections)</text>
              <text x="918" y="251" fill="#cbd5e1" fontSize="10">Joint Sim Prob vs Book Hold (+251 vs +345)</text>
              <text x="918" y="267" fill="#94a3b8" fontSize="9" fontFamily="monospace">galaxysportsedge.com/sgp-projections</text>

              <rect x="905" y="300" width="275" height="82" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
              <text x="918" y="321" fill="#34d399" fontSize="11" fontWeight="bold">Pillar 4: DFS Writeups &amp; Lineups (/fantasy/dfs)</text>
              <text x="918" y="337" fill="#cbd5e1" fontSize="10">Optimizer Retired &rarr; Full Game Writeups, Cash</text>
              <text x="918" y="351" fill="#cbd5e1" fontSize="10">80th-Pct Core, Captain &amp; 20-Max GPP Lineups</text>
              <text x="918" y="367" fill="#94a3b8" fontSize="9" fontFamily="monospace">galaxysportsedge.com/fantasy/dfs</text>

              <rect x="905" y="394" width="275" height="82" rx="8" fill="#0f172a" stroke="#6366f1" strokeWidth="1.5" />
              <text x="918" y="415" fill="#818cf8" fontSize="11" fontWeight="bold">Cockpit Film Room (/cockpit/film-room)</text>
              <text x="918" y="431" fill="#cbd5e1" fontSize="10">10Hz Tracklets, Homography, Shell Disguise,</text>
              <text x="918" y="445" fill="#cbd5e1" fontSize="10">soe_yd, art_mean &amp; Post-Game Film Autopsies</text>
              <text x="918" y="461" fill="#94a3b8" fontSize="9" fontFamily="monospace">galaxysportsedge.com/cockpit/film-room</text>

              <rect x="905" y="488" width="275" height="108" rx="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
              <text x="918" y="509" fill="#fbbf24" fontSize="11" fontWeight="bold">Pillar 5: OnlyFans/WagerTalk Paywall Vault</text>
              <text x="918" y="525" fill="#cbd5e1" fontSize="10">• Free Pace &amp; Scheme Teaser Above Fold</text>
              <text x="918" y="540" fill="#cbd5e1" fontSize="10">• Frosted Vault Unlocks In-Place on Payment</text>
              <text x="918" y="555" fill="#cbd5e1" fontSize="10">• $25/$38 TNF · $35/$53 Sun · $29 DFS · $69/$99</text>
              <text x="918" y="570" fill="#38bdf8" fontSize="10" fontWeight="bold">• @GalaxySportsEdge_bot (/unlock &lt;token&gt;)</text>
              <text x="918" y="586" fill="#94a3b8" fontSize="9" fontFamily="monospace">galaxysportsedge.com/packages</text>

              {/* Connecting Arrows */}
              <line x1="245" y1="95" x2="292" y2="105" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="245" y1="205" x2="292" y2="130" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="245" y1="320" x2="292" y2="250" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="245" y1="320" x2="292" y2="390" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="245" y1="430" x2="292" y2="270" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="245" y1="540" x2="292" y2="520" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />

              <line x1="540" y1="108" x2="592" y2="135" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowGold)" />
              <line x1="540" y1="250" x2="592" y2="165" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowGold)" />
              <line x1="540" y1="390" x2="592" y2="195" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowGold)" />
              <line x1="540" y1="530" x2="592" y2="230" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowGold)" />

              <line x1="720" y1="285" x2="720" y2="306" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#arrowGold)" />

              <line x1="845" y1="350" x2="902" y2="80" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
              <line x1="845" y1="375" x2="902" y2="165" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
              <line x1="845" y1="400" x2="902" y2="250" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
              <line x1="845" y1="425" x2="902" y2="340" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
              <line x1="845" y1="450" x2="902" y2="435" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
              <line x1="845" y1="480" x2="902" y2="540" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrowGreen)" />
            </svg>
          </div>
        </section>

        {/* SECTION 2A: COMPLETE REPO SUBSYSTEM & CODEBASE INVENTORY MATRIX */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                2A. Complete Repo Subsystem, Computer Vision &amp; 10Hz Kinematic Inventory (Nothing Ever Lost)
              </h2>
              <p className="text-xs text-slate-400">
                Canonical registry of every physical state-estimator, broadcast homography, perception, film-feature, data-farm, and simulation module in the codebase (`docs/engine/SYSTEM-TELEMETRY-MASTER-MAP.md`).
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
              6 CORE SUBSYSTEM LAYERS VERIFIED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 font-mono text-[11px] uppercase text-slate-300">
                  <th className="p-3">Subsystem Layer</th>
                  <th className="p-3 text-sky-300">Repo Path</th>
                  <th className="p-3 text-purple-300">Key Modules &amp; Equations</th>
                  <th className="p-3 text-amber-300">Signals &amp; Covariates Produced</th>
                  <th className="p-3 text-emerald-300">Horizon &amp; Wiring Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {SUBSYSTEM_INVENTORY.map((sub) => (
                  <tr key={sub.layer} className="align-top hover:bg-slate-900/90">
                    <td className="p-3 font-semibold text-white">{sub.layer}</td>
                    <td className="p-3 font-mono text-[11px] text-sky-400">{sub.repoPath}</td>
                    <td className="p-3 leading-5">{sub.modulesAndEquations}</td>
                    <td className="p-3 leading-5">{sub.signalsProduced}</td>
                    <td className="p-3 leading-5 font-medium text-emerald-300">{sub.horizonAndStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 2B: LIVE DATASET & WEEK-HORIZON TELEMETRY TABLE */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                2B. Live Dataset &amp; Week-Horizon Telemetry (Weeks 1–7 &amp; Week 8 Status)
              </h2>
              <p className="text-xs text-slate-400">
                Tracks the exact week horizon (`W1–W5` vs `W1–W6` vs `W1–W7` vs `Week 8 Live`) across every dataset on disk so stale data gaps are immediately visible.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              LIVE DATA HORIZON MONITOR
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 font-mono text-[11px] uppercase text-slate-300">
                  <th className="p-3">Dataset</th>
                  <th className="p-3 text-sky-300">Disk / API Location</th>
                  <th className="p-3 text-amber-300">Current Horizon</th>
                  <th className="p-3 text-purple-300">Engine Consumer</th>
                  <th className="p-3 text-emerald-300">Live Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {DATASET_HORIZONS.map((ds) => (
                  <tr key={ds.dataset} className="align-top hover:bg-slate-900/90">
                    <td className="p-3 font-semibold text-white">{ds.dataset}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-300">{ds.location}</td>
                    <td className="p-3 font-mono text-[11px] text-amber-300">{ds.horizon}</td>
                    <td className="p-3 font-mono text-[11px] text-purple-300">{ds.consumer}</td>
                    <td className="p-3 font-semibold text-emerald-300">{ds.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* PER-ITEM ENGINE PROCESSING MATRIX */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-bold text-white mb-1">
            2C. What the Engine Processes for Each Product Item (Coach &amp; Vision Mind First &rarr; Book Last)
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Exact data inputs, 10Hz CV/kinematic signals, equations, simulation mechanics, and final market/salary gates across all 5 commercial surfaces.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 font-mono text-[11px] uppercase text-slate-300">
                  <th className="p-3">Product Surface</th>
                  <th className="p-3 text-purple-300">Stage 1: Coach, CV &amp; Reasoning Mind First</th>
                  <th className="p-3 text-sky-300">Stage 2: Data, Hermes Intel &amp; N_eff Math</th>
                  <th className="p-3 text-amber-300">Stage 3: 10,000 Play-by-Play Sims</th>
                  <th className="p-3 text-emerald-300">Stage 4: Book / Salary Gate Last</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {ENGINE_PROCESSING_BY_ITEM.map((row) => (
                  <tr key={row.item} className="align-top hover:bg-slate-900/90">
                    <td className="p-3 font-semibold text-white">
                      <div>{row.item}</div>
                      <Link href={row.route} className="mt-1 inline-block font-mono text-[11px] text-sky-400 hover:underline">
                        {row.route} &rarr;
                      </Link>
                    </td>
                    <td className="p-3 leading-5">{row.stage1CoachMind}</td>
                    <td className="p-3 leading-5">{row.stage2DataAndMath}</td>
                    <td className="p-3 leading-5">{row.stage3Simulation}</td>
                    <td className="p-3 leading-5">{row.stage4BookLast}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* APPS & WORKFLOWS LISTS */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
              <span>3. All Live Working Apps &amp; Surfaces</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                11 / 11 ONLINE
              </span>
            </h2>
            <ul className="divide-y divide-slate-800 text-sm">
              {LIVE_APPS.map((app) => (
                <li key={app.name} className="py-2.5 flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-200">{app.name}</span>
                  <a
                    href={app.path}
                    target={app.path.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="text-sky-400 hover:underline font-mono text-xs"
                  >
                    {app.url} &rarr;
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
              <span>4. Autonomous Weekly Coaching, CV, Hermes &amp; Sim Workflows</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                24/7 + 10Hz CV + T-48h + SUN 4PM
              </span>
            </h2>
            <ul className="divide-y divide-slate-800 text-sm">
              {AUTONOMOUS_WORKFLOWS.map((wf) => (
                <li key={wf.name} className="py-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{wf.name}</span>
                    <span className="text-xs font-mono text-emerald-400">{wf.window}</span>
                  </div>
                  <div className="text-xs font-mono text-slate-400 truncate">{wf.script}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
