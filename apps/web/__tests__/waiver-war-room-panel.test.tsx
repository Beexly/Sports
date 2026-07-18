import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { WaiverWarRoomPanel } from "@/components/fantasy/waiver-war-room-panel";
import type { Team } from "@/lib/integrations/sleeper";

/**
 * WaiverWarRoomPanel — every non-"ok" state renders its own honest message;
 * a failed data LEG renders as unavailable, never as an empty "all clear".
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

describe("WaiverWarRoomPanel", () => {
  it("renders real collisions and disagreements, with both attributions, on success", async () => {
    mockFetchOnce(200, {
      success: true,
      data: {
        status: "ok",
        byes: {
          status: "ok",
          collisions: [{ bye: 7, players: [{ name: "Real Starter", pos: "WR", team: "KC" }, { name: "Real Bench Guy", pos: "RB", team: "BUF" }] }],
          unknown: [{ name: "Mystery Man", pos: "TE", team: "SF" }],
          season: 2026,
          attribution: "ADP data via FantasyFootballCalculator.com",
        },
        disagreements: {
          status: "ok",
          rows: [
            {
              name: "Contrarian Add",
              pos: "WR",
              team: "SF",
              onRoster: false,
              modelSignal: "buy-low",
              processGrade: 82,
              marketDirection: "dropping",
              marketCount: 1300,
              description: "The model reads buy-low (process grade 82); the market shows 1,300 recent drops across Sleeper leagues. Two live signals, opposite directions — decide with both in view.",
            },
          ],
          modelSeason: 2026,
          modelThroughWeek: 5,
          lookbackHours: 24,
          attribution: "Live league sync via the Sleeper API",
        },
      },
    });

    render(<WaiverWarRoomPanel you={YOU} />);

    await waitFor(() => expect(screen.getByText(/Week 7: 2 of your players sit/)).toBeInTheDocument());
    expect(screen.getByText("Contrarian Add")).toBeInTheDocument();
    expect(screen.getByText(/Two live signals, opposite directions/)).toBeInTheDocument();
    expect(screen.getByText(/No bye data joined for: Mystery Man/)).toBeInTheDocument();
    expect(screen.getByText(/FantasyFootballCalculator\.com/)).toBeInTheDocument();
    expect(screen.getByText(/Sleeper API/)).toBeInTheDocument();
  });

  it("a failed byes leg renders as unavailable — never as 'no collisions'", async () => {
    mockFetchOnce(200, {
      success: true,
      data: {
        status: "ok",
        byes: { status: "source-error", attribution: "ADP data via FantasyFootballCalculator.com" },
        disagreements: { status: "ok", rows: [], modelSeason: 2026, modelThroughWeek: 5, lookbackHours: 24, attribution: null },
      },
    });

    render(<WaiverWarRoomPanel you={YOU} />);

    await waitFor(() => expect(screen.getByText(/Live bye data is temporarily unavailable/)).toBeInTheDocument());
    expect(screen.queryByText(/No week has two or more/)).not.toBeInTheDocument();
    // The healthy leg still renders its honest empty state independently.
    expect(screen.getByText(/No conflicts to report/)).toBeInTheDocument();
  });

  it("a failed disagreements leg renders as unavailable — never as 'no conflicts'", async () => {
    mockFetchOnce(200, {
      success: true,
      data: {
        status: "ok",
        byes: { status: "ok", collisions: [], unknown: [], season: 2026, attribution: "ADP data via FantasyFootballCalculator.com" },
        disagreements: { status: "source-error" },
      },
    });

    render(<WaiverWarRoomPanel you={YOU} />);

    await waitFor(() => expect(screen.getByText(/Live model or market data is temporarily unavailable/)).toBeInTheDocument());
    expect(screen.queryByText(/No conflicts to report/)).not.toBeInTheDocument();
    // The healthy leg still renders its honest empty state independently.
    expect(screen.getByText(/No week has two or more/)).toBeInTheDocument();
  });

  it("renders the honest upgrade prompt, not data, on 403 insufficient_tier", async () => {
    mockFetchOnce(403, { success: false, error: "insufficient_tier", message: "Pro or Elite required." });

    render(<WaiverWarRoomPanel you={YOU} />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/live today for Pro and Elite/i);
    expect(screen.queryByText(/Bye-week collisions/)).not.toBeInTheDocument();
  });

  it("renders the honest sign-in prompt on 401 for signed-out viewers", async () => {
    mockFetchOnce(401, { success: false, error: "authentication_required", message: "Sign in required." });

    render(<WaiverWarRoomPanel you={YOU} />);

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/sign in/i);
    expect(screen.getByRole("alert").textContent).not.toMatch(/try again/i);
  });

  it("renders honest empty states for both legs when nothing is found", async () => {
    mockFetchOnce(200, {
      success: true,
      data: {
        status: "ok",
        byes: { status: "ok", collisions: [], unknown: [], season: 2026, attribution: "ADP data via FantasyFootballCalculator.com" },
        disagreements: { status: "ok", rows: [], modelSeason: 2026, modelThroughWeek: 5, lookbackHours: 24, attribution: null },
      },
    });

    render(<WaiverWarRoomPanel you={YOU} />);

    await waitFor(() => expect(screen.getByText(/No week has two or more of your matched players on bye/)).toBeInTheDocument());
    expect(screen.getByText(/No conflicts to report/)).toBeInTheDocument();
  });
});
