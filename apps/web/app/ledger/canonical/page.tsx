import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/ui/nav";
import { Footer } from "@/components/ui/footer";
import { RiskDisclosure } from "@/components/ui/risk-disclosure";
import { TrustStrip } from "@/components/trust";
import { isFeatureEnabled } from "@/lib/release/feature-flags";
import { loadAccumulationReport } from "@/lib/calibration/accumulation";
import { db } from "@sports/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Canonical Ledger — Galaxy Sports Edge",
  description:
    "Append-only public record of every settled canonical pick. Honest empty state today, populated as canonical history accumulates.",
};

interface LedgerRow {
  readonly id: string;
  readonly settledAt: string;
  readonly matchup: string;
  readonly sport: string;
  readonly selection: string;
  readonly line: number;
  readonly confidence: number;
  readonly result: "WIN" | "LOSS" | "PUSH";
  readonly modelVersion: string;
}

async function loadCanonicalLedger(): Promise<readonly LedgerRow[]> {
  const enabled = isFeatureEnabled("CANONICAL_LEDGER_ENABLED");
  if (!enabled) return [];

  const picks = await db.pick
    .findMany({
      where: {
        isPublished: true,
        isBootstrap: false,
        result: { in: ["WIN", "LOSS", "PUSH"] },
        NOT: { modelVersion: "v5.0.0-seed" },
      },
      include: { game: { include: { sport: { select: { name: true } } } } },
      orderBy: { settledAt: "desc" },
      take: 100,
    })
    .catch(() => []);

  return picks.map((p): LedgerRow => ({
    id: p.id,
    settledAt: (p.settledAt ?? p.generatedAt).toISOString(),
    matchup: `${p.game.awayTeamName} @ ${p.game.homeTeamName}`,
    sport: p.game.sport.name,
    selection: p.selection,
    line: p.line,
    confidence: p.confidence,
    result: p.result as "WIN" | "LOSS" | "PUSH",
    modelVersion: p.modelVersion,
  }));
}

export default async function CanonicalLedgerPage(): Promise<JSX.Element> {
  const [rows, accumulation] = await Promise.all([
    loadCanonicalLedger(),
    loadAccumulationReport(),
  ]);
  const isEmpty = rows.length === 0;

  return (
    <div className="min-h-screen bg-carbon text-gray-100">
      <Nav />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">

        <TrustStrip
          surfaceId="ledger-canonical"
          source="galaxy-model"
          freshness={isEmpty ? "unknown" : "fresh"}
          surfaceKind="decision-quality"
          tier="all"
          uncertainty={isEmpty ? "sample" : "live"}
          showMethodology
          showResponsiblePlay
        />

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <header className="border-b border-mineral pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
            Public record
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Every settled canonical pick.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-gray-400">
            Append-only. No edits. Bootstrap and seed rows are excluded by construction.
            We publish what we have when we have it — and we say so when we don&apos;t.
          </p>
        </header>

        {/* ── Accumulation status ────────────────────────────────────────── */}
        <section
          aria-label="Accumulation status"
          className="rounded-2xl border border-amber-800/40 bg-amber-950/15 p-6"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-400">
            Accumulation status
          </p>
          <p className="mt-3 text-sm text-gray-300">
            {accumulation.totalSettled === 0
              ? "Zero canonical picks have settled yet. The ledger below will populate as published picks clear the gate and games settle."
              : `${accumulation.totalSettled} canonical picks have settled across all confidence buckets. ${accumulation.bucketsMeetingGate} of ${accumulation.buckets.length} buckets meet the publish gate.`}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-5">
            {accumulation.buckets.map((b) => (
              <div
                key={b.label}
                className={[
                  "border p-3",
                  b.meetsPublishGate
                    ? "border-emerald-800/40 bg-emerald-950/20"
                    : "border-mineral bg-carbon/60",
                ].join(" ")}
              >
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-gray-500">
                  {b.label} confidence
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {b.settled} of {b.publishGate}
                </p>
                <p className="mt-1 text-[10px] text-gray-500">
                  {b.meetsPublishGate ? "Publishing" : "Accumulating"}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/methodology"
            className="mt-5 inline-flex font-mono text-[10px] uppercase tracking-widest text-ion-blue hover:text-cyan-200"
          >
            What we publish vs. what we cannot publish yet →
          </Link>
        </section>

        {/* ── Ledger table ────────────────────────────────────────────────── */}
        <section aria-label="Settled picks ledger">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ion-blue">
                Settled rows
              </p>
              <h2 className="mt-2 text-2xl font-bold text-white">
                {isEmpty ? "No canonical picks settled yet." : `Last ${rows.length} settled`}
              </h2>
            </div>
          </div>

          {isEmpty ? (
            <div className="rounded-xl border border-mineral bg-gray-900/40 p-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
                Empty by construction
              </p>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-gray-400">
                This page is intentionally blank until canonical history accumulates.
                We do not synthesize settled rows. We do not show bootstrap as production.
                Come back when the model has earned the data.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-mineral">
              <table className="w-full text-sm">
                <thead className="border-b border-mineral bg-gray-900/60 text-left">
                  <tr>
                    <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-gray-500">Settled</th>
                    <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-gray-500">Matchup</th>
                    <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-gray-500">Selection</th>
                    <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-gray-500">Confidence</th>
                    <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-widest text-gray-500">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-mineral/60 last:border-b-0">
                      <td className="px-4 py-3 font-mono text-[10px] text-gray-500">
                        {row.settledAt.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-gray-200">
                        <p className="font-semibold">{row.matchup}</p>
                        <p className="text-[10px] text-gray-500">{row.sport}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-300">{row.selection}</td>
                      <td className="px-4 py-3 font-mono text-gray-300">{row.confidence}</td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest",
                            row.result === "WIN"
                              ? "bg-emerald-900/40 text-emerald-300"
                              : row.result === "LOSS"
                                ? "bg-red-900/40 text-red-300"
                                : "bg-gray-800/60 text-gray-400",
                          ].join(" ")}
                        >
                          {row.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <RiskDisclosure variant="compact" className="text-center" />
      </main>
      <Footer />
    </div>
  );
}
