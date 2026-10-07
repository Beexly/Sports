import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * New-customer journey: what renders when EVERY underlying collection is empty.
 *
 * A pre-launch install has zero rows in every table and, on a bad sync, empty
 * data snapshots. These surfaces were never exercised in that state, so three
 * defects shipped invisibly behind seeded fixtures:
 *
 *   1. /watchlist — the zero-follow card told a brand-new member to "Start with
 *      a suggested team below", but the "Suggested teams" section only renders
 *      when `suggestions.length > 0`. With zero Team rows (a fresh install) or a
 *      failed team load, it pointed at nothing, and FollowButton exists on NO
 *      other surface — so there was no way to act on the instruction at all.
 *   2. /stats/players and /stats/teams — "Avg confidence" divides by
 *      `array.length` with no guard, rendering the literal string "NaN%" in a
 *      customer-facing stat card. /stats/teams additionally captioned a missing
 *      leader with a fabricated "Offensive env: 0".
 *   3. /stats/compare — `comparePlayers` fell back to `loadPlayers()[0]!` /
 *      `[1]!`. On an empty (or single-row) snapshot both are `undefined` and the
 *      `categories` map threw `Cannot read properties of undefined`, taking the
 *      page to the error boundary instead of an honest empty state.
 *
 * These tests are NON-VACUOUS: each executes the REAL page component against a
 * GENUINELY empty dataset, walks the produced element tree (rendering nested
 * sync and async components), and asserts both the honest copy and the ABSENCE
 * of "NaN" / "Infinity" / "undefined" in visible text. A fixture with one seeded
 * row would pass against the pre-fix code and prove nothing.
 *
 * The /stats trio feeds the real `lib/statking/product` loaders an empty JSON
 * snapshot through a `node:fs` mock, so the production read path runs unchanged.
 */

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  entitlements: vi.fn(),
  listWatchlistEntries: vi.fn(),
  teamFindMany: vi.fn(),
  playerFindMany: vi.fn(),
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/entitlements", () => ({ getUserEntitlements: mocks.entitlements }));
vi.mock("@/lib/watchlist/db", () => ({ listWatchlistEntries: mocks.listWatchlistEntries }));
vi.mock("@sports/db", () => ({
  db: {
    team: { findMany: mocks.teamFindMany },
    player: { findMany: mocks.playerFindMany },
  },
}));

// Chrome carries no journey data; stub it so the walker never enters it.
vi.mock("@/components/ui/nav", () => ({ Nav: (): null => null }));
vi.mock("@/components/ui/footer", () => ({ Footer: (): null => null }));
// FollowButton is a client component with hooks — the walker cannot invoke it.
// Its label is still rendered as a prop-visible string so suggestions stay
// observable in `textOf`.
vi.mock("@/components/watchlist/follow-button", () => ({
  FollowButton: (): null => null,
}));

// Feed the REAL statking loaders a genuinely empty snapshot. `readJson` resolves
// its data root with existsSync and reads with readFileSync; both are keyed on
// the requested path so each loader gets its own empty envelope.
vi.mock("node:fs", () => ({
  default: { existsSync: mocks.existsSync, readFileSync: mocks.readFileSync },
  existsSync: mocks.existsSync,
  readFileSync: mocks.readFileSync,
}));

import WatchlistPage from "@/app/watchlist/page";
import StatsPlayersPage from "@/app/stats/players/page";
import StatsTeamsPage from "@/app/stats/teams/page";
import StatsComparePage from "@/app/stats/compare/page";
import { comparePlayers, loadPlayers, loadTeams } from "@/lib/statking/product";

// ── element-tree helpers ─────────────────────────────────────────────────────

interface ElementNode {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
}

function isElement(node: unknown): node is ElementNode {
  return (
    typeof node === "object" &&
    node !== null &&
    "props" in node &&
    typeof (node as { props: unknown }).props === "object" &&
    (node as { props: unknown }).props !== null
  );
}

/**
 * Render the tree the way an RSC stream would: invoke every function component
 * (sync or async) and inline its output, so text produced by nested components
 * — not just text passed as children — is observable.
 */
async function deepRender(node: unknown, depth = 0): Promise<unknown> {
  if (node == null || typeof node === "boolean") return node;
  if (typeof node === "string" || typeof node === "number") return node;
  if (Array.isArray(node)) return Promise.all(node.map((child) => deepRender(child, depth)));
  if (isElement(node)) {
    if (typeof node.type === "function" && depth < 60) {
      const produced = await (node.type as (props: unknown) => unknown)(node.props);
      return deepRender(produced, depth + 1);
    }
    const children = await deepRender(node.props.children, depth);
    return { ...node, props: { ...node.props, children } };
  }
  return node;
}

