#!/usr/bin/env node
/**
 * Register data sources in the Source Mesh.
 *
 * Idempotent: safe to re-run. Uses upsert logic in registerSource().
 * Does NOT approve any source — operator must approve via:
 *   POST /api/cockpit/sources  { action: "approve", slug: "the-odds-api" }
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/register-sources.mjs
 *
 * Or after deploy:
 *   CRON_SECRET=xxx curl -X POST https://yoursite.com/api/cockpit/sources \
 *     -H "Authorization: Bearer xxx" \
 *     -H "Content-Type: application/json" \
 *     -d '{"action":"register","registration":{"slug":"the-odds-api",...}}'
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SOURCES = [
  {
    slug: "the-odds-api",
    displayName: "The Odds API",
    tier: 1,
    pollIntervalMs: 30 * 60 * 1000, // 30 minutes
    ttlSeconds: 1800,                 // 30 minutes
    rateLimitRpm: 60,
    crawlDelayMs: 0,
    authType: "api_key",
    metadata: {
      baseUrl: "https://api.the-odds-api.com/v4",
      envKey: "THE_ODDS_API_KEY",
      sports: ["americanfootball_nfl", "basketball_nba", "baseball_mlb", "icehockey_nhl", "soccer_usa_mls"],
      markets: ["h2h", "spreads", "totals"],
      regions: "us",
      oddsFormat: "american",
    },
  },
  {
    slug: "espn-injuries",
    displayName: "ESPN Injuries (Public Feed)",
    tier: 2,
    pollIntervalMs: 4 * 60 * 60 * 1000, // 4 hours
    ttlSeconds: 4 * 3600,
    rateLimitRpm: 10,
    crawlDelayMs: 2000,
    authType: "none",
    metadata: {
      baseUrl: "https://sports.core.api.espn.com/v2",
      note: "Public ESPN API — no key required but rate-limit respected",
    },
  },
  {
    slug: "rotowire-injuries",
    displayName: "RotoWire Injury Reports",
    tier: 2,
    pollIntervalMs: 6 * 60 * 60 * 1000, // 6 hours
    ttlSeconds: 6 * 3600,
    rateLimitRpm: 5,
    crawlDelayMs: 5000,
    authType: "api_key",
    metadata: {
      envKey: "ROTOWIRE_API_KEY",
      note: "Tier 2 — injury and lineup reports from RotoWire",
    },
  },
];

async function main() {
  console.log("Registering Source Mesh data sources...\n");

  for (const source of SOURCES) {
    try {
      const result = await db.dataSource.upsert({
        where: { slug: source.slug },
        create: {
          slug: source.slug,
          displayName: source.displayName,
          tier: source.tier,
          pollIntervalMs: source.pollIntervalMs,
          ttlSeconds: source.ttlSeconds,
          rateLimitRpm: source.rateLimitRpm,
          crawlDelayMs: source.crawlDelayMs,
          authType: source.authType,
          licenseApproved: false,
          isActive: false,
          metadata: source.metadata,
        },
        update: {
          displayName: source.displayName,
          tier: source.tier,
          pollIntervalMs: source.pollIntervalMs,
          ttlSeconds: source.ttlSeconds,
          rateLimitRpm: source.rateLimitRpm,
          crawlDelayMs: source.crawlDelayMs,
          metadata: source.metadata,
        },
      });

      console.log(`  ✓ ${result.displayName} (${result.slug})`);
      console.log(`    Tier: ${result.tier} · License approved: ${result.licenseApproved} · Active: ${result.isActive}`);
      console.log(`    ID: ${result.id}`);
      console.log();
    } catch (err) {
      console.error(`  ✗ Failed to register ${source.slug}:`, err.message);
    }
  }

  console.log("Done. To approve a source:");
  console.log('  curl -X POST /api/cockpit/sources \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"action":"approve","slug":"the-odds-api"}\'');
  console.log();
  console.log("IMPORTANT: licensing approval is gated — no source polls until approved.");
}

main()
  .catch((e) => {
    console.error("Source registration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
