/**
 * Export-path classifier — Produced Work vs Derivative DB vs Result.
 * Structural gap fix: every bulk export must classify license obligations.
 */

export type ExportClass =
  | "RESULT" // metrics, charts, query products — attribution often enough
  | "ENHANCED_DATA" // CDLA-Sharing / ODbL enhanced data stays under share-alike
  | "DERIVATIVE_DB" // bulk restructured DB — ODbL/share-alike may apply
  | "BLOCKED"; // rights_hold / excluded

export type ExportClassification = {
  class: ExportClass;
  licenseSpdx: string;
  attributionRequired: boolean;
  commercialOk: boolean;
  reasons: string[];
};

export function classifyExport(input: {
  bulkRowCount: number;
  includesRawSourceRows: boolean;
  licenseSpdx: string;
  surface: "public_api" | "pro_api" | "elite_api" | "internal_only" | "dark";
  rightsHold?: boolean;
}): ExportClassification {
  const reasons: string[] = [];
  if (input.rightsHold || input.surface === "dark" || input.surface === "internal_only") {
    return {
      class: "BLOCKED",
      licenseSpdx: input.licenseSpdx,
      attributionRequired: true,
      commercialOk: false,
      reasons: ["rights_hold_or_dark_surface"],
    };
  }
  const spdx = input.licenseSpdx.toUpperCase();
  if (spdx.includes("ODBL") || spdx.includes("CDLA-SHARING") || spdx.includes("GPL")) {
    if (input.includesRawSourceRows || input.bulkRowCount > 10_000) {
      reasons.push("share_alike_bulk");
      return {
        class: "DERIVATIVE_DB",
        licenseSpdx: input.licenseSpdx,
        attributionRequired: true,
        commercialOk: spdx.includes("ODBL"),
        reasons,
      };
    }
    reasons.push("share_alike_enhanced");
    return {
      class: "ENHANCED_DATA",
      licenseSpdx: input.licenseSpdx,
      attributionRequired: true,
      commercialOk: true,
      reasons,
    };
  }
  // CC-BY / Apache / MIT / proprietary pure formulas → Result
  reasons.push("produced_work_or_result");
  return {
    class: "RESULT",
    licenseSpdx: input.licenseSpdx,
    attributionRequired: spdx.includes("BY") || spdx.includes("CC-BY"),
    commercialOk: true,
    reasons,
  };
}

export function requireSpdx(meta: {
  licenseSpdx?: string | null;
  attributionRequired?: boolean | null;
}): { ok: true; licenseSpdx: string; attributionRequired: boolean } | { ok: false; code: string } {
  if (!meta.licenseSpdx || !meta.licenseSpdx.trim()) {
    return { ok: false, code: "spdx_required" };
  }
  return {
    ok: true,
    licenseSpdx: meta.licenseSpdx.trim(),
    attributionRequired: Boolean(meta.attributionRequired),
  };
}
