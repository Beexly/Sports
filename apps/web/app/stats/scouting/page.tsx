import { Shell, Cards, DataTable, StatusRibbon, SectionHeader, InsightCard } from "../_components";
import { loadOwnedSignals, playerNameMap } from "@/lib/statking/product";
export const metadata = {
  title: "Scouting — First-Party Player Notes",
  description: "First-party scouting notes and owned signals, clearly labeled and rights-clean.",
  alternates: { canonical: "/stats/scouting" },
};
export default function Page() {
  const { notes } = loadOwnedSignals();
  const shown = notes.filter(n => n.approved_for_display);
  const names = playerNameMap();

  return (
    <Shell title="Scouting" eyebrow="First-party notes">
      <StatusRibbon status="active" label="First-party scouting notes" />
      <Cards items={[
        { label: "Notes", value: notes.length },
        { label: "Public-approved", value: shown.length },
        { label: "Held back", value: notes.length - shown.length },
        { label: "Source", value: "first-party" }
      ]} />
      <InsightCard
        eyebrow="First-Party Scouting"
        headline="We author these — no third-party copyright concerns"
        body="All notes on this page are first-party: authored by us, rights-clean, display-approved. They represent observations about player roles, usage patterns, and opportunity signals."
        tone="good"
      />
      {shown.length === 0 ? (
        <p className="text-sm text-ion-1 py-6 px-4 border border-mineral bg-eclipse/40 text-center">
          No public scouting notes yet — first-party notes will appear here when authored and approved for display.
        </p>
      ) : (
        <>
          <SectionHeader title="Approved Notes" />
          <div className="grid gap-4 md:grid-cols-2">
            {shown.slice(0, 6).map((n, idx) => (
              <InsightCard
                key={idx}
                eyebrow={String(n.note_type ?? "").toUpperCase()}
                headline={names.get(String(n.entity_id ?? "")) ?? String(n.entity_id ?? "")}
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
        </>
      )}
    </Shell>
  );
}
