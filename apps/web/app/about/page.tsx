import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME, BRAND_TAGLINE, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About",
  description: `${BRAND_NAME}: ${BRAND_TAGLINE}. The story, the model, the operating principles.`,
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  {
    eyebrow: "01 · Data is source of truth",
    title: "Every pick traces to a real line.",
    body:
      "Live odds from dozens of sportsbooks, ingested on a 30-minute cadence. The model's view of a matchup is always reconcilable to the markets it was pulled from. No synthesized numbers. No back-tested narratives masquerading as live signal.",
  },
  {
    eyebrow: "02 · Reasoning is published",
    title: "If the work can't be shown, it doesn't ship.",
    body:
      "Each pick exposes its factor breakdown: consensus, market depth, line movement, intelligence layers, and the calibrated confidence the model assigned. You see the inputs. You decide what to do with them.",
  },
  {
    eyebrow: "03 · Outcomes are uncertain",
    title: "Perspective, not certainty.",
    body:
      "No certainty theater. No guarantees. A signal with a 64% calibrated confidence still loses 36 out of 100 times. Every public surface is designed around that reality. Variance is described, not hidden.",
  },
  {
    eyebrow: "04 · Trust is earned slowly",
    title: "Performance stats stay gated until they're honest.",
    body:
      "The public win-rate readout doesn't appear until enough settled picks exist to make it statistically meaningful. Until then, the Performance page says \"Collecting.\" Patience over noise. That's the standard.",
  },
];

export default function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main id="main-content" className="flex-1">
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Why this exists</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">
              Built for people tired of paying for picks from services that
              quietly delete the losses.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ion-1">
              {BRAND_NAME} exists because the sports picks industry runs on a
              quiet trick: tout services publish their wins, scrub their
              losses, and price their access against a record you can&apos;t
              verify. {BRAND_NAME} is the opposite: a system that shows its
              work on every pick and refuses to publish a win-rate it
              can&apos;t honestly back.
            </p>
            <p className="mt-5 max-w-2xl text-lg text-ion-1">
              {BRAND_NAME} ingests live odds across dozens of sportsbooks,
              scores every matchup for edge, and publishes a calibrated,
              fully-reasoned signal alongside every factor that drove it. The
              bar is simple: if it can&apos;t be explained, it doesn&apos;t
              get published.
            </p>
            <p className="mt-5 max-w-2xl font-mono text-sm uppercase tracking-[0.18em] text-ion-1">
              — The {BRAND_NAME} team
            </p>
          </div>
        </section>

        <section className="border-t border-mineral/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">Operating principles</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-ion-white">
              The four rules we don&apos;t break.
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
              {PRINCIPLES.map((p) => (
                <article
                  key={p.eyebrow}
                  className="surface-card flex flex-col gap-3 p-6"
                >
                  <p className="eyebrow">{p.eyebrow}</p>
                  <h3 className="font-display text-xl text-ion-white">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-ion-1">
                    {p.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-mineral/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Contact</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-ion-white">
              Every email gets read.
            </h2>
            <p className="mt-5 text-base text-ion-1">
              Press, partnerships, product feedback, or you just want to argue
              about a line, write to{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-mono text-orbital-cyan underline-offset-4 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
              . Replies typically within one business day.
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
