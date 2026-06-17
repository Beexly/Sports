import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, ScoreRing, BarChart, InsightCard, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadReadinessScores } from "@/lib/statking/product";

export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const r = loadReadinessScores();
  const avg = Math.round(r.pages.reduce((a, p) => a + Number(p.readiness_score ?? 0), 0) / Math.max(1, r.pages.length));
  const below50 = r.pages.filter(p => Number(p.readiness_score ?? 0) < 50);

  return (
    <Shell title="Product Readiness">
      <StatusRibbon status="fixture" label="Readiness view — fixture-backed scores, not live" />
      <Cards items={[
        { label: "Pages scored", value: r.pages.length },
        { label: "Average readiness", value: avg },
        { label: "Highest priority", value: below50[0] ? String((below50[0] as Record<string, unknown>).page ?? "—") : "All ≥50", note: "lowest readiness page" },
        { label: "Path to 90+", value: "Live feeds", note: "then proof archive" }
      ]} />
      <div className="flex justify-center mb-6">
        <ScoreRing score={avg} label="Average Readiness" size={140} />
      </div>
      <div className="border border-mineral bg-eclipse p-4 mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Readiness by Page</p>
        <BarChart items={r.pages.slice(0, 8).map((p: Record<string, unknown>) => ({
          label: String(p.page ?? "").slice(0, 15),
          value: Number(p.readiness_score ?? 0),
          max: 100,
          tone: Number(p.readiness_score ?? 0) >= 70 ? "cyan" : Number(p.readiness_score ?? 0) >= 50 ? "amber" : "alert"
        }))} />
      </div>
      {below50.length > 0 && (
        <div className="mb-6">
          <InsightCard
            tone="warn"
            eyebrow={below50.length + " pages need work"}
            headline="Priority UX improvements"
            body={"Lowest readiness: " + below50.slice(0, 3).map(p => String((p as Record<string, unknown>).page ?? "")).join(", ") + ". Focus UX polish on these first."}
          />
        </div>
      )}
      <SectionHeader eyebrow="Sorted by readiness" title="All Page Scores" />
      <DataTable
        rows={[...r.pages].sort((a, b) => Number(a.readiness_score ?? 0) - Number(b.readiness_score ?? 0)).map((p: Record<string, unknown>) => ({
          page: String(p.page ?? ""),
          readiness_score: Number(p.readiness_score ?? 0),
          weakest_part: String(p.weakest_part ?? ""),
          next_improvement: String(p.next_improvement ?? "")
        }))}
        maxRows={50}
      />
    </Shell>
  );
}
