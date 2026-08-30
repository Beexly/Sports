import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  NO_BET_METHODOLOGY_VERSION,
  PUBLIC_NO_BET_COPY_STRINGS,
  PUBLIC_NO_BET_METHODOLOGY_EXAMPLES,
  publicNoBetExampleByReason,
  publicNoBetMethodologySummary,
  type PublicNoBetReasonCode,
} from "@/lib/gse/no-bet-methodology";
import { hasNoPerformanceClaim, runNoClaimGuard } from "@/lib/gse/waitlist-validation";
import { scanMediaClaimText } from "@/lib/media-revenue/claim-safety";

const EXPECTED_REASON_CODES = [
  "missing_required_data",
  "stale_market_context",
  "source_rights_blocked",
  "calibration_drift",
  "calibration_debt",
  "model_disagreement",
  "responsible_gaming",
] satisfies readonly PublicNoBetReasonCode[];

const PROTECTED_DETAIL_PATTERNS = [
  /\bcoefficient\b/i,
  /\bformula coefficient\b/i,
  /\bprotected weight\b/i,
  /\bweight(?:ed)?\s*=/i,
  /\b0\.\d+\s*(?:x|multiplier|factor)\b/i,
];

describe("public no-bet methodology examples", () => {
  it("covers each public reason code exactly once", () => {
    expect(NO_BET_METHODOLOGY_VERSION).toBe("2026-07-05.1");
    expect(PUBLIC_NO_BET_METHODOLOGY_EXAMPLES.map((example) => example.reasonCode)).toEqual(
      EXPECTED_REASON_CODES,
    );
    expect(new Set(PUBLIC_NO_BET_METHODOLOGY_EXAMPLES.map((example) => example.id)).size).toBe(
      PUBLIC_NO_BET_METHODOLOGY_EXAMPLES.length,
    );
  });

  it("keeps every public copy string claim-safe", () => {
    for (const text of PUBLIC_NO_BET_COPY_STRINGS) {
      const media = scanMediaClaimText(text);
      const waitlist = runNoClaimGuard(text, "NO_BET_METHODOLOGY");

      expect(media.ok, text).toBe(true);
      expect(media.blockedHits, text).toEqual([]);
      expect(media.evidenceRequiredHits, text).toEqual([]);
      expect(hasNoPerformanceClaim(text), text).toBe(true);
      expect(waitlist.ok, text).toBe(true);
    }
  });

  it("does not expose protected formula details or action outcomes", () => {
    for (const example of PUBLIC_NO_BET_METHODOLOGY_EXAMPLES) {
      const publicText = [
        example.title,
        example.trigger,
        example.userFacingCopy,
        ...example.allowedLanguage,
      ].join(" ");

      for (const pattern of PROTECTED_DETAIL_PATTERNS) {
        expect(pattern.test(publicText), `${example.id} leaked ${pattern}`).toBe(false);
      }
      expect(example.decision).not.toBe("PLAY");
      expect(example.userFacingCopy.toLowerCase()).not.toContain("take this");
    }
  });

  it("returns examples by reason code and explains no-bet as a governed decision", () => {
    expect(publicNoBetExampleByReason("calibration_drift")?.decision).toBe("HARD_PASS");
    expect(publicNoBetExampleByReason("model_disagreement")?.decision).toBe("WATCH");
    expect(publicNoBetMethodologySummary()).toContain("governed decision");
    expect(publicNoBetMethodologySummary()).toContain("protected formula details");
  });

  it("keeps the methodology doc aligned with the code artifact and claim-safe", () => {
    const doc = readFileSync(
      resolve(process.cwd(), "../../docs/gse/NO_BET_GOVERNOR_METHODOLOGY.md"),
      "utf8",
    );
    const media = scanMediaClaimText(doc);

    expect(doc).toContain("apps/web/lib/gse/no-bet-methodology.ts");
    expect(doc).toContain("PUBLIC_NO_BET_METHODOLOGY_EXAMPLES");
    for (const code of EXPECTED_REASON_CODES) {
      expect(doc).toContain(code);
    }
    expect(media.ok).toBe(true);
    expect(media.blockedHits).toEqual([]);
    expect(hasNoPerformanceClaim(doc)).toBe(true);
  });
});
