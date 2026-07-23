import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadBacktests } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const b = loadBacktests();
  return (
    <Shell title="Backtests">
      <StatusRibbon status="fixture" label="Admin view — fixture snapshot" />
      <Cards items={[{label:"Runs",value:b.runs.length},{label:"State",value:"fixture"},{label:"Proof",value:"partial"},{label:"Need",value:"history"}]}/>
      <SectionHeader title="Backtest Runs" />
      {b.runs.length === 0 ? (
        <p className="text-sm text-ion-1 py-4 border border-mineral bg-eclipse/40 px-4">No runs recorded yet.</p>
      ) : (
        <DataTable
          rows={b.runs.map(r => ({
            run_id: String(r.run_id ?? ""),
            type: String(r.type ?? ""),
            status: String(r.status ?? ""),
            mae: typeof r.mae === "number" ? r.mae : "—",
            calibration: String(r.calibration ?? "—"),
            proven: String(r.what_is_proven ?? ""),
          }))}
          maxRows={50}
          caption="Backtest runs"
        />
      )}
    </Shell>
  );
}
