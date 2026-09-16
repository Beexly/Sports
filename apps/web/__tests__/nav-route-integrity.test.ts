import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Nav route integrity + desktop/mobile parity + C-360 label contract.
 *
 * After the R2 IA condensation and C-360 (LP1 / D3): the bar carries only the
 * live doors; the nine sample-backed fantasy tools are parked; every label
 * equals its page H1; /sealed has one inbound from /verify; /kill-ledger stays
 * until C-385.
 */

const webRoot = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

/** Extract internal hrefs from a nav source file. */
function hrefsIn(src: string): string[] {
  const out = new Set<string>();
  for (const m of src.matchAll(/href="(\/[^"]*)"/g)) {
    out.add(m[1]!);
  }
  return [...out];
}

/** Normalize an href to its route path (strip query + hash). */
function routeOf(href: string): string {
  return href.split("#")[0]!.split("?")[0]!;
}

/** Does an app-router page exist for this route? */
function routeExists(route: string): boolean {
  if (route === "/") return existsSync(resolve(webRoot, "app/page.tsx"));
  const base = resolve(webRoot, "app", route.replace(/^\//, ""));
  return (
    existsSync(resolve(base, "page.tsx")) ||
    existsSync(resolve(base, "route.ts")) ||
    existsSync(`${base}.tsx`)
  );
}

/** Pull the first plain-text children of an <h1>…</h1> (tags/whitespace stripped). */
function h1Texts(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/<h1\b([^>]*)>([\s\S]*?)<\/h1>/g)) {
    // Skip sr-only utility headings; the visible H1 is the page identity.
    if (/\bsr-only\b/.test(m[1] ?? "")) continue;
    const raw = m[2]!
      .replace(/<[^>]+>/g, " ")
      .replace(/\{[^}]*\}/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (raw) out.push(raw);
  }
  return out;
}

/**
 * Identity H1 for a keep page. FantasyShell / PageHero render the H1 from a
 * `title` prop; players renders it from `view.title` in lib/players/views.
 */
