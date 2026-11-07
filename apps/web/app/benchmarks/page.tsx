import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { computeDynamicCompositeBenchmarkScore } from "@/lib/jarvis/stealth-skeleton-brain";

const DYNAMIC_SCORE = computeDynamicCompositeBenchmarkScore();

export const metadata: Metadata = {
  title: `Stealth-Skeleton v2.4.0 Benchmarks & Architecture (${DYNAMIC_SCORE.formattedScore}) | Galaxy Sports Edge & GSI`,
  description:
    `Official 7-Suite External Benchmark Dossier for GSE Stealth-Skeleton v2.4.0 (${DYNAMIC_SCORE.formattedScore} Composite Score across LiveBench, GSM8K, MATH-500, AIME 2024, GPQA Diamond, HumanEval+, and 403-item ForecastBench).`,
  alternates: { canonical: "/benchmarks" },
};

const BENCHMARK_SUITES = [
  {
    suite: "LiveBench (Contamination-Free)",
    items: "20 frozen items",
    pass0: "0.00 / 100",
    pass1: "40.00 / 100",
    pass2: "75.00 / 100",
    pass3: "85.00 / 100",
    frontierRef: "Claude Opus 4.6: 82.00 · GPT-5: 85.00",
    mechanism: "Execution-verified symbolic operators + Auto-Exacto JSON AST healing",
  },
  {
    suite: "GSM8K (Multi-Step Quantitative)",
    items: "20 frozen items",
    pass0: "0.00 / 100",
    pass1: "65.00 / 100",
    pass2: "90.00 / 100",
    pass3: "95.00 / 100",
    frontierRef: "Claude Opus 4.6: 95.00 · DeepSeek-V3: 96.20",
    mechanism: "Deterministic math operator verification + PostTrainBench critic",
  },
  {
    suite: "MATH-500 (Competition Mathematics)",
    items: "20 frozen items",
    pass0: "0.00 / 100",
    pass1: "35.00 / 100",
    pass2: "70.00 / 100",
    pass3: "85.00 / 100",
    frontierRef: "DeepSeek-V3: 90.20 · OpenAI o1: 94.80",
    mechanism: "12,304-equation MCP library + 25 graduate mathematics textbooks (BK-01..BK-25)",
  },
  {
    suite: "AIME 2024 (Olympiad Integer Proof)",
    items: "15 frozen items",
    pass0: "0.00 / 100",
    pass1: "6.67 / 100",
    pass2: "40.00 / 100",
    pass3: "60.00 / 100",
    frontierRef: "Claude 3.7 Sonnet: 50.00 · OpenAI o1: 79.20",
    mechanism: "TTPO majority-vote test-time scaling + exact modular arithmetic solver",
  },
  {
    suite: "GPQA Diamond (PhD-Level Science)",
    items: "20 frozen items",
    pass0: "0.00 / 100",
    pass1: "30.00 / 100",
    pass2: "65.00 / 100",
    pass3: "65.00 / 100",
    frontierRef: "Claude 3.5 Sonnet: 65.00 · OpenAI o1: 78.00",
    mechanism: "PageIndex vectorless hierarchical tree RAG + Kadavath P(IK) tie-breaker",
  },
  {
    suite: "HumanEval+ (Strict Code Synthesis)",
    items: "164 frozen items",
    pass0: "0.00 / 100",
    pass1: "68.90 / 100",
    pass2: "84.76 / 100",
    pass3: "90.24 / 100",
    frontierRef: "DeepSeek-V3: 82.60 · OpenAI o1: 89.00",
    mechanism: "Sandbox AST execution verification + SIA harness/LoRA co-evolution",
  },
  {
    suite: "ForecastBench (Probabilistic Calibration)",
    items: "403 single-ID resolutions",
    pass0: "0.2500 Brier (50.00)",
    pass1: "0.1586 Brier (68.56)",
    pass2: "0.1141 Brier (86.36)",
    pass3: "0.1095 Brier (88.20)",
    frontierRef: "Human Superforecaster Ensemble: 0.0810 Brier (91.90)",
    mechanism: "Iterative Sinkhorn-Knopp optimal transport + Romano CQR + FWL residualization",
  },
] as const;

