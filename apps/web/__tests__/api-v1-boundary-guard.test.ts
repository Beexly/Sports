import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

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

async function loadGuard(): Promise<ApiV1BoundaryModule> {
  return (await import("../../../scripts/guardrails/api-v1-boundary.mjs")) as ApiV1BoundaryModule;
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

  it("passes a minimal shadow-only temp repo", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    const hits = await guard.collectApiV1BoundaryViolations(root);

    expect(hits).toEqual([]);
  });

  it("blocks route, schema, migration, env, DB import, env read, and network violations", async () => {
    const guard = await loadGuard();
    const root = await tempRepo();
    mkdirSync(path.join(root, "apps/web/app/api/v1"), { recursive: true });
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
        "api-v1-route-tree",
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
});
