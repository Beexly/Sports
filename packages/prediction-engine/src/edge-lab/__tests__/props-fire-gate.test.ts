import { describe, expect, it } from "vitest";
import { FIRE_GATE_METHOD_TAG, firePostedProp } from "../props-fire-gate.js";

describe("firePostedProp", () => {
  it("does not fire a 51% model at −110 even if Shin e looks tiny-positive", () => {
    const r = firePostedProp(0.51, { overAmerican: -110, underAmerican: -110 });
    expect(FIRE_GATE_METHOD_TAG).toBe("props_fire_gate_v1");
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("expected ok");
    expect(r.fire).toBe(false);
    expect(r.refuse).toBe("no_book_clears");
    expect(r.priced).toBe(false);
  });

  it("fires when p clears a soft book and Shin e is positive", () => {
    const r = firePostedProp(
      0.58,
      { overAmerican: -105, underAmerican: -115 },
      [
        { book: "stiff", american: -130 },
        { book: "soft", american: -105 },
      ],
    );
    expect(r.ok).toBe(true);
    if (!r.ok || !r.fire) throw new Error("expected fire");
    expect(r.shop.book).toBe("soft");
    expect(r.priced).toBe(false);
  });

  it("refuses a missing book list and missing quote", () => {
    const r = firePostedProp(0.6, null, []);
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("expected denied");
    expect(r.refuse).toBe("no_books");
  });
});
