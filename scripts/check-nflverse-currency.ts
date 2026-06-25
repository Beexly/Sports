/**
 * nflverse currency guard — fails loudly if any dataset the app depends on can no longer reach the
 * current NFL season. This exists because nflverse periodically RENAMES/RESHAPES release assets
 * (e.g. after 2024 the weekly player-stats and Next Gen Stats assets moved), and a renamed asset
 * 404s SILENTLY — the app then serves last-season data labeled "live". "It says it's current" is not
 * enough; this checks the real HTTP + season coverage, catalog-driven (single source of truth).
 *
 * RUN:  NODE_OPTIONS=--use-system-ca npx tsx scripts/check-nflverse-currency.ts
 * Exit 0 = every required dataset reaches the current season. Exit 1 = at least one is stale.
 * Intended for periodic/manual runs and pre-kickoff checks (not a flaky unit test).
 */
import { gunzipSync } from "node:zlib";
import { NFLVERSE_CATALOG, nflverseUrl, type NflverseDatasetKey } from "../packages/data-ingestion/src/nflverse-source.js";

// Same rule as currentNflSeason(): NFL season is labelled by its September start year.
function currentNflSeason(now = new Date()): number {
  return now.getUTCMonth() >= 8 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
}
const SEASON = currentNflSeason();

// Datasets that legitimately do not track the NFL season tightly — warn instead of fail.
const SOFT: Partial<Record<NflverseDatasetKey, string>> = {
  contracts: "OverTheCap upstream lag (often 1-3 seasons behind)",
  players: "all-time master table (no season column)",
  combine: "keyed by draft class",
  draft_picks: "keyed by draft year",
  trades: "event-dated",
};
// NGS variants share one catalog key.
const VARIANTS: Partial<Record<NflverseDatasetKey, string[]>> = {
  ngs: ["receiving", "passing", "rushing"],
  pfr_advstats: ["rec"],
};

function fields(line: string): string[] {
  const out: string[] = []; let f = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (q) { if (c === '"') { if (line[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { out.push(f); f = ""; } else f += c;
  }
  out.push(f); return out;
}

async function reach(url: string): Promise<{ ok: boolean; status: number | string; maxSeason?: number }> {
  try {
    const res = await fetch(url);
    if (!res.ok) return { ok: false, status: res.status };
    const buf = Buffer.from(await res.arrayBuffer());
    const isGz = buf.length > 1 && buf[0] === 0x1f && buf[1] === 0x8b;
    const txt = (isGz ? gunzipSync(buf) : buf).toString("utf8");
    const lines = txt.trim().split("\n");
    const header = fields(lines[0]!);
    const si = header.indexOf("season");
    if (si < 0) return { ok: true, status: res.status }; // master table, no season
    let mx = 0;
    for (let i = 1; i < lines.length; i++) { const v = Number(fields(lines[i]!)[si]); if (Number.isFinite(v) && v > mx) mx = v; }
    return { ok: true, status: res.status, maxSeason: mx };
  } catch (e) { return { ok: false, status: e instanceof Error ? e.message : "err" }; }
}

async function main(): Promise<void> {
  console.log(`\nnflverse currency guard — required current season >= ${SEASON}\n`);
  const failures: string[] = [];
  const warnings: string[] = [];

  for (const key of Object.keys(NFLVERSE_CATALOG) as NflverseDatasetKey[]) {
    const d = NFLVERSE_CATALOG[key];
    const variants = VARIANTS[key] ?? [undefined as unknown as string];
    for (const variant of variants) {
      const url = nflverseUrl(key, SEASON, variant);
      const label = `${key}${variant ? `(${variant})` : ""}`;
      const soft = SOFT[key];
      if (d.seasonal) {
        // Per-season asset: the current-season file must exist.
        const r = await reach(url);
        const okMark = r.ok ? "OK" : "** STALE **";
        console.log(`${label.padEnd(26)} seasonal ${url.split("/download/")[1]}  -> ${r.ok ? `${r.status}` : `MISSING(${r.status})`}  ${okMark}`);
        if (!r.ok) (soft ? warnings : failures).push(`${label}: current-season asset missing (${r.status})`);
      } else {
        // Combined asset: max season present must reach the current season.
        const r = await reach(url);
        let reaches = r.maxSeason !== undefined ? r.maxSeason >= SEASON : r.ok;
        let note = "";
        // player_stats_week: fetchNflverse merges the per-season current file into the (lagging)
        // combined asset, so the guard checks that per-season source too before declaring it stale.
        if (!reaches && key === "player_stats_week") {
          const perSeason = await reach(`${nflverseUrl(key, SEASON).split("/player_stats/")[0]}/stats_player/stats_player_week_${SEASON}.csv`);
          if (perSeason.ok) { reaches = true; note = " (current season via per-season merge)"; }
        }
        const okMark = !r.ok ? "** UNREACHABLE **" : reaches ? `OK${note}` : `** STALE (max ${r.maxSeason}) **`;
        console.log(`${label.padEnd(26)} combined ${url.split("/download/")[1]}  -> max ${r.maxSeason ?? "n/a"}  ${okMark}`);
        if (!r.ok) (soft ? warnings : failures).push(`${label}: combined asset unreachable (${r.status})`);
        else if (!reaches) (soft ? warnings : failures).push(`${label}: combined asset max season ${r.maxSeason} < ${SEASON}${soft ? ` (${soft})` : ""}`);
      }
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  if (warnings.length) { console.log(`WARNINGS (soft / known upstream lag):`); for (const w of warnings) console.log(`  - ${w}`); }
  if (failures.length) {
    console.log(`\nFAILURES (${failures.length}) — these datasets cannot reach season ${SEASON}:`);
    for (const f of failures) console.log(`  ✗ ${f}`);
    console.log(`\nLikely cause: nflverse renamed/reshaped the asset. Update the catalog in`);
    console.log(`packages/data-ingestion/src/nflverse-source.ts (see how player_stats_week + ngs handle it).\n`);
    process.exit(1);
  }
  console.log(`\nAll required nflverse datasets reach season ${SEASON}. ✅\n`);
}

main().catch((err) => { console.error(err); process.exit(2); });
