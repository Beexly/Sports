import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PAGE_EXPLAINERS, getExplainer } from "../lib/explainers/registry";

/**
 * Nova page-explainer system contract.
 *
 * Every primary public surface gets a short, plain-English "how this works"
 * guide fronted by Nova, mounted once in the layout and shown only where a
 * registry entry exists. These guards keep it real, accessible, and honest:
 * code-native fallback always present, synthetic-presenter disclosure, no
 * photoreal likeness, no autoplay, and the guide is opt-in (click to open).
 */

const webRoot = resolve(__dirname, "..");
const read = (rel: string) => readFileSync(resolve(webRoot, rel), "utf8");

describe("Page-explainer registry", () => {
  it("covers the primary public surfaces", () => {
    for (const route of ["/", "/board", "/players", "/intelligence/engines", "/calibration", "/fantasy", "/the-beat"]) {
      expect(getExplainer(route), `missing explainer for ${route}`).toBeTruthy();
    }
  });

  it("every explainer has a code-native walkthrough (no spend required)", () => {
    for (const e of PAGE_EXPLAINERS) {
      expect(e.beats.length, `${e.route} needs beats`).toBeGreaterThanOrEqual(3);
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.durationLabel).toMatch(/^\d+:\d{2}$/);
      for (const b of e.beats) {
        expect(b.tag.length).toBeGreaterThan(0);
        expect(b.body.length).toBeGreaterThan(0);
      }
    }
  });

  it("does not sell certainty in any beat (brand voice)", () => {
    const banned = /\b(guaranteed|lock of the day|sure thing|risk-free|can't lose)\b/i;
    for (const e of PAGE_EXPLAINERS) {
      for (const b of e.beats) {
        expect(banned.test(b.body), `${e.route} beat overclaims: ${b.body}`).toBe(false);
      }
    }
  });
});

describe("Page-explainer component", () => {
  const comp = read("components/explainers/page-explainer.tsx");
  const layout = read("app/layout.tsx");

  it("auto-mounts in the layout and renders only where an explainer exists", () => {
    expect(layout).toContain("PageExplainerAuto");
    expect(comp).toContain("usePathname");
    expect(comp).toContain("if (!explainer) return null;");
  });

  it("is opt-in, accessible, and never autoplays or fakes a face", () => {
    expect(comp).toContain('role="dialog"');
    expect(comp).toContain('aria-modal="true"');
    expect(comp).toMatch(/Escape/);
    expect(comp.toLowerCase()).not.toContain("autoplay");
    expect(comp).toMatch(/deliberately not a photoreal person/i);
    expect(comp).toMatch(/synthetic presenter/i);
  });
});
