import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Developer & API — Galaxy Sports Edge Intelligence Layer",
  description:
    "Access the Galaxy Sports Edge intelligence layer via API. Market signals, pick provenance, confidence scores, and line movement — structured and source-traceable.",
  alternates: { canonical: "/developer" },
  openGraph: {
    title: `Developer & API — ${BRAND_NAME}`,
    description:
      "Structured, source-traceable sports intelligence via API. For approved developer and media partners.",
  },
};

const ENDPOINTS_PREVIEW = [
  { method: "GET", path: "/v1/picks/today", desc: "Today's published pick slate with confidence scores and factor trail.", tier: "Pro+" },
  { method: "GET", path: "/v1/market-gravity/{gameId}", desc: "Line movement summary: open, current, speed, book disagreement.", tier: "Pro+" },
  { method: "GET", path: "/v1/ledger/recent", desc: "Last 30 settled picks with factor snapshot at time of publication.", tier: "Elite" },
  { method: "GET", path: "/v1/signals/weak", desc: "Rumor Radar signals with source tier and verification status.", tier: "Elite" },
  { method: "POST", path: "/v1/brain/query", desc: "Submit a structured sports intelligence question. Returns confidence-weighted answer with evidence.", tier: "Elite" },
] as const;

const USE_CASES = [
  { title: "Daily fantasy research apps", body: "Pull role changes, usage signals, and injury risk into your DFS lineup tool." },
  { title: "Betting research tools", body: "Access line movement, book disagreement, and pick provenance for independent research." },
  { title: "Sports analytics platforms", body: "Ingest settled picks and factor snapshots for model calibration and backtesting." },
  { title: "Media and editorial", body: "Query the Research Brain for structured, source-attributed sports intelligence." },
  { title: "B2B data integrations", body: "White-label intelligence data for media brands, daily fantasy platforms, and sportsbook research tools." },
] as const;

export default function DeveloperPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-gray-800 bg-[radial-gradient(circle_at_40%_0%,rgba(0,229,255,0.10),transparent_35%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 inline-flex items-center gap-2 border border-cyan-900 bg-cyan-950/40 px-3 py-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-300">Waitlist</span>
              <span className="text-xs text-cyan-200">API access opening to approved partners</span>
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">Developer & API</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Intelligence layer. Structured. Source-traceable.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              The full Galaxy Sports Edge intelligence layer — picks, market gravity, ledger, rumor signals — available via structured API for approved developer partners.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/contact" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200">
                Request API access
              </Link>
              <Link href="/methodology" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300">
                Data methodology
              </Link>
            </div>
          </div>
        </section>

        {/* Endpoints preview */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Endpoint preview</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">What the API exposes</h2>
              <p className="mt-3 text-sm text-gray-400">
                The following endpoints are planned for the v1 API. Access requires an approved partner account.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {ENDPOINTS_PREVIEW.map((ep) => (
                <div key={ep.path} className="border border-gray-800 bg-gray-900/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-cyan-300">{ep.method}</span>
                      <code className="font-mono text-sm text-white">{ep.path}</code>
                    </div>
                    <span className="border border-gray-700 bg-gray-800/50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-400">
                      {ep.tier}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{ep.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="border-y border-gray-800 bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Use cases</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Who the API is for</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {USE_CASES.map(({ title, body }) => (
                <div key={title} className="border border-gray-800 bg-gray-950/60 p-5">
                  <h3 className="text-base font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* API principles */}
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">API principles</p>
            <h2 className="mt-2 text-2xl font-bold text-white">What the API will never do</h2>
            <ul className="mt-4 flex flex-col gap-2 text-sm text-gray-400">
              {[
                "Fabricate picks, odds, injury reports, or source attributions",
                "Claim verified win-rate performance without settled-pick backing",
                "Surface sharp-money claims without specific movement data",
                "Return unverified rumor as confirmed news",
                "Provide auto-bet or auto-execute endpoints",
              ].map((r) => (
                <li key={r} className="flex gap-3">
                  <span className="mt-0.5 text-red-400 shrink-0">✕</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-gray-800 bg-gray-900/35 px-4 py-16 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">Partner access</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Join the API waitlist.</h2>
            <p className="mt-4 text-base text-gray-400">
              API access is opening to approved developer and media partners. Contact us to join the waitlist and discuss use cases.
            </p>
            <Link href="/contact" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-6 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200">
              Contact for API access
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
