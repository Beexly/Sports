import { Shell, Cards, Badge, SimpleTable } from "../_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export const metadata = {
  title: "Scouting — First-Party Player Notes",
  description: "First-party scouting notes and owned signals, clearly labeled and rights-clean.",
  alternates: { canonical: "/stats/scouting" },
};
export default function Page(){
  const { notes }=loadOwnedSignals();
  const shown=notes.filter(n=>n.approved_for_display);
  const rows=shown.slice(0,40).map(n=>({type:n.note_type,entity:n.entity_id,note:n.note,confidence:n.confidence,tags:n.tags}));
  return <Shell title="Scouting" eyebrow="First-party notes"><Cards items={[{label:"Notes",value:notes.length},{label:"Public-approved",value:shown.length},{label:"Held back",value:notes.length-shown.length},{label:"Source",value:"first-party"}]}/>
  <p className="text-ion-1">Scouting notes we author and own. Only entries explicitly cleared for display appear here — the rest stay internal.</p>
  <Badge tone="good">Rights-clean: first-party content, display-gated.</Badge>
  <SimpleTable rows={rows}/></Shell>;
}
