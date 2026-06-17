import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, InsightCard, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadPlatformMedia } from "@/lib/statking/product";
export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const items = loadPlatformMedia("youtube");
  return (
    <Shell title="YouTube" eyebrow="Cockpit · media">
      <StatusRibbon status="fixture" label="Admin view — fixture snapshot" />
      <Cards items={[
        { label: "Channels", value: items.length },
        { label: "Transcript-blocked", value: items.filter(i => String(i.transcript_status).includes("blocked")).length },
        { label: "Rights", value: "metadata-only" },
        { label: "Status", value: "tracked" },
      ]} />
      <InsightCard
        eyebrow="Rights Status"
        headline="Metadata only — no transcript extraction"
        body="YouTube video transcripts require the creator's permission or a licensing agreement before automated extraction. Only titles, channel names, detected players, and metadata are tracked."
        tone="warn"
      />
      <SectionHeader title="Tracked YouTube Sources" />
      <DataTable
        rows={items.map((i: Record<string, unknown>) => ({
          name: String(i.name ?? ""),
          rights_mode: String(i.rights_mode ?? ""),
          activation: String(i.activation_status ?? ""),
          transcript: String(i.transcript_status ?? ""),
        }))}
        maxRows={50}
      />
    </Shell>
  );
}
