/**
 * C44 — Friction Trigger Tests
 *
 * Asserts that friction prompts are correctly registered for known
 * triggers and that all friction actions are legal (no bet actions).
 */

import { describe, it, expect } from "vitest";
import { promptFor, isLegalAction, FRICTION_PROMPTS } from "@/lib/responsible-intelligence/friction";

describe("Friction — parlay-correlation-high trigger", () => {
  it("returns a prompt for parlay-correlation-high", () => {
    const prompt = promptFor("parlay-correlation-high");
    expect(prompt).toBeDefined();
    expect(prompt?.trigger).toBe("parlay-correlation-high");
  });

  it("parlay-correlation-high prompt has modal: true", () => {
    const prompt = promptFor("parlay-correlation-high");
    expect(prompt?.modal).toBe(true);
  });

  it("parlay-correlation-high actions are all legal", () => {
    const prompt = promptFor("parlay-correlation-high");
    for (const action of prompt?.actions ?? []) {
      expect(isLegalAction(action.href, action.label)).toBe(true);
    }
  });
});

describe("Friction — all registered prompts have legal actions", () => {
  for (const prompt of FRICTION_PROMPTS) {
    it(`${prompt.id} — all actions are legal`, () => {
      for (const action of prompt.actions) {
        expect(isLegalAction(action.href, action.label)).toBe(true);
      }
    });
  }
});

describe("Friction — isLegalAction rejects bet actions", () => {
  it("rejects 'place bet' label", () => {
    expect(isLegalAction("/picks", "place bet now")).toBe(false);
  });

  it("rejects 'Bet Now' label", () => {
    expect(isLegalAction("/picks", "Bet Now")).toBe(false);
  });

  it("rejects 'Tail this pick' label", () => {
    expect(isLegalAction("/picks", "Tail this pick")).toBe(false);
  });
});
