import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { TrustStrip, SourceFreshnessLabel } from "@/components/trust";
import { RelatedIntelligencePanel, GraphRelationshipList, RelatedLessons, RelatedReports } from "@/components/graph";
import { CoachPromptHost } from "@/components/coach/CoachPromptHost";
import { NextBestSurface } from "@/components/experience/NextBestSurface";
import { PickEvidenceSection } from "@/components/picks/PickEvidenceSection";
import { FactorAuditRadial } from "@/components/factor-audit/FactorAuditRadial";
import { getOutboundEdges } from "@/lib/galaxy/kernel/graph";
import { loadGameRoom } from "@/lib/game-room/load";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Decision Room — Galaxy Sports Edge",
  description: "Per-game intelligence room: evidence, verdict, related intel, and decision coach.",
};

export default async function GameRoomPage({
  params,
}: {
  params: { gameId: string };
}): Promise<JSX.Element> {
  const room = await loadGameRoom(params.gameId);
  if (!room) notFound();

  const evidenceScore = room.node.evidenceHealth.score;
  const evidenceStatus = room.node.evidenceHealth.status;
  const freshness = evidenceScore >= 70 ? "fresh" : evidenceScore >= 40 ? "today" : "stale";
  const hasPublishedPick = room.node.marketPulse.publishedPickCount > 0;
  const edges = getOutboundEdges("decision-room");

  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">

        {/* ── Breadcrumb + header ─────────────────────────────────────────── */}
        <header className="border-b border-mineral pb-8">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm">
            <Link
              href="/today"
              className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ion-blue hover:text-cyan-200 transition-colors"
            >
              <span aria-hidden="true">←</span> Today&apos;s Board
            </Link>
            <span aria-hidden="true" className="text-gray-700">›</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">
              Decision Room
            </span>
          </nav>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">
            Game Intelligence Room
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            {room.node.matchup}
          </h1>
          <p className="mt-2 text-sm text-gray-500">{room.node.sport}</p>
        </header>

        {/* ── TrustStrip ─────────────────────────────────────────────────── */}
        <TrustStrip
          surfaceId="decision-room"
          source="galaxy-model"
          freshness={freshness}
          surfaceKind="decision-quality"
          tier="all"
          uncertainty={evidenceStatus === "STRONG" ? "live" : evidenceStatus === "WATCH" ? "live" : "sample"}
          showMethodology
          showResponsiblePlay
        />

        {/* ── Pick / No-Bet / Watch verdict ──────────────────────────────── */}
        <section
          aria-label="Model verdict"
          className={[
            "rounded-2xl border p-6 space-y-4",
            hasPublishedPick
              ? "border-ion-blue/40 bg-gradient-to-br from-gray-900/80 via-gray-900/70 to-cyan-950/30"
              : "border-amber-800/40 bg-gradient-to-br from-gray-900/80 via-gray-900/70 to-amber-950/20",
          ].join(" ")}
        >
          <div className="flex items-center justify-between">
            <p className={[
              "font-mono text-[10px] uppercase tracking-[0.18em]",
              hasPublishedPick ? "text-ion-blue" : "text-amber-500",
            ].join(" ")}>
              {hasPublishedPick ? "Model verdict — Signal" : "Model verdict — Pass"}
            </p>
            <SourceFreshnessLabel source="galaxy-model" freshness={freshness} />
          </div>

          {hasPublishedPick ? (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                Galaxy published a pick for this game.
              </h2>
              <p className="text-sm text-gray-400">
                Edge index <span className="font-mono text-white">{room.node.marketPulse.edgeIndex !== null ? String(room.node.marketPulse.edgeIndex) : "N/A"}</span>
                {" "}· Evidence health <span className="font-mono text-white">{evidenceScore}/100</span> ({evidenceStatus})
              </p>
              <PickEvidenceSection
                kind="pick"
                source="galaxy-model"
                freshness={freshness}
                failureCase={
                  room.premortem?.headline ??
                  "Not available — snapshot pending after pick clears gate."
                }
              />
              <Link
                href="/picks"
                className="inline-flex min-h-10 items-center justify-center rounded-lg bg-ion-blue px-5 text-sm font-bold text-carbon hover:opacity-90 transition-opacity"
              >
                See the published pick →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                Galaxy passed on this game.
              </h2>
              <p className="text-sm text-gray-400">
                No published pick. Edge index <span className="font-mono text-white">{room.node.marketPulse.edgeIndex !== null ? String(room.node.marketPulse.edgeIndex) : "N/A"}</span>
                {" "}· Evidence health <span className="font-mono text-white">{evidenceScore}/100</span> ({evidenceStatus})
              </p>
              <p className="text-sm leading-relaxed text-amber-200/80">
                A disciplined pass is a win. The model did not find an edge here — don&apos;t bet what Galaxy skipped without an independent thesis.
              </p>
              <Link
                href="/no-bet"
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-amber-700/50 bg-amber-950/30 px-5 text-sm font-bold text-amber-200 hover:bg-amber-950/50 transition-colors"
              >
                Read today&apos;s pass list →
              </Link>
            </div>
          )}
        </section>

        {/* ── Market Pulse / Risk Stack ───────────────────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-2">
          <Panel title="Market Pulse">
            <dl className="space-y-2 text-sm">
              <Fact label="Edge Index" value={formatNullable(room.node.marketPulse.edgeIndex)} />
              <Fact label="Books polled" value={String(room.node.marketPulse.bookmakerCoverage)} />
              <Fact label="Spread movement" value={formatNullable(room.node.marketPulse.lineMovementSpread)} />
              <Fact label="Total movement" value={formatNullable(room.node.marketPulse.lineMovementTotal)} />
              <Fact label="Evidence sources" value={String(room.node.evidenceHealth.sourceCount)} />
            </dl>
          </Panel>

          <Panel title="Risk Stack">
            {room.premortem?.riskDrivers && room.premortem.riskDrivers.length > 0 ? (
              <ul className="space-y-2">
                {room.premortem.riskDrivers.map((driver, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
                    {driver}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  Risk drivers appear after a pick clears the gate.
                </p>
                {(room.node.evidenceHealth.staleCount > 0 || room.node.evidenceHealth.bootstrapCount > 0) && (
                  <div className="rounded border border-amber-800/30 bg-amber-950/20 p-3 text-xs text-amber-300/80">
                    {room.node.evidenceHealth.staleCount > 0 && (
                      <p>· {room.node.evidenceHealth.staleCount} stale signal{room.node.evidenceHealth.staleCount !== 1 ? "s" : ""}</p>
                    )}
                    {room.node.evidenceHealth.bootstrapCount > 0 && (
                      <p>· {room.node.evidenceHealth.bootstrapCount} bootstrap-only signal{room.node.evidenceHealth.bootstrapCount !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Panel>
        </section>

        {/* ── Factor-Audit Radial ─────────────────────────────────────────── */}
        <FactorAuditRadial
          axes={[
            { key: "line-mvmt", label: "Line movement", score: 70 },
            { key: "consensus", label: "Consensus", score: 64 },
            { key: "depth", label: "Market depth", score: 80 },
            { key: "rest", label: "Rest", score: 58 },
            { key: "h2h", label: "H2H", score: 48 },
            { key: "venue", label: "Venue", score: 62 },
            { key: "cross-mkt", label: "Cross-market", score: 72 },
            { key: "schedule", label: "Schedule", score: 55 },
            { key: "form", label: "Form", score: 68 },
            { key: "uncertainty", label: "Uncertainty", score: 60 },
          ]}
          edgeAtPublication={room.node.marketPulse.edgeIndex ?? 0}
          currentEdge={room.node.marketPulse.edgeIndex ?? 0}
          modelVersion={room.premortem?.modelVersion}
        />

        {/* ── What Changed / What to Ignore ──────────────────────────────── */}
        <section className="grid gap-5 lg:grid-cols-2">
          <Panel title="What Changed">
            <p className="text-sm text-gray-400">
              {room.node.marketPulse.lineMovementSpread !== null || room.node.marketPulse.lineMovementTotal !== null
                ? "Line movement detected — see Signal Stack for details."
                : "No significant line movement recorded for this game."}
            </p>
            <p className="mt-3 font-mono text-[8px] uppercase tracking-widest text-gray-600">
              Demo · Updated when odds data refreshes
            </p>
          </Panel>

          <Panel title="What to Ignore">
            {room.node.marketPulse.gatedByBootstrap ? (
              <p className="text-sm text-gray-400">
                This game was evaluated in bootstrap mode. Public-facing edge signals are not available until
                live odds data is connected. Do not act on bootstrap estimates.
              </p>
            ) : (
              <p className="text-sm text-gray-400">
                No specific narrative flags for this game. Check the No-Bet list for games the model passed on
                across today&apos;s slate.
              </p>
            )}
          </Panel>
        </section>

        {/* ── Slate Weather ───────────────────────────────────────────────── */}
        <Panel title="Slate Weather">
          <dl className="space-y-2 text-sm">
            <Fact label="Sport" value={room.slateWeather.sport} />
            <Fact label="Games on slate" value={String(room.slateWeather.gameCount)} />
            <Fact label="Avg evidence score" value={`${room.slateWeather.averageEvidenceScore}/100`} />
            {room.slateWeather.bootstrapGameCount > 0 && (
              <Fact label="Bootstrap games" value={String(room.slateWeather.bootstrapGameCount)} />
            )}
          </dl>
        </Panel>

        {/* ── Existing sections: Evidence Timeline, Premortem, Lens, Memory ── */}
        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Panel title="Evidence Timeline">
            {room.timeline.length === 0 ? (
              <p className="text-sm text-gray-500">No source-aware signals have been attached to this game yet.</p>
            ) : (
              <ol className="divide-y divide-gray-800 border border-mineral">
                {room.timeline.map((item) => (
                  <li key={item.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-semibold text-white">{item.label}</p>
                      <p className="mt-1 text-xs text-gray-500">{item.source}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-xs text-cyan-200">{item.status}</p>
                      <p className="mt-1 text-xs text-gray-500">{item.fetchedAt.slice(0, 16).replace("T", " ")}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          <Panel title="What Would Change Our Mind">
            {room.premortem ? (
              <div className="text-sm leading-6 text-gray-300">
                <h2 className="font-semibold text-white">{room.premortem.headline}</h2>
                <p className="mt-3">{room.premortem.summary}</p>
                {room.premortem.modelVersion && (
                  <p className="mt-3 font-mono text-[8px] text-gray-700">
                    {room.premortem.modelVersion}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No published pick is attached yet — pre-mortem appears after a pick clears the gate.
              </p>
            )}
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Panel title="Lens Switcher">
            <div className="grid gap-3 sm:grid-cols-2">
              {room.lenses.map((lens) => (
                <article key={lens.lens} className="border border-mineral bg-carbon/55 p-4">
                  <h2 className="font-mono text-xs font-semibold text-cyan-200">{lens.lens}</h2>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{lens.visibleSummary}</p>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Galaxy Memory">
            <div className="text-sm leading-6 text-gray-300">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">
                {room.memory.status.replace(/_/g, " ")}
              </p>
              <p className="mt-3">{room.memory.body}</p>
              {room.memory.settledAt && (
                <p className="mt-3 text-xs text-gray-500">
                  Settled {room.memory.settledAt.slice(0, 10)}
                </p>
              )}
            </div>
          </Panel>
        </section>

        {/* ── Related Intelligence ────────────────────────────────────────── */}
        <RelatedIntelligencePanel
          sections={[
            {
              eyebrow: "Related surfaces",
              children: edges.length > 0 ? (
                <GraphRelationshipList edges={edges} />
              ) : null,
            },
            {
              eyebrow: "Related reports",
              children: <RelatedReports typeIds={["mirage", "signal", "edge"]} />,
            },
            {
              eyebrow: "Related lessons",
              children: <RelatedLessons conceptIds={["expected-value", "no-bet-doctrine", "line-movement"]} />,
            },
          ]}
        />

        {/* ── Decision Coach ──────────────────────────────────────────────── */}
        <CoachPromptHost surface="decision-room" />

        {/* ── Next Best Surface ───────────────────────────────────────────── */}
        <NextBestSurface route="/room" />

        {/* ── Track / Autopsy / Share row ─────────────────────────────────── */}
        <section
          aria-label="Decision actions"
          className="border-t border-mineral pt-6"
        >
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
            Next actions
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/tracker"
              className="group flex flex-col gap-1 rounded-lg border border-mineral bg-gray-900/55 px-4 py-3 hover:border-emerald-700/60 hover:bg-gray-900/80 transition-colors"
            >
              <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-400">
                Track this pick
              </span>
              <span className="text-xs text-gray-500 group-hover:text-gray-300">
                Log your action and CLV
              </span>
            </Link>
            <Link
              href="/autopsy"
              className="group flex flex-col gap-1 rounded-lg border border-mineral bg-gray-900/55 px-4 py-3 hover:border-amber-700/60 hover:bg-gray-900/80 transition-colors"
            >
              <span className="font-mono text-[9px] uppercase tracking-widest text-amber-400">
                Open Autopsy
              </span>
              <span className="text-xs text-gray-500 group-hover:text-gray-300">
                Grade your decision process
              </span>
            </Link>
            {hasPublishedPick ? (
              <Link
                href={`/api/og/pick?gameId=${params.gameId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-1 rounded-lg border border-mineral bg-gray-900/55 px-4 py-3 hover:border-cyan-700/60 hover:bg-gray-900/80 transition-colors"
              >
                <span className="font-mono text-[9px] uppercase tracking-widest text-cyan-400">
                  Share artifact
                </span>
                <span className="text-xs text-gray-500 group-hover:text-gray-300">
                  Open the OG preview image
                </span>
              </Link>
            ) : (
              <Link
                href="/today"
                className="group flex flex-col gap-1 rounded-lg border border-mineral bg-gray-900/55 px-4 py-3 hover:border-ion-blue/60 hover:bg-gray-900/80 transition-colors"
              >
                <span className="font-mono text-[9px] uppercase tracking-widest text-ion-blue">
                  Back to Board
                </span>
                <span className="text-xs text-gray-500 group-hover:text-gray-300">
                  See other games on the slate
                </span>
              </Link>
            )}
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="border border-mineral bg-gray-900/45 p-5">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ion-blue">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border border-mineral bg-carbon/55 p-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">{label}</dt>
      <dd className="mt-1 text-gray-200">{value}</dd>
    </div>
  );
}

function formatNullable(value: number | null): string {
  if (value === null) return "N/A";
  return value > 0 ? `+${value}` : String(value);
}
