import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const { feedback }=loadOwnedSignals();
  return <Shell title="User Feedback" eyebrow="Cockpit · intake"><Cards items={[{label:"Feedback items",value:feedback.length},{label:"Entities",value:new Set(feedback.map(f=>f.entity_id)).size},{label:"Types",value:new Set(feedback.map(f=>f.feedback_type)).size},{label:"Use",value:"review only"}]}/>
  <p className="text-ion-1">Inbound user feedback on players and metrics — a review input, not an automatic model signal.</p>
  <SimpleTable rows={feedback}/></Shell>;
}
