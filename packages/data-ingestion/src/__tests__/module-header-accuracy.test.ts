/**
 * Module header accuracy — a paper-named module's stated Mechanism must not
 * describe a different paper's method.
 *
 * Defect class: "mislabeled stub". In `packages/data-ingestion/src/`, several
 * `*-tracklet-association.ts` modules carry a title for one paper (e.g. "When
 * Metropolis and Hastings Meet Bradley and Terry: Exact MCMC From Preference
 * Voting") while their `Mechanism:` line describes GTA's global tracklet
 * association. A reader — or an agent — then believes the module reproduces the
 * cited paper when it does not. The previous pass fixed seven such headers; this
 * test covers the remaining tracklet-association family so the class cannot
 * regress.
 *
 * The fix is documentation-only: mark the header "GENERIC BASELINE — NOT THE
 * PAPER IMPLEMENTATION" and replace the false Mechanism line. No math is
 * invented, and no sealed invariant is touched.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(__dirname, "..");
const GENERIC_MECHANISM = "Global tracklet association over per-frame detections";

/** Titles whose paper genuinely is about tracking / association / pose / trajectory. */
const TRACKING_TITLE = /track|multi-object|association|pose|trajectory|agent data|ball detection|ball tracking/i;

function headerOf(file: string): { title: string; mechanism: string; genericBaseline: boolean } {
  const text = readFileSync(join(SRC, file), "utf8");
  const head = text.slice(0, text.indexOf("*/"));
  const lines = head.split("\n");
  const title = (lines[1] ?? "").replace(/^\s*\*\s?/, "").trim();
  const mechanism = (lines.find((l) => l.includes("Mechanism:")) ?? "")
    .replace(/^\s*\*\s?/, "")
    .replace(/^Mechanism:\s*/, "")
    .trim();
  const genericBaseline = /GENERIC BASELINE/.test(head);
  return { title, mechanism, genericBaseline };
}

describe("data-ingestion module headers describe the paper they cite", () => {
  const files = readdirSync(SRC).filter((f) => f.endsWith("-tracklet-association.ts"));

  it("has the tracklet-association family present", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("does not claim GTA tracklet association for a non-tracking paper without a generic-baseline warning", () => {
    const violators: string[] = [];
    for (const f of files) {
      const { title, mechanism, genericBaseline } = headerOf(f);
      const claimsGta = mechanism.includes(GENERIC_MECHANISM);
      const titleTracks = TRACKING_TITLE.test(title);
      if (claimsGta && !titleTracks && !genericBaseline) {
        violators.push(`${f} | title="${title}" | mechanism claims GTA tracklet association`);
      }
    }
    expect(violators).toEqual([]);
  });
});
