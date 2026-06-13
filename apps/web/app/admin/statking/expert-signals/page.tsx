import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, Badge, SimpleTable } from "../../../stats/_components";
import { loadExpertRegistry } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const experts=loadExpertRegistry();
  const rows=experts.map(e=>({name:e.name,org:e.organization,specialty:e.specialty,signal_rights:e.signal_rights,display_rights:e.display_rights,partner:e.partner_status,next:e.next_action}));
  return <Shell title="Expert Signals" eyebrow="Cockpit · experts"><Cards items={[{label:"Experts tracked",value:experts.length},{label:"Signal-blocked",value:experts.filter(e=>String(e.signal_rights).includes("blocked")).length},{label:"Metadata-only",value:experts.filter(e=>String(e.display_rights).includes("metadata")).length},{label:"Partner-gated",value:experts.filter(e=>String(e.partner_status).includes("partner")).length}]}/>
  <p className="text-ion-1">Tracked analyst signals and exactly what rights each one carries before it can feed a metric or a display.</p>
  <Badge tone="warn">Signal rights are enforced — blocked experts never feed active metrics.</Badge>
  <SimpleTable rows={rows}/></Shell>;
}
