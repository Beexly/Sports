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
import { UpsellGate } from "@/components/ui/upsell-gate";
import { Reveal } from "@/components/motion/reveal";
import { AmbientGlow, SignatureGrid } from "@/components/motion/signature-grid";
import { DivergingBar } from "@/components/ui/dataviz";
import { ACCESS, canAccess, getViewerTier } from "@/lib/access";
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

// The free teaser shows the GSE Rating for these positions in full. Anything
// else is gated. Kept as a Set for clean membership tests over PlayerProfile.position.
const FREE_POSITIONS = new Set<string>(ACCESS.freeRatingPositions);

function pctNullable(v: number | null): string {
  return v == null ? "—" : `${Math.round(v * 100)}%`;
}

/**
 * Return a copy of the model whose profiles are filtered to a position predicate.
 * Server-side, serializable in and out — we hand the slimmed model straight to
 * the reused EngineView so the public board logic stays in one place.
 */
function modelForPositions(model: PlayerModel, keep: (position: string) => boolean): PlayerModel {
  return { ...model, profiles: model.profiles.filter((p) => keep(p.position)) };
}

/**
 * PROVEN track-record strip — the receipts, never the recipe.
 *
 * Three outcome KPIs only (lift over the field, buy-low hit-rate, sell-high
 * hit-rate) + the one-line verdict the backtest already wrote. No methodology,
 * no formulas, no split-half mechanics — mirrors the Phase-1 Track Record on the
 * engines proof view. Honest empty state if the loader could not reach nflverse.
 *
 * The KPI tiles carry a deliberate cyan ring so the receipts read as premium —
 * the MovesCard surface, lifted.
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
  const cardClass = "ring-1 ring-orbital-cyan/15 transition-shadow hover:ring-orbital-cyan/30";
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
          className={cardClass}
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
          className={cardClass}
          label="Buy-low hit-rate"
          value={pctNullable(proof.overall.buyLowHitRate)}
          tone={hitRateTone(proof.overall.buyLowHitRate)}
          sublabel="how often our buy-low calls rose"
        />
        <KpiCard
          className={cardClass}
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
 * The public GSE Rating board.
 *
 * PRO/ELITE/ADMIN see the full board in one EngineView (every position + the
 * full buy/sell move cards). FREE viewers get a strong teaser: the move cards
 * and the full ratings table for the free positions (ACCESS.freeRatingPositions,
 * e.g. QB), then the remaining positions rendered through the SAME EngineView but
 * wrapped in an UpsellGate — blurred shape under glass with an Unlock-with-PRO CTA.
 *
 * Reuses EngineView untouched by slimming the serializable model per audience.
 */
function RatingBoard({ model, unlocked }: { model: PlayerModel; unlocked: boolean }): JSX.Element {
  if (model.status === "source-error" || unlocked) {
    // Source-error renders its own honest empty state inside EngineView, and
    // unlocked viewers get the whole slate in a single pass.
    return <EngineView engine="player-model" data={model} />;
  }

  const freeModel = modelForPositions(model, (pos) => FREE_POSITIONS.has(pos));
  const gatedModel = modelForPositions(model, (pos) => !FREE_POSITIONS.has(pos));
  const hasGated = gatedModel.profiles.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {/* FREE: move cards + the free-position ratings table, fully visible. */}
      <EngineView engine="player-model" data={freeModel} />

      {/* The rest of the board — every other position — behind the PRO gate. */}
      {hasGated ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-orbital-cyan">
              The full board
            </p>
            <h2 className="text-xl font-semibold text-ion-white">Every position, ranked.</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-ion-1">
              You're seeing one position in full. The complete board — every spot, top to bottom — is
              part of PRO.
            </p>
          </div>
          <UpsellGate locked tier="PRO" label="every position">
            <EngineView engine="player-model" data={gatedModel} />
          </UpsellGate>
        </div>
      ) : null}
    </div>
  );
}

/**
 * /intelligence/rating — the PUBLIC home of the flagship GSE Rating.
 *
 * The score itself is the thing we show everyone; the DEPTH is what we sell. The
 * page loads the player model + the track record on the server and reuses the
 * SAME client EngineView the gated browser uses. FREE viewers get a real teaser
 * (move cards + the free-position ratings); deeper positions are blurred behind a
 * tasteful PRO gate. PRO/ELITE and the founder (ADMIN) see the whole board.
 *
 * Aesthetically aligned to the premium dark motion look: an ambient glow + the
 * signature radar grid drift behind the hero, and the hero / receipts / board
 * each Reveal on scroll-in. All motion is reduced-motion-safe. Honest empty
 * states if either loader can't reach nflverse. EngineView is reused untouched.
 */
export default async function RatingPage(): Promise<JSX.Element> {
  // Resolve the viewer tier alongside the two server loads. The tier decides the
  // free/paid line; neither nflverse load may take the page down.
  const [tier, modelResult, proofResult] = await Promise.all([
    getViewerTier(),
    loadPlayerModel().then(
      (value) => ({ ok: true as const, value }),
      (reason) => ({ ok: false as const, reason }),
    ),
    loadPredictiveness().then(
      (value) => ({ ok: true as const, value }),
      (reason) => ({ ok: false as const, reason }),
    ),
  ]);
  const unlocked = canAccess(tier, "PRO");

  let board: JSX.Element;
  if (modelResult.ok) {
    board = <RatingBoard model={modelResult.value} unlocked={unlocked} />;
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
  if (proofResult.ok) {
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
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        {/* HERO — ambient glow + signature radar drift behind the number-first pitch. */}
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-ds-lg">
            <AmbientGlow className="-z-10" />
            <SignatureGrid className="-z-10" opacity={0.1} rotate />
            <div className="relative z-10">
              <PageHero
                variant="dark"
                eyebrow="The GSE Rating"
                title="Your number, and the receipts."
                description={
                  <>
                    One score per player, graded against their own position — 100 is best-in-class at
                    that spot, not best in the league. Each rating comes with a plain-English read: buy
                    low before the market catches up, or sell high into the value. The number is public.
                    So is the record behind it.
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
            </div>
          </div>
        </Reveal>

        {/* PROVEN — the receipts, above the board */}
        <Reveal delay={80}>{trackRecord}</Reveal>

        {/* The public GSE Rating board — reused EngineView, anchors already hidden,
            deeper positions gated for FREE. */}
        <Reveal delay={140}>
          <section className="flex min-w-0 flex-col gap-6" aria-label="GSE Rating board">
            {board}
          </section>
        </Reveal>
      </main>
      <Footer />
    </div>
  );
}
