import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WireFetchResult } from "@/lib/news/rss";
import { TheBeat } from "./the-beat";

function wireResult(
  overrides: Partial<WireFetchResult> = {},
): WireFetchResult {
  return {
    status: "AVAILABLE",
    items: [],
    configuredFeedCount: 1,
    successfulFeedCount: 1,
    failedFeedCount: 0,
    ...overrides,
  };
}

describe("TheBeat publication states", () => {
  it("renders the unavailable state when publication is not configured", () => {
    render(<TheBeat wireResult={null} />);
    expect(
      screen.getAllByText(/No approved signal feed is published right now/i),
    ).not.toHaveLength(0);
  });

  it("distinguishes an approved empty feed check from publication", () => {
    render(<TheBeat wireResult={wireResult()} />);
    expect(
      screen.getByText(/Approved feeds checked · no qualifying signals in window/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Published wire/i)).toBeNull();
  });

  it("renders a total outage instead of calling the wire published", () => {
    render(
      <TheBeat
        wireResult={wireResult({
          status: "OUTAGE",
          successfulFeedCount: 0,
          failedFeedCount: 1,
        })}
      />,
    );
    expect(
      screen.getByText(/Approved feed outage · no reports shown/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Published wire/i)).toBeNull();
  });

  it("labels real items as source-attributed feed signals", () => {
    render(
      <TheBeat
        wireResult={wireResult({
          items: [
            {
              id: "signal-1",
              source: "Approved wire feed",
              tier: "Verified",
              team: "NFL",
              headline: "Starter ruled out for Sunday",
              signal: "injury-out",
              minutesAgo: 12,
            },
          ],
        })}
      />,
    );
    expect(screen.getByText(/Source-attributed feed signals/i)).toBeInTheDocument();
    expect(screen.getByText("Starter ruled out for Sunday")).toBeInTheDocument();
  });
});
