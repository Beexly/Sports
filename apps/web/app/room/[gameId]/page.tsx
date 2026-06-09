import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { loadGameRoom } from "@/lib/game-room/load";

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
  const room = await loadGameRoom(params.gameId);
  if (!room) notFound();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="border-b border-gray-800 pb-8">
          <Link href="/picks" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            Today&apos;s Board
          </Link>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
            Game Intelligence Room
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">{room.node.matchup}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
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
              <Fact label="Spread movement" value={formatNullable(room.node.marketPulse.lineMovementSpread)} />
              <Fact label="Total movement" value={formatNullable(room.node.marketPulse.lineMovementTotal)} />
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
              <p className="text-sm text-gray-500">No source-aware signals have been attached to this game yet.</p>
            ) : (
              <ol className="divide-y divide-gray-800 border border-gray-800">
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
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No published pick is attached yet, so the public pre-mortem will appear after a pick clears the gate.
              </p>
            )}
          </Panel>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Panel title="Lens Switcher">
            <div className="grid gap-3 sm:grid-cols-2">
              {room.lenses.map((lens) => (
                <article key={lens.lens} className="border border-gray-800 bg-gray-950/55 p-4">
                  <h2 className="font-mono text-xs font-semibold text-cyan-200">{lens.lens}</h2>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{lens.visibleSummary}</p>
                </article>
              ))}
            </div>
          </Panel>

          <Panel title="Galaxy Memory">
            <div className="text-sm leading-6 text-gray-300">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">{room.memory.status.replace(/_/g, " ")}</p>
              <p className="mt-3">{room.memory.body}</p>
              {room.memory.settledAt && <p className="mt-3 text-xs text-gray-500">Settled {room.memory.settledAt.slice(0, 10)}</p>}
            </div>
          </Panel>
        </section>

        <Panel title="Where This Goes Next">
          <p className="text-sm leading-6 text-gray-400">
            Galaxy declines more games than it publishes. No edge, no pick &mdash; that is the
            process, not a gap. Treat this room as one input in a disciplined decision, never
            the decision itself.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <NextStep href="/ledger" label="Public Ledger" hint="Every settled pick — win or loss, fully auditable." />
            <NextStep href="/performance" label="Calibration Report" hint="How the model has scored over time." />
            <NextStep href="/methodology" label="Methodology" hint="The exact factors behind this call — and how it was built." />
            <NextStep href="/responsible-play" label="Set Your Limits" hint="Risk you can understand, before emotion enters." />
          </div>
        </Panel>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="border border-gray-800 bg-gray-900/45 p-5">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="min-h-20 border border-gray-800 bg-gray-900/60 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">{label}</p>
      <p className="mt-2 break-words text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="border border-gray-800 bg-gray-950/55 p-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-500">{label}</dt>
      <dd className="mt-1 text-gray-200">{value}</dd>
    </div>
  );
}

function NextStep({ href, label, hint }: { href: string; label: string; hint: string }): JSX.Element {
  return (
    <Link
      href={href}
      className="group block border border-gray-800 bg-gray-950/55 p-4 transition-colors hover:border-cyan-500/40"
    >
      <p className="font-mono text-xs font-semibold text-cyan-200 group-hover:text-cyan-100">{label}</p>
      <p className="mt-2 text-sm leading-6 text-gray-400">{hint}</p>
    </Link>
  );
}

function formatNullable(value: number | null): string {
  if (value === null) return "N/A";
  return value > 0 ? `+${value}` : String(value);
}