/** All visible text: string/number children AND string prop values. */
function collectText(node: unknown, out: string[]): void {
  if (node == null || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) collectText(child, out);
    return;
  }
  if (isElement(node)) {
    for (const [key, value] of Object.entries(node.props)) {
      if (key === "children" || key === "className" || key === "style") continue;
      if (typeof value === "string" || typeof value === "number") out.push(String(value));
    }
    collectText(node.props.children, out);
  }
}

async function textOf(tree: unknown): Promise<string> {
  const out: string[] = [];
  collectText(await deepRender(tree), out);
  return out.join(" ");
}

/** The three tokens that must never reach customer-visible copy. */
function expectNoBrokenNumbers(text: string): void {
  expect(text).not.toMatch(/NaN/);
  expect(text).not.toMatch(/Infinity/);
  expect(text).not.toMatch(/undefined/);
}

// ── empty statking snapshots ─────────────────────────────────────────────────

/** The envelope each statking snapshot file is expected to carry, all empty. */
const EMPTY_SNAPSHOT: Record<string, string> = {
  "players.json": '{"players":[]}',
  "teams.json": '{"teams":[]}',
};

function installEmptySnapshots(): void {
  mocks.existsSync.mockReturnValue(true);
  mocks.readFileSync.mockImplementation((file: unknown) => {
    const name = String(file).split("/").pop() ?? "";
    return EMPTY_SNAPSHOT[name] ?? "{}";
  });
}

describe("new-user journey — /watchlist with zero follows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: "user_new", email: "new@example.com" } });
    mocks.entitlements.mockResolvedValue({ tier: "FREE", canGetAlerts: false });
    mocks.listWatchlistEntries.mockResolvedValue({ ok: true, data: [] });
    mocks.playerFindMany.mockResolvedValue([]);
  });

  it("does not point a brand-new member at suggestions that are not on the page", async () => {
    // A genuinely fresh install: zero follows AND zero Team rows.
    mocks.teamFindMany.mockResolvedValue([]);

    const text = await textOf(await WatchlistPage());

    expect(text).toContain("Nothing followed yet");
    // The dead pointer: there is no "below" when suggestions are empty.
    expect(text).not.toContain("Start with a suggested team below");
    // ...replaced by copy that is actually true.
    expect(text).toContain("No teams have loaded yet");
    expectNoBrokenNumbers(text);
  });

  it("still points at the suggestions when suggestions really are rendered", async () => {
    // Guard must be conditional, not permanently off.
    mocks.teamFindMany.mockResolvedValue([{ id: "team_1", name: "Kansas City Chiefs" }]);

    const text = await textOf(await WatchlistPage());

    expect(text).toContain("Nothing followed yet");
    expect(text).toContain("Start with a suggested team below");
    expect(text).not.toContain("No teams have loaded yet");
    expectNoBrokenNumbers(text);
  });

  it("keeps the honest copy when the team load itself fails", async () => {
    // A rejected team query also yields zero suggestions (the page catches to []).
    mocks.teamFindMany.mockRejectedValue(new Error("db down"));

    const text = await textOf(await WatchlistPage());

    expect(text).not.toContain("Start with a suggested team below");
    expect(text).toContain("No teams have loaded yet");
    expectNoBrokenNumbers(text);
  });
});

describe("new-user journey — /stats with an empty snapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installEmptySnapshots();
  });

  it("the snapshot really is empty (fixture is not silently seeded)", () => {
    expect(loadPlayers()).toHaveLength(0);
    expect(loadTeams()).toHaveLength(0);
  });

  it("/stats/players renders no NaN% in the Avg confidence card", async () => {
    const text = await textOf(StatsPlayersPage({ searchParams: {} }));

    expectNoBrokenNumbers(text);
    expect(text).toContain("The player snapshot is empty");
  });

  it("/stats/teams renders no NaN% and no fabricated zero-environment leader", async () => {
    const text = await textOf(StatsTeamsPage());

    expectNoBrokenNumbers(text);
    // A missing leader must not be captioned with an invented environment score.
    expect(text).not.toContain("Offensive env: 0");
    expect(text).not.toContain("Fantasy env: 0");
    expect(text).toContain("The team-environment snapshot is empty");
  });

  it("comparePlayers returns null instead of throwing on an empty roster", () => {
    expect(() => comparePlayers("p001", "p002")).not.toThrow();
    expect(comparePlayers("p001", "p002")).toBeNull();
  });

  it("/stats/compare renders an honest unavailable state instead of crashing", async () => {
    let text = "";
    expect(() => {
      text = "";
      StatsComparePage({ searchParams: {} });
    }).not.toThrow();

    text = await textOf(StatsComparePage({ searchParams: {} }));
    expect(text).toContain("Comparison needs two players");
    expectNoBrokenNumbers(text);
  });
});
