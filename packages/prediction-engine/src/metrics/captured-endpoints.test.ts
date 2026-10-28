import { describe, expect, it } from "vitest";

import {
  CAPTURE_REAL,
  CAPTURE_REGISTRY,
  CAPTURE_STUBS,
  loadActionNetworkNextData,
  loadPpAds,
  loadPpNews,
  loadPpPlayersPros,
  loadPpStaffPlayers,
} from "./captured-endpoints.js";

describe("captured endpoint surfaces", () => {
  it("registers every capture on disk exactly once", () => {
    expect(CAPTURE_REGISTRY).toHaveLength(70);
    expect(CAPTURE_REAL).toHaveLength(8);
    expect(CAPTURE_STUBS).toHaveLength(62);
    const keys = CAPTURE_REGISTRY.map((c) => `${c.host}/${c.file}`);
    expect(new Set(keys).size).toBe(70);
  });

  it("classifies a stub with a reason and a real payload without one", () => {
    for (const s of CAPTURE_STUBS) expect(s.stubReason).not.toBeNull();
    for (const r of CAPTURE_REAL) expect(r.stubReason).toBeNull();
  });

  it("loads each real payload and returns its source path", async () => {
    const an = await loadActionNetworkNextData();
    expect(an.path).toContain("actionnetwork.com");
    expect(an.data.__N_SSG).toBeTypeOf("boolean");

    const news = await loadPpNews();
    expect(news.data.success).toBe(true);
    expect(news.data.data.length).toBeGreaterThan(0);

    const pros = await loadPpPlayersPros();
    expect(pros.data.length).toBeGreaterThan(0);
    expect(pros.data[0].Player_ID).toBeTruthy();

    const ads = await loadPpAds();
    expect(ads.data.length).toBeGreaterThan(0);

    const staff = await loadPpStaffPlayers();
    expect(staff.data.data.length).toBeGreaterThan(0);
  }, 30_000);
});
