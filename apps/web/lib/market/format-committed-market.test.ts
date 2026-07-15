import { describe, expect, it } from "vitest";
import { formatCommittedMarket } from "./format-committed-market";

describe("formatCommittedMarket", () => {
  it("renders the canonical selected-side market with its entry price", () => {
    expect(formatCommittedMarket("BUF +3.5", -110)).toBe("BUF +3.5 at -110");
    expect(formatCommittedMarket("OVER 49", 105)).toBe("OVER 49 at +105");
    expect(formatCommittedMarket("KC ML (+120)", 120)).toBe("KC ML (+120) at +120");
  });

  it("withholds missing selections and unsupported prices", () => {
    expect(formatCommittedMarket("", -110)).toBe("Market values unavailable");
    expect(formatCommittedMarket("BUF +3.5", -39)).toBe("Market values unavailable");
    expect(formatCommittedMarket(undefined, -110)).toBe("Market values unavailable");
  });
});
