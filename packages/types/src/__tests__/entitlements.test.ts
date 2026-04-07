import { describe, it, expect } from "vitest";
import { getEntitlements } from "../index.js";

describe("getEntitlements", () => {
  describe("FREE tier", () => {
    const ents = getEntitlements("FREE");

    it("sets tier to FREE", () => {
      expect(ents.tier).toBe("FREE");
    });

    it("cannot see premium picks", () => {
      expect(ents.canSeePremiumPicks).toBe(false);
    });

    it("cannot see confidence scores", () => {
      expect(ents.canSeeConfidence).toBe(false);
    });

    it("cannot see line movement", () => {
      expect(ents.canSeeLineMovement).toBe(false);
    });

    it("cannot get alerts", () => {
      expect(ents.canGetAlerts).toBe(false);
    });

    it("has daily pick limit of 1", () => {
      expect(ents.dailyPickLimit).toBe(1);
    });
  });

  describe("PRO tier", () => {
    const ents = getEntitlements("PRO");

    it("sets tier to PRO", () => {
      expect(ents.tier).toBe("PRO");
    });

    it("can see premium picks", () => {
      expect(ents.canSeePremiumPicks).toBe(true);
    });

    it("can see confidence scores", () => {
      expect(ents.canSeeConfidence).toBe(true);
    });

    it("can see line movement", () => {
      expect(ents.canSeeLineMovement).toBe(true);
    });

    it("cannot get alerts", () => {
      expect(ents.canGetAlerts).toBe(false);
    });

    it("has unlimited picks (null limit)", () => {
      expect(ents.dailyPickLimit).toBeNull();
    });
  });

  describe("ELITE tier", () => {
    const ents = getEntitlements("ELITE");

    it("sets tier to ELITE", () => {
      expect(ents.tier).toBe("ELITE");
    });

    it("can see premium picks", () => {
      expect(ents.canSeePremiumPicks).toBe(true);
    });

    it("can get alerts", () => {
      expect(ents.canGetAlerts).toBe(true);
    });

    it("has unlimited picks (null limit)", () => {
      expect(ents.dailyPickLimit).toBeNull();
    });
  });
});
