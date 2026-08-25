import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { bootstrapGateResponse } from "@sports/prediction-engine";

/**
 * The /picks gate `hint` is an OPERATOR diagnostic. It must not be able to
 * reach a customer render path at all.
 *
 * PR #624 fixed the leaked gate copy on /picks and /board but flagged this as
 * still-latent: `app/picks/page.tsx` copied the API error body's `hint` into
 * `bootstrapState.hint`, which is the object the customer-facing gate block
 * renders from. It was never printed — but it sat one `{bootstrapState.hint}`
 * away from putting an environment-variable name in front of every visitor to
 * the primary nav destination.
 *
 * The string in question is not hypothetical; it is produced right now by
 * `bootstrapGateResponse()` in the engine package and asserted below from the
 * real function, not a copy of it.
 *
 * The fix chosen is containment, not a printing ban: `hint` is not read
 * anywhere in the page (not rendered, not logged, not branched on), so the
 * page simply stops carrying it. A field that is not in the render state
 * cannot be rendered by accident, which is a stronger guarantee than any
 * review rule about not printing it. These tests pin BOTH halves — that the
 * hazard is real, and that the page no longer carries it.
 */

const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const PICKS_PAGE = resolve(REPO_ROOT, "apps/web/app/picks/page.tsx");
const source = (): string => readFileSync(PICKS_PAGE, "utf8");

/**
 * Strip comments before scanning. The page now carries a comment explaining
 * exactly which field is withheld and why — that prose is the record of the
 * decision, not a re-introduction of it. Same exemption the sibling copy
 * scanner makes: an engineer naming a field is not the field being rendered.
 */
const codeOnly = (): string =>
  source()
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

/** SCREAMING_SNAKE env/flag identifiers — the shape that must never ship. */
const INTERNAL_FLAG_SHAPE = /\b[A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+\b/;

/**
 * The slice of `app/picks/page.tsx` that builds the object the gate block
 * renders from. Narrowed to the object literal so the assertion is about the
 * customer render path specifically, not about the whole file.
 */
function bootstrapRenderState(): string {
  const src = codeOnly();
  const start = src.indexOf("bootstrap: {");
  expect(start, "the picks page still builds a bootstrap render state").toBeGreaterThan(-1);
  const end = src.indexOf("},", start);
  expect(end, "the bootstrap object literal is terminated").toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("the gate hint is a real hazard", () => {
  // `bootstrapGateResponse` branches on CANONICAL_HISTORY_ENABLED, which
  // `getPlatformConfig()` re-reads from the environment on every call — so both
  // branches can be driven here deterministically rather than assumed.
  const CANONICAL = "CANONICAL_HISTORY_ENABLED";
  const original = process.env[CANONICAL];
  afterEach(() => {
    if (original === undefined) delete process.env[CANONICAL];
    else process.env[CANONICAL] = original;
  });

  it("the feature-gate branch really does emit an internal flag name", () => {
    // Read from the engine itself, not a copy of its text. If this ever stops
    // being true the hazard is gone and this file can go with it — but while it
    // IS true, the containment below is load-bearing.
    process.env[CANONICAL] = "true";
    const gate = bootstrapGateResponse("Public picks");
    expect(gate.reason).toBe("feature_gate");
    expect(gate.hint).toMatch(INTERNAL_FLAG_SHAPE);
    expect(gate.hint).toContain("PUBLIC_PICKS_ENABLED");
  });

  it("the bootstrap branch is operator instructions, equally not customer copy", () => {
    process.env[CANONICAL] = "false";
    const gate = bootstrapGateResponse("Public picks");
    expect(gate.reason).toBe("bootstrap");
    // No flag name in this one, but it tells the reader to go set an env var and
    // read .env.example — a sentence addressed to whoever deploys the app.
    expect(gate.hint).toContain(".env.example");
  });
});

describe("the gate hint cannot reach the /picks customer render path", () => {
  it("the bootstrap render state does not carry the hint", () => {
    expect(bootstrapRenderState()).not.toMatch(/\bhint\b/);
  });

  it("the page's bootstrap state type declares no hint field", () => {
    // The type is the thing that makes `{bootstrapState.hint}` compile. Removing
    // the field is what turns an accidental render into a build failure.
    const src = codeOnly();
    const start = src.indexOf("bootstrap?: {");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("};", start);
    expect(end).toBeGreaterThan(start);
    expect(src.slice(start, end)).not.toMatch(/\bhint\b/);
  });

  it("nothing in the page reads or re-declares a hint at all", () => {
    // The response-body type that `hint` was read off is narrowed too, so
    // `body.hint` is now a compile error rather than a field sitting in reach.
    const src = codeOnly();
    expect(src).not.toMatch(/bootstrapState\s*\??\.\s*hint\b/);
    expect(src).not.toMatch(/\bbody\s*\??\.\s*hint\b/);
    expect(src).not.toMatch(/\bhint\s*\??\s*:/);
  });

  it("no internal flag name appears anywhere in the page's own strings", () => {
    // Belt and braces alongside public-copy-scanner.test.ts: that scanner needs
    // four plain English words around an identifier before it fires, so a bare
    // interpolated hint would slip past it. This one does not need the sentence.
    // Comments stripped: engineers naming a flag internally is not customer copy.
    const src = codeOnly();
    const literals = [...src.matchAll(/"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g)].map(
      (m) => m[1] ?? m[2] ?? "",
    );
    const leaked = literals.filter(
      (t) =>
        INTERNAL_FLAG_SHAPE.test(t) &&
        // Real code needs env keys and header names; those are lookups, not copy.
        !/^[A-Z0-9_]+$/.test(t.trim()),
    );
    expect(leaked).toEqual([]);
  });
});
