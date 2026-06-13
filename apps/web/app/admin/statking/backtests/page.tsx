import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadBacktests } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
 const b=loadBacktests(); return <Shell title="Backtests"><Cards items={[{label:"Runs",value:b.runs.length},{label:"State",value:"fixture"},{label:"Proof",value:"partial"},{label:"Need",value:"history"}]}/><SimpleTable rows={b.runs as any}/></Shell> }
