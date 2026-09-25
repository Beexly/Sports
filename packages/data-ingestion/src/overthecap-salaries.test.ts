import { describe, expect, it } from "vitest";
import {
  OVERTHECAP_SALARIES_BASE,
  OverTheCapSalariesClient,
  isOverTheCapSalariesEnabled,
  parseOverTheCapSalaryRow,
} from "./overthecap-salaries.js";

describe("OverTheCap salary adapter", () => {
  it("is disabled by default and exposes the fixed base URL", () => {
    expect(isOverTheCapSalariesEnabled({})).toBe(false);
    expect(OVERTHECAP_SALARIES_BASE).toBe("https://overthecap.com");
  });

  it("parses player, position, and cap hit in either dollars or millions", () => {
    expect(parseOverTheCapSalaryRow({ player: "A", position: "QB", cap_hit: 10_000_000 })).toMatchObject({ capHitMillions: 10 });
    expect(parseOverTheCapSalaryRow({ name: "B", pos: "WR", capHitMillions: 4.5 })).toMatchObject({ capHitMillions: 4.5 });
    expect(parseOverTheCapSalaryRow({ player: "C", position: "RB", cap_hit: 0 })).toBeNull();
  });

  it("fetches and filters only when enabled", async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return new Response(JSON.stringify([{ player: "A", position: "QB", cap_hit: 5_000_000 }, { bad: true }]), { status: 200 });
    }) as unknown as typeof fetch;
    const client = new OverTheCapSalariesClient({ OVERTHECAP_SALARIES_ENABLED: "1" }, fetchImpl);
    const rows = await client.getSalaries();
    expect(rows).toHaveLength(1);
    expect(calls).toBe(1);
  });

  it("returns null without fetching while disabled", async () => {
    let calls = 0;
    const fetchImpl = (async () => { calls += 1; return new Response("[]"); }) as unknown as typeof fetch;
    expect(await new OverTheCapSalariesClient({ OVERTHECAP_SALARIES_ENABLED: "0" }, fetchImpl).getSalaries()).toBeNull();
    expect(calls).toBe(0);
  });
});
