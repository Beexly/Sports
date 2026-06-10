import { describe, it, expect, vi, afterEach } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as joinPath, resolve } from "node:path";
import { getBannedClaims, scanForBannedPhrases } from "@/lib/trust-claims";
import {
  BANNED_PHRASES_MIRROR,
  buildEpisodeScript,
  scanScriptForBannedPhrases,
} from "../../../scripts/podcast/generate-episode-script.mjs";
import {
  loadConsentRecord,
  scriptToSpokenText,
} from "../../../scripts/podcast/render-episode.mjs";
import {
  loadPodcastManifest,
  publishableEpisodes,
} from "@/lib/podcast/manifest";

/**
 * POD-01 — weekly podcast pipeline guards.
 *
 * The pipeline's one automated step (the script generator) must be DRAFT-only
 * and banned-phrase-clean; the public surfaces must be hard-gated OFF by
 * default; and the generator's mirrored banned list must stay in lockstep
 * with lib/trust-claims (two-way parity).
 */

const liveWeek = {
  dataStatus: "live" as const,
  dbErrorMessage: null,
  gatedCount: 4,
  calibration: { sampleSize: 12, ready: false },
  picks: [
    { selection: "SEA -1.5", result: "WIN", reasoningShort: "Line movement confirmed the side." },
    { selection: "DEN +3.5", result: "LOSS", reasoningShort: "Late injury broke the setup." },
    { selection: "OVER 44.5", result: "PUSH", reasoningShort: null },
  ],
};

describe("banned-phrase mirror parity (generator <-> trust-claims)", () => {
  it("every mirrored phrase is a real banned claim (mirror ⊆ lib)", () => {
    const real = new Set(getBannedClaims().map((c) => c.copy.toLowerCase()));
    for (const phrase of BANNED_PHRASES_MIRROR) {
      expect(real.has(phrase.toLowerCase()), `mirror phrase not in lib: ${phrase}`).toBe(true);
    }
  });

  it("every lib banned claim is mirrored (lib ⊆ mirror) — update the .mjs if this fails", () => {
    const mirror = new Set(BANNED_PHRASES_MIRROR.map((p) => p.toLowerCase()));
    for (const claim of getBannedClaims()) {
      expect(mirror.has(claim.copy.toLowerCase()), `lib phrase not mirrored: ${claim.copy}`).toBe(true);
    }
  });

  it("the mirrored scanner flags what the real scanner flags", () => {
    const probe = "This pick is guaranteed.\nA verified track record you can trust.";
    const mirrorHits = scanScriptForBannedPhrases(probe).map((h) => h.phrase).sort();
    const realHits = scanForBannedPhrases(probe).map((h) => h.phrase).sort();
    expect(mirrorHits).toEqual(realHits);
  });
});

describe("buildEpisodeScript", () => {
  it("always opens with the DRAFT — NOT FOR AIR header", () => {
    for (const week of [liveWeek, { ...liveWeek, dataStatus: "stub" as const, picks: [] }]) {
      const { markdown } = buildEpisodeScript(week, new Date("2026-06-10T12:00:00Z"));
      expect(markdown).toContain("STATUS: DRAFT — NOT FOR AIR");
      expect(markdown).toContain("publishes by hand");
    }
  });

  it("is banned-phrase-clean against the REAL trust-claims scanner", () => {
    const { markdown, hits } = buildEpisodeScript(liveWeek, new Date("2026-06-10T12:00:00Z"));
    expect(hits).toEqual([]);
    expect(scanForBannedPhrases(markdown)).toEqual([]);
  });

  it("gives losses the same spotlight as wins (losses listed, ordered first)", () => {
    const { markdown } = buildEpisodeScript(liveWeek, new Date("2026-06-10T12:00:00Z"));
    expect(markdown).toContain("DEN +3.5 — a loss.");
    expect(markdown.indexOf("DEN +3.5")).toBeLessThan(markdown.indexOf("SEA -1.5"));
  });

  it("never claims a rate before the 150-pick gate — counts toward it instead", () => {
    const { markdown } = buildEpisodeScript(liveWeek, new Date("2026-06-10T12:00:00Z"));
    expect(markdown).toContain("12 graded picks");
    expect(markdown).toContain("toward the 150");
    expect(markdown).not.toMatch(/\d+(\.\d+)?%\s*(win|hit)/i);
  });

  it("renders honest empty-week and unreachable-db drafts", () => {
    const stub = buildEpisodeScript(
      { dataStatus: "stub", picks: [], gatedCount: null, calibration: null, dbErrorMessage: null },
      new Date("2026-06-10T12:00:00Z")
    );
    expect(stub.markdown).toContain("No database configured");

    const down = buildEpisodeScript(
      { dataStatus: "unreachable", picks: [], gatedCount: null, calibration: null, dbErrorMessage: "ECONNREFUSED" },
      new Date("2026-06-10T12:00:00Z")
    );
    expect(down.markdown).toContain("refuses to invent a week");
    expect(down.markdown).toContain("ECONNREFUSED");
  });
});

