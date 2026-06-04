import { describe, it, expect } from "vitest";
import { DRILLS, TRACKS, gradeOption, scoreAcademy, drillsByTrack, lessonsByTrack, INJURY_DECODER, LESSONS, VERDICT_POINTS } from "./academy";

describe("gm academy curriculum", () => {
  it("every drill is well-formed: a track, a difficulty, a sound answer, and an unsound answer", () => {
    for (const d of DRILLS) {
      expect(TRACKS).toContain(d.track);
      expect(["Core", "Advanced", "Pro"]).toContain(d.difficulty);
      expect(d.options.some((o) => o.verdict === "sound")).toBe(true);
      expect(d.options.some((o) => o.verdict === "unsound")).toBe(true);
      for (const o of d.options) expect(o.feedback.length).toBeGreaterThan(15);
    }
  });

  it("spans all four tracks and reaches Pro difficulty", () => {
    for (const t of TRACKS) expect(drillsByTrack(t).length).toBeGreaterThan(0);
    expect(DRILLS.some((d) => d.difficulty === "Pro")).toBe(true);
    expect(DRILLS.length).toBeGreaterThanOrEqual(14); // a real curriculum, not a quiz
  });

  it("grades a chosen option with feedback", () => {
    const d = DRILLS[0]!;
    const sound = d.options.find((o) => o.verdict === "sound")!;
    expect(gradeOption(d, sound.id)?.verdict).toBe("sound");
    expect(gradeOption(d, "nope")).toBeNull();
  });

  it("a perfect run scores GM IQ 100 with grade A", () => {
    const choices = new Map(DRILLS.map((d) => [d.id, d.options.find((o) => o.verdict === "sound")!.id]));
    const r = scoreAcademy(choices);
    expect(r.gmIq).toBe(100);
    expect(r.grade).toBe("A");
    expect(r.soundCount).toBe(DRILLS.length);
    expect(r.weakPatterns).toHaveLength(0);
  });

  it("an all-unsound run scores 0 and flags every pattern", () => {
    const choices = new Map(DRILLS.map((d) => [d.id, d.options.find((o) => o.verdict === "unsound")!.id]));
    const r = scoreAcademy(choices);
    expect(r.gmIq).toBe(0);
    expect(r.weakPatterns.length).toBe(DRILLS.length);
  });

  it("thin answers earn partial credit between unsound and sound", () => {
    expect(VERDICT_POINTS.unsound).toBeLessThan(VERDICT_POINTS.thin);
    expect(VERDICT_POINTS.thin).toBeLessThan(VERDICT_POINTS.sound);
    const d = DRILLS.find((x) => x.options.some((o) => o.verdict === "thin"))!;
    const thin = d.options.find((o) => o.verdict === "thin")!;
    expect(scoreAcademy(new Map([[d.id, thin.id]])).gmIq).toBe(50);
  });

  it("includes market, analytics, and injury depth a veteran would respect", () => {
    expect(drillsByTrack("Market").some((d) => /clv|vig|steam/i.test(d.id))).toBe(true);
    expect(drillsByTrack("Analytics").some((d) => /regression|sample|bayes/i.test(d.id))).toBe(true);
    expect(drillsByTrack("Injury").length).toBeGreaterThanOrEqual(3);
  });

  it("the injury decoder carries mechanism, surgery, window, return, and read for each entry", () => {
    expect(INJURY_DECODER.length).toBeGreaterThanOrEqual(6);
    for (const e of INJURY_DECODER) {
      expect(e.injury.length).toBeGreaterThan(0);
      expect(e.mechanism.length).toBeGreaterThan(10);
      expect(e.window.length).toBeGreaterThan(0);
      expect(e.onReturn.length).toBeGreaterThan(10);
      expect(e.fantasyRead.length).toBeGreaterThan(10);
    }
  });

  it("ships reference lessons per track", () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(4);
    expect(lessonsByTrack("Injury").length).toBeGreaterThan(0);
    expect(lessonsByTrack("Market").length).toBeGreaterThan(0);
  });
});
