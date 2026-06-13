import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadIntegrityStatus } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const integ=loadIntegrityStatus();
  return <Shell title="Ops" eyebrow="Cockpit · ops"><Cards items={[{label:"Checks",value:integ.commands.length},{label:"Merge safety",value:String(integ.merge_safety)},{label:"Recommendation",value:String(integ.final_recommendation).slice(0,18)},{label:"Status",value:"audited"}]}/>
  <p className="text-ion-1">The latest integrity pass — every gate command, its result, and the merge recommendation.</p>
  <SimpleTable rows={integ.commands}/></Shell>;
}
