import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BeatTheModel,
  pickemReducer,
  gradeCall,
  tallySlate,
  loadStore,
  MAX_PICKS,
  type SlateEntry,
  type BeatablePick,
  type BeatableSlate,
  type UserCall,
} from "../beat-the-model";
import type { PickResult } from "@sports/types";

// ── Fixtures ──────────────────────────────────────────────────────────────────
function mkPick(over: Partial<BeatablePick> = {}): BeatablePick {
  return {
    id: over.id ?? "pick-1",
    homeTeam: "Chiefs",
    awayTeam: "Ravens",
    sport: "NFL",
    // far future so it never reads as "kicked off" during the test run
    commenceTime: "2099-01-01T00:00:00.000Z",
    pickType: "SPREAD",
    selection: "Ravens +3.5",
    line: 3.5,
    pickGrade: "STRONG_PLAY",
    reasoningShort: "Sharp money on the road dog.",
    dataQualityScore: 82,
    result: "PENDING",
    ...over,
  };
}

function mkSlate(picks: BeatablePick[]): BeatableSlate {
  return { date: "2026-06-10", picks };
}

function emptyEntry(date = "2026-06-10"): SlateEntry {
  return { date, calls: {}, lockedAt: null };
}

beforeEach(() => {
  window.localStorage.clear();
  cleanup();
});

// ============================================================
// gradeCall — settlement-gated, NEVER fabricates an outcome
// ============================================================
describe("gradeCall — settlement gating", () => {
  it("returns 'pending' for an unsettled (PENDING) result, for both calls", () => {
    expect(gradeCall("trust", "PENDING")).toBe("pending");
    expect(gradeCall("fade", "PENDING")).toBe("pending");
  });

  it("never returns correct/incorrect while the pick is PENDING", () => {
    const calls: UserCall[] = ["trust", "fade"];
    for (const call of calls) {
      const outcome = gradeCall(call, "PENDING");
      expect(outcome).not.toBe("correct");
      expect(outcome).not.toBe("incorrect");
    }
  });

  it("grades a settled WIN: trust is correct, fade is incorrect", () => {
    expect(gradeCall("trust", "WIN")).toBe("correct");
    expect(gradeCall("fade", "WIN")).toBe("incorrect");
  });

  it("grades a settled LOSS: trust is incorrect, fade is correct", () => {
    expect(gradeCall("trust", "LOSS")).toBe("incorrect");
    expect(gradeCall("fade", "LOSS")).toBe("correct");
  });

  it("treats PUSH and VOID as 'void' (no win/loss either way)", () => {
    expect(gradeCall("trust", "PUSH")).toBe("void");
    expect(gradeCall("fade", "PUSH")).toBe("void");
    expect(gradeCall("trust", "VOID")).toBe("void");
    expect(gradeCall("fade", "VOID")).toBe("void");
  });

  it("only the four settled results ever produce a non-pending outcome", () => {
    const all: PickResult[] = ["PENDING", "WIN", "LOSS", "PUSH", "VOID"];
    const nonPending = all.filter((r) => gradeCall("trust", r) !== "pending");
    expect(nonPending.sort()).toEqual(["LOSS", "PUSH", "VOID", "WIN"]);
  });
});

