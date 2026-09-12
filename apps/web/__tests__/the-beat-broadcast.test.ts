import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The Beat → Galaxy Broadcast contract.
 *
 * The Beat is a full-bleed cinematic surface: a scored opening, an always-on
 * transmission fronted by Nova (the synthetic field anchor), and the graded
 * Signal Ledger below. These guards keep that wiring honest and non-deceptive:
 * the synthetic-presenter disclosure is always rendered, Nova is a stylized
 * brand mark (never a photoreal likeness), the proof feed stays, and the
 * robotic speech-synthesis Play control stays dead.
 */

const webRoot = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

describe("The Beat — Galaxy Broadcast", () => {
  const page = read("app/the-beat/page.tsx");
  const broadcast = read("components/news/galaxy-broadcast.tsx");
  const host = read("lib/fantasy/host.ts");

  it("wires the cinematic broadcast and the graded feed", () => {
    expect(page).toContain("GalaxyBroadcast");
    expect(page).toContain("buildBroadcast");
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

  it("does NOT ship the robotic speech-synthesis Play control", () => {
    // Founder 2026-09-12: "the voice is horrible and nothing human-like."
    // Browser speechSynthesis is gone. A real TTS lane can return behind
    // an explicit opt-in; the default surface must not sound like a robot.
    expect(broadcast).not.toContain("speechSynthesis");
    expect(broadcast).not.toContain("SpeechSynthesisUtterance");
    expect(broadcast).not.toMatch(/▶ Play/);
  });

  it("has no autoplaying media and no decorative plate on the page shell", () => {
    expect(broadcast.toLowerCase()).not.toContain("autoplay");
    // The opening is pure Field atmosphere (gradient + scanline wash),
    // not a GeneratedPlate still.
    expect(page).not.toContain("GeneratedPlate");
    expect(page).toContain("radial-gradient");
  });
});
