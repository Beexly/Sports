import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, InsightCard, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadProofReport, loadMetricReliability } from "@/lib/statking/product";
export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const proof = loadProofReport() as { metric_reliability_count?: number; claims_to_mute?: string[] };
  const rel = loadMetricReliability();
  return (
    <Shell title="Proof Admin" eyebrow="Cockpit · proof">
      <StatusRibbon status="fixture" label="Admin view — fixture snapshot" />
      <Cards items={[
        { label: "Metric reliability", value: proof.metric_reliability_count ?? rel.metrics.length, note: "reliability records" },
        { label: "Claims to mute", value: proof.claims_to_mute?.length ?? 0, note: "pending review" },
        { label: "Proof state", value: "partial", note: "no live predictions yet" },
        { label: "Need", value: "prediction archive", note: "one prediction = proof starts" },
      ]} />
      <InsightCard
        eyebrow="Proof Readiness"
        headline="Metric reliability is seeded — prediction archive is empty"
        body="These records track which metrics are reliable enough to display. The proof archive will auto-populate the moment the first live prediction is stored and settled. Until then, this is the honest foundation state."
        tone="warn"
      />
      <SectionHeader title="Metric Reliability Records" eyebrow={rel.metrics.length + " metrics"} />
      <DataTable
        rows={rel.metrics.slice(0, 50).map((m: Record<string, unknown>) => ({
          metric_key: String(m.metric_key ?? ""),
          metric_name: String(m.metric_name ?? ""),
          stability: String(m.stability ?? ""),
          noise_level: String(m.noise_level ?? ""),
        }))}
        maxRows={50}
      />
    </Shell>
  );
}
