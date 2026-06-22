import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { summarizeClv, type ClvVerdict } from "@sports/prediction-engine";
import { loadClvCoverage, type ClvCoverage } from "@/lib/performance/clv-coverage";

/**
 * Private CLV dashboard (admin-only) — the internal read on whether the model is
 * actually beating the close, the leading indicator of genuine edge. Surfaced
 * here first (not on the public track record) until the sample is real and the
 * lock→close→grade pipeline has run against live games.
 *
 * Auth: mirrors every other admin page — ADMIN role or redirect. The /admin tree
 * is robots-noindex via app/admin/layout.tsx.
 */
export const dynamic = "force-dynamic";

const VERDICTS: ClvVerdict[] = ["BEAT_CLOSE", "MATCHED_CLOSE", "LOST_TO_CLOSE"];

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default async function AdminClvPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  // Real, graded, non-bootstrap picks only (exclude seed rows from metrics).
  const graded = await db.pick.findMany({
    where: {
      clvVerdict: { not: null },
      clvValue: { not: null },
      isBootstrap: false,
      NOT: { modelVersion: { contains: "seed" } },
    },
    select: {
      id: true,
      pickType: true,
      selection: true,
      clvKind: true,
      clvValue: true,
      clvVerdict: true,
      clvClosePrice: true,
      clvCloseLine: true,
      clvGradedAt: true,
      result: true,
    },
    orderBy: { clvGradedAt: "desc" },
    take: 200,
  });

  // ML (probability units) and spread/total (points units) summarise separately.
  const mlItems = graded
    .filter((p) => p.clvKind === "PROBABILITY")
    .map((p) => ({ value: p.clvValue as number, verdict: p.clvVerdict as ClvVerdict }));
  const pointsItems = graded
    .filter((p) => p.clvKind === "POINTS")
    .map((p) => ({ value: p.clvValue as number, verdict: p.clvVerdict as ClvVerdict }));

  const mlSummary = summarizeClv(mlItems);
  const pointsSummary = summarizeClv(pointsItems);

  // Coverage is the integrity backbone of the north-star: the beat-close rate is
  // only trustworthy if (nearly) every settled pick was graded against a close.
  const coverage = await loadClvCoverage(db);

  const verdictCounts = VERDICTS.map((v) => ({
    verdict: v,
    count: graded.filter((p) => p.clvVerdict === v).length,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Closing-Line Value</h1>
        <Link
          href="/admin"
          className="w-fit rounded-lg border border-titanium px-3 py-2 text-xs text-ion-1 hover:bg-carbon/60"
        >
          ← Back to Admin
        </Link>
      </div>

      <p
        data-testid="internal-only-banner"
        className="rounded-lg border border-yellow-900 bg-yellow-950/30 px-4 py-2 text-xs text-yellow-200"
      >
        Internal only. CLV is the leading indicator of edge — beating the close
        predicts profitability before results settle. Not publicly surfaced until
        the sample is real and honestly disclosed.
      </p>

      <CoverageCard coverage={coverage} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ClvCard title="Moneyline (implied-prob CLV)" summary={mlSummary} unit="prob" />
        <ClvCard title="Spread & Total (points CLV)" summary={pointsSummary} unit="pts" />
      </div>

      <section className="rounded-2xl border border-titanium bg-carbon/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Verdict distribution ({graded.length} graded picks)
        </h2>
        <ul className="grid grid-cols-3 gap-2 text-ion-1">
          {verdictCounts.map(({ verdict, count }) => (
            <li key={verdict} className="rounded-lg border border-titanium px-3 py-2">
              <span className="block text-lg font-semibold text-white">{count}</span>
              <span className="text-ion-3">{verdict.replace(/_/g, " ").toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-titanium bg-carbon/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">
          Recently graded
        </h2>
        {graded.length === 0 ? (
          <p data-testid="clv-empty" className="text-ion-2">
            No CLV-graded picks yet. CLV begins accruing once the lock→close→grade
            pipeline runs against settled games (requires the founder-gated
            deploy + migration).
          </p>
        ) : (
          <table className="w-full text-left text-ion-1">
            <thead className="text-ion-3">
              <tr>
                <th className="py-1 pr-2">Selection</th>
                <th className="py-1 pr-2">Type</th>
                <th className="py-1 pr-2">CLV</th>
                <th className="py-1 pr-2">Verdict</th>
                <th className="py-1 pr-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {graded.slice(0, 40).map((p) => {
                const v = p.clvValue as number;
                const display = p.clvKind === "PROBABILITY" ? `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%` : `${v >= 0 ? "+" : ""}${v.toFixed(1)} pts`;
                return (
                  <tr key={p.id} className="border-t border-titanium/60">
                    <td className="py-1 pr-2">{p.selection}</td>
                    <td className="py-1 pr-2 text-ion-3">{p.pickType}</td>
                    <td className={`py-1 pr-2 ${v > 0 ? "text-green-400" : v < 0 ? "text-red-400" : "text-ion-2"}`}>{display}</td>
                    <td className="py-1 pr-2 text-ion-2">{p.clvVerdict?.replace(/_/g, " ").toLowerCase()}</td>
                    <td className="py-1 pr-2 text-ion-3">{p.result}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function CoverageCard({ coverage }: { coverage: ClvCoverage }) {
  // Risk-flipped palette: this is a "how much is MISSING" score, so a low
  // coverage rate is BAD and renders hot (red/amber), healthy renders green.
  const tone =
    coverage.health === "HEALTHY"
      ? { accent: "text-green-400", chip: "border-green-900 bg-green-950/30 text-green-200" }
      : coverage.health === "DEGRADED"
      ? { accent: "text-amber-400", chip: "border-amber-900 bg-amber-950/30 text-amber-200" }
      : coverage.health === "CRITICAL"
      ? { accent: "text-red-400", chip: "border-red-900 bg-red-950/30 text-red-200" }
      : { accent: "text-ion-1", chip: "border-titanium bg-carbon/40 text-ion-2" };

  return (
    <section
      data-testid="clv-coverage"
      className="rounded-2xl border border-titanium bg-carbon/40 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ion-3">
            CLV coverage · north-star integrity
          </h2>
          <p className="mt-1 text-[11px] text-ion-3">
            Share of settled, played picks that actually got a closing-line grade. The
            beat-close rate is only trustworthy at 100% — below that, it&apos;s a partial sample.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tone.chip}`}
        >
          {coverage.health.replace(/_/g, " ").toLowerCase()}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${tone.accent}`}>
          {coverage.coverageRatePct == null ? "—" : `${coverage.coverageRatePct}%`}
        </span>
        <span className="text-xs text-ion-3">graded against the close</span>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-ion-2">
        <span>Settled: {coverage.settledEligible}</span>
        <span>Graded: {coverage.graded}</span>
        <span className={coverage.uncovered > 0 ? "text-red-400" : "text-ion-2"}>
          Uncovered: {coverage.uncovered}
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-snug text-ion-3">{coverage.operatorMessage}</p>

      {coverage.remediation.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-snug text-ion-3">
          {coverage.remediation.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ClvCard({
  title,
  summary,
  unit,
}: {
  title: string;
  summary: ReturnType<typeof summarizeClv>;
  unit: "prob" | "pts";
}) {
  const avg =
    summary.averageClv == null
      ? "—"
      : unit === "prob"
      ? `${summary.averageClv >= 0 ? "+" : ""}${(summary.averageClv * 100).toFixed(2)}%`
      : `${summary.averageClv >= 0 ? "+" : ""}${summary.averageClv.toFixed(2)} pts`;
  const beat = summary.beatCloseRate;
  return (
    <section className="rounded-2xl border border-titanium bg-carbon/40 p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-ion-3">{title}</h2>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${beat >= 0.5 ? "text-green-400" : "text-ion-1"}`}>
          {summary.sampleSize === 0 ? "—" : pct(beat)}
        </span>
        <span className="text-xs text-ion-3">beat the close</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-ion-2">
        <span>Sample: {summary.sampleSize}</span>
        <span>Avg CLV: {avg}</span>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-ion-3">{summary.note}</p>
    </section>
  );
}
