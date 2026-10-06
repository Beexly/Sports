import { describe, expect, it } from "vitest";
import {
  ARM_LEAD_MS,
  FALLBACK_WINDOW_MS,
  STAND_DOWN_MS,
  chicagoYmd,
  eventToWindow,
  getActiveWindows,
  nextWindow,
  windowEndFor,
  windowStartFor,
} from "./watch-scheduler.js";

const LONDON_KICKOFF = Date.parse("2026-10-04T13:30:00Z"); // 8:30 AM CT
const TNF_KICKOFF = Date.parse("2026-10-02T00:15:00Z"); // Thu 7:15 PM CT

function londonEvent() {
  return {
    id: "401872965",
    date: "2026-10-04T13:30:00Z",
    name: "Indianapolis Colts at Washington Commanders",
    week: { number: 4 },
    season: { year: 2026 },
    status: { type: { name: "STATUS_SCHEDULED" } },
    competitions: [
      {
        competitors: [
          { homeAway: "away", team: { abbreviation: "IND" } },
          { homeAway: "home", team: { abbreviation: "WSH" } },
        ],
        venue: { address: { city: "London" } },
      },
    ],
  };
}

describe("window math", () => {
  it("arms 15 min before kickoff", () => {
    expect(windowStartFor(TNF_KICKOFF)).toBe(TNF_KICKOFF - ARM_LEAD_MS);
  });

  it("stands down 30 min after an observed final", () => {
    const final = TNF_KICKOFF + 3 * 3600 * 1000;
    expect(windowEndFor(TNF_KICKOFF, final)).toBe(final + STAND_DOWN_MS);
  });

  it("falls back to kickoff + 4.5h without an observed final", () => {
    expect(windowEndFor(TNF_KICKOFF, null)).toBe(TNF_KICKOFF + FALLBACK_WINDOW_MS);
  });
});

describe("eventToWindow", () => {
  it("normalizes a scheduled event", () => {
    const w = eventToWindow(londonEvent());
    expect(w).not.toBeNull();
    expect(w!.gameId).toBe("401872965");
    expect(w!.away).toBe("IND");
    expect(w!.home).toBe("WSH");
    expect(w!.status).toBe("scheduled");
    expect(w!.venueCity).toBe("London");
    expect(w!.windowStart).toBe(LONDON_KICKOFF - ARM_LEAD_MS);
  });

  it("treats the 8:30 AM CT London game as a first-class window", () => {
    // Arm time must be 8:15 AM CT — no special-casing of "early" games.
    const w = eventToWindow(londonEvent())!;
    const armChicago = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(w.windowStart));
    expect(armChicago).toBe("8:15 AM");
  });

  it("maps STATUS_FINAL to final and uses the observed final ts", () => {
    const finalTs = TNF_KICKOFF + 3 * 3600 * 1000;
    const w = eventToWindow(
      {
        id: "401872964",
        date: "2026-10-02T00:15:00Z",
        name: "Pittsburgh Steelers at Cleveland Browns",
        status: { type: { name: "STATUS_FINAL" } },
        competitions: [],
      },
      finalTs,
    )!;
    expect(w.status).toBe("final");
    expect(w.windowEnd).toBe(finalTs + STAND_DOWN_MS);
  });

  it("returns null for an unparseable date", () => {
    expect(eventToWindow({ id: "x", date: "not-a-date", name: "?" })).toBeNull();
  });
});

describe("getActiveWindows / nextWindow", () => {
  const windows = [
    eventToWindow(londonEvent())!,
    {
      gameId: "sunday-noon",
      season: 2026,
      week: 4,
      away: "DAL",
      home: "HOU",
      kickoffTs: Date.parse("2026-10-04T17:00:00Z"),
      windowStart: Date.parse("2026-10-04T17:00:00Z") - ARM_LEAD_MS,
      windowEnd: Date.parse("2026-10-04T17:00:00Z") + FALLBACK_WINDOW_MS,
      status: "scheduled" as const,
    },
  ];

  it("finds the London window active at 9 AM CT Sunday", () => {
    const nineAmCt = Date.parse("2026-10-04T14:00:00Z");
    const active = getActiveWindows(windows, nineAmCt);
    expect(active.map((w) => w.gameId)).toEqual(["401872965"]);
  });

  it("finds nothing active at 3 AM CT Sunday", () => {
    const threeAmCt = Date.parse("2026-10-04T08:00:00Z");
    expect(getActiveWindows(windows, threeAmCt)).toEqual([]);
  });

  it("nextWindow returns the earliest upcoming window", () => {
    const threeAmCt = Date.parse("2026-10-04T08:00:00Z");
    expect(nextWindow(windows, threeAmCt)?.gameId).toBe("401872965");
  });

  it("nextWindow returns null when nothing is upcoming", () => {
    const farFuture = Date.parse("2027-01-01T00:00:00Z");
    expect(nextWindow(windows, farFuture)).toBeNull();
  });
});

describe("chicagoYmd", () => {
  it("formats in America/Chicago regardless of host tz", () => {
    // 2026-10-01 23:30 UTC = 6:30 PM CT Oct 1
    expect(chicagoYmd(new Date("2026-10-01T23:30:00Z"))).toBe("20261001");
    // 2026-10-02 00:15 UTC = 7:15 PM CT Oct 1 (TNF kickoff)
    expect(chicagoYmd(new Date("2026-10-02T00:15:00Z"))).toBe("20261001");
  });
});
