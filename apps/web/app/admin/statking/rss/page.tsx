import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, InsightCard, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadPlatformMedia } from "@/lib/statking/product";
export default async function Page() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const rows = loadPlatformMedia("rss");
  return (
    <Shell title="RSS Admin" eyebrow="Cockpit · media">
      <StatusRibbon status="fixture" label="Admin view — fixture snapshot" />
      <Cards items={[
        { label: "Feeds", value: rows.length },
        { label: "Mode", value: "metadata-only" },
        { label: "Body ingest", value: "blocked" },
        { label: "Next", value: "terms review" },
      ]} />
      <InsightCard
        eyebrow="Rights Status"
        headline="Article bodies blocked — titles and metadata only"
        body="RSS feeds surface headlines and metadata. Full article body ingestion requires terms review for each source — most news publishers prohibit commercial reproduction without licensing. Only facts (scores, titles, URLs, detected players) are safe at metadata level."
        tone="warn"
      />
      <SectionHeader title="Tracked RSS Feeds" />
      <DataTable
        rows={rows.map((i: Record<string, unknown>) => ({
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
