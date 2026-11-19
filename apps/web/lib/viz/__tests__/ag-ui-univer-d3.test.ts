import { describe, expect, it } from "vitest";
import {
  buildLineupDoctorAgUiEvents,
  formatAgUiSseChunk,
  scrubPublicAgUiText,
} from "../../ag-ui/protocol";
import { computeReliabilityDiagram } from "../d3-calibration-curves";
import { buildUniverDfsExposureWorkbook, sanitizeSpreadsheetText } from "../univer-dfs-workbook";

describe("ag-ui, univer & d3 web adapters", () => {
  it("scrubs internal pipeline jargon and emits valid SSE AG-UI envelopes", () => {
    const cleaned = scrubPublicAgUiText(
      "Romano CQR and Sinkhorn over 10,000 worlds predict -- higher target share.",
    );
    expect(cleaned).not.toMatch(/Romano|Sinkhorn|10,000 worlds/i);

    const events = buildLineupDoctorAgUiEvents({
      threadId: "thread-w10",
      runId: "run-1",
      summaryText: "Cholesky edge cleared for FLEX slot.",
      healthyCount: 8,
      flaggedCount: 1,
      now: new Date("2026-11-16T06:00:00.000Z"),
    });
    expect(events[0].type).toBe("RUN_STARTED");
    expect(events[events.length - 1].type).toBe("RUN_FINISHED");

    const textEvent = events.find((e) => e.type === "TEXT_MESSAGE_CONTENT");
    expect(String(textEvent?.payload["delta"])).not.toContain("Cholesky");

    const sse = formatAgUiSseChunk(events[0]);
    expect(sse.startsWith("event: RUN_STARTED\ndata: ")).toBe(true);
    expect(sse.endsWith("\n\n")).toBe(true);
  });

  it("builds Univer 2-TE exposure workbooks with FREE redaction and formula sanitization", () => {
    expect(sanitizeSpreadsheetText("=cmd|'/C calc'!A0")).toBe("cmd|'/C calc'!A0");

    const rows = [
      {
        playerId: "p1",
        playerName: "=HYPERLINK(\"http://bad\",\"Player One\")",
        team: "det",
        position: "te",
        salary: 5400,
        exposurePct: 38.5,
        projPoints: 14.8,
        isLateWindowFlexEligible: true,
      },
      {
        playerId: "p2",
        playerName: "Player Two",
        team: "buf",
        position: "wr",
        salary: 7100,
        exposurePct: 22.0,
        projPoints: 18.2,
        isLateWindowFlexEligible: false,
      },
    ];

    const freeBook = buildUniverDfsExposureWorkbook("w10-main", rows, "FREE");
    const freeSheet = freeBook.sheets["exposure_matrix"];
    expect(freeSheet.freeze).toEqual({
      xSplit: 1,
      ySplit: 1,
      startRow: 1,
      startColumn: 1,
    });
    expect(String(freeSheet.cellData[1][1].v).startsWith("=")).toBe(false);
    expect(freeSheet.cellData[1][5].v).toBe("PRO_ONLY");
    expect(freeSheet.cellData[1][6].v).toBe("PRO_ONLY");

    const proBook = buildUniverDfsExposureWorkbook("w10-main", rows, "PRO");
    const proSheet = proBook.sheets["exposure_matrix"];
    expect(proSheet.cellData[1][5].v).toBe(38.5);
    expect(proSheet.cellData[1][6].v).toBe(14.8);
    expect(proSheet.cellData[3][5].v).toBe(60.5);
  });

  it("computes D3 reliability bins, ECE, SVG path and enforces the 200-sample gate", () => {
    const perfectSamples = [
      { predictedProb: 0.25, outcome: 0 as const },
      { predictedProb: 0.25, outcome: 0 as const },
      { predictedProb: 0.25, outcome: 0 as const },
      { predictedProb: 0.25, outcome: 1 as const },
      { predictedProb: 0.75, outcome: 1 as const },
      { predictedProb: 0.75, outcome: 1 as const },
      { predictedProb: 0.75, outcome: 1 as const },
      { predictedProb: 0.75, outcome: 0 as const },
    ];
    const diagram = computeReliabilityDiagram(perfectSamples, 5, 200, 100);
    expect(diagram.ece).toBe(0);
    expect(diagram.winRateDisplayCleared).toBe(false);
    expect(diagram.diagonalPathD).toBe("M 0.00 100.00 L 200.00 0.00");
    expect(diagram.svgPathD).toContain("M 50.00 75.00 L 150.00 25.00");

    const manySamples = Array.from({ length: 205 }, (_, idx) => ({
      predictedProb: 0.65,
      outcome: (idx % 2 === 0 ? 1 : 0) as 0 | 1,
    }));
    expect(computeReliabilityDiagram(manySamples).winRateDisplayCleared).toBe(true);
  });
});
