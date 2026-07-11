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
import { GeneratedPlate } from "@/components/immersive/generated-plate";
import { ProofExplorer } from "@/components/proof/proof-explorer";
import { loadPublicCalibrationReport } from "@/lib/calibration/report";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `The Proof Room · ${BRAND_NAME}`,
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
      <p className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-ion-2">
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
    <div className="relative isolate min-h-screen bg-carbon text-ion">
      <GeneratedPlate assetId="proof-crystal" className="-z-10 opacity-20" />
      <Nav />

      <main id="main-content" className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-12 sm:px-6 lg:px-8">
        <header className="gw-nebula-deep -mx-4 rounded-ds-lg border-b border-mineral px-4 pb-10 pt-6 sm:-mx-6 sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-orbital-cyan">
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
        </header>

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

        <section className="grid gap-6 sm:grid-cols-1 lg:grid-cols-3">
          <ProofCard
            eyebrow="Live telemetry"
            title="The Sealed Engine"
            body="Watch the machine commit, live: what it swept today, how much of the slate it declined in writing, and the receipts it froze before kickoff. The commitments are public. The recipe never is."
            href="/engine"
            linkLabel="Watch it commit"
            accent
          />
          <ProofCard
            eyebrow="Calibration report"
            title="Honest Band"
            body="Win rate across every finished live-engine pick, with the uncertainty band shown. And held back entirely until the sample is honest. Warm-up picks from before the live engine never pad the sample."
            href="/performance"
            linkLabel="View Calibration Report"
            accent
          />
          <ProofCard
            eyebrow="Closing line value"
            title="Beat the close"
            body="Whether the price we locked beat where the market closed. The sharp-credible leading indicator of a real edge, and the one number tout services never show."
            href="/clv"
            linkLabel="See our CLV"
          />
          <ProofCard
            eyebrow="Tamper-evident receipts"
            title="Trust Ledger"
            body="Every settled pick carries a receipt stamped at generation time. The ledger is the running record. Nothing is quietly removed to make it look cleaner."
            href="/ledger"
            linkLabel="Open the Ledger"
            accent
          />
          <ProofCard
            eyebrow="Cryptographic proof"
            title="Proof of Record"
            body="Every settled pick gets a digital fingerprint (a hash) the moment it is written. One published master fingerprint covers the whole record, so anyone can recheck that nothing was ever edited."
            href="/proof"
            linkLabel="View Proof of Record"
            accent
          />
          <ProofCard
            eyebrow="Research evidence"
            title="FABLE Evidence Lab"
            body="Source rights, claim ledgers, uncertainty gates, drift checks, and AWS deploy controls. This is the research layer that says what can be shown, what stays gated, and what still needs owner approval."
            href="/fable"
            linkLabel="Open FABLE Evidence Lab"
          />
          <ProofCard
            eyebrow="Loss autopsies"
            title="The full record"
            body="Losses get post-mortems: the original reasoning, the signal snapshot, what we saw versus what happened, and what changed afterward. The public record, no cherry-picking."
            href="/accountability"
            linkLabel="Open Accountability"
          />
          <ProofCard
            eyebrow="Your own record"
            title="CLV Tracker"
            body="Track your own bets against the same closing-line benchmark we hold ourselves to. The proof works the same whether the bet is ours or yours."
            href="/track"
            linkLabel="Track your bets (Elite)"
          />
        </section>

        <section className="rounded-2xl border border-mineral bg-eclipse/30 p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-ion-2">
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
