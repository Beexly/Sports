import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";

import {
  __setClientForTests,
  actionableRisks,
  composePreMortem,
} from "@/lib/brief/pre-mortem";
import type { SlatePickSnippet } from "@/lib/brief/slate-overview";

const SAMPLE_PICKS: readonly SlatePickSnippet[] = [
  {
    sport: "NBA",
    game: "Lakers vs Warriors",
    pickType: "SPREAD",
    selection: "Lakers -3.5",
    confidence: 82,
    pickGrade: "STRONG_PLAY",
  },
  {
    sport: "NBA",
    game: "Celtics vs Heat",
    pickType: "SPREAD",
    selection: "Celtics -2.5",
    confidence: 80,
    pickGrade: "STRONG_PLAY",
  },
];

function makeFakeClient(body: unknown): { client: Anthropic; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn(async () => ({
    content: [{ type: "text" as const, text: JSON.stringify(body) }],
  }));
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

describe("composePreMortem", () => {
  beforeEach(() => {
    process.env["ANTHROPIC_API_KEY"] = "sk-ant-test";
    process.env["VERCEL"] = "1";
  });

  afterEach(() => {
    __setClientForTests(undefined);
    delete process.env["ANTHROPIC_API_KEY"];
    delete process.env["VERCEL"];
  });

  it("returns the structured risks + summary + metadata", async () => {
    __setClientForTests(
      makeFakeClient({
        risks: [
          {
            kind: "CONFIDENCE_CONCENTRATION",
            severity: "MEDIUM",
            observation: "Both picks bunched in 80-82 confidence range",
            affectedCount: 2,
          },
          {
            kind: "SINGLE_SOURCE_DEPENDENCE",
            severity: "HIGH",
            observation: "Both picks cite only the-odds-api",
            affectedCount: 2,
          },
        ],
        summary:
          "Tight slate with confidence concentration AND single-source dependence — outage risk.",
      }).client
    );

    const report = await composePreMortem({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
      sources: ["the-odds-api"],
    });

    expect(report.risks).toHaveLength(2);
    expect(report.risks[0]!.kind).toBe("CONFIDENCE_CONCENTRATION");
    expect(report.risks[1]!.severity).toBe("HIGH");
    expect(report.summary).toContain("outage");
    expect(report.model).toBe("claude-sonnet-4-6");
    expect(report.composerVersion).toMatch(/^pre-mortem\/v/);
    expect(report.composedAt).toMatch(/T/);
  });

  it("accepts an empty risks array as honest clean-slate output", async () => {
    __setClientForTests(
      makeFakeClient({
        risks: [],
        summary:
          "Slate is structurally healthy: spread across home/away, multiple sources, varied confidence band.",
      }).client
    );

    const report = await composePreMortem({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
    });

    expect(report.risks).toEqual([]);
    expect(report.summary).toContain("healthy");
  });

  it("caps risks at the documented maximum", async () => {
    const tooMany = Array.from({ length: 15 }, (_, i) => ({
      kind: "OTHER" as const,
      severity: "LOW" as const,
      observation: `risk ${i}`,
      affectedCount: 1,
    }));
    __setClientForTests(
      makeFakeClient({ risks: tooMany, summary: "many" }).client
    );

    const report = await composePreMortem({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
    });

    expect(report.risks.length).toBe(8);
  });

  it("renders the picks block with sport prefix + grade in the user prompt", async () => {
    const { client, create } = makeFakeClient({ risks: [], summary: "ok" });
    __setClientForTests(client);

    await composePreMortem({
      date: "2026-05-23",
      picks: SAMPLE_PICKS,
    });

    const args = create.mock.calls[0]![0] as { messages: { content: string }[] };
    const userPrompt = args.messages[0]!.content;
    expect(userPrompt).toContain("[NBA] Lakers vs Warriors");
    expect(userPrompt).toContain("STRONG_PLAY");
    expect(userPrompt).toContain("Date: May 23, 2026");
  });

  it("attaches ephemeral cache_control to the system block", async () => {
    const { client, create } = makeFakeClient({ risks: [], summary: "ok" });
    __setClientForTests(client);

    await composePreMortem({ date: "2026-05-23", picks: SAMPLE_PICKS });

    const args = create.mock.calls[0]![0] as {
      system: Array<{ cache_control?: unknown }>;
    };
    expect(args.system[0]!.cache_control).toEqual({ type: "ephemeral" });
  });

  it("throws on empty picks (no spend on a no-slate night)", async () => {
    __setClientForTests(makeFakeClient({ risks: [], summary: "x" }).client);
    await expect(
      composePreMortem({ date: "2026-05-23", picks: [] })
    ).rejects.toThrow("at least one pick");
  });

  it("throws when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env["ANTHROPIC_API_KEY"];
    __setClientForTests(undefined);
    await expect(
      composePreMortem({ date: "2026-05-23", picks: SAMPLE_PICKS })
    ).rejects.toThrow("ANTHROPIC_API_KEY");
  });
});

describe("actionableRisks", () => {
  function makeReport(
    risks: Array<{ severity: "LOW" | "MEDIUM" | "HIGH" }>
  ) {
    return {
      risks: risks.map((r, i) => ({
        kind: "OTHER" as const,
        severity: r.severity,
        observation: `risk ${i}`,
        affectedCount: 1,
      })),
      summary: "x",
      composerVersion: "pre-mortem/v1",
      model: "claude-sonnet-4-6",
      composedAt: new Date().toISOString(),
    };
  }

  it("keeps HIGH + MEDIUM, drops LOW", () => {
    const out = actionableRisks(
      makeReport([
        { severity: "HIGH" },
        { severity: "MEDIUM" },
        { severity: "LOW" },
        { severity: "LOW" },
      ])
    );
    expect(out.map((r) => r.severity)).toEqual(["HIGH", "MEDIUM"]);
  });

  it("returns empty when no actionable risks present", () => {
    const out = actionableRisks(
      makeReport([{ severity: "LOW" }, { severity: "LOW" }])
    );
    expect(out).toEqual([]);
  });
});
