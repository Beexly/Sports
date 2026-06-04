import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadPublicJournalEntries, type PublicJournalEntry } from "@/lib/journal/load";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Model Journal - Weekly research notes from Galaxy Sports Edge",
  description:
    "Weekly research notes on settled picks, gated slates, factor behavior, and model-version changes from Galaxy Sports Edge.",
  alternates: { canonical: "/journal" },
};

export const dynamic = "force-dynamic";

function JournalEntryCard({ entry }: { readonly entry: PublicJournalEntry }): JSX.Element {
  return (
    <article className="rounded-lg border border-gray-800 bg-gray-900/60 p-6 transition-colors hover:border-gray-700">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-yellow-300">
        Week {entry.isoWeek}, {entry.isoYear} - {entry.modelVersion}
      </p>
      <Link href={`/journal/${entry.slug}`}>
        <h2 className="mt-3 text-xl font-semibold text-white transition-colors hover:text-yellow-200">
          {entry.title}
        </h2>
      </Link>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">{entry.coldOpen}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span>{formatDate(new Date(entry.publishedAt))}</span>
        <span>{entry.readTimeMinutes} min read</span>
        <span>{entry.referencedPickIds.length} picks cited</span>
      </div>
    </article>
  );
}

export default async function JournalPage(): Promise<JSX.Element> {
  const entries = await loadPublicJournalEntries();

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-gray-950">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <header className="mb-12">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-yellow-300">
              Model Journal
            </p>
            <h1 className="max-w-3xl text-4xl font-bold text-white">Weekly notes on what the model learned.</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-gray-400">
              Settled picks, gated slates, factor behavior, and version changes. Research notes, not a hype reel.
            </p>
          </header>

          {entries.length === 0 ? (
            <section className="rounded-lg border border-gray-800 bg-gray-900/50 p-8">
              <h2 className="text-lg font-semibold text-white">No Journal entries published yet.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
                The Journal starts once the weekly data pipe has enough settled-pick evidence for a useful review.
              </p>
            </section>
          ) : (
            <div className="grid gap-5">
              {entries.map((entry) => (
                <JournalEntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
