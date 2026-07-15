import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { IntelligencePlayback } from "@/components/game-room/intelligence-playback";
import { Fact, formatNullable, Metric, NextStep, Panel } from "@/components/game-room/room-primitives";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { loadGameRoom } from "@/lib/game-room/load";
import { getViewerEntitlements } from "@/lib/pricing/tier-access";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game Intelligence Room - Galaxy Sports Edge",
  description: "A read-only game room with market pulse, evidence timeline, lens projections, and memory.",
};

export default async function GameRoomPage({
  params,
}: {
  params: { gameId: string };
}): Promise<JSX.Element> {
  // Resolve the viewer's entitlements server-side (anonymous → FREE, fail-closed)
  // and pass them into the shared loader so premium picks, confidence, the paid
  // factor trail, and line movement never enter an un-entitled payload.
  const viewer = await getViewerEntitlements();
  const room = await loadGameRoom(params.gameId, {
    canSeePremiumPicks: viewer.canSeePremiumPicks,
    canSeeConfidence: viewer.canSeeConfidence,
    canSeeFactorBreakdown: viewer.canSeeFactorBreakdown,
    canSeeLineMovement: viewer.canSeeLineMovement,
  });
  if (!room) notFound();

  return (
    <div className="min-h-screen bg-obsidian text-ion-white">
      <Nav />
      <main id="main-content" className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="border-b border-titanium pb-8">
          <Link href="/board" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            Today&apos;s Board
          </Link>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
            Game Intelligence Room
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">{room.node.matchup}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ion-2">
            A persistent read-only room for market state, evidence history, pre-mortem context,
            lens-safe summaries, and postgame memory.
          </p>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Metric label="Edge Index" value={room.node.marketPulse.edgeIndex === null ? "N/A" : String(room.node.marketPulse.edgeIndex)} />
          <Metric label="Books" value={String(room.node.marketPulse.bookmakerCoverage)} />
          <Metric label="Evidence" value={`${room.node.evidenceHealth.score}/100`} />
          <Metric label="Status" value={room.node.evidenceHealth.status} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel title="Market Pulse">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Fact label="Published picks" value={String(room.node.marketPulse.publishedPickCount)} />
              <Fact label="Bootstrap gated" value={room.node.marketPulse.gatedByBootstrap ? "Yes" : "No"} />
              {/* Line movement is a Pro-tier market read. The loader already nulls
                  it for un-entitled viewers; we also gate the render so the panel
                  is honest about WHY it is absent (drives upgrade) instead of a
                  bare "N/A" that reads as missing data. */}
              {viewer.canSeeLineMovement ? (
                <>
                  <Fact label="Spread movement" value={formatNullable(room.node.marketPulse.lineMovementSpread)} />
                  <Fact label="Total movement" value={formatNullable(room.node.marketPulse.lineMovementTotal)} />
                </>
              ) : (
                <Fact label="Line movement" value="Unlocks with Pro" />
              )}
            </dl>
          </Panel>

          <Panel title="Slate Weather">
            <dl className="grid gap-3 text-sm">
              <Fact label="Sport" value={room.slateWeather.sport} />
              <Fact label="Rooms in aggregate" value={String(room.slateWeather.gameCount)} />
              <Fact label="Average evidence" value={String(room.slateWeather.averageEvidenceScore)} />
              <Fact label="Bootstrap games" value={String(room.slateWeather.bootstrapGameCount)} />
            </dl>
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Evidence Timeline">
            {room.timeline.length === 0 ? (
              <p className="text-sm text-ion-3">No source-aware signals have been attached to this game yet.</p>
            ) : (
              <ol className="divide-y divide-titanium border border-titanium">
                {room.timeline.map((item) => (
                  <li key={item.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-xs text-ion-3">{item.source}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-xs text-cyan-200">{item.status}</p>
                      <p className="mt-1 text-xs text-ion-3">{item.fetchedAt.slice(0, 16).replace("T", " ")}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="What Would Change Our Mind">
            {!viewer.canSeeFactorBreakdown ? (
              // The pre-mortem summary embeds the paid factor trail (confidence,
              // line-movement delta, rest/schedule/ATS/H2H, data quality, book
              // depth). It is withheld server-side for FREE/anonymous viewers —
              // the loader returns premortem: null — so nothing paid renders here.
              <p className="text-sm text-ion-3">
                The pre-mortem — the model&apos;s own case for what would beat this pick, with the
                confidence and factor trail behind it — is part of Pro.{" "}
                <Link href="/pricing" className="font-semibold text-orbital-cyan hover:text-ion-white">
                  See what Pro unlocks
                </Link>
                .
              </p>
            ) : room.premortem ? (
              <div className="text-sm leading-6 text-ion-1">
                <h2 className="font-semibold text-white">{room.premortem.headline}</h2>
                <p className="mt-3">{room.premortem.summary}</p>
              </div>
            ) : (
              <p className="text-sm text-ion-3">
                No published pick is attached yet, so the pre-mortem will appear after a pick clears the gate.
              </p>
            )}
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Panel title="Lens Switcher">
            <div className="grid gap-3 sm:grid-cols-2">
              {room.lenses.map((lens) => (
                <article key={lens.lens} className="border border-titanium bg-obsidian/55 p-4">
                  <h2 className="font-mono text-xs font-semibold text-cyan-200">{lens.lens}</h2>
                  <p className="mt-3 text-sm leading-6 text-ion-2">{lens.visibleSummary}</p>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Galaxy Memory">
            <div className="text-sm leading-6 text-ion-1">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">{room.memory.status.replace(/_/g, " ")}</p>
              <p className="mt-3">{room.memory.body}</p>
              {room.memory.settledAt && <p className="mt-3 text-xs text-ion-3">Settled {room.memory.settledAt.slice(0, 10)}</p>}
            </div>
          </Panel>
        </section>

        {room.playback ? (
          <IntelligencePlayback playback={room.playback} />
        ) : (
          <Panel title="Intelligence Playback">
            <p className="text-sm leading-6 text-ion-3">
              Playback is unavailable because this game does not yet have a persisted, rights-cleared decision
              with enough bound evidence to reconstruct its history.
            </p>
          </Panel>
        )}

        <Panel title="Where This Goes Next">
          <p className="text-sm leading-6 text-ion-2">
            Galaxy declines more games than it publishes. No edge, no pick &mdash; that is the
            process, not a gap. Treat this room as one input in a disciplined decision, never
            the decision itself.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <NextStep href="/ledger" label="Public Ledger" hint="Every settled pick: win or loss, fully auditable." />
            <NextStep href="/performance" label="Calibration Report" hint="How the model has scored over time." />
            <NextStep href="/methodology" label="Methodology" hint="The exact factors behind this call, and how it was built." />
            <NextStep href="/responsible-play" label="Set Your Limits" hint="Risk you can understand, before emotion enters." />
          </div>
        </Panel>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
