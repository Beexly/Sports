/**
 * /accountability — public accountability front door.
 *
 * This page does NOT fabricate stats. It links and re-renders surfaces that
 * already exist with their own freshness stamps:
 *   - /performance/losses  (Hall of Misses — public loss autopsies)
 *   - /performance         (Calibration Report / Honest Band)
 *   - /changelog           (model versions, gate flips, ship log)
 *
 * Voice: the desk voice — direct, human, no marketing filler.
 * See lib/voice/analyst-standard.ts for BANNED_ANALYST_PHRASES.
 *
 * Source commitment: docs/strategy/platform-gaps-triage.md gap #14/21
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";
import { GeneratedPlate } from "@/components/immersive/generated-plate";

export const metadata: Metadata = {
  title: `Accountability — ${BRAND_NAME}`,
  description:
    "We grade ourselves in public. Losses get autopsies. The model is versioned and every version is logged. Nothing is hidden to make the record look cleaner.",
  alternates: { canonical: "/accountability" },
  openGraph: {
    title: `Accountability — ${BRAND_NAME}`,
    description:
      "Public accountability page. Loss autopsies, calibration report, and the model changelog — all linked here. No cherry-picking.",
    url: "/accountability",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Accountability — ${BRAND_NAME}`,
    description:
      "Losses get autopsies. The model is versioned. The record is public.",
  },
};

// ── Section card sub-component ────────────────────────────────────────────────

function AccountabilityCard({
  eyebrow,
  title,
  body,
  href,
  linkLabel,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-mineral bg-eclipse/50 p-6">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-ion-2">
        {eyebrow}
      </p>
      <h2 className="text-xl font-bold text-ion-white">{title}</h2>
      <p className="text-sm leading-6 text-ion-1">{body}</p>
      <Link
        href={href}
        className="mt-auto self-start rounded-lg border border-orbital-cyan/40 px-4 py-2 text-sm font-semibold text-orbital-cyan hover:bg-orbital-cyan/10"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountabilityPage() {
  return (
    <div className="relative isolate min-h-screen bg-carbon text-ion">
      <GeneratedPlate assetId="accountability-steady" className="-z-10 opacity-20" />
      <Nav />

      <main className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="border-b border-mineral pb-10">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-orbital-cyan">
            Accountability
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-ion-white sm:text-5xl">
            We grade ourselves in public.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            Losses get autopsies. The model is versioned. Every gate flip and
            calibration update is logged with a date. Nothing is quietly removed
            to make the record look cleaner — if a pick lost, it stays in the
            ledger and it gets a post-mortem when review is complete.
          </p>
          <p className="mt-3 text-sm text-ion-2">
            The credibility of every future pick depends on the integrity of the
            existing record. That is the only reason transparency is worth doing.
          </p>
        </header>

        {/* Four sections — three original + Proof of Record */}
        <section className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
          <AccountabilityCard
            eyebrow="Loss autopsies"
            title="Hall of Misses"
            body="Every published non-bootstrap pick that settled as a loss is in the Loss Room. Post-mortems attach when operator review is complete. The original reasoning and signal snapshot stay visible regardless."
            href="/performance/losses"
            linkLabel="Open the Loss Room"
          />

          <AccountabilityCard
            eyebrow="Calibration report"
            title="Honest Band"
            body="The calibration report includes every settled canonical pick. Bootstrap-era picks are excluded by design — they do not get to inflate the record. Win rate stays gated until enough settled history exists to publish a number that is honest."
            href="/performance"
            linkLabel="View Calibration Report"
          />

          <AccountabilityCard
            eyebrow="Closing line value"
            title="Beat the close"
            body="The sharp-credible leading indicator of edge: whether the price we locked beat where the market closed — the one number tout services never show. Published under the same gate as the win rate, with no number shown before it can be honestly backed."
            href="/clv"
            linkLabel="See our CLV"
          />

          <AccountabilityCard
            eyebrow="Model changelog"
            title="Ship log"
            body="Every model version, gate flip, and calibration update is logged publicly with a date and a reason. The changelog is how the record stays readable over time — not just a snapshot of where things stand today."
            href="/changelog"
            linkLabel="Read the Changelog"
          />

          <AccountabilityCard
            eyebrow="Tamper-evident record"
            title="Proof of Record"
            body="Every settled pick carries a Merkle leaf hash stamped at generation time. Change a pick after the fact and the hash breaks. The Merkle root over all settled picks is published publicly so anyone can re-derive it and verify the record."
            href="/proof"
            linkLabel="View Proof of Record"
          />
        </section>

        {/* What these sections cover */}
        <section className="rounded-2xl border border-mineral bg-eclipse/30 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-ion-2">
            What these surfaces cover
          </h2>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <dt className="font-semibold text-ion-white">Loss autopsies</dt>
              <dd className="text-ion-1">
                Root-cause analysis, signal snapshot, model version, what we
                saw vs. what happened, and what changed afterward.
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-semibold text-ion-white">Calibration</dt>
              <dd className="text-ion-1">
                Win rate by sport, push rate, sample size, Honest Band
                (uncertainty range), and the methodology behind the numbers.
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-semibold text-ion-white">Model versions</dt>
              <dd className="text-ion-1">
                Every pick carries a model version tag. The changelog links
                those tags to what changed in the scoring logic.
              </dd>
            </div>
          </dl>
        </section>

        {/* The commitment */}
        <section className="border-t border-mineral pt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ion-2">
            The commitment
          </h2>
          <ul className="flex flex-col gap-2 text-sm leading-6 text-ion-1">
            {[
              "No pick is removed from the ledger once settled — wins and losses stay.",
              "Bootstrap-era picks are excluded from the win-rate denominator and labelled as such.",
              "Post-mortems are written by the operator, not generated — they go through review before publishing.",
              "Model versions are semantic and auditable — every settled pick carries the version that produced it.",
              "The calibration gate does not open until the settled sample is large enough to publish a number that is honest.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <span
                  aria-hidden
                  className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orbital-cyan"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>

      <Footer />
    </div>
  );
}
