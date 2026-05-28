import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Rumor Radar — Weak Signal Watchlist | Galaxy Sports Edge",
  description:
    "Unverified chatter, watchlist signals, and contradicted rumors — separated from verified news and clearly labeled.",
  alternates: { canonical: "/rumor-radar" },
  openGraph: {
    title: `Rumor Radar — ${BRAND_NAME}`,
    description:
      "Source-tiered weak-signal watchlist. Watchlist only. Rumors are never published as fact.",
  },
};

const DEMO_SIGNALS = [
  {
    id: "s1",
    subject: "Starting QB questionable for Sunday",
    sport: "NFL",
    team: "BUF",
    volume: "HIGH",
    verified: false,
    official: false,
    contradicted: false,
    sourceCount: 3,
    sourceTypes: ["Social", "Beat reporter (unconfirmed)"],
    status: "WATCHLIST",
    note: "Unverified chatter increased on Thursday. No official team injury designation. Needs primary-source confirmation before actionable.",
    updatedAt: "2026-05-28T14:30:00Z",
  },
  {
    id: "s2",
    subject: "Trade involving WR2 reportedly imminent",
    sport: "NBA",
    team: "LAL",
    volume: "MOD",
    verified: false,
    official: false,
    contradicted: true,
    sourceCount: 2,
    sourceTypes: ["National reporter", "Official statement (denied)"],
    status: "CONTRADICTED",
    note: "Team officially denied via PR on 5/27. Original report remains unverified. Treat as inactive until official confirmation.",
    updatedAt: "2026-05-27T20:00:00Z",
  },
  {
    id: "s3",
    subject: "Closer likely to be skipped in series",
    sport: "MLB",
    team: "NYY",
    volume: "LOW",
    verified: true,
    official: true,
    contradicted: false,
    sourceCount: 1,
    sourceTypes: ["Official manager comment"],
    status: "VERIFIED",
    note: "Manager confirmed in press conference. Official source. Usable as confirmed intelligence.",
    updatedAt: "2026-05-28T12:00:00Z",
  },
] as const;

const SOURCE_TIERS = [
  { tier: "1 — Official", desc: "Team / league press release, official injury report, manager/coach press conference on record.", color: "text-emerald-300" },
  { tier: "2 — Beat verified", desc: "Credentialed beat reporter with direct access, confirmed on record.", color: "text-cyan-300" },
  { tier: "3 — National unverified", desc: "National media report without primary-source attribution. Requires Tier 1/2 confirmation.", color: "text-yellow-300" },
  { tier: "4 — Social / chatter", desc: "Social media, forums, podcasts without sourcing. Watchlist only — not actionable.", color: "text-red-300" },
] as const;

const STATUS_STYLES: Record<string, string> = {
  VERIFIED: "text-emerald-300 border-emerald-800 bg-emerald-950/30",
  WATCHLIST: "text-yellow-300 border-yellow-800 bg-yellow-950/30",
  CONTRADICTED: "text-red-300 border-red-900 bg-red-950/30",
};

export default function RumorRadarPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-gray-800 bg-[radial-gradient(circle_at_70%_30%,rgba(255,100,112,0.10),transparent_35%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-4 inline-flex items-center gap-2 border border-yellow-900 bg-yellow-950/40 px-3 py-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-yellow-300">Preview</span>
              <span className="text-xs text-yellow-200">Weak-signal detection layer in development</span>
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">Rumor Radar</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Rumors separated from facts.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              Weak signals, unverified chatter, and contradicted reports — labeled by source tier and verification status, not published as news.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-gray-400">
              Rumor Radar is a watchlist product. It never publishes unverified injury or personnel information as fact. Source tier and verification status are shown on every signal.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-cyan-300 px-5 py-3 text-sm font-bold text-gray-950 hover:bg-cyan-200">
                Get access
              </Link>
              <Link href="/methodology" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300">
                Source standards
              </Link>
            </div>
          </div>
        </section>

        {/* Demo signals */}
        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-yellow-300">Demo · Sample signals only</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Signal watchlist demo</h2>
              </div>
              <p className="max-w-xs text-sm text-gray-500 sm:text-right">
                Illustrative signals. No real injury or rumor data. Watchlist only.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {DEMO_SIGNALS.map((s) => (
                <article key={s.id} className="border border-gray-800 bg-gray-900/60 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">{s.sport} · {s.team}</p>
                      <h3 className="mt-1 text-lg font-bold text-white">{s.subject}</h3>
                    </div>
                    <span className={`border px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.14em] ${STATUS_STYLES[s.status] ?? ""}`}>
                      {s.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{s.note}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs">
                    <span className="text-gray-500">Sources: {s.sourceCount}</span>
                    <span className="text-gray-500">Types: {s.sourceTypes.join(", ")}</span>
                    <span className="text-gray-500">Volume: {s.volume}</span>
                    {s.official && <span className="text-emerald-400">Official confirmed</span>}
                    {s.contradicted && <span className="text-red-400">Contradicted by official</span>}
                  </div>
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-gray-700">
                    DEMO · Illustrative only
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Source tiers */}
        <section className="border-y border-gray-800 bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Source hierarchy</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Not all sources are equal.</h2>
              <p className="mt-3 max-w-2xl text-sm text-gray-400">
                Every signal is labeled with its source tier. A Tier 4 watchlist signal is never published alongside a Tier 1 verified fact without clear separation.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              {SOURCE_TIERS.map(({ tier, desc, color }) => (
                <div key={tier} className="flex gap-4 border border-gray-800 bg-gray-950/60 p-4">
                  <span className={`font-mono text-sm font-bold ${color} min-w-[120px]`}>{tier}</span>
                  <span className="text-sm text-gray-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Language rules */}
        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-300">Language policy</p>
            <h2 className="mt-2 text-2xl font-bold text-white">What Rumor Radar says — and does not say</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="border border-emerald-900 bg-emerald-950/20 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300">We say</p>
                <ul className="mt-3 flex flex-col gap-1 text-sm text-emerald-200">
                  <li>"Unverified chatter increased"</li>
                  <li>"Watchlist only"</li>
                  <li>"Needs primary-source verification"</li>
                  <li>"No official confirmation found"</li>
                  <li>"Contradicted by official source"</li>
                </ul>
              </div>
              <div className="border border-red-900 bg-red-950/20 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-red-300">We never say</p>
                <ul className="mt-3 flex flex-col gap-1 text-sm text-red-200">
                  <li>"Confirmed injury" (without Tier 1)</li>
                  <li>"Breaking: player is out"</li>
                  <li>"Source says" (without verification)</li>
                  <li>Rumor as headline fact</li>
                  <li>Accusation or legal claim as unverified</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
