/**
 * Resource Intelligence — dump parser.
 *
 * The dump is an awesome-list style document:
 *   - `## BEGIN SOURCE FILE N: <name>`  → switches the source-file context
 *   - short heading lines (no " - ")     → category/section context
 *   - resource lines: "Name - Description" or "A, B or C - Description"
 *   - noise: WARNING / TIP / NOTE, "Share Feedback", separators, prose sentences
 *
 * The parser is deterministic and side-effect free. A resource line can yield
 * several names (split on commas / slashes / " or "); each becomes a RawResourceEntry
 * carrying its nearest section heading so the classifier can use list context
 * (e.g. a tool listed under "General Torrent Sites" inherits piracy context).
 */

import type { RawResourceEntry } from "./types";

const SOURCE_FILE_RE = /^##\s*BEGIN SOURCE FILE\s*\d+:\s*(.+?)\s*$/;

/** Lines that are never resources. */
const NOISE_EXACT = new Set([
  "warning",
  "tip",
  "note",
  "info",
  "share feedback",
  "got feedback?",
  "---",
  "--",
  "source files included",
]);

const NOISE_PREFIXES = [
  "keep in mind",
  "it's not recommended",
  "it's recommended",
  "remember to",
  "this file consolidates",
  "important:",
  "got feedback",
  "share feedback",
];

/**
 * Glyphs / bullet markers / zero-width + bidi control chars that decorate names
 * in the dump. Expressed via unicode escapes so the source stays ASCII-safe.
 *  ​-‏ zero-width + bidi marks, ‪-‮ bidi embeddings,
 *  ⁠ word-joiner, ﻿ BOM, plus common bullet/arrow/dash glyphs.
 */
const DECORATION_RE =
  /[​-‏‪-‮⁠﻿•▪●▸◦✅✨️☑☐→·–—]/g;

function stripDecoration(s: string): string {
  return s.replace(DECORATION_RE, "").replace(/\s+/g, " ").trim();
}

function isNoise(line: string): boolean {
  const lower = line.toLowerCase().trim();
  if (lower.length === 0) return true;
  if (NOISE_EXACT.has(lower)) return true;
  if (lower.startsWith("sha256")) return true;
  if (/sha256\s*`?[0-9a-f]{16,}/.test(lower)) return true;
  if (NOISE_PREFIXES.some((p) => lower.startsWith(p))) return true;
  // A numbered manifest line like: 1. `Pasted text (2)(8).txt` — 18,227 bytes
  if (/^\d+\.\s*`?pasted text/.test(lower)) return true;
  return false;
}

/**
 * A "resource line" carries " - " separating name(s) from a description.
 * Lines without " - " are treated as section headings (context), not resources,
 * which keeps the parser conservative (no safety hole — missed names just reduce
 * coverage, they cannot leak into an approved bucket).
 */
function looksLikeResourceLine(line: string): boolean {
  return / - | — /.test(line);
}

/** Split a "name" segment into individual resource names. */
export function splitNames(nameSegment: string): string[] {
  return nameSegment
    .split(/\s*,\s*|\s+or\s+|\s*\/\s*/i)
    .map((n) => stripDecoration(n))
    // Drop empties and bare numeric/"2"/"3" alias fragments left by "Tool / 2 / 3".
    .filter((n) => n.length > 1 && !/^\d+$/.test(n) && !/^v?\d+(\.\d+)?$/.test(n))
    .map((n) => n.trim());
}

export type ParseResult = {
  readonly entries: readonly RawResourceEntry[];
  readonly rawLineCount: number;
  readonly candidateEntryCount: number;
};

export function parseDump(raw: string): ParseResult {
  const lines = raw.split(/\r?\n/);
  const entries: RawResourceEntry[] = [];

  let sourceFile = "(preamble)";
  let section = "(none)";

  lines.forEach((rawLine, idx) => {
    const lineNumber = idx + 1;
    const line = rawLine.replace(/\t/g, " ").trimEnd();

    const sourceMatch = line.match(SOURCE_FILE_RE);
    if (sourceMatch) {
      sourceFile = (sourceMatch[1] ?? "").trim() || sourceFile;
      section = "(none)";
      return;
    }

    // Markdown headers / preamble structure are context only.
    if (line.startsWith("#")) {
      return;
    }

    if (isNoise(line)) return;

    if (!looksLikeResourceLine(line)) {
      // Treat a compact, title-ish line as the current section context.
      const cleaned = stripDecoration(line);
      if (cleaned.length > 0 && cleaned.length <= 60) {
        section = cleaned;
      }
      return;
    }

    // Resource line: split "names - description" on the FIRST " - "/" — ".
    const sepMatch = line.match(/ - | — /);
    if (!sepMatch || sepMatch.index === undefined) return;
    const nameSegment = line.slice(0, sepMatch.index);
    const description = stripDecoration(line.slice(sepMatch.index + sepMatch[0].length));

    for (const name of splitNames(nameSegment)) {
      entries.push({
        rawLine: line,
        lineNumber,
        sourceFile,
        section,
        name,
        description,
      });
    }
  });

  return {
    entries,
    rawLineCount: lines.length,
    candidateEntryCount: entries.length,
  };
}
