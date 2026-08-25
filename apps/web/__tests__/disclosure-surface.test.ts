/**
 * Regulatory-disclosure surface guard.
 *
 * GSE sells sports-betting picks. A handful of disclosures — the
 * responsible-gambling helpline above all — are supposed to be everywhere a
 * customer can land. They are DEFINED once (lib/brand.ts HELPLINE) and RENDERED
 * per page: apps/web/app/layout.tsx renders no footer, so 99 page files import
 * <Footer /> themselves and the rest rely on <RiskDisclosure />. That is the
 * codebase's pattern, and it works — but per-page rendering means a NEW page
 * ships with no helpline by default, silently, and nothing fails.
 *
 * These tests close that. They ENUMERATE the route tree from disk rather than
 * checking a hand-kept list of routes, so a route added tomorrow is covered the
 * moment it exists.
 *
 * ── Why assertions here are RUNTIME, never type-level ────────────────────────
 * apps/web/tsconfig.json excludes `**\/*.test.ts`, `**\/*.test.tsx` and
 * `**\/__tests__/**`. Nothing in this file is ever typechecked, so a
 * `satisfies`/`expectTypeOf` guard here would be decorative. Every assertion
 * below reads a real file off disk or calls a real exported function.
 *
 * ── What this file does NOT do ──────────────────────────────────────────────
 * It does not decide legal questions. It checks that disclosures the repo has
 * already written and already committed to are actually reachable. Whether the
 * set is sufficient, and what belongs on the embed widget or on /pricing, are
 * owner/counsel calls recorded in the audit, not here.
 *
 * Known limits of the sweep, stated so nobody reads more into a green run than
 * it earns:
 *   - It enumerates `page.tsx` only. `error.tsx` and `loading.tsx` render
 *     transient states outside a page body and are not covered.
 *   - It reads imports statically. A carrier reached through a dynamic
 *     specifier, or rendered by a `children` prop passed from elsewhere, is
 *     invisible to it — so it can produce a false POSITIVE (flagging a page
 *     that does render one), never a false negative that hides a bare page.
 *   - "Renders the helpline" means the number reaches the markup. It says
 *     nothing about prominence, placement, or contrast.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname, resolve, sep } from "node:path";

import { HELPLINE } from "@/lib/brand";
import { buildWaitlistWelcomeEmail } from "@/lib/gse/waitlist-welcome-email";
import { WAITLIST_COPY } from "@/lib/gse/waitlist-copy";

const WEB = process.cwd();
const APP = join(WEB, "app");

// ── shared file helpers ──────────────────────────────────────────────────────

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

const srcCache = new Map<string, string>();
function read(file: string): string {
  const cached = srcCache.get(file);
  if (cached !== undefined) return cached;
  const src = readFileSync(file, "utf8");
  srcCache.set(file, src);
  return src;
}

/** Resolve a `@/`- or relative import specifier to a real file on disk. */
function resolveImport(spec: string, fromFile: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(WEB, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null; // bare package specifier — not our source
  for (const candidate of [
    `${base}.tsx`,
    `${base}.ts`,
    join(base, "index.tsx"),
    join(base, "index.ts"),
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const IMPORT_RE = /(?:import[^;]*?from\s*|import\s*\(\s*)["']([^"']+)["']/g;
function localImportsOf(file: string): string[] {
  const out: string[] = [];
  const src = read(file);
  IMPORT_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = IMPORT_RE.exec(src)) !== null) {
    const resolved = resolveImport(match[1] as string, file);
    if (resolved) out.push(resolved);
  }
  return out;
}

/**
 * A page "carries the helpline" when it, an ancestor layout, or any app/ or
 * components/ file either of them renders puts the number on screen. The three
 * carriers in this codebase are <Footer /> (RESPONSIBLE_LINKS reads
 * HELPLINE.shortLabel), <RiskDisclosure /> (BODY interpolates HELPLINE.number),
 * and a direct HELPLINE read. The literal alternatives are here only so this
 * check cannot be defeated by inlining the number — the separate "single
 * source" test below bans that inlining outright.
 */
const CARRIES_HELPLINE_RE =
  /<Footer[\s/>]|<RiskDisclosure[\s/>]|HELPLINE\.|1-800-GAMBLER|1-800-522-4700/;

function carriesHelpline(file: string, seen = new Set<string>()): boolean {
  if (seen.has(file)) return false;
  seen.add(file);
  if (CARRIES_HELPLINE_RE.test(read(file))) return true;
  for (const dep of localImportsOf(file)) {
    if (!dep.startsWith(join(WEB, "app")) && !dep.startsWith(join(WEB, "components"))) continue;
    if (carriesHelpline(dep, seen)) return true;
  }
  return false;
}

function routeOf(pageFile: string): string {
  const rel = relative(APP, dirname(pageFile));
  if (rel === "") return "/";
  // Route groups — `(marketing)` — are not URL segments.
  const segs = rel.split(sep).filter((s) => !(s.startsWith("(") && s.endsWith(")")));
  return `/${segs.join("/")}`;
}

function ancestorLayouts(pageFile: string): string[] {
  const out: string[] = [];
  let dir = dirname(pageFile);
  for (;;) {
    for (const name of ["layout.tsx", "layout.ts"]) {
      const p = join(dir, name);
      if (existsSync(p)) out.push(p);
    }
    if (dir === APP) break;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return out;
}

/**
 * A page that only calls redirect()/notFound() renders no markup at all, so
 * there is nothing to put a disclosure on. Detected from source — never from a
 * list of route names, which would go stale the first time one gained a body.
 */
function isRedirectOnly(src: string): boolean {
  const callsRedirect = /\b(?:redirect|permanentRedirect|notFound)\s*\(/.test(src);
  const rendersJsx = /<[A-Za-z]/.test(src);
  return callsRedirect && !rendersJsx;
}

/**
 * Prefixes excluded from the customer-surface sweep, each for a reason that is
 * about the SURFACE, not about convenience. These are prefixes, not route
 * names: a new page under a covered prefix is swept automatically, and a new
 * top-level route is swept automatically because it matches no prefix here.
 */
const NON_CUSTOMER_PREFIXES: ReadonlyArray<{ prefix: string; why: string }> = [
  {
    prefix: "/admin",
    why: "Internal operator console. Auth + role gated in middleware.ts (PROTECTED_ROUTES) and again per page. No customer lands here.",
  },
  {
    prefix: "/embed",
    why: "Chrome-less iframe widgets distributed to third-party sites; app/embed/layout.tsx renders no nav/footer by design. Whether the badge should carry its own compact disclosure is an owner call, recorded in the audit — not silently assumed here.",
  },
  {
    prefix: "/auth",
    why: "Sign-in and auth-error screens. No picks, no betting content, no purchase step.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1. Responsible-gambling helpline reaches every customer-facing route
// ─────────────────────────────────────────────────────────────────────────────

describe("responsible-gambling helpline reachability", () => {
  const pageFiles = walk(APP).filter((f) => /[\\/]page\.tsx?$/.test(f));

  it("finds a non-trivial route tree (guards against a broken walk)", () => {
    // If the enumeration silently matched nothing, every sweep below would
    // vacuously pass. Pin a floor plus two routes that must always exist.
    expect(pageFiles.length).toBeGreaterThan(150);
    const routes = pageFiles.map(routeOf);
    expect(routes).toContain("/pricing");
    expect(routes).toContain("/picks");
  });

  it("every customer-facing content route renders the helpline", () => {
    const offenders: string[] = [];

    for (const file of pageFiles) {
      const route = routeOf(file);
      const excluded = NON_CUSTOMER_PREFIXES.find(
        (e) => route === e.prefix || route.startsWith(`${e.prefix}/`),
      );
      if (excluded) continue;
      if (isRedirectOnly(read(file))) continue;

      const own = carriesHelpline(file, new Set());
      const viaLayout = ancestorLayouts(file).some((l) => carriesHelpline(l, new Set()));
      if (!own && !viaLayout) offenders.push(`${route}  (${relative(WEB, file)})`);
    }

    expect(
      offenders,
      `These customer-facing routes render no responsible-gambling helpline.\n` +
        `Render <Footer /> (the usual choice) or <RiskDisclosure /> on each:\n  ` +
        offenders.join("\n  "),
    ).toEqual([]);
  });

  it("the paid-conversion path carries the helpline", () => {
    // The pages where a visitor becomes a paying customer, or reads picks, are
    // called out individually so a refactor that guts one is unmistakable in
    // the failure output rather than one line inside the sweep above.
    for (const route of ["/pricing", "/picks", "/board", "/dashboard", "/promotions"]) {
      const file = join(APP, route === "/" ? "" : route.slice(1), "page.tsx");
      expect(existsSync(file), `${route} page file missing at ${file}`).toBe(true);
      const own = carriesHelpline(file, new Set());
      const viaLayout = ancestorLayouts(file).some((l) => carriesHelpline(l, new Set()));
      expect(own || viaLayout, `${route} renders no helpline`).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. One helpline number, one source
// ─────────────────────────────────────────────────────────────────────────────

describe("helpline is single-sourced from lib/brand.ts", () => {
  const uiFiles = [...walk(APP), ...walk(join(WEB, "components"))].filter(
    (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes("__tests__"),
  );

  /**
   * Both numbers the repo carries. 1-800-GAMBLER is HELPLINE.number
   * (lib/brand.ts); 1-800-522-4700 is the approved copy in the trust-claim
   * registry (lib/trust-claims.ts, id risk.gamble-responsibly). This test takes
   * NO position on which is right for which surface — that is a content call
   * flagged in the audit. It pins only that no THIRD number can appear, which
   * is the failure that actually hurts someone.
   */
  const KNOWN_NUMBERS = [HELPLINE.number, "1-800-522-4700"] as const;
  const PHONE_RE = /1-8(?:00|33|55|66|77|88)-[A-Z0-9]{3,7}(?:-[A-Z0-9]{4})?/g;

  it("HELPLINE constant still holds the number the audit was written against", () => {
    expect(HELPLINE.number).toBe("1-800-GAMBLER");
    expect(HELPLINE.href).toContain("ncpgambling.org");
  });

  it("no rendering surface hardcodes a helpline number instead of importing HELPLINE", () => {
    const offenders: string[] = [];
    for (const file of uiFiles) {
      const src = read(file);
      if (!KNOWN_NUMBERS.some((n) => src.includes(n))) continue;
      // Reading the constant is the whole point; a bare literal is the problem.
      if (/\bHELPLINE\b/.test(src)) continue;
      offenders.push(relative(WEB, file));
    }
    expect(
      offenders,
      `These files under app/ or components/ type a helpline number as a literal.\n` +
        `Import HELPLINE from "@/lib/brand" and interpolate HELPLINE.number so the\n` +
        `number can never drift between surfaces:\n  ` +
        offenders.join("\n  "),
    ).toEqual([]);
  });

  it("no unknown helpline-shaped number appears anywhere in apps/web source", () => {
    const all = [...walk(APP), ...walk(join(WEB, "components")), ...walk(join(WEB, "lib"))].filter(
      (f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes("__tests__"),
    );
    const offenders: string[] = [];
    for (const file of all) {
      const src = read(file);
      PHONE_RE.lastIndex = 0;
      for (const found of src.match(PHONE_RE) ?? []) {
        if (!KNOWN_NUMBERS.includes(found as (typeof KNOWN_NUMBERS)[number])) {
          offenders.push(`${relative(WEB, file)}: ${found}`);
        }
      }
    }
    expect(
      offenders,
      `Unrecognised helpline-shaped number(s). A wrong number sends someone in\n` +
        `crisis to a dead line — add it to the registry deliberately or remove it:\n  ` +
        offenders.join("\n  "),
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. The waitlist email must honour the promise its own consent box makes
// ─────────────────────────────────────────────────────────────────────────────

describe("waitlist welcome email opt-out", () => {
  it("the consent label still promises an unsubscribe (the premise of this test)", () => {
    // If this line is ever reworded away, the test below should be revisited
    // rather than left asserting against a promise nobody makes any more.
    expect(WAITLIST_COPY.consentLabel.toLowerCase()).toContain("unsubscribe");
  });

  it("names an opt-out route out of the list", () => {
    const { body } = buildWaitlistWelcomeEmail("Sam");
    expect(body.toLowerCase()).toContain("unsubscribe");
    // The opt-out must be actionable, not a word: it points at the published
    // support inbox (SUPPORT_EMAIL in lib/brand.ts).
    expect(body).toContain("@galaxysportsedge.com");
  });

  it("says why the recipient is receiving it", () => {
    const { body } = buildWaitlistWelcomeEmail();
    expect(body.toLowerCase()).toContain("you are receiving this because");
  });

  it("builds the same disclosure whether or not a name is supplied", () => {
    const named = buildWaitlistWelcomeEmail("Sam");
    const anon = buildWaitlistWelcomeEmail();
    expect(named.body).toContain("Hi Sam,");
    expect(anon.body).toContain("Hi,");
    for (const { body } of [named, anon]) {
      expect(body.toLowerCase()).toContain("unsubscribe");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Pins on disclosures that already exist — so they cannot quietly vanish
// ─────────────────────────────────────────────────────────────────────────────

describe("existing disclosures stay put", () => {
  it("/terms states plainly that GSE is not a sportsbook and takes no wagers", () => {
    const src = read(join(APP, "terms", "page.tsx"));
    expect(src).toContain("not a sportsbook");
    expect(src).toMatch(/does not accept\s*\n?\s*wagers/);
  });

  it("/terms and /privacy exist as real routes, not just docs markdown", () => {
    expect(existsSync(join(APP, "terms", "page.tsx"))).toBe(true);
    expect(existsSync(join(APP, "privacy", "page.tsx"))).toBe(true);
  });

  it("the footer links Terms, Privacy and responsible play", () => {
    const src = read(join(WEB, "components", "ui", "footer.tsx"));
    for (const href of ['"/terms"', '"/privacy"', '"/responsible-play"']) {
      expect(src, `footer is missing a link to ${href}`).toContain(href);
    }
    expect(src).toContain("HELPLINE.shortLabel");
  });

  it("the subscribe CTA carries auto-renewal terms plus Terms and Privacy links", () => {
    const src = read(join(WEB, "components", "pricing", "subscribe-button.tsx"));
    expect(src).toContain('data-testid="auto-renew-disclosure"');
    expect(src).toContain('href="/terms"');
    expect(src).toContain('href="/privacy"');
    expect(src).toContain("Auto-renews at");
  });

  it("the 21+ gate is enforced server-side, not by the client control alone", () => {
    const gate = read(join(WEB, "lib", "auth", "age-gate.ts"));
    expect(gate).toContain("MINIMUM_AGE_YEARS = 21");
    const route = read(join(APP, "api", "subscriptions", "checkout", "route.ts"));
    expect(route).toContain("assertAtLeast21");
    // The refusal must precede any Stripe side effect. Compare CALL sites, not
    // the import block — both names appear in the imports at the top of the
    // file, in an order that says nothing about execution.
    const ageCall = route.search(/assertAtLeast21\s*\(/);
    const stripeCall = route.search(/createCheckoutSession\s*\(/);
    expect(ageCall, "assertAtLeast21 is never called in the checkout route").toBeGreaterThan(-1);
    expect(stripeCall, "createCheckoutSession is never called in the checkout route").toBeGreaterThan(-1);
    expect(
      ageCall,
      "the 21+ check must run before the Stripe checkout session is created",
    ).toBeLessThan(stripeCall);
  });

  it("Stripe Terms consent stays opt-in and fails safe when unset", () => {
    // Ordering matters operationally (CLAUDE.md): the Stripe Dashboard
    // Terms-of-Service URL must be set BEFORE the flag is flipped, or Stripe
    // rejects every Checkout Session. Off-by-default is what makes that
    // ordering survivable, so pin the exact-"true" comparison.
    const src = read(join(WEB, "lib", "stripe.ts"));
    expect(src).toContain('process.env["STRIPE_TERMS_CONSENT_ENABLED"] === "true"');
    expect(src).toContain("consent_collection");
  });

  it("the stated refund window is the same on /terms, /pricing and /faq", () => {
    // A refund policy that differs between the page that sells and the page
    // that governs is a live dispute waiting to happen.
    const terms = read(join(APP, "terms", "page.tsx"));
    const pricing = read(join(APP, "pricing", "page.tsx"));
    const faq = read(join(APP, "faq", "page.tsx"));
    for (const [name, src] of [
      ["terms", terms],
      ["pricing", pricing],
      ["faq", faq],
    ] as const) {
      expect(src, `${name} no longer states the 3-day money-back window`).toMatch(
        /3-day money-back window|refund within 3 days/,
      );
    }
    // /terms is the only place that may define the proration rule; pin the
    // wording the other two are written against.
    expect(terms).toMatch(/do not pro-rate refunds/);
  });
});
