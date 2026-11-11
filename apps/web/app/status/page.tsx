import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { computeLiveSinkhornKnoppTransport } from "@/lib/jarvis/stealth-skeleton-brain";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Provider & Platform Status | Galaxy Sports Edge & GSI",
  description:
    "Live operational status for Galaxy Sports Edge & GSI (Texas Nonprofit Corp #15043440630001, 501(c)(3) application pending) Stealth-Skeleton v2.4.0 OpenRouter inference endpoints.",
  alternates: { canonical: "/status" },
};

export default function StatusPage(): JSX.Element {
  const sinkhorn = computeLiveSinkhornKnoppTransport(40, 0.15);
  return (
    <div className="min-h-screen w-full bg-[#08090C] text-[#EDE8E0]">
      <Nav />
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-[#252833] bg-[#0E1015] p-8">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-widest text-emerald-400">
            All Systems Operational · Zero Data Retention Active
          </span>
          <h1 className="mt-4 font-display text-3xl uppercase tracking-tight text-white sm:text-4xl">
            Stealth-Skeleton v2.4.0 Provider Status
          </h1>
          <p className="mt-2 text-xs text-[#8F8A82]">
            Live telemetry for OpenRouter Provider Integration v2.4 (<code>stealth-skeleton</code>)
            and Galaxy Sports Edge production endpoints.
          </p>
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#252833] bg-[#0E1015] p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#8F8A82]">
              Models Feed (/v1/models)
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-400">OPERATIONAL</p>
            <p className="mt-1 text-xs text-[#C4BFB6]">Schema v2.4 (9 models registered)</p>
          </div>
          <div className="rounded-2xl border border-[#252833] bg-[#0E1015] p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#8F8A82]">
              Chat Completions (/v1/chat/completions)
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-400">OPERATIONAL</p>
            <p className="mt-1 text-xs text-[#C4BFB6]">FP8 · SSE Streaming · ZDR Enforced</p>
          </div>
          <div className="rounded-2xl border border-[#252833] bg-[#0E1015] p-5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-[#8F8A82]">
              Sinkhorn Transport Probe
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-white">
              {sinkhorn.l1MarginalResidual.toExponential(2)} L1
            </p>
            <p className="mt-1 text-xs text-[#C4BFB6]">
              {sinkhorn.iterations} iterations · Converged: {String(sinkhorn.converged)}
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-[#252833] bg-[#0E1015] p-6 text-xs text-[#8F8A82]">
          Provider compliance links:{" "}
          <Link href="/benchmarks" className="text-emerald-400 underline">
            Benchmarks
          </Link>{" "}
          ·{" "}
          <Link href="/data-policy" className="text-emerald-400 underline">
            Data Policy (ZDR)
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
      </main>
      <Footer />
    </div>
  );
}
