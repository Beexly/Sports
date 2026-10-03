import type { StudioAssetDraft } from "@/lib/studio/build-assets";

export function markdownForStudioDraft(draft: StudioAssetDraft): string {
  const citations = draft.citations
    .map((citation) => `- ${citation.label}: ${citation.source}`)
    .join("\n");
  const scanLines = draft.compliance.flags
    .map((flag) => `- ${flag.severity.toUpperCase()}: ${flag.message}`)
    .join("\n");

  return [
    `# ${draft.templateName}`,
    "",
    draft.body ?? "",
    "",
    "## Citations",
    citations || "- No citations attached.",
    "",
    "## Compliance Scan",
    `Status: ${draft.compliance.status.toUpperCase()}`,
    scanLines || "- No flags.",
  ].join("\n");
}

export function fileNameForStudioDraft(draft: StudioAssetDraft): string {
  return `galaxy-studio-${draft.templateKind.toLowerCase()}.md`;
}
