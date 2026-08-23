import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";
import { jsonLdScript } from "@/lib/seo/json-ld";
import { getCurrentPricingPhase } from "@/lib/pricing/pricing-phases";

// Phase-derived prices so this page can never advertise a rate checkout won't
// honor when PRICING_PHASE advances (same source of truth as /pricing).
const phase = getCurrentPricingPhase();

/**
 * /faq — Standalone FAQ landing page with FAQPage JSON-LD.
 *
 * The pricing page already has a short FAQ tuned to checkout decisions;
 * this page is the comprehensive one — targets the long-tail SEO intent
 * cluster ("what is galaxy sports edge", "how do sports signals work",
 * "is galaxy sports edge legit", etc.).
 *
 * Voice: first-person founder. Same brand-safety rules as everywhere
 * else — no banned phrases, no win-rate claims, no curated record.
 */

export const metadata: Metadata = {
  title: "FAQ: Common questions about Galaxy Sports Edge",
  description:
    "Plain answers about how the model scores signals, why the Calibration Report is gated, what Pro and Elite get, and how this is different from a tout service.",
  alternates: { canonical: "/faq" },
};

type FaqGroup = {
  heading: string;
  items: ReadonlyArray<{ q: string; a: string }>;
};

const GROUPS: ReadonlyArray<FaqGroup> = [
  {
    heading: "The product",
    items: [
      {
        q: "What is Galaxy Sports Edge?",
        a: "A sports intelligence platform. Galaxy Sports Edge pulls in live odds from multiple sportsbooks on a regular schedule, scores every matchup for edge, and publishes a calibrated signal. Free gets a daily two-pick teaser — the matchup and pick type — plus the public Edge Index and the open verified record. Pro and Elite unlock the full board with the confidence rating and the complete factor trail behind each pick.",
      },
      {
        q: "How is this different from a tout service?",
        a: "Tout services publish their wins and quietly delete the losses. Galaxy Sports Edge publishes every signal's full factor trail (consensus, line movement, market depth, freshness, intelligence layers) and holds back a public win-rate until enough canonical settled signals exist to support one honestly. The page reads \"Collecting\" until that's true. Patience over noise.",
      },
      {
        q: "Which sports are covered?",
        a: "NFL, NCAAF, NBA, NCAAB, MLB, NHL, and MLS. All seven with live odds refreshed regularly during games.",
      },
      {
        q: "What's the philosophy behind it?",
        a: "One model, one standard. Galaxy Sports Edge was built because the sports picks industry runs on a quiet trick: services that publish their wins and scrub their losses. The opposite approach: show the work on every pick, gate the win-rate readout until it's statistically defensible, and let the data do the talking.",
      },
    ],
  },
  {
    heading: "Trust & transparency",
    items: [
      {
        q: "Why is the Performance page empty?",
        a: "The Calibration Report stays gated until enough canonical settled signals have accumulated to publish a number that's statistically defensible. Could be 100 settled signals, could be 500. Whatever it takes for the number to be honest. The page says \"Collecting\" until then. That's the whole point of the design.",
      },
      {
        q: "What's the Edge Index?",
        a: "A calibrated 0-100 confidence rating on every signal. Not a probability the pick wins, but a measure of how much the market is offering vs. what the model thinks the matchup is worth. A 71 Edge Index still loses ~29 times in 100. Variance is described, not hidden.",
      },
      {
        q: "What's Eclipse Gate?",
        a: "Verified conviction state: the rarest grade. Only signals where every gate cleared by a wide margin earn it. It's the model's strongest honest signal, not a promise about the outcome. It still loses sometimes.",
      },
      {
        q: "Can I see the factor trail on every signal?",
        a: "Yes, that's the whole product. Every published signal exposes its full factor breakdown: which books, what line movement, market depth, freshness, public lean, intelligence layers. You read what the model read.",
      },
      {
        q: "Does the model ever stay quiet?",
        a: "Often. The four readiness gates exist specifically to keep weak signals off the board. If a slate doesn't earn confidence, nothing publishes. The opposite of a tout service that always has a pick of the day.",
      },
    ],
  },
  {
    heading: "Pricing & billing",
    items: [
      {
        q: "What does Free get?",
        a: "A daily two-pick teaser — the matchup and pick type — plus the Edge Index, the open verified record, and the full Academy. The full board, the confidence rating, and the factor trail are Pro and Elite.",
      },
      {
        q: "What does Pro get?",
        a: `$${phase.pro.monthly}/month, or $${phase.pro.annual}/year. Every signal, every day, with the calibrated confidence rating and full factor trail on each one. Plus line-movement intel on every pick.`,
      },
      {
        q: "What does Elite get?",
        a: `$${phase.elite.monthly}/month, or $${phase.elite.annual}/year. Everything in Pro plus email and push notifications for high-Edge-Index signals as they ship.`,
      },
      {
        q: "Is there a refund window?",
        a: "No free trial, but every paid plan has a 3-day money-back window. Cancel any time from your dashboard, no questions.",
      },
      {
        q: "Will pricing change?",
        a: `Free stays free. Pro is $${phase.pro.monthly}/month, Elite is $${phase.elite.monthly}/month at the current ${phase.name} rate, locked for the life of your subscription. The full price ladder is public on the pricing page: each step up is triggered by a verified proof milestone, and when prices rise for new members, yours never does.`,
      },
    ],
  },
  {
    heading: "Account & data",
    items: [
      {
        q: "How do I sign up?",
        a: "With your Google account. Click \"Sign in\" and you're in. Email-based sign-in is coming.",
      },
      {
        q: "Where can I see my subscription?",
        a: "Your dashboard has a Manage Billing button that opens the Stripe customer portal. Update card, change tier, cancel, download invoices, all from there.",
      },
      {
        q: "What data do you store about me?",
        a: "Email, Google OAuth identifier, and your subscription status. That's it. No browsing history, no behavioral profiling. The privacy page has the full disclosure.",
      },
      {
        q: "How do I delete my account?",
        a: "Email hq@galaxysportsedge.com from the address on the account and we'll process the deletion. The privacy page documents the full process.",
      },
    ],
  },
  {
    heading: "Responsibility",
    items: [
      {
        q: "Is sports betting risky?",
        a: "Yes. Real risk. Only stake what you can afford to lose without changing your week. If you or someone you know has a gambling problem, call 1-800-GAMBLER. The /responsible-play page has resources and self-exclusion options.",
      },
      {
        q: "Should I bet every signal?",
        a: "No. Treat every signal as one input in a disciplined process, never the decision itself. Set limits before emotion enters. The signal tells you what the model sees; you decide what to do with that.",
      },
      {
        q: "What does the model say when it loses?",
        a: "The same thing it says when it wins: here are the factors that drove the read. Every settled signal, win or loss, gets logged with its full factor trail. The Vault is the receipt.",
      },
    ],
  },
];

