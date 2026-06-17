import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, InsightCard, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadPlatformMedia } from "@/lib/statking/product";
export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const items = loadPlatformMedia("reddit");
  return (
    <Shell title="Reddit" eyebrow="Cockpit · media">
      <StatusRibbon status="fixture" label="Admin view — fixture snapshot" />
      <Cards items={[
        { label: "Communities", value: items.length },
        { label: "Commercial-gated", value: items.filter(i => String(i.commercial_signal_status) === "gated").length },
        { label: "Rights", value: "metadata-only" },
        { label: "Status", value: "tracked" },
      ]} />
      <InsightCard
        eyebrow="Rights Status"
        headline="Public metadata and links only — not commercial signal use"
        body="Reddit's API terms prohibit automated commercial signal extraction without a Data API license. Tracked community discussions are metadata-level only: thread titles, subreddits, detected players. Rumor-risk and confidence scoring applied before anything becomes a signal."
        tone="warn"
      />
      <SectionHeader title="Tracked Reddit Sources" />
      <DataTable
        rows={items.map((i: Record<string, unknown>) => ({
          source: String(i.source_name ?? ""),
          title: String(i.title ?? ""),
          rights_mode: String(i.rights_mode ?? ""),
          activation: String(i.activation_status ?? ""),
          trust: Number(i.source_trust ?? 0),
        }))}
        maxRows={50}
      />
    </Shell>
  );
}
