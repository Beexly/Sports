import { describe, it, expect } from "vitest";
import { DISTRICTS, isDistrictId } from "../world/districts.js";
import { SPORTS_WEATHER, activeWeatherForDay } from "../world/sports-weather.js";
import { ROOM_REGISTRY } from "../world/rooms.js";
import { BOSSES } from "../bosses.js";
import { isBrandSafe } from "../language-law.js";

describe("World graph — District Registry completeness", () => {
  it("every district has the full required contract (Phase 13 gate)", () => {
    for (const d of DISTRICTS) {
      expect(d.primaryAction.length, d.id).toBeGreaterThan(0);
      expect(d.reward.length, d.id).toBeGreaterThan(0);
      expect(d.dailyHook.length, d.id).toBeGreaterThan(0);
      expect(d.gseConnection.length, d.id).toBeGreaterThan(0);
      expect(d.crewConnection.length, d.id).toBeGreaterThan(0);
      expect(d.factionConnection.length, d.id).toBeGreaterThan(0);
      expect(d.cardConnection.length, d.id).toBeGreaterThan(0);
      expect(d.monetizationHook.length, d.id).toBeGreaterThan(0);
      expect(d.roomTypeNow.length, d.id).toBeGreaterThan(0);
      expect(d.roomTypeFuture.length, d.id).toBeGreaterThan(0);
      expect(d.metrics.length, d.id).toBeGreaterThan(0);
      expect(d.lockedFuture.length, d.id).toBeGreaterThan(0);
    }
  });

  it("district ids are unique and href-rooted under /galaxy", () => {
    const ids = DISTRICTS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of DISTRICTS) expect(d.href.startsWith("/galaxy")).toBe(true);
  });

  it("all district copy passes the Language Law", () => {
    for (const d of DISTRICTS) {
      expect(isBrandSafe(`${d.name} ${d.tagline} ${d.primaryAction} ${d.reward} ${d.monetizationHook} ${d.lockedFuture}`), d.id).toBe(true);
    }
  });
});

describe("World graph — Sports Weather", () => {
  it("ships the 14 canon weather states", () => {
    expect(SPORTS_WEATHER.length).toBe(14);
  });

  it("every weather affects real districts, rotates a real boss, and has hooks", () => {
    const bossKeys = new Set(BOSSES.map((b) => b.key));
    for (const w of SPORTS_WEATHER) {
      expect(w.affectedDistricts.length, w.id).toBeGreaterThan(0);
      for (const d of w.affectedDistricts) expect(isDistrictId(d), `${w.id} -> ${d}`).toBe(true);
      expect(w.bossRotation.length, w.id).toBeGreaterThan(0);
      for (const b of w.bossRotation) expect(bossKeys.has(b), `${w.id} -> ${b}`).toBe(true);
      expect(w.gsePrompt.length, w.id).toBeGreaterThan(0);
      expect(w.questPrompt.length, w.id).toBeGreaterThan(0);
      expect(w.crewPrompt.length, w.id).toBeGreaterThan(0);
      expect(w.cardPrompts.length, w.id).toBeGreaterThan(0);
      expect(isBrandSafe(`${w.name} ${w.summary} ${w.gsePrompt} ${w.questPrompt} ${w.crewPrompt} ${w.factionPrompt}`), w.id).toBe(true);
    }
  });

  it("active weather is deterministic per day", () => {
    expect(activeWeatherForDay(0).id).toBe(SPORTS_WEATHER[0]!.id);
    expect(activeWeatherForDay(SPORTS_WEATHER.length).id).toBe(SPORTS_WEATHER[0]!.id);
    expect(activeWeatherForDay(3).id).toBe(activeWeatherForDay(3).id);
  });
});

describe("World graph — Room Registry completeness", () => {
  it("every room declares stack, persistence, callbacks, and a quality gate", () => {
    for (const r of ROOM_REGISTRY) {
      expect(isDistrictId(r.district), r.id).toBe(true);
      expect(r.recommendedStack.length, r.id).toBeGreaterThan(0);
      expect(r.persistenceContract.length, r.id).toBeGreaterThan(0);
      expect(r.apiCallbacks.length, r.id).toBeGreaterThan(0);
      expect(r.qualityGate.length, r.id).toBeGreaterThan(0);
      expect(r.testStrategy.length, r.id).toBeGreaterThan(0);
    }
  });
});
