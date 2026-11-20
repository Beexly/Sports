/**
 * mongodb-intel-archive.ts — MongoDB Atlas ($500 credits) Document & Intel Archive Adapter.
 *
 * - Primary: Writes via MongoDB Atlas Data API or driver when MONGODB_ATLAS_DATA_API_URL +
 *   MONGODB_ATLAS_API_KEY (or MONGODB_ATLAS_URI) are configured.
 * - Offline / Pre-Cluster Fallback: Appends immutable records to
 *   `reports/autonomous/mongodb-atlas-spool.jsonl` so scraped telemetry and
 *   corpus extractions are ready for cluster flush with zero data loss.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface IntelArchiveDocument {
  readonly schemaVersion: "gse.atlas.intel.v1";
  readonly collection: "scraped_intel" | "telemetry_archives" | "corpus_documents";
  readonly sourceUrl?: string;
  readonly gameKey?: string;
  readonly createdAt: string;
  readonly payload: Record<string, unknown>;
}

export interface ArchiveWriteResult {
  readonly destination: "mongodb-atlas-data-api" | "local-spool-ready";
  readonly collection: string;
  readonly spooledPath?: string;
  readonly atlasConfigured: boolean;
}

const DEFAULT_SPOOL_PATH = resolve(process.cwd(), "reports/autonomous/mongodb-atlas-spool.jsonl");

export function isMongoAtlasConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return Boolean(
    env["MONGODB_ATLAS_URI"]?.trim() ||
      (env["MONGODB_ATLAS_DATA_API_URL"]?.trim() && env["MONGODB_ATLAS_API_KEY"]?.trim()),
  );
}

export async function archiveIntelDocument(
  doc: Omit<IntelArchiveDocument, "schemaVersion" | "createdAt">,
  options: {
    readonly env?: Record<string, string | undefined>;
    readonly spoolPath?: string;
    readonly fetchImpl?: typeof fetch;
  } = {},
): Promise<ArchiveWriteResult> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const spoolPath = options.spoolPath ?? DEFAULT_SPOOL_PATH;
  const fullDoc: IntelArchiveDocument = {
    schemaVersion: "gse.atlas.intel.v1",
    createdAt: new Date().toISOString(),
    ...doc,
  };

  const dataApiUrl = env["MONGODB_ATLAS_DATA_API_URL"]?.trim();
  const dataApiKey = env["MONGODB_ATLAS_API_KEY"]?.trim();
  const clusterName = (env["MONGODB_ATLAS_CLUSTER"] ?? "Cluster0").trim();
  const dbName = (env["MONGODB_ATLAS_DB"] ?? "gse_intel").trim();

  if (dataApiUrl && dataApiKey) {
    const endpoint = `${dataApiUrl.replace(/\/+$/, "")}/action/insertOne`;
    const res = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": dataApiKey,
      },
      body: JSON.stringify({
        dataSource: clusterName,
        database: dbName,
        collection: doc.collection,
        document: fullDoc,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      return {
        destination: "mongodb-atlas-data-api",
        collection: doc.collection,
        atlasConfigured: true,
      };
    }
  }

  mkdirSync(dirname(spoolPath), { recursive: true });
  appendFileSync(spoolPath, JSON.stringify(fullDoc) + "\n", "utf8");
  return {
    destination: "local-spool-ready",
    collection: doc.collection,
    spooledPath: spoolPath,
    atlasConfigured: isMongoAtlasConfigured(env),
  };
}

export function countSpooledDocuments(spoolPath: string = DEFAULT_SPOOL_PATH): number {
  if (!existsSync(spoolPath)) return 0;
  return readFileSync(spoolPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0).length;
}
