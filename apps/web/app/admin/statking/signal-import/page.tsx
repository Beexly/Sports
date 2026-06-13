import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadOwnedSignals } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const { feedback, suggestions }=loadOwnedSignals();
  const pending=suggestions.filter(s=>s.reviewed_status!=="approved"&&s.reviewed_status!=="rejected").length;
  return <Shell title="Signal Import" eyebrow="Cockpit · intake"><Cards items={[{label:"User feedback",value:feedback.length},{label:"Source suggestions",value:suggestions.length},{label:"In review",value:pending},{label:"Gate",value:"rights review"}]}/>
  <p className="text-ion-1">The intake queue — user feedback and suggested sources, every one routed through rights review before it can become active.</p>
  <h2 className="text-2xl text-ion-white">User feedback</h2><SimpleTable rows={feedback}/>
  <h2 className="text-2xl text-ion-white">Source suggestions</h2><SimpleTable rows={suggestions}/></Shell>;
}
