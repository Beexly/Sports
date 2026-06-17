import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadPlayers } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const players = loadPlayers();
  const risers = [...players].sort((a, b) => b.trend_score - a.trend_score).slice(0, 25);
  const rows = risers.map(p => ({
    player: String(p.name ?? ""),
    team: String(p.team ?? ""),
    pos: String(p.position ?? ""),
    trend: Number(p.trend_score ?? 0),
    usage: Number(p.usage_score ?? 0),
    volatility: Number(p.volatility_score ?? 0),
    status: String(p.status ?? ""),
  }));
  return (
    <Shell title="Alerts — Admin" eyebrow="Cockpit · alerts">
      <StatusRibbon status="fixture" label="Admin view — fixture snapshot" />
      <Cards items={[{label:"Players",value:players.length},{label:"Rising",value:risers.length},{label:"Volatile",value:players.filter(p=>p.volatility_score>=60).length},{label:"Status flags",value:players.filter(p=>p.status!=="Active").length}]}/>
      <p className="text-ion-1">Alert candidates the public Alerts surface draws from. Delivery channels (email/push) are owner-gated.</p>
      <SectionHeader title="Alert Candidates" />
      <DataTable rows={rows} maxRows={50} />
    </Shell>
  );
}
