import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@sports/db";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";

interface LossRoomRow {
  readonly id: string;
  readonly pickId: string;
  readonly headline: string;
  readonly authoredAt: Date;
  readonly whatWeLearned: string;
  readonly rootCause: string;
  readonly matchup: string;
  readonly sport: string;
  readonly selection: string;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly modelVersion: string;
  readonly autopsyStatus: "PUBLISHED" | "PENDING_REVIEW";
  readonly snapshotSummary: string;
}

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Loss Room - Galaxy Sports Edge",
  description:
    "A public sub-archive of canonical losses with post-mortems attached when review is complete.",
  alternates: { canonical: "/performance/losses" },
};

function snapshotSummary(snapshot: {
  readonly bookmakerCount: number;
  readonly dataQualityScore: number;
  readonly hadLineMovementSignal: boolean;
  readonly hadRestSignal: boolean;
  readonly hadScheduleSignal: boolean;
} | null): string {
  if (!snapshot) return "Signal snapshot pending backfill.";
  const active = [
    snapshot.hadLineMovementSignal ? "line movement" : null,
    snapshot.hadRestSignal ? "rest" : null,
    snapshot.hadScheduleSignal ? "schedule" : null,
  ].filter((item): item is string => item !== null);

  return `${snapshot.bookmakerCount} books, ${Math.round(snapshot.dataQualityScore)} data quality, active: ${
    active.length > 0 ? active.join(", ") : "odds"
  }.`;
}

async function loadLossRows(): Promise<LossRoomRow[]> {
  const picks = await db.pick
    .findMany({
      where: {
        result: "LOSS",
        isPublished: true,
        isBootstrap: false,
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      include: {
        game: { include: { sport: { select: { name: true } } } },
        lossAutopsy: true,
        signalSnapshot: true,
      },
      orderBy: { settledAt: "desc" },
      take: 50,
    })
    .catch(() => []);

  return picks.map((pick) => {
    const publishedAutopsy =
      pick.lossAutopsy?.isPublic && pick.lossAutopsy.status === "PUBLISHED"
        ? pick.lossAutopsy
        : null;

    return {
      id: publishedAutopsy?.id ?? pick.id,
      pickId: pick.id,
      headline: publishedAutopsy?.headline ?? `What we learned from ${pick.selection}`,
      authoredAt: publishedAutopsy?.authoredAt ?? pick.settledAt ?? pick.generatedAt,
      whatWeLearned:
        publishedAutopsy?.whatWeLearned ??
        "This entry is awaiting a full operator-written autopsy. The original pick reasoning and signal snapshot remain attached.",
      rootCause: publishedAutopsy?.rootCause ?? "PENDING_REVIEW",
      matchup: `${pick.game.awayTeamName} at ${pick.game.homeTeamName}`,
      sport: pick.game.sport.name,
      selection: pick.selection,
      confidence: pick.confidence,
      edgeScore: pick.edgeScore,
      modelVersion: pick.modelVersion,
      autopsyStatus: publishedAutopsy ? "PUBLISHED" : "PENDING_REVIEW",
      snapshotSummary: snapshotSummary(pick.signalSnapshot),
    };
  });
}

export default async function LossRoomPage(): Promise<JSX.Element> {
  const rows = await loadLossRows();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="border-b border-gray-800 pb-8">
          <Link href="/ledger" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
            Public Ledger
          </Link>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">Loss Room</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
            A filtered public ledger for canonical losses. Published post-mortems attach when review is complete;
            pending entries keep the original reasoning and signal snapshot visible.
          </p>
        </header>

        {rows.length === 0 ? (
          <section className="border border-gray-800 bg-gray-900/45 p-6">
            <h2 className="text-xl font-bold text-white">No canonical losses yet</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              The Loss Room opens once a published, non-bootstrap pick settles as a loss.
            </p>
          </section>
        ) : (
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li key={row.id} className="border border-gray-800 bg-gray-900/40 p-4">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500">
                  <span>{row.sport}</span>
                  <span>{row.rootCause.replace(/_/g, " ")}</span>
                  <span>{row.autopsyStatus.replace(/_/g, " ")}</span>
                  <span>{row.authoredAt.toISOString().slice(0, 10)}</span>
                </div>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  <Link href={`/performance/losses/${row.pickId}`} className="hover:underline">
                    {row.headline}
                  </Link>
                </h2>
                <p className="mt-1 text-xs text-gray-500">{row.matchup}</p>
                <p className="mt-3 text-sm font-semibold text-gray-200">{row.selection}</p>
                <p className="mt-3 text-sm text-gray-300">{row.whatWeLearned}</p>
                <div className="mt-4 grid gap-3 text-xs text-gray-400 sm:grid-cols-3">
                  <span>Confidence {row.confidence}</span>
                  <span>Edge {row.edgeScore.toFixed(1)}</span>
                  <span>{row.modelVersion}</span>
                </div>
                <p className="mt-3 text-xs leading-5 text-gray-500">{row.snapshotSummary}</p>
              </li>
            ))}
          </ul>
        )}
        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
