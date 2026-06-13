import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadAudit } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
 const a=loadAudit(); return <Shell title="Source Conflicts"><Cards items={[{label:"Detector",value:"working"},{label:"Live conflicts",value:0},{label:"Fixture coverage",value:"tested"},{label:"Next",value:"wire feeds"}]}/><SimpleTable rows={a.items.filter(i=>i.system.includes("conflict") || i.system.includes("source"))}/></Shell> }
