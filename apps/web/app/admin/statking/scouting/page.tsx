import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const { notes, suggestions }=loadOwnedSignals();
  return <Shell title="Scouting" eyebrow="Cockpit · owned signals"><Cards items={[{label:"Notes",value:notes.length},{label:"Suggestions",value:suggestions.length},{label:"Display-approved",value:notes.filter(n=>n.approved_for_display).length},{label:"Source",value:"first-party"}]}/>
  <p className="text-ion-1">The owned-signal desk: first-party scouting notes plus inbound source suggestions awaiting rights review.</p>
  <h2 className="text-2xl text-ion-white">Notes</h2><SimpleTable rows={notes}/>
  <h2 className="text-2xl text-ion-white">Source suggestions</h2><SimpleTable rows={suggestions}/></Shell>;
}
