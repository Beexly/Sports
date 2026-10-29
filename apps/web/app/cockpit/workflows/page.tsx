import Link from "next/link";
import { buildIntelligenceGrowthSnapshot } from "@/lib/intelligence/growth-observatory";
import { LIVE_PACKAGE_CATALOG } from "@/lib/packages/catalog";

export const dynamic = "force-dynamic";

const LIVE_APPS = [
  { name: "Main Live Site (5 Revenue Pillars)", url: "http://localhost:3000", path: "/", status: "ONLINE" },
  { name: "WagerTalk-Style Package Storefront", url: "http://localhost:3000/packages", path: "/packages", status: "ONLINE" },
  { name: "1. Plays & Game Picks Board", url: "http://localhost:3000/picks", path: "/picks", status: "ONLINE" },
  { name: "2. Player Props & N_eff Target Shares", url: "http://localhost:3000/fantasy/props", path: "/fantasy/props", status: "ONLINE" },
  { name: "3. Correlated SGP Matrix", url: "http://localhost:3000/sgp-projections", path: "/sgp-projections", status: "ONLINE" },
  { name: "4. DFS Optimizer & Coach Stacks", url: "http://localhost:3000/fantasy/dfs", path: "/fantasy/dfs", status: "ONLINE" },
  { name: "Live Intelligence & Reasoning Observatory", url: "http://localhost:3000/intelligence/observatory", path: "/intelligence/observatory", status: "ONLINE" },
  { name: "Jynx / Jarvis Operator Cockpit", url: "http://localhost:3000/cockpit", path: "/cockpit", status: "ONLINE" },
  { name: "Standalone Mind Observatory & Hub (:8788)", url: "http://127.0.0.1:8788/hub.html", path: "http://127.0.0.1:8788/hub.html", status: "ONLINE" },
  { name: "Telegram Bot (@GalaxySportsEdge_bot)", url: "https://web.telegram.org/k/#@GalaxySportsEdge_bot", path: "https://web.telegram.org/k/#@GalaxySportsEdge_bot", status: "ONLINE" },
];

const AUTONOMOUS_WORKFLOWS = [
  { window: "Sun 16:00 CT (4:00 PM)", name: "Post-Game Coach Film & Telemetry Autopsy (SUN_EARLY)", script: "python scripts/ops/post_game_film_autopsy.py --slot SUN_EARLY", state: "ACTIVE" },
  { window: "Sun 19:30 & 22:45 CT", name: "Afternoon & SNF Post-Game Film Autopsies", script: "python scripts/ops/post_game_film_autopsy.py --slot SUN_LATE", state: "ACTIVE" },
  { window: "Thu & Mon 22:45 CT", name: "TNF & MNF Post-Game Film Autopsies", script: "python scripts/ops/post_game_film_autopsy.py --slot TNF", state: "ACTIVE" },
  { window: "Mon–Tue 04:00 CT", name: "Empirical Bayes BTL, Inverse-MDP τ & Counter-Matrix Seal", script: "python scripts/ops/run_weekly_cadence_tick.py --slot TNF --phase MON_TUE_FINE_TUNE_SEAL", state: "ACTIVE" },
  { window: "Tue 04:00 CT", name: "TNF T-48h Early-Morning 10,000-Run Simulation (Out 06:00 CT)", script: "python scripts/ops/run_weekly_cadence_tick.py --slot TNF --phase T_MINUS_48H_EARLY_SIM", state: "ACTIVE" },
  { window: "Fri 04:00 CT", name: "Sunday Slate T-48h Early-Morning 10,000-Run Simulation (Out 06:00 CT)", script: "python scripts/ops/run_weekly_cadence_tick.py --slot SUN_EARLY --phase T_MINUS_48H_EARLY_SIM", state: "ACTIVE" },
  { window: "Sat 04:00 CT", name: "MNF T-48h Early-Morning 10,000-Run Simulation (Out 06:00 CT)", script: "python scripts/ops/run_weekly_cadence_tick.py --slot MNF --phase T_MINUS_48H_EARLY_SIM", state: "ACTIVE" },
  { window: "Continuous Daily", name: "Priority #1 Quad-Engine Harvester (Kaggle+arXiv+OpenAlex+HF+DOCX)", script: "python scripts/ops/autonomous_quad_engine_harvester.py", state: "ACTIVE" },
  { window: "On Sim Lock", name: "Coach Writeup Generator & Telegram/Whop Broadcaster", script: "python scripts/ops/gse_telegram_whop_broadcaster.py --mode all", state: "ACTIVE" },
  { window: "On Demand / Cron", name: "Kaggle 30hr/wk Free T4x2 GPU & GCP VM Dispatcher", script: "python scripts/ops/gse_vm_compute_dispatcher.py", state: "ACTIVE" },
];

export default function CockpitWorkflowsHubPage() {
  const snap = buildIntelligenceGrowthSnapshot();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-widest text-sky-400">
              GSE Autonomous Operating System &bull; Priority #1 Quad-Engine Spine
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mt-1">
              Live Working Apps &amp; Autonomous Workflows Hub
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {snap.quadEngineCounts.totalCanonicalNodes.toLocaleString()} Canonical Nodes (Kaggle + arXiv + OpenAlex + Hugging Face + DOCX OMML) &bull; {LIVE_PACKAGE_CATALOG.length} Live Revenue Packages &bull; @GalaxySportsEdge_bot Active
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/packages" className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold">
              Open Storefront (/packages)
            </Link>
            <Link href="/intelligence/observatory" className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold">
              Intelligence Observatory
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-lg font-bold mb-4 flex items-center justify-between">
              <span>1. All Live Working Apps</span>
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
              <span>2. Autonomous Weekly Coaching &amp; Simulation Workflows</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                T-48h &amp; SUN 4PM
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
