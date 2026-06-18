import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { Reveal } from "@/components/motion/reveal";
import { loadPublicJournalEntries, type PublicJournalEntry } from "@/lib/journal/load";
import { formatDate } from "@/lib/utils";
import { BRAND_COLORS } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Model Journal - Weekly research notes from Galaxy Sports Edge",
  description:
    "Weekly research notes on settled picks, gated slates, factor behavior, and model-version changes from Galaxy Sports Edge.",
  alternates: { canonical: "/journal" },
};

export const revalidate = 300;

function JournalEntryCard({ entry }: { readonly entry: PublicJournalEntry }): JSX.Element {
  return (
    <article className="surface-card group p-6 transition-transform duration-300 ease-out hover:-translate-y-1">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: BRAND_COLORS.softUltraviolet }}>
        Week {entry.isoWeek}, {entry.isoYear} · {entry.modelVersion}
      </p>
      <Link href={`/journal/${entry.slug}`}>
        <h2 className="mt-3 font-display text-xl text-white transition-colors group-hover:text-orbital-cyan">
          {entry.title}
        </h2>
      </Link>
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-300">{entry.coldOpen}</p>
      <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-ink-500">
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
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Nav />
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative isolate overflow-hidden px-4 pb-8 pt-24 sm:px-6 lg:px-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96"
            style={{ background: `radial-gradient(60% 80% at 50% 0%, ${BRAND_COLORS.softUltraviolet}16, transparent 70%)` }}
          />
          <div className="mx-auto max-w-5xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.softUltraviolet }}>
                Model Journal
              </p>
            </Reveal>
            <Reveal delay={90}>
              <h1
                className="mt-4 max-w-3xl font-display text-balance text-white"
                style={{ fontSize: "clamp(2.25rem, 6vw, 4rem)", lineHeight: 1.02, letterSpacing: "-0.02em" }}
              >
                Weekly notes on what the model learned.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-2xl text-lg text-ink-300">
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
                  <p className="text-base font-semibold text-white">No Journal entries published yet.</p>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-300">
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
