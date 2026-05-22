import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@sports/db";

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
}

export const dynamic = "force-dynamic";

async function loadLoss(id: string): Promise<LossDetail | null> {
  const authored = await db.lossAutopsy
    .findUnique({
      where: { id },
      include: {
        pick: {
          include: { game: { include: { sport: { select: { name: true } } } } },
        },
      },
    })
    .catch(() => null);

  if (authored && authored.isPublic && authored.status === "PUBLISHED") {
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
    };
  }

  const pick = await db.pick
    .findUnique({
      where: { id },
      include: { game: { include: { sport: { select: { name: true } } } } },
    })
    .catch(() => null);

  if (!pick || pick.result !== "LOSS" || !pick.isPublished || pick.isBootstrap) {
    return null;
  }

  return {
    id: pick.id,
    headline: `What we learned from ${pick.selection}`,
    authoredAt: pick.settledAt ?? pick.generatedAt,
    whatWeSaw: pick.reasoning,
    whatHappened:
      "A full operator-written autopsy has not been published for this pick yet.",
    whatWeLearned:
      "The pick remains in the Loss Room fallback so the record does not disappear while review is pending.",
    rootCause: "PENDING_REVIEW",
    matchup: `${pick.game.awayTeamName} at ${pick.game.homeTeamName}`,
    sport: pick.game.sport.name,
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
    <main className="min-h-screen bg-gray-950 px-4 py-12 text-gray-100 sm:px-6 lg:px-8">
      <article className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Link href="/performance/losses" className="text-sm text-brand-400 hover:underline">
            Loss Room
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500">
            <span>{loss.sport}</span>
            <span>{loss.rootCause.replace(/_/g, " ")}</span>
            <span>{loss.authoredAt.toISOString().slice(0, 10)}</span>
          </div>
          <h1 className="text-3xl font-bold text-white">{loss.headline}</h1>
          <p className="text-sm text-gray-500">{loss.matchup}</p>
        </header>

        <LossSection title="What We Saw" body={loss.whatWeSaw} />
        <LossSection title="What Happened" body={loss.whatHappened} />
        <LossSection title="What We Learned" body={loss.whatWeLearned} />
      </article>
    </main>
  );
}

function LossSection({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      <p className="text-base leading-7 text-gray-200">{body}</p>
    </section>
  );
}
