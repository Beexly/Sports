import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { SUPPORT_EMAIL } from "@/lib/brand";
import { listEpisodes, PODCAST_SHOW } from "@/lib/podcast/episodes";

export const metadata: Metadata = {
  alternates: { canonical: "/podcast" },
  description: PODCAST_SHOW.description,
  title: "GSE Board Meeting Podcast",
};

export default function PodcastPage() {
  const episodes = listEpisodes();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-mineral/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Podcast · live archive</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">
              {PODCAST_SHOW.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-ion-1">{PODCAST_SHOW.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/podcast/feed.xml" className="btn btn-primary">
                RSS feed
              </Link>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=GSE%20Board%20Meeting%20guest%20or%20partner%20inquiry`}
                className="btn btn-ghost"
              >
                Guest or partner inquiry
              </a>
            </div>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <p className="eyebrow">{episodes.length} episodes</p>
            {episodes.map((ep) => (
              <article key={ep.slug} className="surface-card p-6">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-ion-2">
                  Episode {String(ep.number).padStart(3, "0")} · {ep.durationMin} min ·{" "}
                  {new Date(ep.publishedAt).toLocaleDateString()}
                </p>
                <h2 className="mt-2 font-display text-2xl text-ion-white">
                  <Link href={`/podcast/${ep.slug}`} className="hover:text-orbital-cyan">
                    {ep.title}
                  </Link>
                </h2>
                <p className="mt-3 text-sm leading-7 text-ion-1">{ep.summary}</p>
                <Link
                  href={`/podcast/${ep.slug}`}
                  className="mt-4 inline-block text-sm text-orbital-cyan underline-offset-4 hover:underline"
                >
                  Read full board meeting →
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
