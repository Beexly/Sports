import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findUnfinishedPublicCopy,
  PUBLIC_UNFINISHED_PHRASES,
} from "@/lib/launch/unfinished-copy-fence";

const webRoot = join(__dirname, "..");
const appRoot = join(webRoot, "app");

/** Public route trees that must not advertise incomplete work. */
const PUBLIC_ROOTS = [
  "",
  "about",
  "academy",
  "accountability",
  "board",
  "clv",
  "fantasy",
  "house",
  "intelligence",
  "methodology",
  "newsletter",
  "observatory",
  "optimizer",
  "performance",
  "picks",
  "players",
  "podcast",
  "pricing",
  "proof",
  "gsn",
  "the-beat",
  "tools",
  "track",
  "trends",
  "vault",
  "verify",
  "waitlist",
];

function walkPages(dir: string, out: string[] = []): string[] {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "admin" || name === "api" || name === "cockpit" || name === "stats") continue;
      walkPages(full, out);
    } else if (name === "page.tsx") {
      out.push(full);
    }
  }
  return out;
}

describe("public unfinished-copy fence", () => {
  it("exports the phrase list", () => {
    expect(PUBLIC_UNFINISHED_PHRASES.length).toBeGreaterThan(5);
  });

  it("flags known unfinished phrases", () => {
    const hits = findUnfinishedPublicCopy("This is coming soon and not finished");
    expect(hits.map((h) => h.phrase).sort()).toEqual(["coming soon", "not finished"]);
  });

  it("keeps public app pages free of unfinished advertising copy", () => {
    const pages: string[] = [];
    for (const root of PUBLIC_ROOTS) {
      walkPages(join(appRoot, root), pages);
    }
    // also root page
    const rootPage = join(appRoot, "page.tsx");
    if (statSync(rootPage, { throwIfNoEntry: false })?.isFile()) pages.push(rootPage);

    expect(pages.length).toBeGreaterThan(20);

    const offenders: string[] = [];
    for (const file of pages) {
      const src = readFileSync(file, "utf8");
      const hits = findUnfinishedPublicCopy(src);
      if (hits.length) {
        offenders.push(
          `${relative(webRoot, file)}: ${hits.map((h) => h.phrase).join(", ")}`,
        );
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("nav and footer do not advertise unfinished work", () => {
    for (const file of [
      "components/ui/nav.tsx",
      "components/ui/footer.tsx",
      "components/ui/mobile-nav.tsx",
    ]) {
      const src = readFileSync(join(webRoot, file), "utf8");
      expect(findUnfinishedPublicCopy(src), file).toEqual([]);
    }
  });
});
