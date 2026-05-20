import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { scanForBannedPhrases } from "@/lib/trust-claims";

/**
 * Snapshot HTML banned-phrase scan.
 *
 * The launch-night snapshots in reports/launch-night/snapshots/*.html
 * are pre-rendered customer/cockpit views committed to the repo. If a
 * banned phrase shows up in one, the production page that produced it
 * is shipping a banned claim — the source-level scanner already covers
 * the page files, but the snapshots are the proof.
 *
 * Skipped gracefully if the snapshots directory does not exist (the
 * snapshots are an optional artifact).
 */

const repoRoot = resolve(__dirname, "..", "..", "..");
const SNAPSHOT_DIR = resolve(repoRoot, "reports/launch-night/snapshots");

function listHtmlFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".html"))
    .map((name) => join(dir, name))
    .filter((p) => statSync(p).isFile());
}

const SNAPSHOTS = listHtmlFiles(SNAPSHOT_DIR);

// Strip HTML tags + script/style + pre/code content before scanning so
// we only look at user-visible prose. `<pre>` and `<code>` carry shell
// commands and file paths (".git/index.lock", "block-level CSS", etc.)
// that legitimately use words like "lock" / "block" without being
// betting hype. The scanner only cares about prose.
function htmlText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, "")
    .replace(/<code\b[^>]*>[\s\S]*?<\/code>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

describe("Snapshot HTML — banned-phrase scan", () => {
  if (SNAPSHOTS.length === 0) {
    it.skip("no snapshots directory found, skipping scan", () => {
      /* skipped */
    });
    return;
  }

  for (const file of SNAPSHOTS) {
    const name = file.replace(SNAPSHOT_DIR + "/", "").replace(SNAPSHOT_DIR + "\\", "");
    it(`${name} contains no banned phrases in user-visible text`, () => {
      const html = readFileSync(file, "utf8");
      const text = htmlText(html);
      const hits = scanForBannedPhrases(text);
      if (hits.length > 0) {
        const summary = hits
          .map((h) => `  line ${h.line}: "${h.phrase}" — ${h.snippet}`)
          .join("\n");
        throw new Error(`${name} contains banned phrases in rendered text:\n${summary}`);
      }
      expect(hits.length).toBe(0);
    });
  }
});
