import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  INTERNAL_API_ROUTES,
  INTERNAL_SURFACES,
  INTERNAL_SURFACE_POLICY,
  internalSurfaceBlockedResponse,
  isApiRoutePublic,
  isInternalApiRoute,
  isInternalSurface,
  isPagePublic,
} from "@/lib/launch/internal-surface-fence";

const FLAGS = [
  "METHODOLOGY_PUBLIC",
  "METRICS_PUBLIC",
  "NFLVERSE_PUBLIC",
  "PLAYERS_PUBLIC",
  "PARLAY_MRI_PUBLIC",
  "CALIBRATION_JSON_PUBLIC",
  "TRUTH_TOPOLOGY_PUBLIC",
  "SOURCES_CATALOG_PUBLIC",
] as const;

const APP = join(process.cwd(), "app");

afterEach(() => {
  for (const f of FLAGS) delete process.env[f];
});

describe("internal surfaces default dark", () => {
  it("every fenced page is dark with no env set", () => {
    for (const path of Object.keys(INTERNAL_SURFACES)) {
      expect(isPagePublic(path)).toBe(false);
    }
  });

  it("every fenced API route is dark with no env set", () => {
    for (const path of Object.keys(INTERNAL_API_ROUTES)) {
      expect(isApiRoutePublic(path)).toBe(false);
    }
  });

  it("a non-internal path is public — the registry is an allow-list of internals", () => {
    // Fails OPEN for unknown paths by design (documented in the module). If
    // this ever flips, a new page silently disappears from the public site.
    expect(isPagePublic("/picks")).toBe(true);
    expect(isPagePublic("/proof")).toBe(true);
    expect(isApiRoutePublic("/api/projections")).toBe(true);
  });
});

describe("founder opt-in", () => {
  it("re-opens exactly one surface per flag, not the others", () => {
    process.env.METHODOLOGY_PUBLIC = "true";
    expect(isPagePublic("/methodology")).toBe(true);
    // The independence matters: one flag must never open a second surface.
    expect(isPagePublic("/nflverse")).toBe(false);
    expect(isPagePublic("/players")).toBe(false);
  });

  it("rejects falsey values", () => {
    for (const v of ["false", "0", "no", "off", "", "  "]) {
      process.env.METHODOLOGY_PUBLIC = v;
      expect(isPagePublic("/methodology")).toBe(false);
    }
  });

  it("accepts the truthy spellings the existing gates use", () => {
    for (const v of ["1", "true", "TRUE", "yes", "on", " true "]) {
      process.env.METHODOLOGY_PUBLIC = v;
      expect(isPagePublic("/methodology")).toBe(true);
    }
  });
});

describe("classification", () => {
  it("does not treat inherited Object properties as internal", () => {
    // hasOwnProperty guard: "constructor"/"toString" are on Object.prototype,
    // so a naive `path in registry` would classify them as internal surfaces.
    expect(isInternalSurface("constructor")).toBe(false);
    expect(isInternalSurface("toString")).toBe(false);
    expect(isInternalApiRoute("constructor")).toBe(false);
  });

  it("keeps the doctrine's KEEP surfaces out of the registry", () => {
    // These are the allowed public surfaces. If any is ever added here, the
    // doctrine is being violated, not extended.
    for (const keep of ["/api/projections", "/api/proof/ledger", "/clv", "/picks"]) {
      expect(isInternalSurface(keep)).toBe(false);
      expect(isInternalApiRoute(keep)).toBe(false);
    }
  });

  it("the blocked response leaks no payload detail", () => {
    const res = internalSurfaceBlockedResponse("/api/calibration");
    expect(res.reason).toBe("internal_surface");
    expect(res.surface).toBe("/api/calibration");
    // It names the flag so the founder can debug their own deploy, and says
    // nothing about what the payload held. The surface path is excluded from
    // the scan — "/api/calibration" necessarily contains "calibration", and a
    // 404 that did not name its own path would be a worse error message.
    expect(res.hint).toContain("CALIBRATION_JSON_PUBLIC");
    expect(res.error).toBe("This surface is internal.");
    const prose = `${res.error} ${res.hint} ${res.reason}`;
    expect(prose).not.toMatch(/brier|ece|weight|probabilit|report|internals/i);
  });
});

