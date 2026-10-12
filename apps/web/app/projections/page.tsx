import type { Metadata } from "next";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { loadSgpProjections } from "@/lib/projections/sgp-projections";
import { SgpStackCard } from "@/components/projections/sgp-stack-card";
import {
  formatCentralDateTime,
  formatCentralTime,
  CT_SUFFIX,
} from "@/lib/time/central";

export const metadata: Metadata = {
  title: "Stack Projections",
  description:
    "Projected chances for same-game quarterback and receiver stacks in upcoming games, ranked highest to lowest. Projections only, never picks.",
  alternates: { canonical: "/projections" },
  openGraph: {
    title: "Stack Projections",
    description:
      "Projected chances for same-game quarterback and receiver stacks in upcoming games, ranked highest to lowest. Projections only, never picks.",
  },
};

// Projections expire at kickoff, so this page reads its state per request
// and is never statically prerendered.
export const dynamic = "force-dynamic";

export default async function ProjectionsPage(): Promise<JSX.Element> {
  const { data, meta } = loadSgpProjections(new Date());
  const generatedLabel = data.generatedAt
    ? `${formatCentralDateTime(data.generatedAt)} ${CT_SUFFIX}`
    : null;

  return (
    <div className="relative isolate min-h-screen w-full overflow-x-hidden bg-obsidian text-ion-white">
      <Nav />
      <main
        id="main-content"
        className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8"
      >
        <section aria-labelledby="projections-title" className="pt-10">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-plasma">
            Projections
          </p>
          <h1
            id="projections-title"
            className="mt-5 max-w-4xl font-display text-balance text-ion-white"
            style={{
              fontSize: "clamp(2.5rem, 8vw, 5.5rem)",
              lineHeight: 0.94,
              letterSpacing: "-0.03em",
            }}
          >
            Same-game stacks.
            <br />
            <span className="text-plasma">Projected straight.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            For each upcoming game, we project the chance that a team&apos;s
            quarterback and his top receiving option clear their combined
            yardage and scoring marks together. One number per stack, ranked
            highest to lowest inside each game.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ion-2">
            Projections only. A projection is our model&apos;s estimate of
            how likely a combination is, published before the game starts.
            It is not a pick, not a recommendation, and not betting advice.
          </p>
          {generatedLabel && meta.state === "live" && (
            <p className="mt-4 font-mono text-xs text-ion-3">
              Projections generated {generatedLabel}
            </p>
          )}
        </section>

        {meta.dataError && (
          <div
            data-testid="projections-invalid-state"
            className="rounded-xl border border-titanium bg-carbon/60 p-12 text-center"
          >
            <h2 className="text-base font-semibold text-white">
              No stack projections right now
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ion-3">
              The latest projection set did not pass our checks, so this page
              shows nothing rather than something unverified. Projections
              return when a clean set lands.
            </p>
          </div>
        )}

        {!meta.dataError && meta.state === "stale" && (
          <div
            data-testid="projections-stale-state"
            className="flex flex-col gap-2 border border-caution/40 bg-caution/[0.08] px-4 py-3 text-sm text-ion-white sm:flex-row sm:items-center"
          >
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-caution">
              Temporarily stale
            </span>
            <span className="break-words sm:ml-3">
              The latest projections have expired. A projection only means
              something before kickoff, so finished slates come down instead
              of aging in public. New projections land with the next slate.
            </span>
          </div>
        )}

        {!meta.dataError && meta.state === "empty" && (
          <div
            data-testid="projections-empty-state"
            className="rounded-xl border border-titanium bg-carbon/60 p-12 text-center"
          >
            <h2 className="text-base font-semibold text-white">
              No stack projections right now
            </h2>
            <p className="mt-2 text-sm text-ion-3">
              When the next slate is priced, its projected stacks will appear
              here.
            </p>
          </div>
        )}

        {!meta.dataError &&
          meta.state === "live" &&
          data.games.map((game) => (
            <section key={game.eventId} aria-label={game.matchup}>
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-mineral pb-3">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-ion-white">
                  {game.matchup}
                </h2>
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ion-3">
                  Kickoff {formatCentralTime(game.kickoffIso)} {CT_SUFFIX}
                </p>
              </div>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {game.stacks.map((stack, index) => (
                  <SgpStackCard
                    key={stack.teamAbbr}
                    stack={stack}
                    rank={index + 1}
                  />
                ))}
              </div>
            </section>
          ))}

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
