import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, Badge, SimpleTable } from "../../../stats/_components";
import { loadPlatformMedia } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const items=loadPlatformMedia("youtube");
  return <Shell title="YouTube" eyebrow="Cockpit · media"><Cards items={[{label:"Channels",value:items.length},{label:"Transcript-blocked",value:items.filter(i=>String(i.transcript_status).includes("blocked")).length},{label:"Rights",value:"metadata-only"},{label:"Status",value:"tracked"}]}/>
  <p className="text-ion-1">YouTube channels tracked at the metadata level. Transcripts stay blocked until owned or partner-licensed.</p>
  <Badge tone="warn">Metadata only — no transcript extraction.</Badge>
  <SimpleTable rows={items}/></Shell>;
}
