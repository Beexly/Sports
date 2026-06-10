import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@sports/db";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Public Ledger - Galaxy Sports Edge",
  description:
    "Settled canonical picks with the original signal snapshot preserved against the outcome.",
  alternates: { canonical: "/ledger" },
};

interface LedgerRow {
  readonly id: string;
  readonly gameId: string;
  readonly matchup: string;
  readonly sport: string;
  readonly selection: string;
  readonly result: string;
  readonly settledAt: Date | null;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly modelVersion: string;
  readonly snapshotSummary: string;
}

function snapshotSummary(snapshot: {
  readonly bookmakerCount: number;
  readonly dataQualityScore: number;
  readonly hadLineMovementSignal: boolean;
  readonly hadRestSignal: boolean;
  readonly hadScheduleSignal: boolean;
  readonly hadAtsFormSignal: boolean;
  readonly hadH2HSignal: boolean;
} | null): string {
  if (!snapshot) return "Signal snapshot not available for this entry.";
  const active = [
    snapshot.hadLineMovementSignal ? "line movement" : null,
    snapshot.hadRestSignal ? "rest" : null,
    snapshot.hadScheduleSignal ? "schedule" : null,
    snapshot.hadAtsFormSignal ? "ATS form" : null,
    snapshot.hadH2HSignal ? "H2H" : null,
  ].filter((item): item is string => item !== null);

  const factors = active.length > 0 ? active.join(", ") : "odds";
  return `${snapshot.bookmakerCount} books, ${Math.round(snapshot.dataQualityScore)} data quality, active: ${factors}.`;
}

async function loadLedgerRows(): Promise<LedgerRow[]> {
  const picks = await db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH"] },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      include: {
        game: { include: { sport: { select: { name: true } } } },
        signalSnapshot: true,
      },
      orderBy: { settledAt: "desc" },
      take: 100,
    })
    .catch(() => []);

  return picks.map((pick) => ({
    id: pick.id,
    gameId: pick.gameId,
    matchup: `${pick.game.awayTeamName} @ ${pick.game.homeTeamName}`,
    sport: pick.game.sport.name,
    selection: pick.selection,
    result: pick.result,
    settledAt: pick.settledAt,
    confidence: pick.confidence,
    edgeScore: pick.edgeScore,
    modelVersion: pick.modelVersion,
    snapshotSummary: snapshotSummary(pick.signalSnapshot),
  }));
}

export default async function LedgerPage(): Promise<JSX.Element> {
  const rows = await loadLedgerRows();

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-950 text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="border-b border-gray-800 pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">Public Ledger</p>
          <div className="mt-4 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="max-w-4xl break-words text-3xl font-black tracking-tight text-white sm:text-5xl">
                Every settled canonical pick keeps its receipt.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
                The ledger preserves the original signal snapshot next to the outcome.
                Bootstrap-era data and synthetic seed records are excluded.
              </p>
            </div>
            <Link
              href="/performance/losses"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-5 py-3 text-sm font-bold text-gray-100 hover:border-cyan-300"
            >
              Open Loss Room
            </Link>
          </div>
        </header>

        {rows.length === 0 ? (
          <section className="border border-gray-800 bg-gray-900/45 p-6">
            <h2 className="text-xl font-bold text-white">Building ledger history</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              No settled canonical picks are available yet. The ledger will populate after
              real picks settle with their signal snapshots attached.
            </p>
          </section>
        ) : (
          <section className="overflow-hidden border border-gray-800">
            <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-gray-800 bg-gray-900/70 px-4 py-3 text-xs uppercase tracking-[0.16em] text-gray-400 md:grid-cols-[1.1fr_0.8fr_auto_1.4fr]">
              <span>Pick</span>
              <span className="hidden md:block">Market</span>
              <span>Result</span>
              <span className="hidden md:block">Snapshot</span>
            </div>
            {rows.map((row) => (
              <article
                key={row.id}
                className="grid gap-3 border-b border-gray-800 bg-gray-950/50 px-4 py-4 last:border-b-0 md:grid-cols-[1.1fr_0.8fr_auto_1.4fr]"
              >
                <div>
                  <h2 className="font-semibold text-white">
                    <Link href={`/room/${row.gameId}`} className="hover:text-cyan-100">
                      {row.matchup}
                    </Link>
                  </h2>
                  <p className="mt-1 text-xs text-gray-400">
                    {row.sport} / {row.settledAt ? row.settledAt.toISOString().slice(0, 10) : "settled"}
                  </p>
                </div>
                <p className="text-sm text-gray-300">{row.selection}</p>
                <p className="font-mono text-sm font-bold text-cyan-200">{row.result}</p>
                <p className="text-sm leading-6 text-gray-400">{row.snapshotSummary}</p>
              </article>
            ))}
          </section>
        )}

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
