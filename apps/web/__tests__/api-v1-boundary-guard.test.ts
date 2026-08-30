import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { PROMOTED_API_V1_ROUTES, unapprovedApiV1RouteTreeExists } from "@/lib/api/v1/promoted-routes";

type ApiV1BoundaryViolation = {
  readonly id: string;
  readonly file: string;
  readonly line: number | null;
  readonly message: string;
};

type ApiV1BoundaryModule = {
  readonly collectApiV1BoundaryViolations: (root?: string) => Promise<readonly ApiV1BoundaryViolation[]>;
};

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const guardPath = path.join(repoRoot, "scripts/guardrails/api-v1-boundary.mjs");

async function loadGuard(): Promise<ApiV1BoundaryModule> {
  return (await import(pathToFileURL(guardPath).href)) as ApiV1BoundaryModule;
}

async function tempRepo(): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "api-v1-boundary-"));
  mkdirSync(path.join(root, "apps/web/lib/api/v1"), { recursive: true });
  mkdirSync(path.join(root, "packages/db/prisma/migrations"), { recursive: true });
  writeFileSync(path.join(root, "packages/db/prisma/schema.prisma"), "model Existing { id String @id }\n");
  writeFileSync(path.join(root, ".env.example"), "EXAMPLE_ONLY=true\n");
  writeFileSync(path.join(root, "apps/web/lib/api/v1/shadow.ts"), "export const shadowOnly = true;\n");
  return root;
}

