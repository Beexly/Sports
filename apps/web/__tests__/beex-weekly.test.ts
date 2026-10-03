import { describe, it, expect } from "vitest";
import {
  draftBeexWeekly,
  advanceEpisode,
  approveEpisode,
  rewriteInOurVoice,
} from "@/lib/gsn/beex-weekly";
import { SAMPLE_TRANSMISSION } from "@/lib/gsn/transmission";

const draft = () =>
  draftBeexWeekly(SAMPLE_TRANSMISSION, { weekLabel: "Week 14", consentOnFile: true });

describe("Beex Weekly script generator", () => {
  it("drafts an episode from a real transmission with one script per segment", () => {
    const ep = draft();
    expect(ep.kind).toBe("beex-weekly");
    expect(ep.status).toBe("draft");
    expect(ep.segments).toHaveLength(SAMPLE_TRANSMISSION.segments.length);
    expect(ep.episodeCode).toBe("BW · Week 14");
  });

  it("adds framing, not facts — every segment traces to a transmission segment", () => {
    const ep = draft();
    for (const [i, seg] of ep.segments.entries()) {
      expect(seg.source).toBe(SAMPLE_TRANSMISSION.segments[i]!.type);
      expect(seg.heading).toBe(SAMPLE_TRANSMISSION.segments[i]!.title);
      expect(seg.lines.length).toBeGreaterThan(0);
    }
  });

  it("speaks in our voice — no 'the engine', no 'AI' in spoken lines", () => {
    const ep = draft();
    const spoken = [...ep.cold_open, ...ep.segments.flatMap((s) => s.lines), ...ep.sign_off].join(" ");
    expect(spoken).not.toMatch(/\bthe engine\b/i);
    expect(spoken).not.toMatch(/\bAI\b/);
  });

  it("closes with the canonical line", () => {
    expect(draft().sign_off.at(-1)).toBe("We detect. You decide.");
  });

  it("never publishes without owner approval", () => {
    expect(() => advanceEpisode(draft(), "published")).toThrow(/owner approval/);
  });

  it("never approves without voice consent on file", () => {
    const ep = draftBeexWeekly(SAMPLE_TRANSMISSION, { weekLabel: "Week 14", consentOnFile: false });
    expect(() => approveEpisode(ep)).toThrow(/consent/i);
  });

  it("publishes only after explicit approval", () => {
    const approved = approveEpisode(draft());
    expect(approved.status).toBe("approved");
    const published = advanceEpisode(approved, "published");
    expect(published.status).toBe("published");
  });

  it("auto-publish is impossible by type and by value", () => {
    expect(draft().voicePolicy.autoPublish).toBe(false);
  });

  it("rewriteInOurVoice converts tool language to first person", () => {
    expect(rewriteInOurVoice("the engine is telling four slates to wait")).toBe(
      "We're telling four slates to wait",
    );
    expect(rewriteInOurVoice("The engine flagged it")).toBe("We flagged it");
    expect(rewriteInOurVoice("The engine flags it — it doesn't chase it.")).toBe(
      "We flag it — it doesn't chase it.",
    );
  });
});
