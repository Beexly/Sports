import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, Badge, SimpleTable } from "../../../stats/_components";
import { loadPlatformMedia } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const items=loadPlatformMedia("reddit");
  return <Shell title="Reddit" eyebrow="Cockpit · media"><Cards items={[{label:"Communities",value:items.length},{label:"Commercial-gated",value:items.filter(i=>String(i.commercial_signal_status)==="gated").length},{label:"Rights",value:"metadata-only"},{label:"Status",value:"tracked"}]}/>
  <p className="text-ion-1">Community sources tracked at the metadata level, with rumor-risk and confidence scoring before anything becomes a signal.</p>
  <Badge tone="warn">Metadata and links only — public, facts-level.</Badge>
  <SimpleTable rows={items}/></Shell>;
}
