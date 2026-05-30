import { describe, it, expect } from "vitest";
import {
  markdownForStudioDraft,
  fileNameForStudioDraft,
} from "@/lib/studio/export";
import type { StudioAssetDraft } from "@/lib/studio/build-assets";

function makeDraft(overrides: Partial<StudioAssetDraft> = {}): StudioAssetDraft {
  return {
    templateKind: "FAN_EXPLAINER",
    templateName: "Fan Explainer",
    gateState: "READY",
    refusalReason: null,
    prompt: null,
    body: "Game preview body text.",
    citations: [],
    compliance: {
      status: "green",
      flags: [],
      publicReady: true,
    },
    ...overrides,
  };
}

describe("markdownForStudioDraft", () => {
  it("uses templateName as the H1 heading", () => {
    const md = markdownForStudioDraft(makeDraft({ templateName: "X Thread" }));
    expect(md).toMatch(/^# X Thread/);
  });

  it("includes the draft body text", () => {
    const md = markdownForStudioDraft(makeDraft({ body: "Test body content." }));
    expect(md).toContain("Test body content.");
  });

  it("treats null body as empty string (no crash)", () => {
    const md = markdownForStudioDraft(makeDraft({ body: null }));
    expect(md).toContain("## Citations");
  });

  it("includes a Citations section", () => {
    const md = markdownForStudioDraft(makeDraft());
    expect(md).toContain("## Citations");
  });

  it("formats citations as '- label: source' lines", () => {
    const draft = makeDraft({
      citations: [
        { id: "c1", label: "Odds API", source: "https://odds.example.com" },
        { id: "c2", label: "Pick", source: "NBA Game 123" },
      ],
    });
    const md = markdownForStudioDraft(draft);
    expect(md).toContain("- Odds API: https://odds.example.com");
    expect(md).toContain("- Pick: NBA Game 123");
  });

  it("shows '- No citations attached.' when citations array is empty", () => {
    const md = markdownForStudioDraft(makeDraft({ citations: [] }));
    expect(md).toContain("- No citations attached.");
  });

  it("includes a Compliance Scan section", () => {
    const md = markdownForStudioDraft(makeDraft());
    expect(md).toContain("## Compliance Scan");
  });

  it("includes compliance status uppercased", () => {
    const md = markdownForStudioDraft(
      makeDraft({ compliance: { status: "green", flags: [], publicReady: true } })
    );
    expect(md).toContain("Status: GREEN");
  });

  it("formats compliance flags as '- SEVERITY: message' lines", () => {
    const draft = makeDraft({
      compliance: {
        status: "yellow",
        publicReady: false,
        flags: [
          {
            id: "f1",
            layer: 2,
            severity: "warn",
            span: { start: 0, end: 5 },
            message: "Avoid guaranteed win claims.",
            suggestion: null,
          },
        ],
      },
    });
    const md = markdownForStudioDraft(draft);
    expect(md).toContain("- WARN: Avoid guaranteed win claims.");
  });

  it("shows '- No flags.' when compliance flags array is empty", () => {
    const md = markdownForStudioDraft(
      makeDraft({ compliance: { status: "green", flags: [], publicReady: true } })
    );
    expect(md).toContain("- No flags.");
  });

  it("section order: heading → body → Citations → Compliance", () => {
    const draft = makeDraft({
      body: "Body here.",
      citations: [{ id: "c1", label: "Source", source: "URL" }],
    });
    const md = markdownForStudioDraft(draft);
    const citationsIdx = md.indexOf("## Citations");
    const complianceIdx = md.indexOf("## Compliance Scan");
    const headingIdx = md.indexOf("# Fan Explainer");
    const bodyIdx = md.indexOf("Body here.");
    expect(headingIdx).toBeLessThan(bodyIdx);
    expect(bodyIdx).toBeLessThan(citationsIdx);
    expect(citationsIdx).toBeLessThan(complianceIdx);
  });
});

describe("fileNameForStudioDraft", () => {
  it("lowercases the templateKind", () => {
    const name = fileNameForStudioDraft(makeDraft({ templateKind: "FAN_EXPLAINER" }));
    expect(name).toBe("galaxy-studio-fan_explainer.md");
  });

  it("prefixes with 'galaxy-studio-'", () => {
    const name = fileNameForStudioDraft(makeDraft({ templateKind: "X_THREAD" }));
    expect(name).toMatch(/^galaxy-studio-/);
  });

  it("always ends with '.md'", () => {
    const name = fileNameForStudioDraft(makeDraft({ templateKind: "NEWSLETTER_BLOCK" }));
    expect(name).toMatch(/\.md$/);
  });

  it("encodes BETTING_EDUCATION correctly", () => {
    const name = fileNameForStudioDraft(makeDraft({ templateKind: "BETTING_EDUCATION" }));
    expect(name).toBe("galaxy-studio-betting_education.md");
  });

  it("encodes YOUTUBE_TITLE_IDEAS correctly", () => {
    const name = fileNameForStudioDraft(makeDraft({ templateKind: "YOUTUBE_TITLE_IDEAS" }));
    expect(name).toBe("galaxy-studio-youtube_title_ideas.md");
  });
});
