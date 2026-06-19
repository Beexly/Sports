import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(path: string): string {
  return readFileSync(resolve(__dirname, "..", "..", "..", path), "utf8");
}

describe("JarvisStatusVoice — speak the live status, safely", () => {
  const component = readRepoFile("apps/web/components/cockpit/live/jarvis-status-voice.tsx");

  it("is a client component that feature-detects speech synthesis", () => {
    expect(component).toContain('"use client"');
    expect(component).toMatch(/"speechSynthesis" in window/);
  });

  it("speaks on a user gesture (never autoplay) and cancels on unmount", () => {
    // The speak call lives inside the click handler `toggle`, not an effect that
    // fires on mount — browsers require a gesture, and we honor that.
    expect(component).toMatch(/onClick=\{toggle\}/);
    expect(component).toMatch(/speechSynthesis\.speak/);
    expect(component).toMatch(/speechSynthesis\.cancel/);
    // Cleanup effect cancels in-flight speech.
    expect(component).toMatch(/return \(\) => \{[\s\S]*speechSynthesis\.cancel/);
  });

  it("exposes accessible controls + a live written status (watch AND hear)", () => {
    expect(component).toMatch(/aria-pressed=\{speaking\}/);
    expect(component).toMatch(/aria-label=/);
    expect(component).toMatch(/aria-live="polite"/);
  });

  it("composes the spoken status only from real assessment values", () => {
    // No hardcoded health/decision figures — everything comes from props.
    expect(component).toMatch(/health,\s*\n?\s*ownerDecisionCount/);
    expect(component).toMatch(/nextBestAction/);
    expect(component).toMatch(/const spoken = `Status report\./);
  });
});

describe("Live Command Center wires the speak-status control", () => {
  const page = readRepoFile("apps/web/app/cockpit/live/page.tsx");

  it("imports and renders JarvisStatusVoice from the real assessment", () => {
    expect(page).toMatch(/import \{ JarvisStatusVoice \}/);
    expect(page).toMatch(/<JarvisStatusVoice/);
    expect(page).toMatch(/health=\{assessment\.companyHealth\}/);
    expect(page).toMatch(/nextBestAction=\{assessment\.nextBestAction\}/);
  });
});
