#!/usr/bin/env node
/**
 * generate-report.mjs — 14-day customer-proof report generator.
 *
 * Reads REAL data when DATABASE_URL is set:
 *   - Newsletter subscriber count (NewsletterSubscriber table)
 *   - Ask Galaxy submission count + by classification (AskGalaxySubmission table)
 *   - Active Stripe subscription count + MRR (when STRIPE_SECRET_KEY is set)
 *
 * Writes reports/customer-proof/latest-proof.md.
 *
 * HONESTY RULES (non-negotiable):
 *   - NEVER fabricates metrics. Zeros / unknowns only — no invented numbers.
 *   - When DATABASE_URL is absent → writes an honest "no data — not started" report, exits 0.
 *   - When DB is unreachable → writes a clear error report, exits 0.
 *   - Reports env presence only (never key values).
 *   - Stripe read is READ-ONLY; no mutations.
 *
 * Pattern mirrors scripts/reality/diagnostics.mjs: graceful exit 0 on no DB.
 *
 * How to run:
 *   npm run customer-proof:report
 *   node scripts/customer-proof/generate-report.mjs  (graceful no-DB path works under bare node)
 */

import process from "node:process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUTPUT_PATH = resolve(ROOT, "reports/customer-proof/latest-proof.md");

const out = (s = "") => process.stdout.write(s + "\n");

// ── Stripe read (READ-ONLY, never-throw) ──────────────────────────────────────

/**
 * Attempt a read-only Stripe active-subscription count and derive MRR.
 * Returns null on any error (absent key, network failure, etc.) — honest unknown.
 */
async function readStripeData() {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (typeof key !== "string" || key.trim().length === 0) {
    return null;
  }

  let Stripe;
  try {
    ({ default: Stripe } = await import("stripe"));
  } catch {
    out("stripe package not available — Stripe metrics will be unknown.");
    return null;
  }

  try {
    const client = new Stripe(key, {
      apiVersion: "2024-06-20",
      typescript: false,
      timeout: 8000,
    });

    let count = 0;
    let mrrCents = 0;
    let hasMore = true;
    let startingAfter = undefined;
    const PAGE_LIMIT = 10;
    const MAX_PAGES = 100;
    let page = 0;

    while (hasMore && page < MAX_PAGES) {
      const params = {
        status: "active",
        limit: PAGE_LIMIT,
        expand: ["data.items.data.price"],
      };
      if (startingAfter) params.starting_after = startingAfter;

      const list = await client.subscriptions.list(params);
      count += list.data.length;

      for (const sub of list.data) {
        for (const item of sub.items.data) {
          const price = item.price;
          if (!price?.unit_amount) continue;
          if (price.recurring?.interval === "month") {
            mrrCents += price.unit_amount * (item.quantity ?? 1);
          } else if (price.recurring?.interval === "year") {
            mrrCents += Math.round((price.unit_amount * (item.quantity ?? 1)) / 12);
          }
        }
      }

      hasMore = list.has_more;
      if (hasMore && list.data.length > 0) {
        startingAfter = list.data[list.data.length - 1].id;
      }
      page++;
    }

    return { count, mrrUsd: mrrCents / 100 };
  } catch {
    return null;
  }
}

// ── DB reads (READ-ONLY, never-throw) ────────────────────────────────────────

/**
 * Read newsletter subscriber count via pg.
 * Returns null on any error.
 */
async function readNewsletterCount(client) {
  try {
    const result = await client.query(
      `SELECT COUNT(*) AS n FROM "NewsletterSubscriber"`,
    );
    const n = parseInt(result.rows[0]?.n ?? "0", 10);
    return isNaN(n) ? null : n;
  } catch {
    // Table may not exist yet — honest null.
    return null;
  }
}

/**
 * Read Ask Galaxy submission count + counts by classification.
 * Returns null on any error.
 */
async function readAskGalaxyData(client) {
  try {
    // Total
    const totalRes = await client.query(
      `SELECT COUNT(*) AS n FROM "AskGalaxySubmission"`,
    );
    const total = parseInt(totalRes.rows[0]?.n ?? "0", 10);
    if (isNaN(total)) return null;

    // By classification
    const byClassRes = await client.query(
      `SELECT classification, COUNT(*) AS n
         FROM "AskGalaxySubmission"
        WHERE classification IS NOT NULL
        GROUP BY classification
        ORDER BY n DESC`,
    );

    const byClassification = byClassRes.rows.map((r) => ({
      classification: String(r.classification),
      count: parseInt(r.n, 10),
    }));

    return { total, byClassification };
  } catch {
    // Table may not exist yet — honest null.
    return null;
  }
}

