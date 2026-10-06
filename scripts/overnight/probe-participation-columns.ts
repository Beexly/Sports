/**
 * What columns does the 2018 participation release ACTUALLY carry?
 *
 * The projection keeps gsis-shaped ids for 2023+ and bare numeric ids for
 * 2018-2022. If the older release also ships name columns, a real crosswalk is
 * buildable from data already published by nflverse, and the identifier break
 * stops being a dead end.
 */
import { loadParticipation, isOk } from "@nflverse/nflreadts";

async function main(): Promise<void> {
  for (const season of [2018, 2022, 2023]) {
    const res = await loadParticipation(season, { format: "parquet" });
    if (!isOk(res)) {
      console.log(`${season}: ERROR ${res.error.message}`);
      continue;
    }
    const rows = res.value as unknown as Record<string, unknown>[];
    const first = rows[0] ?? {};
    const keys = Object.keys(first).sort();
    console.log(`\n=== ${season} :: ${rows.length} rows ===`);
    console.log(`keys (${keys.length}): ${keys.join(", ")}`);

    const nameKeys = keys.filter((k) => /name/i.test(k));
    const idKeys = keys.filter((k) => /_id$|^id$|player/.test(k));
    console.log(`name-like columns: ${nameKeys.join(", ") || "NONE"}`);
    console.log(`id-like columns:   ${idKeys.join(", ") || "NONE"}`);

    for (const k of nameKeys.slice(0, 3)) {
      console.log(`  ${k} = ${JSON.stringify(first[k])?.slice(0, 200)}`);
    }
    for (const k of idKeys.slice(0, 6)) {
      console.log(`  ${k} = ${JSON.stringify(first[k])?.slice(0, 200)}`);
    }
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
