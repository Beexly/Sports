/**
 * Durable ClosingArchive I/O — file-backed JSON snapshot.
 *
 * Process-local ClosingArchive is honest for single serverless isolate.
 * This store survives cold starts when CLOSING_ARCHIVE_PATH (or explicit path)
 * is a writable filesystem (local, Vercel volume, NFS). Multi-instance without
 * shared storage still needs Redis/blob — refuse to pretend otherwise.
 *
 * Atomic write: write tmp + rename. Corrupt / missing file → empty snapshot
 * (refuse-default: never invent quotes).
 */

import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { ClosingArchive, ClosingArchiveSnapshot } from "./closing-archive";

export interface DurableStoreResult {
  readonly ok: boolean;
  readonly code:
    | "ok"
    | "path_unset"
    | "missing"
    | "corrupt"
    | "write_failed"
    | "empty";
  readonly path?: string;
  readonly rows?: number;
  readonly error?: string;
}

export function emptySnapshot(): ClosingArchiveSnapshot {
  return {
    version: 1,
    seq: 0,
    rows: [],
    exportedAt: new Date(0).toISOString(),
  };
}

export function resolveArchivePath(
  explicit?: string | null,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const p = explicit ?? env["CLOSING_ARCHIVE_PATH"] ?? null;
  if (p == null || String(p).trim() === "") return null;
  return String(p).trim();
}

export function readArchiveSnapshot(path: string): {
  snapshot: ClosingArchiveSnapshot;
  result: DurableStoreResult;
} {
  if (!existsSync(path)) {
    return {
      snapshot: emptySnapshot(),
      result: { ok: true, code: "missing", path, rows: 0 },
    };
  }
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as ClosingArchiveSnapshot;
    if (parsed?.version !== 1 || !Array.isArray(parsed.rows)) {
      return {
        snapshot: emptySnapshot(),
        result: { ok: false, code: "corrupt", path, error: "invalid_snapshot_shape" },
      };
    }
    return {
      snapshot: parsed,
      result: {
        ok: true,
        code: parsed.rows.length === 0 ? "empty" : "ok",
        path,
        rows: parsed.rows.length,
      },
    };
  } catch (e) {
    return {
      snapshot: emptySnapshot(),
      result: {
        ok: false,
        code: "corrupt",
        path,
        error: e instanceof Error ? e.message : "parse_fail",
      },
    };
  }
}

export function writeArchiveSnapshot(
  path: string,
  snapshot: ClosingArchiveSnapshot,
): DurableStoreResult {
  try {
    const dir = dirname(path);
    if (dir && dir !== "." && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
    writeFileSync(tmp, JSON.stringify(snapshot), "utf8");
    renameSync(tmp, path);
    return {
      ok: true,
      code: snapshot.rows.length === 0 ? "empty" : "ok",
      path,
      rows: snapshot.rows.length,
    };
  } catch (e) {
    return {
      ok: false,
      code: "write_failed",
      path,
      error: e instanceof Error ? e.message : "write_fail",
    };
  }
}

/** Hydrate archive from disk (no-op if path unset). */
export function hydrateClosingArchive(
  archive: ClosingArchive,
  opts: { path?: string | null; env?: NodeJS.ProcessEnv } = {},
): DurableStoreResult {
  const path = resolveArchivePath(opts.path, opts.env ?? process.env);
  if (!path) return { ok: true, code: "path_unset", rows: 0 };
  const { snapshot, result } = readArchiveSnapshot(path);
  if (!result.ok && result.code === "corrupt") return result;
  const n = archive.loadSnapshot(snapshot, "merge");
  return {
    ...result,
    rows: archive.size(),
    path,
    code: n === 0 && result.code === "missing" ? "missing" : result.code === "corrupt" ? result.code : "ok",
    ok: true,
  };
}

/** Persist archive to disk (no-op if path unset). */
export function persistClosingArchive(
  archive: ClosingArchive,
  opts: { path?: string | null; env?: NodeJS.ProcessEnv } = {},
): DurableStoreResult {
  const path = resolveArchivePath(opts.path, opts.env ?? process.env);
  if (!path) return { ok: true, code: "path_unset", rows: archive.size() };
  return writeArchiveSnapshot(path, archive.toSnapshot());
}
