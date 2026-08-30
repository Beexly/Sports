import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { BRAND_NAME } from "@/lib/brand";

/**
 * /how-to-verify-a-record — SEO landing page for the "how to verify a
 * capper's / picks service's record" intent cluster. The page is genuinely
 * useful on its own (a five-part checklist a bettor can apply to ANY
 * service), and its closing move is one no competitor can copy: run the
 * checklist on us, live, right now. Indexable; linked from
 * /vs/tout-services and the sitemap.
 *
 * Copy rules honored: no tout language (no "guaranteed", no "verified track
 * record" phrasing), no method exposure, no dashes, no fabricated numbers.
 */

export const metadata: Metadata = {
  title: "How to Verify a Sports Picks Record Before You Pay",
  description:
    "Most picks records can't be checked, only believed. Here is a five-part checklist for testing any capper or picks service before you pay: timestamps, complete history, sample size, closing line value, and independent proof. Then run it on us, live.",
  alternates: { canonical: "/how-to-verify-a-record" },
  openGraph: {
    title: "How to Verify a Sports Picks Record Before You Pay",
    description:
      "Five checks any bettor can run on any picks service: timestamps, complete history, sample size, closing line value, independent proof.",
  },
};

const CHECKLIST = [
  {
    number: "1",
    title: "Were the picks committed before the games started?",
    body:
      "A record only counts if the picks provably existed before kickoff. Screenshots and testimonials prove nothing; they are made after the fact. Ask the service: where is the public, timestamped commitment for each pick? If the answer is trust, not proof, the record is a story.",
  },
  {
    number: "2",
    title: "Is every pick still there, including the losers?",
    body:
      "The oldest trick in the business is quiet deletion: post plenty of picks, erase the losses, screenshot what remains. A checkable record is append-only. Ask whether anything can be edited or removed after settlement, and how you would catch it if it were.",
  },
  {
    number: "3",
    title: "Is the sample big enough to mean anything?",
    body:
      "A 12-2 week is luck often enough that selling it is easy. Win rates only separate skill from chance over hundreds of settled picks. A service that flashes a hot streak but cannot show its full settled history at scale is showing you variance, not an edge.",
  },
  {
    number: "4",
    title: "Do they beat the closing line, not just the scoreboard?",
    body:
      "Results are noisy; prices are not. Closing line value asks whether the price they took was better than where the market finished, which is the strongest leading indicator that an edge is real. Services that never mention it usually have a reason.",
  },
  {
    number: "5",
    title: "Can YOU check any of this without trusting them?",
    body:
      "The final test is independence. If every claim routes back to the service's own say-so, you have marketing. A checkable record gives you something to verify yourself: raw data, cryptographic receipts, or third-party settlement you can inspect on your own machine.",
  },
] as const;

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: CHECKLIST.map((item) => ({
    "@type": "Question",
    name: item.title,
    acceptedAnswer: { "@type": "Answer", text: item.body },
  })),
};

export default function HowToVerifyARecordPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd) }}
      />

      <main id="main-content" className="flex-1">
        {/* HERO */}
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">The buyer&apos;s checklist</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">
              How to verify a sports picks record before you pay.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-ion-1">
              Most records in this industry cannot be checked, only believed.
              That is by design. Here are the five questions that separate a
              checkable record from a marketing story, no matter whose record
              it is, including ours.
            </p>
          </div>
        </section>

        {/* THE CHECKLIST */}
        <section className="border-t border-mineral/60 px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <ol className="flex flex-col gap-6">
              {CHECKLIST.map((item) => (
                <li key={item.title} className="surface-card flex gap-4 p-6">
                  <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-orbital-cyan/40 font-mono text-sm font-bold text-orbital-cyan">
                    {item.number}
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-ion-white">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-ion-1">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* RUN IT ON US — the unfakeable close */}
        <section
          data-testid="run-it-on-us"
          className="border-t border-mineral/60 px-4 py-20 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">Now run it on us</p>
            <h2 className="mt-3 font-display text-display-lg text-balance text-ion-white">
              Every check above works on {BRAND_NAME}, live, right now.
            </h2>
            <p className="mt-5 text-base text-ion-1">
              We built the platform so this checklist could be run against us
              by a stranger with no account. Picks publish with tamper-evident
              receipts frozen before kickoff. The settled ledger keeps every
              outcome, wins and losses alike, under one published master
              fingerprint. The public win rate stays withheld until the sample
              can honestly carry it. And the receipt math recomputes in your
              own browser, so no part of the proof asks you to trust our
              servers.
            </p>
            <ul className="mt-8 flex flex-col gap-3">
              {[
                { href: "/engine", label: "Watch the engine commit today's work", note: "check 1: pre-kickoff commitment, live" },
                { href: "/proof", label: "Browse the full settled ledger", note: "check 2: every outcome kept, none scrubbed" },
                { href: "/performance", label: "See the public record and its honesty floor", note: "check 3: sample size, stated plainly" },
                { href: "/clv", label: "Read our closing line value report", note: "check 4: graded against the close" },
                { href: "/verify", label: "Recompute a receipt in your browser", note: "check 5: independent, zero trust in us" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="surface-card flex min-h-11 flex-col gap-0.5 p-4 transition-colors hover:border-orbital-cyan/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-sm font-semibold text-ion-white">{l.label} →</span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ion-1">{l.note}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm text-ion-1">
              If the checklist convinces you, the board publishes two free
              picks every day, and{" "}
              <Link href="/pricing" className="font-semibold text-orbital-cyan hover:text-ion-white">
                Pro opens the rest
              </Link>
              . If it does not, take the checklist anyway. It works on
              everyone.
            </p>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <RiskDisclosure variant="compact" className="text-ion-1" />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
