import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_COLORS } from "@/lib/brand";
import {
  FANTASY_BASELINE_MODULES,
  FANTASY_BASELINE_SOURCES,
  fantasyBaselineSummary,
  type FantasyBaselineStatus,
} from "@/lib/fantasy/competitive-baseline";

export const metadata: Metadata = {
  title: "Fantasy Baseline Map - Galaxy Fantasy",
  description:
    "LineStar and Fantasy Guru / Elite Sports feature baseline mapped to Galaxy Fantasy surfaces, live proof, and data gates.",
  alternates: { canonical: "/fantasy/baseline" },
};

const STATUS_LABEL: Record<FantasyBaselineStatus, string> = {
  "live-proof": "live proof",
  "csv-import-ready": "CSV import ready",
  "gated-data": "gated data",
  "content-ready": "content ready",
  "manual-community": "manual community",
};

const STATUS_TONE: Record<FantasyBaselineStatus, string> = {
  "live-proof": "border-verify/30 bg-verify/10 text-verify",
  "csv-import-ready": "border-ion-blue/30 bg-ion-blue/10 text-ion-blue",
  "gated-data": "border-caution/30 bg-caution/10 text-caution",
  "content-ready": "border-ultraviolet/30 bg-ultraviolet/10 text-ultraviolet",
  "manual-community": "border-titanium bg-carbon/70 text-ion-1",
};

export default function FantasyBaselinePage(): JSX.Element {
  const summary = fantasyBaselineSummary();

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />
      <main className="flex-1">
        <section className="border-b border-mineral px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
              Competitive baseline
            </p>
            <div className="mt-4 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
              <div>
                <h1 className="max-w-4xl font-display text-4xl font-semibold leading-[1.02] text-white sm:text-6xl">
                  LineStar plus Elite Sports is the floor.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-ink-300">
                  This map treats the DFS optimizer, projections, ownership, value plays, props,
                  rankings, news, odds, content, and community loop as baseline requirements. Galaxy
                  marks what is live, what can run from user-provided CSVs, and what remains gated
                  until real feeds are connected.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/fantasy" className="btn btn-primary">
                    Fantasy home
                  </Link>
                  <Link href="/api/sources/catalog" className="btn btn-ghost">
                    Source JSON
                  </Link>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-5">
                <Metric label="Live proof" value={String(summary["live-proof"])} />
                <Metric label="CSV ready" value={String(summary["csv-import-ready"])} />
                <Metric label="Data gated" value={String(summary["gated-data"])} />
                <Metric label="Content" value={String(summary["content-ready"])} />
                <Metric label="Community" value={String(summary["manual-community"])} />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-mineral px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-3 md:grid-cols-2">
            {FANTASY_BASELINE_SOURCES.map((source) => (
              <a
                key={source.name}
                href={source.url}
                className="border border-mineral bg-eclipse p-4 transition-colors hover:border-orbital-cyan/60"
              >
                <p className="font-semibold text-white">{source.name}</p>
                <p className="mt-2 text-sm leading-6 text-ink-300">{source.scope}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden border border-mineral">
              {FANTASY_BASELINE_MODULES.map((module) => (
                <article
                  key={module.key}
                  className="grid gap-4 border-b border-mineral bg-eclipse px-4 py-4 last:border-b-0 lg:grid-cols-[0.28fr_0.2fr_0.24fr_1fr]"
                >
                  <div>
                    <p className="font-semibold text-white">{module.module}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-ink-500">
                      {module.competitorBaseline.join(" + ")}
                    </p>
                  </div>
                  <div>
                    <span className={`inline-flex rounded border px-2 py-1 text-[11px] ${STATUS_TONE[module.status]}`}>
                      {STATUS_LABEL[module.status]}
                    </span>
                    <p className="mt-2 font-mono text-[10px] text-orbital-cyan">{module.gseSurface}</p>
                  </div>
                  <p className="text-sm leading-6 text-ink-300">{module.userValue}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
                        Required data
                      </p>
                      <p className="mt-1 text-sm leading-6 text-ink-300">{module.dataRequired}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-500">
                        Current truth
                      </p>
                      <p className="mt-1 text-sm leading-6 text-ink-300">{module.currentTruth}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border border-mineral bg-eclipse p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2">{label}</p>
      <p className="mt-1 font-numerals text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
