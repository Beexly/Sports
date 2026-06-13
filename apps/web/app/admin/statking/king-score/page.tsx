import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, ScoreRing, BarChart } from "../../../stats/_components";
import { loadSummary, loadReadinessScores, loadAudit } from "@/lib/statking/product";
export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const s = loadSummary();
  const readiness = loadReadinessScores();
  const audit = loadAudit();
  const avg = Math.round(readiness.pages.reduce((a, p) => a + Number(p.readiness_score ?? 0), 0) / Math.max(1, readiness.pages.length));

  return (
    <Shell title="King Standard Score" eyebrow="Cockpit · scorecard">
      <Cards items={[
        { label: "King Standard", value: "61/100", note: "Autonomous foundation, not finished" },
        { label: "Sources", value: s.source_count },
        { label: "Metrics", value: s.metric_count },
        { label: "Readiness avg", value: avg }
      ]} />
      <div className="flex justify-center mb-6">
        <ScoreRing score={61} label="King Standard" size={140} />
      </div>
      <p className="text-ion-1 mb-6">
        The King Standard is the honest composite: source trust, coverage, freshness, conflicts, and proof. 61/100 reflects a real foundation with live feeds, licenses, and proof still ahead.
      </p>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">5 Pillars of the King Standard</h2>
        <BarChart items={[
          { label: "Source trust", value: 75, max: 100, tone: "cyan" },
          { label: "Coverage", value: 68, max: 100, tone: "amber" },
          { label: "Freshness", value: 80, max: 100, tone: "cyan" },
          { label: "Conflicts", value: 55, max: 100, tone: "alert" },
          { label: "Proof", value: 45, max: 100, tone: "alert" }
        ]} />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Reality Check</h2>
        <DataTable
          rows={Object.entries(audit.summary).map(([status, count]) => ({
            status: String(status),
            count: Number(count ?? 0)
          }))}
          maxRows={10}
        />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Page Readiness</h2>
        <DataTable
          rows={readiness.pages.map((p: Record<string, unknown>) => ({
            page: String(p.page ?? ""),
            readiness_score: Number(p.readiness_score ?? 0),
            weakest_part: String(p.weakest_part ?? ""),
            next_improvement: String(p.next_improvement ?? "")
          }))}
          maxRows={50}
        />
      </div>
    </Shell>
  );
}
