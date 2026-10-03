import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, InsightCard, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadPlatformMedia } from "@/lib/statking/product";
export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const items = loadPlatformMedia("podcasts");
  return (
    <Shell title="Podcasts" eyebrow="Cockpit · media">
      <StatusRibbon status="fixture" label="Admin view — fixture snapshot" />
      <Cards items={[
        { label: "Podcasts", value: items.length },
        { label: "Transcript-blocked", value: items.filter(i => i.transcript_available === false).length },
        { label: "Rights", value: "metadata-only" },
        { label: "Status", value: "tracked" },
      ]} />
      <InsightCard
        eyebrow="Rights Status"
        headline="Metadata only — no transcript extraction"
        body="Podcast transcripts are copyrighted expression. Only titles, sources, detected players, and metadata are tracked. Transcripts require written permission or partnership agreement before any automated extraction."
        tone="warn"
      />
      <SectionHeader title="Tracked Podcast Sources" />
      <DataTable
        rows={items.map((i: Record<string, unknown>) => ({
          name: String(i.name ?? ""),
          rss_url: String(i.rss_url ?? ""),
          rights_mode: String(i.rights_mode ?? ""),
          activation: String(i.partner_activation_status ?? ""),
          expert_mapping: String(i.expert_mapping_status ?? ""),
        }))}
        maxRows={50}
      />
    </Shell>
  );
}
