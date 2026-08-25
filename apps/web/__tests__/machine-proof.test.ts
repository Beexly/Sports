/**
 * Machine-auditable Proof surface — /llms.txt + /api/proof/ledger.
 *
 * Pins the invariants that make this surface trustworthy:
 *   - It inherits the founder gate: unpublished by default, published-shape
 *     only when PUBLISH_LEDGER === "true", and even then it carries no
 *     fabricated numbers (seasons is empty until the chain has substantiated
 *     entries).
 *   - Both output formats (JSON + llms.txt) render from ONE snapshot, so they
 *     cannot drift.
 *   - Every verification link an agent needs is present and absolute.
 *
 * No DB, no auth, no HTTP server — the module is pure and the routes are thin.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildMachineProof, renderLlmsTxt } from "@/lib/proof/machine-proof";

const FIXED_NOW = new Date("2026-07-17T00:00:00.000Z");
const TEST_BASE = "https://www.galaxysportsedge.com";

describe("buildMachineProof — founder-gated honesty (inherited from loadLedgerView)", () => {
  const ORIGINAL = process.env["PUBLISH_LEDGER"];
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env["PUBLISH_LEDGER"];
    else process.env["PUBLISH_LEDGER"] = ORIGINAL;
  });

  it("is UNPUBLISHED by default (PUBLISH_LEDGER unset) and gives a reason", () => {
    delete process.env["PUBLISH_LEDGER"];
    const doc = buildMachineProof({ now: FIXED_NOW, siteUrl: TEST_BASE });
    expect(doc.ledger.published).toBe(false);
    if (!doc.ledger.published) {
      expect(doc.ledger.reason.length).toBeGreaterThan(0);
      expect(doc.ledger.reason).toMatch(/PUBLISH_LEDGER/);
    }
  });

  it("PUBLISH_LEDGER=true unlocks the published SHAPE but still carries zero fabricated seasons", () => {
    process.env["PUBLISH_LEDGER"] = "true";
    const doc = buildMachineProof({ now: FIXED_NOW, siteUrl: TEST_BASE });
    expect(doc.ledger.published).toBe(true);
    if (doc.ledger.published) {
      expect(doc.ledger.seasons).toEqual([]);
      expect(doc.ledger.calibration).toBeNull();
      expect(doc.ledger.significance).toBeNull();
    }
  });

  it("any non-exact value ('TRUE', '1', 'yes') stays unpublished — only the literal 'true' opens it", () => {
    for (const v of ["TRUE", "1", "yes", " true", "true "]) {
      process.env["PUBLISH_LEDGER"] = v;
      expect(buildMachineProof({ now: FIXED_NOW }).ledger.published).toBe(false);
    }
  });
});

describe("buildMachineProof — verification map", () => {
  it("exposes the receipt-verify, human-verify, record, and self links, all absolute", () => {
    const doc = buildMachineProof({ now: FIXED_NOW, siteUrl: TEST_BASE });
    const byRel = new Map(doc.verify.links.map((l) => [l.rel, l.url]));
    expect(byRel.get("receipt-verify")).toBe(`${TEST_BASE}/api/verify?hash=<64-hex-sha256>`);
    expect(byRel.get("human-verify")).toBe(`${TEST_BASE}/verify`);
    expect(byRel.get("record")).toBe(`${TEST_BASE}/proof`);
    expect(byRel.get("self")).toBe(`${TEST_BASE}/api/proof/ledger`);
    for (const link of doc.verify.links) expect(link.url).toMatch(/^https?:\/\//);
    expect(doc.verify.method.length).toBeGreaterThan(0);
  });

  it("strips a trailing slash on the injected base so URLs never double up", () => {
    const doc = buildMachineProof({ now: FIXED_NOW, siteUrl: `${TEST_BASE}/` });
    for (const link of [...doc.verify.links, ...doc.references]) {
      expect(link.url).not.toMatch(/([^:])\/\//);
    }
  });

  it("references methodology, data-rights, and responsible-play surfaces", () => {
    const doc = buildMachineProof({ now: FIXED_NOW, siteUrl: TEST_BASE });
    const rels = new Set(doc.references.map((r) => r.rel));
    expect(rels.has("methodology")).toBe(true);
    expect(rels.has("data-rights")).toBe(true);
    expect(rels.has("responsible-play")).toBe(true);
  });

  it("uses the injected clock verbatim (deterministic)", () => {
    const doc = buildMachineProof({ now: FIXED_NOW });
    expect(doc.generatedAt).toBe("2026-07-17T00:00:00.000Z");
  });

  it("states hard refusals, including the pre-kickoff seal and no-fabrication rules", () => {
    const doc = buildMachineProof({ now: FIXED_NOW });
    const joined = doc.neverDoes.join(" ").toLowerCase();
    expect(joined).toMatch(/fabricat/);
    expect(joined).toMatch(/seal|kickoff/);
    expect(doc.doctrine.length).toBeGreaterThanOrEqual(3);
  });
});

describe("renderLlmsTxt — llmstxt.org format + honesty", () => {
  const ORIGINAL = process.env["PUBLISH_LEDGER"];
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env["PUBLISH_LEDGER"];
    else process.env["PUBLISH_LEDGER"] = ORIGINAL;
  });

  it("opens with an H1 title and a blockquote summary", () => {
    const txt = renderLlmsTxt(buildMachineProof({ now: FIXED_NOW, siteUrl: TEST_BASE }));
    const lines = txt.split("\n");
    expect(lines[0]).toBe("# Galaxy Sports Edge — Proof API");
    expect(txt).toMatch(/\n> .+/);
  });

  it("carries every section and the absolute verify URLs", () => {
    const txt = renderLlmsTxt(buildMachineProof({ now: FIXED_NOW, siteUrl: TEST_BASE }));
    expect(txt).toContain("## Record doctrine");
    expect(txt).toContain("## Current published state");
    expect(txt).toContain("## Verify our record yourself");
    expect(txt).toContain("## Methodology & data rights");
    expect(txt).toContain("## What this service will never do");
    expect(txt).toContain(`${TEST_BASE}/api/verify?hash=`);
    expect(txt).toContain(`${TEST_BASE}/api/proof/ledger`);
  });

  it("says publication is OFF (honestly) when unpublished, and never invents a record", () => {
    delete process.env["PUBLISH_LEDGER"];
    const txt = renderLlmsTxt(buildMachineProof({ now: FIXED_NOW, siteUrl: TEST_BASE }));
    expect(txt).toMatch(/Publication is OFF/);
    // No fabricated "NN% win rate / record" line may appear in the unpublished doc.
    expect(txt).not.toMatch(/\d+(\.\d+)?%\s*(win|ats|record|roi)/i);
  });

  it("reports the substantiated-season count (0) when publication is ON", () => {
    process.env["PUBLISH_LEDGER"] = "true";
    const txt = renderLlmsTxt(buildMachineProof({ now: FIXED_NOW, siteUrl: TEST_BASE }));
    expect(txt).toMatch(/Publication is ON\. Substantiated seasons: 0/);
  });

  // S8 — llms.txt `## Optional` section (llmstxt.org convention).
  it("carries a ## Optional section as the LAST section, before the Generated stamp", () => {
    const doc = buildMachineProof({ now: FIXED_NOW, siteUrl: TEST_BASE });
    const txt = renderLlmsTxt(doc);
    expect(doc.optional.length).toBeGreaterThan(0);
    expect(txt).toContain("## Optional");

    const optionalIdx = txt.indexOf("## Optional");
    const neverDoesIdx = txt.indexOf("## What this service will never do");
    const generatedIdx = txt.indexOf("Generated:");
    expect(neverDoesIdx).toBeGreaterThan(-1);
    expect(optionalIdx).toBeGreaterThan(neverDoesIdx);
    expect(generatedIdx).toBeGreaterThan(optionalIdx);
  });

  it("every Optional link is absolute under the injected base URL", () => {
    const doc = buildMachineProof({ now: FIXED_NOW, siteUrl: TEST_BASE });
    for (const link of doc.optional) {
      expect(link.url.startsWith(TEST_BASE)).toBe(true);
    }
  });

  it("Optional section does not drift from the Proof API JSON — same snapshot, two renderings", () => {
    const doc = buildMachineProof({ now: FIXED_NOW, siteUrl: TEST_BASE });
    const txt = renderLlmsTxt(doc);
    for (const link of doc.optional) {
      expect(txt).toContain(link.url);
    }
  });
});

describe("route handlers", () => {
  const ORIGINAL = process.env["PUBLISH_LEDGER"];
  beforeEach(() => {
    delete process.env["PUBLISH_LEDGER"];
  });
  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env["PUBLISH_LEDGER"];
    else process.env["PUBLISH_LEDGER"] = ORIGINAL;
  });

  it("GET /llms.txt → 200 text/plain, agent manifest", async () => {
    const { GET } = await import("@/app/llms.txt/route");
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);
    const body = await res.text();
    expect(body.startsWith("# Galaxy Sports Edge")).toBe(true);
    expect(body).toContain("## Verify our record yourself");
  });

  it("GET /api/proof/ledger → 200 JSON, unpublished-but-honest by default", async () => {
    const { GET } = await import("@/app/api/proof/ledger/route");
    const res = GET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      service: string;
      ledger: { published: boolean };
      verify: { links: { rel: string }[] };
    };
    expect(body.service).toMatch(/Galaxy Sports Edge/);
    expect(body.ledger.published).toBe(false);
    expect(body.verify.links.some((l) => l.rel === "receipt-verify")).toBe(true);
  });
});
