import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME, CLOSING_LINE } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Manifesto — ${BRAND_NAME}`,
  description:
    "Outcome is noise. Process is everything. We publish the record, not the hype. The Galaxy Sports Edge manifesto.",
};

interface Beat {
  readonly eyebrow: string;
  readonly headline: string;
  readonly body: string;
  readonly accent: string;
}

const BEATS: ReadonlyArray<Beat> = [
  {
    eyebrow: "BEAT 01 — Why we exist",
    headline: "Outcome is noise. Process is everything.",
    body:
      "Sports betting tells you the score is the signal. It is not. The score is a single sample from a probability distribution. The process that produced your decision — the evidence you read, the line you took, the discipline that stopped you from chasing — that is the only thing you can control. We were built to make process visible.",
    accent: "text-ion-blue",
  },
  {
    eyebrow: "BEAT 02 — What we are not",
    headline: "We are not a tout.",
    body:
      "We do not sell certainty. We do not promise winners. We do not run scarcity timers. We do not punish you with social pressure after a loss. We do not amplify a hot streak to make you bet bigger. The patterns the rest of the category uses to convert weakness into revenue — we refuse them.",
    accent: "text-amber-400",
  },
  {
    eyebrow: "BEAT 03 — What we publish",
    headline: "Every pick. Every pass. Every settled outcome.",
    body:
      "Our ledger is append-only. We do not edit our history. We do not hide losing buckets. We do not relabel bootstrap data as production. Calibration that does not meet the publish gate is shown as accumulating — never as proof.",
    accent: "text-emerald-400",
  },
  {
    eyebrow: "BEAT 04 — Why a model",
    headline: "Disagreement compounds when it is independent.",
    body:
      "A book sets a line. Public money pushes it one way. Sharp money pushes it another. A model that disagrees with both — for reasons it can defend, with evidence it can show — sometimes finds an edge. That is the only reason to publish a pick. Not because the model is brilliant. Because the disagreement is independent.",
    accent: "text-cyan-400",
  },
  {
    eyebrow: "BEAT 05 — Why no-bet matters more than picks",
    headline: "A disciplined pass is a win.",
    body:
      "We are louder about what we skipped than about what we published. The no-bet list is the most important page on this site. It teaches you the discipline of refusal — the muscle that separates bettors who survive ten years from bettors who survive ten weeks.",
    accent: "text-orange-400",
  },
  {
    eyebrow: "BEAT 06 — Evidence chain",
    headline: "Every claim has a source.",
    body:
      "Each data point we render carries a source label, a freshness label, and an honest failure case. If the evidence health is low, we say so. If the data is stale, we say so. If the model has not yet earned the confidence to publish, we say so. The evidence chain is the product.",
    accent: "text-purple-400",
  },
  {
    eyebrow: "BEAT 07 — The autopsy",
    headline: "Grade the process, not the result.",
    body:
      "After every settled pick, we ask: did you check the evidence before acting? Did you identify what would make you wrong? Did you size appropriately? The outcome is one sample. The process is the only thing you can improve. Galaxy is a teaching machine for that.",
    accent: "text-indigo-400",
  },
  {
    eyebrow: "BEAT 08 — Why a price",
    headline: "We charge because we do not sell ads.",
    body:
      "We do not run book affiliate links. We do not take a cut of your wagers. We do not push promotions. The subscription is the only revenue. It buys you the model, the evidence, and the discipline — not the picks.",
    accent: "text-pink-400",
  },
  {
    eyebrow: "BEAT 09 — Galaxy critiques Galaxy",
    headline: "We publish what we got wrong.",
    body:
      "When a model version produces a losing month, we name the version, name the failure, and name what changed. When a calibration bucket drifts, the proposal is logged. When a methodology decision turns out to be wrong, the ADR records it. Public introspection is the only way to earn long-run trust.",
    accent: "text-rose-400",
  },
  {
    eyebrow: "BEAT 10 — What we owe you",
    headline: "We owe you the evidence, not the certainty.",
    body:
      "You deserve to know what the model knows, how confident it is, what it does not know, and what would change its read. You do not deserve to be told you are going to win. Anyone who tells you that is selling you something other than information.",
    accent: "text-teal-400",
  },
  {
    eyebrow: "BEAT 11 — The contract",
    headline: CLOSING_LINE,
    body:
      "The model detects. You decide. That is the contract. We will not bet for you. We will not pressure you to bet. We will give you the cleanest read we can construct, attached to the evidence that produced it, and we will tell you when we cannot construct it. The rest is yours.",
    accent: "text-white",
  },
];

export default function ManifestoPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-4xl flex-col gap-0 px-4 py-12 sm:px-6 lg:px-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="border-b border-mineral pb-14">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            The {BRAND_NAME} manifesto
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
            Outcome is noise.<br />
            Process is everything.<br />
            We publish the record, not the hype.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-gray-400">
            Eleven beats. One thesis. If any of these beats stop being true, we owe you a correction.
          </p>
        </header>

        {/* ── Beats ──────────────────────────────────────────────────────── */}
        <ol className="space-y-0">
          {BEATS.map((beat, i) => (
            <li
              key={beat.eyebrow}
              className={[
                "border-b border-mineral py-16",
                i === BEATS.length - 1 ? "border-b-0" : "",
              ].join(" ")}
            >
              <p className={["font-mono text-[10px] uppercase tracking-[0.22em]", beat.accent].join(" ")}>
                {beat.eyebrow}
              </p>
              <h2 className="mt-4 text-2xl font-bold leading-tight text-white sm:text-4xl">
                {beat.headline}
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
                {beat.body}
              </p>
            </li>
          ))}
        </ol>

        {/* ── Closing CTA ────────────────────────────────────────────────── */}
        <section className="border-t border-mineral py-12 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
            Read the record
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/ledger/canonical"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ion-blue px-6 text-sm font-bold text-carbon hover:opacity-90"
            >
              Open the canonical ledger
            </Link>
            <Link
              href="/methodology"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-6 text-sm font-bold text-gray-200 hover:border-cyan-400 hover:text-cyan-100"
            >
              Read the methodology
            </Link>
          </div>
        </section>

        <RiskDisclosure variant="compact" className="mt-8 text-center" />
      </main>
      <Footer />
    </div>
  );
}
