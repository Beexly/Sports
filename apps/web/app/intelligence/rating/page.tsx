import type { Metadata } from "next";
import Link from "next/link";
import { EngineView } from "@/components/intelligence/engine-view";
import { IntelligenceSubnav } from "@/components/intelligence/intelligence-subnav";
import { Atmosphere } from "@/components/ui/atmosphere";
import { Footer } from "@/components/ui/footer";
import { KpiCard } from "@/components/ui/kpi-card";
import { Nav } from "@/components/ui/nav";
import { PageHero } from "@/components/ui/page-hero";
import { SourceError } from "@/components/ui/source-error";
import { DivergingBar } from "@/components/ui/dataviz";
import { formatSigned, hitRateTone, liftTone } from "@/lib/intelligence/colors";
import { loadPlayerModel, type PlayerModel } from "@/lib/intelligence/player-model";
import { loadPredictiveness, type PredictivenessProof } from "@/lib/intelligence/predictiveness";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // two heavy nflverse loads (the board + the backtest) need headroom

export const metadata: Metadata = {
  title: "The GSE Rating — your number, and the receipts",
  description:
    "One number per player, graded against their own position, with a buy-low / sell-high read — plus the honest track record behind it: lift over the field, buy-low and sell-high hit-rates. The score, public.",
  alternates: { canonical: "/intelligence/rating" },
};

function pctNullable(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

/**
 * PROVEN track-record strip — the receipts, never the recipe.
 *
 * Three outcome KPIs only (lift over the field, buy-low hit-rate, sell-high
 * hit-rate) + the one-line verdict the backtest already wrote. No methodology,
 * no formulas, no split-half mechanics — mirrors the Phase-1 Track Record on the
 * engines proof view. Honest empty state if the loader could not reach nflverse.
 */
function TrackRecordStrip({ proof }: { proof: PredictivenessProof }): JSX.Element {
  if (proof.status === "source-error") {
    return (
      <SourceError
        kicker="Track record"
        title="The receipts aren't loading right now."
        reason="The track record reads from live nflverse data and it couldn't be reached. We'd rather show you nothing than a number we can't stand behind — check back shortly."
      >
        <p className="font-mono text-xs leading-5 text-ion-2">{proof.error ?? "UNKNOWN"}</p>
      </SourceError>
    );
  }
  return (
    <section className="flex flex-col gap-4" aria-labelledby="track-record-heading">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-orbital-cyan">
          Proven
        </p>
        <h2 id="track-record-heading" className="text-xl font-semibold text-ion-white">
          The receipts behind the number.
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-ion-1">
          Not a promise — a record. Here is how the GSE Rating has actually held up against what
          players went on to do.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Lift over the field"
          value={formatSigned(proof.overall.lift, 2)}
          tone={liftTone(proof.overall.lift)}
          sublabel={
            <span className="inline-flex items-center gap-2">
              <DivergingBar value={proof.overall.lift} domain={0.3} digits={2} tone={liftTone(proof.overall.lift)} />
              <span>
                {proof.sampleSize} players · {proof.season}
              </span>
            </span>
          }
        />
        <KpiCard
          label="Buy-low hit-rate"
          value={pctNullable(proof.overall.buyLowHitRate)}
          tone={hitRateTone(proof.overall.buyLowHitRate)}
          sublabel="how often our buy-low calls rose"
        />
        <KpiCard
          label="Sell-high hit-rate"
          value={pctNullable(proof.overall.sellHighHitRate)}
          tone={hitRateTone(proof.overall.sellHighHitRate)}
          sublabel="how often our sell-high calls fell"
        />
      </div>
      {proof.verdict ? <p className="max-w-3xl text-sm leading-6 text-ion-1">{proof.verdict}</p> : null}
    </section>
  );
}

/**
 * /intelligence/rating — the PUBLIC home of the flagship GSE Rating.
 *
 * Public by design: NO auth gate (the engine browser and methodology are what we
 * fold behind the founder gate — the score itself is the thing we show everyone).
 * Loads the player model on the server and reuses the SAME client EngineView the
 * gated browser uses, so the board already publishes the GSE Rating + tier + the
 * buy/sell read with its component anchors hidden (Phase 1). Above it, a short
 * PROVEN track-record strip carries the three outcome KPIs + the one-line verdict.
 *
 * "Your number, and the receipts." Result-framed, human copy; honest empty states
 * if either loader can't reach nflverse. EngineView is reused untouched.
 */
export default async function RatingPage(): Promise<JSX.Element> {
  // Two independent server loads — neither must take the page down. We resolve
  // both, then let each section render its own honest empty state on failure.
  const [modelResult, proofResult] = await Promise.allSettled([loadPlayerModel(), loadPredictiveness()]);

  let board: JSX.Element;
  if (modelResult.status === "fulfilled") {
    board = <EngineView engine="player-model" data={modelResult.value as PlayerModel} />;
  } else {
    board = (
      <SourceError
        kicker="Source error"
        title="The board isn't loading right now."
        reason={`The GSE Rating reads from live nflverse data and it couldn't be reached. ${
          modelResult.reason instanceof Error ? modelResult.reason.message : "UNKNOWN"
        }`}
      />
    );
  }

  let trackRecord: JSX.Element;
  if (proofResult.status === "fulfilled") {
    trackRecord = <TrackRecordStrip proof={proofResult.value} />;
  } else {
    trackRecord = (
      <SourceError
        kicker="Track record"
        title="The receipts aren't loading right now."
        reason={`The track record reads from live nflverse data and it couldn't be reached. ${
          proofResult.reason instanceof Error ? proofResult.reason.message : "UNKNOWN"
        }`}
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface-base text-ion-white">
      <Atmosphere />
      <Nav />
      <IntelligenceSubnav />
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <PageHero
          variant="dark"
          eyebrow="The GSE Rating"
          title="Your number, and the receipts."
          description={
            <>
              One score per player, graded against their own position — 100 is best-in-class at that
              spot, not best in the league. Each rating comes with a plain-English read: buy low before
              the market catches up, or sell high into the value. The number is public. So is the record
              behind it.
            </>
          }
          actions={
            <Link
              href="/players"
              className="inline-flex min-h-9 items-center justify-center rounded-ds-sm border border-surface-line px-3 py-2 text-xs font-semibold text-ion-2 hover:text-ion-white hover:border-surface-line-strong"
            >
              Open the Player Lab
            </Link>
          }
        />

        {/* PROVEN — the receipts, above the board */}
        {trackRecord}

        {/* The public GSE Rating board — reused EngineView, anchors already hidden */}
        <section className="flex min-w-0 flex-col gap-6" aria-label="GSE Rating board">
          {board}
        </section>
      </main>
      <Footer />
    </div>
  );
}
