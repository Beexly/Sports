/**
 * Shared types for the competitive-intel package.
 *
 * Two rules encoded here:
 *  1. Every harvested row carries six provenance columns. There is no shape in this package
 *     that can exist without them.
 *  2. Signal family is the existing eight-member union from @sports/types. Rival signal
 *     classes are mapped onto it, never expanded.
 */

import type { SignalFamily } from "@sports/types";

export const RIVAL_ASSET_TYPES = [
  "paywall_recipe",
  "projection_file",
  "model_weight",
  "odds_key",
  "pick_archive",
  "api_endpoint",
  "bucket",
  "leaked_cred",
  "subdomain_takeover",
] as const;

export type RivalAssetType = (typeof RIVAL_ASSET_TYPES)[number];

export type LicenseClass = "public_domain" | "tos_scraped" | "licensed" | "unknown";

/** The six columns every harvested row carries. */
export interface Provenance {
  readonly source_url: string;
  readonly retrieved_at: string;
  readonly harvest_tier: 0 | 1 | 2 | 3 | 4;
  readonly license_class: LicenseClass;
  readonly commercial_ok: boolean;
  readonly content_hash: string;
}

export interface RawArtifact {
  readonly url: string;
  readonly retrievedAt: string;
  readonly tier: 0 | 1 | 2 | 3 | 4;
  readonly body: string;
  readonly httpStatus: number;
  readonly contentHash: string;
}

export interface FetchCtx {
  /** Injected so tests replay a fixture without a network call. */
  readonly fetchImpl: typeof globalThis.fetch;
  readonly now: () => Date;
}

export function sha256Hex(input: string): string {
  // Small, dependency-free, and stable across Node and the browser bundle.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  const a = h1.toString(16).padStart(8, "0");
  const b = h2.toString(16).padStart(8, "0");
  return `fnv${a}${b}${input.length.toString(16)}`;
}

/** Provenance is stamped from the artifact, never from the caller's optimism. */
export function provenanceOf(
  artifact: RawArtifact,
  licenseClass: LicenseClass,
  commercialOk: boolean,
): Provenance {
  return {
    source_url: artifact.url,
    retrieved_at: artifact.retrievedAt,
    harvest_tier: artifact.tier,
    license_class: licenseClass,
    commercial_ok: commercialOk,
    content_hash: artifact.contentHash,
  };
}
