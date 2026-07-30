import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, ScoreRing, InsightCard, BarChart, SectionHeader, StatusRibbon } from "../../../stats/_components";
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
      <StatusRibbon status="fixture" label="Crown view — snapshot data, not live" />
      <Cards items={[
        { label: "King Standard", value: "61/100", note: "Autonomous foundation, not finished" },
        { label: "Sources", value: s.source_count },
        { label: "Active metrics", value: m.active_calculated_count },
        { label: "Rights records", value: rights.rights_count },
        { label: "Stub systems", value: a.summary.stub_only ?? 0 },
        { label: "Readiness avg", value: avg },
        { label: "Priority targets", value: (roi.top_25_activate_now ?? []).length },
        { label: "King gaps", value: gaps.gaps.length }
      ]} />
      <div className="flex justify-center">
        <ScoreRing score={61} label="King Standard Score" size={140} />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Reality Check</h2>
        <InsightCard
          eyebrow="Audit Status Legend"
          headline="What these categories mean"
          body="real = live licensed source active. stub = placeholder fixture only. partial = some real, some missing. blocked = rights clearance needed."
          tone="neutral"
        />
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
        <SectionHeader eyebrow="Priority-ranked source pipeline" title="Activate These Next" />
        <DataTable
          rows={(roi.top_25_activate_now ?? []).map((r: Record<string, unknown>) => ({
            source: String(r.source_name ?? ""),
            roi_score: Number(r.activation_roi_score ?? 0),
            effort: String(r.effort_estimate ?? ""),
            coverage_gain: Number(r.coverage_gain ?? 0),
            action: String(r.recommended_action ?? "")
          }))}
          maxRows={25}
          caption="ROI-ranked source activation pipeline"
        />
      </div>
      <div>
        <SectionHeader eyebrow="What separates 61 from 90+" title="King Gap Map" />
        <DataTable
          rows={gaps.gaps.map((g: Record<string, unknown>) => ({
            moat: String(g.moat ?? ""),
            score: Number(g.current_score ?? 0),
            effort: String(g.estimated_effort ?? ""),
            fix: String(g.highest_leverage_autonomous_fix ?? ""),
            next_action: String(g.next_action ?? "")
          }))}
          maxRows={50}
          caption="King gap map — what separates the current score from 90+"
        />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Merge Readiness</h2>
        <InsightCard
          eyebrow="Merge Readiness"
          headline="Ship as foundation — do not market as finished"
          body="These readiness scores are honest self-assessments from the agent-assisted build. Scores below 50 need UX work or live data before they're user-ready. Scores 50–70 are usable foundation. 70+ are shippable. No agent is autonomous for external actions."
          tone="warn"
        />
        <DataTable
          rows={readiness.pages.map((p: Record<string, unknown>) => ({
            page: String(p.page ?? ""),
            readiness_score: Number(p.readiness_score ?? 0),
            weakest_part: String(p.weakest_part ?? ""),
            next_improvement: String(p.next_improvement ?? "")
          }))}
          maxRows={50}
          caption="Merge readiness by page"
        />
      </div>
    </Shell>
  );
}
