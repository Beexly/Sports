import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME, BRAND_TAGLINE, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About",
  description: `${BRAND_NAME} — ${BRAND_TAGLINE}. The story, the model, the operating principles.`,
};

const PRINCIPLES = [
  {
    eyebrow: "01 · Data is source of truth",
    title: "Every pick traces to a real line.",
    body:
      "Live odds from dozens of sportsbooks, ingested on a 30-minute cadence. The model's view of a matchup is always reconcilable to the markets we pulled it from. No synthesized numbers. No back-tested narratives masquerading as live signal.",
  },
  {
    eyebrow: "02 · Reasoning is published",
    title: "If we can't show our work, we don't publish.",
    body:
      "Each pick exposes its factor breakdown — consensus, market depth, line movement, intelligence layers, and the calibrated confidence the model assigned. You see the inputs. You decide what to do with them.",
  },
  {
    eyebrow: "03 · Outcomes are uncertain",
    title: "We sell perspective, not certainty.",
    body:
      "No locks. No guarantees. A signal with a 64% calibrated confidence still loses 36 out of 100 times. We design our public surfaces around that reality — variance is described, not hidden.",
  },
  {
    eyebrow: "04 · Trust is earned slowly",
    title: "Performance stats stay gated until they're honest.",
    body:
      "The public win-rate readout doesn't appear until enough canonical picks have settled to make it statistically meaningful. Until then, the Performance page says \"Collecting.\" That is the whole point.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main className="flex-1">
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">About</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">
              {BRAND_TAGLINE}
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-300">
              {BRAND_NAME} is a sports intelligence platform — not a tout
              service. We ingest live odds, score every matchup for edge, and
              publish a calibrated, fully-reasoned signal alongside every
              factor that drove it. The bar is simple: if we can&apos;t explain
              why, we don&apos;t publish.
            </p>
          </div>
        </section>

        <section className="border-t border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Operating principles</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-white">
              The four rules we don&apos;t break.
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
              {PRINCIPLES.map((p) => (
                <article
                  key={p.eyebrow}
                  className="surface-card flex flex-col gap-3 p-6"
                >
                  <p className="eyebrow">{p.eyebrow}</p>
                  <h3 className="font-display text-xl text-white">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-300">
                    {p.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Contact</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-white">
              Real people answer.
            </h2>
            <p className="mt-5 text-base text-ink-300">
              Press, partnerships, product feedback, or just want to argue
              about a line — write to{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-mono text-accent-300 underline-offset-4 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              . We aim to reply within one business day.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/methodology" className="btn btn-primary">
                Read the methodology →
              </Link>
              <Link href="/contact" className="btn btn-ghost">
                All inboxes
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
