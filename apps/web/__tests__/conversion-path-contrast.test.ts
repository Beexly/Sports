import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import tailwindConfig from "../tailwind.config";

/**
 * WCAG AA contrast contract for the PAID-CONVERSION path.
 *
 * Why this file exists: `ultraviolet` (#7B61FF) is the one brand token that sits
 * below the 4.5:1 AA line for normal text on our dark canvas, and it is used
 * almost exclusively on the upgrade CTAs. Low-vision users were therefore
 * getting the weakest rendering of exactly the elements the business depends on.
 *
 * This test never hardcodes a ratio it did not compute. Every hex comes from
 * `tailwind.config.ts` at runtime and every ratio is derived with the WCAG 2.x
 * relative-luminance formula, so re-tuning a token re-runs the maths instead of
 * silently invalidating a stale comment. (apps/web/tsconfig.json excludes
 * `**\/*.test.ts`, so a type-level assertion would prove nothing here — these
 * are all runtime assertions.)
 */

// ── WCAG 2.x maths ────────────────────────────────────────────────────────────

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [
    number,
    number,
    number,
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Composite `fg` at `alpha` over an opaque `bg` — what a `/NN` utility paints. */
function composite(fg: string, alpha: number, bg: string): string {
  const f = rgb(fg);
  const b = rgb(bg);
  return (
    "#" +
    [0, 1, 2]
      .map((i) =>
        Math.round(f[i]! * alpha + b[i]! * (1 - alpha))
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()
  );
}

const AA_NORMAL_TEXT = 4.5;

// ── Token table, read from the real Tailwind config ──────────────────────────

function flattenColors(): Record<string, string> {
  const raw = (tailwindConfig.theme?.extend?.colors ?? {}) as Record<
    string,
    unknown
  >;
  const out: Record<string, string> = { white: "#FFFFFF", black: "#000000" };
  for (const [name, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      out[name] = value;
      continue;
    }
    if (value && typeof value === "object") {
      for (const [step, hex] of Object.entries(value as Record<string, unknown>)) {
        if (typeof hex !== "string") continue;
        out[step === "DEFAULT" ? name : `${name}-${step}`] = hex;
      }
    }
  }
  return out;
}

const TOKENS = flattenColors();
// Longest first so `text-ultraviolet-glow` never resolves as `ultraviolet`.
const TOKEN_NAMES = Object.keys(TOKENS).sort((a, b) => b.length - a.length);

type Resolved = { token: string; hex: string; alpha: number };

function resolveUtility(cls: string, prefix: "bg" | "text"): Resolved | null {
  if (!cls.startsWith(`${prefix}-`)) return null;
  const rest = cls.slice(prefix.length + 1);
  const slash = rest.indexOf("/");
  const name = slash === -1 ? rest : rest.slice(0, slash);
  if (!TOKEN_NAMES.includes(name)) return null;
  const hex = TOKENS[name]!;
  if (slash === -1) return { token: name, hex, alpha: 1 };
  const pct = Number(rest.slice(slash + 1));
  if (!Number.isFinite(pct)) return null;
  return { token: `${name}/${pct}`, hex, alpha: pct / 100 };
}

// ── Source scanning ──────────────────────────────────────────────────────────

const webRoot = resolve(__dirname, "..");

/**
 * Pull every *string literal* that appears inside a className expression.
 *
 * Grouping per literal (not per className) matters: a ternary such as
 *   className={[isActive ? "bg-plasma text-plasma-ink" : "bg-carbon text-ion-1"].join(" ")}
 * must never be read as "text-ion-1 on bg-plasma" — those branches never paint
 * together. One literal == one set of classes that really do co-apply.
 */
function classNameLiterals(src: string): Array<{ line: number; classes: string[] }> {
  const out: Array<{ line: number; classes: string[] }> = [];
  const attr = /className=(?:"([^"]*)"|\{([\s\S]*?)\n?\s*\}\s*\n?\s*(?:>|\w+=))/g;
  let match: RegExpExecArray | null;
  while ((match = attr.exec(src))) {
    const line = src.slice(0, match.index).split("\n").length;
    const literals: string[] = [];
    if (match[1] !== undefined) {
      literals.push(match[1]);
    } else if (match[2] !== undefined) {
      const inner = match[2];
      const strings = inner.match(/"[^"]*"|'[^']*'|`[^`]*`/g) ?? [];
      for (const s of strings) literals.push(s.slice(1, -1));
    }
    for (const literal of literals) {
      out.push({ line, classes: literal.split(/[\s]+/).filter(Boolean) });
    }
  }
  return out;
}

/**
 * The conversion path: the surfaces a visitor sees when we ask for money.
 * `surface` is the opaque page canvas an alpha utility composites against, and
 * each one is pinned by a companion assertion below so it cannot drift silently.
 */
const CONVERSION_PATH = [
  { file: "app/picks/page.tsx", surface: "obsidian" },
  { file: "components/pricing/pricing-plans.tsx", surface: "obsidian" },
  { file: "components/pricing/subscribe-button.tsx", surface: "obsidian" },
] as const;

function readSource(file: string): string {
  return readFileSync(resolve(webRoot, file), "utf8");
}

describe("conversion-path contrast (computed from tailwind tokens)", () => {
  it("exposes the ultraviolet family the fix depends on", () => {
    for (const token of ["ultraviolet", "ultraviolet-glow", "ultraviolet-deep"]) {
      expect(TOKENS[token], `missing token ${token}`).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("ultraviolet-deep carries white CTA text at AA", () => {
    const ratio = contrastRatio(TOKENS["ion-white"]!, TOKENS["ultraviolet-deep"]!);
    expect(
      ratio,
      `ion-white on ultraviolet-deep is ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("ultraviolet-glow reads at AA on the ultraviolet upgrade panels", () => {
    // The strongest ultraviolet wash we paint behind body copy is /20.
    const panel = composite(TOKENS["ultraviolet"]!, 0.2, TOKENS["obsidian"]!);
    const ratio = contrastRatio(TOKENS["ultraviolet-glow"]!, panel);
    expect(
      ratio,
      `ultraviolet-glow on bg-ultraviolet/20 (${panel}) is ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("pins the page canvas the alpha maths composites against", () => {
    expect(readSource("app/picks/page.tsx")).toContain(
      'className="flex min-h-screen flex-col bg-obsidian"',
    );
  });

  it.each(CONVERSION_PATH)(
    "$file: every foreground/background pair painted together meets AA",
    ({ file, surface }) => {
      const src = readSource(file);
      const canvas = TOKENS[surface]!;
      const failures: string[] = [];

      for (const { line, classes } of classNameLiterals(src)) {
        const backgrounds = classes
          .map((c) => resolveUtility(c, "bg"))
          .filter((r): r is Resolved => r !== null);
        const foregrounds = classes
          .map((c) => resolveUtility(c, "text"))
          .filter((r): r is Resolved => r !== null);
        if (!backgrounds.length || !foregrounds.length) continue;

        for (const bg of backgrounds) {
          const bgHex =
            bg.alpha < 1 ? composite(bg.hex, bg.alpha, canvas) : bg.hex;
          for (const fg of foregrounds) {
            const fgHex =
              fg.alpha < 1 ? composite(fg.hex, fg.alpha, bgHex) : fg.hex;
            const ratio = contrastRatio(fgHex, bgHex);
            if (ratio < AA_NORMAL_TEXT) {
              failures.push(
                `${file}:${line} text-${fg.token} on bg-${bg.token} = ${ratio.toFixed(2)}:1`,
              );
            }
          }
        }
      }

      expect(failures, failures.join("\n")).toEqual([]);
    },
  );

  it.each(CONVERSION_PATH)(
    "$file: ultraviolet body copy clears AA on the ultraviolet panels it sits in",
    ({ file, surface }) => {
      const src = readSource(file);
      const canvas = TOKENS[surface]!;
      const literals = classNameLiterals(src);

      // Worst case in this file: the strongest ultraviolet wash used as a panel
      // background. Any ultraviolet text in the file has to survive it.
      let strongest = 0;
      for (const { classes } of literals) {
        for (const cls of classes) {
          const bg = resolveUtility(cls, "bg");
          if (bg?.hex === TOKENS["ultraviolet"] && bg.alpha < 1) {
            strongest = Math.max(strongest, bg.alpha);
          }
        }
      }
      if (strongest === 0) return; // no ultraviolet panels in this file

      const panel = composite(TOKENS["ultraviolet"]!, strongest, canvas);
      const failures: string[] = [];
      for (const { line, classes } of literals) {
        for (const cls of classes) {
          const fg = resolveUtility(cls, "text");
          if (!fg || !fg.token.startsWith("ultraviolet")) continue;
          const ratio = contrastRatio(fg.hex, panel);
          if (ratio < AA_NORMAL_TEXT) {
            failures.push(
              `${file}:${line} text-${fg.token} on bg-ultraviolet/${Math.round(
                strongest * 100,
              )} (${panel}) = ${ratio.toFixed(2)}:1`,
            );
          }
        }
      }

      expect(failures, failures.join("\n")).toEqual([]);
    },
  );
});

describe("design-token integrity on the money path", () => {
  // Scales whose steps are enumerated in tailwind.config.ts. A class naming a
  // step that does not exist (e.g. `border-ion-4`) compiles to nothing, so the
  // element silently falls back to Tailwind's default — on a required input in
  // the checkout flow, that is invisible until a user cannot find the field.
  const SCALED = ["ion", "ultraviolet", "plasma", "ion-blue", "ds-cyan", "lime", "caution"];
  const UTILITY = /^(?:border|bg|text|ring|divide|from|via|to)-([a-z0-9-]+?)(?:\/\d+)?$/;

  const FILES = [
    "components/pricing/subscribe-button.tsx",
    "components/pricing/pricing-plans.tsx",
    "app/picks/page.tsx",
    "components/tracker/staking-calculator.tsx",
  ] as const;

  it.each(FILES)("%s uses only tokens that exist in tailwind.config.ts", (file) => {
    const src = readSource(file);
    const unknown: string[] = [];
    for (const { line, classes } of classNameLiterals(src)) {
      for (const cls of classes) {
        const m = UTILITY.exec(cls);
        if (!m) continue;
        const name = m[1]!;
        const scale = SCALED.find(
          (s) => name === s || name.startsWith(`${s}-`),
        );
        if (!scale) continue;
        if (!TOKEN_NAMES.includes(name)) {
          unknown.push(`${file}:${line} ${cls} → no "${name}" in tailwind.config.ts`);
        }
      }
    }
    expect(unknown, unknown.join("\n")).toEqual([]);
  });
});
