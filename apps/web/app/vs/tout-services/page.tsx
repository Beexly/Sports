import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { Atmosphere } from "@/components/ui/atmosphere";
import { Reveal } from "@/components/motion/reveal";
import { ToutComparison } from "@/components/home/tout-comparison";
import { BRAND_NAME, BRAND_COLORS } from "@/lib/brand";

/**
 * /vs/tout-services — SEO landing page targeting the "transparent sports
 * picks vs tout services" intent cluster. Reuses the homepage's
 * ToutComparison block, surrounded by keyword-rich founder-voice copy.
 *
 * Indexable. Linked from the comparison block on the homepage (and from
 * future blog posts) but not navigation-promoted, to keep the nav clean.
 */

export const metadata: Metadata = {
  title:
    "Galaxy Sports Edge vs. Tout Services — Graded Against the Closing Line",
  description:
    "Tout services publish curated wins and quietly delete the losses. Galaxy Sports Edge grades every signal against where the market actually settled and refuses to show a win-rate it can't honestly back. Here's the category contrast — no competitor named.",
  alternates: { canonical: "/vs/tout-services" },
  openGraph: {
    title:
      "Galaxy Sports Edge vs. Tout Services — The Category Contrast",
    description:
      "Every signal graded against the closing line. Every loss logged. The win-rate stays gated until the sample is honest.",
  },
};

export default function VsToutServicesPage() {
  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: BRAND_COLORS.obsidianBlack }}>
      <Atmosphere />
      <Nav />

      <main className="flex-1 text-ion-white">
        {/* HERO */}
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <p className="eyebrow" style={{ color: BRAND_COLORS.orbitalCyan }}>vs. Tout services</p>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-3 font-display text-display-xl text-balance text-white">
                {BRAND_NAME} is built to do the opposite of a tout service.
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="mt-6 max-w-2xl text-lg text-ink-300">
                If you&apos;ve paid for a &ldquo;capper&rdquo; before, you already
                know the pattern. The wins get screenshotted. The losses get
                scrubbed from the timeline. The public record looks great because
                it was chosen to look great. {BRAND_NAME} exists because the
                sports model space deserves a product that can&apos;t play that
                game.
              </p>
            </Reveal>
          </div>
        </section>

        {/* THE COMPARISON BLOCK — reuses the homepage component */}
        <ToutComparison />

        {/* DEEPER SECTIONS — keyword-rich expansion */}
        <section className="border-t border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">What makes a service a tout</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-white">
              The four moves to watch for.
            </h2>
            <p className="mt-5 text-base text-ink-300">
              When evaluating a sports picks service, these are the four
              signals to look for. Three or more, and it&apos;s a tout —
              regardless of how the marketing sounds.
            </p>

            <ol className="mt-10 flex flex-col gap-6">
              {WATCHLIST.map((item) => (
                <li
                  key={item.title}
                  className="surface-card flex gap-4 p-6"
                >
                  <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent-700 font-mono text-sm font-bold text-accent-300">
                    {item.number}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-300">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* WHY IT MATTERS */}
        <section className="border-t border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Why the record is the moat</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-white">
              The proof is the product.
            </h2>
            <div className="mt-6 space-y-5 text-base leading-relaxed text-ink-300">
              <p>
                Sports markets are uncertain. A model with a 64% calibrated
                confidence on a single signal still loses 36 of 100 times.
                That is not a flaw — that is the math. Any service that hides
                this is selling certainty it cannot deliver.
              </p>
              <p>
                The defensible position in a noisy market is not &ldquo;we win
                more often than the others.&rdquo; The defensible position is:
                <em className="text-ink-200">
                  {" "}every signal is graded against where the market actually
                  settled, every outcome is logged, and the record is there
                  whether the call was right or wrong.
                </em>
              </p>
              <p>
                That&apos;s what {BRAND_NAME} is. The Calibration Report stays
                gated until enough signals have settled to publish a defensible
                number. The Vault holds every published pick and every settled
                outcome. No curation. No delay between a losing pick and its
                log entry.
              </p>
              <p>
                That&apos;s a higher operating bar than the rest of the
                category. It is also the reason this exists.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-ink-800/60 bg-ink-1000/80 px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <h2 className="font-display text-display-lg text-white">
              See what a signal actually looks like.
            </h2>
            <p className="text-ink-300">
              The Signal Feed opens once the readiness gate clears. In the
              meantime, the methodology page walks through exactly how a
              signal gets scored, gated, and shipped.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/methodology"
                className="btn-primary px-7 py-3.5 text-base"
              >
                See the methodology →
              </Link>
              <Link
                href="/auth/signin"
                className="btn-secondary px-7 py-3.5 text-base"
              >
                Get the open alert
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

const WATCHLIST = [
  {
    number: "01",
    title: "They publish a win-rate from day one.",
    body: "Any service that quotes a percentage in the first weeks of operating is either making it up or computing it on a sample too small to mean anything. A statistically defensible number takes at least 100 settled signals — usually more. Ask to see the canonical settled history that produced it. They won't have it.",
  },
  {
    number: "02",
    title: "Losses disappear from the timeline.",
    body: "Watch their feed for a week. Note every confident pick. Check back after the games settle. If the wins are still pinned and the losses are nowhere to be found — that's the trick. The math only works if every signal is counted, win or lose.",
  },
  {
    number: "03",
    title: "There's a daily \"premium\" pick that's always there.",
    body: "Markets aren't always pickable. Some slates don't earn confidence. A service that always has a premium pick to sell you every single day is one that publishes whether or not the math supports it. A real model has the discipline to say nothing.",
  },
  {
    number: "04",
    title: "The reasoning is a vibe, not a verifiable output.",
    body: "\"Sharp money is on the dog\" is not a calibrated read — it's a feeling dressed up as analysis. A real signal has a confidence level attached and gets graded against the closing line when it settles. If a service can't show you the outcome history to back the claim, the claim doesn't exist.",
  },
] as const;
