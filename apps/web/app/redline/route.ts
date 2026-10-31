import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-static";

export async function GET() {
  const direct = resolve(process.cwd(), "public", "redline", "index.html");
  const workspace = resolve(process.cwd(), "apps", "web", "public", "redline", "index.html");
  const html = await readFile(existsSync(direct) ? direct : workspace, "utf8");
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}
