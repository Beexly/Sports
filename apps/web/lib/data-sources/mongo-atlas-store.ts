/**
 * Mongo Atlas store — GATED adapter (WP-4).
 *
 * Every Mongo access in this module is gated on MONGODB_URI being set to a
 * real, non-sentinel value. When the URI is absent the store is a CLEAN NO-OP:
 * each method returns { ok: false, enabled: false, reason } and logs the
 * reason once — it never throws, never crashes a caller, and never fabricates
 * a successful write. This is the expected local/CI state (MONGODB_URI is not
 * provisioned in this environment); live use is blocked until it is set.
 *
 * The `mongodb` driver is loaded lazily ONLY when the gate is open, so the
 * module imports cleanly in environments where the driver is not installed.
 * A missing driver with the gate open is also a clean no-op with a reason.
 *
 * TTL discipline: two collections carry 30-day TTL indexes —
 *   bitemporal_feed_snapshots  (fetchedAt)
 *   hermes_run_checkpoints     (createdAt)
 * ensureTtlIndexes() is idempotent (createIndex with the same spec is a no-op
 * server-side) and is itself gated.
 */

export const MONGO_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

export interface TtlIndexSpec {
  readonly collection: string;
  readonly key: Record<string, 1 | -1>;
  readonly expireAfterSeconds: number;
  readonly name: string;
}

/** The two 30-day TTL indexes required by the WP-4 contract. */
export const TTL_INDEX_SPECS: readonly TtlIndexSpec[] = [
  {
    collection: "bitemporal_feed_snapshots",
    key: { fetchedAt: 1 },
    expireAfterSeconds: MONGO_TTL_SECONDS,
    name: "bitemporal_feed_snapshots_fetchedAt_ttl30d",
  },
  {
    collection: "hermes_run_checkpoints",
    key: { createdAt: 1 },
    expireAfterSeconds: MONGO_TTL_SECONDS,
    name: "hermes_run_checkpoints_createdAt_ttl30d",
  },
];

export interface MongoGate {
  readonly enabled: boolean;
  readonly reason: string;
}

/** Sentinel URIs that must NOT open the gate (mirrors isStubDbUrl posture). */
function isSentinelUri(uri: string): boolean {
  const t = uri.trim().toLowerCase();
  return (
    t === "" ||
    t === "stub" ||
    t === "none" ||
    t.startsWith("changeme") ||
    t.includes("dummy:dummy") ||
    t.includes("placeholder:placeholder") ||
    t.includes("user:pass@localhost")
  );
}

/**
 * The gate. Pure — reads the supplied env (default process.env).
 * Absent/sentinel MONGODB_URI => disabled with a logged-friendly reason.
 */
export function mongoGate(env: Record<string, string | undefined> = process.env): MongoGate {
  const uri = (env["MONGODB_URI"] ?? "").trim();
  if (uri === "") {
    return { enabled: false, reason: "MONGODB_URI not set — Mongo Atlas store disabled (clean no-op)." };
  }
  if (isSentinelUri(uri)) {
    return { enabled: false, reason: "MONGODB_URI is a sentinel value — Mongo Atlas store disabled (clean no-op)." };
  }
  if (!/^mongodb(\+srv)?:\/\//i.test(uri)) {
    return { enabled: false, reason: "MONGODB_URI is not a mongodb:// or mongodb+srv:// URI — store disabled." };
  }
  return { enabled: true, reason: "MONGODB_URI present — Mongo Atlas store enabled." };
}

export interface MongoOpResult {
  readonly ok: boolean;
  readonly enabled: boolean;
  readonly reason: string;
  readonly insertedId?: string;
  readonly matchedCount?: number;
}

function disabled(result: MongoGate): MongoOpResult {
  return { ok: false, enabled: false, reason: result.reason };
}

/** Minimal structural type of the driver surface we use (avoids a hard dep). */
interface MongoClientLike {
  connect(): Promise<unknown>;
  close(): Promise<void>;
  db(name?: string): {
    collection(name: string): {
      createIndex(key: Record<string, 1 | -1>, options: Record<string, unknown>): Promise<string>;
      insertOne(doc: Record<string, unknown>): Promise<{ insertedId: unknown }>;
      updateOne(
        filter: Record<string, unknown>,
        update: Record<string, unknown>,
        options?: Record<string, unknown>,
      ): Promise<{ matchedCount: number }>;
      find(filter: Record<string, unknown>, options?: Record<string, unknown>): {
        sort(s: Record<string, 1 | -1>): { limit(n: number): { toArray(): Promise<Record<string, unknown>[]> } };
        toArray(): Promise<Record<string, unknown>[]>;
      };
    };
  };
}

export type DriverLoader = () => Promise<{ MongoClient: new (uri: string) => MongoClientLike }>;

