import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadPlayers } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const players=loadPlayers();
  const flagged=players.filter(p=>p.status!=="Active");
  const rows=flagged.map(p=>({player:p.name,team:p.team,pos:p.position,status:p.status,usage:p.usage_score,fantasy:p.fantasy_edge,missing:p.missing_data}));
  return <Shell title="Injuries — Admin" eyebrow="Cockpit · injuries"><Cards items={[{label:"Players",value:players.length},{label:"Flagged",value:flagged.length},{label:"Active",value:players.filter(p=>p.status==="Active").length},{label:"Live feed needed",value:players.filter(p=>p.missing_data.some(m=>/injur/i.test(m))).length}]}/>
  <p className="text-ink-300">Status flags the public Injury Report draws from. Official designations need a licensed feed.</p>
  <SimpleTable rows={rows}/></Shell>;
}
