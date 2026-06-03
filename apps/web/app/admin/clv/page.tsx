import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@sports/db";
import { summarizeClv, type ClvVerdict } from "@sports/prediction-engine";

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
          className="w-fit rounded-lg border border-gray-800 px-3 py-2 text-xs text-gray-300 hover:bg-gray-900/60"
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ClvCard title="Moneyline (implied-prob CLV)" summary={mlSummary} unit="prob" />
        <ClvCard title="Spread & Total (points CLV)" summary={pointsSummary} unit="pts" />
      </div>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Verdict distribution ({graded.length} graded picks)
        </h2>
        <ul className="grid grid-cols-3 gap-2 text-gray-300">
          {verdictCounts.map(({ verdict, count }) => (
            <li key={verdict} className="rounded-lg border border-gray-800 px-3 py-2">
              <span className="block text-lg font-semibold text-white">{count}</span>
              <span className="text-gray-500">{verdict.replace(/_/g, " ").toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 text-xs">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Recently graded
        </h2>
        {graded.length === 0 ? (
          <p data-testid="clv-empty" className="text-gray-400">
            No CLV-graded picks yet. CLV begins accruing once the lock→close→grade
            pipeline runs against settled games (requires the founder-gated
            deploy + migration).
          </p>
        ) : (
          <table className="w-full text-left text-gray-300">
            <thead className="text-gray-500">
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
                  <tr key={p.id} className="border-t border-gray-800/60">
                    <td className="py-1 pr-2">{p.selection}</td>
                    <td className="py-1 pr-2 text-gray-500">{p.pickType}</td>
                    <td className={`py-1 pr-2 ${v > 0 ? "text-green-400" : v < 0 ? "text-red-400" : "text-gray-400"}`}>{display}</td>
                    <td className="py-1 pr-2 text-gray-400">{p.clvVerdict?.replace(/_/g, " ").toLowerCase()}</td>
                    <td className="py-1 pr-2 text-gray-500">{p.result}</td>
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
    <section className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">{title}</h2>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${beat >= 0.5 ? "text-green-400" : "text-gray-300"}`}>
          {summary.sampleSize === 0 ? "—" : pct(beat)}
        </span>
        <span className="text-xs text-gray-500">beat the close</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-400">
        <span>Sample: {summary.sampleSize}</span>
        <span>Avg CLV: {avg}</span>
      </div>
      <p className="mt-2 text-[11px] leading-snug text-gray-500">{summary.note}</p>
    </section>
  );
}
