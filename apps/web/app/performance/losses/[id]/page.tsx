import Link from "next/link";
import { formatScalar } from "@/lib/format/stat";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@sports/db";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";

interface LossDetail {
  readonly id: string;
  readonly headline: string;
  readonly authoredAt: Date;
  readonly whatWeSaw: string;
  readonly whatHappened: string;
  readonly whatWeLearned: string;
  readonly rootCause: string;
  readonly matchup: string;
  readonly sport: string;
  readonly selection: string;
  readonly confidence: number;
  readonly edgeScore: number;
  readonly modelVersion: string;
  readonly snapshotSummary: string;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  return {
    title: "Loss Autopsy — The Full Post-Mortem",
    description:
      "One settled loss with its original reasoning, signal snapshot, root-cause analysis, and what we changed. Losses are published, not buried.",
    alternates: { canonical: `/performance/losses/${params.id}` },
  };
}

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

async function loadLoss(id: string): Promise<LossDetail | null> {
  const pick = await db.pick
    .findUnique({
      where: { id },
      include: {
        game: { include: { sport: { select: { name: true } } } },
        lossAutopsy: true,
        signalSnapshot: true,
      },
    })
    .catch(() => null);

  if (pick && pick.result === "LOSS" && pick.isPublished && !pick.isBootstrap && pick.modelVersion !== "v5.0.0-seed") {
    const authored =
      pick.lossAutopsy?.isPublic && pick.lossAutopsy.status === "PUBLISHED"
        ? pick.lossAutopsy
        : null;

    return {
      id: authored?.id ?? pick.id,
      headline: authored?.headline ?? `What we learned from ${pick.selection}`,
      authoredAt: authored?.authoredAt ?? pick.settledAt ?? pick.generatedAt,
      whatWeSaw: authored?.whatWeSaw ?? pick.reasoning,
      whatHappened:
        authored?.whatHappened ??
        "A full operator-written autopsy has not been published for this pick yet.",
      whatWeLearned:
        authored?.whatWeLearned ??
        "The pick remains in the Loss Room fallback so the record does not disappear while review is pending.",
      rootCause: authored?.rootCause ?? "PENDING_REVIEW",
      matchup: `${pick.game.awayTeamName} at ${pick.game.homeTeamName}`,
      sport: pick.game.sport.name,
      selection: pick.selection,
      confidence: pick.confidence,
      edgeScore: pick.edgeScore,
      modelVersion: pick.modelVersion,
      snapshotSummary: snapshotSummary(pick.signalSnapshot),
    };
  }

  const authored = await db.lossAutopsy
    .findUnique({
      where: { id },
      include: {
        pick: {
          include: {
            game: { include: { sport: { select: { name: true } } } },
            signalSnapshot: true,
          },
        },
      },
    })
    .catch(() => null);

  if (
    !authored ||
    !authored.isPublic ||
    authored.status !== "PUBLISHED" ||
    authored.pick.result !== "LOSS" ||
    authored.pick.isBootstrap
  ) {
    return null;
  }

  return {
    id: authored.id,
    headline: authored.headline,
    authoredAt: authored.authoredAt,
    whatWeSaw: authored.whatWeSaw,
    whatHappened: authored.whatHappened,
    whatWeLearned: authored.whatWeLearned,
    rootCause: authored.rootCause,
    matchup: `${authored.pick.game.awayTeamName} at ${authored.pick.game.homeTeamName}`,
    sport: authored.pick.game.sport.name,
    selection: authored.pick.selection,
    confidence: authored.pick.confidence,
    edgeScore: authored.pick.edgeScore,
    modelVersion: authored.pick.modelVersion,
    snapshotSummary: snapshotSummary(authored.pick.signalSnapshot),
  };
}

export default async function LossDetailPage({
  params,
}: {
  params: { id: string };
}): Promise<JSX.Element> {
  const loss = await loadLoss(params.id);
  if (!loss) notFound();

  return (
    <div className="min-h-screen bg-white/[0.03] text-ion">
      <Nav />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link href="/performance/losses" className="text-sm font-semibold text-orbital-cyan hover:text-white">
            Loss Room
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-ink-400">
            <span>{loss.sport}</span>
            <span>{loss.rootCause.replace(/_/g, " ")}</span>
            <span>{loss.authoredAt.toISOString().slice(0, 10)}</span>
          </div>
          <h1 className="text-3xl font-bold text-white">{loss.headline}</h1>
          <p className="text-sm text-ink-400">{loss.matchup}</p>
        </header>

        <section className="grid gap-3 border border-white/[0.08] bg-white/[0.04]/50 p-4 text-sm text-ink-300 sm:grid-cols-3">
          <span>{loss.selection}</span>
          <span>Confidence {loss.confidence}</span>
          <span>Edge {formatScalar(loss.edgeScore)}</span>
        </section>

        <LossSection title="What We Saw" body={loss.whatWeSaw} />
        <LossSection title="What Happened" body={loss.whatHappened} />
        <LossSection title="What We Learned" body={loss.whatWeLearned} />
        <LossSection title="Signal Snapshot" body={`${loss.snapshotSummary} Model version: ${loss.modelVersion}.`} />
      </article>
        <RiskDisclosure variant="compact" className="mt-10 text-center" />
      </main>
      <Footer />
    </div>
  );
}

function LossSection({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">{title}</h2>
      <p className="text-base leading-7 text-white">{body}</p>
    </section>
  );
}
