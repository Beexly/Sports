import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `What we refuse to do — ${BRAND_NAME}`,
  description:
    "The conversion patterns Galaxy Sports Edge refuses to use, with evidence of why each is harmful. Constitution-aligned. Brave.",
};

interface Refusal {
  readonly pattern: string;
  readonly whatItLooksLike: string;
  readonly whyItIsHarmful: string;
  readonly whatWeDoInstead: string;
}

const REFUSALS: ReadonlyArray<Refusal> = [
  {
    pattern: "Loss-triggered upsell",
    whatItLooksLike:
      "After a user loses a bet or grades a settled pick as LOSS, the product surfaces a new premium tier, a discount, or a higher-stakes recommendation. Often framed as 'win it back.'",
    whyItIsHarmful:
      "It exploits the gambler's fallacy and tilt psychology. The user is at their most cognitively impaired moment; the product is designed to pull them deeper.",
    whatWeDoInstead:
      "After a loss, the Decision Coach routes to no-bet and autopsy surfaces. The Command Center widget for No-Bet Credits surfaces. No premium upgrade prompts fire after a loss.",
  },
  {
    pattern: "Scarcity timers",
    whatItLooksLike:
      "Limited-time offers with countdown timers on pricing pages. 'This lock expires in 4 hours.' Pressure to commit before the user can deliberate.",
    whyItIsHarmful:
      "It substitutes urgency for evidence. Disciplined research is the opposite of timed pressure. A real edge does not require a clock to convert.",
    whatWeDoInstead:
      "Pricing is steady. The subscription button is available at any time. We never advertise a 'limited' price unless it is genuinely a one-time, public, transparent promotion.",
  },
  {
    pattern: "Social bandwagon framing",
    whatItLooksLike:
      "'73% of users are tailing this pick.' 'Most pros are on the under.' Implied consensus engineered to make the user join the herd.",
    whyItIsHarmful:
      "It manufactures the appearance of independent agreement. Crowd-following is not edge — it is the opposite of edge.",
    whatWeDoInstead:
      "We surface bookmaker consensus and public-money percentage when they are evidentially relevant. We never frame other user behavior as a signal to act.",
  },
  {
    pattern: "Hot-streak amplification",
    whatItLooksLike:
      "A short winning streak is converted into a marketing claim: 'Up 47 units this week!' New users see the streak before they see the long-run record.",
    whyItIsHarmful:
      "Short runs are noise. Marketing them as signal trains users to chase variance.",
    whatWeDoInstead:
      "The canonical ledger is append-only. The first thing a new visitor sees is the long-run record, not the last seven days. Streaks are not separately surfaced.",
  },
  {
    pattern: "Manufactured insider language",
    whatItLooksLike:
      "Terms like 'sharp money,' 'steam,' and 'square' deployed without evidence to flatter the user into feeling like they are part of an in-group. Followed by a paywall.",
    whyItIsHarmful:
      "It substitutes belonging for understanding. Users buy a feeling, not an edge.",
    whatWeDoInstead:
      "Academy modules teach the actual concepts (line movement, public-vs-sharp money, market depth) with evidence and primary sources. The vocabulary is taught, not deployed as marketing.",
  },
  {
    pattern: "Affiliate-driven 'best book' rankings",
    whatItLooksLike:
      "Recommendation pages ranking sportsbooks by what pays the highest affiliate commission. Disclosed as 'partner' but visually indistinguishable from editorial.",
    whyItIsHarmful:
      "It corrupts the trust contract. The recommendation is for the publisher, not the user.",
    whatWeDoInstead:
      "Galaxy takes no book affiliate revenue and runs no book rankings. The subscription is the only revenue stream. Sportsbook names appear only when they are odds sources, never as recommendations.",
  },
  {
    pattern: "Public ledger that hides losses",
    whatItLooksLike:
      "A published record that quietly drops losing buckets, filters by 'recent strong period,' or counts pushes as wins to inflate the rate.",
    whyItIsHarmful:
      "It pretends to be the record while being the marketing. Users trust the number; the number is fiction.",
    whatWeDoInstead:
      "Our canonical ledger is append-only. We do not edit history. Calibration buckets that fail to meet the publish gate are shown as accumulating — never hidden. Losing buckets are shown.",
  },
  {
    pattern: "Certainty language",
    whatItLooksLike:
      "Copy claiming 'guaranteed wins,' 'locks,' or '100% accurate' picks. The vocabulary of fraud.",
    whyItIsHarmful:
      "It misrepresents the nature of probabilistic systems. Anyone telling you a sports outcome is certain is selling you something other than information.",
    whatWeDoInstead:
      "Every pick has a confidence band. Every public claim includes a 'what would change this read' failure case. Certainty language is banned by the trust-gate scanner and the voice-lint scanner.",
  },
];

export default function WeAreNotPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <header className="border-b border-mineral pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400">
            What we refuse to do
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
            We are not a tout.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
            The conversion patterns the rest of the category uses to turn weakness into revenue. We refuse them. Here is the inventory, with evidence of why each is harmful and what we do instead.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-500">
            This page names patterns, not companies. If a competitor reads this and removes a pattern, that is a win for users.
          </p>
        </header>

        {/* ── Refusals ───────────────────────────────────────────────────── */}
        <ol className="space-y-12">
          {REFUSALS.map((refusal, i) => (
            <li key={refusal.pattern} className="border-l-2 border-amber-700/40 pl-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-500">
                Refusal {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-white sm:text-3xl">
                {refusal.pattern}
              </h2>

              <div className="mt-5 grid gap-5 sm:grid-cols-3">
                <article>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-gray-500">
                    What it looks like
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    {refusal.whatItLooksLike}
                  </p>
                </article>

                <article>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-amber-500">
                    Why it is harmful
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    {refusal.whyItIsHarmful}
                  </p>
                </article>

                <article>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-emerald-400">
                    What we do instead
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    {refusal.whatWeDoInstead}
                  </p>
                </article>
              </div>
            </li>
          ))}
        </ol>

        {/* ── Closing CTA ────────────────────────────────────────────────── */}
        <section className="border-t border-mineral pt-10 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
            Read the manifesto, then the record
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/manifesto"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ion-blue px-6 text-sm font-bold text-carbon hover:opacity-90"
            >
              Read the manifesto
            </Link>
            <Link
              href="/ledger/canonical"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-6 text-sm font-bold text-gray-200 hover:border-cyan-400 hover:text-cyan-100"
            >
              Open the canonical ledger
            </Link>
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
