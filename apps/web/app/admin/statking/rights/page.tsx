import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, Badge, StatusRibbon } from "../../../stats/_components";
import { FilterBar } from "../../../stats/_client";
import { loadRightsLedger, loadRightsGateReport } from "@/lib/statking/product";
export default async function Page({ searchParams }: { searchParams?: { status?: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const ledger = loadRightsLedger();
  const report = loadRightsGateReport() as { metadata_only_count?: number; blocked_count?: number; approved_count?: number };
  const status = searchParams?.status ?? "all";

  return (
    <Shell title="Rights Ledger">
      <Cards items={[
        { label: "Sources in ledger", value: ledger.rights_count },
        { label: "Metadata-only", value: report.metadata_only_count ?? 0 },
        { label: "Blocked", value: report.blocked_count ?? 0 },
        { label: "Policy", value: "gated" }
      ]} />
      <p className="text-ion-1 mb-4">
        Rights gates prevent metadata-only, license-required, partner-required, and blocked sources from feeding active metrics.
      </p>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ion-2 mb-3">Filter by rights status</p>
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">All Rights Records</h2>
        <DataTable
          rows={ledger.rights.slice(0, 50).map((r: any) => ({
            source: String(r.source ?? ""),
            rights_status: String(r.rights_status ?? ""),
            scope: String(r.scope ?? ""),
            terms: String(r.terms ?? ""),
            approval_date: String(r.approval_date ?? "")
          }))}
          maxRows={50}
        />
      </div>
    </Shell>
  );
}
