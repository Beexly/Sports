import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, Badge, DataTable } from "../../../stats/_components";
import { loadExpertRegistry } from "@/lib/statking/product";
export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const experts = loadExpertRegistry();

  return (
    <Shell title="Expert Signals" eyebrow="Cockpit · experts">
      <Cards items={[
        { label: "Experts tracked", value: experts.length },
        { label: "Signal-blocked", value: experts.filter(e => String(e.signal_rights).includes("blocked")).length },
        { label: "Metadata-only", value: experts.filter(e => String(e.display_rights).includes("metadata")).length },
        { label: "Partner-gated", value: experts.filter(e => String(e.partner_status).includes("partner")).length }
      ]} />
      <p className="text-ink-300 mb-4">
        Tracked analyst signals and exactly what rights each one carries before it can feed a metric or a display.
      </p>
      <div className="space-y-3">
        <Badge tone="warn">Signal rights are enforced — blocked experts never feed active metrics.</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {experts.slice(0, 6).map((e, idx) => {
          const signalTone = String(e.signal_rights).includes("blocked") ? "bad" : "neutral";
          const displayTone = String(e.display_rights).includes("metadata") ? "warn" : "good";
          return (
            <div key={idx} className="border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="mb-3">
                <p className="text-white font-semibold">{String(e.name ?? "")}</p>
                <p className="text-sm text-ink-400">{String(e.organization ?? "")}</p>
              </div>
              <div className="space-y-2 mb-3">
                <Badge tone={signalTone === "bad" ? "bad" : "neutral"}>Signal: {String(e.signal_rights ?? "")}</Badge>
                <Badge tone={displayTone === "warn" ? "warn" : "good"}>Display: {String(e.display_rights ?? "")}</Badge>
              </div>
              <p className="text-xs text-ink-400">Specialty: {String(e.specialty ?? "")}</p>
            </div>
          );
        })}
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-white mb-4">All Experts</h2>
        <DataTable
          rows={experts.map((e: Record<string, unknown>) => ({
            name: String(e.name ?? ""),
            org: String(e.organization ?? ""),
            specialty: String(e.specialty ?? ""),
            signal_rights: String(e.signal_rights ?? ""),
            display_rights: String(e.display_rights ?? ""),
            partner: String(e.partner_status ?? ""),
            next: String(e.next_action ?? "")
          }))}
          maxRows={50}
        />
      </div>
    </Shell>
  );
}
