import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { CalibrationConstellation } from "@/components/proof/CalibrationConstellation";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `The Evidence — ${BRAND_NAME}`,
  description:
    "Long-form marketing companion to the canonical ledger. The manifesto excerpt, the calibration constellation, the no-bet doctrine, and what we publish vs. cannot publish yet.",
};

export default function TheEvidencePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-4xl flex-col gap-16 px-4 py-12 sm:px-6 lg:px-8">

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <header className="border-b border-mineral pb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            The evidence
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl">
            What we publish, why it matters, and what we refuse to claim.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
            A long-form companion to the canonical ledger. Read this before you read any pick.
          </p>
        </header>

        {/* ── Manifesto excerpt ──────────────────────────────────────────── */}
        <section aria-label="Manifesto excerpt">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400">
            From the manifesto
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
            Outcome is noise. Process is everything.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
            Sports betting tells you the score is the signal. It is not. The score is a single sample from a probability distribution. The process that produced your decision — the evidence you read, the line you took, the discipline that stopped you from chasing — that is the only thing you can control. We were built to make process visible.
          </p>
          <Link
            href="/manifesto"
            className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-ion-blue hover:text-cyan-200"
          >
            Read the full 11-beat manifesto →
          </Link>
        </section>

        {/* ── Calibration constellation ──────────────────────────────────── */}
        <section aria-label="Calibration shape">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400">
            The model&apos;s shape
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
            Every settled pick becomes a point.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
            When canonical history accumulates, each settled canonical pick lands on this chart. The cyan diagonal is perfect calibration. Where the constellation forms is the model&apos;s honest shape.
          </p>
          <div className="mt-8">
            <CalibrationConstellation points={[]} sampleSize={0} />
          </div>
        </section>

        {/* ── No-bet doctrine ────────────────────────────────────────────── */}
        <section aria-label="No-bet doctrine">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400">
            The no-bet doctrine
          </p>
          <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
            A disciplined pass is a win.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
            We are louder about what we skipped than about what we published. The no-bet list is the most important page on this site. It teaches the discipline of refusal — the muscle that separates bettors who survive ten years from bettors who survive ten weeks.
          </p>
          <Link
            href="/no-bet"
            className="mt-5 inline-block font-mono text-[10px] uppercase tracking-widest text-amber-400 hover:text-amber-300"
          >
            Read today&apos;s pass list →
          </Link>
        </section>

        {/* ── What we publish vs do not ──────────────────────────────────── */}
        <section aria-label="Publication boundaries" className="rounded-2xl border border-mineral bg-gray-900/30 p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-400">
            Honest disclosure
          </p>
          <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">
            What we publish vs. what we cannot publish yet.
          </h2>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <article className="border border-emerald-800/40 bg-emerald-950/15 p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">
                We publish
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                <li>· Every published pick with its evidence chain.</li>
                <li>· Every pass the model gated, with reason.</li>
                <li>· Every settled outcome.</li>
                <li>· Per-bucket calibration once a bucket meets the publish gate.</li>
                <li>· The factor inventory and model changelog.</li>
              </ul>
            </article>
            <article className="border border-amber-800/40 bg-amber-950/15 p-5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400">
                We do not publish yet
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                <li>· Aggregate ROI (requires units-risked accounting).</li>
                <li>· Per-sport calibration breakouts.</li>
                <li>· Long-horizon Brier (needs 200+ settled picks).</li>
                <li>· Exact factor weights or scoring constants.</li>
                <li>· Anything that depends on canonical history not yet accumulated.</li>
              </ul>
            </article>
          </div>
        </section>

        {/* ── Closing ────────────────────────────────────────────────────── */}
        <section className="border-t border-mineral pt-12 text-center">
          <h2 className="text-2xl font-black text-white">Now read the record.</h2>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/ledger/canonical"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ion-blue px-6 text-sm font-bold text-carbon hover:opacity-90"
            >
              Open the canonical ledger
            </Link>
            <Link
              href="/we-were-wrong"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-gray-700 px-6 text-sm font-bold text-gray-200 hover:border-cyan-400 hover:text-cyan-100"
            >
              See what we got wrong
            </Link>
          </div>
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
