import { describe, it, expect } from "vitest";
import { buildBroadcast, NOVA, SCENES, HOST_DISCLOSURE, assessPublishReadiness } from "./host";

describe("studio host broadcast", () => {
  const b = buildBroadcast();

  it("fronts a branded persona with a voice and values bible", () => {
    expect(NOVA.name.length).toBeGreaterThan(0);
    expect(NOVA.voice.length).toBeGreaterThanOrEqual(3);
    expect(NOVA.values.length).toBeGreaterThanOrEqual(2);
    expect(b.persona.name).toBe("Nova");
  });

  it("opens, runs multiple on-location segments, and signs off", () => {
    expect(b.coldOpen.length).toBeGreaterThan(10);
    expect(b.segments.length).toBeGreaterThanOrEqual(4);
    expect(b.signOff.length).toBeGreaterThan(10);
    for (const s of b.segments) {
      expect(SCENES[s.scene]).toBeDefined();
      expect(s.script.length).toBeGreaterThan(20);
      expect(s.broll.length).toBeGreaterThan(0);
    }
  });

  it("reports the top story from a real-feeling location, not the desk", () => {
    const top = b.segments.find((s) => s.id === "seg-top")!;
    expect(["sideline", "practice", "office"]).toContain(top.scene);
  });

  it("switches scenes across the broadcast (not all one location)", () => {
    const scenes = new Set(b.segments.map((s) => s.scene));
    expect(scenes.size).toBeGreaterThanOrEqual(3);
  });

  it("always carries an AI-presenter disclosure", () => {
    expect(b.disclosure).toBe(HOST_DISCLOSURE);
    expect(b.plaintext.toLowerCase()).toContain("synthetic presenter");
    expect(b.plaintext.toLowerCase()).toContain("human-reviewed");
  });

  it("the script avoids overclaiming language (trust-brand safe)", () => {
    const banned = ["guaranteed", "sure thing", "lock of the day", "can't lose", "risk-free"];
    const text = b.plaintext.toLowerCase();
    for (const w of banned) expect(text).not.toContain(w);
  });

  it("is deterministic for the same week data", () => {
    expect(buildBroadcast().plaintext).toBe(b.plaintext);
  });

  it("is NOT publish-ready by default — consent and human approval gate it", () => {
    const r = assessPublishReadiness(b);
    expect(r.ready).toBe(false);
    expect(r.gates.find((g) => g.id === "consent")!.passed).toBe(false);
    expect(r.gates.find((g) => g.id === "human")!.passed).toBe(false);
    // disclosure and brand-safety should already pass on a clean broadcast
    expect(r.gates.find((g) => g.id === "disclosure")!.passed).toBe(true);
    expect(r.safety).toBe("safe");
  });

  it("becomes publish-ready only with consent on file AND a human approver", () => {
    const r = assessPublishReadiness(b, { likenessConsentOnFile: true, humanApprover: "Garrett" });
    expect(r.ready).toBe(true);
    expect(r.gates.every((g) => g.passed)).toBe(true);
  });
});
