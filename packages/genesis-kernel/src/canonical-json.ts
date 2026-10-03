/**
 * Canonical JSON — deliberate convergence-point duplication (GX-000/GG-001).
 *
 * This is a verbatim replica of apps/web/lib/intelligence-playback/canonical-json.ts
 * (the repo's reference canonicalization: sorted keys, a finite-number guard, and
 * a plain-object prototype check that rejects Date/Map/class instances so they
 * can never silently flatten to `{}` and corrupt a hash domain). packages/*
 * cannot import apps/web, and that copy currently lives only on the stranded
 * `claude/galaxy-sports-edge-pdcswh` branch (not on main) — so this package
 * carries its own copy rather than either reaching across the app boundary or
 * inventing a second, divergent algorithm. Recorded as a collision in
 * docs/frontier/GENESIS_CONVERGENCE_MAP.md section 3.5: unify into one shared
 * package once the SportsIR/kernel work lands on main.
 */

import { createHash } from "node:crypto";

interface CanonicalObject {
  readonly [key: string]: CanonicalValue;
}

type CanonicalArray = readonly CanonicalValue[];

type CanonicalValue = null | boolean | number | string | CanonicalArray | CanonicalObject;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalize(value: unknown): CanonicalValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical evidence payloads require finite numbers");
    return value;
  }
  if (Array.isArray(value)) return value.map(normalize);
  // Class instances (Date, Map, custom classes) must not silently flatten to
  // plain objects — a Date would coerce to {} and corrupt the digest domain.
  if (typeof value === "object" && value !== null) {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error("Canonical evidence payloads require plain objects");
    }
  }
  if (isRecord(value)) {
    const normalized: Record<string, CanonicalValue> = {};
    for (const key of Object.keys(value).sort()) normalized[key] = normalize(value[key]);
    return normalized;
  }
  throw new Error(`Unsupported canonical evidence value: ${typeof value}`);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/** Convenience: canonicalize then hash in one call — the pattern every hash in this package uses. */
export function canonicalHash(value: unknown): string {
  return sha256Hex(canonicalJson(value));
}
