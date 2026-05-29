/**
 * ADR public index — lightweight loader for /decisions.
 *
 * Reads docs/adr/*.md, extracts the first H1 (title), the Date, and
 * the Status. Does NOT render the body — the body is operator/engineer
 * audience; the public surface gets the title + status + decision
 * sentence only.
 *
 * If an ADR file is missing fields, it is gracefully skipped.
 */

import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const ADR_DIR = resolve(process.cwd(), "..", "..", "docs", "adr");
// Inside the Next dev build the cwd is apps/web; fallback to project root if needed.

export interface AdrEntry {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly date: string | null;
  readonly status: string | null;
  readonly decisionSentence: string | null;
}

function extractTitle(content: string): string | null {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1]!.trim() : null;
}

function extractMeta(content: string, key: string): string | null {
  const re = new RegExp(`^\\*\\*${key}:\\*\\*\\s*(.+)$`, "mi");
  const m = content.match(re);
  return m ? m[1]!.trim() : null;
}

function extractDecisionSentence(content: string): string | null {
  // Find the line(s) after a "## Decision" heading and return the first non-empty paragraph.
  const idx = content.search(/^##\s+Decision/mi);
  if (idx < 0) return null;
  const tail = content.slice(idx).split(/\r?\n/);
  // Skip the header line itself
  const body = tail.slice(1).join("\n").trim();
  // Take the first non-empty line/paragraph
  const para = body.split(/\n\n/)[0]?.trim() ?? null;
  if (!para) return null;
  // Strip markdown emphasis
  return para.replace(/[*_`]/g, "").slice(0, 320);
}

export async function loadAdrIndex(): Promise<ReadonlyArray<AdrEntry>> {
  let files: string[] = [];
  try {
    files = await readdir(ADR_DIR);
  } catch {
    return [];
  }

  const mdFiles = files.filter((f) => f.endsWith(".md"));
  const entries: AdrEntry[] = [];

  for (const file of mdFiles) {
    try {
      const slug = file.replace(/\.md$/, "");
      const id = slug.match(/^\d+/)?.[0] ?? slug;
      const content = await readFile(join(ADR_DIR, file), "utf8");
      const title = extractTitle(content);
      if (!title) continue;
      entries.push({
        id,
        slug,
        title,
        date: extractMeta(content, "Date"),
        status: extractMeta(content, "Status"),
        decisionSentence: extractDecisionSentence(content),
      });
    } catch {
      // skip files we cannot read
    }
  }

  // Sort by numeric id descending (newest first)
  entries.sort((a, b) => Number(b.id) - Number(a.id));

  return entries;
}
