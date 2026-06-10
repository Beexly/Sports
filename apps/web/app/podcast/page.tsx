import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import {
  isPodcastEnabled,
  loadPodcastManifest,
  publishableEpisodes,
} from "@/lib/podcast/manifest";

/**
 * /podcast (POD-01) — gated OFF by default (404 until PODCAST_ENABLED="true").
 *
 * Lists ONLY founder-published episodes from the manifest. The weekly pipeline
 * (draft -> founder edit -> local render in his voice -> manual publish) is
 * documented in docs/command-center/launch/weekly-podcast-design.md.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Weekly podcast",
  description:
    "The week's record, graded in public — wins, losses, and the games we passed on.",
  robots: { index: false },
  alternates: { canonical: "/podcast" },
};

export default function PodcastPage(): JSX.Element {
  if (!isPodcastEnabled()) notFound();

  const manifest = loadPodcastManifest();
  const episodes = publishableEpisodes(manifest).sort((a, b) =>
    a.date < b.date ? 1 : -1
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="border-b border-gray-800 pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200">
            {manifest.showTitle || "Galaxy Sports Edge — Weekly"}
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-5xl">
            The week, graded out loud.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400">
            {manifest.showDescription ||
              "Every episode walks the week's actual record — the wins, the losses, and the games the process passed on. Same numbers as the public ledger."}
          </p>
        </header>

        {episodes.length === 0 ? (
          <section
            data-testid="podcast-empty"
            className="border border-gray-800 bg-gray-900/45 p-6"
          >
            <h2 className="text-xl font-bold text-white">First episode is in the works</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Episodes appear here once they are recorded, reviewed, and published.
              Nothing airs that hasn&apos;t been listened to first.
            </p>
          </section>
        ) : (
          <ul className="flex flex-col gap-4">
            {episodes.map((episode) => (
              <li
                key={`${episode.date}-${episode.title}`}
                data-testid="podcast-episode"
                className="border border-gray-800 bg-gray-900/40 p-5"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-gray-400">
                  {episode.date.slice(0, 10)}
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">{episode.title}</h2>
                <p className="mt-2 text-sm text-gray-400">{episode.description}</p>
                <audio controls preload="none" className="mt-4 w-full" src={episode.audioUrl}>
                  Your browser does not support the audio element.
                </audio>
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
