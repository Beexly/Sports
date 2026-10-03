import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Shell, Cards, DataTable, SectionHeader, StatusRibbon } from "../../../stats/_components";
import { loadAudit } from "@/lib/statking/product";
export default async function Page(){
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") { redirect("/"); }
  const a = loadAudit();
  const conflictItems = a.items.filter(i => i.system.includes("conflict") || i.system.includes("source"));
  return (
    <Shell title="Source Conflicts">
      <StatusRibbon status="fixture" label="Admin view — fixture snapshot" />
      <Cards items={[{label:"Detector",value:"working"},{label:"Live conflicts",value:0},{label:"Fixture coverage",value:"tested"},{label:"Next",value:"wire feeds"}]}/>
      <SectionHeader title="Data Conflicts" />
      <DataTable
        rows={conflictItems.map(i => ({
          system: String(i.system ?? ""),
          status: String(i.status ?? ""),
          priority: String(i.priority ?? ""),
          next_fix: String(i.next_fix ?? ""),
        }))}
        maxRows={50}
      />
    </Shell>
  );
}
