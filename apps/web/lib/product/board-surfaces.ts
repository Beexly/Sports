/**
 * Product board surfaces — STATKING / HELM / PICKPILOT / CLUBHOUSE.
 *
 * Honesty map for ops + founders: which brand labels are live production
 * routes vs design-preview / scene chrome / dark-by-law. Never market a
 * preview as a live product surface.
 *
 * Gates (hard): STATS_PUBLIC / LIVE_BOARD / PUBLIC_PICKS stay OFF until
 * eligibility + rights clear. This module does not flip gates.
 */

export type ProductBoardId =
  | "STATKING"
  | "HELM"
  | "PICKPILOT"
  | "CLUBHOUSE"
  | "GSE_BOARD"
  | "GSE_PICKS"
  | "GSE_COCKPIT";

export type ProductBoardStatus =
  | "live_gated"
  | "live_public"
  | "design_preview"
  | "scene_chrome"
  | "dark_by_law";

export type ProductBoardSurface = {
  readonly id: ProductBoardId;
  readonly label: string;
  readonly status: ProductBoardStatus;
  /** Production route(s) if any; empty when design-preview only. */
  readonly routes: readonly string[];
  readonly rankingP: "required" | "when_live" | "n/a";
  readonly operatorHint: string;
};

export type EnvMap = Record<string, string | undefined>;

function truthy(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Pure posture — no I/O. Safe for ops truth and unit tests.
 */
export function productBoardSurfaces(env: EnvMap = process.env): {
  readonly surfaces: readonly ProductBoardSurface[];
  readonly liveProductionIds: readonly ProductBoardId[];
  readonly darkByLawIds: readonly ProductBoardId[];
  readonly designPreviewOnly: readonly ProductBoardId[];
  readonly operatorHint: string;
} {
  const statsPublic = truthy(env["STATS_PUBLIC"]);
  const liveBoard = truthy(env["LIVE_BOARD"]);
  const publicPicks =
    truthy(env["PUBLIC_PICKS"]) || truthy(env["PUBLIC_PICKS_ENABLED"]);

  const surfaces: ProductBoardSurface[] = [
    {
      id: "STATKING",
      label: "StatKing",
      status: statsPublic ? "live_public" : "dark_by_law",
      routes: ["/stats", "/stats/*"],
      rankingP: "n/a",
      operatorHint: statsPublic
        ? "STATS_PUBLIC is ON — confirm rights memo + live feeds before marketing StatKing as live data."
        : "StatKing stays dark until STATS_PUBLIC + rights + live feeds. Snapshot/fixture only underneath.",
    },
    {
      id: "HELM",
      label: "Helm",
      status: "design_preview",
      routes: [],
      rankingP: "n/a",
      operatorHint:
        "Helm is design-preview only (design-preview/helm-homepage.html). Not a production route. Do not market as live product.",
    },
    {
      id: "PICKPILOT",
      label: "PickPilot",
      status: "design_preview",
      routes: [],
      rankingP: "n/a",
      operatorHint:
        "PickPilot brand is retired → Galaxy Sports Edge. design-preview/pickpilot-*.html is archive chrome only.",
    },
    {
      id: "CLUBHOUSE",
      label: "Clubhouse",
      status: "scene_chrome",
      routes: ["/fantasy/studio"],
      rankingP: "n/a",
      operatorHint:
        "Clubhouse is a fantasy studio scene (Nova host location), not a standalone product surface.",
    },
    {
      id: "GSE_BOARD",
      label: "GSE Board",
      status: liveBoard ? "live_public" : "live_gated",
      routes: ["/board"],
      rankingP: "required",
      operatorHint: liveBoard
        ? "LIVE_BOARD ON — rows must sort by rankingP; market vs signal kill switch still applies."
        : "LIVE_BOARD default OFF. Code path sorts by rankingP when board opens; do not invent slate.",
    },
    {
      id: "GSE_PICKS",
      label: "GSE Picks",
      status: publicPicks ? "live_public" : "live_gated",
      routes: ["/picks", "/api/picks"],
      rankingP: "required",
      operatorHint: publicPicks
        ? "PUBLIC_PICKS ON — confirm eligibility GREEN + proof bar before marketing track record."
        : "PUBLIC_PICKS dark by law while calibration RED / bootstrap. rankingP ready on code path.",
    },
    {
      id: "GSE_COCKPIT",
      label: "Founder Cockpit",
      status: "live_public",
      routes: ["/cockpit", "/dashboard", "/api/ops/public-surface-truth"],
      rankingP: "required",
      operatorHint:
        "Operator surfaces always available. rankingPower + productBoards + founderNextSteps are SoT.",
    },
  ];

  const liveProductionIds = surfaces
    .filter((s) => s.status === "live_public" || s.status === "live_gated")
    .map((s) => s.id);
  const darkByLawIds = surfaces
    .filter((s) => s.status === "dark_by_law")
    .map((s) => s.id);
  const designPreviewOnly = surfaces
    .filter((s) => s.status === "design_preview" || s.status === "scene_chrome")
    .map((s) => s.id);

  const operatorHint = [
    `Product boards: ${liveProductionIds.length} production-path, ${darkByLawIds.length} dark-by-law, ${designPreviewOnly.length} preview/scene.`,
    "Helm/PickPilot are not production routes. StatKing stays dark until rights. rankingP required on GSE board/picks/cockpit when live.",
  ].join(" ");

  return {
    surfaces,
    liveProductionIds,
    darkByLawIds,
    designPreviewOnly,
    operatorHint,
  };
}
