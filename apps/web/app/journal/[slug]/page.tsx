import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { loadPublicJournalEntry, type PublicJournalEntry } from "@/lib/journal/load";
import { formatDate } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";
import { SITE_URL } from "@/lib/seo/sports-jsonld";
import { jsonLdScript } from "@/lib/seo/json-ld";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  readonly params: { readonly slug: string };
}): Promise<Metadata> {
  const entry = await loadPublicJournalEntry(params.slug);
  if (!entry) return { title: "Journal entry not found" };

  const summary = entry.coldOpen.slice(0, 155);
  return {
    title: `${entry.title} - Model Journal`,
    description: summary,
    alternates: { canonical: `/journal/${entry.slug}` },
    openGraph: {
      type: "article",
      title: entry.title,
      description: summary,
      url: `/journal/${entry.slug}`,
      publishedTime: entry.publishedAt,
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: entry.title,
      description: summary,
    },
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
          <p key={`${block}-${index}`} className="whitespace-pre-wrap text-base leading-8 text-ion-1">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function ReferenceLinks({ entry }: { readonly entry: PublicJournalEntry }): JSX.Element {
  return (
    <section className="rounded-lg border border-titanium bg-carbon/50 p-5">
      <h2 className="text-sm font-semibold text-white">References</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ion-3">Picks discussed</p>
          {entry.referencedPickIds.length === 0 ? (
            <p className="mt-2 text-sm text-ion-3">No pick references attached.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {entry.referencedPickIds.map((pickId) => (
                <li key={pickId}>
                  <Link href={`/ledger#${pickId}`} className="text-ion-1 hover:text-white">
                    {pickId}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-ion-3">Autopsies cited</p>
          {entry.referencedAutopsyIds.length === 0 ? (
            <p className="mt-2 text-sm text-ion-3">No autopsy references attached.</p>
          ) : (
            <ul className="mt-2 space-y-2 text-sm">
              {entry.referencedAutopsyIds.map((autopsyId) => (
                <li key={autopsyId}>
                  <Link href={`/performance/losses/${autopsyId}`} className="text-ion-1 hover:text-white">
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

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: entry.title,
    description: entry.coldOpen,
    datePublished: entry.publishedAt,
    dateModified: entry.publishedAt,
    url: `${SITE_URL}/journal/${entry.slug}`,
    mainEntityOfPage: `${SITE_URL}/journal/${entry.slug}`,
    timeRequired: `PT${entry.readTimeMinutes}M`,
    author: { "@type": "Organization", name: BRAND_NAME },
    publisher: { "@type": "Organization", name: BRAND_NAME },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(articleJsonLd) }}
      />
      <Nav />
      <main id="main-content" className="min-h-screen bg-obsidian">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <Link href="/journal" className="text-sm text-ion-3 transition-colors hover:text-ion-1">
            Back to Model Journal
          </Link>

          <article className="mt-8">
            <header className="border-b border-titanium pb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-caution">
                Week {entry.isoWeek}, {entry.isoYear} - {entry.modelVersion}
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-ion-white">{entry.title}</h1>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-ion-3">
                <span>{formatDate(new Date(entry.publishedAt))}</span>
                <span>{entry.readTimeMinutes} min read</span>
                <Link href="/journal/rss.xml" className="hover:text-ion-1">
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
            <section className="rounded-lg border border-titanium bg-carbon/50 p-5">
              <h2 className="text-sm font-semibold text-white">Weekly digest</h2>
              <p className="mt-2 text-sm leading-6 text-ion-2">
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
