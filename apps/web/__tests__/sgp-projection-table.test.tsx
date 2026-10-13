import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SgpProjectionTable } from "@/components/sgp/sgp-projection-table";

describe("SgpProjectionTable", () => {
  it("renders game, market, and our projection as a plain percentage", () => {
    render(
      <SgpProjectionTable
        rows={[
          {
            game: "Buffalo Bills at Los Angeles Rams",
            commenceTime: "2026-10-12T17:00:00.000Z",
            market: "Example market one",
            projectionPct: 11.8,
          },
        ]}
      />,
    );
    expect(screen.getByText("Game")).toBeTruthy();
    expect(screen.getByText("Market")).toBeTruthy();
    expect(screen.getByText("Our projection")).toBeTruthy();
    expect(screen.getByText("Buffalo Bills at Los Angeles Rams")).toBeTruthy();
    expect(screen.getByText("Example market one")).toBeTruthy();
    expect(screen.getByText("11.8%")).toBeTruthy();
  });

  it("renders nothing for no rows", () => {
    const { container } = render(<SgpProjectionTable rows={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
