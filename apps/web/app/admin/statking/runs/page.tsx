import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadIntegrityStatus } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const integ=loadIntegrityStatus();
  return <Shell title="Pipeline Runs" eyebrow="Cockpit · runs"><Cards items={[{label:"Recorded checks",value:integ.commands.length},{label:"Merge safety",value:String(integ.merge_safety)},{label:"Last recommendation",value:String(integ.final_recommendation).slice(0,18)},{label:"Status",value:"logged"}]}/>
  <p className="text-ion-1">Pipeline and integrity run history — what ran, what it returned, and whether it was StatKing-specific.</p>
  <SimpleTable rows={integ.commands}/></Shell>;
}
