import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { probeJarvisLayers, type LayerProbeEvidence } from "@/lib/cockpit/jarvis-layer-probes";
import type { JarvisLayerStatuses, JarvisPhaseStatus } from "@/lib/cockpit/jarvis";

/**
 * The cockpit's phase matrix must not lie about which phase shipped.
 *
 * This file used to assert that by `readFileSync`-ing jarvis-data.ts and
 * regexing it for a hand-edited `const LAYERS: JarvisLayerStatuses = {…}`
 * literal. Commit 4b4ae1e deliberately DELETED that literal and replaced it
 * with `probeJarvisLayers(...)` — live evidence in, statuses out, explicitly
 * "No hard-coded 'all implemented'". So the text assertions could only be
 * satisfied by re-adding the very hard-coded manifest the refactor removed:
 * the guard had inverted into a demand for the regression it was written to
 * prevent. (It was also never sound — `\btrustClaims\b` cannot match the
 * evidence field `trustClaimsWired`, so several checks passed by accident.)
 *
 * Same two invariants, asserted against the live export instead of file text —
 * exact key set, and only legal JarvisPhaseStatus values — plus the honesty
 * property the grep never actually tested: the probe must RESPOND to evidence
 * rather than return a constant.
 */

// Typed as `keyof JarvisLayerStatuses`, so renaming or dropping a layer on the
// type is a COMPILE error here — something the old text-grep could never do.
const REQUIRED_LAYER_KEYS: ReadonlyArray<keyof JarvisLayerStatuses> = [
  "trustClaims",
  "performanceGating",
  "promotions",
  "dailyBrief",
  "calibration",
  "cockpit",
  "contentEngine",
  "ciHardening",
];

const ALLOWED_STATUSES: ReadonlySet<JarvisPhaseStatus> = new Set([
  "implemented",
  "partial",
  "missing",
  "blocked_external",
  "unknown",
]);

/** Nothing wired, nothing known — the "we have not shipped it" end. */
const NO_EVIDENCE: LayerProbeEvidence = {
  trustClaimsWired: false,
  performanceGatingWired: false,
  promotionsWired: false,
  dailyBriefHasRows: null,
  calibrationAdjustmentsEnabled: false,
  canLearnFromOutcomes: false,
  cockpitWired: false,
  contentEngineDraftOnly: false,
  contentAutoPublishBlocked: false,
  ciGuardrailsPresent: false,
  freeMultiSourceCriticalGaps: 3,
  neonDualUrlConfigured: false,
  stubMode: true,
};

/** Everything wired and healthy — the "it genuinely shipped" end. */
const FULL_EVIDENCE: LayerProbeEvidence = {
  trustClaimsWired: true,
  performanceGatingWired: true,
  promotionsWired: true,
  dailyBriefHasRows: true,
  calibrationAdjustmentsEnabled: true,
  canLearnFromOutcomes: true,
  cockpitWired: true,
  contentEngineDraftOnly: true,
  contentAutoPublishBlocked: true,
  ciGuardrailsPresent: true,
  freeMultiSourceCriticalGaps: 0,
  neonDualUrlConfigured: true,
  stubMode: false,
};

describe("jarvis layer manifest", () => {
  it("emits exactly the required layer keys (no extras, no drops)", () => {
    const layers = probeJarvisLayers(NO_EVIDENCE);
    expect(Object.keys(layers).sort()).toEqual([...REQUIRED_LAYER_KEYS].sort());
  });

  for (const key of REQUIRED_LAYER_KEYS) {
    it(`emits ${key} with a legal status`, () => {
      const layers = probeJarvisLayers(NO_EVIDENCE);
      expect(Object.hasOwn(layers, key), `layer ${key} is missing`).toBe(true);
      expect(
        ALLOWED_STATUSES.has(layers[key]),
        `layer ${key} has unknown status "${layers[key]}"`,
      ).toBe(true);
    });
  }

  it("never reports a layer as implemented when there is no evidence for it", () => {
    const layers = probeJarvisLayers(NO_EVIDENCE);
    const lying = REQUIRED_LAYER_KEYS.filter((k) => layers[k] === "implemented");
    expect(lying, `claimed implemented with no evidence: ${lying.join(", ")}`).toEqual([]);
  });

  it("does report implemented once the evidence is actually there", () => {
    // The other half of the honesty property: a probe that always returned
    // "partial"/"unknown" would pass the test above while being just as
    // useless. Statuses must track the evidence in BOTH directions.
    const layers = probeJarvisLayers(FULL_EVIDENCE);
    for (const key of REQUIRED_LAYER_KEYS) {
      expect(layers[key], `layer ${key} ignored positive evidence`).toBe("implemented");
    }
  });

  it("keeps the statuses derived — no hard-coded manifest may come back", () => {
    // The inverse of the original grep. Re-introducing a literal
    // `const LAYERS: JarvisLayerStatuses = { … }` in jarvis-data.ts is exactly
    // the regression 4b4ae1e removed, so assert it stays gone.
    const src = readFileSync(
      resolve(__dirname, "..", "lib/cockpit/jarvis-data.ts"),
      "utf8",
    );
    expect(src).not.toMatch(/const\s+LAYERS\s*:\s*JarvisLayerStatuses\s*=/);
    expect(src).toMatch(/probeJarvisLayers\s*\(/);
  });
});
