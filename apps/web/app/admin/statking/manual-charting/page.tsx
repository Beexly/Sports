import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const { notes }=loadOwnedSignals();
  return <Shell title="Manual Charting" eyebrow="Cockpit · first-party"><Cards items={[{label:"Notes",value:notes.length},{label:"Display-approved",value:notes.filter(n=>n.approved_for_display).length},{label:"Model-approved",value:notes.filter(n=>n.approved_for_model).length},{label:"Source",value:"first-party"}]}/>
  <p className="text-ion-1">First-party charting notes with explicit display and model approval flags — the owned signal layer, rights-clean by construction.</p>
  <SimpleTable rows={notes}/></Shell>;
}
