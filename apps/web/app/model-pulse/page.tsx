import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { TrustStrip } from "@/components/trust";
import { loadModelPulse } from "@/lib/model-pulse/pulse";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Model Pulse — Galaxy Sports Edge",
  description:
    "Public real-time visualization of the model's metabolism. Slate counts, confidence distribution, evidence health. Not picks — state.",
};

const ACCENT_MAP: Record<string, string> = {
  "ion-blue": "bg-ion-blue text-carbon",
  cyan: "bg-cyan-400 text-carbon",
  amber: "bg-amber-500 text-carbon",
  emerald: "bg-emerald-500 text-carbon",
  gray: "bg-gray-600 text-gray-100",
};

export default async function ModelPulsePage(): Promise<JSX.Element> {
  const pulse = await loadModelPulse();

  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">

        <TrustStrip
          surfaceId="model-pulse"
          source="galaxy-model"
          freshness={pulse.enabled && pulse.publishedPickCount > 0 ? "live" : "unknown"}
          surfaceKind="decision-quality"
          tier="all"
          uncertainty={pulse.enabled && pulse.publishedPickCount > 0 ? "live" : "sample"}
          showMethodology
          showResponsiblePlay
        />

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <header className="border-b border-mineral pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            The model&apos;s metabolism
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Model Pulse
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
            Not picks. State. How many games are on today&apos;s slate. How many cleared the gate.
            How the published picks distribute across confidence bands. The model breathes; we show the breath.
          </p>
          <p className="mt-3 text-xs text-gray-500">
            Snapshot: <span className="font-mono text-gray-400">{pulse.takenAt.slice(0, 19).replace("T", " ")}Z</span>
            {pulse.modelVersion && (
              <>
                {" · "}Model version:{" "}
                <span className="font-mono text-gray-400">{pulse.modelVersion}</span>
              </>
            )}
          </p>
        </header>

        {!pulse.enabled ? (
          <section className="rounded-2xl border border-amber-800/40 bg-amber-950/15 p-8 text-center">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-400">
              Pulse offline
            </p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-gray-400">
              Live model pulse is paused. This page surfaces honest state when the live slate is connected
              and the release state enables the pulse capability.
            </p>
          </section>
        ) : (
          <>
            {/* ── Slate counters ─────────────────────────────────────────── */}
            <section aria-label="Slate state" className="grid gap-3 sm:grid-cols-4">
              <Counter label="Games on slate" value={pulse.slateGameCount} />
              <Counter label="Picks published" value={pulse.publishedPickCount} accent="emerald" />
              <Counter label="Games gated" value={pulse.gatedGameCount} accent="amber" />
              <Counter label="Scoring now" value={pulse.scoringGameCount} accent="cyan" />
            </section>

            {/* ── Averages ───────────────────────────────────────────────── */}
            <section aria-label="Aggregate signals" className="grid gap-3 sm:grid-cols-2">
              <article className="border border-mineral bg-gray-900/60 p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  Avg edge index (today)
                </p>
                <p className="mt-3 text-4xl font-black text-white">
                  {pulse.avgEdgeIndex === null ? "—" : pulse.avgEdgeIndex}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Across all published picks on today&apos;s slate.
                </p>
              </article>
              <article className="border border-mineral bg-gray-900/60 p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">
                  Avg evidence health (today)
                </p>
                <p className="mt-3 text-4xl font-black text-white">
                  {pulse.avgEvidenceHealth === null ? "—" : `${pulse.avgEvidenceHealth}/100`}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Mean data-quality score across published picks.
                </p>
              </article>
            </section>

            {/* ── Confidence distribution ─────────────────────────────────── */}
            <section aria-label="Confidence distribution">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Confidence distribution
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                Where today&apos;s picks fall on the confidence scale.
              </h2>
              <div className="mt-6 space-y-3">
                {pulse.confidenceDistribution.map((slice) => {
                  const max = Math.max(1, ...pulse.confidenceDistribution.map((s) => s.count));
                  const pct = Math.round((slice.count / max) * 100);
                  return (
                    <div key={slice.label} className="grid gap-2 sm:grid-cols-[80px_1fr_50px] sm:items-center">
                      <span className="font-mono text-xs uppercase tracking-widest text-gray-500">
                        {slice.label}
                      </span>
                      <div className="h-3 rounded bg-gray-800">
                        <div
                          className={["h-full rounded", ACCENT_MAP[slice.accent] ?? "bg-gray-600"].join(" ")}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-right font-mono text-sm font-semibold text-white tabular-nums">
                        {slice.count}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-gray-500">
                Empty buckets mean no published picks fell in that band today. That is also a signal — the model is conservative when evidence health is low.
              </p>
            </section>
          </>
        )}

        {/* ── Closing ────────────────────────────────────────────────────── */}
        <section className="border-t border-mineral pt-10 text-center">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
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

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}

function Counter({
  label,
  value,
  accent = "ion-blue",
}: {
  label: string;
  value: number;
  accent?: "ion-blue" | "cyan" | "amber" | "emerald";
}): JSX.Element {
  const accentClass = {
    "ion-blue": "text-ion-blue",
    cyan: "text-cyan-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
  }[accent];
  return (
    <div className="border border-mineral bg-gray-900/60 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-gray-500">{label}</p>
      <p className={["mt-2 text-3xl font-black tabular-nums", accentClass].join(" ")}>{value}</p>
    </div>
  );
}
