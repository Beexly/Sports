import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { Reveal } from "@/components/motion/reveal";
import { loadPublicJournalEntries, type PublicJournalEntry } from "@/lib/journal/load";
import { formatDate } from "@/lib/utils";
import { SITE_URL } from "@/lib/seo/sports-jsonld";
import { jsonLdScript } from "@/lib/seo/json-ld";

const JOURNAL_DESCRIPTION =
  "Weekly research notes on settled picks, gated slates, factor behavior, and model-version changes from Galaxy Sports Edge.";

export const metadata: Metadata = {
  title: "Model Journal - Weekly research notes from Galaxy Sports Edge",
  description: JOURNAL_DESCRIPTION,
  alternates: { canonical: "/journal" },
};

export const revalidate = 300;

function JournalEntryCard({ entry }: { readonly entry: PublicJournalEntry }): JSX.Element {
  return (
    <article className="surface-card group p-6 transition-transform duration-300 ease-out hover:-translate-y-1">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-ultraviolet">
        Week {entry.isoWeek}, {entry.isoYear} · {entry.modelVersion}
      </p>
      <Link href={`/journal/${entry.slug}`}>
        <h2 className="mt-3 font-display text-xl text-ion-white transition-colors group-hover:text-orbital-cyan">
          {entry.title}
        </h2>
      </Link>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-ion-1">{entry.coldOpen}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3 font-mono text-xs text-ion-2">
        <time dateTime={entry.publishedAt}>{formatDate(new Date(entry.publishedAt))}</time>
        <span>{entry.readTimeMinutes} min read</span>
        <span>{entry.referencedPickIds.length} picks cited</span>
      </div>
    </article>
  );
}

export default async function JournalPage(): Promise<JSX.Element> {
  const entries = await loadPublicJournalEntries();

  const blogJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Galaxy Sports Edge Model Journal",
    description: JOURNAL_DESCRIPTION,
    url: `${SITE_URL}/journal`,
    blogPost: entries.map((entry) => ({
      "@type": "BlogPosting",
      headline: entry.title,
      url: `${SITE_URL}/journal/${entry.slug}`,
      datePublished: entry.publishedAt,
    })),
  };

  return (
    <div className="flex min-h-screen flex-col bg-obsidian">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(blogJsonLd) }}
      />
      <Nav />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{ background: "radial-gradient(60% 80% at 50% 0%, rgba(123, 97, 255, 0.09), transparent 70%)" }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow text-ultraviolet">
                Model Journal
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-4 max-w-3xl font-display text-balance text-ion-white"
                style={{ fontSize: "clamp(2.25rem, 6vw, 4rem)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
              >
                Weekly notes on what the model learned.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ion-1">
                Settled picks, gated slates, factor behaviour, and version changes. Research notes,
                not a hype reel.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Entries */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            {entries.length === 0 ? (
              <Reveal>
                <div className="surface-card p-8">
                  <p className="text-base font-semibold text-ion-white">No Journal entries published yet.</p>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ion-1">
                    The Journal starts once the weekly data pipe has enough settled-pick evidence for
                    a useful review.
                  </p>
                </div>
              </Reveal>
            ) : (
              <div className="grid gap-5">
                {entries.map((entry) => (
                  <JournalEntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
