import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import {
  formatUnits,
  formatVerifiedAt,
  formatWlp,
  verifiedLedger,
} from "@/lib/ledger/verified-ledger-view";

export const metadata: Metadata = {
  title: "Calibration Proof Room | Galaxy Sports Edge",
  description:
    "Calibration progress recomputed from the settlement database. Confidence-band counts, closing-line value and the 200-bet law: no win-rate percentage until the sample earns it.",
  alternates: { canonical: "/calibration" },
};

export default function CalibrationProofRoomPage(): JSX.Element {
  const ledger = verifiedLedger;
  const gate = ledger.official.gate;
  const buckets = ledger.official.confidenceBuckets;
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));
  const progressPct = Math.min(100, Math.round((gate.clvBackedSettled / gate.target) * 100));
  const clv = ledger.pipeline.clv;

  return (
    <div className="min-h-screen bg-obsidian text-ion-white">
      <Nav />
      <main id="main-content" className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        {/* Header */}
        <p className="eyebrow">Public settlement ledger · honest grading</p>
        <h1 className="mt-4 font-display text-5xl uppercase tracking-tight sm:text-6xl">
          Calibration Proof Room
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ion-1">
          A tout service that claims 85/100 confidence and hits half the time destroys bankrolls.
          So we do not publish a win rate until the sample has earned it. This room shows exactly
          where the calibration sample stands, recomputed from the settlement database, and what
          will be published once it clears the bar.
        </p>
        <p className="mt-3 font-mono text-[11px] text-ion-2">
          Verified {formatVerifiedAt(ledger.generatedAt)} · same artifact as /record · read-only
        </p>

        {/* The law + progress */}
        <section className="mt-10 surface-card p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl uppercase tracking-tight">
              The {gate.target}-bet law
            </h2>
            <span className="font-mono text-sm text-ion-1">
              {gate.clvBackedSettled}/{gate.target} CLV-backed settled official plays
            </span>
          </div>
          <div
            className="mt-4 h-3 w-full overflow-hidden rounded-full border border-mineral bg-eclipse"
            role="progressbar"
            aria-valuenow={gate.clvBackedSettled}
            aria-valuemin={0}
            aria-valuemax={gate.target}
            aria-label="Calibration progress"
          >
            <div className="h-full bg-emerald-400" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ion-2">{ledger.scope.calibrationLaw}</p>
          {gate.unlocked && gate.winRate !== null ? (
            <p className="mt-3 font-mono text-sm text-emerald-300">
              Threshold met. Observed win rate (wins / decided): {(gate.winRate * 100).toFixed(1)}%
            </p>
          ) : (
            <p className="mt-3 font-mono text-xs text-ion-2">
              Status: LOCKED. Counts and units below are publishable now; observed rates are not.
            </p>
          )}
        </section>

        {/* Official sample */}
        <section className="mt-10 grid gap-6 sm:grid-cols-3">
          <div className="surface-card p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">
              Official settled sample
            </div>
            <div className="mt-2 font-display text-4xl text-emerald-300">
              {formatWlp(ledger.official.wlp)}
            </div>
            <div className="mt-2 text-xs text-ion-2">
              {formatUnits(ledger.official.units.total)} · flat 1u · {ledger.official.units.coveredPicks} priced
            </div>
          </div>
          <div className="surface-card p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">
              CLV-graded pipeline picks
            </div>
            <div className="mt-2 font-display text-4xl text-ion-white">{clv.graded}</div>
            <div className="mt-2 text-xs text-ion-2">
              Beat close {clv.beatClose} · lost {clv.missedClose} · matched {clv.flat}
            </div>
          </div>
          <div className="surface-card p-6">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ion-2">
              Mean points CLV
            </div>
            <div className="mt-2 font-display text-4xl text-ion-white">
              {clv.meanPoints ?? "n/a"}
            </div>
            <div className="mt-2 text-xs text-ion-2">{ledger.scope.clvSign}</div>
          </div>
        </section>

        {/* Confidence distribution */}
        <section className="mt-12 surface-card p-6 sm:p-8">
          <h2 className="font-display text-2xl uppercase tracking-tight">
            Where the official sample sits · confidence bands
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ion-2">
            Settled official plays by published confidence band. Counts only: the observed rate in
            each band is a win-rate percentage, and those stay locked behind the {gate.target}-bet
            law. When the gate opens, this table grows a realized-rate column and a reliability
            curve, computed from the same artifact.
          </p>
          <div className="mt-6 space-y-3">
            {buckets.map((b) => (
              <div key={b.label} className="flex items-center gap-4">
                <div className="w-24 shrink-0 font-mono text-xs text-ion-1">{b.label} / 100</div>
                <div className="h-5 flex-1 overflow-hidden rounded border border-mineral bg-eclipse">
                  <div
                    className="h-full bg-emerald-400/70"
                    style={{ width: `${Math.round((b.count / maxCount) * 100)}%` }}
                  />
                </div>
                <div className="w-16 shrink-0 text-right font-mono text-xs text-ion-white">
                  n={b.count}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-mineral bg-eclipse/60 p-4 text-xs leading-relaxed text-ion-2">
            <strong className="text-ion-1">Why we render 74/100, never a percentage:</strong> bettors
            conflate a win probability with certainty and over-bet. Our bounded index displays
            honest conviction without the misleading decimal. The same discipline applies to the
            record itself: no win-rate percentage until 200 CLV-backed settled bets exist.
          </div>
        </section>

        {/* What unlocks */}
        <section className="mt-12 surface-card p-6 sm:p-8">
          <h2 className="font-display text-2xl uppercase tracking-tight">What publishes at {gate.target}</h2>
          <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-sm leading-relaxed text-ion-1">
            <li>Observed win rate per confidence band, with sample sizes, from settled official plays.</li>
            <li>A reliability curve (predicted band vs realized rate) and a Brier score benchmark.</li>
            <li>Closing-line value summaries split by market, all recomputed from entry vs close.</li>
          </ul>
          <p className="mt-4 max-w-3xl text-xs leading-relaxed text-ion-2">
            Every one of those numbers will be produced by the same verification script that
            produces this page. Nothing will be typed in by hand, and nothing will be back-filled
            from a softer sample.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/record" className="btn btn-primary">
              The sealed record
            </Link>
            <Link href="/board" className="btn btn-ghost">
              Today&apos;s board
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}