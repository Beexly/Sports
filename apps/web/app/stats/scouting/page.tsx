import { Shell, Cards, Badge, DataTable, StatusRibbon, SectionHeader, InsightCard } from "../_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export const metadata = {
  title: "Scouting — First-Party Player Notes",
  description: "First-party scouting notes and owned signals, clearly labeled and rights-clean.",
  alternates: { canonical: "/stats/scouting" },
};
export default function Page() {
  const { notes } = loadOwnedSignals();
  const shown = notes.filter(n => n.approved_for_display);

  return (
    <Shell title="Scouting" eyebrow="First-party notes">
      <StatusRibbon status="active" label="First-party scouting notes" />
      <Cards items={[
        { label: "Notes", value: notes.length },
        { label: "Public-approved", value: shown.length },
        { label: "Held back", value: notes.length - shown.length },
        { label: "Source", value: "first-party" }
      ]} />
      <p className="text-ion-1">
        Scouting notes we author and own. Only entries explicitly cleared for display appear here — the rest stay internal.
      </p>
      <div className="space-y-3">
        <Badge tone="good">Rights-clean: first-party content, display-gated.</Badge>
      </div>
      <SectionHeader title="Approved Notes" />
      <div className="grid gap-4 md:grid-cols-2">
        {shown.slice(0, 6).map((n, idx) => (
          <InsightCard
            key={idx}
            eyebrow={String(n.note_type ?? "").toUpperCase()}
            headline={String(n.entity_id ?? "")}
            body={String(n.note ?? "")}
            tone="good"
          />
        ))}
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-ion-white mb-4">All Public Notes</h2>
        <DataTable
          rows={shown.slice(0, 40).map(n => ({
            type: String(n.note_type ?? ""),
            entity: String(n.entity_id ?? ""),
            note: String(n.note ?? ""),
            confidence: Number(n.confidence ?? 0),
            tags: Array.isArray(n.tags) ? n.tags.join("; ") : ""
          }))}
          maxRows={40}
        />
      </div>
    </Shell>
  );
}
