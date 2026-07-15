import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Fantasy Data Gate - Galaxy Sports Edge",
  description:
    "Fantasy analytics remain unavailable until rights-cleared projections, freshness evidence, and validation receipts are live.",
  alternates: { canonical: "/fantasy" },
};

const RELEASE_GATES = [
  {
    code: "SOURCE RIGHTS",
    status: "not cleared",
    title: "Licensed player projections",
    body: "A documented provider agreement must cover player-level projections, salaries, and permitted customer display.",
  },
  {
    code: "FRESHNESS",
    status: "base layer only",
    title: "Current usage and availability",
    body: "Rosters, usage, schedules, and research rows exist. The projection layer that turns them into fantasy advice does not.",
  },
  {
    code: "MODEL RECEIPT",
    status: "not cleared",
    title: "Dated validation evidence",
    body: "Every projection release needs a frozen model version, backtest window, error metrics, and source timestamp.",
  },
  {
    code: "PUBLIC QA",
    status: "not cleared",
    title: "No-fallback production proof",
    body: "The live route must stay empty during provider failure. Fictional players and sample salaries can never fill the gap.",
  },
] as const;

const LIVE_DESTINATIONS = [
  {
    href: "/picks",
    label: "Live board",
    detail: "Current picks are published only when price and evidence gates pass.",
  },
  {
    href: "/trends",
    label: "Trend Lab",
    detail: "Read statistically tested NFL research, including findings the data rejected.",
  },
  {
    href: "/integrations",
    label: "Source ledger",
    detail: "Inspect what is connected, what is licensed, and what remains unavailable.",
  },
] as const;

export default function FantasyHubPage({
  searchParams,
}: {
  searchParams?: { from?: string };
}): JSX.Element {
  const requestedToolWasGated = Boolean(searchParams?.from);

  return (
    <div
      className="flex min-h-screen flex-col text-ion"
      style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}
    >
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-mineral px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
            <div className="max-w-3xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-orbital-cyan">
                Fantasy / public data gate
              </p>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.02] text-white sm:text-6xl">
                Fantasy tools stay closed until every player row is real.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-ink-300 sm:text-lg">
                No simulated salaries. No fictional depth charts. No placeholder projections.
                Galaxy Fantasy opens only after the data, rights, model version, and failure behavior
                can all be verified.
              </p>

              <div className="mt-8 border-l-2 border-orbital-cyan pl-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">
                  Public availability
                </p>
                <p className="mt-2 font-display text-2xl font-semibold text-white">Gated</p>
                <p className="mt-2 max-w-xl text-sm leading-6 text-ink-300">
                  {requestedToolWasGated
                    ? "The tool you requested uses an illustrative fallback today, so the public route stopped here before loading it."
                    : "Illustrative engines remain internal references. They are not a customer product and cannot appear as live advice."}
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/picks" className="btn btn-primary">
                  Use the live board
                </Link>
                <Link href="/integrations" className="btn btn-ghost">
                  Inspect source readiness
                </Link>
              </div>
            </div>

            <section aria-labelledby="clearance-title" className="border border-mineral bg-eclipse">
              <div className="flex items-center justify-between gap-4 border-b border-mineral px-5 py-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-orbital-cyan">
                    Release contract
                  </p>
                  <h2 id="clearance-title" className="mt-1 font-display text-xl font-semibold text-white">
                    Data clearance manifest
                  </h2>
                </div>
                <span className="border border-caution/50 bg-caution/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-caution">
                  0 / 4 clear
                </span>
              </div>

              <ol>
                {RELEASE_GATES.map((gate) => (
                  <li key={gate.code} className="grid gap-3 border-b border-mineral px-5 py-5 last:border-b-0 sm:grid-cols-[8.5rem_1fr]">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">
                        {gate.code}
                      </p>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-caution">
                        {gate.status}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{gate.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-ink-300">{gate.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </section>

        <section className="px-4 py-12 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orbital-cyan">
                Available now
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold text-white">
                Use the evidence-backed parts of Galaxy.
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-300">
                These destinations expose their source state and fail closed when required evidence is unavailable.
              </p>
            </div>

            <div className="mt-7 divide-y divide-mineral border-y border-mineral">
              {LIVE_DESTINATIONS.map((destination) => (
                <Link
                  key={destination.href}
                  href={destination.href}
                  className="group grid gap-2 px-1 py-5 transition-colors hover:bg-eclipse sm:grid-cols-[12rem_1fr_auto] sm:items-center sm:px-4"
                >
                  <span className="font-display text-xl font-semibold text-white group-hover:text-orbital-cyan">
                    {destination.label}
                  </span>
                  <span className="text-sm leading-6 text-ink-300">{destination.detail}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-orbital-cyan">
                    Open
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
