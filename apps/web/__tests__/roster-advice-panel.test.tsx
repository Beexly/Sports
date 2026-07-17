import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { RosterAdvicePanel } from "@/components/fantasy/roster-advice-panel";
import type { Team } from "@/lib/integrations/sleeper";

/**
 * RosterAdvicePanel — real waiver signal on a synced Sleeper roster.
 *
 * Every non-"ok" response state must render its own honest message, never a
 * blank/broken view and never stale or fabricated adds/drops/reads.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const YOU: Team = {
  rosterId: 1,
  ownerId: "u1",
  record: "8-5",
  points: 1234.5,
  starters: [{ id: "p1", name: "Real Starter", pos: "WR", team: "KC", injury: "", starter: true }],
  bench: [{ id: "p2", name: "Real Bench Guy", pos: "RB", team: "BUF", injury: "", starter: false }],
  all: [],
};

function mockFetchOnce(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status,
      ok: status >= 200 && status < 300,
      json: async () => body,
    }),
  );
}

describe("RosterAdvicePanel", () => {
  it("renders real adds/drops/reads with their real reason text on success", async () => {
    mockFetchOnce(200, {
      success: true,
      data: {
        status: "ok",
        season: 2026,
        throughWeek: 5,
        adds: [
          { name: "Add Guy", team: "SF", position: "WR", processGrade: 82, productionPct: 40, signal: "buy-low", addScore: 97, reason: "Process outruns production, buy before the room notices." },
        ],
        drops: [
          { name: "Drop Guy", team: "NYJ", position: "RB", processGrade: 20, signal: "in-line", reason: "Weak process grade: a cut candidate." },
        ],
        reads: [
          { name: "Real Starter", team: "KC", position: "WR", processGrade: 70, read: "ride", reason: "Process and production aligned and strong." },
        ],
      },
    });

    render(<RosterAdvicePanel you={YOU} />);

    await waitFor(() => expect(screen.getByText("Add Guy")).toBeInTheDocument());
    expect(screen.getByText("Process outruns production, buy before the room notices.")).toBeInTheDocument();
    expect(screen.getByText("Drop Guy")).toBeInTheDocument();
    expect(screen.getByText("Weak process grade: a cut candidate.")).toBeInTheDocument();
    expect(screen.getByText("Real Starter")).toBeInTheDocument();
    expect(screen.getByText("Process and production aligned and strong.")).toBeInTheDocument();
  });

  it("renders an honest upgrade prompt, not data, on a 403 insufficient_tier response", async () => {
    mockFetchOnce(403, { success: false, error: "insufficient_tier", message: "Pro or Elite required." });

    render(<RosterAdvicePanel you={YOU} />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/live today for Pro and Elite/i);
    expect(screen.queryByText("Add targets")).not.toBeInTheDocument();
  });

  it("renders an honest unavailable message, never stale/fake data, when the model reports source-error", async () => {
    // The REAL route contract: a live nflverse outage comes back as HTTP 200
    // with success:false and data.status "source-error" (see
    // app/api/intelligence/roster-advice/route.ts) — the fixture must match
    // the route, not the component.
    mockFetchOnce(200, { success: false, data: { status: "source-error", error: "nflverse unreachable" } });

    render(<RosterAdvicePanel you={YOU} />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/temporarily unavailable/i);
    expect(screen.queryByText("Add targets")).not.toBeInTheDocument();
  });

  it("renders an honest sign-in prompt, not a transient-error message, for a signed-out viewer (401)", async () => {
    mockFetchOnce(401, { success: false, error: "authentication_required", message: "Sign in required." });

    render(<RosterAdvicePanel you={YOU} />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/sign in/i);
    expect(alert.textContent).not.toMatch(/try again/i);
    expect(screen.queryByText("Add targets")).not.toBeInTheDocument();
  });

  it("renders honest empty-section messages instead of nothing when adds/drops/reads are all empty", async () => {
    mockFetchOnce(200, {
      success: true,
      data: { status: "ok", season: 2026, throughWeek: 5, adds: [], drops: [], reads: [] },
    });

    render(<RosterAdvicePanel you={YOU} />);

    await waitFor(() => expect(screen.getByText("No add targets surfaced this week.")).toBeInTheDocument());
    expect(screen.getByText("No drop candidates surfaced this week.")).toBeInTheDocument();
    expect(screen.getByText("No roster reads matched your synced players yet.")).toBeInTheDocument();
  });
});
