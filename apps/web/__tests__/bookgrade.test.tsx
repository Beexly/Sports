import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BookGradePage from "@/app/bookgrade/page";
import {
  BOOKGRADE_V1,
  PULSE_SCORE_V1,
  BOOKGRADE_PROVENANCE,
} from "@/lib/truthmetrics/bookgrade-v1";

vi.mock("@/components/ui/nav", () => ({
  Nav: (): null => null,
}));

vi.mock("@/components/ui/footer", () => ({
  Footer: (): null => null,
}));

describe("BookGrade page", () => {
  it("renders the mandatory honesty copy", () => {
    render(<BookGradePage />);
    expect(screen.getByTestId("bookgrade-mandatory-copy")).toHaveTextContent(
      /A quality score, not a betting signal/
    );
    expect(screen.getByTestId("bookgrade-mandatory-copy")).toHaveTextContent(
      /It tells you what a price historically cost at a book, not which side to take/
    );
  });

  it("renders the BookGrade table with all rows", () => {
    render(<BookGradePage />);
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThanOrEqual(BOOKGRADE_V1.length + 1);
  });

  it("renders the PulseScore table with all rows", () => {
    render(<BookGradePage />);
    expect(screen.getAllByText(/PulseScore/).length).toBeGreaterThanOrEqual(2);
  });

  it("renders provenance and market caveat", () => {
    render(<BookGradePage />);
    expect(screen.getByTestId("bookgrade-provenance")).toHaveTextContent(
      new RegExp(BOOKGRADE_PROVENANCE.games.toString())
    );
    expect(screen.getByText(/Totals only/)).toBeTruthy();
  });

  it("does not contain banned claim words", () => {
    render(<BookGradePage />);
    const banned = ["exploitable", "fade", "guaranteed", "beat the book"];
    const body = document.body.textContent || "";
    for (const word of banned) {
      expect(body.toLowerCase()).not.toContain(word);
    }
  });
});

describe("bookgrade-v1 golden numbers (exact L-18 transcription)", () => {
  // Sentinel values pinned verbatim from docs/ops/hermes/l18-book-metrics/RESULTS.md.
  // A silent transcription drift on a PUBLIC metrics page is exactly the class
  // of small lie this platform exists to prevent — these fail loudly instead.
  it("pins the BookGrade sentinels", async () => {
    const { BOOKGRADE_V1 } = await import("@/lib/truthmetrics/bookgrade-v1");
    const byBook = Object.fromEntries(BOOKGRADE_V1.map((r: { book: string }) => [r.book, r]));
    expect(byBook["fanatics"]).toMatchObject({ bpqi: -0.0021, clusteredT: -2.05, games: 227 });
    expect(byBook["betus"]).toMatchObject({ bpqi: 0.0021, clusteredT: 1.95, games: 241 });
    expect(BOOKGRADE_V1).toHaveLength(11);
  });

  it("pins the PulseScore sentinels", async () => {
    const { PULSE_SCORE_V1 } = await import("@/lib/truthmetrics/bookgrade-v1");
    const byBook = Object.fromEntries(PULSE_SCORE_V1.map((r: { book: string }) => [r.book, r]));
    expect(byBook["mybookieag"].burs).toBeCloseTo(0.51, 10);
    expect(byBook["fanduel"].burs).toBeCloseTo(0.07, 10);
    expect(byBook["williamhill_us"].burs).toBeCloseTo(0.061, 10);
    expect(PULSE_SCORE_V1).toHaveLength(11);
  });
});
