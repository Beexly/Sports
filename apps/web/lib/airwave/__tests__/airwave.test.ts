import { describe, it, expect } from "vitest";
import {
  scorecardFor,
  leaderboard,
  toPublicClaim,
  toPublicLedger,
  captureGate,
  planCapture,
  readAirwaveEnv,
  isWithinAiringWindow,
  ALL_ADAPTERS,
  YOUTUBE_ADAPTER,
  SATELLITE_RADIO_ADAPTER,
  type AirwaveEnv,
} from "../index";
import { DEMO_PUNDITS, DEMO_CLAIMS } from "../demo-ledger";

const punditById = (id: string) => DEMO_PUNDITS.find((p) => p.id === id)!;

describe("airwave scoring", () => {
  it("rewards checkable, correct calls (Nyla Brooks)", () => {
    const card = scorecardFor(punditById("p_brooks"), DEMO_CLAIMS);
    expect(card.hits).toBe(2);
    expect(card.misses).toBe(0);
    expect(card.pushes).toBe(1);
    expect(card.unfalsifiable).toBe(0);
    expect(card.falsifiableRate).toBe(1);
    expect(card.hitRate).toBe(1);
    expect(card.accountabilityIndex).toBe(90);
  });

  it("scores an honest miss without collapsing a strong record (Della Marsh)", () => {
    const card = scorecardFor(punditById("p_marsh"), DEMO_CLAIMS);
    expect(card.hits).toBe(2);
    expect(card.misses).toBe(1);
    expect(card.pushes).toBe(1);
    expect(card.accountabilityIndex).toBe(73);
    expect(card.hitRate).toBeCloseTo(2 / 3, 5);
  });

  it("penalises a confident-but-wrong record (Brick Tannen)", () => {
    const card = scorecardFor(punditById("p_tannen"), DEMO_CLAIMS);
    expect(card.accountabilityIndex).toBe(33);
    expect(card.unfalsifiable).toBe(1);
  });

  it("excludes pending claims from grading (Gus Pellman)", () => {
    const card = scorecardFor(punditById("p_pellman"), DEMO_CLAIMS);
    expect(card.pending).toBe(1);
    expect(card.graded).toBe(3);
    expect(card.accountabilityIndex).toBe(17);
  });

  it("scores near-zero for un-checkable hot takes even with no losses (Rip Donnelly)", () => {
    const card = scorecardFor(punditById("p_donnelly"), DEMO_CLAIMS);
    expect(card.unfalsifiable).toBe(3);
    expect(card.falsifiableRate).toBeLessThan(0.34);
    expect(card.accountabilityIndex).toBe(0);
  });

  it("ranks the disciplined pundit at the top of the leaderboard", () => {
    const board = leaderboard(DEMO_PUNDITS, DEMO_CLAIMS);
    expect(board[0]!.punditId).toBe("p_brooks");
    expect(board.at(-1)!.punditId).toBe("p_donnelly");
    // Monotonic non-increasing accountability index.
    for (let i = 1; i < board.length; i++) {
      expect(board[i - 1]!.accountabilityIndex).toBeGreaterThanOrEqual(board[i]!.accountabilityIndex);
    }
  });
});

describe("airwave redaction boundary", () => {
  it("strips the internal sourceClipRef from public claims", () => {
    const internal = DEMO_CLAIMS[0]!;
    const pub = toPublicClaim(internal);
    expect("sourceClipRef" in pub).toBe(false);
    expect(JSON.stringify(pub)).not.toContain("seg/");
    // Public-facing fields survive.
    expect(pub.assertion).toBe(internal.assertion);
    expect(pub.verdict).toBe(internal.verdict);
  });

  it("never leaks a clip pointer across the whole ledger", () => {
    const serialised = JSON.stringify(toPublicLedger(DEMO_CLAIMS));
    expect(serialised).not.toContain("sourceClipRef");
    expect(serialised).not.toContain("seg/");
  });
});

describe("airwave capture gate (refusal by default)", () => {
  const inert: AirwaveEnv = { enabled: false, siriusxmLegalAck: false };
  const masterOnly: AirwaveEnv = { enabled: true, siriusxmLegalAck: false };
  const fullyOpen: AirwaveEnv = { enabled: true, siriusxmLegalAck: true };

  it("holds every source when the master switch is off", () => {
    for (const a of ALL_ADAPTERS) {
      expect(captureGate(a, inert).allowed).toBe(false);
    }
  });

  it("allows freely-published sources once enabled, but still holds satellite radio", () => {
    expect(captureGate(YOUTUBE_ADAPTER, masterOnly).allowed).toBe(true);
    expect(captureGate(SATELLITE_RADIO_ADAPTER, masterOnly).allowed).toBe(false);
  });

  it("only opens satellite radio with an explicit legal acknowledgement", () => {
    expect(captureGate(SATELLITE_RADIO_ADAPTER, fullyOpen).allowed).toBe(true);
  });

  it("defaults to a fully-inert env when no flags are set", () => {
    const env = readAirwaveEnv({});
    expect(env.enabled).toBe(false);
    expect(env.siriusxmLegalAck).toBe(false);
  });

  it("planCapture reports a held plan by default and never throws", () => {
    const plan = planCapture(ALL_ADAPTERS, { startIsoCt: "2025-11-09T05:00:00-06:00", endIsoCt: "2025-11-09T23:00:00-06:00" }, inert);
    expect(plan.every((p) => p.held)).toBe(true);
  });

  it("captures only inside the 05:00-23:00 CT window", () => {
    expect(isWithinAiringWindow(4)).toBe(false);
    expect(isWithinAiringWindow(5)).toBe(true);
    expect(isWithinAiringWindow(22)).toBe(true);
    expect(isWithinAiringWindow(23)).toBe(false);
  });
});

describe("airwave demo data integrity", () => {
  it("every claim belongs to a known pundit and carries a paraphrased assertion", () => {
    const ids = new Set(DEMO_PUNDITS.map((p) => p.id));
    for (const c of DEMO_CLAIMS) {
      expect(ids.has(c.punditId)).toBe(true);
      expect(c.assertion.trim().length).toBeGreaterThan(0);
      expect(c.outcomeNote.trim().length).toBeGreaterThan(0);
    }
  });

  it("unfalsifiable claims are flagged, not graded as outcomes", () => {
    for (const c of DEMO_CLAIMS) {
      if (!c.falsifiable) expect(c.verdict).toBe("UNFALSIFIABLE");
      if (c.verdict === "UNFALSIFIABLE") expect(c.falsifiable).toBe(false);
    }
  });
});
