import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, BarChart } from "../../../stats/_components";
import { loadSourceTargets } from "@/lib/statking/product";
export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const t = loadSourceTargets();

  return (
    <Shell title="Source CRM">
      <Cards items={[
        { label: "Outreach targets", value: t.top_50_easiest_wins.length },
        { label: "License targets", value: t.top_50_requires_license.length },
        { label: "Partner path", value: "ready" },
        { label: "Next", value: "owner" }
      ]} />
      <div className="border border-mineral bg-eclipse p-4 mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Activation Effort vs. Impact</p>
        <BarChart items={[
          { label: "Easiest wins", value: t.top_50_easiest_wins.length, max: 50, tone: "cyan" },
          { label: "License targets", value: t.top_50_requires_license.length, max: 50, tone: "amber" },
          { label: "Highest moat", value: t.top_50_highest_moat_sources.length, max: 50, tone: "alert" }
        ]} />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Easiest Wins — Start Here</h2>
        <DataTable
          rows={t.top_50_easiest_wins.slice(0, 25).map((s: Record<string, unknown>) => ({
            source: String(s.source ?? ""),
            category: String(s.category ?? ""),
            effort: String(s.effort ?? ""),
            impact: Number(s.impact ?? 0),
            priority: Number(s.priority ?? 0),
            next_action: String(s.next_action ?? "")
          }))}
          maxRows={25}
        />
      </div>
    </Shell>
  );
}
