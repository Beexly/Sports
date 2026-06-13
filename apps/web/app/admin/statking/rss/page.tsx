import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, SimpleTable } from "../../../stats/_components";
import { loadPlatformMedia } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
 const rows=loadPlatformMedia('rss'); return <Shell title="RSS Admin"><Cards items={[{label:"Feeds",value:rows.length},{label:"Mode",value:"metadata-only"},{label:"Body ingest",value:"blocked"},{label:"Next",value:"terms review"}]}/><SimpleTable rows={rows}/></Shell> }
