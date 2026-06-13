import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, ScoreRing, InsightCard, BarChart } from "../../../stats/_components";
import { loadSummary, loadAudit, loadCoverage, loadActiveMetricManifest, loadActivationRoi, loadKingGapMap, loadRightsLedger, loadReadinessScores } from "@/lib/statking/product";
export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const s = loadSummary();
  const a = loadAudit();
  const c = loadCoverage();
  const m = loadActiveMetricManifest();
  const roi = loadActivationRoi();
  const gaps = loadKingGapMap();
  const rights = loadRightsLedger();
  const readiness = loadReadinessScores();
  const avg = Math.round(readiness.pages.reduce((sum, p) => sum + Number(p.readiness_score ?? 0), 0) / Math.max(1, readiness.pages.length));

  return (
    <Shell title="King of Stats Crown">
      <Cards items={[
        { label: "King Standard", value: "61/100", note: "Autonomous foundation, not finished" },
        { label: "Sources", value: s.source_count },
        { label: "Active metrics", value: m.active_calculated_count },
        { label: "Rights records", value: rights.rights_count },
        { label: "Stub systems", value: a.summary.stub_only ?? 0 },
        { label: "Readiness avg", value: avg },
        { label: "ROI targets", value: (roi.top_25_activate_now ?? []).length },
        { label: "King gaps", value: gaps.gaps.length }
      ]} />
      <div className="flex justify-center">
        <ScoreRing score={61} label="King Standard Score" size={140} />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Reality Check</h2>
        <BarChart
          items={Object.entries(a.summary).map(([status, count]) => ({
            label: String(status),
            value: Number(count ?? 0),
            max: Math.max(...Object.values(a.summary).map((v) => Number(v ?? 0)), 1),
          }))}
        />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Highest-Impact Missing Data</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {c.missing_high_impact.slice(0, 5).map((lane, idx) => (
            <InsightCard
              key={idx}
              eyebrow="Missing Data"
              headline={String(lane)}
              body={`Status: ${String(c.coverage_by_data_type[lane] ?? "missing")}. Next: Activate lawful source or first-party charting.`}
              tone="bad"
            />
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Activation ROI: Next 25</h2>
        <DataTable
          rows={(roi.top_25_activate_now ?? []).map((r: Record<string, unknown>) => ({
            source: String(r.source ?? ""),
            roi_score: Number(r.roi_score ?? 0),
            effort: String(r.effort ?? ""),
            impact: Number(r.impact ?? 0),
            priority: Number(r.priority ?? 0)
          }))}
          maxRows={25}
        />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">King Gap Map</h2>
        <DataTable
          rows={gaps.gaps.map((g: Record<string, unknown>) => ({
            gap: String(g.gap ?? ""),
            impact: Number(g.impact ?? 0),
            effort: String(g.effort ?? ""),
            owner: String(g.owner ?? ""),
            status: String(g.status ?? "")
          }))}
          maxRows={50}
        />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Merge Readiness</h2>
        <p className="text-ion-1 mb-4">
          Merge as autonomous foundation; do not market as complete King of Stats until live feeds, licenses, and proof archive are active.
        </p>
        <DataTable
          rows={readiness.pages.map((p: Record<string, unknown>) => ({
            page: String(p.page ?? ""),
            readiness_score: Number(p.readiness_score ?? 0),
            status: String(p.status ?? ""),
            blockers: String(p.blockers ?? "")
          }))}
          maxRows={50}
        />
      </div>
    </Shell>
  );
}