describe("API v1 boundary guard", () => {
  it("passes the current repository state", async () => {
    const guard = await loadGuard();
    const hits = await guard.collectApiV1BoundaryViolations(repoRoot);

    expect(hits).toEqual([]);
  });

  it("keeps the guardrail's promoted list identical to the library's", async () => {
    // The guardrail carries its own literal copy so it stays dependency-free and
    // runnable by bare node. That duplication is only safe if drift is impossible
    // to miss: a route promoted in one place but not the other would either fail
    // the build on a legitimate route or, worse, wave through an unapproved one.
    const guardSource = readFileSync(
      path.join(repoRoot, "scripts/guardrails/api-v1-boundary.mjs"),
      "utf8"
    );
    const literal = guardSource.match(/const PROMOTED_ROUTES = new Set\(\[([^\]]*)\]\)/);
    expect(literal).not.toBeNull();
    const guardList = [...literal![1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!).sort();
    expect(guardList).toEqual([...PROMOTED_API_V1_ROUTES].sort());
  });

  it("promotes exactly the three reviewed routes, and no others", async () => {
    // Pins the promoted set itself. Widening it is a decision that requires an
    // owner-approved record (docs/ops/api-v1-promotion/), so it must not be
    // possible to slip an extra route in as an incidental edit.
    expect([...PROMOTED_API_V1_ROUTES].sort()).toEqual([
      "openapi/route.ts",
      "probabilities/route.ts",
      "signals/route.ts",
    ]);
  });

  it("passes a minimal shadow-only temp repo", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    const hits = await guard.collectApiV1BoundaryViolations(root);

    expect(hits).toEqual([]);
  });

  it("blocks route, schema, migration, env, DB import, env read, and network violations", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    // Post-promotion the tree itself is legitimate, so the accidental-surface
    // case is an UNAPPROVED route file rather than a bare directory.
    mkdirSync(path.join(root, "apps/web/app/api/v1/rogue"), { recursive: true });
    writeFileSync(
      path.join(root, "apps/web/app/api/v1/rogue/route.ts"),
      'export async function GET() { return new Response("rogue"); }\n'
    );
    mkdirSync(path.join(root, "packages/db/prisma/migrations/20260704000000_api_v1_live"), { recursive: true });
    writeFileSync(
      path.join(root, "packages/db/prisma/schema.prisma"),
      "model ApiV1Consumer { id String @id }\n"
    );
    writeFileSync(
      path.join(root, "packages/db/prisma/migrations/20260704000000_api_v1_live/migration.sql"),
      'CREATE TABLE "api_v1_consumers" ("id" text);\n'
    );
    writeFileSync(path.join(root, ".env.example"), "API_V1_DATABASE_URL=postgres://example.invalid\n");
    writeFileSync(
      path.join(root, "apps/web/lib/api/v1/live.ts"),
      [
        'import { PrismaClient } from "@prisma/client";',
        'import { db } from "packages/db";',
        "const enabled = process.env.API_V1_ENABLED;",
        'fetch("https://example.invalid");',
        "export const live = [PrismaClient, db, enabled];",
      ].join("\n")
    );

    const hits = await guard.collectApiV1BoundaryViolations(root);
    expect(hits.map((hit) => hit.id)).toEqual(
      expect.arrayContaining([
        "api-v1-unapproved-route",
        "api-v1-prisma-model",
        "api-v1-migration",
        "api-v1-env-var",
        "api-v1-prisma-import",
        "api-v1-db-import",
        "api-v1-env-read",
        "api-v1-network-call",
      ])
    );
  });

  it("flags a route hidden inside a SKIP_DIRS-named directory (build/)", async () => {
    // walkFiles skips {node_modules,.git,.next,dist,build,coverage} — sane for
    // repo-wide scans, but under app/api/v1 Next.js serves build/route.ts as a
    // live endpoint. The route-tree scan must descend EVERY directory.
    const guard = await loadGuard();
    const root = await tempRepo();
    mkdirSync(path.join(root, "apps/web/app/api/v1/build"), { recursive: true });
    writeFileSync(
      path.join(root, "apps/web/app/api/v1/build/route.ts"),
      'export async function GET() { return new Response("hidden"); }\n'
    );

    const hits = await guard.collectApiV1BoundaryViolations(root);
    const routeHits = hits.filter((hit) => hit.id === "api-v1-unapproved-route");
    expect(routeHits.map((hit) => hit.file)).toContain("apps/web/app/api/v1/build/route.ts");
  });

  it("flags a symlinked route as api-v1-symlink-entry", async () => {
    // A symlink dirent is neither isFile() nor isDirectory(), so walkFiles used
    // to drop it silently and a symlinked rogue route passed the guard clean.
    // Any symlink under the promoted route tree is itself a violation.
    const guard = await loadGuard();
    const root = await tempRepo();
    mkdirSync(path.join(root, "apps/web/app/api/v1/rogue"), { recursive: true });
    writeFileSync(
      path.join(root, "outside-route.ts"),
      'export async function GET() { return new Response("rogue"); }\n'
    );
    symlinkSync(
      path.join(root, "outside-route.ts"),
      path.join(root, "apps/web/app/api/v1/rogue/route.ts")
    );

    const hits = await guard.collectApiV1BoundaryViolations(root);
    const symlinkHits = hits.filter((hit) => hit.id === "api-v1-symlink-entry");
    expect(symlinkHits.map((hit) => hit.file)).toContain("apps/web/app/api/v1/rogue/route.ts");
  });
});

describe("promoted-routes symlink safety", () => {
  it("treats a dangling symlink as an unapproved entry without throwing", async () => {
    // listFiles used statSync, which FOLLOWS symlinks and throws ENOENT on a
    // dangling one — a single dangling symlink crashed every caller (ten api-v1
    // suites plus the readiness probe) instead of producing a verdict. The
    // symlink must surface AS an entry, which the promoted set never contains.
    const tree = await mkdtemp(path.join(tmpdir(), "api-v1-promoted-"));
    symlinkSync(path.join(tree, "does-not-exist.ts"), path.join(tree, "dangling.ts"));

    expect(() => unapprovedApiV1RouteTreeExists(tree)).not.toThrow();
    expect(unapprovedApiV1RouteTreeExists(tree)).toBe(true);
  });
});
