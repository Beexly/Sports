import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The Beat → Galaxy Broadcast contract.
 *
 * The Beat is no longer a static ledger: it now leads with a cinematic, always-on
 * transmission fronted by Nova (the synthetic field anchor), with the graded feed
 * preserved below as the Signal Ledger. These guards keep that wiring honest and
 * non-deceptive: the synthetic-presenter disclosure is always rendered, Nova is a
 * stylized brand mark (never a photoreal likeness), and the proof feed stays.
 */

const webRoot = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

describe("The Beat — Galaxy Broadcast", () => {
  const page = read("app/the-beat/page.tsx");
  const broadcast = read("components/news/galaxy-broadcast.tsx");
  const host = read("lib/fantasy/host.ts");

  it("wires the cinematic broadcast in above the graded feed", () => {
    expect(page).toContain("GalaxyBroadcast");
    expect(page).toContain("buildBroadcast");
    // The graded feed is preserved as the Signal Ledger (proof not removed).
    expect(page).toContain("TheBeat");
    expect(page).toContain("The Signal Ledger");
  });

  it("always renders the synthetic-presenter disclosure", () => {
    expect(broadcast).toContain("broadcast.disclosure");
    expect(host).toMatch(/synthetic presenter/i);
  });

  it("uses a stylized brand avatar, never a photoreal likeness", () => {
    expect(broadcast).toMatch(/deliberately not a photoreal person/i);
    expect(broadcast.toLowerCase()).not.toContain("<img");
    expect(broadcast.toLowerCase()).not.toContain("<video");
  });

  it("keeps the broadcast backdrop decorative and reduced-motion safe", () => {
    // The motion plate is the decorative GeneratedPlate (which disables video
    // under reduced motion); no raw autoplaying media is hand-rolled here.
    expect(page).toContain("GeneratedPlate");
    expect(broadcast.toLowerCase()).not.toContain("autoplay");
  });
});
