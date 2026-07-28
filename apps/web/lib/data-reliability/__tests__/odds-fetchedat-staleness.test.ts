import { describe, it, expect } from "vitest";
import {
  classifyOddsFetchedAt,
  FETCHEDAT_WARN_AFTER_MINUTES,
  FETCHEDAT_STALE_AFTER_MINUTES,
  FETCHEDAT_GATE_BUDGET_MINUTES,
} from "../odds-fetchedat-staleness";

describe("classifyOddsFetchedAt", () => {
  const now = new Date("2026-07-27T18:00:00Z");

  it("ok when fresh", () => {
    const t = new Date(now.getTime() - 20 * 60_000);
    const r = classifyOddsFetchedAt(t, now);
    expect(r.status).toBe("ok");
    expect(r.shouldAlert).toBe(false);
  });

  it("warn after WARN threshold", () => {
    const t = new Date(
      now.getTime() - (FETCHEDAT_WARN_AFTER_MINUTES + 1) * 60_000,
    );
    const r = classifyOddsFetchedAt(t, now);
    expect(r.status).toBe("warn");
    expect(r.shouldAlert).toBe(false);
  });

  it("stale after STALE threshold", () => {
    const t = new Date(
      now.getTime() - (FETCHEDAT_STALE_AFTER_MINUTES + 1) * 60_000,
    );
    const r = classifyOddsFetchedAt(t, now);
    expect(r.status).toBe("stale");
    expect(r.shouldAlert).toBe(true);
  });

  it("gate_breach after 6h", () => {
    const t = new Date(
      now.getTime() - (FETCHEDAT_GATE_BUDGET_MINUTES + 1) * 60_000,
    );
    const r = classifyOddsFetchedAt(t, now);
    expect(r.status).toBe("gate_breach");
    expect(r.shouldAlert).toBe(true);
  });

  it("unknown when null", () => {
    const r = classifyOddsFetchedAt(null, now);
    expect(r.status).toBe("unknown");
    expect(r.shouldAlert).toBe(true);
  });
});
