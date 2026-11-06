#!/usr/bin/env node
/**
 * Live harvest CLI. Runs one registered adapter against its real URL and writes a
 * provenance-stamped artifact. This is the only place the package touches the network.
 *
 * Usage:
 *   npx tsx scripts/competitive-intel/harvest.ts --adapter products --out .ci-out
 *   npx tsx scripts/competitive-intel/harvest.ts --adapter filters --out .ci-out --limit 50
 *
 * Exit: 0 harvested, 1 fetch/normalize/validate failed, 2 usage.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AdapterError, fetchArtifact, runAdapter, type RivalAdapter } from "../../packages/competitive-intel/src/adapter.js";
import {
  familyHistogram,
  fantasylabsFiltersAdapter,
  type RivalFeature,
} from "../../packages/competitive-intel/src/adapters/fantasylabs-filters.js";
import {
  entryPriceByFamily,
  fantasylabsProductsAdapter,
  type RivalPrice,
} from "../../packages/competitive-intel/src/adapters/fantasylabs-products.js";
import {
  chalkBoard,
  ownershipAdapter,
  type RivalOwnership,
} from "../../packages/competitive-intel/src/adapters/fantasylabs-ownership.js";
import {
  engagementBand,
  entrantsAdapter,
  rollUpEntrants,
  type RivalEntrant,
} from "../../packages/competitive-intel/src/adapters/fantasylabs-contests.js";

const SPORT = Number(process.env.CI_SPORT ?? 5);

/** Contest-scoped adapters need an id, so they are built after the args are read. */
function buildAdapter(name: string): RivalAdapter<unknown> | undefined {
  if (name === "filters") return fantasylabsFiltersAdapter as RivalAdapter<unknown>;
  if (name === "products") return fantasylabsProductsAdapter as RivalAdapter<unknown>;
  if (name === "ownership") {
    const contest = Number(arg("contest"));
    const owner = Number(arg("owner"));
    if (!Number.isInteger(contest) || !Number.isInteger(owner)) return undefined;
    return ownershipAdapter(SPORT, contest, owner) as RivalAdapter<unknown>;
  }
  if (name === "contests") {
    const contest = Number(arg("contest"));
    if (!Number.isInteger(contest) || contest <= 0) return undefined;
    return entrantsAdapter(contest, SPORT) as RivalAdapter<unknown>;
  }
  return undefined;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

const name = arg("adapter");
const outDir = arg("out") ?? ".ci-out";
const adapter = name ? buildAdapter(name) : undefined;
if (!name || !adapter) {
  throw new Error("usage: harvest.ts --adapter <filters|products|contests|ownership> --out <dir> [--contest <id>]");
}

async function main(): Promise<void> {
  const started = Date.now();
  try {
    const raw = await fetchArtifact(adapter.url, adapter.tier);
    const warnings: string[] = [];
    const run = await runAdapter(adapter, raw, warnings);

    mkdirSync(outDir, { recursive: true });
    const stamp = raw.retrievedAt.replace(/[:.]/g, "-");
    const path = join(outDir, `${adapter.orgSlug}-${adapter.assetType}-${stamp}.json`);
    writeFileSync(
      path,
      JSON.stringify(
        {
          org: run.orgSlug,
          assetType: run.assetType,
          provenance: run.provenance,
          rowCount: run.rows.length,
          warnings: run.warnings,
          rows: run.rows,
        },
        null,
        1,
      ),
    );

    console.log(`[harvest] ${run.rows.length} row(s) -> ${path} in ${Date.now() - started}ms`);
    console.log(`[harvest] tier ${run.provenance.harvest_tier} · licence ${run.provenance.license_class} · commercial_ok ${run.provenance.commercial_ok}`);
    for (const warning of run.warnings) console.log(`[harvest] warn: ${warning}`);

    if (run.rows.length > 0 && "family" in (run.rows[0] as Record<string, unknown>)) {
      const hist = familyHistogram(run.rows as RivalFeature[]);
      console.log(`[harvest] families ${JSON.stringify(hist)}`);
  }
  if (run.rows.length > 0 && "fieldPercent" in (run.rows[0] as Record<string, unknown>)) {
    const board = chalkBoard(run.rows as RivalOwnership[]);
    console.log(`[harvest] chalk board top: ${board.slice(0, 5).map((r) => `${r.playerName} ${r.fieldPercent}%`).join(" · ")}`);
    }
    if (adapter.assetType === "pick_archive") {
    const profiles = rollUpEntrants(run.rows as RivalEntrant[]);
    const bands = profiles.reduce<Record<string, number>>((acc, p) => {
      const band = engagementBand(p);
      acc[band] = (acc[band] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`[harvest] ${profiles.length} unique entrant(s), bands ${JSON.stringify(bands)}`);
    console.log(`[harvest] top by lineups: ${profiles.slice(0, 5).map((p) => `${p.username}:${p.lineups}`).join(" ")}`);
  }
  if (adapter.assetType === "price_sheet") {
      const entry = entryPriceByFamily(run.rows as RivalPrice[]);
      console.log(`[harvest] cheapest paid entry by family: ${JSON.stringify(Object.fromEntries(entry))}`);
    }
  } catch (err) {
    if (err instanceof AdapterError) {
      console.error(`[harvest] ${err.code} ${err.message}`);
      if (err.detail) console.error(JSON.stringify(err.detail).slice(0, 600));
      process.exit(1);
    }
    throw err;
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
