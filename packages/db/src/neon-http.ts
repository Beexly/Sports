/**
 * neon-http.ts — Stateless HTTPS (:443) Neon Serverless Query Helper.
 *
 * Designed for Cloudflare Workers Paid edge handlers and Vercel Edge/Serverless
 * functions where TCP port 5432 WebSocket pools are undesirable or blocked.
 * Never logs or echoes DATABASE_URL credentials.
 */
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export interface NeonHttpConfig {
  readonly connectionString: string;
}

export function resolveNeonHttpConnectionString(
  env: Record<string, string | undefined> = process.env,
): string {
  const url = (env["DATABASE_URL"] ?? env["POSTGRES_PRISMA_URL"] ?? env["DIRECT_URL"] ?? "").trim();
  if (!url) {
    throw new Error("DATABASE_URL is required for Neon HTTP (:443) pooled queries.");
  }
  return url;
}

export function createNeonHttpSql(connectionString?: string): NeonQueryFunction<false, false> {
  const url = (connectionString ?? resolveNeonHttpConnectionString()).trim();
  return neon(url);
}

export async function queryNeonHttp<T = Record<string, unknown>>(
  sqlText: string,
  params: readonly unknown[] = [],
  connectionString?: string,
): Promise<T[]> {
  const sql = createNeonHttpSql(connectionString);
  const rows = await sql(sqlText, [...params]);
  return rows as T[];
}
