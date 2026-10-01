/**
 * NGS public-exposure tests — the unconditional fence.
 *
 * Doctrine (Garrett, 2026-09-28, HARD): NGS metrics are NEVER on the public
 * website — no NGS data, no metric names, no methodology, no discussion, no
 * commercial/public API exposure. The env-gated opt-ins (NGS_JSON_PUBLIC,
 * EXPECTED_METRICS_PUBLIC, RECONSTRUCTION_PUBLIC) were REMOVED: the serving
 * routes were deleted outright and /intelligence/reconstruction 404s
 * unconditionally. No flag combination can re-expose NGS.
 *
 * These tests pin that state. If a future change re-adds an NGS-serving
 * public route or re-opens a flag, this file goes red.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  INTERNAL_API_ROUTES,
  INTERNAL_SURFACES,
  INTERNAL_SURFACE_POLICY,
  isPagePublic,
} from "@/lib/launch/internal-surface-fence";
import { PLAYER_VIEWS, resolvePlayerView } from "@/lib/players/views";

const WEB = process.cwd(); // apps/web
const APP = join(WEB, "app");

const DELETED_NGS_ROUTES = [
  "app/api/nflverse/next-gen-stats/route.ts",
  "app/api/nflverse/expected-metrics/route.ts",
  "app/api/nflverse/edge-signals/route.ts",
  "app/api/intelligence/qb-consensus/route.ts",
  "app/api/intelligence/rushing-efficiency/route.ts",
  "app/players/nextgen/page.tsx",
] as const;

afterEach(() => {
  for (const f of [
    "PLAYERS_PUBLIC",
    "METHODOLOGY_PUBLIC",
    "METRICS_PUBLIC",
    "NFLVERSE_PUBLIC",
    "PARLAY_MRI_PUBLIC",
    "RECONSTRUCTION_PUBLIC",
    "NGS_JSON_PUBLIC",
    "EXPECTED_METRICS_PUBLIC",
  ]) {
    delete process.env[f];
  }
});

describe("no public NGS opt-in remains", () => {
  it("no NGS-serving API route is registered in the fence", () => {
    for (const path of Object.keys(INTERNAL_API_ROUTES)) {
      expect(path, `${path} must not be an NGS route`).not.toMatch(
        /next-gen-stats|expected-metrics|ngs/i,
      );
    }
  });

  it("no NGS env opt-in name exists anywhere in the fence module", () => {
    const src = readFileSync(
      join(WEB, "lib/launch/internal-surface-fence.ts"),
      "utf8",
    );
    expect(src).not.toMatch(
      /NGS_JSON_PUBLIC|EXPECTED_METRICS_PUBLIC|RECONSTRUCTION_PUBLIC/,
    );
  });

  it("the deleted NGS-serving routes do not exist on disk", () => {
    for (const rel of DELETED_NGS_ROUTES) {
      expect(existsSync(join(WEB, rel)), `${rel} must not exist`).toBe(false);
    }
  });

  it("no public route file serves NGS payloads", () => {
    // Any surviving route whose code calls an NGS loader must be ops/cron-gated.
    const hits: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e);
        if (statSync(full).isDirectory()) {
          if (e === "node_modules") continue;
          walk(full);
        } else if (e === "route.ts") {
          const src = readFileSync(full, "utf8");
          if (/loadNflverseNextGenStats|loadNflverseExpectedMetrics|loadNflverseEdgeSignals|loadQbConsensus|loadRushingEfficiency/.test(src)) {
            hits.push(full);
          }
        }
      }
    };
    walk(join(APP, "api"));
    // The only legitimate callers are internal ops/cron routes.
    for (const h of hits) {
      expect(h, `${h} calls an NGS loader — must be ops/cron-gated`).toMatch(
        /\/api\/(ops|cron)\//,
      );
    }
  });
});

describe("/intelligence/reconstruction is permanently dark", () => {
  it("isPagePublic is false under every flag combination", () => {
    // Even the old opt-in name, if set, must not re-open it.
    process.env.RECONSTRUCTION_PUBLIC = "true";
    expect(isPagePublic("/intelligence/reconstruction")).toBe(false);
    delete process.env.RECONSTRUCTION_PUBLIC;
    process.env.PLAYERS_PUBLIC = "true";
    process.env.METHODOLOGY_PUBLIC = "true";
    expect(isPagePublic("/intelligence/reconstruction")).toBe(false);
  });

  it("the registry entry has no env opt-in", () => {
    expect(INTERNAL_SURFACES["/intelligence/reconstruction"].env).toBeNull();
  });

  it("the page 404s unconditionally and carries no NGS copy", () => {
    const src = readFileSync(
      join(APP, "intelligence/reconstruction/page.tsx"),
      "utf8",
    );
    expect(src).not.toContain("RECONSTRUCTION_PUBLIC");
    expect(src, "no metadata (metadata never serves for a 404)").not.toContain(
      "export const metadata",
    );
    expect(src, "unconditional notFound()").toContain("notFound();");
    expect(src, "no render path").not.toContain("return (");
    expect(src, "no NGS discussion").not.toMatch(
      /Next Gen Stats|CPOE|RYOE|separation/i,
    );
  });

  it("the policy map records it as permanently dark", () => {
    expect(INTERNAL_SURFACE_POLICY["/intelligence/reconstruction"]).toMatch(
      /PERMANENTLY dark/i,
    );
  });
});

describe("PLAYERS_PUBLIC=true cannot expose NGS", () => {
  it("no player view is NGS-backed", () => {
    const slugs = PLAYER_VIEWS.map((v) => v.slug);
    expect(slugs).not.toContain("nextgen");
    expect(slugs).not.toContain("edge");
    for (const v of PLAYER_VIEWS) {
      const blob = `${v.slug} ${v.label} ${v.tabTooltip} ${v.eyebrow} ${v.title} ${v.description}`;
      expect(blob, `${v.slug} copy must not name NGS`).not.toMatch(
        /next gen stats|nextgen-/i,
      );
      expect(v.jsonHref ?? "", `${v.slug} href must not point at an NGS route`).not.toMatch(
        /next-gen-stats|expected-metrics|qb-consensus|rushing-efficiency|edge-signals/,
      );
    }
  });

  it("no view copy triangulates against NGS metrics", () => {
    for (const v of PLAYER_VIEWS) {
      const explainer = (v.explainer ?? [])
        .map((e) => `${e.term} ${e.definition}`)
        .join(" ");
      expect(
        `${v.description} ${explainer}`,
        `${v.slug} must not discuss NGS metrics`,
      ).not.toMatch(/CPOE \(Next Gen\)|Next Gen Stats|RYOE \(tracking/i);
    }
  });

  it("the QBR view is QBR-only — no consensus section", () => {
    const qbr = PLAYER_VIEWS.find((v) => v.slug === "qbr");
    expect(qbr).toBeDefined();
    expect(qbr!.tabTooltip).not.toMatch(/CPOE/i);
    expect(qbr!.description).not.toMatch(/CPOE|Next Gen/i);
  });

  it("the opportunity view is receiving-only — no RYOE section", () => {
    const opp = PLAYER_VIEWS.find((v) => v.slug === "opportunity");
    expect(opp).toBeDefined();
    expect(opp!.tabTooltip).not.toMatch(/RYOE/i);
  });

  it("resolvePlayerView('nextgen') falls back to a non-NGS view", () => {
    const view = resolvePlayerView("nextgen");
    expect(view.slug).not.toBe("nextgen");
    expect(view.slug).not.toMatch(/nextgen|edge/);
  });
});

describe("NGS stays internal in the serving layer", () => {
  it("the player lens rail links no removed NGS view", () => {
    const src = readFileSync(
      join(WEB, "components/players/player-lens-rail.tsx"),
      "utf8",
    );
    expect(src).not.toContain('"nextgen"');
    expect(src).not.toContain('"edge"');
  });

  it("the players page itself is still fenced (PLAYERS_PUBLIC)", () => {
    expect(INTERNAL_SURFACES["/players"].env).toBe("PLAYERS_PUBLIC");
    expect(isPagePublic("/players")).toBe(false);
    process.env.PLAYERS_PUBLIC = "true";
    expect(isPagePublic("/players")).toBe(true);
  });

  it("ops NGS routes stay behind ops auth (spot check)", () => {
    for (const rel of [
      "app/api/ops/ngs-backfill/route.ts",
      "app/api/cron/ngs-ingest/route.ts",
    ]) {
      const src = readFileSync(join(WEB, rel), "utf8");
      expect(src, `${rel} must require ops/cron auth`).toMatch(
        /cronAuthError|CRON_SECRET/,
      );
    }
  });

  it("the NGS backfill route 401s without the Bearer <redacted>, under every public flag", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    const { POST } = await import("@/app/api/ops/ngs-backfill/route");
    for (const combo of [
      {},
      { PLAYERS_PUBLIC: "true" },
      {
        PLAYERS_PUBLIC: "true",
        METHODOLOGY_PUBLIC: "true",
        METRICS_PUBLIC: "true",
        NFLVERSE_PUBLIC: "true",
      },
    ]) {
      for (const [k, v] of Object.entries(combo)) process.env[k] = v;
      const res = (await POST(
        new Request("http://x/api/ops/ngs-backfill?season=2024", { method: "POST" }),
      )) as Response;
      expect(res.status, `backfill 401s with flags ${JSON.stringify(combo)}`).toBe(401);
      for (const k of Object.keys(combo)) delete process.env[k];
    }
    vi.unstubAllEnvs();
  });

  it("the NGS ingest cron route 401s without the Bearer <redacted>, under every public flag", async () => {
    vi.stubEnv("CRON_SECRET", "secret");
    const { GET } = await import("@/app/api/cron/ngs-ingest/route");
    process.env.PLAYERS_PUBLIC = "true";
    const res = (await GET(
      new Request("http://x/api/cron/ngs-ingest"),
    )) as Response;
    expect(res.status).toBe(401);
    vi.unstubAllEnvs();
  });
});
