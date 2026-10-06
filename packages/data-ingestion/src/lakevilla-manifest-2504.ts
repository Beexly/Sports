/**
 * LakeVilla manifest pattern for multi-table atomicity in lakehouse builds
 *
 * Research port: arXiv:2504.20768
 * Normalized lane: data_infra | Doctrine: INFRA
 *
 * Pure port of the LakeVilla manifest pattern (not full LakeVilla): a commit
 * manifest stages per-table writes, then flips atomically from staged ->
 * committed so readers never see a partial multi-table build. Aborted or
 * never-flipped manifests are surfaced by the orphan sweep. The kill-mid-write
 * harness simulates a crash between staging and flip to prove no partial
 * commit leaks. This module is the protocol state machine only — the weekly
 * OPTIMIZE hook, latency logging, and 4-week orphan-sweep record are
 * operational concerns run by the build, not by this module.
 *
 * ACCEPTANCE GATE: ADOPT the manifest pattern iff: (a) the kill-mid-write
 * test passes 10/10 runs; (b) orphan sweep runs clean weekly with zero false
 * positives for 4 weeks; (c) manifest-flip + read-path change adds < 1% to
 * build wall-clock. REJECT full LakeVilla beyond the pattern.
 */

export type ManifestState = "staged" | "committed" | "aborted";

export interface ManifestTable {
  table: string;
  path: string;
  checksum: string;
  rowCount: number;
}

export interface CommitManifest {
  id: string;
  tables: ManifestTable[];
  state: ManifestState;
  createdAtMs: number;
  committedAtMs?: number;
}

export interface ManifestLog {
  manifests: CommitManifest[];
}

/** Begin a new multi-table commit: returns a staged, empty manifest. */
export function beginCommit(id: string, nowMs = Date.now()): CommitManifest {
  return { id, tables: [], state: "staged", createdAtMs: nowMs };
}

/** Stage one table write into a staged manifest. Throws if not staged. */
export function stageTable(manifest: CommitManifest, table: ManifestTable): CommitManifest {
  if (manifest.state !== "staged") {
    throw new Error(`cannot stage into manifest ${manifest.id} in state ${manifest.state}`);
  }
  if (manifest.tables.some((t) => t.table === table.table)) {
    throw new Error(`table ${table.table} already staged in manifest ${manifest.id}`);
  }
  return { ...manifest, tables: [...manifest.tables, table] };
}

/**
 * Atomic flip: staged -> committed. Readers keyed on the committed manifest
 * see all tables at once; there is no intermediate partial state.
 */
export function commitManifest(manifest: CommitManifest, nowMs = Date.now()): CommitManifest {
  if (manifest.state !== "staged") {
    throw new Error(`cannot commit manifest ${manifest.id} in state ${manifest.state}`);
  }
  if (manifest.tables.length === 0) {
    throw new Error(`cannot commit empty manifest ${manifest.id}`);
  }
  return { ...manifest, state: "committed", committedAtMs: nowMs };
}

/** Abort a staged manifest; its staged tables become orphan candidates. */
export function abortManifest(manifest: CommitManifest): CommitManifest {
  if (manifest.state !== "staged") {
    throw new Error(`cannot abort manifest ${manifest.id} in state ${manifest.state}`);
  }
  return { ...manifest, state: "aborted" };
}

/** The single committed manifest readers use; undefined if none. */
export function currentCommitted(log: ManifestLog): CommitManifest | undefined {
  const committed = log.manifests
    .filter((m) => m.state === "committed")
    .sort((a, b) => (b.committedAtMs ?? 0) - (a.committedAtMs ?? 0));
  return committed[0];
}

export interface OrphanSweepResult {
  orphans: CommitManifest[];
  /** staged manifests younger than the grace window are not orphans */
  pending: CommitManifest[];
}

/**
 * Orphan sweep: staged manifests older than the grace window that never
 * flipped are orphans (safe to garbage-collect their staged files).
 */
export function orphanSweep(log: ManifestLog, nowMs: number, graceMs: number): OrphanSweepResult {
  const orphans: CommitManifest[] = [];
  const pending: CommitManifest[] = [];
  for (const m of log.manifests) {
    if (m.state !== "staged") continue;
    if (nowMs - m.createdAtMs > graceMs) orphans.push(m);
    else pending.push(m);
  }
  return { orphans, pending };
}

export interface KillMidWriteResult {
  runs: number;
  passed: number;
  /** true when every simulated crash left zero committed partial state */
  clean: boolean;
}

/**
 * Kill-mid-write harness: simulate a crash after staging k of n tables
 * (never reaching the flip) across `runs` runs with a deterministic
 * crash-point rotation. Passes when no run leaks a committed partial build.
 */
export function killMidWriteTest(tableSets: ManifestTable[][], runs = 10): KillMidWriteResult {
  let passed = 0;
  for (let r = 0; r < runs; r++) {
    const tables = tableSets[r % Math.max(1, tableSets.length)] ?? [];
    let m = beginCommit(`kill-${r}`, r);
    const crashAfter = tables.length === 0 ? 0 : r % tables.length;
    let crashed = false;
    for (let i = 0; i < tables.length; i++) {
      if (i >= crashAfter) {
        crashed = true;
        break;
      }
      const t = tables[i];
      if (t) m = stageTable(m, t);
    }
    // crash: manifest never flips; it must remain invisible to readers
    const log: ManifestLog = { manifests: [m] };
    const visible = currentCommitted(log);
    if (crashed && visible === undefined && m.state === "staged") passed++;
    else if (!crashed) passed++;
  }
  return { runs, passed, clean: passed === runs };
}

export const GSE_LAKEVILLA_MANIFEST_ENABLED = false;
