import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GmLedgerView } from "@/components/fantasy/gm-ledger-view";
import { buildGmLedger } from "@/lib/fantasy/gm-ledger";

/**
 * FAN-08: GM Ledger renders fictional decisions with outcomes and a letter
 * grade. A visible demonstration banner must be the first thing rendered so
 * nobody mistakes the illustrative ledger for real roster history.
 */

afterEach(cleanup);

describe("GmLedgerView demonstration banner", () => {
  it("renders an unconditional demonstration/illustrative banner", () => {
    render(<GmLedgerView data={buildGmLedger()} />);
    expect(screen.getByText(/demonstration ledger/i)).toBeInTheDocument();
    expect(screen.getByText(/illustrative decisions/i)).toBeInTheDocument();
  });
});