// ── Report renderer ───────────────────────────────────────────────────────────

function renderReport({
  generatedAt,
  databaseAvailable,
  dbNote,
  newsletterSubscribers,
  askGalaxy,
  stripe,
}) {
  const L = [];
  const unknown = "unknown — not enough data yet";
  const num = (x) => (x == null ? unknown : x.toLocaleString("en-US"));
  const usd = (x) => (x == null ? unknown : `$${x.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`);

  L.push("# Customer Proof Report — 14-day market signal");
  L.push("");
  L.push(`_Generated: ${generatedAt}_`);
  L.push("");
  L.push(
    "INTERNAL — admin-only. Every figure is real data or an honest unknown. " +
      "NEVER fabricated. Zero means confirmed zero; unknown means not yet measurable.",
  );
  L.push("");

  // Data mode banner
  if (!databaseAvailable) {
    L.push("## Data status: NO DATABASE");
    L.push("");
    L.push(
      `> ${dbNote}`,
    );
    L.push("");
    L.push(
      "All metrics below are **unknown** — no data has been collected yet. " +
        "This is an honest starting point: the record is real and currently empty. " +
        "Set DATABASE_URL to start tracking real customer activity.",
    );
    L.push("");
  } else {
    L.push("## Data status: DATABASE CONNECTED");
    L.push("");
    if (dbNote) L.push(`> ${dbNote}`);
    L.push("");
  }

  // Newsletter
  L.push("## Newsletter subscribers");
  L.push("");
  if (newsletterSubscribers === null) {
    L.push(
      `- Count: **${unknown}** — the NewsletterSubscriber table may not exist yet, or the DB was unreachable.`,
    );
  } else {
    L.push(`- Count: **${num(newsletterSubscribers)}**`);
    if (newsletterSubscribers === 0) {
      L.push("  _(confirmed zero — real read, real empty)_");
    }
  }
  L.push("");

  // Ask Galaxy
  L.push("## Ask Galaxy submissions");
  L.push("");
  if (askGalaxy === null) {
    L.push(
      `- Total: **${unknown}** — the AskGalaxySubmission table may not exist yet, or the DB was unreachable.`,
    );
  } else {
    L.push(`- Total: **${num(askGalaxy.total)}**`);
    if (askGalaxy.total === 0) {
      L.push("  _(confirmed zero — real read, real empty)_");
    }
    if (askGalaxy.byClassification.length > 0) {
      L.push("");
      L.push("  By classification:");
      L.push("");
      L.push("  | Classification | Count |");
      L.push("  |---|---|");
      for (const row of askGalaxy.byClassification) {
        L.push(`  | ${row.classification} | ${row.count} |`);
      }
    }
  }
  L.push("");

  // Stripe / subscriptions
  L.push("## Subscriptions (Stripe)");
  L.push("");
  const stripeKeyPresent =
    typeof process.env["STRIPE_SECRET_KEY"] === "string" &&
    process.env["STRIPE_SECRET_KEY"].trim().length > 0;

  if (!stripeKeyPresent) {
    L.push(
      `- STRIPE_SECRET_KEY: **not set** — subscription metrics are unavailable until Stripe is configured.`,
    );
    L.push(`- Active subscriptions: **${unknown}**`);
    L.push(`- MRR: **${unknown}**`);
  } else if (stripe === null) {
    L.push(
      "- STRIPE_SECRET_KEY: present (not shown) — but Stripe read failed (network error, key mismatch, or rate-limit).",
    );
    L.push(`- Active subscriptions: **${unknown}**`);
    L.push(`- MRR: **${unknown}**`);
  } else {
    L.push("- STRIPE_SECRET_KEY: present (not shown)");
    L.push(`- Active subscriptions: **${num(stripe.count)}**`);
    L.push(`- MRR: **${usd(stripe.mrrUsd)}** (from real Stripe plan amounts)`);
    if (stripe.count === 0) {
      L.push("  _(confirmed zero — real Stripe read, zero active subscriptions)_");
    }
  }
  L.push("");

  // Standing caveats
  L.push("## Standing caveats");
  L.push("");
  L.push(
    "- This report is generated fresh each run — it is a point-in-time snapshot, not a historical trend.",
  );
  L.push(
    "- Zeros are honest: they mean the record is real and currently empty, not that data collection failed.",
  );
  L.push(
    "- Unknowns are honest: they mean the system could not measure the metric, not that the metric is zero.",
  );
  L.push(
    "- Win-rate and performance claims are not made here. The calibration floor must be met before any such claim is warranted.",
  );
  L.push(
    "- This surface is internal and admin-gated. Do not share raw metrics externally before the Go-Live checklist is fully green.",
  );
  L.push("");

  return L.join("\n");
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  out("");
  out("=== Customer Proof Report Generator ===");
  out("OFFLINE-SAFE. Reads real data if DATABASE_URL + STRIPE_SECRET_KEY are set.");
  out("Writes reports/customer-proof/latest-proof.md. Never fabricates.");
  out("");

  const generatedAt = new Date().toISOString();
  const dbUrl = process.env["DATABASE_URL"];
  const hasDbUrl = typeof dbUrl === "string" && dbUrl.trim().length > 0;

  // ── No DATABASE_URL: graceful no-data report ──────────────────────────────
  if (!hasDbUrl) {
    out("DATABASE_URL is not set — writing honest no-data report.");
    const md = renderReport({
      generatedAt,
      databaseAvailable: false,
      dbNote:
        "DATABASE_URL is not set. No customer data has been collected yet. " +
        "Set DATABASE_URL and re-run to see real metrics.",
      newsletterSubscribers: null,
      askGalaxy: null,
      stripe: null,
    });
    await mkdir(dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, md, "utf8");
    out(`Wrote no-data report → ${OUTPUT_PATH}`);
    out("");
    process.exit(0);
  }

  // ── DATABASE_URL set: attempt real reads ──────────────────────────────────
  let pg;
  try {
    pg = await import("pg");
  } catch {
    out("`pg` package not available — writing no-data report.");
    const md = renderReport({
      generatedAt,
      databaseAvailable: false,
      dbNote:
        "DATABASE_URL is set but the `pg` package is not available in this environment. " +
        "Run via `npm run customer-proof:report` which has `pg` available.",
      newsletterSubscribers: null,
      askGalaxy: null,
      stripe: null,
    });
    await mkdir(dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, md, "utf8");
    out(`Wrote no-data report → ${OUTPUT_PATH}`);
    out("");
    process.exit(0);
  }

  const client = new pg.default.Client({ connectionString: dbUrl });
  let dbConnected = false;
  let dbNote = null;

  try {
    await client.connect();
    dbConnected = true;
    out("Database connected.");
  } catch (err) {
    out(
      `Database unreachable: ${err instanceof Error ? err.message : String(err)}`,
    );
    dbNote =
      `DATABASE_URL is set but the database did not respond: ${err instanceof Error ? err.message : String(err)}. ` +
      "Metrics below are unknown for this run.";
  }

  let newsletterSubscribers = null;
  let askGalaxy = null;
  let stripe = null;

  if (dbConnected) {
    out("Reading newsletter subscribers...");
    newsletterSubscribers = await readNewsletterCount(client);
    out(
      `  Newsletter subscribers: ${newsletterSubscribers === null ? "unknown (table may not exist yet)" : newsletterSubscribers}`,
    );

    out("Reading Ask Galaxy submissions...");
    askGalaxy = await readAskGalaxyData(client);
    out(
      `  Ask Galaxy submissions: ${askGalaxy === null ? "unknown (table may not exist yet)" : askGalaxy.total}`,
    );

    try {
      await client.end();
    } catch {
      /* ignore */
    }
  }

  // Stripe read (independent of DB)
  out("Reading Stripe subscriptions...");
  stripe = await readStripeData();
  if (stripe === null) {
    out("  Stripe: unavailable (key absent or read failed).");
  } else {
    out(`  Stripe: ${stripe.count} active subscriptions, MRR $${stripe.mrrUsd.toFixed(2)}`);
  }

  const md = renderReport({
    generatedAt,
    databaseAvailable: dbConnected,
    dbNote,
    newsletterSubscribers,
    askGalaxy,
    stripe,
  });

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, md, "utf8");

  out(`Wrote customer-proof report → ${OUTPUT_PATH}`);
  out("");
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(
    `Unexpected error: ${err instanceof Error ? err.stack : String(err)}\n`,
  );
  process.exit(1);
});
