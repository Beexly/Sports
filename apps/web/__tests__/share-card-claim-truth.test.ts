import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { getPlatformConfig } from "@sports/prediction-engine";

/**
 * Share-card claim truth.
 *
 * An OpenGraph card is the most-travelled piece of copy a page owns: it is
 * rendered into a social feed WITHOUT the page's caveats, gate states, or
 * disclosures beside it. It is therefore the one surface where an express
 * level-of-support claim ("calibrated", "verified record", "proven",
 * "Brier-scored against real outcomes") does the most damage — the claim is
 * about the STRENGTH OF THE EVIDENCE, so it must hold at least the level of
 * substantiation it advertises.
 *
 * Both existing copy scanners miss this surface:
 *   - `scripts/guardrails/commercial-copy-scan.mjs` walks
 *     `opengraph-image.tsx` only in its TOUT-pattern sweep. Its
 *     EVIDENCE_REQUIRED word list (which does contain "calibrated") runs only
 *     over SCAN_TARGETS, and `apps/web/app/performance` is not one of them.
 *   - Even if it were, EVIDENCE_REQUIRED terms are exempted by a LINE-WIDE
 *     safe-context test, so "Calibrated confidence, ... never deleted."
 *     borrows the "never" at the far end of the sentence and passes.
 *
 * So this guard is deliberately gate-aware rather than a word ban: each
 * pattern below is only forbidden WHILE the gate that would substantiate it
 * is closed. When the owner completes the audited activation sequence and
 * flips the gate, the corresponding assertion relaxes on its own — nothing
 * here needs an allowlist entry, and no phrase can be waved through to make
 * a claim pass.
 */

const APP_ROOT = join(__dirname, "..", "app");

function findShareCards(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      findShareCards(full, out);
    } else if (entry === "opengraph-image.tsx" || entry === "twitter-image.tsx") {
      out.push(full);
    }
  }
  return out;
}

/**
 * Strip comments before scanning. A card's own docstring legitimately
 * describes what it WILL render once history exists ("render the live Brier /
 * win-rate / CLV once canonical history exists"); only text a viewer actually
 * sees is a claim.
 */
function viewerText(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^[ \t]*\/\/.*$/gm, " ");
}

/**
 * Each entry: the express level-of-support claim, and the gate whose CLOSED
 * state makes it unsubstantiated. `calibrationAdjustmentsEnabled` is the flag
 * that actually turns the isotonic/PAVA calibrator from an identity
 * passthrough into a live calibrated probability
 * (packages/prediction-engine/src/calibration-apply.ts);
 * `performanceStatsEnabled` is the flag that lets any scored public record
 * render at all.
 */
const GATED_CLAIMS: ReadonlyArray<{
  readonly label: string;
  readonly pattern: RegExp;
  readonly gate: (c: ReturnType<typeof getPlatformConfig>) => boolean;
  readonly gateName: string;
}> = [
  {
    label: "calibrated",
    pattern: /\bcalibrated\b/i,
    gate: (c) => c.calibrationAdjustmentsEnabled,
    gateName: "CALIBRATION_ADJUSTMENTS_ENABLED",
  },
  {
    label: "brier-scored",
    pattern: /\bbrier[-\s]?scored\b/i,
    gate: (c) => c.performanceStatsEnabled,
    gateName: "PERFORMANCE_STATS_ENABLED",
  },
  {
    label: "verified record",
    pattern: /\bverified (?:public )?(?:track )?record\b/i,
    gate: (c) => c.performanceStatsEnabled,
    gateName: "PERFORMANCE_STATS_ENABLED",
  },
  {
    label: "proven",
    pattern: /\bproven\b/i,
    gate: (c) => c.performanceStatsEnabled,
    gateName: "PERFORMANCE_STATS_ENABLED",
  },
];

describe("share cards never assert a level of support the gates do not hold", () => {
  const cards = findShareCards(APP_ROOT);

  it("finds the share cards it is meant to police", () => {
    expect(cards.length).toBeGreaterThan(0);
  });

  for (const card of cards) {
    const rel = relative(join(__dirname, ".."), card).split("\\").join("/");
    it(`${rel} claims no more than the platform gates substantiate`, () => {
      const config = getPlatformConfig();
      const text = viewerText(readFileSync(card, "utf8"));
      for (const claim of GATED_CLAIMS) {
        if (claim.gate(config)) continue; // gate open — the claim is earned
        const match = claim.pattern.exec(text);
        expect(
          match === null,
          match === null
            ? ""
            : `${rel} asserts "${match[0]}" in viewer-facing share-card copy while ` +
              `${claim.gateName} is off, so nothing substantiates it. ` +
              `Fix the copy to describe the standard, not the result — do not add an exemption here.`,
        ).toBe(true);
      }
    });
  }
});
