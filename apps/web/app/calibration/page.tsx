/**
 * /calibration. The Proof Room (Galaxy Calibration).
 *
 * The 2026 IA pulls proof OUT of the Intelligence menu and gives it its own
 * door. This is the single branded surface that gathers every credibility
 * receipt the platform publishes. It does NOT fabricate stats. It routes to
 * the surfaces that each carry their own freshness stamp and honest-band gate:
 *
 *   - /performance          Calibration Report (Honest Band)
 *   - /clv                  Closing Line Value (beat-the-close benchmark)
 *   - /ledger               Trust Ledger (tamper-evident receipts)
 *   - /proof                Proof of Record (Merkle root)
 *   - /fable                FABLE Evidence Lab (source rights + AWS gates)
 *   - /accountability       Loss autopsies + the full public record
 *   - /track                CLV Tracker (track your own bets)
 *   - /intelligence/metrics How we read every metric, in plain terms
 *
 * Full content consolidation + redirects from the legacy routes land in a
 * follow-up; today this is the durable destination behind the "Proof" door.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { BRAND_NAME } from "@/lib/brand";
import { ProofExplorer } from "@/components/proof/proof-explorer";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";
import { MARKET_IMPLIED_CALIBRATION_CLAIM } from "@/lib/picks/market-implied-display";
import GateReading from "@/components/calibration/gate-reading";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: `The Proof Room · ${BRAND_NAME}` },
  description:
    "Galaxy Calibration: every credibility receipt in one place. Calibration report, closing line value, the trust ledger, tamper-evident proof of record, FABLE evidence gates, and public loss autopsies. No fabricated stats. Every number is gated until it can be honestly backed.",
  alternates: { canonical: "/calibration" },
  openGraph: {
    title: `The Proof Room · ${BRAND_NAME}`,
    description:
      "Galaxy Calibration: calibration, CLV, the trust ledger, proof of record, FABLE evidence gates, and loss autopsies. One branded surface.",
    url: "/calibration",
    type: "website",
  },
};

function ProofCard({
  eyebrow,
  title,
  body,
  href,
  linkLabel,
  accent = false,
}: {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`group relative flex flex-col gap-4 overflow-hidden rounded-2xl border ${accent ? "border-orbital-cyan/40 bg-orbital-cyan/[0.05]" : "border-mineral bg-eclipse/50"} p-6 transition-colors hover:border-orbital-cyan/50`}
    >
      {/* accent rail. Draws on hover, matching the home console */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-orbital-cyan transition-transform duration-500 ease-out group-hover:scale-x-100"
      />
      <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ion-2">
        <span aria-hidden className={`h-1 w-1 rounded-full ${accent ? "bg-orbital-cyan" : "bg-soft-ultraviolet"}`} />
        {eyebrow}
      </p>
      <h2 className="text-xl font-bold text-ion-white">{title}</h2>
      <p className="text-sm leading-6 text-ion-1">{body}</p>
      <Link
        href={href}
        className="mt-auto inline-flex items-center gap-1.5 self-start rounded-lg border border-orbital-cyan/40 px-4 py-2 text-sm font-semibold text-orbital-cyan transition-colors hover:bg-orbital-cyan/10"
      >
        {linkLabel}
        <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">→</span>
      </Link>
    </div>
  );
}

