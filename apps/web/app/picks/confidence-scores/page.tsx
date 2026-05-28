import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { BRAND_NAME } from "@/lib/brand";

const LAST_UPDATED = "2026-05-28";

export const metadata: Metadata = {
  title: "Confidence Scores — What 0–100 Means in Sports Intelligence | Galaxy Sports Edge",
  description:
    "What Galaxy Sports Edge confidence scores represent: how the 0–100 scale is calibrated against settled results, what each confidence band means, and why a 65 confidence pick still loses sometimes.",
  alternates: { canonical: "/picks/confidence-scores" },
  openGraph: {
    title: `Confidence Scores Explained — ${BRAND_NAME}`,
    description:
      "0–100 calibrated confidence: what each band means, how scores are updated after settlement, and why high confidence is not a win guarantee.",
  },
};

const FAQ_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does a confidence score mean on Galaxy Sports Edge?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A confidence score is the model's stated probability that the pick will settle correctly, expressed as a number from 0 to 100. A score of 65 means the model estimates a 65% probability of a correct outcome. It is not a hype score, a difficulty rating, or a qualitative label — it is a calibrated probability estimate that is updated each time a pick settles. The score is shown on every published pick so users can weight their own decision-making accordingly.",
      },
    },
    {
      "@type": "Question",
      name: "Why does a high-confidence pick still lose sometimes?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Because probability is not certainty. A pick with 70 confidence is expected to win roughly 70 times out of 100 and lose roughly 30 times — the 30 losses are part of the model's own stated expectation, not failures. Sports markets are uncertain by nature. Any model that claims to win all of its high-confidence picks is either fabricating statistics or has not settled enough picks to produce a meaningful sample. Galaxy Sports Edge publishes every settled pick — wins and losses alike — so the calibration history is fully transparent.",
      },
    },
    {
      "@type": "Question",
      name: "How is the confidence score calibrated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Calibration is updated after every settled pick. The model compares its predicted confidence to the actual outcome and adjusts the confidence scoring function for the current model version. A well-calibrated model produces scores where picks at 60 confidence win approximately 60% of the time, picks at 70 win approximately 70%, and so on. Calibration requires at least 30 settled picks per model version before it produces a statistically meaningful estimate — which is why the public calibration report is gated until that threshold is reached.",
      },
    },
    {
      "@type": "Question",
      name: "What is the minimum confidence for a published pick?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The minimum confidence threshold rises as the model accumulates settled picks. Early in a model version's history, the threshold is set conservatively — only high-confidence signals publish. As the calibration history grows and the model demonstrates reliability, the threshold may be adjusted. The current threshold is visible on the picks board. Picks below the threshold are evaluated and recorded internally but are not surfaced publicly.",
      },
    },
    {
      "@type": "Question",
      name: "What is a confidence band and how should I use it?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Galaxy Sports Edge groups confidence scores into bands — Exploratory (35–49), Moderate (50–64), Strong (65–79), and High (80+). The bands are a communication convenience, not a separate rating system. A pick at 64 and a pick at 65 are nearly identical — the band boundary is not a quality cliff. Use the raw score as the primary input; the band label is a shorthand for presenting the range to a non-technical audience.",
      },
    },
  ],
} as const;

const BANDS = [
  {
    range: "80–100",
    label: "High",
    color: "border-emerald-700 bg-emerald-950/20",
    badge: "text-emerald-300 border-emerald-700",
    description: "The factor trail is strong across multiple independent inputs. Data is fresh. Market and contextual signals align. These are the picks the model is most willing to stake its calibration on.",
    expectation: "Expected to settle correctly ~80–100% of the time, per calibration.",
  },
  {
    range: "65–79",
    label: "Strong",
    color: "border-cyan-700 bg-cyan-950/20",
    badge: "text-ion-blue border-cyan-700",
    description: "Multiple inputs align and data quality is high. A minority of inputs may be neutral or mildly unfavorable. These are standard published picks.",
    expectation: "Expected to settle correctly ~65–79% of the time.",
  },
  {
    range: "50–64",
    label: "Moderate",
    color: "border-yellow-700 bg-yellow-950/20",
    badge: "text-yellow-300 border-yellow-700",
    description: "The edge is present but narrow. Some inputs are neutral or diverge slightly. Published when the readiness threshold permits, with the lower confidence shown prominently.",
    expectation: "Expected to settle correctly ~50–64% of the time.",
  },
  {
    range: "35–49",
    label: "Exploratory",
    color: "border-mineral bg-gray-900/20",
    badge: "text-gray-400 border-gray-600",
    description: "Below the standard publish threshold. These picks are visible on the board for transparency — they show evaluated signals that did not meet the full gate. They are not recommendations.",
    expectation: "Below standard threshold. Displayed for transparency only.",
  },
] as const;

const CLUSTER_LINKS = [
  { href: "/picks", label: "Picks — today's board" },
  { href: "/picks/how-picks-are-scored", label: "How Picks Are Scored — the ten factors and publish gate" },
  { href: "/performance", label: "Performance — settled-pick calibration record" },
  { href: "/intelligence/how-it-works", label: "How the Intelligence Network Works" },
  { href: "/methodology", label: "Methodology — the full scoring guide" },
];

export default function ConfidenceScoresPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-carbon text-gray-100">
      <Nav />
      <main className="flex-1">
        <section className="border-b border-mineral bg-[radial-gradient(circle_at_30%_0%,rgba(34,211,238,0.08),transparent_40%)] px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-ion-blue">Picks Intelligence · Confidence</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Confidence scores.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-300">
              What the 0–100 scale means, how it is calibrated against settled results, and why a 65 still loses sometimes.
            </p>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Confidence bands</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-white">What each range means.</h2>
            </div>
            <div className="flex flex-col gap-4">
              {BANDS.map(({ range, label, color, badge, description, expectation }) => (
                <div key={range} className={`border p-6 ${color}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-2xl font-black text-white">{range}</span>
                    <span className={`inline-block border px-2 py-0.5 font-mono text-xs uppercase tracking-[0.14em] ${badge}`}>
                      {label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-gray-300">{description}</p>
                  <p className="mt-2 font-mono text-xs text-gray-500">{expectation}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-mineral bg-gray-900/35 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Common questions</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Confidence score FAQ</h2>
            <dl className="mt-8 flex flex-col gap-5">
              {(FAQ_LD.mainEntity as unknown as Array<{ name: string; acceptedAnswer: { text: string } }>).map(({ name, acceptedAnswer }) => (
                <div key={name} className="border border-mineral bg-carbon/60 p-5">
                  <dt className="text-base font-bold text-white">{name}</dt>
                  <dd className="mt-3 text-sm leading-7 text-gray-300">{acceptedAnswer.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">Continue reading</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Picks intelligence methodology cluster</h2>
            <ul className="mt-6 flex flex-col gap-2">
              {CLUSTER_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="block border border-mineral bg-carbon/60 px-4 py-3 text-sm text-gray-200 hover:border-cyan-700 hover:text-ion-blue">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gray-600">
              Last updated: {LAST_UPDATED} · Source: {BRAND_NAME} picks methodology
            </p>
          </div>
        </section>
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
    </div>
  );
}
