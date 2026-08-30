import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadMetricReliability } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const r = loadMetricReliability();
  return (
    <Shell title="Signal Calibration" eyebrow="Cockpit · proof">
      <StatusRibbon status="fixture" label="Admin view — fixture snapshot" />
      <Cards items={[{label:"Metrics scored",value:r.metrics.length},{label:"Method",value:"reliability tiers"},{label:"Basis",value:"backtest history"},{label:"Status",value:"honest"}]}/>
      <p className="text-ion-1">Per-metric reliability — how much weight each signal has earned against history, so calibrated metrics outrank promising-but-unproven ones.</p>
      <SectionHeader title="Signal Calibration" />
      <DataTable
        rows={r.metrics.map((m: Record<string, unknown>) => ({
          metric_key: String(m.metric_key ?? ""),
          metric_name: String(m.metric_name ?? ""),
          stability: String(m.stability ?? ""),
          noise_level: String(m.noise_level ?? ""),
          sample_size: String(m.sample_size ?? ""),
          descriptive_vs_predictive: String(m.descriptive_vs_predictive ?? ""),
          confidence_band: String(m.confidence_band ?? ""),
          user_facing_warning: String(m.user_facing_warning ?? ""),
        }))}
        maxRows={50}
      />
    </Shell>
  );
}
