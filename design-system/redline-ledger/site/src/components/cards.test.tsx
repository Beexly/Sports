import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../App";
import { AssetDownload } from "../components/AssetDownload";
import { DfsCard } from "../components/DfsCard";
import { LINEUP } from "../data/week8";

describe("REDLINE LEDGER active cards", () => {
  it("switches between board, DFS, and held views", () => {
    render(<App />);

    expect(screen.getByText("Highest moneyline edge on the locked card")).toBeInTheDocument();
    const ledger = within(screen.getByRole("region", { name: "Read the discrepancy." }));
    expect(ledger.getByText("CHI ML")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "DFS" }));
    expect(screen.getAllByRole("table", { name: /13-game flagship GPP/i })).toHaveLength(1);
    expect(ledger.queryByRole("table")).not.toBeInTheDocument();
    expect(ledger.queryByText("CHI ML")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Held" }));
    expect(screen.getAllByText("The college JEV spine and active injury reallocation tables are not wired. Every game stays held.")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Held" })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders a DFS card with a stable tabular salary figure", () => {
    render(<DfsCard row={LINEUP[0]} />);
    expect(screen.getByText("Caleb Williams")).toBeInTheDocument();
    expect(screen.getByText("$6,100")).toHaveClass("primary-number");
    expect(screen.getByText("CHI · QB")).toBeInTheDocument();
  });

  it("offers real asset downloads", () => {
    render(
      <AssetDownload href="/assets/cards/gse-dfs-card.png" label="Download DFS card">
        PNG
      </AssetDownload>,
    );
    expect(screen.getByRole("link", { name: "Download DFS card" })).toHaveAttribute(
      "href",
      "/assets/cards/gse-dfs-card.png",
    );
    expect(screen.getByRole("link", { name: "Download DFS card" })).toHaveAttribute("download");
  });
});
