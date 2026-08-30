import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { getEpisode, listEpisodes } from "@/lib/podcast/episodes";

export const dynamic = "force-static";

export function generateStaticParams() {
  return listEpisodes().map((e) => ({ slug: e.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const ep = getEpisode(params.slug);
  if (!ep) return { title: "Episode" };
  return {
    title: `Ep ${ep.number}: ${ep.title} | GSE Board Meeting`,
    description: ep.summary,
    alternates: { canonical: `/podcast/${ep.slug}` },
  };
}

export default function EpisodePage({ params }: { params: { slug: string } }) {
  const ep = getEpisode(params.slug);
  if (!ep) notFound();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1 px-4 py-16 sm:px-6 lg:px-8">
        <article className="mx-auto max-w-3xl">
          <Link href="/podcast" className="text-sm text-orbital-cyan hover:underline">
            ← All episodes
          </Link>
          <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-ion-2">
            Episode {String(ep.number).padStart(3, "0")} · {ep.durationMin} min
          </p>
          <h1 className="mt-3 font-display text-4xl text-ion-white">{ep.title}</h1>
          <p className="mt-4 text-lg text-ion-1">{ep.summary}</p>

          <div className="mt-12 space-y-10">
            {ep.segments.map((s) => (
              <section key={s.title}>
                <h2 className="font-display text-2xl text-ion-white">{s.title}</h2>
                <p className="mt-3 text-base leading-8 text-ion-1">{s.body}</p>
              </section>
            ))}
          </div>

          <section className="mt-14 border border-mineral bg-eclipse/40 p-6">
            <h2 className="font-display text-xl text-ion-white">Takeaways</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-ion-1">
              {ep.takeaways.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
