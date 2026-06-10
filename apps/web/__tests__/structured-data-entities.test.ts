import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scanForBannedPhrases } from "@/lib/trust-claims";
import { BRAND_NAME, FOUNDER_NAME, FOUNDER_ROLE } from "@/lib/brand";

/**
 * Structured-data (JSON-LD) entity gate.
 *
 * The additive structured-data pass introduced a factual founder Person
 * entity, ProfilePage, BlogPosting (Article), and BreadcrumbList nodes across
 * the root layout, /about, and /journal. This test locks in three invariants:
 *
 *   1. PRESENCE — each new JSON-LD block exists in its source file (so a
 *      future refactor can't silently delete the entity markup).
 *   2. WELL-FORMED — the JSON-LD object literals that are static (founder
 *      Person on the Organization, ProfilePage + Person, the breadcrumb
 *      lists) parse as valid JSON and carry the schema.org shape we expect.
 *   3. TRUST-SAFE — the banned-phrase scanner finds nothing in any touched
 *      source file, so no overclaiming language can ride in via structured
 *      data (which is invisible to a human reviewer skimming rendered copy).
 *
 * The Person states only verifiable facts sourced from the shipped
 * public/llms.txt: name + founder role + that they founded the Organization.
 * No credentials, awards, or performance numbers are asserted.
 */

const repoRoot = resolve(__dirname, "..");

function read(p: string): string {
  return readFileSync(resolve(repoRoot, p), "utf8");
}

/**
 * Parse the balanced `{...}` object literal that begins at the first `{`
 * at/after `fromIndex`, neutralising template-literal URL interpolation and
 * the small set of bare-identifier values used in these JSON-LD blocks so the
 * literal becomes valid JSON. We assert schema *structure*, not resolved host.
 */
function parseBalancedObjectAt(
  src: string,
  fromIndex: number,
): Record<string, unknown> {
  const braceStart = src.indexOf("{", fromIndex);
  expect(braceStart, "expected an object literal").toBeGreaterThan(-1);

  let depth = 0;
  let end = -1;
  let inString: string | null = null;
  for (let i = braceStart; i < src.length; i += 1) {
    const ch = src[i];
    const prev = src[i - 1];
    if (inString) {
      if (ch === inString && prev !== "\\") inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  expect(end, "unbalanced object literal").toBeGreaterThan(braceStart);

  const jsonish = src
    .slice(braceStart, end + 1)
    .replace(/`([^`]*)`/g, (_m, inner: string) => {
      const cleaned = inner
        // resolve the known brand interpolations to their real values so
        // human-readable strings (e.g. the founder description) survive
        .replace(/\$\{FOUNDER_ROLE\}/g, FOUNDER_ROLE)
        .replace(/\$\{FOUNDER_NAME\}/g, FOUNDER_NAME)
        .replace(/\$\{BRAND_NAME\}/g, BRAND_NAME)
        // any remaining URL interpolation → placeholder host
        .replace(/\$\{[^}]*\}/g, "https://example.test");
      return JSON.stringify(cleaned);
    })
    .replace(/:\s*BRAND_TAGLINE/g, ': "TAGLINE"')
    .replace(/:\s*BRAND_NAME/g, `: ${JSON.stringify(BRAND_NAME)}`)
    .replace(/:\s*FOUNDER_NAME/g, `: ${JSON.stringify(FOUNDER_NAME)}`)
    .replace(/:\s*FOUNDER_ROLE/g, `: ${JSON.stringify(FOUNDER_ROLE)}`)
    // neutralise any remaining bare const-reference values (e.g. ORG_ID,
    // SITE_URL) to a placeholder string so JSON.parse succeeds
    .replace(/:\s*[A-Z][A-Z0-9_]+(?=\s*[,}])/g, ': "https://example.test"')
    // quote unquoted object keys
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    // drop trailing commas
    .replace(/,(\s*[}\]])/g, "$1");

  return JSON.parse(jsonish) as Record<string, unknown>;
}

/** Parse the JSON-LD object assigned to `const <name> = {...}`. */
function extractJsonLdObject(
  src: string,
  constName: string,
): Record<string, unknown> {
  const marker = `const ${constName} =`;
  const start = src.indexOf(marker);
  expect(start, `expected to find \`${marker}\` in source`).toBeGreaterThan(-1);
  return parseBalancedObjectAt(src, start);
}

/** Parse the object literal that immediately follows an arbitrary marker. */
function extractBalancedObjectAfter(
  src: string,
  marker: string,
): Record<string, unknown> {
  const start = src.indexOf(marker);
  expect(start, `expected to find \`${marker}\` in source`).toBeGreaterThan(-1);
  return parseBalancedObjectAt(src, start + marker.length);
}

const TOUCHED_FILES = [
  "app/layout.tsx",
  "app/about/page.tsx",
  "app/journal/[slug]/page.tsx",
  "app/journal/page.tsx",
  "lib/brand.ts",
];

