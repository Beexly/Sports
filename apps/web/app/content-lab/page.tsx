import type { Metadata } from "next";
import { Footer } from "@/components/ui/footer";
import { Nav } from "@/components/ui/nav";
import { CONTENT_PILLARS } from "@/lib/media-revenue/content-pillars";

export const metadata: Metadata = {
  alternates: { canonical: "/content-lab" },
  description: "GSE content pillars for market mirage, no-bet clinic, loss autopsy, player signal lab, GSE lab, and board meeting formats.",
  title: "GSE Content Lab",
};

export default function ContentLabPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main id="main-content" className="flex-1">
        <section className="border-b border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Content lab</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">The content system behind GSE and GSN.</h1>
            <p className="mt-5 max-w-3xl text-lg text-ink-300">
              Each pillar teaches a repeatable evidence lesson, connects back to repo-backed trust surfaces, and routes attention to
              newsletter, partner, or product demand without unsupported public claims.
            </p>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
            {CONTENT_PILLARS.map((pillar) => (
              <article key={pillar.id} className="surface-card p-6">
                <p className="eyebrow">{pillar.name}</p>
                <h2 className="mt-3 font-display text-2xl text-white">{pillar.coreIdea}</h2>
                <p className="mt-3 text-sm leading-7 text-ink-300">{pillar.description}</p>
                <div className="mt-5 grid gap-3 text-sm text-ink-300">
                  <p><span className="text-ink-100">What it teaches:</span> {pillar.audience}</p>
                  <p><span className="text-ink-100">Why it matters:</span> {pillar.repoTieIn}</p>
                  <p><span className="text-ink-100">Sample episodes:</span> {pillar.exampleHooks.slice(0, 2).join(" / ")}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
