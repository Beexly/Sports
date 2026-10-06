import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * FE-14 (partial — see docs/ops/AGENT_LEDGER.md C-93 for the deferred rest):
 * tailwind.config.ts and styles/design-tokens.css define the same named
 * tokens with drifted hex values for "obsidian" and "ion.3". A component
 * styled with the Tailwind utility class (bg-obsidian, text-ion-3) got a
 * different color than one styled with the CSS variable (var(--obsidian),
 * var(--ion-3)) — the two were supposed to be the same token.
 *
 * design-tokens.css documents --ion-3 as WCAG AA re-valued (6.41:1 on
 * carbon) and --obsidian as the exact Brand Use Pack §4 spec, matching
 * --void; tailwind.config.ts is corrected to match rather than the reverse,
 * since design-tokens.css carries the accessibility verification.
 */
describe("FE-14: tailwind.config.ts colors match design-tokens.css", () => {
  const tailwindSrc = readFileSync(join(process.cwd(), "tailwind.config.ts"), "utf8");
  const cssSrc = readFileSync(join(process.cwd(), "styles/design-tokens.css"), "utf8");

  // Plain string search + a FIXED regex on the slice after it, rather than
  // building a RegExp from the (test-only, always-literal-at-call-site)
  // `name` argument — Codacy flags `new RegExp(non-literal)` as a DoS/ReDoS
  // pattern regardless of how trusted the caller is, so this sidesteps the
  // rule outright instead of arguing the false positive.
  function cssVar(name: string): string {
    const needle = `--${name}:`;
    const start = cssSrc.indexOf(needle);
    if (start === -1) throw new Error(`--${name} not found in design-tokens.css`);
    const after = cssSrc.slice(start + needle.length, start + needle.length + 40);
    const match = after.match(/\s*(#[0-9A-Fa-f]{6})/);
    if (!match) throw new Error(`--${name} has no hex value in design-tokens.css`);
    return match[1].toUpperCase();
  }

  it("obsidian matches --obsidian (and --void, the same canonical black)", () => {
    const match = tailwindSrc.match(/obsidian:\s*"(#[0-9A-Fa-f]{6})"/);
    expect(match).not.toBeNull();
    expect(match![1].toUpperCase()).toBe(cssVar("obsidian"));
    expect(cssVar("obsidian")).toBe(cssVar("void"));
  });

  it("ion.3 matches the WCAG AA-verified --ion-3", () => {
    const match = tailwindSrc.match(/3:\s*"(#[0-9A-Fa-f]{6})",\s*\/\/.*ion-3/i);
    // Fallback: the ion color scale's "3" entry specifically (not e.g. mineral-hi).
    const ionBlockMatch = tailwindSrc.match(/ion:\s*\{[\s\S]*?3:\s*"(#[0-9A-Fa-f]{6})"/);
    const found = match?.[1] ?? ionBlockMatch?.[1];
    expect(found).toBeDefined();
    expect(found!.toUpperCase()).toBe(cssVar("ion-3"));
  });

  it("the previously drifted literal values are gone", () => {
    expect(tailwindSrc).not.toMatch(/obsidian:\s*"#080A0F"/);
    expect(tailwindSrc).not.toMatch(/3:\s*"#9AA3C0"/);
  });
});
