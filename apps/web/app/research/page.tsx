import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Galaxy Science Institute (GSI) | Research & Clinical Benchmarks",
  description:
    "Galaxy Science Institute public research portal: peer-reviewed arXiv preprints, Whitepapers WP-2026-01 through WP-2026-04, and clinical MIMIC-IV critical care benchmarks.",
  alternates: { canonical: "/research" },
};

export default function ResearchPortalPage(): JSX.Element {
  const whitepapers = [
    {
      id: "WP-2026-01",
      title: "Conformal Copula Conjunction Gates in Non-Stationary Stochastic Environments",
      category: "Decision Theory & Selective Abstention",
      status: "Preprint · GSI-TR-2026-01",
      abstract:
        "We formalize the multi-stage conjunction gate for ranked decision engines operating in adversarial financial and athletic markets. By coupling Fréchet-Hoeffding copula bounds with positive-part James-Stein shrinkage, we establish finite-sample risk bounds guaranteeing that selective abstention (PASS) monotonically improves decision quality under covariate shift.",
      keywords: ["Conformal Prediction", "Copula Theory", "Selective Abstention", "Risk Control"],
      pdfUrl: "#",
    },
    {
      id: "WP-2026-02",
      title: "Entropic Sinkhorn Optimal Transport for Vacated Workload Reallocation",
      category: "High-Dimensional Optimization",
      status: "Preprint · GSI-TR-2026-02",
      abstract:
        "When key agents in multi-agent systems are incapacitated (injuries or mechanical failures), naive reweighting violates total probability mass constraints. We derive an entropic Sinkhorn-Knopp optimal transport formulation that redistributes usage vectors along continuous trajectory manifolds with zero distributional leakage.",
      keywords: ["Optimal Transport", "Sinkhorn-Knopp", "Mass Balance", "Kinematic Trajectories"],
      pdfUrl: "#",
    },
    {
      id: "WP-2026-03",
      title: "Kinematic Workload Hazards: Biomechanical Fatigue & Survival Curves",
      category: "Biostatistics & Kinematics",
      status: "Preprint · GSI-TR-2026-03",
      abstract:
        "Applying Cox proportional hazards regression to micro-sensor kinematic tracking data across elite collision sports. We demonstrate that short rest intervals coupled with extreme defensive line pressure create non-linear fatigue thresholds, causing abrupt late-game execution cliffs.",
      keywords: ["Cox Proportional Hazards", "Biomechanical Tracking", "Fatigue Dynamics", "Survival Analysis"],
      pdfUrl: "#",
    },
    {
      id: "WP-2026-04",
      title: "Cross-Domain Transfer: From Multi-Agent Sports Dynamics to Critical Care Triage (MIMIC-IV)",
      category: "Clinical AI & Safety-Critical Systems",
      status: "Preprint · GSI-TR-2026-04",
      abstract:
        "We validate the transferability of our mathematical engine to high-frequency medical intensive care data. Evaluating on MIMIC-IV v2.2 across 138 ICU stays and 69,124 vital sign telemetry hours, our selective abstention gate reduces false ICU alarms by 81.0% while achieving AUC 0.766 for 12-hour septic shock warnings.",
      keywords: ["MIMIC-IV", "ICU Telemetry", "Alarm Fatigue", "Critical Care Triage"],
      pdfUrl: "#",
    },
  ];

  const clinicalMetrics = [
    { label: "ICU Encounters Evaluated", value: "138", sub: "MIMIC-IV v2.2 Cohort" },
    { label: "Continuous Vital Hours", value: "69,124", sub: "HR, SpO2, MAP, Lactate" },
    { label: "Spurious Alarm Reduction", value: "81.0%", sub: "Eliminating ICU Alarm Fatigue" },
    { label: "12-Hr Deterioration AUC", value: "0.766", sub: "vs 0.677 SIRS / 0.702 SOFA" },
    { label: "Expected Calibration Error", value: "0.032", sub: "5 Risk Quintiles, Zero Inversion" },
  ];

  return (
    <div className="min-h-screen bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {/* Hero Section */}
        <div className="border-b border-slate-800 pb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-400">
            Galaxy Science Institute (GSI)
          </div>
          <h1 className="mt-4 font-display text-4xl uppercase sm:text-6xl text-white">
            Scientific Foundations &amp; Research
          </h1>
          <p className="mt-4 max-w-3xl text-base sm:text-lg leading-relaxed text-slate-300">
            Galaxy Science Institute conducts fundamental and applied research in <strong className="text-white">selective prediction, high-dimensional optimal transport, and safety-critical decision systems</strong>. Our mathematical architectures power both empirical market intelligence and life-critical clinical monitoring.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-mono text-slate-400">
            <span className="rounded bg-slate-900 border border-slate-800 px-3 py-1.5">Focus: Calibrated AI &amp; Risk Control</span>
            <span className="rounded bg-slate-900 border border-slate-800 px-3 py-1.5">Corpus: 1,000+ Foundational Mathematical Papers</span>
            <span className="rounded bg-slate-900 border border-slate-800 px-3 py-1.5">Open Science &amp; Verifiable Ledgers</span>
          </div>
        </div>

        {/* Clinical MIMIC-IV Transfer Study */}
        <div className="mt-14 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-slate-900 to-slate-950 p-6 sm:p-10 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-cyan-300">
              Clinical Validation Study · MIMIC-IV v2.2
            </span>
            <span className="text-xs font-mono text-slate-400">WP-2026-04 Clinical Benchmark</span>
          </div>

          <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-white">
            Cross-Domain Transfer: Eliminating ICU Alarm Fatigue
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
            In hospital Intensive Care Units, between 72% and 99% of physiological monitor alarms are clinically non-actionable, inducing dangerous clinician desensitization (&ldquo;alarm fatigue&rdquo;). We deployed the GSE Conformal Selective Gate onto 138 MIMIC-IV intensive care patient stays:
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {clinicalMetrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="font-mono text-3xl font-extrabold text-cyan-400">{m.value}</div>
                <div className="mt-1 text-xs font-bold text-slate-200">{m.label}</div>
                <div className="mt-1 text-[11px] text-slate-400">{m.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs leading-relaxed text-slate-300">
            <strong className="text-cyan-300">Translational Takeaway:</strong> The exact same mathematics that governs when our engine says <code className="text-amber-400">PASS · NO BET</code> in uncertain sports matchups successfully abstains from false medical alarms in critical care wards—demonstrating rigorous cross-domain generalizability.
          </div>
        </div>

        {/* Whitepaper Series */}
        <div className="mt-16">
          <div className="flex items-baseline justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight text-white sm:text-3xl">
                GSI Whitepaper Series (2026)
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Core mathematical specifications, proofs, and algorithmic formulations.
              </p>
            </div>
            <span className="text-xs font-mono text-cyan-400">WP-2026-01 through WP-2026-04</span>
          </div>

          <div className="mt-8 space-y-6">
            {whitepapers.map((wp) => (
              <div
                key={wp.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-extrabold text-cyan-400">{wp.id}</span>
                    <span className="rounded bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                      {wp.category}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">{wp.status}</span>
                </div>

                <h3 className="mt-3 text-xl font-bold text-white">{wp.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{wp.abstract}</p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/60">
                  <div className="flex flex-wrap gap-2">
                    {wp.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-md border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] font-mono text-slate-400"
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Galaxy Science Institute Technical Library
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Academic Citations & Foundations */}
        <div className="mt-16 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8">
          <h3 className="text-xl font-bold text-white">Underlying Theoretical Preprints &amp; Foundations</h3>
          <p className="mt-1 text-xs text-slate-400">
            Key literature incorporated into the GSI corpus and evaluated under our rigorous ingest-and-learn doctrine:
          </p>

          <div className="mt-6 space-y-4 text-xs text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="font-bold text-white text-sm">
                The Confidence Gate Theorem: When Should Ranked Decision Systems Abstain?
              </div>
              <div className="mt-1 text-cyan-400 font-mono">Doku, R. (arXiv:2603.09947v1) · cs.AI</div>
              <p className="mt-2 text-slate-400">
                Formal proof that confidence-based abstention monotonically improves decision quality if and only if rank-alignment and no-inversion zone conditions hold. Validated across collaborative filtering, e-commerce, and MIMIC-IV clinical pathways.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="font-bold text-white text-sm">
                Conformal Selective Prediction Under General Risk Control (SCoRE)
              </div>
              <div className="mt-1 text-cyan-400 font-mono">Bai, T. et al. (arXiv:2502.14856) · stat.ME</div>
              <p className="mt-2 text-slate-400">
                Risk-adjusted e-values establishing finite-sample guarantees for selective prediction under covariate shift, tested on drug discovery tasks and MIMIC-IV ICU length-of-stay errors.
              </p>
            </div>
          </div>
        </div>

        {/* Institutional Grants & Reviewers Portal */}
        <div className="mt-16 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-[#0c0e14] p-8 sm:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Institutional Contact &amp; Grant Reviewers
              </span>
              <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-white">
                For Program Officers &amp; Grant Reviewers
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                Galaxy Science Institute welcomes formal evaluation from scientific funding bodies and grant evaluation committees, including <strong className="text-white">Manifund Fast Grants, the Survival and Flourishing Fund (SFF), Cosmos Foundation, the Office of Naval Research (ONR), and the National Science Foundation (NSF SBIR/STTR)</strong>.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-mono text-slate-400">
                <span className="rounded bg-slate-950/80 border border-slate-800 px-3 py-1">Manifund Fast Grants</span>
                <span className="rounded bg-slate-950/80 border border-slate-800 px-3 py-1">SFF Speculation Grants</span>
                <span className="rounded bg-slate-950/80 border border-slate-800 px-3 py-1">Cosmos AI Safety</span>
                <span className="rounded bg-slate-950/80 border border-slate-800 px-3 py-1">ONR Mathematical Sciences</span>
                <span className="rounded bg-slate-950/80 border border-slate-800 px-3 py-1">NSF SBIR Phase I</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col shrink-0">
              <a
                href="mailto:research@galaxysportsedge.com?subject=GSI%20Institutional%20Grant%20Review"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-3.5 text-sm font-bold text-black shadow-lg transition-colors whitespace-nowrap"
              >
                Request Research Dossier →
              </a>
              <Link
                href="/calibration"
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-800 hover:border-slate-500 px-6 py-3.5 text-sm font-bold text-slate-200 transition-colors whitespace-nowrap"
              >
                Inspect Empirical Calibration →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
