/**
 * GALILEO WEEK — the runner (fail-closed on live).
 *
 * runGalileoWeek builds the full Week Intelligence Atlas. In PREVIEW_FIXTURES mode it runs over the
 * deterministic fixture week (no network, no keys). LIVE mode is structurally refused here: this
 * package holds no keys and makes no calls, so a live run THROWS, directing the owner to provide
 * approved keys through a separate owner-gated integration after a `--plan` dry-run. Pure.
 */

import { buildWeekAtlas, type WeekInputs } from "./atlas-builder.js";
import type { OwnerApproval, WeekIntelligenceAtlas } from "./galileo-week-types.js";

export type GalileoWeekMode = "PREVIEW_FIXTURES" | "LIVE";

export interface GalileoWeekRunInput {
  readonly mode: GalileoWeekMode;
  readonly week: WeekInputs;
  /** Required for LIVE — but this package still refuses, because it holds no keys/network. */
  readonly ownerApproval?: OwnerApproval;
}

/**
 * Build the week atlas. PREVIEW is fixture-safe; LIVE fails closed — live execution is a separate
 * owner-gated integration that must supply keys + network, which this package deliberately lacks.
 */
export function runGalileoWeek(input: GalileoWeekRunInput): WeekIntelligenceAtlas {
  if (input.mode === "LIVE") {
    throw new Error(
      "Galileo Week LIVE is refused here: this package holds no keys and makes no network calls. " +
        "Run planGalileoWeek() for a zero-spend `--plan` preview, then execute via the owner-gated live " +
        "integration with approved keys. (Owner approval alone is not sufficient inside a fixture-safe package.)",
    );
  }
  return buildWeekAtlas(input.week);
}