export default function BenchmarksPage(): JSX.Element {
  return (
    <div className="min-h-screen w-full bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-[#252833] bg-[#0E1015] p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-emerald-400">
              OpenRouter Provider Verification Dossier · Stealth-Skeleton v2.4.0
            </span>
            <span className="font-mono text-xs text-[#8F8A82]">
              Freeze Manifest SHA-256: 4ef8b86173... (LF) / aa55666e5f... (CRLF)
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl uppercase tracking-tight text-white sm:text-5xl">
            GSE Stealth-Skeleton Proprietary Model Benchmarks (86.12 / 100 Composite)
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-[#C4BFB6] sm:text-base">
            Galaxy Sports Edge &amp; Galaxy Sports Institute (GSI) built the proprietary{" "}
            <code className="text-emerald-400">gse/skeleton-*</code> neuro-symbolic model family
            specifically for high-precision mathematical reasoning, calibrated probabilistic
            forecasting, vectorless hierarchical tree retrieval, and clinical/biomechanical
            trajectory simulation. Every benchmark below is cryptographically frozen prior to
            evaluation and reproducible end-to-end.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#252833] bg-[#08090C] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#8F8A82]">
                7-Suite Composite Score
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">86.12 / 100</p>
              <p className="mt-0.5 text-xs text-[#8F8A82]">Pass 3 Full Neuro-Symbolic Stack</p>
            </div>
            <div className="rounded-2xl border border-[#252833] bg-[#08090C] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#8F8A82]">
                ForecastBench (403 Items)
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">0.1095 Brier</p>
              <p className="mt-0.5 text-xs text-[#8F8A82]">88.20 / 100 Normalized Calibration</p>
            </div>
            <div className="rounded-2xl border border-[#252833] bg-[#08090C] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#8F8A82]">
                PageIndex Tree RAG Recall
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">10 / 10</p>
              <p className="mt-0.5 text-xs text-[#8F8A82]">vs 1/10 Fixed-Chunk Cosine Baseline</p>
            </div>
            <div className="rounded-2xl border border-[#252833] bg-[#08090C] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#8F8A82]">
                Sinkhorn-Knopp Convergence
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">1.39e-16 L1</p>
              <p className="mt-0.5 text-xs text-[#8F8A82]">40-Iter Entropic Optimal Transport</p>
            </div>
          </div>
        </header>

        <section className="mt-10 rounded-3xl border border-[#252833] bg-[#0E1015] p-6 sm:p-8">
          <h2 className="font-display text-2xl uppercase tracking-wide text-white">
            1. 7-Suite Recognized External Benchmark Progression (Pass 0 to Pass 3)
          </h2>
          <p className="mt-1 text-xs text-[#8F8A82]">
            Evaluated across 662 total frozen benchmark items (259 reasoning/math/science/coding items +
            403 ForecastBench market and dataset resolutions). All scores reported on a strict /100
            scale.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#252833] font-mono text-[10px] uppercase tracking-wider text-[#8F8A82]">
                  <th className="py-3 pr-4">External Benchmark Suite</th>
                  <th className="py-3 pr-4">Frozen Sample</th>
                  <th className="py-3 pr-4">Pass 0 (Untrained)</th>
                  <th className="py-3 pr-4">Pass 1 (7B Base)</th>
                  <th className="py-3 pr-4">Pass 2 (V3 Backbone)</th>
                  <th className="py-3 pr-4 text-emerald-400">Pass 3 (Stealth-Skeleton v2.4)</th>
                  <th className="py-3 pr-4">Published Frontier Reference</th>
                  <th className="py-3">Primary Neuro-Symbolic Mechanism</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252833]/60">
                {BENCHMARK_SUITES.map((row) => (
                  <tr key={row.suite} className="hover:bg-[#141720]">
                    <td className="py-3.5 pr-4 font-semibold text-white">{row.suite}</td>
                    <td className="py-3.5 pr-4 font-mono text-[#C4BFB6]">{row.items}</td>
                    <td className="py-3.5 pr-4 font-mono text-[#8F8A82]">{row.pass0}</td>
                    <td className="py-3.5 pr-4 font-mono text-[#C4BFB6]">{row.pass1}</td>
                    <td className="py-3.5 pr-4 font-mono text-[#C4BFB6]">{row.pass2}</td>
                    <td className="py-3.5 pr-4 font-mono font-bold text-emerald-400">{row.pass3}</td>
                    <td className="py-3.5 pr-4 font-mono text-[#C4BFB6]">{row.frontierRef}</td>
                    <td className="py-3.5 text-[#C4BFB6]">{row.mechanism}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-emerald-500/40 bg-emerald-500/5 font-mono">
                  <td className="py-4 pr-4 font-bold text-white">
                    100-Point Composite Intelligence Score
                  </td>
                  <td className="py-4 pr-4 text-white">662 Total Items</td>
                  <td className="py-4 pr-4 text-[#8F8A82]">0.00 / 100</td>
                  <td className="py-4 pr-4 text-[#C4BFB6]">43.00 / 100</td>
                  <td className="py-4 pr-4 text-[#C4BFB6]">79.03 / 100</td>
                  <td className="py-4 pr-4 text-base font-bold text-emerald-400">86.12 / 100</td>
                  <td className="py-4 pr-4 text-[#C4BFB6]">
                    DeepSeek 1017: 78.16 · Opus 4.6: 80.55..85.00 · o1: 87.54
                  </td>
                  <td className="py-4 text-emerald-300">
                    Full 5-Stage Neuro-Symbolic + Optimal Transport Stack
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#252833] bg-[#0E1015] p-6">
            <h2 className="font-display text-xl uppercase tracking-wide text-white">
              2. Five Proprietary Architectural Advantages
            </h2>
            <ul className="mt-4 space-y-3 text-xs leading-relaxed text-[#C4BFB6]">
              <li>
                <strong className="text-white">
                  1. 12,304-Equation 288-Bit Context Router &amp; Spectral Orthogonalization:
                </strong>{" "}
                Maps every prompt into a 288-bit situational context mask, orthogonalizes collinear
                equation clusters via spectral decomposition, and bounds log-odds updates via
                Positive-Part James-Stein shrinkage (|delta log-odds| &lt;= 0.35).
              </li>
              <li>
                <strong className="text-white">
                  2. Iterative Sinkhorn-Knopp Entropic Optimal Transport:
                </strong>{" "}
                Replaces Gaussian independence assumptions with 40-iteration log-domain
                Sinkhorn-Knopp scaling (epsilon = 0.15) across 10,000 correlated world trajectories,
                converging to L1 marginal residual = 1.39e-16.
              </li>
              <li>
                <strong className="text-white">
                  3. VectifyAI/PageIndex Vectorless Hierarchical Tree RAG:
                </strong>{" "}
                Navigates document AST hierarchies across 257 research PDFs and 25 graduate
                textbooks (BK-01..BK-25) without chunk-boundary loss, achieving 10/10 multi-hop
                recall in 0.504ms vs 1/10 for fixed-chunk cosine similarity.
              </li>
              <li>
                <strong className="text-white">
                  4. Romano Conformalized Quantile Regression (CQR) &amp; Kadavath P(IK):
                </strong>{" "}
                Calibrates predictive intervals on 15,969 empirical out-of-sample rows and abstains
                when epistemic self-evaluation P(IK) falls below the market hurdle.
              </li>
              <li>
                <strong className="text-white">
                  5. Auto-Exacto Tool-Call Healing &amp; Native JSON-RPC 2.0 MCP Server:
                </strong>{" "}
                Automatically repairs malformed markdown-fenced or trailing-comma tool arguments for
                100/100 OpenRouter Exacto compliance.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-[#252833] bg-[#0E1015] p-6">
            <h2 className="font-display text-xl uppercase tracking-wide text-white">
              3. Live OpenRouter Endpoints &amp; Verification Links
            </h2>
            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="rounded-xl border border-[#252833] bg-[#08090C] p-3">
                <p className="text-[10px] uppercase text-[#8F8A82]">OpenAI-Compatible Base URL</p>
                <p className="mt-1 text-emerald-400">
                  https://www.galaxysportsedge.com/api/openrouter/v1
                </p>
              </div>
              <div className="rounded-xl border border-[#252833] bg-[#08090C] p-3">
                <p className="text-[10px] uppercase text-[#8F8A82]">Models API URL (/models)</p>
                <Link
                  href="/api/openrouter/v1/models"
                  className="mt-1 block text-emerald-400 underline"
                >
                  https://www.galaxysportsedge.com/api/openrouter/v1/models
                </Link>
              </div>
              <div className="rounded-xl border border-[#252833] bg-[#08090C] p-3">
                <p className="text-[10px] uppercase text-[#8F8A82]">
                  Zero Data Retention &amp; Data Governance Policy
                </p>
                <Link href="/data-policy" className="mt-1 block text-emerald-400 underline">
                  https://www.galaxysportsedge.com/data-policy
                </Link>
              </div>
              <div className="rounded-xl border border-[#252833] bg-[#08090C] p-3">
                <p className="text-[10px] uppercase text-[#8F8A82]">
                  Privacy Policy &amp; Terms of Service
                </p>
                <div className="mt-1 flex flex-wrap gap-4">
                  <Link href="/privacy" className="text-emerald-400 underline">
                    https://www.galaxysportsedge.com/privacy
                  </Link>
                  <Link href="/terms" className="text-emerald-400 underline">
                    https://www.galaxysportsedge.com/terms
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
