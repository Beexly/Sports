/**
 * gen-case-study-stub.ts — draft a case-study stub from real usage data.
 *
 * HONEST LIMITATION: there is no live provider API wiring in this
 * environment (no real AWS/GCP/Stripe/etc. credentials exist here). This
 * script only ever operates on a usage-events JSON file explicitly passed on
 * the command line — it never calls a provider API.
 *
 * RUN:
 *   npx tsx scripts/devrel/gen-case-study-stub.ts <usage-events.json> <platform>
 *
 * Where <usage-events.json> is an array of `PlatformUsageEvent` (see
 * apps/web/lib/platform/usage-meter.ts) and <platform> is one of that type's
 * `provider` values.
 *
 * Idempotent-ish: overwrites docs/devrel/case-studies/draft-{platform}.md
 * cleanly on every run rather than appending.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { usageSummary, type PlatformUsageEvent } from "../../apps/web/lib/platform/usage-meter";

const TEMPLATE_PATH = join(__dirname, "..", "..", "docs", "devrel", "CASE_STUDY_TEMPLATE.md");
// CASE_STUDY_OUTPUT_DIR is a test-only override so end-to-end tests don't
// write into the real docs/ tree; real invocations always use the default.
const OUTPUT_DIR =
  process.env.CASE_STUDY_OUTPUT_DIR ?? join(__dirname, "..", "..", "docs", "devrel", "case-studies");

/** Loads and JSON-parses the usage events fixture file (no network I/O). */
export function loadUsageEvents(path: string): PlatformUsageEvent[] {
  const raw = JSON.parse(readFileSync(path, "utf8")) as Array<
    Omit<PlatformUsageEvent, "at"> & { at: string }
  >;
  return raw.map((e) => ({ ...e, at: new Date(e.at) }));
}

/**
 * Renders the case-study draft: substitutes {PLATFORM}, and replaces the
 * Metrics section body with the real computed `usageSummary()` numbers.
 * Problem / Architecture / Quote sections are left as template placeholders
 * for a human author to fill in.
 */
export function renderDraft(
  templateText: string,
  platform: PlatformUsageEvent["provider"],
  summary: ReturnType<typeof usageSummary>,
): string {
  const withPlatform = templateText.replace(/\{PLATFORM\}/g, platform);

  const metricsBlock = [
    "## Metrics (refuse rate, cost saved, verify checks)",
    "",
    "Computed from `usageSummary()` (`apps/web/lib/platform/usage-meter.ts`)" +
      ` over the supplied usage-events fixture, for provider \`${summary.provider}\`:`,
    "",
    `- **Usage quantity**: ${summary.quantity} (source: usageSummary().quantity)`,
    `- **Estimated cost proxy**: $${summary.estUsd.toFixed(2)} — this is a caller-supplied` +
      " proxy (unitCostProxyUsd), NOT verified billing data. Do not present as an invoice figure." +
      " (source: usageSummary().estUsd)",
    "- **Refuse rate**: TBD — pending real receipt/decision-log source (not computed by this script).",
    "- **Receipts signed / verified**: TBD — pending real receipt telemetry source (not computed by this script).",
    "",
  ].join("\n");

  const sectionHeaderRegex = /## Metrics \(refuse rate, cost saved, verify checks\)[\s\S]*?(?=\n## )/;
  return withPlatform.replace(sectionHeaderRegex, metricsBlock + "\n");
}

export function draftOutputPath(outputDir: string, platform: string): string {
  return join(outputDir, `draft-${platform}.md`);
}

function main(): void {
  const [, , usageEventsPath, platformArg] = process.argv;
  if (!usageEventsPath || !platformArg) {
    // eslint-disable-next-line no-console
    console.error(
      "Usage: npx tsx scripts/devrel/gen-case-study-stub.ts <usage-events.json> <platform>",
    );
    process.exit(1);
  }
  const platform = platformArg as PlatformUsageEvent["provider"];

  const events = loadUsageEvents(usageEventsPath);
  const summary = usageSummary(events, platform);

  const templateText = readFileSync(TEMPLATE_PATH, "utf8");
  const draft = renderDraft(templateText, platform, summary);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = draftOutputPath(OUTPUT_DIR, platform);
  writeFileSync(outPath, draft, "utf8");

  // eslint-disable-next-line no-console
  console.log(`Wrote ${outPath}`);
}

if (require.main === module) {
  main();
}
