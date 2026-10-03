/**
 * Post-lock readout — pure comparison of a pre-lock lineup vs lateSwap output.
 *
 * Read-only over lateSwap output (dfs-exact.ts) and the RankedLineup
 * totals convention (edge-rank.ts). No imports: the player shape is
 * structural so this module stays standalone and side-effect free.
 */

/** Minimal structural player — compatible with DfsPlayer by shape. */
export type PostLockPlayer = {
  readonly id: string;
  readonly name: string;
  readonly proj: number;
  readonly ceiling: number;
  readonly salary: number;
};

export type PostLockReport = {
  /** Every locked id is present in the post-swap lineup. */
  readonly lockedKept: boolean;
  /** Locked ids that were in the pre-lock lineup and survived into post-swap. */
  readonly lockedCoreKeptIds: readonly string[];
  /** True when no locked member of the pre-lock core was dropped. */
  readonly lockedCoreKept: boolean;
  /** Names in pre but not in post (by id). */
  readonly swappedOut: readonly string[];
  /** Names in post but not in pre (by id). */
  readonly swappedIn: readonly string[];
  readonly preProj: number;
  readonly postProj: number;
  /** post - pre total projection. */
  readonly projDelta: number;
  readonly preCeil: number;
  readonly postCeil: number;
  /** post - pre total ceiling. */
  readonly ceilDelta: number;
  readonly preSalary: number;
  readonly postSalary: number;
  /** post - pre total salary. */
  readonly salaryDelta: number;
};

const r3 = (n: number): number => Math.round(n * 1000) / 1000;

const sum = (lu: readonly PostLockPlayer[], pick: (p: PostLockPlayer) => number): number =>
  lu.reduce((s, p) => s + pick(p), 0);

/**
 * Pure readout: compare the pre-lock lineup against the lateSwap result.
 * Order-insensitive (compares by player id). Never throws on empty inputs.
 */
export function postLockReadout(
  pre: readonly PostLockPlayer[],
  post: readonly PostLockPlayer[],
  lockedIds: ReadonlySet<string>,
): PostLockReport {
  const preById = new Map(pre.map((p) => [p.id, p] as const));
  const postById = new Map(post.map((p) => [p.id, p] as const));

  const locked = Array.from(lockedIds);
  const lockedKept = locked.every((id) => postById.has(id));

  const lockedCoreKeptIds = locked.filter((id) => preById.has(id) && postById.has(id));
  const lockedCoreKept = locked
    .filter((id) => preById.has(id))
    .every((id) => postById.has(id));

  const swappedOut = pre.filter((p) => !postById.has(p.id)).map((p) => p.name);
  const swappedIn = post.filter((p) => !preById.has(p.id)).map((p) => p.name);

  const preProj = sum(pre, (p) => p.proj);
  const postProj = sum(post, (p) => p.proj);
  const preCeil = sum(pre, (p) => p.ceiling);
  const postCeil = sum(post, (p) => p.ceiling);
  const preSalary = sum(pre, (p) => p.salary);
  const postSalary = sum(post, (p) => p.salary);

  return {
    lockedKept,
    lockedCoreKeptIds,
    lockedCoreKept,
    swappedOut,
    swappedIn,
    preProj: r3(preProj),
    postProj: r3(postProj),
    projDelta: r3(postProj - preProj),
    preCeil: r3(preCeil),
    postCeil: r3(postCeil),
    ceilDelta: r3(postCeil - preCeil),
    preSalary,
    postSalary,
    salaryDelta: postSalary - preSalary,
  };
}
