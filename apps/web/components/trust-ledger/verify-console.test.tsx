import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerifyConsole } from "./verify-console";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const RECEIPT_HASH = "a".repeat(64);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VerifyConsole", () => {
  it("renders the canonical selected-side spread returned by the verifier", async () => {
    const response = {
      found: true,
      verified: true,
      sealed: false,
      frozenAt: "2026-07-02T10:00:00.000Z",
      modelVersion: "v5.0",
      result: "WIN",
      game: {
        matchup: "BUF @ KC",
        sport: "NFL",
        commenceTime: "2026-07-02T12:00:00.000Z",
      },
      committed: {
        selection: "BUF +3.5",
        entryOdds: -110,
        marketFairProb: 0.5,
        confidence: 72,
        edgeScore: 4.1234,
        modelProb: null,
      },
      payload: "selection=BUF +3.5",
      contentHash: RECEIPT_HASH,
      pickId: "p-away",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    render(<VerifyConsole initialHash={RECEIPT_HASH} />);

    expect(await screen.findByText("BUF +3.5 at -110")).toBeInTheDocument();
    expect(screen.queryByText("-3.5 at -110")).toBeNull();
  });
});
