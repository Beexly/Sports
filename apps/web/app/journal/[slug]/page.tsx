import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadPublicJournalEntry, type PublicJournalEntry } from "@/lib/journal/load";
import { formatDate } from "@/lib/utils";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  readonly params: { readonly slug: string };
}): Promise<Metadata> {
  const entry = await loadPublicJournalEntry(params.slug);
  if (!entry) return { title: "Journal entry not found" };

  return {
    title: `${entry.title} - Model Journal`,
    description: entry.coldOpen.slice(0, 155),
    alternates: { canonical: `/journal/${entry.slug}` },
  };
}

function MarkdownBody({ markdown }: { readonly markdown: string }): JSX.Element {
  const blocks = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        if (block.startsWith("###")) {
          return (
            <h3 key={`${block}-${index}`} className="pt-3 text-xl font-semibold text-white">
              {block.replace(/^#+\s*/, "")}
            </h3>
          );
        }
        if (block.startsWith("##")) {
          return (
            <h2 key={`${block}-${index}`} className="pt-5 text-2xl font-semibold text-white">
              {block.replace(/^#+\s*/, "")}
            </h2>
          );
        }
        if (block.startsWith("#")) {
          return (
            <h2 key={`${block}-${index}`} className="text-2xl font-semibold text-white">
              {block.replace(/^#+\s*/, "")}
            </h2>
          );
        }
        return (
          <p key={`${block}-${index}`} className="whitespace-pre-wrap text-base leading-8 text-ink-200">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function ReferenceLinks({ entry }: { readonly entry: PublicJournalEntry }): JSX.Element {
  return (
    <section className="rounded-lg border border-mineral bg-eclipse/50 p-5">
      <h2 className="text-sm font-semibold text-white">References</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-500">Picks discussed</p>
          {entry.referencedPickIds.length === 0 ? (
            <p className="mt-2 text-sm text-ink-400">No pick references attached.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {entry.referencedPickIds.map((pickId) => (
                <li key={pickId}>
                  <Link href={`/ledger#${pickId}`} className="text-ink-200 hover:text-white">
                    {pickId}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ink-500">Autopsies cited</p>
          {entry.referencedAutopsyIds.length === 0 ? (
            <p className="mt-2 text-sm text-ink-400">No autopsy references attached.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {entry.referencedAutopsyIds.map((autopsyId) => (
                <li key={autopsyId}>
                  <Link href={`/performance/losses/${autopsyId}`} className="text-ink-200 hover:text-white">
                    {autopsyId}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export default async function JournalEntryPage({
  params,
}: {
  readonly params: { readonly slug: string };
}): Promise<JSX.Element> {
  const entry = await loadPublicJournalEntry(params.slug);
  if (!entry) notFound();

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-void">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <Link href="/journal" className="text-sm text-ink-400 transition-colors hover:text-ink-200">
            Back to Model Journal
          </Link>

          <article className="mt-8">
            <header className="border-b border-mineral pb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-yellow-300">
                Week {entry.isoWeek}, {entry.isoYear} - {entry.modelVersion}
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-white">{entry.title}</h1>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-ink-400">
                <span>{formatDate(new Date(entry.publishedAt))}</span>
                <span>{entry.readTimeMinutes} min read</span>
                <Link href="/journal/rss.xml" className="hover:text-ink-200">
                  RSS
                </Link>
              </div>
            </header>

            <div className="mt-10">
              <MarkdownBody markdown={entry.bodyMarkdown} />
            </div>
          </article>

          <div className="mt-12 grid gap-6">
            <ReferenceLinks entry={entry} />
            <section className="rounded-lg border border-mineral bg-eclipse/50 p-5">
              <h2 className="text-sm font-semibold text-white">Weekly digest</h2>
              <p className="mt-2 text-sm leading-6 text-ink-300">
                Elite members receive the full Journal by email after publication. Free readers can follow the public archive here or use the RSS feed.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
