import { describe, it, expect } from "vitest";
import { classifySignal, parseRssItems } from "./rss";

describe("rss classifySignal — coach-report tier", () => {
  it("classifies explicit coach framing as coach-report", () => {
    expect(classifySignal("Coach says QB will start")).toBe("coach-report");
    expect(classifySignal("Head coach noncommittal on RB workload")).toBe("coach-report");
    expect(classifySignal("OC: 'we will get him more involved'")).toBe("coach-report");
  });

  it("classifies beat-reporter/insider attribution as coach-report", () => {
    expect(classifySignal("Beat reporter expects WR to be a game-time decision")).toBe("coach-report");
    expect(classifySignal("Insiders: team expected to sign a returner")).toBe("coach-report");
    expect(classifySignal("Per source, the staff plans a rotation")).toBe("coach-report");
  });

  it("classifies generic report says/said/according-to framing as coach-report", () => {
    expect(classifySignal("Report says the team is shopping a receiver")).toBe("coach-report");
    expect(classifySignal("According to a source, the RB is trending toward playing")).toBe("coach-report");
  });

  it("keeps a stronger signal when a headline also mentions a coach", () => {
    expect(classifySignal("Coach confirms QB ruled out")).toBe("injury-out");
    expect(classifySignal("Coach says RB named starter")).toBe("role-up");
  });

  it("does not fire on plain prose with no report framing", () => {
    expect(classifySignal("Cowboys beat Giants 24-17")).toBeNull();
    expect(classifySignal("The stadium opened its new gate yesterday")).toBeNull();
    expect(classifySignal("Team signs a backup offensive lineman")).toBeNull();
  });

  it("the word 'report' alone is not enough — needs report-of framing", () => {
    // "report" as a noun without attribution/rumor framing is not a coach signal.
    expect(classifySignal("Weekly injury report released")).toBeNull();
    expect(classifySignal("Team publishes its weekly report")).toBeNull();
  });
});

describe("rss parseRssItems", () => {
  it("extracts titles and pubDates from RSS item blocks", () => {
    const xml = `
      <rss><channel>
        <item><title>Coach says QB will start</title><pubDate>Tue, 01 Jan 2026 12:00:00 GMT</pubDate></item>
        <item><title>Other headline</title><pubDate>Tue, 01 Jan 2026 13:00:00 GMT</pubDate></item>
      </channel></rss>`;
    const items = parseRssItems(xml);
    expect(items).toHaveLength(2);
    expect(items[0]!.title).toBe("Coach says QB will start");
    expect(items[0]!.pubDate).toBe("Tue, 01 Jan 2026 12:00:00 GMT");
  });

  it("drops blocks with no title", () => {
    const xml = `<rss><channel><item><pubDate>Tue, 01 Jan 2026 12:00:00 GMT</pubDate></item></channel></rss>`;
    expect(parseRssItems(xml)).toHaveLength(0);
  });
});