// ============================================================
// tallySlate — record built only from published results
// ============================================================
describe("tallySlate", () => {
  it("counts pending picks as pending, never as wins/losses", () => {
    const picks = [
      mkPick({ id: "a", result: "PENDING" }),
      mkPick({ id: "b", result: "PENDING" }),
    ];
    const entry: SlateEntry = {
      date: "2026-06-10",
      calls: { a: "trust", b: "fade" },
      lockedAt: "2026-06-10T00:00:00.000Z",
    };
    const rec = tallySlate(entry, picks);
    expect(rec).toEqual({ correct: 0, incorrect: 0, pending: 2, void: 0 });
  });

  it("tallies a mix of settled and unsettled results", () => {
    const picks = [
      mkPick({ id: "a", result: "WIN" }),   // trust → correct
      mkPick({ id: "b", result: "LOSS" }),  // fade  → correct
      mkPick({ id: "c", result: "WIN" }),   // fade  → incorrect
      mkPick({ id: "d", result: "PUSH" }),  // trust → void
      mkPick({ id: "e", result: "PENDING" }), // trust → pending
    ];
    const entry: SlateEntry = {
      date: "2026-06-10",
      calls: { a: "trust", b: "fade", c: "fade", d: "trust", e: "trust" },
      lockedAt: "2026-06-10T00:00:00.000Z",
    };
    expect(tallySlate(entry, picks)).toEqual({
      correct: 2,
      incorrect: 1,
      pending: 1,
      void: 1,
    });
  });

  it("treats a call whose pick fell off the board as pending, not a loss", () => {
    const entry: SlateEntry = {
      date: "2026-06-10",
      calls: { gone: "trust" },
      lockedAt: "2026-06-10T00:00:00.000Z",
    };
    expect(tallySlate(entry, [])).toEqual({
      correct: 0,
      incorrect: 0,
      pending: 1,
      void: 0,
    });
  });
});

// ============================================================
// pickemReducer — pure, enforces ceiling + lock immutability
// ============================================================
describe("pickemReducer", () => {
  it("adds a call", () => {
    const s = pickemReducer(emptyEntry(), { type: "toggle", pickId: "a", call: "trust" });
    expect(s.calls).toEqual({ a: "trust" });
  });

  it("toggling the same call twice clears it", () => {
    let s = pickemReducer(emptyEntry(), { type: "toggle", pickId: "a", call: "trust" });
    s = pickemReducer(s, { type: "toggle", pickId: "a", call: "trust" });
    expect(s.calls).toEqual({});
  });

  it("switches trust → fade on the same pick", () => {
    let s = pickemReducer(emptyEntry(), { type: "toggle", pickId: "a", call: "trust" });
    s = pickemReducer(s, { type: "toggle", pickId: "a", call: "fade" });
    expect(s.calls).toEqual({ a: "fade" });
  });

  it("enforces the MAX_PICKS ceiling for new picks", () => {
    let s = emptyEntry();
    for (let i = 0; i < MAX_PICKS; i++) {
      s = pickemReducer(s, { type: "toggle", pickId: `p${i}`, call: "trust" });
    }
    expect(Object.keys(s.calls)).toHaveLength(MAX_PICKS);
    const blocked = pickemReducer(s, { type: "toggle", pickId: "overflow", call: "trust" });
    expect(blocked).toBe(s); // unchanged reference — rejected
    expect(blocked.calls["overflow"]).toBeUndefined();
  });

  it("still allows changing an existing call at the ceiling", () => {
    let s = emptyEntry();
    for (let i = 0; i < MAX_PICKS; i++) {
      s = pickemReducer(s, { type: "toggle", pickId: `p${i}`, call: "trust" });
    }
    const changed = pickemReducer(s, { type: "toggle", pickId: "p0", call: "fade" });
    expect(changed.calls["p0"]).toBe("fade");
  });

  it("submit requires at least one call and is then immutable", () => {
    const noCalls = pickemReducer(emptyEntry(), { type: "submit", at: "t" });
    expect(noCalls.lockedAt).toBeNull(); // refused — nothing to submit

    let s = pickemReducer(emptyEntry(), { type: "toggle", pickId: "a", call: "trust" });
    s = pickemReducer(s, { type: "submit", at: "2026-06-10T00:00:00.000Z" });
    expect(s.lockedAt).toBe("2026-06-10T00:00:00.000Z");

    // post-submit edits are rejected
    const afterToggle = pickemReducer(s, { type: "toggle", pickId: "b", call: "fade" });
    expect(afterToggle).toBe(s);
    expect(afterToggle.calls["b"]).toBeUndefined();
  });
});

