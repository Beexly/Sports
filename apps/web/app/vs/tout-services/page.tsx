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
    "Galaxy Sports Edge vs. Tout Services — Transparent Picks With Reasoning Attached",
  description:
    "Tout services publish curated wins and quietly delete the losses. Galaxy Sports Edge publishes every signal's full factor trail and refuses to show a win-rate it can't honestly back. Here's the category contrast — no competitor named.",
  alternates: { canonical: "/vs/tout-services" },
  openGraph: {
    title:
      "Galaxy Sports Edge vs. Tout Services — The Category Contrast",
    description:
      "An anti-tout sports model: every pick shows its work, losses are counted, and the public win-rate stays gated until it can be backed.",
  },
};

export default function VsToutServicesPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <main className="flex-1">
        {/* HERO */}
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">vs. Tout services</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-white">
              {BRAND_NAME} is built to do the opposite of a tout service.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ink-300">
              If you&apos;ve paid for a &ldquo;capper&rdquo; before, you already
              know the pattern. The wins get screenshotted. The losses get
              scrubbed from the timeline. The public record looks great because
              it was chosen to look great. {BRAND_NAME} exists because the
              sports model space deserves a product that can&apos;t play that
              game.
            </p>
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
            <p className="eyebrow">Why transparency is the moat</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-white">
              Anyone can publish a pick. Only the disciplined publish a reason.
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

        {/* THE 7 DECEPTIONS */}
        <section className="border-t border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Pattern recognition</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-white">
              The 7 deceptions of tout services.
            </h2>
            <p className="mt-5 text-base text-ink-300">
              None of these are new. They exist because they work on people who
              don&apos;t know to look for them. Now you do.
            </p>

            <ol className="mt-10 flex flex-col gap-4">
              {DECEPTIONS.map((item) => (
                <li
                  key={item.title}
                  className="surface-card flex gap-4 p-6"
                >
                  <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-800/60 font-mono text-sm font-bold text-red-400">
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

        {/* WHAT GALAXY DOES INSTEAD */}
        <section className="border-t border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="eyebrow">The contrast table</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-white">
              What Galaxy does instead.
            </h2>
            <p className="mt-5 max-w-2xl text-base text-ink-300">
              Every tout claim has a standard tout method behind it. Here&apos;s
              the row-by-row contrast — what they claim, how they deliver it, and
              how Galaxy handles the same question.
            </p>

            <div className="mt-10 overflow-x-auto rounded-2xl border border-ink-800/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-800/60 bg-ink-950/60">
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
                      Their claim
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-red-500/70">
                      Tout method
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-accent-400">
                      Galaxy method
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {CONTRAST_ROWS.map((row, i) => (
                    <tr
                      key={row.claim}
                      className={[
                        "border-b border-ink-800/40 transition-colors hover:bg-ink-900/20",
                        i % 2 === 0 ? "bg-ink-900/10" : "",
                      ].join(" ")}
                    >
                      <td className="px-5 py-4 font-medium text-ink-200">
                        {row.claim}
                      </td>
                      <td className="px-5 py-4 text-red-400/80">
                        {row.tout}
                      </td>
                      <td className="px-5 py-4 text-accent-300">
                        {row.galaxy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* HOW TO AUDIT A TOUT */}
        <section className="border-t border-ink-800/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Due diligence</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-white">
              How to audit a tout.
            </h2>
            <p className="mt-5 text-base text-ink-300">
              Five questions. Ask any picks service. The answers will tell you
              everything you need to know before you pay them a dollar.
            </p>

            <ul className="mt-10 flex flex-col gap-3">
              {AUDIT_QUESTIONS.map((question) => (
                <li
                  key={question}
                  className="surface-card flex items-start gap-4 p-5"
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-accent-700"
                    aria-hidden="true"
                  >
                    <svg
                      className="h-3 w-3 text-accent-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m4.5 12.75 6 6 9-13.5"
                      />
                    </svg>
                  </span>
                  <span className="text-sm leading-relaxed text-ink-200">
                    {question}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-sm text-ink-500 italic">
              If a service refuses any of these questions or gives you a vague
              answer — that is the answer.
            </p>
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

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
              Last updated: 2026-05-28 · Comparative positioning canon
            </p>
          </div>
        </section>
      </main>

      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: `${BRAND_NAME} vs. Tout Services — The Category Contrast`,
        description: "How transparent sports picks with full factor trails differ from tout services that publish only curated wins. Four red flags that identify a tout service.",
        dateModified: "2026-05-28",
        author: { "@type": "Organization", name: BRAND_NAME },
        publisher: { "@type": "Organization", name: BRAND_NAME },
      }) }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// The 7 Deceptions data
// ─────────────────────────────────────────────

const DECEPTIONS = [
  {
    number: "01",
    title: "Selective record-keeping",
    body: "They publish wins. They quietly delete losses. Their 'record' is hand-curated. The only way to verify a picks service's track record is to watch every pick in real time, before the game, and log the outcome yourself. They're counting on you not doing that.",
  },
  {
    number: "02",
    title: "Free pick bait",
    body: "The 'free pick' is always a winner. The premium pick package is the product. The free pick isn't free — it's a marketing expense designed to create belief in a record that doesn't exist. Ask to see the free picks they got wrong. They won't show you.",
  },
  {
    number: "03",
    title: "Fake scarcity",
    body: "'Only 3 spots left at this price' — refreshes daily. Artificial urgency is a pressure tactic designed to short-circuit your due diligence. A real sports model doesn't have 'spots.' It has picks. Take your time.",
  },
  {
    number: "04",
    title: "The certainty claim",
    body: "No pick is certain. Anyone calling a pick a 'can't miss' or using certainty language is describing narrative, not probability. Even an 80-confidence pick loses. The language of certainty is either a misunderstanding of variance or a deliberate manipulation.",
  },
  {
    number: "05",
    title: "Sharp money theater",
    body: "'Sharp action on X' — cited with no source, no methodology, no data. Sharp money claims without a specific mechanism (which books, what line move, what timing, what depth) are narrative, not intelligence. Treat them accordingly.",
  },
  {
    number: "06",
    title: "Proof by result",
    body: "They show you their best month. Never their worst quarter. Cherry-picked time windows are not performance records. A real performance record includes every pick, every result, no omissions, over a long enough window to be statistically meaningful.",
  },
  {
    number: "07",
    title: "Subscription creep",
    body: "The base package never includes the 'game of the year.' There's always a VIP add-on, a premium package, a season-long offer. The entry price was never meant to be the real price — it was meant to get you in the door.",
  },
] as const;

// ─────────────────────────────────────────────
// Contrast table data
// ─────────────────────────────────────────────

const CONTRAST_ROWS = [
  {
    claim: '"Verified record"',
    tout: "Select wins, omit losses",
    galaxy: "Append-only ledger, every pick recorded",
  },
  {
    claim: '"Sharp action detected"',
    tout: "Anonymous source",
    galaxy: "Specific tier-tagged evidence required",
  },
  {
    claim: '"Can\'t miss of the century"',
    tout: "Zero accountability",
    galaxy: "No picks described with certainty language",
  },
  {
    claim: '"Model says X"',
    tout: "Black box",
    galaxy: "Factor trail attached to every pick",
  },
  {
    claim: '"Win rate: 67%"',
    tout: "Unverified, unaudited",
    galaxy: "Gated until 30+ canonical settled picks",
  },
] as const;

// ─────────────────────────────────────────────
// Audit checklist data
// ─────────────────────────────────────────────

const AUDIT_QUESTIONS = [
  "Can I see every pick they've published, including the losses?",
  "Is their win rate based on all picks or just premium ones?",
  "Do they publish a pick BEFORE the game (not after)?",
  "Is their 'sharp money' claim backed by a specific source?",
  "What happens if you ask for a refund?",
] as const;

// ─────────────────────────────────────────────
// Original watchlist (four tout red flags)
// ─────────────────────────────────────────────

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
    title: "The reasoning is a vibe, not a factor trail.",
    body: "\"Sharp money is on the dog\" isn't a factor trail. The factor trail is: consensus across N books, line movement of X bps in Y minutes, market depth deep / shallow, freshness Z seconds, public lean P percent. If a service can't show the breakdown, the breakdown doesn't exist.",
  },
] as const;
