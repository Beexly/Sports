import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Honest degraded states - sealed-era edition.
 *
 * The T-outage-sweep doctrine (PRs #87/#89) was: a page whose data layer
 * fails must say so plainly, never render the failure as a reassuring
 * "healthy" state. This file originally pinned that doctrine on three
 * live data surfaces (/board, /proof, / home) by executing the real page
 * components with their loaders mocked to degraded shapes.
 *
 * REPOINTS (2026-11-04 board-cluster triage): the sealed-era redesign
 * removed two of those three data surfaces entirely.
 *   /board  → the under-construction stub. There is no live board, no
 *             loader, no state to degrade. The outage-banner semantics
 *             are retired with the page, and the prohibition becomes
 *             structural: the stub renders nothing and cannot be fed a
 *             fabricated healthy state (it imports no board loader).
 *   / home  → the static RedlineWorld + responsible close. There is no
 *             board state, no nflverse load, no calibration load. The
 *             reassuring-live-zero copy ("Gate holding", "0 cleared",
 *             "Intake warming up") has no surface left to render on; the
 *             honesty framing is carried by the RiskDisclosure in the
 *             responsible close.
 *   /proof  → UNCHANGED: still a live data surface with a real outage
 *             path. The outage tests below are untouched and still pin
 *             the original doctrine where it still applies.
 *
 * These are NON-VACUOUS: the page components are executed and their
 * element trees walked for the actual rendered branches (child
 * components are not rendered, so prop text is read from props and child
 * text from children).
 */

const mocks = vi.hoisted(() => ({
  proof: vi.fn(),
}));

vi.mock("@/lib/proof/load-proof-of-record", () => ({ loadProofOfRecord: mocks.proof }));

import BoardPage from "@/app/board/page";
import HomePage from "@/app/page";
import ProofPage from "@/app/proof/page";
import { db } from "@sports/db";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

/** All visible text: string children AND string prop values (door stats live in
 *  props because DoorCard is not rendered by the page function). */
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
      if (key === "children") continue;
      if (typeof value === "string") out.push(value);
    }
    collectText(node.props.children, out);
  }
}

function textOf(tree: unknown): string {
  const out: string[] = [];
  collectText(tree, out);
  return out.join("");
}

function collectTestIds(node: unknown, out: Set<string>): void {
  if (node == null || typeof node === "boolean") return;
  if (Array.isArray(node)) {
    for (const child of node) collectTestIds(child, out);
    return;
  }
  if (isElement(node)) {
    const id = node.props["data-testid"];
    if (typeof id === "string") out.add(id);
    collectTestIds(node.props.children, out);
  }
}

function testIdsOf(tree: unknown): Set<string> {
  const out = new Set<string>();
  collectTestIds(tree, out);
  return out;
}

const webRoot = resolve(__dirname, "..");
const readWeb = (rel: string): string =>
  readFileSync(resolve(webRoot, rel), "utf8");

// ── shared fixture ───────────────────────────────────────────────────────────

const NOW = "2026-06-17T16:00:00.000Z";

