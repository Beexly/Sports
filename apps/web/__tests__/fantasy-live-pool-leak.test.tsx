/**
 * BEHAVIOURAL regression for the four `/fantasy/*` pages that previously resolved NO
 * entitlements and reached the live licensed pool.
 *
 * THE BUG THIS PINS: `activePlayerPool()` reads a process-wide `globalThis` registry
 * (lib/integrations/projections.ts). `ensureLiveProjections()` populates that registry
 * the first time ANY entitled user loads an already-gated page (e.g. /fantasy/lineup).
 * So `/fantasy/props`, `/scheme`, `/autopilot` and `/studio` were not "one line" from
 * leaking the paid pool — they were **one environment variable** from it: the moment
 * PROJECTIONS_PROVIDER / PICKEM_LINES_PROVIDER is set in the deploy env, an anonymous
 * visitor receives the paid graded pool with no code change at all.
 *
 * These tests therefore do what a linty source-grep cannot: they REGISTER a synthetic
 * live provider, set the env var, invoke the real page loader as an ANONYMOUS viewer,
 * and assert the paid rows are absent from what crosses to the client — then repeat as
 * an entitled viewer and assert they ARE present (so the gate is a gate, not a mute).
 *
 * Note the FREE tier is a depth-limited TRIAL, not a hard lock (see lib/fantasy/free-trial.ts):
 * an anonymous viewer legitimately receives the top FREE_BOARD_DEPTH players per position.
 * The live pools below are therefore built so the trial rows are named "Trial …" and the
 * paid rows beneath them "Paid …" — the assertion is that no PAID row ever reaches anon.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getEntitlements } from "@sports/types";
import { FREE_BOARD_DEPTH } from "@/lib/fantasy/free-trial";
import { POSITIONS, type Player } from "@/lib/fantasy/players";
import { registerProjectionsProvider } from "@/lib/integrations/projections";
import { registerPickemProvider } from "@/lib/integrations/pickem";
import type { Prop } from "@/lib/fantasy/props";

// The one seam: entitlement resolution. Everything else is the real code path.
let entitled = false;
vi.mock("@/lib/pricing/tier-access", () => ({
  getViewerEntitlements: async () => getEntitlements(entitled ? "ELITE" : "FREE"),
}));

// ---------------------------------------------------------------- synthetic live data

function mk(id: string, name: string, pos: Player["pos"], proj: number): Player {
  return {
    id, name, pos, team: "KC", bye: 12, proj, floor: proj - 40, ceiling: proj + 60,
    usage: 0.5, schemeFit: 0.6, role: "role", trend: "flat", injury: "healthy", note: "",
  };
}

/** Top FREE_BOARD_DEPTH per position are "Trial"; everything deeper is "Paid". */
const LIVE_POOL: Player[] = POSITIONS.flatMap((pos) =>
  Array.from({ length: FREE_BOARD_DEPTH + 6 }, (_, i) =>
    mk(
      `live-${pos}-${i}`,
      i < FREE_BOARD_DEPTH ? `Trial${pos}${i}Zoltar` : `Paid${pos}${i}Zoltar`,
      pos,
      1000 - i,
    ),
  ),
);

const PAID_MARKER = /Paid[A-Z]+\d+Zoltar/;

const LIVE_PROP: Prop = {
  id: "live-prop-1",
  player: "LicensedFeedZoltar",
  team: "KC",
  market: "Receiving Yards",
  line: 72.5,
  mean: 81,
  sigma: 20,
  alts: [{ line: 82.5, mult: 1.6 }],
};

// ---------------------------------------------------------------- tree inspection

/**
 * Serialize every prop value the page hands to its child components. This is exactly
 * the surface that is serialized into the RSC payload and therefore readable from the
 * network response — the thing CLAUDE.md rule 3 says a FREE viewer must never receive.
 */
function serializeProps(node: unknown, seen = new Set<unknown>()): string {
  if (!node || typeof node !== "object" || seen.has(node)) return "";
  seen.add(node);
  if (Array.isArray(node)) return node.map((n) => serializeProps(n, seen)).join(" ");
  const props = (node as { props?: Record<string, unknown> }).props;
  if (!props) return "";
  let out = "";
  for (const [key, value] of Object.entries(props)) {
    if (key === "children" || (value && typeof value === "object" && "props" in value)) {
      out += ` ${serializeProps(value, seen)}`;
      continue;
    }
    try {
      out += ` ${JSON.stringify(value)}`;
    } catch {
      /* non-serializable (fn/symbol) can't reach the client payload anyway */
    }
  }
  return out;
}

async function payloadOf(loader: () => Promise<unknown>): Promise<string> {
  return serializeProps(await loader());
}

// ---------------------------------------------------------------- harness

const ENV_KEYS = ["PROJECTIONS_PROVIDER", "PICKEM_LINES_PROVIDER"] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) savedEnv[k] = process.env[k];
  // The trigger: the founder flips these on. No code change accompanies it.
  process.env.PROJECTIONS_PROVIDER = "synthetic";
  process.env.PICKEM_LINES_PROVIDER = "synthetic";
  registerProjectionsProvider({
    name: "Synthetic live", live: true, list: () => [], players: () => LIVE_POOL,
  });
  registerPickemProvider({ name: "Synthetic licensed lines", live: true, lines: () => [LIVE_PROP] });
  entitled = false;
});

