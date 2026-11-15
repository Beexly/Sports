import { describe, expect, it } from "vitest";
import { canonicalJson, sealRun, sha256Canonical, verifySeal } from "../../evidence/manifest-hash.js";
import { freshBundle, NOW } from "./fixtures.js";

/** Deep copy with every object's key order reversed. */
function reverseKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value !== null && typeof value === "object") {
    const src = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(src).reverse()) out[key] = reverseKeys(src[key]);
    return out;
  }
  return value;
}

describe("canonicalJson", () => {
  it("is stable across key insertion order", () => {
    const a = { b: 1, a: 2, c: { z: 1, y: 2 } };
    const b = { c: { y: 2, z: 1 }, a: 2, b: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
  });

  it("drops undefined but keeps null", () => {
    expect(canonicalJson({ a: undefined, b: null })).toBe('{"b":null}');
  });

  it("refuses to seal a non-finite number", () => {
    expect(() => canonicalJson({ p: Number.NaN })).toThrow(/non-finite/);
    expect(() => canonicalJson({ p: Number.POSITIVE_INFINITY })).toThrow(/non-finite/);
  });

  it("preserves array order", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
  });
});

describe("sealRun", () => {
  it("produces the same hash for the same bundle regardless of key order", () => {
    const bundle = freshBundle();
    const reordered = reverseKeys(bundle);
    const one = sealRun({ bundle, outputs: { p: 0.5 } }, "v5.3.1+evidence-spine.1", NOW.toISOString());
    const two = sealRun({ outputs: { p: 0.5 }, bundle: reordered }, "v5.3.1+evidence-spine.1", NOW.toISOString());
    expect(one.hash).toBe(two.hash);
    expect(one.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes the hash when any input changes", () => {
    const bundle = freshBundle();
    const one = sealRun({ bundle }, "v1", NOW.toISOString());
    const two = sealRun({ bundle: { ...bundle, builtAt: "2026-11-12T21:00:01.000Z" } }, "v1", NOW.toISOString());
    expect(one.hash).not.toBe(two.hash);
  });

  it("changes the hash when the code version changes", () => {
    const bundle = freshBundle();
    const one = sealRun({ bundle }, "v1", NOW.toISOString());
    const two = sealRun({ bundle }, "v2", NOW.toISOString());
    expect(one.hash).not.toBe(two.hash);
  });

  it("re-derives the same hash from the stored canonical string", () => {
    const manifest = sealRun({ bundle: freshBundle() }, "v1", NOW.toISOString());
    expect(verifySeal(manifest.canonical, manifest.hash)).toBe(true);
    expect(verifySeal(manifest.canonical + " ", manifest.hash)).toBe(false);
  });

  it("is deterministic across repeated calls", () => {
    const payload = { bundle: freshBundle(), outputs: { p: 0.5, edge: 0.01 } };
    expect(sha256Canonical(payload)).toBe(sha256Canonical(payload));
  });
});