function identityH1(route: string): string {
  if (route === "/players") {
    // Default production view is the page H1.
    const views = read("lib/players/views.tsx");
    const m = views.match(/title:\s*"Players"/);
    return m ? "Players" : "";
  }
  const rel = `app${route === "/" ? "" : route}/page.tsx`;
  if (!existsSync(resolve(webRoot, rel))) return "";
  const src = read(rel);
  // FantasyShell title="DFS" | title={...}
  const shell = src.match(/title=\{?["']([^"']+)["']/);
  if (shell && !src.includes("<h1")) return shell[1]!;
  const h1s = h1Texts(src);
  return h1s[0] ?? (shell?.[1] ?? "");
}

const desktop = read("components/ui/nav.tsx");
const mobile = read("components/ui/mobile-nav.tsx");
const footer = read("components/ui/footer.tsx");

/**
 * C-360: the ONLY labels nav/footer/mobile carry.
 * Calibration is the one Board-menu child (not a top-bar label).
 */
const ALLOWED_LABELS = [
  "Board",
  "Picks",
  "Record",
  "Method",
  "Verify",
  "Plans",
  "Players",
  "DFS",
  "Props",
  "GSN",
  "Calibration",
] as const;

/** Label → route. Every label equals its page H1. */
const LABEL_ROUTE: Record<(typeof ALLOWED_LABELS)[number], string> = {
  Board: "/board",
  Picks: "/picks",
  Record: "/performance",
  Method: "/methodology",
  Verify: "/verify",
  Plans: "/pricing",
  Players: "/players",
  DFS: "/fantasy/dfs",
  Props: "/fantasy/props",
  GSN: "/gsn",
  Calibration: "/calibration",
};

/** The nine parked fantasy tools (D3 / C-360). Routes stay; nav drops them. */
const PARKED = [
  "/fantasy/lineup",
  "/fantasy/waivers",
  "/fantasy/draft",
  "/fantasy/trade",
  "/fantasy/bestball",
  "/fantasy/nba",
  "/fantasy/touchdowns",
  "/fantasy/showdown",
  "/fantasy/connect",
];

describe("Nav route integrity", () => {
  it("every desktop nav href resolves to a real route (no dead links)", () => {
    for (const href of hrefsIn(desktop)) {
      const route = routeOf(href);
      expect(routeExists(route), `dead desktop nav link: ${href} → ${route}`).toBe(true);
    }
  });

  it("every mobile nav href resolves to a real route (no dead links)", () => {
    for (const href of hrefsIn(mobile)) {
      const route = routeOf(href);
      expect(routeExists(route), `dead mobile nav link: ${href} → ${route}`).toBe(true);
    }
  });

  it("every footer nav href resolves to a real route (no dead links)", () => {
    for (const href of hrefsIn(footer)) {
      const route = routeOf(href);
      // Footer also carries disclosure links; still must be real routes.
      expect(routeExists(route), `dead footer link: ${href} → ${route}`).toBe(true);
    }
  });

  it("C-360: nav/footer/mobile carry only the allowed labels (≤12)", () => {
    const extractLabels = (src: string): string[] => {
      const out = new Set<string>();
      // label: "X"  |  label="X" (not aria-label)  |  { label: "X", href: … }
      for (const m of src.matchAll(/label:\s*"([^"]+)"/g)) out.add(m[1]!);
      for (const m of src.matchAll(/(?<!aria-)\blabel="([^"]+)"/g)) out.add(m[1]!);
      // JSX link children: <Link …>Picks</Link>
      for (const m of src.matchAll(/<Link\b[^>]*>([^<>{]+)<\/Link>/g)) {
        const t = m[1]!.trim();
        if (t) out.add(t);
      }
      return [...out];
    };

    const allowed = new Set<string>(ALLOWED_LABELS);
    // Footer social/disclosure labels are not IA doors; only FOOTER_LINKS.
    const footerLinks = footer.slice(
      footer.indexOf("FOOTER_LINKS"),
      footer.indexOf("SOCIAL_LINKS"),
    );

    for (const [name, src] of [
      ["desktop", desktop],
      ["mobile", mobile],
      ["footer-links", footerLinks],
    ] as const) {
      const labels = extractLabels(src);
      expect(labels.length, `${name} must not exceed 12 labels`).toBeLessThanOrEqual(12);
      for (const label of labels) {
        expect(allowed.has(label), `${name} carries forbidden label: ${label}`).toBe(true);
      }
      // Every primary door is present on desktop + mobile.
      if (name !== "footer-links") {
        for (const label of ALLOWED_LABELS) {
          expect(labels, `${name} missing label ${label}`).toContain(label);
        }
      } else {
        for (const label of ["Board", "Picks", "Record", "Method", "Verify", "Plans", "Players", "DFS", "Props", "GSN"]) {
          expect(labels, `footer missing label ${label}`).toContain(label);
        }
      }
    }
  });

  it("C-360: every label equals its page H1", () => {
    for (const [label, route] of Object.entries(LABEL_ROUTE) as [
      (typeof ALLOWED_LABELS)[number],
      string,
    ][]) {
      const h1 = identityH1(route);
      expect(h1.toLowerCase(), `label "${label}" ≠ H1 on ${route} (got "${h1}")`).toBe(
        label.toLowerCase(),
      );
    }
  });

  it("C-360: the nine parked fantasy tools are unlinked from nav/footer/mobile", () => {
    for (const route of PARKED) {
      expect(desktop, `desktop still links parked ${route}`).not.toContain(`"${route}"`);
      expect(mobile, `mobile still links parked ${route}`).not.toContain(`"${route}"`);
      expect(footer, `footer still links parked ${route}`).not.toContain(`"${route}"`);
      // Route stays real until C-412 / C-391 decide otherwise.
      expect(routeExists(route), `parked route vanished: ${route}`).toBe(true);
    }
  });

  it("C-360: parked pages declare robots index:false", () => {
    for (const route of PARKED) {
      const src = read(`app${route}/page.tsx`);
      expect(src, `${route} missing robots: { index: false }`).toMatch(
        /robots:\s*\{\s*index:\s*false/,
      );
    }
  });

  it("C-360: /sealed has one inbound link from /verify; /kill-ledger stays until C-385", () => {
    const verify = read("app/verify/page.tsx");
    expect(verify, "/verify must link to /sealed").toContain('href="/sealed"');
    expect(routeExists("/sealed")).toBe(true);
    expect(routeExists("/kill-ledger"), "/kill-ledger stays until C-385").toBe(true);
  });

  it("the primary doors + Calibration are reachable on desktop and mobile", () => {
    const PRIMARY = [
      "/board",
      "/picks",
      "/performance",
      "/methodology",
      "/verify",
      "/pricing",
      "/players",
      "/fantasy/dfs",
      "/fantasy/props",
      "/gsn",
      "/calibration",
    ];
    for (const route of PRIMARY) {
      expect(desktop.includes(`"${route}"`), `desktop missing ${route}`).toBe(true);
      expect(mobile.includes(`"${route}"`), `mobile missing ${route}`).toBe(true);
    }
  });

  it("GSN is its own door; Studio and Academy stay unlinked (ASTRA A-5)", () => {
    expect(desktop).toContain('"/gsn"');
    expect(mobile).toContain('"/gsn"');
    expect(desktop).not.toContain('"/fantasy/studio"');
    expect(desktop).not.toContain('"/academy"');
    expect(mobile).not.toContain('"/fantasy/studio"');
    expect(mobile).not.toContain('"/academy"');
    expect(desktop).not.toContain('"/intelligence/metrics"');
  });
});