describe("Structured data — additive JSON-LD entities", () => {
  // ── 3. Trust-safe: no banned phrase in any touched file ───────────────
  for (const file of TOUCHED_FILES) {
    it(`${file} has no banned phrases`, () => {
      const hits = scanForBannedPhrases(read(file));
      if (hits.length > 0) {
        const summary = hits
          .map((h) => `  line ${h.line}: "${h.phrase}" — ${h.snippet}`)
          .join("\n");
        throw new Error(`${file} contains banned phrases:\n${summary}`);
      }
      expect(hits.length).toBe(0);
    });
  }

  // ── 1. Presence of each new entity ────────────────────────────────────
  it("root layout declares Organization.founder + @id anchoring", () => {
    const src = read("app/layout.tsx");
    expect(src).toMatch(/"@id":\s*ORG_ID/);
    expect(src).toContain("founder:");
    expect(src).toContain('"@type": "Person"');
    expect(src).toContain("FOUNDER_NAME");
    expect(src).toContain("publisher: { \"@id\": ORG_ID }");
  });

  it("/about declares ProfilePage + Person + BreadcrumbList scripts", () => {
    const src = read("app/about/page.tsx");
    expect(src).toContain('"@type": "ProfilePage"');
    expect(src).toContain('"@type": "Person"');
    expect(src).toContain('"@type": "BreadcrumbList"');
    expect(
      src.match(/type="application\/ld\+json"/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
  });

  it("/journal/[slug] declares BlogPosting + BreadcrumbList builders", () => {
    const src = read("app/journal/[slug]/page.tsx");
    expect(src).toContain('"@type": "BlogPosting"');
    expect(src).toContain('"@type": "BreadcrumbList"');
    expect(src).toContain("headline: entry.title");
    expect(src).toContain("datePublished: entry.publishedAt");
    // Authorship is the Org, never the internal author email.
    expect(src).not.toContain("authorEmail");
    expect(
      src.match(/type="application\/ld\+json"/g)?.length ?? 0,
    ).toBeGreaterThanOrEqual(2);
  });

  it("/journal index declares a BreadcrumbList script", () => {
    const src = read("app/journal/page.tsx");
    expect(src).toContain('"@type": "BreadcrumbList"');
    expect(src).toContain('type="application/ld+json"');
  });

  // ── 2. Well-formed: parse the static JSON-LD object literals ───────────
  it("layout founder Person literal is well-formed and factual", () => {
    // organizationJsonLd contains runtime expressions (SOCIAL.*.filter,
    // BRAND_TAGLINE), so we parse only the nested, fully-static `founder`
    // object literal by anchoring on the `founder:` key.
    const founder = extractBalancedObjectAfter(
      read("app/layout.tsx"),
      "founder:",
    );
    expect(founder["@type"]).toBe("Person");
    expect(founder["name"]).toBe(FOUNDER_NAME);
    expect(founder["jobTitle"]).toBe(FOUNDER_ROLE);
    // No overclaiming keys on the founder entity.
    expect(founder).not.toHaveProperty("award");
    expect(founder).not.toHaveProperty("sameAs");
  });

  it("about ProfilePage is well-formed and points the Person at the Org", () => {
    const profile = extractJsonLdObject(
      read("app/about/page.tsx"),
      "aboutProfileJsonLd",
    );
    expect(profile["@type"]).toBe("ProfilePage");
    const person = profile["mainEntity"] as Record<string, unknown>;
    expect(person["@type"]).toBe("Person");
    expect(person["name"]).toBe(FOUNDER_NAME);
    expect(person["jobTitle"]).toBe(FOUNDER_ROLE);
    expect(person["description"]).toBe(`${FOUNDER_ROLE} of ${BRAND_NAME}.`);
    expect(person["worksFor"]).toMatchObject({ "@id": expect.any(String) });
  });

  it("about + journal breadcrumb lists are ordered ListItem chains", () => {
    const aboutCrumb = extractJsonLdObject(
      read("app/about/page.tsx"),
      "aboutBreadcrumbJsonLd",
    );
    expect(aboutCrumb["@type"]).toBe("BreadcrumbList");
    const items = aboutCrumb["itemListElement"] as Array<
      Record<string, unknown>
    >;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ "@type": "ListItem", position: 1 });
    expect(items[1]).toMatchObject({ "@type": "ListItem", position: 2 });

    const journalCrumb = extractJsonLdObject(
      read("app/journal/page.tsx"),
      "journalBreadcrumbJsonLd",
    );
    expect(journalCrumb["@type"]).toBe("BreadcrumbList");
    expect(
      (journalCrumb["itemListElement"] as unknown[]).length,
    ).toBe(2);
  });

  // ── Brand single-source-of-truth founder facts ────────────────────────
  it("founder facts come from brand.ts and assert only role, no claims", () => {
    expect(FOUNDER_NAME).toBe("Garrett Baxley");
    expect(FOUNDER_ROLE).toBe("Founder");
    // Sanity: founder constants carry no overclaiming language.
    expect(scanForBannedPhrases(FOUNDER_NAME + " " + FOUNDER_ROLE)).toHaveLength(
      0,
    );
  });
});
