import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadSourceTargets } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
 const t=loadSourceTargets(); return <Shell title="Source CRM"><Cards items={[{label:"Outreach targets",value:t.top_50_easiest_wins.length},{label:"License targets",value:t.top_50_requires_license.length},{label:"Partner path",value:"ready"},{label:"Next",value:"owner"}]}/><SimpleTable rows={t.top_50_easiest_wins}/></Shell> }
