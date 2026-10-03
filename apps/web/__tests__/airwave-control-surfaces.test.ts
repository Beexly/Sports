import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");

function read(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("Airwave control surfaces", () => {
  const cockpit = read("app/cockpit/airwave/page.tsx");
  const publicPage = read("app/airwave/page.tsx");
  const control = read("lib/airwave/control-plane.ts");
  const example = read("../../.env.example");

  it("renders a control-room cockpit page instead of a demo-only queue", () => {
    expect(cockpit).toMatch(/Airwave Control Room/);
    expect(cockpit).toMatch(/readAirwaveControlPlane/);
    expect(cockpit).toMatch(/readAirwaveIntakeReadiness/);
    expect(cockpit).toMatch(/Transcript intake validator/);
    expect(cockpit).toMatch(/Spreadsheet contract/);
    expect(cockpit).toMatch(/Do-not-automate boundary/);
    expect(cockpit).toMatch(/href="\/api\/airwave\/readiness"/);
    expect(cockpit).toMatch(/href="\/api\/airwave\/intake-readiness"/);
  });

  it("keeps the public Airwave page honest about live ingestion state", () => {
    expect(publicPage).toMatch(/readAirwaveControlPlane/);
    expect(publicPage).toMatch(/readAirwaveIntakeReadiness/);
    expect(publicPage).toMatch(/Ingestion status/);
    expect(publicPage).toMatch(/Transcript intake proof/);
    expect(publicPage).toMatch(/pretending the media engine is already running/);
    expect(publicPage).toMatch(/href="\/api\/airwave\/readiness"/);
    expect(publicPage).toMatch(/href="\/api\/airwave\/intake-readiness"/);
  });

  it("models transcript, public feed, beat, and studio lanes with policy holds", () => {
    expect(control).toMatch(/transcript-spreadsheet/);
    expect(control).toMatch(/public-youtube/);
    expect(control).toMatch(/podcast-rss/);
    expect(control).toMatch(/siriusxm-context/);
    expect(control).toMatch(/beat-reporter-mesh/);
    expect(control).toMatch(/studio-handoff/);
    expect(control).toMatch(/archivesRawAudio: false/);
    expect(control).toMatch(/autoPublishes: false/);
    expect(control).toMatch(/storesVerbatimQuotes: false/);
  });

  it("documents every new Airwave gate in .env.example", () => {
    for (const key of [
      "AIRWAVE_ENABLED",
      "AIRWAVE_SIRIUSXM_LEGAL_ACK",
      "AIRWAVE_TRANSCRIPT_IMPORT_ENABLED",
      "AIRWAVE_TRANSCRIPT_SHEET_ID",
      "AIRWAVE_TRANSCRIPT_WORKSHEET_NAME",
      "AIRWAVE_TRANSCRIPT_FILE_PATH",
      "AIRWAVE_YOUTUBE_FEEDS_ENABLED",
      "AIRWAVE_PODCAST_RSS_ENABLED",
      "AIRWAVE_BEAT_REPORTS_ENABLED",
      "AIRWAVE_STUDIO_HANDOFF_ENABLED",
    ]) {
      expect(example).toContain(`${key}=`);
    }
  });
});