export default async function CalibrationProofRoomPage() {
  const { data: report } = await loadPublicCalibrationReport();

  return (
    // Same Field atmosphere as /verify: one room, one look. proof-crystal
    // plate + the extra nebula wash removed 2026-09-14 (owner: hideous, does
    // not match; the two trust pages did not even match each other).
    <div className="relative isolate min-h-screen bg-carbon text-ion gw-nebula">
      <Nav />

      <main id="main-content" className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
        <header className="-mx-4 border-b border-mineral px-4 pb-10 pt-6 sm:-mx-6 sm:px-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-orbital-cyan">
            The Proof Room · Galaxy Calibration
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-ion-white sm:text-5xl">
            Trust is an architecture, not a tagline.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-ion-1">
            Every credibility receipt the platform publishes, gathered in one place. No
            fabricated picks, no invented stats, no silent edits. Each number stays gated
            until the settled sample is large enough to back it honestly. And once it
            settles, it stays in the record, win or loss.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ion-1" data-testid="calibration-claim-scope">
            {MARKET_IMPLIED_CALIBRATION_CLAIM}
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-ion-2" data-testid="calibration-chart-basis">
            The interactive chart below groups settled picks by confidence score. It is a
            separate view of the same record, not the market-implied measurement described
            above.
          </p>
        </header>

        {/* The gate reading: the numbers the calibration receipt is built on. */}
        <GateReading />

        {/* Interactive head, the live calibration, explorable, not a link hub. */}
        <ProofExplorer
          buckets={report.buckets.map((b) => ({
            label: b.label,
            expectedWinRate: b.expectedWinRate,
            observedWinRate: b.observedWinRate,
            sampleSize: b.sampleSize,
            delta: b.delta,
            sufficientSample: b.sufficientSample,
          }))}
          sampleSize={report.sampleSize}
          brierScore={report.brierScore}
          discriminationSpread={report.discrimination.spread}
          discriminationTrend={report.discrimination.trend}
          isCollecting={report.isCollecting}
          publicMessage={report.publicMessage}
        />

        {/* Three primary doors. The graph above is the hero; these are the
            next steps, not a sitemap. Everything else collapses. */}
        <section className="grid gap-6 sm:grid-cols-3">
          <ProofCard
            eyebrow="The record"
            title="Win rate, honestly banded"
            body="Every finished live-engine pick, with the uncertainty band shown, and held back entirely until the sample is honest."
            href="/performance"
            linkLabel="Open the record"
            accent
          />
          <ProofCard
            eyebrow="Beat the close"
            title="Did our price win?"
            body="Whether the price we locked beat where the market closed. The one number tout services never show."
            href="/clv"
            linkLabel="See our CLV"
            accent
          />
          <ProofCard
            eyebrow="Verify"
            title="Check any receipt"
            body="Paste a hash. The server recomputes it live. If anything was edited after the fact, the hashes would not match."
            href="/verify"
            linkLabel="Verify a pick"
            accent
          />
        </section>

        <details className="group rounded-2xl border border-mineral bg-eclipse/30">
          <summary className="flex cursor-pointer list-none items-center justify-between p-5 [&::-webkit-details-marker]:hidden">
            <span>
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ion-2">
                More proof surfaces
              </span>
              <span className="mt-1 block text-sm text-ion-1">
                Engine telemetry, trust ledger, cryptographic proof, research lab, loss autopsies, and your own tracker.
              </span>
            </span>
            <span
              aria-hidden
              className="shrink-0 rounded-full border border-mineral px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ion-2 transition-colors group-open:border-orbital-cyan/60 group-open:text-orbital-cyan"
            >
              <span className="group-open:hidden">Show</span>
              <span className="hidden group-open:inline">Hide</span>
            </span>
          </summary>
          <div className="grid gap-4 border-t border-mineral p-5 sm:grid-cols-2 lg:grid-cols-3">
            <ProofCard
              eyebrow="Live telemetry"
              title="The Sealed Engine"
              body="What the machine swept today, what it declined in writing, and the receipts it froze before kickoff."
              href="/engine"
              linkLabel="Watch it commit"
            />
            <ProofCard
              eyebrow="Tamper-evident receipts"
              title="Trust Ledger"
              body="Every settled pick carries a receipt stamped at generation time. Nothing is quietly removed."
              href="/ledger"
              linkLabel="Open the Ledger"
            />
            <ProofCard
              eyebrow="Cryptographic proof"
              title="Proof of Record"
              body="One published master fingerprint covers the whole record, so anyone can recheck that nothing was edited."
              href="/proof"
              linkLabel="View Proof of Record"
            />
            <ProofCard
              eyebrow="Research evidence"
              title="FABLE Evidence Lab"
              body="Source rights, claim ledgers, uncertainty gates, and what still needs owner approval."
              href="/fable"
              linkLabel="Open FABLE"
            />
            <ProofCard
              eyebrow="Loss autopsies"
              title="The full record"
              body="Losses get post-mortems: original reasoning, signal snapshot, what we saw versus what happened."
              href="/accountability"
              linkLabel="Open Accountability"
            />
            <ProofCard
              eyebrow="Your own record"
              title="CLV Tracker"
              body="Track your own bets against the same closing-line benchmark we hold ourselves to."
              href="/track"
              linkLabel="Track your bets (Elite)"
            />
          </div>
        </details>

        <section className="rounded-2xl border border-mineral bg-eclipse/30 p-6">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-ion-2">
            Read the metrics in plain terms
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-ion-1">
            Not sure what a number means? The metrics guide explains every stat the engines
            report. What it measures, when it matters, and how to read it. Without the jargon.
          </p>
          <Link
            href="/intelligence/metrics"
            className="mt-4 inline-block rounded-lg border border-orbital-cyan/40 px-4 py-2 text-sm font-semibold text-orbital-cyan hover:bg-orbital-cyan/10"
          >
            How we read metrics
          </Link>
        </section>

        <RiskDisclosure variant="compact" includePastPerformance className="text-center" />
      </main>

      <Footer />
    </div>
  );
}