/** Default lazy driver loader — only called when the gate is open. */
const defaultDriverLoader: DriverLoader = async () => {
  // Dynamic import keeps `mongodb` an optional dependency.
  const mod = (await import("mongodb")) as unknown as { MongoClient: new (uri: string) => MongoClientLike };
  return { MongoClient: mod.MongoClient };
};

export class MongoAtlasStore {
  private client: MongoClientLike | null = null;
  private loggedReason: string | null = null;
  private readonly gate: MongoGate;
  private readonly uri: string;
  private readonly dbName: string;
  private readonly loadDriver: DriverLoader;

  constructor(options: {
    env?: Record<string, string | undefined>;
    uri?: string;
    dbName?: string;
    loadDriver?: DriverLoader;
  } = {}) {
    const env = options.env ?? process.env;
    this.uri = (options.uri ?? env["MONGODB_URI"] ?? "").trim();
    this.gate = mongoGate({ ...env, MONGODB_URI: this.uri });
    this.dbName = options.dbName ?? env["MONGODB_DB"] ?? "galaxy_sports_edge";
    this.loadDriver = options.loadDriver ?? defaultDriverLoader;
  }

  get status(): MongoGate {
    return this.gate;
  }

  /** Log the gate reason once (never logs the URI itself). */
  private note(reason: string): void {
    if (this.loggedReason !== reason) {
      this.loggedReason = reason;
      // eslint-disable-next-line no-console
      console.info(`[mongo-atlas-store] ${reason}`);
    }
  }

  /**
   * Connect when enabled. Returns a clean no-op result when disabled or when
   * the driver is unavailable — never throws.
   */
  async connect(): Promise<MongoOpResult> {
    if (!this.gate.enabled) {
      this.note(this.gate.reason);
      return disabled(this.gate);
    }
    if (this.client) return { ok: true, enabled: true, reason: "already connected" };
    try {
      const { MongoClient } = await this.loadDriver();
      const client = new MongoClient(this.uri);
      await client.connect();
      this.client = client;
      return { ok: true, enabled: true, reason: "connected" };
    } catch (error) {
      const reason = `Mongo connect failed (no-op): ${error instanceof Error ? error.message : String(error)}`;
      this.note(reason);
      return { ok: false, enabled: true, reason };
    }
  }

  /** Create the two 30-day TTL indexes. Gated; idempotent; never throws. */
  async ensureTtlIndexes(): Promise<MongoOpResult & { indexes?: string[] }> {
    const conn = await this.connect();
    if (!conn.ok) return conn;
    try {
      const db = this.client!.db(this.dbName);
      const names: string[] = [];
      for (const spec of TTL_INDEX_SPECS) {
        const name = await db.collection(spec.collection).createIndex(spec.key, {
          expireAfterSeconds: spec.expireAfterSeconds,
          name: spec.name,
        });
        names.push(name);
      }
      return { ok: true, enabled: true, reason: "ttl indexes ensured", indexes: names };
    } catch (error) {
      const reason = `ensureTtlIndexes failed (no-op): ${error instanceof Error ? error.message : String(error)}`;
      this.note(reason);
      return { ok: false, enabled: true, reason };
    }
  }

  /** Insert a bitemporal feed snapshot. Gated; never throws. */
  async insertSnapshot(doc: Record<string, unknown>): Promise<MongoOpResult> {
    const conn = await this.connect();
    if (!conn.ok) return conn;
    try {
      const res = await this.client!.db(this.dbName)
        .collection("bitemporal_feed_snapshots")
        .insertOne({ ...doc, fetchedAt: doc["fetchedAt"] instanceof Date ? doc["fetchedAt"] : new Date() });
      return { ok: true, enabled: true, reason: "snapshot inserted", insertedId: String(res.insertedId) };
    } catch (error) {
      const reason = `insertSnapshot failed (no-op): ${error instanceof Error ? error.message : String(error)}`;
      this.note(reason);
      return { ok: false, enabled: true, reason };
    }
  }

  /** Upsert a run checkpoint. Gated; never throws. */
  async saveCheckpoint(runId: string, state: Record<string, unknown>): Promise<MongoOpResult> {
    const conn = await this.connect();
    if (!conn.ok) return conn;
    try {
      const res = await this.client!.db(this.dbName)
        .collection("hermes_run_checkpoints")
        .updateOne(
          { runId },
          { $set: { ...state, runId, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true },
        );
      return { ok: true, enabled: true, reason: "checkpoint saved", matchedCount: res.matchedCount };
    } catch (error) {
      const reason = `saveCheckpoint failed (no-op): ${error instanceof Error ? error.message : String(error)}`;
      this.note(reason);
      return { ok: false, enabled: true, reason };
    }
  }

  /** Close the client when open. Gated; never throws. */
  async close(): Promise<MongoOpResult> {
    if (!this.client) return disabled(this.gate);
    try {
      await this.client.close();
      this.client = null;
      return { ok: true, enabled: true, reason: "closed" };
    } catch (error) {
      this.client = null;
      return { ok: false, enabled: true, reason: `close failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}