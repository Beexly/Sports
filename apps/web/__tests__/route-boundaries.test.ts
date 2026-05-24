import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(__dirname, "..");

const SEGMENTS = ["picks", "brief", "blog", "dashboard", "performance", "pricing"];

describe("public-surface error + loading boundaries", () => {
  it("global loading.tsx exists at app/loading.tsx", () => {
    expect(existsSync(resolve(repoRoot, "app/loading.tsx"))).toBe(true);
  });

  for (const seg of SEGMENTS) {
    describe(`/${seg}`, () => {
      const errPath = resolve(repoRoot, `app/${seg}/error.tsx`);
      const loadPath = resolve(repoRoot, `app/${seg}/loading.tsx`);

      it("has an error.tsx + loading.tsx", () => {
        expect(existsSync(errPath)).toBe(true);
        expect(existsSync(loadPath)).toBe(true);
      });

      it(`error.tsx is 'use client' + uses shared RouteError + passes segment="${seg}"`, () => {
        const src = readFileSync(errPath, "utf8");
        expect(src.trimStart()).toMatch(/^["']use client["']/);
        expect(src).toMatch(/RouteError/);
        expect(src).toMatch(new RegExp(`segment="${seg}"`));
      });

      it(`loading.tsx uses shared RouteLoading + passes segment="${seg}"`, () => {
        const src = readFileSync(loadPath, "utf8");
        expect(src).toMatch(/RouteLoading/);
        expect(src).toMatch(new RegExp(`segment="${seg}"`));
      });

      it("error.tsx emits no hype / banned-phrase language", () => {
        const src = readFileSync(errPath, "utf8");
        expect(src).not.toMatch(/guaranteed|lock|risk-free|sure thing/i);
      });
    });
  }
});

describe("shared RouteError component", () => {
  const src = readFileSync(
    resolve(repoRoot, "components/route/route-error.tsx"),
    "utf8"
  );

  it("declares 'use client' + accepts (error, reset, segment) props", () => {
    expect(src.trimStart()).toMatch(/^["']use client["']/);
    expect(src).toMatch(/segment:\s*string/);
    expect(src).toMatch(/reset:\s*\(\)\s*=>\s*void/);
  });

  it("shows only the digest in production (never raw stack)", () => {
    expect(src).toMatch(/NODE_ENV/);
    expect(src).toMatch(/production/);
    expect(src).toMatch(/digest/);
    expect(src).not.toMatch(/error\.stack/);
  });

  it("logs the error on mount via useEffect", () => {
    expect(src).toMatch(/useEffect/);
    expect(src).toMatch(/console\.error/);
  });

  it("renders a Retry button + a Back link", () => {
    expect(src).toMatch(/reset\(\)/);
    expect(src).toMatch(/homeHref/);
  });

  it("does not import anything from @sports/db (boundary stays client-safe)", () => {
    expect(src).not.toMatch(/@sports\/db/);
  });

  it("emits no auto-publish / auto-bet hype words", () => {
    expect(src).not.toMatch(/auto[- ]bet|auto[- ]publish|guaranteed/i);
  });
});

describe("shared RouteLoading component", () => {
  const src = readFileSync(
    resolve(repoRoot, "components/route/route-loading.tsx"),
    "utf8"
  );

  it("is a server component (no 'use client')", () => {
    expect(src.trimStart()).not.toMatch(/^["']use client["']/);
  });

  it("renders an aria-busy region for screen readers", () => {
    expect(src).toMatch(/role="status"/);
    expect(src).toMatch(/aria-busy="true"/);
    expect(src).toMatch(/aria-live="polite"/);
  });

  it("uses deterministic test ids per segment", () => {
    expect(src).toMatch(/data-testid={`route-loading-/);
  });

  it("does not depend on any client-only API", () => {
    expect(src).not.toMatch(/useState|useEffect|useRouter/);
  });
});
