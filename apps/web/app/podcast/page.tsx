import type { Metadata } from "next";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  alternates: { canonical: "/podcast" },
  description: "The future GSE Board Meeting podcast format for sports intelligence, model accountability, no-bet discipline, and partner-safe media.",
  title: "GSE Board Meeting Podcast",
};

const SEGMENTS = ["what shipped", "what broke", "what the model learned", "what GSE passed on", "partner/tool spotlight"];

export default function PodcastPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Podcast</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">GSE Board Meeting, coming soon.</h1>
            <p className="mt-5 max-w-3xl text-lg text-ink-300">
              The podcast starts as a board meeting format: what shipped, what broke, what the model learned, what GSE passed on, and
              which partners or tools deserve a closer look. No feed, sponsor inventory, or publishing integration is active yet.
            </p>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="eyebrow">Segment structure</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {SEGMENTS.map((segment) => (
                <article key={segment} className="surface-card p-5">
                  <h2 className="font-display text-2xl capitalize text-white">{segment}</h2>
                  <p className="mt-3 text-sm leading-7 text-ink-300">
                    Operator-reviewed segment with evidence notes, clear caveats, and no auto-publishing path.
                  </p>
                </article>
              ))}
            </div>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=GSE%20Board%20Meeting%20guest%20or%20partner%20inquiry`} className="btn btn-primary mt-10">
              Guest or partner inquiry
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
