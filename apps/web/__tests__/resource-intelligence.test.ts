import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  splitNames,
  classifyEntry,
  normalizeName,
  stableId,
  buildLedger,
  implementNowQueue,
  ownerReviewQueue,
  quarantineQueue,
  findGatedLeaks,
  buildCockpitSummary,
  IMPLEMENTABLE_DISPOSITIONS,
  type RawResourceEntry,
} from "@/lib/resource-intelligence";

const REPO_ROOT = resolve(__dirname, "../../..");
const DUMP_PATH = resolve(REPO_ROOT, "handoff/incoming/garrett-resource-dump-2026-06-15.md");
const DUMP_SHA = "957f68dec09222d9c636dae64b0eaaa4f1c09732048a47189fdd24908f0cb3c4";

function entry(partial: Partial<RawResourceEntry> & { name: string }): RawResourceEntry {
  return {
    rawLine: partial.rawLine ?? `${partial.name} - x`,
    lineNumber: partial.lineNumber ?? 1,
    sourceFile: partial.sourceFile ?? "test",
    section: partial.section ?? "(none)",
    name: partial.name,
    description: partial.description ?? "",
  };
}

describe("resource-intelligence: normalize + id", () => {
  it("produces stable, deterministic ids", () => {
    expect(stableId("PlayWright")).toBe("res_playwright");
    expect(stableId("Can I Use?")).toBe("res_can-i-use");
    expect(stableId("PlayWright")).toBe(stableId("playwright"));
    expect(normalizeName("DBeaver")).toBe("dbeaver");
  });

  it("splits multi-name segments and drops alias fragments", () => {
    expect(splitNames("Wox, Listary or Raycast")).toEqual(["Wox", "Listary", "Raycast"]);
    // bare numeric alias fragments ("Tool / 2 / 3") are dropped
    expect(splitNames("Windhawk / 2 / 3")).toEqual(["Windhawk"]);
  });
});

describe("resource-intelligence: classifier dispositions", () => {
  it("QUARANTINES piracy + evasion (terminal)", () => {
    const cases: { name: string; section?: string; description?: string }[] = [
      { name: "1337x Movies", section: "General Torrent Sites" },
      { name: "LimeTorrents", description: "Movies / TV" },
      { name: "SomeIPTV", description: "live tv" },
      { name: "4chan Captcha Solver", description: "Auto Captcha Solvers" },
      { name: "3DS Jailbreak Guide" },
      { name: "Abandonware DOS", section: "Abandonware / Retro" },
      { name: "Paywall Remover", description: "bypass paywall" },
      { name: "KMSPico", description: "windows activation" },
      { name: "Nintendo ROMs Site", section: "Nintendo ROMs" },
    ];
    for (const c of cases) {
      const got = classifyEntry(entry(c));
      expect(got.disposition, `${c.name} should be quarantined`).toBe("quarantine");
      expect(got.riskTier).toBe("blocked");
    }
  });

  it("routes sports-data / scraping / ingestion to OWNER_REVIEW", () => {
    const cases = [
      { name: "80legs", section: "Web Scraping / Crawling", description: "Cloud-Based" },
      { name: "SomeRSSReader", description: "RSS feed aggregator" },
      { name: "SportsFeedX", description: "NFL odds and scores api" },
      { name: "PodFetcher", description: "podcast index" },
    ];
    for (const c of cases) {
      expect(classifyEntry(entry(c)).disposition, c.name).toBe("owner_review");
    }
  });

  it("approves the curated allowlist directly", () => {
    expect(classifyEntry(entry({ name: "PlayWright", description: "Browser Automation" })).disposition).toBe("approved_direct");
    expect(classifyEntry(entry({ name: "Grafana" })).disposition).toBe("approved_direct");
  });

  it("approves safe operational tooling by category (not just the allowlist)", () => {
    // A generic tool we run ourselves, no rights risk → approved-direct.
    expect(classifyEntry(entry({ name: "SomeRandoLinter", description: "code linting test tool" })).disposition).toBe("approved_direct");
    expect(classifyEntry(entry({ name: "AcmeVulnScanner", description: "security vulnerability scanner" })).disposition).toBe("approved_direct");
    // …but a data source in a safe-sounding sentence is still gated to owner_review first.
    expect(classifyEntry(entry({ name: "AcmeScoresApi", description: "nfl scores api feed" })).disposition).toBe("owner_review");
  });

  it("rejects noise", () => {
    expect(classifyEntry(entry({ name: "the" })).disposition).toBe("rejected_noise");
  });
});

