import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * P16-01 VERIFY — the homepage shell never waits on the nflverse archive.
 *
 * The original fix moved `loadNflverseUsagePulse()` out of the homepage's
 * blocking Promise.all and into a Suspense-bounded `NflverseLabDoor`. The
 * RedlineWorld rebuild removed the door from the homepage entirely, so the
 * invariant is now stronger and simpler: the front door does not import or
 * await the nflverse loader at all, and the pulse feature still exists in
 * NflverseLabDoor for the surfaces that render it.
 */
const mocks = vi.hoisted(() => ({
  nflverse: vi.fn(),
}));

vi.mock("@/lib/nflverse/usage-pulse", () => ({
  loadNflverseUsagePulse: mocks.nflverse,
}));

import HomePage from "@/app/page";
import { NflverseLabDoor } from "@/components/landing/nflverse-lab-door";

// ── element-tree helpers (same pattern as honest-degraded-states.test.ts) ────

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
  return out.join("\u0001");
}

beforeEach(() => {
  mocks.nflverse.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── tests ────────────────────────────────────────────────────────────────────

describe("P16-01 — homepage shell renders without awaiting nflverse loader", () => {
  it("resolves immediately even when loadNflverseUsagePulse hangs forever", async () => {
    // The nflverse loader is mocked to NEVER resolve. If the page still awaited
    // it, this test would time out.
    mocks.nflverse.mockReturnValue(
      new Promise(() => {
        /* never resolves: simulates the full-archive download hanging */
      }),
    );

    const tree = await HomePage();
    const text = textOf(tree);

    // The shell rendered without waiting for nflverse: the responsible close
    // and its disclosure are present in the returned tree.
    expect(text).toContain("The math can point. The decision stays yours.");
    expect(text).toContain("Close / Responsible Intelligence");
  });

  it("does not import or await the nflverse loader on the front door", () => {
    const pageSource = readFileSync(
      resolve(__dirname, "..", "app", "page.tsx"),
      "utf8",
    );
    expect(pageSource).not.toContain("loadNflverseUsagePulse");
    expect(pageSource).not.toContain("NflverseLabDoor");
    expect(pageSource).not.toMatch(/await\s+Promise\.all/);
  });

  it("keeps the pulse feature in NflverseLabDoor for the surfaces that render it", () => {
    const doorSource = readFileSync(
      resolve(__dirname, "..", "components", "landing", "nflverse-lab-door.tsx"),
      "utf8",
    );
    expect(doorSource).toContain("loadNflverseUsagePulse");
  });

  it("NflverseLabDoor renders real pulse data when the loader resolves", async () => {
    mocks.nflverse.mockResolvedValue({ status: "live", sourceRows: 1234 });

    const door = await NflverseLabDoor();
    const text = textOf(door);

    expect(text).toContain("1,234 live player rows");
    expect(text).not.toContain("Intake warming up");
  });

  it("NflverseLabDoor renders source-error state when the loader errors", async () => {
    mocks.nflverse.mockResolvedValue({
      status: "source-error",
      sourceRows: 0,
    });

    const door = await NflverseLabDoor();
    const text = textOf(door);

    expect(text).toContain("Live player data unavailable");
    expect(text).not.toContain("1,234 live player rows");
  });
});
