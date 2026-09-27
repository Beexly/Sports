import { loadRosters, isOk } from "@nflverse/nflreadts";
async function main(){
  for (const s of [2026]) {
    const r = await loadRosters([s], { format: "parquet" });
    if (!isOk(r)) { console.log(s, "LOAD FAILED:", r.error.message.slice(0,160)); continue; }
    const rows = r.value as unknown as Record<string,unknown>[];
    console.log(s, "rows:", rows.length);
    const buf = rows.filter((x:any)=>String(x.team)==="BUF"||String(x.team)==="LAC");
    console.log("  BUF/LAC rows:", buf.length);
    const g = buf.filter((x:any)=>x.gsis_id).slice(0,5);
    for (const x of g) console.log("   ", x.team, x.position, x.full_name, x.gsis_id, "pfr:", x.pfr_id);
  }
}
main();
