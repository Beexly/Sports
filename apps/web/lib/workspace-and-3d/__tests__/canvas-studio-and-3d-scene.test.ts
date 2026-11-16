import { describe, expect, it } from "vitest";
import {
  buildCollaborativeSlateDocSection,
  buildContentOsCrewSlateAndSeoCard,
  evaluateRedline3dSceneBudget,
} from "../canvas-studio-and-3d-scene";

describe("3D Redline budget, collaborative slate sections & Content-OS CWV cards", () => {
  it("enforces 60fps Redline geometry, triangle, shadow & KTX2 budgets", () => {
    const ok = evaluateRedline3dSceneBudget({
      drawCalls: 72,
      triangles: 88_000,
      shadowMapResolution: 1024,
      iblHdrCompression: "KTX2_ASTC",
    });
    expect(ok.approved60Fps).toBe(true);
    expect(ok.warnings).toEqual([]);

    const heavy = evaluateRedline3dSceneBudget({
      drawCalls: 250,
      triangles: 400_000,
      shadowMapResolution: 4096,
      iblHdrCompression: "UNCOMPRESSED",
    });
    expect(heavy.approved60Fps).toBe(false);
    expect(heavy.warnings.length).toBe(4);
  });

  it("enforces MCP verification on collaborative sections and paywall/CWV gates on Content-OS", () => {
    expect(() =>
      buildCollaborativeSlateDocSection({
        sectionId: "sec-1",
        trackerKey: "gse-101",
        mcpGatewayVerified: false,
        rawMarkdown: "Untrusted note",
      }),
    ).toThrow(/MCP gateway/i);

    const section = buildCollaborativeSlateDocSection({
      sectionId: "sec-2",
      trackerKey: "gse-102",
      mcpGatewayVerified: true,
      rawMarkdown: "Pace splits show faster tempo <script>alert(1)</script> in Q2.",
    });
    expect(section.trackerKey).toBe("GSE-102");
    expect(section.sanitizeHtmlFree).toBe(true);

    const blockedPickCard = buildContentOsCrewSlateAndSeoCard({
      slateId: "w10-sun",
      directorNote: "Includes free environment tempo highlights.",
      stadiumWatchBeaconId: "ford-field-gate-a",
      lcpMs: 1450,
      clsScore: 0.02,
      containsPaidPickSelection: true,
    });
    expect(blockedPickCard.publicPublishAllowed).toBe(false);

    const cleanCard = buildContentOsCrewSlateAndSeoCard({
      slateId: "w10-sun",
      directorNote: "Offensive line trench battle preview.",
      stadiumWatchBeaconId: "ford-field-gate-a",
      lcpMs: 1450,
      clsScore: 0.02,
      containsPaidPickSelection: false,
    });
    expect(cleanCard.publicPublishAllowed).toBe(true);
  });
});
