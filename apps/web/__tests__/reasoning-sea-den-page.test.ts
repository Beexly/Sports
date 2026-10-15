import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadSeaDenDossier } from "@/lib/reasoning/sea-den-dossier";

describe("/reasoning/2026-06-sea-den route & dossier surface", () => {
  it("loads the v2 SEA@DEN dossier with >= 40 edges, >= 25 premises, and 279 universal accounting", () => {
    const { dossier, depthLadder, dossierSha256 } = loadSeaDenDossier();
    expect(dossier.game_id).toBe("2026_06_SEA_DEN");
    expect(dossier.version).toBe(2);
    expect(dossier.emission_status).toBe("ZERO_OBJECT");
    expect(dossier.walk_forward_gate.passed).toBe(false);
    expect(dossier.walk_forward_gate.banner).toBe("Emission locked — ZERO_OBJECT");
    expect(dossier.graph_summary.total_edges).toBeGreaterThanOrEqual(40);
    expect(dossier.premise_count).toBeGreaterThanOrEqual(25);
    expect(dossier.premises).toHaveLength(dossier.premise_count);
    expect(dossier.non_stat_premise_count).toBeGreaterThanOrEqual(3);
    expect(depthLadder.accounting_check_279).toBe(279);
    expect(
      depthLadder.live_wired_signals_count + depthLadder.shadow_ledger_rows_count,
    ).toBe(279);
    expect(dossierSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("page source renders locked banner, edge count, and premises without calling any emission path", () => {
    const pageSrc = readFileSync(
      join(process.cwd(), "app/reasoning/2026-06-sea-den/page.tsx"),
      "utf8",
    );
    expect(pageSrc).toContain("Emission locked — ZERO_OBJECT");
    expect(pageSrc).toContain("dossier.graph_summary.total_edges");
    expect(pageSrc).toContain("dossier.premise_count");
    expect(pageSrc).toContain("dossier.premises.map");
    expect(pageSrc).not.toMatch(/generateSignalSlate|runBoardFillPipeline|pickCreate/i);
  });
});
