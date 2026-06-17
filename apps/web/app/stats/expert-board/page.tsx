import { Shell, Cards, DataTable, Badge, StatusRibbon, InsightCard, SectionHeader } from "../_components";
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
      <InsightCard
        eyebrow="Why This Page Is Gated"
        headline="Expert predictions are copyrighted — we need permission before automating"
        body="Fantasy analysts like beat reporters own their predictions. Automated aggregation without a license or partnership agreement violates their rights. We're building outreach to analysts for data-sharing arrangements. Until then, signals are tracked in the registry but not displayed or processed."
        tone="bad"
      />
      <div className="grid gap-4 md:grid-cols-2">
        {experts.slice(0, 6).map((e: Record<string, unknown>, idx) => (
          <div key={idx} className="border border-mineral bg-eclipse p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-ion-white font-semibold">{String(e.expert_name ?? "")}</p>
              <Badge tone="warn">Pending</Badge>
            </div>
            <p className="text-sm text-ion-1 mb-2">Specialty: {String(e.specialty ?? "")}</p>
            <p className="text-xs text-ion-2">Platform: {String(e.platform ?? "")}</p>
            {String(e.rights_mode ?? e.display_rights ?? "") !== "" && (
              <p className="text-xs text-ion-2">{String(e.rights_mode ?? e.display_rights ?? "")}</p>
            )}
          </div>
        ))}
      </div>
      <SectionHeader
        title="Expert Registry"
        eyebrow={experts.length + " tracked"}
      />
      <div>
        <DataTable
          rows={experts.map((e: Record<string, unknown>) => ({
            expert_name: String(e.name ?? ""),
            specialty: String(e.specialty ?? ""),
            organization: String(e.organization ?? ""),
            signal_rights: String(e.signal_rights ?? ""),
            display_rights: String(e.display_rights ?? "")
          }))}
          maxRows={50}
        />
      </div>
    </Shell>
  );
}