describe("the fence is actually wired (regression on the audit finding)", () => {
  const pageGuard = (rel: string) =>
    readFileSync(join(APP, rel, "page.tsx"), "utf8");

  it("every fenced page calls its own gate before rendering", () => {
    for (const [path, meta] of Object.entries(INTERNAL_SURFACES)) {
      const src = pageGuard(path);
      // Search from the default export: an earlier helper in these files can
      // legitimately contain "return (", and the loader import line sits above
      // the handler. Both would make a whole-file indexOf compare nonsense.
      const bodyAt = src.indexOf("export default");
      expect(bodyAt, `${path} has a default export`).toBeGreaterThan(-1);
      const body = src.slice(bodyAt);

      if (meta.env === null) {
        // Permanently dark (NGS doctrine, HARD): no opt-in exists, so the
        // page must 404 unconditionally — no flag can re-expose it. It has
        // no render path at all.
        const nfAt = body.indexOf("notFound()");
        expect(nfAt, `${path} 404s unconditionally`).toBeGreaterThan(-1);
        expect(body, `${path} has no render path`).not.toContain("return (");
        expect(body, `${path} names no NGS metric`).not.toMatch(
          /Next Gen Stats|CPOE|RYOE/i,
        );
      } else {
        expect(src, `${path} must import the fence`).toContain(
          "internal-surface-fence",
        );
        const gateAt = body.indexOf(`isPagePublic("${path}")`);
        const returnAt = body.indexOf("return (");
        expect(gateAt, `${path} gates on its own path`).toBeGreaterThan(-1);
        expect(returnAt, `${path} renders`).toBeGreaterThan(-1);
        expect(gateAt, `${path} gate precedes the render`).toBeLessThan(returnAt);
      }
      expect(meta.exposes.length).toBeGreaterThan(0);
    }
  });

  it("every fenced API route refuses before it loads anything", () => {
    for (const [path] of Object.entries(INTERNAL_API_ROUTES)) {
      const src = readFileSync(join(APP, path, "route.ts"), "utf8");
      expect(src, `${path} must import the fence`).toContain("internal-surface-fence");

      const handlerAt = src.indexOf("export async function GET");
      expect(handlerAt, `${path} exports GET`).toBeGreaterThan(-1);
      const body = src.slice(handlerAt);

      const guardAt = body.indexOf(`isApiRoutePublic("${path}")`);
      // Compare against the CALL site, not the import at the top of the file.
      // The assertion is about ORDER (refuse before load), so the loader list
      // is a set of known loader names, not an exhaustive one. Kept explicit
      // rather than regexed over every `load*(` call: a generic pattern also
      // matched non-loader calls and reported false "no loader to guard"
      // failures on routes that were correctly wired.
      const loadAt = Math.max(
        body.indexOf("loadPublic"),
        body.indexOf("handleRealtime"),
        body.indexOf("loadSourceLiveEvidence"),
        body.indexOf("loadNflverse"),
      );
      expect(guardAt, `${path} gates on its own path`).toBeGreaterThan(-1);
      expect(loadAt, `${path} has a loader to guard`).toBeGreaterThan(-1);
      expect(guardAt, `${path} refuses before loading`).toBeLessThan(loadAt);
    }
  });

  it("the sitemap filters internal surfaces", () => {
    const src = readFileSync(join(APP, "sitemap.ts"), "utf8");
    expect(src).toContain("internal-surface-fence");
    expect(src).toContain("routes.filter");
  });
});

describe("the policy map matches the registry", () => {
  it("every registry entry has a policy line", () => {
    for (const path of [...Object.keys(INTERNAL_SURFACES), ...Object.keys(INTERNAL_API_ROUTES)]) {
      expect(INTERNAL_SURFACE_POLICY).toHaveProperty([path]);
    }
  });

  it("records the already-compliant surfaces as unchanged", () => {
    // The audit listed /clv and /stats as exposures. They were already gated
    // (canExposePerformanceStats / STATS_PUBLIC), so this work must NOT have
    // changed them — the policy map says so explicitly so a future reader does
    // not re-audit them as unfixed.
    expect(INTERNAL_SURFACE_POLICY["/clv"]).toContain("UNCHANGED");
    expect(INTERNAL_SURFACE_POLICY["/stats"]).toContain("UNCHANGED");
  });
});
