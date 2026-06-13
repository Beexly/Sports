import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadSourceTargets } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const t=loadSourceTargets();
  return <Shell title="Competitive Intelligence" eyebrow="Cockpit · moat"><Cards items={[{label:"Moat sources",value:t.top_50_highest_moat_sources.length},{label:"Easy wins",value:t.top_50_easiest_wins.length},{label:"License-gated",value:t.top_50_requires_license.length},{label:"View",value:"highest moat"}]}/>
  <p className="text-ion-1">The highest-moat sources — the data that, once activated lawfully, is hardest for a competitor to replicate.</p>
  <SimpleTable rows={t.top_50_highest_moat_sources}/></Shell>;
}