afterEach(() => {
  registerProjectionsProvider(null);
  registerPickemProvider(null);
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

// ---------------------------------------------------------------- the four pages

describe("/fantasy/props — licensed pick'em feed is entitlement-gated", () => {
  it("guards the premise: the synthetic licensed feed is live", async () => {
    const { isLivePickem } = await import("@/lib/integrations/pickem");
    expect(isLivePickem()).toBe(true);
  });

  it("an ANONYMOUS viewer never receives the licensed lines", async () => {
    const { default: Page } = await import("@/app/fantasy/props/page");
    const payload = await payloadOf(() => Page());
    expect(payload).not.toContain("LicensedFeedZoltar");
  });

  it("an ANONYMOUS viewer never TRIGGERS the licensed provider (denial-of-wallet)", async () => {
    // The gate must be evaluated BEFORE the provider call, not after: a metered
    // licensed feed must not be billed for a request whose result we discard.
    const lines = vi.fn(() => [LIVE_PROP]);
    registerPickemProvider({ name: "Metered", live: true, lines });
    const { default: Page } = await import("@/app/fantasy/props/page");
    await Page();
    expect(lines).not.toHaveBeenCalled();
  });

  it("an ENTITLED viewer does receive the licensed lines", async () => {
    entitled = true;
    const { default: Page } = await import("@/app/fantasy/props/page");
    const payload = await payloadOf(() => Page());
    expect(payload).toContain("LicensedFeedZoltar");
  });

  it("the provenance note tracks the slate ACTUALLY served, per viewer", async () => {
    const { default: Page } = await import("@/app/fantasy/props/page");
    const anon = await payloadOf(() => Page());
    expect(anon).not.toContain("LIVE feed connected");
    entitled = true;
    const paid = await payloadOf(() => Page());
    expect(paid).toContain("LIVE feed connected");
  });
});

/**
 * `entitledMarker` differs by page shape, and the difference is the point:
 *  - scheme / autopilot hand the WHOLE pool to a client component, so an entitled
 *    viewer's payload must contain the paid-depth rows themselves.
 *  - studio ships a top-N DIGEST (3 waivers, 4 risk lines), so paid depth never reaches
 *    the page for anyone. Its gate governs which POOL the digest is computed from, so
 *    the entitled proof is that live names appear at all — while the anon assertion
 *    (no paid rows) still pins that the untrimmed pool is never handed over.
 */
const POOL_PAGES: ReadonlyArray<{ route: string; mod: string; entitledMarker: RegExp }> = [
  { route: "/fantasy/scheme", mod: "@/app/fantasy/scheme/page", entitledMarker: PAID_MARKER },
  { route: "/fantasy/autopilot", mod: "@/app/fantasy/autopilot/page", entitledMarker: PAID_MARKER },
  { route: "/fantasy/studio", mod: "@/app/fantasy/studio/page", entitledMarker: /Zoltar/ },
];

describe.each(POOL_PAGES)("$route — live graded pool is entitlement-gated", ({ mod, entitledMarker }) => {
  it("an ANONYMOUS viewer never receives the PAID rows of the live pool", async () => {
    const { default: Page } = await import(/* @vite-ignore */ mod);
    const payload = await payloadOf(() => Page());
    expect(payload).not.toMatch(PAID_MARKER);
  });

  it("an ENTITLED viewer IS served the live pool (the gate is a gate, not a mute)", async () => {
    entitled = true;
    const { default: Page } = await import(/* @vite-ignore */ mod);
    const payload = await payloadOf(() => Page());
    expect(payload).toMatch(entitledMarker);
  });

  it("never prints the 'not live data' note while live data is on screen", async () => {
    // ILLUSTRATIVE_NOTE asserts "fictional players … not live data". Printing it over
    // real graded projections is an affirmatively false provenance claim — worse than
    // no note at all in a product whose core rule is that data claims must be true.
    entitled = true;
    const { default: Page } = await import(/* @vite-ignore */ mod);
    const payload = await payloadOf(() => Page());
    expect(payload).not.toContain("not live data");
  });
});

describe("buildLeagueTwin cannot silently go live", () => {
  it("defaults to the illustrative universe even under a registered live feed", async () => {
    const { buildLeagueTwin } = await import("@/lib/fantasy/league-twin");
    const twin = buildLeagueTwin();
    expect(twin.nodes.every((n) => !PAID_MARKER.test(n.player.name))).toBe(true);
    expect(twin.illustrative).toBe(true); // and it says so honestly
  });

  it("still serves a live galaxy when a pool is passed in EXPLICITLY", async () => {
    const { buildLeagueTwin } = await import("@/lib/fantasy/league-twin");
    const twin = buildLeagueTwin(undefined, LIVE_POOL);
    expect(twin.nodes.length).toBeGreaterThan(0);
    expect(twin.nodes.every((n) => LIVE_POOL.some((p) => p.id === n.player.id))).toBe(true);
    expect(twin.illustrative).toBe(false);
  });
});