// ============================================================
// Component render + behavior
// ============================================================
describe("BeatTheModel component", () => {
  it("renders the picks with Trust/Fade controls", () => {
    render(<BeatTheModel slate={mkSlate([mkPick()])} />);
    expect(screen.getByText("Ravens +3.5")).toBeInTheDocument();
    expect(screen.getByLabelText(/Trust the model on Ravens \+3\.5/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fade the model on Ravens \+3\.5/)).toBeInTheDocument();
  });

  it("does NOT show any win/loss outcome before the slate is locked", () => {
    render(<BeatTheModel slate={mkSlate([mkPick({ result: "WIN" })])} />);
    // even though the underlying result is WIN, an unlocked slate shows no grade
    expect(screen.queryByText(/You called it/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Model won this one/)).not.toBeInTheDocument();
  });

  it("after locking, a PENDING pick shows 'Awaiting settlement' — never a fabricated result", () => {
    render(<BeatTheModel slate={mkSlate([mkPick({ result: "PENDING" })])} />);
    fireEvent.click(screen.getByLabelText(/Trust the model on Ravens/));
    fireEvent.click(screen.getByRole("button", { name: /Submit slate/ }));
    expect(screen.getByText(/Awaiting settlement/)).toBeInTheDocument();
    expect(screen.queryByText(/You called it/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Model won this one/)).not.toBeInTheDocument();
  });

  it("after locking, a settled WIN that the user trusted shows 'You called it'", () => {
    render(<BeatTheModel slate={mkSlate([mkPick({ result: "WIN" })])} />);
    fireEvent.click(screen.getByLabelText(/Trust the model on Ravens/));
    fireEvent.click(screen.getByRole("button", { name: /Submit slate/ }));
    expect(screen.getByText(/You called it/)).toBeInTheDocument();
  });

  it("persists a locked slate to localStorage (anonymous, local-only)", () => {
    render(<BeatTheModel slate={mkSlate([mkPick()])} />);
    fireEvent.click(screen.getByLabelText(/Trust the model on Ravens/));
    fireEvent.click(screen.getByRole("button", { name: /Submit slate/ }));
    const store = loadStore();
    expect(store.entries).toHaveLength(1);
    expect(store.entries[0]!.lockedAt).not.toBeNull();
    expect(store.entries[0]!.calls).toEqual({ "pick-1": "trust" });
  });
});

// ============================================================
// Gaming-stance guardrails — source-level invariants
// ============================================================
describe("gaming-stance guardrails (source invariants)", () => {
  const componentSrc = readFileSync(
    resolve(__dirname, "../beat-the-model.tsx"),
    "utf8",
  );
  const pageSrc = readFileSync(
    resolve(__dirname, "../../../app/picks/beat-the-model/page.tsx"),
    "utf8",
  );

  it("contains NO money / stake / wager / payout vocabulary", () => {
    const forbidden =
      /\b(wager|stake|bet|payout|deposit|withdraw|entry\s*fee|buy[-\s]?in|prize\s*pool|cash\s*out|real\s*money)\b/i;
    expect(componentSrc).not.toMatch(forbidden);
    expect(pageSrc).not.toMatch(forbidden);
  });

  it("imports NO payment/charge SDK (stripe/checkout/charge)", () => {
    const forbiddenImport = /\b(stripe|checkout|createCharge|paymentIntent)\b/i;
    expect(componentSrc).not.toMatch(forbiddenImport);
    expect(forbiddenImport.test(pageSrc)).toBe(false);
  });

  it("only persists via localStorage — no network write (fetch/axios/POST) in the client component", () => {
    expect(componentSrc).toContain("localStorage");
    expect(componentSrc).not.toMatch(/\bfetch\(/);
    expect(componentSrc).not.toMatch(/\.post\(/);
    expect(componentSrc).not.toMatch(/XMLHttpRequest/);
  });

  it("the page route is additive and default-OFF (flag-gated, 404 when disabled)", () => {
    expect(pageSrc).toContain("NEXT_PUBLIC_BEAT_THE_MODEL");
    expect(pageSrc).toContain("notFound()");
  });
});