describe("packet spec upgrades (GSN_PODCAST_AND_VOICE_SYSTEM.md)", () => {
  it("every airable draft carries the required AI-voice disclosure verbatim", () => {
    const { markdown } = buildEpisodeScript(liveWeek, new Date("2026-06-10T12:00:00Z"));
    expect(markdown).toContain(
      "This episode uses an AI-generated version of Garrett Baxley's voice"
    );
    expect(markdown).toContain("human-approved GSN script");
  });

  it("consent record gate: active record loads; missing/revoked/out-of-scope refuse", () => {
    const dir = mkdtempSync(joinPath(tmpdir(), "gse-consent-"));
    const good = joinPath(dir, "good.json");
    writeFileSync(
      good,
      JSON.stringify({
        speakerName: "Garrett Baxley",
        consentScope: "gsn_podcast_only",
        consentText: "I consent.",
        approvedVoiceModel: "neuphonic/neutts-air",
        disclosureRequired: true,
        createdAt: "2026-06-10T00:00:00Z",
      }),
      "utf8"
    );
    expect(loadConsentRecord(good)?.speakerName).toBe("Garrett Baxley");

    const revoked = joinPath(dir, "revoked.json");
    writeFileSync(
      revoked,
      JSON.stringify({
        speakerName: "Garrett Baxley",
        consentScope: "gsn_podcast_only",
        consentText: "I consent.",
        revokedAt: "2026-06-11T00:00:00Z",
      }),
      "utf8"
    );
    expect(loadConsentRecord(revoked)).toBeNull();

    const wrongScope = joinPath(dir, "scope.json");
    writeFileSync(
      wrongScope,
      JSON.stringify({ speakerName: "x", consentScope: "everything", consentText: "y" }),
      "utf8"
    );
    expect(loadConsentRecord(wrongScope)).toBeNull();
    expect(loadConsentRecord(undefined)).toBeNull();
    expect(loadConsentRecord(joinPath(dir, "missing.json"))).toBeNull();
  });
});

describe("scriptToSpokenText (render-episode)", () => {
  it("strips frontmatter, headings, and list markers down to speech", () => {
    const md = "---\nSTATUS: DRAFT\n---\n\n# Title\n\n## Section\n\nFirst sentence.\n\n- A call — a win.\n";
    expect(scriptToSpokenText(md)).toBe("First sentence. A call — a win.");
  });
});

describe("podcast public surfaces — gated OFF by default", () => {
  afterEach(() => {
    delete process.env["PODCAST_ENABLED"];
    vi.resetModules();
  });

  it("rss.xml returns 404 with the flag unset", async () => {
    vi.resetModules();
    const route = await import("@/app/podcast/rss.xml/route");
    const res = await route.GET();
    expect(res.status).toBe(404);
  });

  it("rss.xml returns valid RSS with the flag on (empty manifest = empty channel, no fabricated items)", async () => {
    process.env["PODCAST_ENABLED"] = "true";
    vi.resetModules();
    const route = await import("@/app/podcast/rss.xml/route");
    const res = await route.GET();
    expect(res.status).toBe(200);
    const xml = await res.text();
    expect(xml).toContain("<rss version=\"2.0\"");
    expect(xml).toContain("Garrett Baxley");
    expect(xml).not.toContain("<item>"); // manifest ships empty — nothing invented
  });

  it("the page is gated: notFound() before render + robots noindex (source-pinned)", () => {
    // Importing the page at runtime drags Nav -> next-auth into vitest, which
    // can't resolve next/server here — so the gate is pinned at source level,
    // the repo's established pattern for page-gating tests.
    const src = readFileSync(
      resolve(__dirname, "../app/podcast/page.tsx"),
      "utf8"
    );
    expect(src).toMatch(/if\s*\(!isPodcastEnabled\(\)\)\s*notFound\(\)/);
    expect(src).toMatch(/robots:\s*\{\s*index:\s*false\s*\}/);
    // The gate must run before any episode data is loaded.
    expect(src.indexOf("notFound()")).toBeLessThan(src.indexOf("loadPodcastManifest("));
  });

  it("manifest loader degrades to an empty show and filters incomplete entries", () => {
    const manifest = loadPodcastManifest();
    expect(Array.isArray(manifest.episodes)).toBe(true);
    expect(
      publishableEpisodes({ episodes: [{ title: "x", description: "", date: "", audioUrl: "" }] })
    ).toEqual([]);
  });
});
