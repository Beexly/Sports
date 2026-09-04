import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";

/**
 * Viewport zoom guard — pinch-to-zoom must never be disabled.
 *
 * HONEST FRAMING: this test is a REGRESSION GUARD, not evidence of a fix. The
 * audit found the root viewport export already correct — `width: device-width`,
 * `initialScale: 1`, and no zoom suppression anywhere in the tree — so this
 * passes both before and after the mobile-ergonomics work in this change. It is
 * here because disabling zoom is a one-line regression that is invisible in
 * review, breaks WCAG 1.4.4 (Resize Text) / 1.4.10, and is flagged directly by
 * Lighthouse and the App Store review guidelines.
 *
 * Assertions run at RUNTIME. apps/web/tsconfig.json excludes __tests__ from
 * typechecking, so a type-level assertion here would never be checked.
 */

const webRoot = resolve(__dirname, "..");
const ROOT_LAYOUT = resolve(webRoot, "app/layout.tsx");

/** Directories whose rendered output reaches a customer's browser. */
const SCANNED_DIRS = ["app", "components", "styles"] as const;
const SCANNED_EXTS = [".tsx", ".ts", ".css", ".html"] as const;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (SCANNED_EXTS.some((ext) => full.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Every spelling that suppresses pinch-zoom: the raw meta-tag content string,
 * and the Next.js metadata-API equivalents (`Viewport.userScalable` /
 * `Viewport.maximumScale`). `maximum-scale=1` is included because it caps zoom
 * at 1x, which disables pinch-zoom in practice even with user-scalable left on.
 */
const ZOOM_BLOCKERS: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: "user-scalable=no", pattern: /user-scalable\s*=\s*(no|0)/i },
  { label: "maximum-scale=1", pattern: /maximum-scale\s*=\s*1(\.0+)?\b/i },
  { label: "userScalable: false", pattern: /userScalable\s*:\s*false/ },
  { label: "maximumScale: 1", pattern: /maximumScale\s*:\s*1(\.0+)?\s*[,}\n]/ },
];

describe("viewport zoom guard", () => {
  it("declares a responsive viewport on the root layout", () => {
    const src = readFileSync(ROOT_LAYOUT, "utf8");

    // The Next.js metadata API is the only place the viewport may be declared;
    // a hand-rolled <meta name="viewport"> in the tree would bypass this guard.
    expect(src).toMatch(/export const viewport\s*:\s*Viewport\s*=/);
    expect(src).toMatch(/width\s*:\s*["']device-width["']/);
  });

  it("does not suppress pinch-zoom anywhere in the customer-facing tree", () => {
    const offenders: string[] = [];

    for (const dir of SCANNED_DIRS) {
      for (const file of walk(resolve(webRoot, dir))) {
        // Skip this guard's own source — it necessarily contains the strings.
        if (file === resolve(__dirname, "viewport-zoom-guard.test.ts")) continue;
        const src = readFileSync(file, "utf8");
        for (const { label, pattern } of ZOOM_BLOCKERS) {
          if (pattern.test(src)) {
            offenders.push(`${file.slice(webRoot.length + 1)} → ${label}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
