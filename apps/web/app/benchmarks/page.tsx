import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { QUAD_FRONTIER_SOVEREIGN_SPINE } from "@/lib/jarvis/stealth-skeleton-brain";

export const metadata: Metadata = {
  title:
    "Benchmarks & Verification Dossier | Galaxy Sports Edge",
  description:
    "14 recorded prompt/completion items (8 OpenRouter suites + 6 LiveBench categories, all passing) backed by raw JSONL records, and the independently re-counted 21,419-equation (26 Layers L01..L26) structural verification registry. The earlier 95.93 composite draft is withdrawn: no item-level records back it.",
  alternates: { canonical: "/benchmarks" },
};

const OPENROUTER_8SUITE_AND_LIVEBENCH_SUITES = [
  {
    suite: "1. Tau2-Bench Airline (Multi-Turn Policy & Tool State)",
    category: "OpenRouter 8-Suite",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "2. Media / Sketch (SVG Spatial Topology & Schematic Reasoning)",
    category: "OpenRouter 8-Suite",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "3. GPQA-Diamond (PhD Physics, Quantum & Organic Chemistry)",
    category: "OpenRouter 8-Suite",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "4. VGI-Bench (Vector Graphic & Chart Data Extraction)",
    category: "OpenRouter 8-Suite",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "5. BrowseComp (Multi-Hop Web & Registry Reconciliation)",
    category: "OpenRouter 8-Suite",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "6. DeepSearchQA (Multi-Document Causal & Mathematical Synthesis)",
    category: "OpenRouter 8-Suite",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "7. Humanity's Last Exam (HLE: Frontier Math, Cohomology & Information Theory)",
    category: "OpenRouter 8-Suite",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "8. WideSearch (Broad-Coverage 32-Team & 26-Layer Table Completeness)",
    category: "OpenRouter 8-Suite",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "9. LiveBench-Math (AMPS Hard, SMC & Olympiad Proof State)",
    category: "LiveBench (ICLR 2025, arXiv:2406.19314v2)",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "10. LiveBench-Coding (AtCoder / LeetCode Hard AST Synthesis & Completion)",
    category: "LiveBench (ICLR 2025, arXiv:2406.19314v2)",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "11. LiveBench-Reasoning (Web of Lies v2, Zebra Puzzle & Spatial)",
    category: "LiveBench (ICLR 2025, arXiv:2406.19314v2)",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "12. LiveBench-Language (Connections, Plot Unscrambling & Typos)",
    category: "LiveBench (ICLR 2025, arXiv:2406.19314v2)",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "13. LiveBench-IF (Strict Format, Paraphrase & Constraint Verification)",
    category: "LiveBench (ICLR 2025, arXiv:2406.19314v2)",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
  {
    suite: "14. LiveBench-DataAnalysis (Table Join, Imputation & Schema Migration)",
    category: "LiveBench (ICLR 2025, arXiv:2406.19314v2)",
    items: "1 recorded item",
    score: "100.00 / 100",
    mechanism: "Deterministic grader: programmatic_score 1.0 in raw JSONL",
  },
] as const;

const REGISTRY_INVENTORY = [
  {
    component: "1. Equation registry (8 catalogs, 26 layers L01..L26)",
    verified: "21,419 lines re-counted per-source; executor ran 21,419 executions; 0 NaN/Inf/errors; input-sensitive",
    status: "EXECUTED",
  },
  {
    component: "2. Canonical entities",
    verified: "6,558 entities exact; LV pairing raises as designed (raises, not silent skips)",
    status: "EXECUTED",
  },
  {
    component: "3. Stage 1A coaching summaries",
    verified: "Populated 19/19 dossiers",
    status: "EXECUTED",
  },
  {
    component: "4. Stage 1B scheme-family diversity",
    verified: "Uniformity fixed: families 259-277 per dossier; legacy constants removed",
    status: "FIXED",
  },
  {
    component: "5. Resealing check",
    verified: "114/114 resealed records match (honest mismatch reporting)",
    status: "EXECUTED",
  },
  {
    component: "6. 35,119-item draft (95.93 composite)",
    verified: "WITHDRAWN: zero item-level records; byte-identical to the 16,283-item file; receipt hash mismatch",
    status: "REFUTED",
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
              Benchmark &amp; Verification Dossier
            </span>
            <span className="font-mono text-xs text-[#8F8A82]">
              95.93 draft withdrawn Nov 7 with no item-level records
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl uppercase tracking-tight text-white sm:text-5xl">
            Benchmarks, Calibration &amp; Verification
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-[#C4BFB6] sm:text-base">
            What is actually verified: {" "}
            <strong className="text-white">14 recorded prompt/completion items</strong> (8 OpenRouter
            suites + 6 LiveBench categories, all passing) backed by raw JSONL records, and the{" "}
            <strong className="text-emerald-400">21,419-equation registry across 26 reasoning
            layers (L01..L26)</strong>: independently re-counted, executed end-to-end (0 NaN/Inf/errors),
            and resealed 114/114. The earlier <strong className="text-white">35,119-item draft
            (95.93 composite) is withdrawn</strong>: it has zero item-level records and cannot stand
            as a verified score.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#252833] bg-[#08090C] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#8F8A82]">
                Recorded Items (raw JSONL)
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">14 Items</p>
              <p className="mt-0.5 text-xs text-[#8F8A82]">8 suites + 6 categories · all passing · N=1 each</p>
            </div>
            <div className="rounded-2xl border border-[#252833] bg-[#08090C] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#8F8A82]">
                Wired Equations (L01..L26)
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-white">21,419 / 21,419</p>
              <p className="mt-0.5 text-xs text-[#8F8A82]">8 Catalogs · 26 Layers · 0 Placeholders</p>
            </div>
            <div className="rounded-2xl border border-[#252833] bg-[#08090C] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#8F8A82]">
                Canonical Entities
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-emerald-400">6,558</p>
              <p className="mt-0.5 text-xs text-[#8F8A82]">Exact match · 19/19 dossiers summarized</p>
            </div>
            <div className="rounded-2xl border border-[#252833] bg-[#08090C] p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#8F8A82]">
                35,119 Draft (95.93)
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-amber-400">Withdrawn</p>
              <p className="mt-0.5 text-xs text-[#8F8A82]">Zero item-level records · receipt hash mismatch</p>
            </div>
          </div>
        </header>

        {/* Quad-Frontier Sovereign Spine 4-Pillar Section */}
        <section className="mt-10 rounded-3xl border border-[#252833] bg-[#0E1015] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl uppercase tracking-wide text-white">
              1. Quad-Frontier Sovereign Spine Architecture (4 Frontier Pillars)
            </h2>
            <span className="font-mono text-xs text-emerald-400">
              Theorem 7 Cellular Sheaf Consensus · Snell Compute-Optimal Rollouts (N = 4 → 16 → 64)
            </span>
          </div>
          <p className="mt-1 text-xs text-[#C4BFB6]">
            Every stage of the GSE &amp; GSI engine routes across our stealth-skeleton reasoning
            pillars and merges log-odds updates via Cellular Sheaf Laplacian cohomology and
            Positive-Part James-Stein shrinkage capped at |Δ log-odds| ≤ 0.35. Pillar routing
            labels are descriptive; only the deterministic grader outputs in Section 2 and the
            re-counted registry in Section 3 are scored.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUAD_FRONTIER_SOVEREIGN_SPINE.map((pillar) => (
              <div
                key={pillar.pillarId}
                className="rounded-2xl border border-[#252833] bg-[#08090C] p-5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase text-emerald-400">
                    {pillar.pillarId}
                  </span>
                  <span className="rounded bg-[#141720] px-2 py-0.5 font-mono text-[10px] text-[#C4BFB6]">
                    Weight {pillar.sheafWeightPrior.toFixed(2)}
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg text-white">{pillar.displayName}</h3>
                <p className="mt-1 font-mono text-xs text-amber-400">
                  Context Window: {(pillar.contextWindow / 1000).toLocaleString()}K Tokens
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#C4BFB6]">{pillar.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* OpenRouter 8-Suite + LiveBench Item-Level Verified Section */}
        <section className="mt-10 rounded-3xl border border-[#252833] bg-[#0E1015] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl uppercase tracking-wide text-white">
              2. Recorded Items: OpenRouter 8-Suite + LiveBench (100.00 / 100, N=1 per suite)
            </h2>
            <span className="font-mono text-xs text-emerald-400">
              14 Recorded Prompt/Completion Items · LiveBench ICLR 2025 (arXiv:2406.19314v2)
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8F8A82]">
            Item-by-item deterministic evaluation backed by raw prompt/completion JSONL records (
            <code className="text-emerald-400">
              data/audits/stealth_skeleton_openrouter_8suite_livebench_raw_completions_2026_11_07.jsonl
            </code>
            ): 14 rows (8 OpenRouter suites + 6 LiveBench categories), programmatic_score 1.0 on every
            row: smoke coverage (N=1 per suite), not a sized benchmark. Composite{" "}
            <strong className="text-emerald-400">100.00 / 100</strong>.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#252833] font-mono text-[10px] uppercase tracking-wider text-[#8F8A82]">
                  <th className="py-3 pr-4">Suite Name</th>
                  <th className="py-3 pr-4">Benchmark Family</th>
                  <th className="py-3 pr-4">Recorded Prompts</th>
                  <th className="py-3 pr-4 text-emerald-400">Verified Score</th>
                  <th className="py-3">Deterministic Ground-Truth Grader Mechanism</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252833]/60">
                {OPENROUTER_8SUITE_AND_LIVEBENCH_SUITES.map((row) => (
                  <tr key={row.suite} className="hover:bg-[#141720]">
                    <td className="py-3 pr-4 font-semibold text-white">{row.suite}</td>
                    <td className="py-3 pr-4 font-mono text-[#C4BFB6]">{row.category}</td>
                    <td className="py-3 pr-4 font-mono text-emerald-300">{row.items}</td>
                    <td className="py-3 pr-4 font-mono font-bold text-emerald-400">{row.score}</td>
                    <td className="py-3 text-[#C4BFB6]">{row.mechanism}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-emerald-500/40 bg-emerald-500/5 font-mono">
                  <td className="py-4 pr-4 font-bold text-white">
                    Combined 14-Item Recorded Composite
                  </td>
                  <td className="py-4 pr-4 text-[#C4BFB6]">
                    OpenRouter 8-Suite (8/8) + LiveBench 6-Cat (6/6)
                  </td>
                  <td className="py-4 pr-4 font-bold text-emerald-400">14 JSONL Rows</td>
                  <td className="py-4 pr-4 text-base font-bold text-emerald-400">100.00 / 100</td>
                  <td className="py-4 text-emerald-300">
                    stealth-skeleton/skeleton-alpha (HF &amp; OpenRouter Ready)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Structural Corpus & 26-Layer Wiring Inventory (verified by independent recount) */}
        <section className="mt-10 rounded-3xl border border-[#252833] bg-[#0E1015] p-6 sm:p-8">
          <h2 className="font-display text-2xl uppercase tracking-wide text-white">
            3. Structural Corpus &amp; 26-Layer Wiring Inventory (Independently Re-Counted)
          </h2>
          <p className="mt-1 text-xs text-[#8F8A82]">
            Registry facts verified by the Nov 7 fleet adjudication (independent recount +
            executor run). The 35,119-item / 95.93 draft below is WITHDRAWN: zero item-level
            records. No composite score is claimed for the registry; the inventory is the claim.
          </p>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#252833] font-mono text-[10px] uppercase tracking-wider text-[#8F8A82]">
                  <th className="py-3 pr-4">Component</th>
                  <th className="py-3 pr-4">Verified Fact (Nov 7 adjudication)</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#252833]/60">
                {REGISTRY_INVENTORY.map((row) => (
                  <tr key={row.component} className="hover:bg-[#141720]">
                    <td className="py-3.5 pr-4 font-semibold text-white">{row.component}</td>
                    <td className="py-3.5 pr-4 font-mono text-[#C4BFB6]">{row.verified}</td>
                    <td className="py-3.5 font-mono font-bold text-emerald-400">{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-[#252833] bg-[#0E1015] p-6">
            <h2 className="font-display text-xl uppercase tracking-wide text-white">
              4. Five Verified Architectural Pillars
            </h2>
            <ul className="mt-4 space-y-3 text-xs leading-relaxed text-[#C4BFB6]">
              <li>
                <strong className="text-white">
                  1. 21,419-Equation Registry Across 26 Reasoning Layers (L01..L26):
                </strong>{" "}
                Maps all 8 equation catalogs into 26 deterministic reasoning layers, orthogonalizes
                collinear clusters via Stage C spectral decomposition, and bounds log-odds updates
                via Stage D Positive-Part James-Stein shrinkage (|Δ log-odds| ≤ 0.35).
              </li>
              <li>
                <strong className="text-white">
                  2. Sovereign Spine Routing &amp; Cellular Sheaf Cohomology:
                </strong>{" "}
                Routes across our stealth-skeleton reasoning pillars (see Section 1; pillar model
                identities are unverified routing labels) and enforces Cellular Sheaf
                global-section consistency before any recommendation clears the Stage 5
                Conjunction Gate.
              </li>
              <li>
                <strong className="text-white">
                  3. VectifyAI/PageIndex Vectorless Hierarchical Tree RAG:
                </strong>{" "}
                Navigates document AST hierarchies across the research PDF corpus and graduate
                monographs (BK-01..BK-25 + GAP-01..08) without chunk-boundary loss.
              </li>
              <li>
                <strong className="text-white">
                  4. Barber Weighted Conformal Bounds &amp; P(IK) Abstention:
                </strong>{" "}
                Calibrates predictive intervals across market and prop resolutions and enforces
                strict PASS discipline when epistemic certainty falls below the de-vigged market
                hurdle. Coverage re-measurement is pending.
              </li>
              <li>
                <strong className="text-white">
                  5. GSI Bare-Metal C++20 STM32H7 Clinical Biomechanics Kernels:
                </strong>{" "}
                Executes corpus callosum strain, head-injury, and viscoelastic braiding models on
                embedded targets. Lab latency figures are pending re-benchmark on-device.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-[#252833] bg-[#0E1015] p-6">
            <h2 className="font-display text-xl uppercase tracking-wide text-white">
              5. Live Multi-Platform Endpoints &amp; Verification Links
            </h2>
            <div className="mt-4 space-y-3 font-mono text-xs">
              <div className="rounded-xl border border-[#252833] bg-[#08090C] p-3">
                <p className="text-[10px] uppercase text-[#8F8A82]">
                  Cloudflare Global Edge Worker (Primary OpenRouter Gateway)
                </p>
                <p className="mt-1 text-emerald-400">
                  https://gse-stealth-skeleton-provider.baxley-garrett.workers.dev/v1
                </p>
              </div>
              <div className="rounded-xl border border-[#252833] bg-[#08090C] p-3">
                <p className="text-[10px] uppercase text-[#8F8A82]">
                  Vercel Production Edge OpenAI-Compatible Base URL
                </p>
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
                  Interactive Ask-the-Edge Quad-Frontier Analyst API
                </p>
                <Link href="/api/ask-edge" className="mt-1 block text-emerald-400 underline">
                  https://www.galaxysportsedge.com/api/ask-edge
                </Link>
              </div>
              <div className="rounded-xl border border-[#252833] bg-[#08090C] p-3">
                <p className="text-[10px] uppercase text-[#8F8A82]">
                  Zero Data Retention, Privacy Policy &amp; Terms of Service
                </p>
                <div className="mt-1 flex flex-wrap gap-4">
                  <Link href="/data-policy" className="text-emerald-400 underline">
                    /data-policy
                  </Link>
                  <Link href="/privacy" className="text-emerald-400 underline">
                    /privacy
                  </Link>
                  <Link href="/terms" className="text-emerald-400 underline">
                    /terms
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
