import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { SgpProjectionTable } from "@/components/sgp/sgp-projection-table";
import { loadSgpProjections } from "@/lib/sgp/load-sgp-projections";

export const metadata: Metadata = {
  title: "SGP Projections",
  description: "Our projection for each same-game market.",
  alternates: { canonical: "/sgp-projections" },
  openGraph: {
    title: "SGP Projections",
    description: "Our projection for each same-game market.",
  },
};

export const dynamic = "force-dynamic";

export default function SgpProjectionsPage(): JSX.Element {
  const result = loadSgpProjections();
  const hasRows = result.rows.length > 0;

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-obsidian text-ion-white">
      <Nav />
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"
      >
        <section aria-labelledby="sgp-projections-title">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-plasma">
            SGP projections
          </p>
          <h1
            id="sgp-projections-title"
            className="mt-5 max-w-4xl font-display text-balance text-ion-white"
            style={{
              fontSize: "clamp(2.5rem, 8vw, 5.5rem)",
              lineHeight: 0.94,
              letterSpacing: "-0.03em",
            }}
          >
            SGP Projections
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            Our number for each same-game market.
          </p>
        </section>

        {!hasRows && (
          <div
            data-testid="sgp-projections-empty"
            className="flex flex-col gap-2 border border-orbital-cyan/30 bg-orbital-cyan/[0.06] px-4 py-3 text-sm text-ion-white sm:flex-row sm:items-center"
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-orbital-cyan">
              No projections yet
            </span>
            <span className="break-words sm:ml-3">
              No projections are available right now.
            </span>
          </div>
        )}

        {hasRows &&
          result.games.map((game) => (
            <section
              key={game.game}
              aria-label={game.game}
              className="border border-mineral bg-carbon p-5"
            >
              <h2 className="font-display text-xl font-semibold text-ion-white">
                {game.game}
              </h2>
              <div className="mt-4">
                <SgpProjectionTable rows={game.rows} />
              </div>
            </section>
          ))}

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
