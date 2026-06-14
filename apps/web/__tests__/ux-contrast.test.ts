import { describe, expect, it } from "vitest";
import config from "../tailwind.config";

/**
 * UX contrast contract — WCAG AA, enforced from the source tokens.
 *
 * Muted/body text on the public surfaces must clear WCAG AA (4.5:1 for normal
 * text). This guard reads the ACTUAL hex values out of tailwind.config.ts and
 * computes the contrast ratio, so a future token change that quietly drops a
 * text colour below AA fails CI instead of shipping unreadable grey. This is
 * what caught ink-400/500 failing on dark surfaces (3.2:1 / ≤2.1:1) after the
 * cosmic rebrand mapped muted greys onto them.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const colors = (config.theme as any).extend.colors as Record<string, unknown>;

function hex(path: string): string {
  const parts = path.split(".");
  let node: unknown = colors;
  for (const p of parts) {
    node = (node as Record<string, unknown>)[p];
  }
  if (typeof node !== "string" || !/^#[0-9a-fA-F]{6}$/.test(node)) {
    throw new Error(`token ${path} is not a 6-digit hex: ${String(node)}`);
  }
  return node;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(h: string): number {
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const AA = 4.5;

// The dark surfaces text actually sits on: page (void/carbon), card (eclipse),
// elevated card (titanium). mineral is a border colour, not a text bed.
const DARK_SURFACES = ["void", "carbon", "eclipse", "titanium"] as const;

// Every token used as body / muted / meta text on the cosmic surfaces.
const TEXT_TOKENS = [
  "ion-white",
  "ion.1",
  "ion.2",
  "ion.3",
  "ink.200",
  "ink.300",
  "ink.400",
  "ink.500",
  "ink.600",
  "orbital-cyan",
] as const;

describe("UX contrast — muted text clears WCAG AA on every dark surface", () => {
  for (const token of TEXT_TOKENS) {
    for (const surface of DARK_SURFACES) {
      it(`text ${token} on ${surface} ≥ ${AA}:1`, () => {
        const ratio = contrast(hex(token), hex(surface));
        expect(
          ratio,
          `${token} on ${surface} is ${ratio.toFixed(2)}:1 — below WCAG AA ${AA}:1`,
        ).toBeGreaterThanOrEqual(AA);
      });
    }
  }
});
