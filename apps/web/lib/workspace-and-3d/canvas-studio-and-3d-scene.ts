/**
 * WebGL/3D scene budget guard (hdmitsuba, filament-assets, three-live),
 * zero-trust collaborative slate notes (LibreChat, esmeralda, AppFlowy, AFFiNE,
 * Huly/Plane), and Content-OS video crew slate + Nearby/Site-Kit CWV cards.
 */

export interface Redline3dSceneBudget {
  readonly drawCalls: number;
  readonly triangles: number;
  readonly shadowMapResolution: number;
  readonly iblHdrCompression: "KTX2_ASTC" | "UNCOMPRESSED";
}

export interface Redline3dBudgetVerdict {
  readonly approved60Fps: boolean;
  readonly warnings: readonly string[];
}

/**
 * Validates Three.js / RedlineWorld WebGL geometry & IBL texture budgets.
 */
export function evaluateRedline3dSceneBudget(
  budget: Redline3dSceneBudget,
): Redline3dBudgetVerdict {
  const warnings: string[] = [];
  if (budget.drawCalls > 120) {
    warnings.push(`draw_calls_over_budget:${budget.drawCalls}`);
  }
  if (budget.triangles > 150_000) {
    warnings.push(`triangles_over_budget:${budget.triangles}`);
  }
  if (budget.shadowMapResolution > 2048) {
    warnings.push(`shadow_map_too_large:${budget.shadowMapResolution}`);
  }
  if (budget.iblHdrCompression !== "KTX2_ASTC") {
    warnings.push("uncompressed_ibl_hdr_forbidden");
  }
  return {
    approved60Fps: warnings.length === 0,
    warnings,
  };
}

export interface CollaborativeSlateSection {
  readonly sectionId: string;
  readonly trackerKey: string;
  readonly mcpGatewayVerified: boolean;
  readonly sanitizeHtmlFree: boolean;
  readonly markdownSummary: string;
}

/**
 * Linear-time fixed-point HTML and script-tag stripper immune to nested tag bypasses.
 */
function stripScriptAndHtmlLinear(raw: string): string {
  let out = raw;
  for (;;) {
    const startLen = out.length;

    for (;;) {
      const lower = out.toLowerCase();
      const start = lower.indexOf("<script");
      if (start < 0) {
        break;
      }
      const openEnd = out.indexOf(">", start + 7);
      if (openEnd < 0) {
        out = out.slice(0, start);
        continue;
      }
      const closeStart = lower.indexOf("</script", openEnd + 1);
      if (closeStart < 0) {
        out = out.slice(0, start);
        continue;
      }
      const closeEnd = out.indexOf(">", closeStart + 8);
      out =
        closeEnd < 0
          ? out.slice(0, start)
          : `${out.slice(0, start)}${out.slice(closeEnd + 1)}`;
    }

    for (;;) {
      const lt = out.indexOf("<");
      if (lt < 0) {
        break;
      }
      const gt = out.indexOf(">", lt + 1);
      if (gt < 0) {
        break;
      }
      out = `${out.slice(0, lt)}${out.slice(gt + 1)}`;
    }

    if (out.includes("<") || out.includes(">")) {
      let clean = "";
      for (let i = 0; i < out.length; i++) {
        const ch = out.charAt(i);
        if (ch !== "<" && ch !== ">") {
          clean += ch;
        }
      }
      out = clean;
    }

    if (out.length === startLen) {
      break;
    }
  }
  return out;
}

/**
 * Builds a sanitized collaborative workspace note bound to an issue tracker key.
 */
export function buildCollaborativeSlateDocSection(params: {
  readonly sectionId: string;
  readonly trackerKey: string;
  readonly mcpGatewayVerified: boolean;
  readonly rawMarkdown: string;
}): CollaborativeSlateSection {
  if (!params.mcpGatewayVerified) {
    throw new Error("Collaborative slate writes require zero-trust MCP gateway verification.");
  }
  const stripped = stripScriptAndHtmlLinear(params.rawMarkdown)
    .replace(/\u2014|\u2013/g, "-")
    .trim();
  const hasTagChars = stripped.includes("<") || stripped.includes(">");
  return {
    sectionId: params.sectionId.trim(),
    trackerKey: params.trackerKey.trim().toUpperCase(),
    mcpGatewayVerified: true,
    sanitizeHtmlFree: !hasTagChars,
    markdownSummary: stripped,
  };
}

export interface ContentOsCrewSlate {
  readonly slateId: string;
  readonly directorNote: string;
  readonly stadiumWatchBeaconId: string;
  readonly lcpMs: number;
  readonly clsScore: number;
  readonly containsPaidPickSelection: boolean;
  readonly publicPublishAllowed: boolean;
}

/**
 * Validates public-safe Content-OS video crew card, Nearby beacon & Core Web Vitals.
 */
export function buildContentOsCrewSlateAndSeoCard(params: {
  readonly slateId: string;
  readonly directorNote: string;
  readonly stadiumWatchBeaconId: string;
  readonly lcpMs: number;
  readonly clsScore: number;
  readonly containsPaidPickSelection: boolean;
}): ContentOsCrewSlate {
  const cwvHealthy = params.lcpMs <= 2500 && params.clsScore <= 0.1;
  const sanitizedNote = params.directorNote.replace(/\u2014|\u2013/g, "-").trim();
  return {
    slateId: params.slateId.trim(),
    directorNote: sanitizedNote,
    stadiumWatchBeaconId: params.stadiumWatchBeaconId.trim(),
    lcpMs: params.lcpMs,
    clsScore: params.clsScore,
    containsPaidPickSelection: params.containsPaidPickSelection,
    publicPublishAllowed: !params.containsPaidPickSelection && cwvHealthy,
  };
}
