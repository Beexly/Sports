import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadMetricReliability } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const r=loadMetricReliability();
  return <Shell title="Signal Calibration" eyebrow="Cockpit · proof"><Cards items={[{label:"Metrics scored",value:r.metrics.length},{label:"Method",value:"reliability tiers"},{label:"Basis",value:"backtest history"},{label:"Status",value:"honest"}]}/>
  <p className="text-ion-1">Per-metric reliability — how much weight each signal has earned against history, so calibrated metrics outrank promising-but-unproven ones.</p>
  <SimpleTable rows={r.metrics}/></Shell>;
}