beforeEach(() => {
  mocks.proof.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── /board: structurally unable to render a dishonest live state ─────────────

describe("/board - the parked stub renders no board state at all", () => {
  it("renders the under-construction notice and no live-board UI", async () => {
    const tree = await BoardPage();
    const ids = testIdsOf(tree);
    const text = textOf(tree);

    // The stub's one honesty surface: it names the construction state and
    // routes to the two live surfaces instead of pretending to be a board.
    expect(ids.has("under-construction-notice")).toBe(true);
    expect(text).toMatch(/under construction/i);
    expect(text).toContain("/packages");
    expect(text).toContain("/fantasy/dfs");

    // The retired live-board surfaces must not exist on the stub: no
    // suppression banner, no board-class banner, no freshness tile, and
    // none of the dead sample/preview/demo copy.
    expect(ids.has("board-suppression-banner")).toBe(false);
    expect(ids.has("board-class-banner")).toBe(false);
    expect(ids.has("board-freshness")).toBe(false);
    expect(text).not.toContain("Showing deterministic sample board data");
    expect(text).not.toContain("Preview mode");
    expect(text).not.toContain("Demo rows hidden");
    expect(text).not.toContain("Last refresh");
  });

  it("imports no board loader - there is no data path to feed a fake healthy state", () => {
    const src = readWeb("app/board/page.tsx");
    expect(src).not.toContain("loadBoardState");
    expect(src).not.toContain("loadBoardPasses");
    expect(src).not.toContain("loadPublicCalibrationReport");
  });
});

// ── / (home): static surface - no degraded state exists to fabricate ─────────

describe("/ (home) - the static homepage has no data surface to degrade dishonestly", () => {
  it("renders the responsible close and no live-board/outage copy", async () => {
    const tree = await HomePage();
    const text = textOf(tree);

    // The honest framing of the static homepage is the responsible close
    // (RiskDisclosure + trust links), not a data-state banner.
    expect(testIdsOf(tree).has("homepage-responsible-close")).toBe(true);
    expect(text).toContain("The math can point. The decision stays yours.");

    // The retired loader-era copy has no surface left to render on. Pin
    // its absence so it can never be reintroduced as a "healthy" render
    // of a data layer that does not exist here.
    expect(text).not.toContain("Gate holding");
    expect(text).not.toContain("Board temporarily unavailable");
    expect(text).not.toContain("Intake warming up");
    expect(text).not.toContain("Live player data unavailable");
    expect(text).not.toContain("Quiet slate. Nothing forced.");
    expect(text).not.toMatch(/Today's picks\s*0/);
    expect(text).not.toContain("0 cleared");
    expect(text).not.toContain("cleared · 0 gated");
  });

  it("imports no data loader - the outage the doctrine guarded against cannot occur here", () => {
    const src = readWeb("app/page.tsx");
    expect(src).not.toContain("loadBoardState");
    expect(src).not.toContain("loadBoardPasses");
    expect(src).not.toContain("loadPublicCalibrationReport");
    expect(src).not.toContain("loadNflverseUsagePulse");
    expect(src).not.toContain("MethodologySection");
    expect(src).not.toContain("NflverseLabDoor");
    expect(src).toContain("RiskDisclosure");
  });
});

// ── Finding 2: /proof suppresses the fabricated freshness stamp on outage ─────

describe("/proof - outage suppresses the freshness stamp; no synthesized generatedAt", () => {
  it("REAL loader outage: internal DB failure → ledgerUnreachable → page renders the unreachable card, no stamp", async () => {
    // Exercise the ACTUAL path a real outage takes. A real ledger DB outage does
    // NOT make loadProofOfRecord reject - its internal db.pick.findMany rejects
    // and the loader must resolve an explicit ledgerUnreachable signal. Drive the
    // REAL loader with the DB call failing, then feed its real output to the page.
    const { loadProofOfRecord } = await vi.importActual<
      typeof import("@/lib/proof/load-proof-of-record")
    >("@/lib/proof/load-proof-of-record");
    const spy = vi
      .spyOn(db.pick, "findMany")
      .mockRejectedValue(new Error("ledger DB unreachable"));

    try {
      const board = await loadProofOfRecord();

      // Fail-safe + honest: the loader RESOLVED (never threw), flagged the
      // outage, and synthesized neither a freshness stamp nor an empty-set root.
      expect(board.ledgerUnreachable).toBe(true);
      expect(board.picks).toHaveLength(0);
      expect(board.generatedAt).toBe("");
      expect(board.merkleRoot).toBe("");

      // Wire the page to the loader's REAL outage signal and render it.
      mocks.proof.mockResolvedValue(board);
      const tree = await ProofPage();
      const ids = testIdsOf(tree);
      const text = textOf(tree);

      expect(ids.has("proof-unreachable-state")).toBe(true);
      expect(ids.has("proof-freshness-stamp")).toBe(false);
      expect(ids.has("proof-empty-state")).toBe(false);
      expect(text).toContain("temporarily unreachable");
      // The fabricated "Board generated <now>" stamp must not appear on outage.
      expect(text).not.toContain("Board generated");
    } finally {
      spy.mockRestore();
    }
  });

  it("successful empty ledger still renders the freshness stamp and honest empty state", async () => {
    mocks.proof.mockResolvedValue({
      generatedAt: NOW,
      picks: [],
      merkleRoot: "a".repeat(64),
      totalSettled: 0,
      ledgerUnreachable: false,
    });
    const tree = await ProofPage();
    const ids = testIdsOf(tree);
    const text = textOf(tree);

    expect(ids.has("proof-freshness-stamp")).toBe(true);
    expect(ids.has("proof-empty-state")).toBe(true);
    expect(ids.has("proof-unreachable-state")).toBe(false);
    expect(text).toContain("Board generated");
  });
});
