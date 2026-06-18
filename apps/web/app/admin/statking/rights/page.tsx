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
  const allRights = ledger.rights as Array<Record<string, unknown>>;
  const filtered = status === "all"
    ? allRights
    : allRights.filter((r) => String(r.rights_status ?? "").toLowerCase().includes(status));

  return (
    <Shell title="Rights Ledger" eyebrow="Cockpit · rights">
      <StatusRibbon status="fixture" label="Rights gates active — ledger is authoritative" />
      <Cards items={[
        { label: "Sources in ledger", value: ledger.rights_count },
        { label: "Metadata-only", value: report.metadata_only_count ?? 0 },
        { label: "Blocked", value: report.blocked_count ?? 0 },
        { label: "Policy", value: "gated" }
      ]} />
      <p className="text-ink-300 mb-4">
        Rights gates prevent metadata-only, license-required, partner-required, and blocked sources from feeding active metrics.
      </p>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink-400 mb-3">Filter by rights status</p>
        <FilterBar
          options={[
            { label: "All", value: "all" },
            { label: "Metadata-only", value: "metadata" },
            { label: "Blocked", value: "blocked" },
            { label: "Approved", value: "approved" },
          ]}
          active={status}
          paramName="status"
        />
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-white mb-4">All Rights Records</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {filtered.slice(0, 50).map((r, i) => {
            const rs = String(r.rights_status ?? "");
            const tone: "good" | "warn" | "bad" | "neutral" = rs.includes("blocked") ? "bad" : rs.includes("approved") ? "good" : rs.includes("metadata") ? "warn" : "neutral";
            return <Badge key={i} tone={tone}>{String(r.source ?? "source")} · {rs || "—"}</Badge>;
          })}
        </div>
        <DataTable
          rows={filtered.slice(0, 50).map((r) => ({
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
