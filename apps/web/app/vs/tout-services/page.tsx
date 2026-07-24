import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { ToutComparison } from "@/components/home/tout-comparison";
import { BRAND_NAME } from "@/lib/brand";

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
    "Galaxy Sports Edge vs. Tout Services: Transparent Picks With Reasoning Attached",
  description:
    "Tout services publish curated wins and quietly delete the losses. Galaxy Sports Edge publishes every signal's full factor trail and refuses to show a win-rate it can't honestly back. Here's the category contrast, no competitor named.",
  alternates: { canonical: "/vs/tout-services" },
  openGraph: {
    title:
      "Galaxy Sports Edge vs. Tout Services: The Category Contrast",
    description:
      "An anti-tout sports model: every pick shows its work, losses are counted, and the public win-rate stays gated until it can be backed.",
  },
};

export default function VsToutServicesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main id="main-content" className="flex-1">
        {/* HERO */}
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">vs. Tout services</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">
              {BRAND_NAME} is built to do the opposite of a tout service.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ion-1">
              If you&apos;ve paid for a &ldquo;capper&rdquo; before, you already
              know the pattern. The wins get screenshotted. The losses get
              scrubbed from the timeline. The public record looks great because
              it was chosen to look great. {BRAND_NAME} exists because the
              sports model space deserves a product that can&apos;t play that
              game.
            </p>
            <p className="mt-4 text-base text-ion-1">
              Not sure how to tell the difference? Start with{" "}
              <Link href="/how-to-verify-a-record" className="font-semibold text-orbital-cyan hover:text-ion-white">
                the five-part checklist for verifying any picks record
              </Link>
              , then run it on anyone, including us.
            </p>
          </div>
        </section>

        {/* THE COMPARISON BLOCK — reuses the homepage component */}
        <ToutComparison />

        {/* DEEPER SECTIONS — keyword-rich expansion */}
        <section className="border-t border-mineral/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">What makes a service a tout</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-ion-white">
              The four moves to watch for.
            </h2>
            <p className="mt-5 text-base text-ion-1">
              When evaluating a sports picks service, these are the four
              signals to look for. Three or more, and it&apos;s a tout,
              regardless of how the marketing sounds.
            </p>

            <ol className="mt-10 flex flex-col gap-6">
              {WATCHLIST.map((item) => (
                <li
                  key={item.title}
                  className="surface-card flex gap-4 p-6"
                >
                  <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orbital-cyan/40 font-mono text-sm font-bold text-orbital-cyan">
                    {item.number}
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-ion-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-ion-1">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* WHY IT MATTERS */}
        <section className="border-t border-mineral/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Why transparency is the moat</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-ion-white">
              Anyone can publish a pick. Only the disciplined publish a reason.
            </h2>
            <div className="mt-6 space-y-5 text-base leading-relaxed text-ion-1">
              <p>
                Sports markets are uncertain. A model with a 64% calibrated
                confidence on a single signal still loses 36 of 100 times.
                That is not a flaw. That is the math. Any service that hides
                this is selling certainty it cannot deliver.
              </p>
              <p>
                The defensible position in a noisy market is not &ldquo;we win
                more often than the others.&rdquo; The defensible position is:
                <em className="text-ion">
                  {" "}we show you the inputs, the reasoning, the gates, and the
                  outcomes. Every one. No curation. No delay between a losing
                  pick and its log entry.
                </em>
              </p>
              <p>
                That&apos;s what {BRAND_NAME} is. The Calibration Report stays
                gated until enough signals have settled to publish a defensible
                number. The Vault holds every published pick, every reasoning
                trail, every outcome. If the work can&apos;t be shown, it
                doesn&apos;t get published.
              </p>
              <p>
                That&apos;s a higher operating bar than the rest of the
                category. It is also the reason this exists.
              </p>
            </div>
          </div>
        </section>

        {/* CLV — the number touts never show */}
        <section className="border-t border-mineral/40 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">The benchmark they can&apos;t fake</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-ion-white">
              Ask a tout for their closing line value. Watch the silence.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ion-1">
              A win streak is a screenshot. Closing line value, whether the price
              you locked beat where the market actually closed, is the one number
              the sharps respect and the touts never publish, because it can&apos;t
              be cherry-picked. It&apos;s the leading indicator that an edge is real
              before a single game settles. We publish ours under the same gate as
              everything else: nothing shown until it can be honestly backed.
            </p>
            <Link
              href="/clv"
              className="mt-6 inline-flex items-center gap-2 font-mono text-sm font-semibold text-orbital-cyan hover:text-ion-white"
            >
              See our Closing Line Value →
            </Link>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-mineral/40 bg-obsidian/80 px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <h2 className="font-display text-display-lg text-ion-white">
              See what a signal actually looks like.
            </h2>
            <p className="text-ion-1">
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
    body: "Any service that quotes a percentage in the first weeks of operating is either making it up or computing it on a sample too small to mean anything. A statistically defensible number takes at least 100 settled signals, usually more. Ask to see the canonical settled history that produced it. They won't have it.",
  },
  {
    number: "02",
    title: "Losses disappear from the timeline.",
    body: "Watch their feed for a week. Note every confident pick. Check back after the games settle. If the wins are still pinned and the losses are nowhere to be found, that's the trick. The math only works if every signal is counted, win or lose.",
  },
  {
    number: "03",
    title: "There's a daily \"premium\" pick that's always there.",
    body: "Markets aren't always pickable. Some slates don't earn confidence. A service that always has a premium pick to sell you every single day is one that publishes whether or not the math supports it. A real model has the discipline to say nothing.",
  },
  {
    number: "04",
    title: "The reasoning is a vibe, not a factor trail.",
    body: "\"Sharp money is on the dog\" isn't a factor trail. The factor trail is: consensus across N books, line movement of X bps in Y minutes, market depth deep / shallow, freshness Z seconds, public lean P percent. If a service can't show the breakdown, the breakdown doesn't exist.",
  },
] as const;
