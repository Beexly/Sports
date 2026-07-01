import { describe, expect, it } from "vitest";
import { normalizeForComplianceScan } from "@/lib/compliance-scanner/normalize";
import { scanModelJournalMarkdown } from "@/lib/journal/compliance";
import { scanStudioContent } from "@/lib/studio/build-assets";
import { runNoClaimGuard } from "@/lib/gse/waitlist-validation";

/**
 * Regression: a multi-word banned phrase that a soft line-wrap splits across a
 * newline (e.g. "a sure\nthing") must still be caught by the submit-time
 * compliance scanner. Markdown renders the soft wrap as one continuous claim,
 * so the phrase reaches the reader even though the rule regex matches a literal
 * space, not a "\n". The scanner now collapses soft wraps before matching.
 *
 * Paired with the read-time public-journal guard, this keeps authoring-time and
 * read-time no-claim enforcement in lock-step.
 */

describe("normalizeForComplianceScan", () => {
  it("collapses a single soft newline into a space", () => {
    expect(normalizeForComplianceScan("a sure\nthing")).toBe("a sure thing");
  });

  it("folds CRLF the same way as LF", () => {
    expect(normalizeForComplianceScan("a sure\r\nthing")).toBe("a sure thing");
  });

  it("preserves paragraph breaks so words across a blank line are not merged", () => {
    expect(normalizeForComplianceScan("sure\n\nthing")).toBe("sure\n\nthing");
  });

  it("leaves clean single-line text untouched", () => {
    const clean = "The model weighs recent form and market depth.";
    expect(normalizeForComplianceScan(clean)).toBe(clean);
  });
});

describe("scanModelJournalMarkdown — soft-wrapped banned phrase", () => {
  it("blocks a banned phrase hard-wrapped across a newline", () => {
    const wrapped =
      "The model leaned home after the line moved. Calling it a sure\nthing on Sunday.";
    const scan = scanModelJournalMarkdown(wrapped);

    expect(scan.status).toBe("red");
    expect(scan.publishAllowed).toBe(false);
    expect(scan.flags.map((flag) => flag.id)).toContain("L2-GUARANTEE");
  });

  it("blocks the same phrase on a single line (control)", () => {
    const oneLine =
      "The model leaned home after the line moved. Calling it a sure thing on Sunday.";
    const scan = scanModelJournalMarkdown(oneLine);

    expect(scan.status).toBe("red");
    expect(scan.publishAllowed).toBe(false);
    expect(scan.flags.map((flag) => flag.id)).toContain("L2-GUARANTEE");
  });

  it("does NOT fabricate a phrase across a real paragraph break", () => {
    const paragraphBreak =
      "Nothing here is a sure\n\nthing, and the model stays humble about the read.";
    const scan = scanModelJournalMarkdown(paragraphBreak);

    expect(scan.flags.map((flag) => flag.id)).not.toContain("L2-GUARANTEE");
    expect(scan.publishAllowed).toBe(true);
  });

  it("does NOT fabricate a phrase from an innocent soft wrap", () => {
    const cleanWrapped =
      "The model weighs recent form and market\ndepth before it scores a matchup.";
    const scan = scanModelJournalMarkdown(cleanWrapped);

    expect(scan.status).toBe("green");
    expect(scan.publishAllowed).toBe(true);
  });
});

describe("scanStudioContent — soft-wrapped banned phrase", () => {
  it("blocks a banned phrase hard-wrapped across a newline", () => {
    const scan = scanStudioContent(
      "NEWSLETTER_BLOCK",
      "The read is strong, but never a sure\nthing for the slate."
    );

    expect(scan.status).toBe("red");
    expect(scan.publicReady).toBe(false);
    expect(scan.flags.map((flag) => flag.id)).toContain("L2-GUARANTEE");
  });
});

describe("runNoClaimGuard — soft-wrapped banned phrase", () => {
  it("blocks a banned phrase hard-wrapped across a newline", () => {
    const result = runNoClaimGuard("Get in early on what is basically a sure\nthing.");

    expect(result.ok).toBe(false);
    expect(result.flags.map((flag) => flag.id)).toContain("L2-GUARANTEE");
  });

  it("does NOT fabricate a phrase across a real paragraph break", () => {
    const result = runNoClaimGuard("Nothing is a sure\n\nthing on the waitlist.");

    expect(result.flags.map((flag) => flag.id)).not.toContain("L2-GUARANTEE");
  });
});