// FAQPage JSON-LD — flat list of every Q/A, for rich-result eligibility.
const FLATTENED_FAQ = GROUPS.flatMap((g) => g.items);

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FLATTENED_FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Nav />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd) }}
      />

      <main id="main-content" className="flex-1">
        <section className="px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="eyebrow">FAQ</p>
            <h1 className="mt-3 font-display text-display-xl text-balance text-ion-white">
              The questions that come up most.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-ion-1">
              Plain answers about how {BRAND_NAME} works, what&apos;s gated,
              what&apos;s open, and how this is different from the rest of the
              category. If your question isn&apos;t here, write to{" "}
              <a
                href="mailto:hq@galaxysportsedge.com"
                className="font-mono text-orbital-cyan underline-offset-4 hover:underline"
              >
                hq@galaxysportsedge.com
              </a>{" "}
              and it&apos;ll get added.
            </p>
          </div>
        </section>

        {GROUPS.map((group) => (
          <section
            key={group.heading}
            className="border-t border-mineral/40 px-4 py-16 sm:px-6 lg:px-8"
          >
            <div className="mx-auto max-w-3xl">
              <h2 className="font-display text-display-lg text-balance text-ion-white">
                {group.heading}
              </h2>
              <div className="mt-8 divide-y divide-mineral/40 rounded-2xl border border-mineral/60 bg-eclipse/40">
                {group.items.map((item) => (
                  <details
                    key={item.q}
                    className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-sm font-semibold text-ion">
                      <span>{item.q}</span>
                      <span
                        aria-hidden="true"
                        className="text-ion-2 transition-transform group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-ion-1">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className="border-t border-mineral/40 bg-obsidian/80 px-4 py-22 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <h2 className="font-display text-display-lg text-ion-white">
              Still have a question?
            </h2>
            <p className="text-ion-1">
              Reach out at{" "}
              <a
                href="mailto:hq@galaxysportsedge.com"
                className="font-mono text-orbital-cyan underline-offset-4 hover:underline"
              >
                hq@galaxysportsedge.com
              </a>
              . Every reply is direct from the team.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/methodology"
                className="btn-primary px-7 py-3.5 text-base"
              >
                Read the methodology →
              </Link>
              <Link
                href="/pricing"
                className="btn-secondary px-7 py-3.5 text-base"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
