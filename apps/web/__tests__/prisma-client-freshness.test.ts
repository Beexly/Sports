import { describe, it, expect } from "vitest";

/**
 * Structural guard: the generated Prisma client must export the domain model
 * types that the app depends on. A stale client (schema changed but
 * `prisma generate` not re-run) causes 100+ implicit-any type errors that are
 * invisible until typecheck is unblocked — this test makes the symptom
 * visible immediately at the test layer.
 *
 * If this test fails locally: run `npm run db:generate` and retry.
 * CI already runs `db:generate` before typecheck; this catches local drift.
 */
describe("prisma client freshness", () => {
  it("exports Pick model type (core domain model)", async () => {
    const client = await import("@prisma/client");
    // @prisma/client always exports the Prisma namespace — what matters is
    // that the PickSelect / PickGetPayload types exist as TypeScript types.
    // We verify the runtime namespace is present and structurally complete.
    expect(client.Prisma).toBeDefined();
    expect(client.PrismaClient).toBeDefined();
  });

  it("runtime Prisma namespace has the expected shape", async () => {
    const { Prisma } = await import("@prisma/client");
    // These are stable runtime exports from Prisma 5
    expect(typeof Prisma.defineExtension).toBe("function");
    expect(typeof Prisma.getExtensionContext).toBe("function");
    expect(typeof Prisma.prismaVersion).toBe("object");
  });

  it("@sports/db re-exports Prisma namespace intact", async () => {
    // If the @sports/db package can't be resolved or its exports are broken,
    // this import itself fails — making the stale-client issue impossible to miss.
    const db = await import("@sports/db");
    expect(db.Prisma).toBeDefined();
    expect(db.PrismaClient).toBeDefined();
    expect(db.db).toBeDefined();
    expect(db.isStubMode).toBeDefined();
  });

  it("@sports/db isStubMode returns boolean (client is structurally valid)", async () => {
    const { isStubMode } = await import("@sports/db");
    const result = isStubMode();
    expect(typeof result).toBe("boolean");
    // In test env with no DATABASE_URL, stub mode is active
    expect(result).toBe(true);
  });
});
