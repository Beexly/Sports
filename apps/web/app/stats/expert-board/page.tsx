import { Shell, Cards, DataTable, Badge, StatusRibbon } from "../_components";
import { loadExpertRegistry } from "@/lib/statking/product";
export const metadata = {
  title: "Expert Board — Tracked Analyst Signals",
  description: "A rights-respecting view of tracked expert and analyst signals across the league.",
  alternates: { canonical: "/stats/expert-board" },
};
export default function Page() {
  const experts = loadExpertRegistry();

  return (
    <Shell title="Expert Board">
      <StatusRibbon status="blocked" label="Expert signals — rights-gated pending partnerships" />
      <Cards items={[
        { label: "Experts", value: experts.length },
        { label: "Signal rights", value: "gated" },
        { label: "Partner status", value: "queued" },
        { label: "Active signals", value: 0 }
      ]} />
      <p className="text-ion-1">
        A rights-respecting view of tracked expert and analyst signals across the league. Waiting for partnership approvals before activation.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {experts.slice(0, 6).map((e, idx) => (
          <div key={idx} className="border border-mineral bg-eclipse p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-ion-white font-semibold">{String(e.expert_name ?? "")}</p>
              <Badge tone="warn">Pending</Badge>
            </div>
            <p className="text-sm text-ion-1 mb-2">Specialty: {String(e.specialty ?? "")}</p>
            <p className="text-xs text-ion-2">Platform: {String(e.platform ?? "")}</p>
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">Expert Registry</h2>
        <DataTable
          rows={experts.map((e: any) => ({
            expert_name: String(e.expert_name ?? ""),
            specialty: String(e.specialty ?? ""),
            platform: String(e.platform ?? ""),
            signal_status: String(e.signal_status ?? ""),
            rights_status: String(e.rights_status ?? "")
          }))}
          maxRows={50}
        />
      </div>
    </Shell>
  );
}
