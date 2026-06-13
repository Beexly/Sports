import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, ScoreRing, BarChart, Badge } from "../../../stats/_components";
import { loadReadinessScores } from "@/lib/statking/product";
export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const r = loadReadinessScores();
  const avg = Math.round(r.pages.reduce((a, p) => a + Number(p.readiness_score ?? 0), 0) / Math.max(1, r.pages.length));
  const below50 = r.pages.filter(p => Number(p.readiness_score ?? 0) < 50);

  return (
    <Shell title="Product Readiness">
      <Cards items={[
        { label: "Pages scored", value: r.pages.length },
        { label: "Average readiness", value: avg },
        { label: "Claude next", value: "UX polish" },
        { label: "Codex next", value: "live ingestion" }
      ]} />
      <div className="flex justify-center mb-6">
        <ScoreRing score={avg} label="Average Readiness" size={140} />
      </div>
      <div className="border border-mineral bg-eclipse p-4 mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Readiness by Page</p>
        <BarChart items={r.pages.slice(0, 8).map((p: any) => ({
          label: String(p.page ?? "").slice(0, 15),
          value: Number(p.readiness_score ?? 0),
          max: 100,
          tone: Number(p.readiness_score ?? 0) >= 70 ? "cyan" : Number(p.readiness_score ?? 0) >= 50 ? "amber" : "alert"
        }))} />
      </div>
      {below50.length > 0 && (
        <div className="space-y-3 mb-6">
          <Badge tone="warn">{below50.length} pages below 50% readiness — blockers flagged below</Badge>
        </div>
      )}
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">All Pages</h2>
        <DataTable
          rows={r.pages.map((p: any) => ({
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
