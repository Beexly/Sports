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
  { name: "Live Intelligence & Reasoning Observatory", url: "https://www.galaxysportsedge.com/intelligence/observatory", path: "/intelligence/observatory", status: "ONLINE" },
  { name: "Standalone Mind Observatory & Hub (:8788)", url: "http://127.0.0.1:8788/index.html", path: "http://127.0.0.1:8788/index.html", status: "ONLINE" },
  { name: "Telegram VIP Bot (@GalaxySportsEdge_bot)", url: "https://t.me/GalaxySportsEdge_bot", path: "https://t.me/GalaxySportsEdge_bot", status: "GATED VIP" },
];

const AUTONOMOUS_WORKFLOWS = [
  { window: "24/7 Continuous", name: "Hermes Low-Cost/Free-Model Competitor & X-Intel Sweep (16 Engines + 55 Tables + 86 Domains)", script: ".hermes/competitor-intel/MASTER_MATRIX.md + docs/research/2026-10-28/full-tables/*.csv", state: "ACTIVE ($0 QUOTA)" },
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

const ENGINE_PROCESSING_BY_ITEM = [
  {
    item: "1. Game Picks (Sides, Moneylines & Totals)",
    route: "/picks",
    stage1CoachMind:
      "Coordinator play-call DNA by down/distance/score-state, defensive coverage shell rotations (Cover-0 blitz, Cover-1, Tampa-2, Cover-3, Quarters), OL/DL pass-block & run-block trench leverage, QB pressure-to-sack conversion, Tuesday-to-Sunday coach-speak, travel/weather/referee vectors.",
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
      "Receiver alignment (slot vs boundary) vs opposing corner/safety shell funnel, pre-snap motion target boosts, RB goal-line/2-minute snap share, and QB time-to-throw vs blitz rate.",
    stage2DataAndMath:
      "Non-linear Effective Load Scaling (N_eff = 1 / HHI where HHI = sum(s_i^2)) + Injury Cascade v2 redistribution + NGS route separation & catch-probability residuals + 55 Hermes X-Intel YPRR/TPRR/air-yard tables.",
    stage3Simulation:
      "10,000 correlated player-stat simulations capturing target, carry, air-yard, and red-zone touch distributions across game scripts.",
    stage4BookLast:
      "Compared LAST against prop lines & Underdog/PrizePicks implied probabilities to isolate tail-volume mispricings.",
  },
  {
    item: "3. Correlated Same-Game Parlays (SGP)",
    route: "/sgp-projections",
    stage1CoachMind:
      "Causal game-script chains: e.g., how an early road favorite passing lead forces the trailing home QB into 42+ dropbacks and elevates opposing WR1 catch-up volume, or how an elite pass rush pairs with RB1 clock-bleed carries + UNDER.",
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
      "Full coaching & environment writeup per game: Neutral pace, no-huddle rate, Pass EPA/play, coverage shell funnels, trench win rates, and why a game is a 4-man shootout stack vs an RB+DST leverage spot.",
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
              GSE Autonomous Operating System &bull; Coach &amp; Reasoning Mind First &bull; Book Last
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              Master Visual Architecture Graph: All Apps, Workflows, Systems &amp; Engine Pipelines
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {snap.quadEngineCounts.totalCanonicalNodes.toLocaleString()} Canonical Quad-Engine Nodes &bull; Hermes 24h Competitor &amp; X-Intel Fleet (16 Engines + 55 Tables) &bull; 10,000-Sim Pipeline &bull; In-Place Paywall &amp; @GalaxySportsEdge_bot
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/packages" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold">
              Open Paywall Storefront (/packages)
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
                1. End-to-End Visual System &amp; Dataflow Graph (Coach Mind First &rarr; Book Last)
              </h2>
              <p className="text-xs text-slate-400">
                Shows how Hermes low-cost/free agents, the 3,742-node Quad-Engine, the Coach &amp; Reasoning Mind, and the 10,000-run simulator feed all 5 gated commercial surfaces.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40">
              LIVE ARCHITECTURE TOPOLOGY
            </span>
          </div>

          <div className="overflow-x-auto">
            <svg
              viewBox="0 0 1200 540"
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
                LAYER 1: AUTONOMOUS INGESTION ($0 QUOTA)
              </text>
              <text x="415" y="28" fill="#a855f7" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                LAYER 2: COACH &amp; REASONING MIND FIRST
              </text>
              <text x="720" y="28" fill="#f59e0b" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                LAYER 3: 10,000 SIMS &amp; BOOK/SALARY LAST
              </text>
              <text x="1040" y="28" fill="#10b981" fontSize="11" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                LAYER 4: LIVE APPS &amp; PAYWALL VAULTS
              </text>

              {/* Layer 1 Boxes */}
              <rect x="20" y="45" width="220" height="95" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
              <text x="32" y="68" fill="#38bdf8" fontSize="12" fontWeight="bold">Hermes 24/7 Competitor Fleet</text>
              <text x="32" y="86" fill="#cbd5e1" fontSize="10">• 16 Competitor Engines (nfelo, 538,</text>
              <text x="32" y="100" fill="#cbd5e1" fontSize="10">  nflfastR, nfl4th, SportsProps, pydfs)</text>
              <text x="32" y="114" fill="#cbd5e1" fontSize="10">• 55 Verbatim X-Intel CSV Tables</text>
              <text x="32" y="128" fill="#34d399" fontSize="10" fontFamily="monospace">OpenCode Free Subagents ($0 Burn)</text>

              <rect x="20" y="155" width="220" height="95" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
              <text x="32" y="178" fill="#38bdf8" fontSize="12" fontWeight="bold">Priority #1 Quad-Engine Spine</text>
              <text x="32" y="196" fill="#cbd5e1" fontSize="10">• 2,577 arXiv + 761 OpenAlex Papers</text>
              <text x="32" y="210" fill="#cbd5e1" fontSize="10">• 182 Kaggle + 84 Hugging Face</text>
              <text x="32" y="224" fill="#cbd5e1" fontSize="10">• 277 DOCX OMML Equations</text>
              <text x="32" y="238" fill="#38bdf8" fontSize="10" fontFamily="monospace">3,742 Canonical Nodes Wired</text>

              <rect x="20" y="265" width="220" height="95" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
              <text x="32" y="288" fill="#38bdf8" fontSize="12" fontWeight="bold">Sun 16:00 CT Film Autopsy</text>
              <text x="32" y="306" fill="#cbd5e1" fontSize="10">• Sun 16:00, 19:30, 22:45 CT + TNF/MNF</text>
              <text x="32" y="320" fill="#cbd5e1" fontSize="10">• Grades pre-play expectation vs actual</text>
              <text x="32" y="334" fill="#cbd5e1" fontSize="10">• Updates coach scheme &amp; trench priors</text>
              <text x="32" y="348" fill="#38bdf8" fontSize="10" fontFamily="monospace">post_game_film_autopsy.py</text>

              <rect x="20" y="375" width="220" height="95" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
              <text x="32" y="398" fill="#38bdf8" fontSize="12" fontWeight="bold">33-Repo &amp; GPU/VM Fleet</text>
              <text x="32" y="416" fill="#cbd5e1" fontSize="10">• Ruflo, CodeGraph, DeerFlow, OpenBot</text>
              <text x="32" y="430" fill="#cbd5e1" fontSize="10">• Kaggle 30hr/wk Free T4x2 GPU</text>
              <text x="32" y="444" fill="#cbd5e1" fontSize="10">• GCP VM + 20TB Google Drive Sync</text>
              <text x="32" y="458" fill="#38bdf8" fontSize="10" fontFamily="monospace">gse_vm_compute_dispatcher.py</text>

              {/* Layer 2 Boxes (Coach & Reasoning Mind First) */}
              <rect x="295" y="55" width="240" height="130" rx="8" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
              <text x="308" y="78" fill="#c084fc" fontSize="12" fontWeight="bold">1. Coaching &amp; Scheme Reasoning</text>
              <text x="308" y="96" fill="#cbd5e1" fontSize="10">• Play-caller DNA (down/dist/score)</text>
              <text x="308" y="111" fill="#cbd5e1" fontSize="10">• Coverage Shell Funnels (Cover-0/1/2/3/4)</text>
              <text x="308" y="126" fill="#cbd5e1" fontSize="10">• Blitz Rate vs QB Pressure-to-Sack</text>
              <text x="308" y="141" fill="#cbd5e1" fontSize="10">• OL/DL Pass &amp; Run Trench Win Rates</text>
              <text x="308" y="156" fill="#cbd5e1" fontSize="10">• Pre-Snap Motion &amp; 11/12/21 Personnel</text>
              <text x="308" y="172" fill="#c084fc" fontSize="10" fontFamily="monospace">4-Stage Cognitive Router (3646-&gt;25)</text>

              <rect x="295" y="205" width="240" height="125" rx="8" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
              <text x="308" y="228" fill="#c084fc" fontSize="12" fontWeight="bold">2. Pace, N_eff &amp; Injury Cascade v2</text>
              <text x="308" y="246" fill="#cbd5e1" fontSize="10">• Neutral-Script Sec/Snap &amp; No-Huddle</text>
              <text x="308" y="261" fill="#cbd5e1" fontSize="10">• Pass Rate Over Expectation (PROE)</text>
              <text x="308" y="276" fill="#cbd5e1" fontSize="10">• Effective Receivers N_eff = 1 / HHI</text>
              <text x="308" y="291" fill="#cbd5e1" fontSize="10">• Non-Linear Target &amp; Touch Scaling</text>
              <text x="308" y="306" fill="#cbd5e1" fontSize="10">• OL/CB/WR Injury Redistribution</text>
              <text x="308" y="320" fill="#c084fc" fontSize="10" fontFamily="monospace">load_scaling.py + injury_v2.py</text>

              <rect x="295" y="350" width="240" height="115" rx="8" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
              <text x="308" y="373" fill="#c084fc" fontSize="12" fontWeight="bold">3. Situational &amp; Beat-Desk Context</text>
              <text x="308" y="391" fill="#cbd5e1" fontSize="10">• Tuesday vs Sunday Coach-Speak Audit</text>
              <text x="308" y="406" fill="#cbd5e1" fontSize="10">• Revenge / Divisional / Short-Week Spots</text>
              <text x="308" y="421" fill="#cbd5e1" fontSize="10">• Weather / Wind / Turf / Referee Crew</text>
              <text x="308" y="436" fill="#cbd5e1" fontSize="10">• Mon–Tue Empirical Bayes BTL Seal</text>
              <text x="308" y="452" fill="#c084fc" fontSize="10" fontFamily="monospace">MON_TUE_FINE_TUNE_SEAL</text>

              {/* Layer 3 Boxes (10,000 Sims -> Book Last) */}
              <rect x="595" y="55" width="250" height="190" rx="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
              <text x="608" y="78" fill="#fbbf24" fontSize="12" fontWeight="bold">T-48h 04:00 CT 10,000-Run Sim</text>
              <text x="608" y="96" fill="#fde68a" fontSize="10" fontFamily="monospace">Tue 04:00 (TNF) · Fri 04:00 (Sun) · Sat 04:00 (MNF)</text>
              <text x="608" y="114" fill="#cbd5e1" fontSize="10">• Simulates every play &amp; drive 10,000x</text>
              <text x="608" y="129" fill="#cbd5e1" fontSize="10">• Scores ALL possible QBs, RBs, WRs, TEs, DSTs</text>
              <text x="608" y="144" fill="#cbd5e1" fontSize="10">• Preserves within-game covariance (Sigma_game)</text>
              <text x="608" y="159" fill="#cbd5e1" fontSize="10">• Evaluates all lineup &amp; SGP combinations</text>
              <text x="608" y="174" fill="#cbd5e1" fontSize="10">• Computes independent Fair Spread, Total,</text>
              <text x="608" y="189" fill="#cbd5e1" fontSize="10">  Prop Quantiles, SGP Joint Prob &amp; DFS Ceilings</text>
              <text x="608" y="210" fill="#fbbf24" fontSize="10" fontFamily="monospace">weekly-cadence-orchestrator.ts</text>
              <text x="608" y="226" fill="#34d399" fontSize="10" fontFamily="monospace">Locks &amp; Publishes by 06:00 CT</text>

              <rect x="595" y="265" width="250" height="200" rx="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
              <text x="608" y="288" fill="#fbbf24" fontSize="12" fontWeight="bold">BOOK &amp; SALARY GATE LAST</text>
              <text x="608" y="306" fill="#cbd5e1" fontSize="10">• Compares Independent Football Truth vs:</text>
              <text x="608" y="321" fill="#cbd5e1" fontSize="10">  1. De-vigged Market Spread &amp; Total</text>
              <text x="608" y="336" fill="#cbd5e1" fontSize="10">  2. Player Prop Implied Probabilities</text>
              <text x="608" y="351" fill="#cbd5e1" fontSize="10">  3. Book SGP Hold (15–30% Structural Hole)</text>
              <text x="608" y="366" fill="#cbd5e1" fontSize="10">  4. DFS Salaries &amp; Dirichlet Field Ownership</text>
              <text x="608" y="386" fill="#f87171" fontSize="10" fontWeight="bold">• HARD GATE: Never publish decision=PASS</text>
              <text x="608" y="401" fill="#f87171" fontSize="10" fontWeight="bold">  or expectedClv &lt; 0. Conf strictly XX/100.</text>
              <text x="608" y="421" fill="#34d399" fontSize="10" fontFamily="monospace">coach-writeup-engine.ts</text>
              <text x="608" y="438" fill="#34d399" fontSize="10" fontFamily="monospace">verify-purchase.ts (Zero DOM Leak)</text>

              {/* Layer 4 Boxes (5 Revenue Pillars + Paywall + Telegram) */}
              <rect x="905" y="45" width="275" height="68" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
              <text x="918" y="66" fill="#34d399" fontSize="11" fontWeight="bold">Pillar 1: Calibrated Game Picks (/picks)</text>
              <text x="918" y="82" fill="#cbd5e1" fontSize="10">Sides &amp; Totals · XX/100 Conf · +CLV Only</text>
              <text x="918" y="98" fill="#94a3b8" fontSize="9" fontFamily="monospace">galaxysportsedge.com/picks</text>

              <rect x="905" y="123" width="275" height="68" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
              <text x="918" y="144" fill="#34d399" fontSize="11" fontWeight="bold">Pillar 2: Player Props Lab (/fantasy/props)</text>
              <text x="918" y="160" fill="#cbd5e1" fontSize="10">N_eff Target Shares · Route &amp; Trench Edges</text>
              <text x="918" y="176" fill="#94a3b8" fontSize="9" fontFamily="monospace">galaxysportsedge.com/fantasy/props</text>

              <rect x="905" y="201" width="275" height="68" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
              <text x="918" y="222" fill="#34d399" fontSize="11" fontWeight="bold">Pillar 3: Correlated SGPs (/sgp-projections)</text>
              <text x="918" y="238" fill="#cbd5e1" fontSize="10">Joint Sim Prob vs Book Hold (+251 vs +345)</text>
              <text x="918" y="254" fill="#94a3b8" fontSize="9" fontFamily="monospace">galaxysportsedge.com/sgp-projections</text>

              <rect x="905" y="279" width="275" height="75" rx="8" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
              <text x="918" y="300" fill="#34d399" fontSize="11" fontWeight="bold">Pillar 4: DFS Writeups &amp; Lineups (/fantasy/dfs)</text>
              <text x="918" y="316" fill="#cbd5e1" fontSize="10">Optimizer Retired &rarr; Full Game Writeups, Cash</text>
              <text x="918" y="330" fill="#cbd5e1" fontSize="10">80th-Pct Core, Captain &amp; 20-Max GPP Lineups</text>
              <text x="918" y="344" fill="#94a3b8" fontSize="9" fontFamily="monospace">galaxysportsedge.com/fantasy/dfs</text>

              <rect x="905" y="364" width="275" height="115" rx="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
              <text x="918" y="385" fill="#fbbf24" fontSize="11" fontWeight="bold">Pillar 5: OnlyFans/WagerTalk Paywall Vault</text>
              <text x="918" y="401" fill="#cbd5e1" fontSize="10">• Free Pace &amp; Scheme Teaser Above Fold</text>
              <text x="918" y="416" fill="#cbd5e1" fontSize="10">• Frosted Vault Unlocks In-Place on Payment</text>
              <text x="918" y="431" fill="#cbd5e1" fontSize="10">• $25/$38 TNF · $35/$53 Sun · $29 DFS · $69/$99</text>
              <text x="918" y="446" fill="#38bdf8" fontSize="10" fontWeight="bold">• @GalaxySportsEdge_bot (/unlock &lt;token&gt;)</text>
              <text x="918" y="464" fill="#94a3b8" fontSize="9" fontFamily="monospace">galaxysportsedge.com/packages</text>

              {/* Connecting Arrows */}
              <line x1="240" y1="92" x2="292" y2="110" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="240" y1="202" x2="292" y2="140" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="240" y1="202" x2="292" y2="255" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="240" y1="312" x2="292" y2="285" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="240" y1="312" x2="292" y2="395" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />
              <line x1="240" y1="422" x2="292" y2="415" stroke="#38bdf8" strokeWidth="2" markerEnd="url(#arrow)" />

              <line x1="535" y1="120" x2="592" y2="135" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowGold)" />
              <line x1="535" y1="265" x2="592" y2="165" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowGold)" />
              <line x1="535" y1="405" x2="592" y2="195" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrowGold)" />

              <line x1="720" y1="245" x2="720" y2="262" stroke="#f59e0b" strokeWidth="2.5" markerEnd="url(#arrowGold)" />

              <line x1="845" y1="310" x2="902" y2="80" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
              <line x1="845" y1="330" x2="902" y2="155" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
              <line x1="845" y1="350" x2="902" y2="235" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
              <line x1="845" y1="370" x2="902" y2="315" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrowGreen)" />
              <line x1="845" y1="395" x2="902" y2="415" stroke="#10b981" strokeWidth="2.5" markerEnd="url(#arrowGreen)" />
            </svg>
          </div>
        </section>

        {/* PER-ITEM ENGINE PROCESSING MATRIX */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-lg font-bold text-white mb-1">
            2. What the Engine Processes for Each Product Item (Coach Mind First &rarr; Book Last)
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Exact data inputs, equations, simulation mechanics, and final market/salary gates across all 5 commercial surfaces.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 font-mono text-[11px] uppercase text-slate-300">
                  <th className="p-3">Product Surface</th>
                  <th className="p-3 text-purple-300">Stage 1: Coach &amp; Reasoning Mind First</th>
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
                10 / 10 ONLINE
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
              <span>4. Autonomous Weekly Coaching, Hermes &amp; Sim Workflows</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                24/7 + T-48h + SUN 4PM
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
