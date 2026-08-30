import { describe, expect, it } from "vitest";
import { productBoardSurfaces } from "@/lib/product/board-surfaces";

describe("productBoardSurfaces", () => {
  it("marks Helm/PickPilot design-preview and Clubhouse scene", () => {
    const p = productBoardSurfaces({});
    const byId = Object.fromEntries(p.surfaces.map((s) => [s.id, s]));
    expect(byId.HELM.status).toBe("design_preview");
    expect(byId.PICKPILOT.status).toBe("design_preview");
    expect(byId.CLUBHOUSE.status).toBe("scene_chrome");
    expect(byId.STATKING.status).toBe("dark_by_law");
    expect(p.designPreviewOnly).toContain("HELM");
    expect(p.designPreviewOnly).toContain("PICKPILOT");
  });

  it("requires rankingP on GSE board/picks/cockpit", () => {
    const p = productBoardSurfaces({});
    for (const id of ["GSE_BOARD", "GSE_PICKS", "GSE_COCKPIT"] as const) {
      const s = p.surfaces.find((x) => x.id === id);
      expect(s?.rankingP).toBe("required");
    }
  });

  it("does not invent live StatKing when STATS_PUBLIC unset", () => {
    const p = productBoardSurfaces({ STATS_PUBLIC: "false" });
    expect(p.darkByLawIds).toContain("STATKING");
    expect(p.operatorHint).toMatch(/StatKing stays dark|dark-by-law/i);
  });

  it("surfaces StatKing open only when STATS_PUBLIC on", () => {
    const p = productBoardSurfaces({ STATS_PUBLIC: "true" });
    const sk = p.surfaces.find((s) => s.id === "STATKING");
    expect(sk?.status).toBe("live_public");
  });
});
