/**
 * Shared read-only Neon Postgres access for the live data-source loaders.
 *
 * WHY pg AND NOT PRISMA HERE
 * These loaders run in three contexts: the Next.js app, vitest unit tests, and
 * standalone tsx probes (scripts/ops/gates). Prisma pulls the generated client
 * + engine into every one of those contexts; `pg` is a plain wire client that
 * resolves identically in all three. The loaders are READ-ONLY by construction
 * — they only ever issue SELECTs.
 *
 * CREDENTIAL RESOLUTION (never echoed)
 * 1. process.env.DATABASE_URL when it is a real, non-stub URL.
 * 2. Otherwise `neonctl connection-string main --project-id <NEON_PROJECT_ID>
 *    --role-name hermes_ro` — captured, never printed. The role is the
 *    read-only role; a loader must never hold write credentials.
 *
 * No error message, log line, or returned object produced here may contain the
 * connection string.
 */
import { execSync } from "node:child_process";
import pg from "pg";

/** Default Neon project (GSE main branch). Override with NEON_PROJECT_ID. */
const DEFAULT_NEON_PROJECT_ID = "summer-brook-99380762";
const DEFAULT_NEON_BRANCH = "main";
const DEFAULT_NEON_ROLE = "hermes_ro";

/** Mirror of @sports/db isStubDbUrl — kept local so tsx probes need no workspace deps. */
export function isStubDatabaseUrl(url: string | undefined): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  if (trimmed === "") return true;
  if (trimmed.startsWith("changeme")) return true;
  if (trimmed.includes("dummy:dummy")) return true;
  if (trimmed.includes("placeholder:placeholder")) return true;
  if (trimmed === "stub" || trimmed === "none") return true;
  return false;
}

/**
 * Resolve a usable read-only connection string.
 * Throws a credential-free Error when neither env nor neonctl can provide one.
 */
export function resolveDatabaseUrl(): string {
  const fromEnv = (process.env["DATABASE_URL"] ?? "").trim();
  if (!isStubDatabaseUrl(fromEnv)) return fromEnv;

  const projectId = (process.env["NEON_PROJECT_ID"] ?? DEFAULT_NEON_PROJECT_ID).trim();
  const branch = (process.env["NEON_BRANCH"] ?? DEFAULT_NEON_BRANCH).trim();
  const role = (process.env["NEON_ROLE"] ?? DEFAULT_NEON_ROLE).trim();
  try {
    // execSync (shell) so the neonctl .cmd shim resolves on Windows.
    const captured = execSync(
      `neonctl connection-string ${branch} --project-id ${projectId} --role-name ${role}`,
      { encoding: "utf8", timeout: 60_000, stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
    if (!isStubDatabaseUrl(captured)) return captured;
  } catch {
    // fall through to the credential-free error below — never echo stderr,
    // which can contain partial connection material.
  }
  throw new Error(
    "DATABASE_URL unavailable: set DATABASE_URL or configure neonctl access (read-only role).",
  );
}

/**
 * Run `fn` against a fresh read-only client, always closing it.
 * The client is passed in so callers can issue parameterized SELECTs.
 */
export async function withNeonClient<T>(
  fn: (client: pg.Client) => Promise<T>,
): Promise<T> {
  const connectionString = resolveDatabaseUrl();
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 30_000 });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

/** Strip anything that looks like a connection string from an error message. */
export function sanitizeDbError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted-connection]").slice(0, 400);
}