describe("resource-intelligence: full-dump ledger (verified source)", () => {
  const present = existsSync(DUMP_PATH);
  const raw = present ? readFileSync(DUMP_PATH, "utf8") : "";

  it("dump is present and matches the verified SHA-256", () => {
    expect(present, "verified dump must be committed").toBe(true);
    // Hash the LF-normalised bytes so the pin is stable across platforms. git
    // checks the file out with CRLF on Windows (core.autocrlf) but LF on Linux/CI,
    // and DUMP_SHA is the LF hash. Normalising here verifies the exact same
    // content on every machine instead of failing on Windows line endings.
    const lf = readFileSync(DUMP_PATH, "utf8").replace(/\r\n/g, "\n");
    const sha = createHash("sha256").update(lf, "utf8").digest("hex");
    expect(sha).toBe(DUMP_SHA);
  });

  it("builds a ledger whose counts sum to the unique resource total", () => {
    const ledger = buildLedger(raw, { sourceFile: "dump", sourceSha256: DUMP_SHA });
    const sum = Object.values(ledger.counts).reduce((a, b) => a + b, 0);
    expect(sum).toBe(ledger.uniqueResourceCount);
    expect(ledger.uniqueResourceCount).toBeGreaterThan(1000);
    expect(ledger.counts.quarantine).toBeGreaterThan(0);
    expect(ledger.counts.owner_review).toBeGreaterThan(0);
    // Broadened approvals: safe operational tooling is approved at scale, not 15.
    expect(ledger.counts.approved_direct).toBeGreaterThan(500);
  });

  it("INVARIANT: no gated resource leaks into implement-now", () => {
    const ledger = buildLedger(raw, { sourceFile: "dump", sourceSha256: DUMP_SHA });
    expect(findGatedLeaks(ledger)).toEqual([]);
    for (const r of implementNowQueue(ledger)) {
      expect(IMPLEMENTABLE_DISPOSITIONS).toContain(r.disposition);
    }
  });

  it("INVARIANT: obvious piracy substrings never appear in a safe bucket", () => {
    const ledger = buildLedger(raw, { sourceFile: "dump", sourceSha256: DUMP_SHA });
    const safe = new Set(["approved_direct", "approved_internal_reference", "prototype", "roadmap"]);
    const piracy = /(torrent|iptv|keygen|warez|putlocker|soap2day|fmovies)/i;
    const leaks = ledger.resources.filter(
      (r) => safe.has(r.disposition) && piracy.test(`${r.name} ${r.description} ${r.section}`),
    );
    expect(leaks.map((r) => r.id)).toEqual([]);
  });

  it("owner-review + quarantine queues are non-empty and disjoint from implement-now", () => {
    const ledger = buildLedger(raw, { sourceFile: "dump", sourceSha256: DUMP_SHA });
    const implIds = new Set(implementNowQueue(ledger).map((r) => r.id));
    for (const r of ownerReviewQueue(ledger)) expect(implIds.has(r.id)).toBe(false);
    for (const r of quarantineQueue(ledger)) expect(implIds.has(r.id)).toBe(false);
    expect(quarantineQueue(ledger).length).toBeGreaterThan(0);
  });

  it("cockpit summary only surfaces safe items and gates the rest as counts", () => {
    const ledger = buildLedger(raw, { sourceFile: "dump", sourceSha256: DUMP_SHA });
    const summary = buildCockpitSummary(ledger, 25);
    expect(summary.topSafe.length).toBeLessThanOrEqual(25);
    for (const item of summary.topSafe) {
      expect(["approved_direct", "prototype"]).toContain(item.disposition);
    }
    expect(summary.ownerReview).toBe(ledger.counts.owner_review);
    expect(summary.quarantine).toBe(ledger.counts.quarantine);
  });
});
