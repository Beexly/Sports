import Link from "next/link";
import { Shell, Cards } from "./_components";
import { loadSummary, loadActiveMetricManifest, rankPlayers } from "@/lib/statking/product";
export const metadata = {
  title: "Galaxy StatKing — NFL Player & Team Intelligence",
  description: "A rights-gated NFL stat intelligence system: players, teams, media signal, sources, and the proof behind every metric.",
  alternates: { canonical: "/stats" },
};
export default function Page(){ const s=loadSummary(); const m=loadActiveMetricManifest(); const top=rankPlayers().slice(0,5); return <Shell title="Galaxy StatKing" eyebrow="NFL intelligence"><Cards items={[{label:"Sources",value:s.source_count},{label:"Candidates",value:s.candidate_count},{label:"Active metrics",value:m.active_calculated_count},{label:"Top GPI",value:top[0]?.galaxy_player_index ?? "—"}]}/><section className="grid gap-4 md:grid-cols-3">{([{label:"Players",href:"/stats/players"},{label:"Compare",href:"/stats/compare"},{label:"Coverage",href:"/stats/coverage"},{label:"Sources",href:"/stats/sources"},{label:"Media",href:"/stats/media"},{label:"Ask",href:"/stats/ask"}]).map(({label,href})=><Link key={href} className="border border-mineral bg-eclipse p-5 text-ion-white" href={href}>{label}<p className="mt-2 text-sm text-ion-1">Open working StatKing surface.</p></Link>)}</section></Shell>}
