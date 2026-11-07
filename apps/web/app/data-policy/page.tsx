import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";

export const metadata: Metadata = {
  title: "Zero Data Retention (ZDR) & Provider Data Policy | Galaxy Sports Edge & GSI",
  description:
    "Official OpenRouter Provider Data Policy and Zero Data Retention (ZDR) specification for GSE Stealth-Skeleton v2.4.0 inference endpoints.",
  alternates: { canonical: "/data-policy" },
};

export default function DataPolicyPage(): JSX.Element {
  return (
    <div className="min-h-screen w-full bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-[#252833] bg-[#0E1015] p-8">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Zero Data Retention (ZDR) Enforced · OpenRouter Provider Compliance
          </span>
          <h1 className="mt-4 font-display text-3xl uppercase tracking-tight text-white sm:text-4xl">
            Provider Data Policy &amp; Zero Data Retention (ZDR) Architecture
          </h1>
          <p className="mt-2 text-xs text-[#8F8A82]">
            Effective Date: November 6, 2026 · Applies to all{" "}
            <code className="text-emerald-400">gse/skeleton-*</code> models served via OpenRouter
            and direct enterprise APIs.
          </p>
        </header>

        <div className="mt-8 space-y-6 rounded-3xl border border-[#252833] bg-[#0E1015] p-8 text-sm leading-relaxed text-[#C4BFB6]">
          <section>
            <h2 className="font-display text-xl uppercase tracking-wide text-white">
              1. Strict Zero Data Retention (ZDR) by Default
            </h2>
            <p className="mt-2">
              Galaxy Sports Edge &amp; Galaxy Sports Institute operate all{" "}
              <code className="text-emerald-400">gse/skeleton-*</code> inference endpoints under a
              strict <strong>Zero Data Retention (ZDR)</strong> policy. Customer prompts, system
              instructions, tool-call payloads, and model completions are processed exclusively in
              volatile memory for the duration of the HTTP/SSE request and are{" "}
              <strong>never written to disk, database tables, or persistent log files</strong>{" "}
              (retention duration: <strong>0 seconds</strong>).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl uppercase tracking-wide text-white">
              2. Zero Model Training on Customer Prompts or Completions
            </h2>
            <p className="mt-2">
              We <strong>never</strong> train, fine-tune, distill, or evaluate our models on
              OpenRouter user prompts or completions. Every request automatically enforces{" "}
              <code className="text-emerald-400">provider.data_collection: &quot;deny&quot;</code>{" "}
              semantics and emits the response header{" "}
              <code className="text-emerald-400">X-GSE-Zero-Data-Retention: enforced</code>.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl uppercase tracking-wide text-white">
              3. Pre-Execution PII Scrubbing &amp; 3-Way MaaS License Gate
            </h2>
            <p className="mt-2">
              Before any token reaches the neuro-symbolic router, an in-memory regex and AST
              scrubber strips accidental bearer tokens, API keys, email addresses, and payment
              identifiers. Outbound responses pass through a deterministic 3-way Models-as-a-Service
              (MaaS) license gate ensuring only clean mathematical, analytical, and synthetic
              reasoning outputs are returned.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl uppercase tracking-wide text-white">
              4. Infrastructure, Subprocessors &amp; Security Controls
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>
                <strong>Edge TLS &amp; Global Routing:</strong> Cloudflare Enterprise Edge Network
                (TLS 1.3, mTLS worker-to-origin, DDoS protection, W3C{" "}
                <code>traceparent</code> telemetry without payload logging).
              </li>
              <li>
                <strong>Application &amp; API Hosting:</strong> Vercel (US East / Global Edge) and
                dedicated NVIDIA Hopper/Blackwell TensorRT-LLM / vLLM FP8 inference nodes.
              </li>
              <li>
                <strong>Security Documentation Available on Request:</strong> Network Architecture
                Diagram, Automated SAST/Penetration Test Audit Report, and Completed Provider
                Security Questionnaire.
              </li>
            </ul>
          </section>

          <div className="pt-4 text-xs text-[#8F8A82]">
            Related documents:{" "}
            <Link href="/benchmarks" className="text-emerald-400 underline">
              Benchmark Dossier
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="text-emerald-400 underline">
              Privacy Policy
            </Link>{" "}
            ·{" "}
            <Link href="/terms" className="text-emerald-400 underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
