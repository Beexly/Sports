import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ConfidenceMeter,
  EmptyState,
  GalaxyMark,
  PickGradeTile,
  SiteFooter,
  Wordmark,
} from "../components";

describe("@sports/ui-brand components", () => {
  it("renders the canonical mark accessibly", () => {
    render(<GalaxyMark />);
    expect(screen.getByRole("img", { name: /galaxy sports edge mark/i })).toBeInTheDocument();
  });

  it("renders wordmark variants", () => {
    render(<Wordmark />);
    expect(screen.getByText("Galaxy")).toBeInTheDocument();
    expect(screen.getByText("Sports Edge")).toBeInTheDocument();
  });

  it("renders grade labels from brand package", () => {
    render(<PickGradeTile grade="ELITE_PLAY" />);
    expect(screen.getByText("Elite Play")).toBeInTheDocument();
  });

  it("renders confidence as a meter", () => {
    render(<ConfidenceMeter value={71} grade="SOLID_PLAY" />);
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "71");
  });

  it("makes empty state intentional", () => {
    render(<EmptyState />);
    expect(screen.getByText(/Nothing cleared the gate/i)).toBeInTheDocument();
  });

  it("derives legal footer from brand identity", () => {
    render(<SiteFooter />);
    expect(screen.getByText(/Galaxy Sports Edge/)).toBeInTheDocument();
  });
});
