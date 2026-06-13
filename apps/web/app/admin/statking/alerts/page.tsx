import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadPlayers } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const players=loadPlayers();
  const risers=[...players].sort((a,b)=>b.trend_score-a.trend_score).slice(0,25);
  const rows=risers.map(p=>({player:p.name,team:p.team,pos:p.position,trend:p.trend_score,usage:p.usage_score,volatility:p.volatility_score,status:p.status}));
  return <Shell title="Alerts — Admin" eyebrow="Cockpit · alerts"><Cards items={[{label:"Players",value:players.length},{label:"Rising",value:risers.length},{label:"Volatile",value:players.filter(p=>p.volatility_score>=60).length},{label:"Status flags",value:players.filter(p=>p.status!=="Active").length}]}/>
  <p className="text-ion-1">Alert candidates the public Alerts surface draws from. Delivery channels (email/push) are owner-gated.</p>
  <SimpleTable rows={rows}/></Shell>;
}
