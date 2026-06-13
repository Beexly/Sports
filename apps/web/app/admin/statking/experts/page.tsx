import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadExpertRegistry } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const experts=loadExpertRegistry();
  return <Shell title="Expert Registry" eyebrow="Cockpit · experts"><Cards items={[{label:"Experts",value:experts.length},{label:"Specialties",value:new Set(experts.map(e=>e.specialty)).size},{label:"Organizations",value:new Set(experts.map(e=>e.organization)).size},{label:"Partner-gated",value:experts.filter(e=>String(e.partner_status).includes("partner")).length}]}/>
  <p className="text-ion-1">The full expert registry with partner, signal, and display rights per analyst.</p>
  <SimpleTable rows={experts}/></Shell>;
}
