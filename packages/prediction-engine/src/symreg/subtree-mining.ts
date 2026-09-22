/**
 * Frequent subtree mining + bandit island allocation (arXiv 2305.14656v1).
 *
 * RSRM loop pieces: mine the top-100 SR programs for frequent
 * subtrees (min support 10%); promote the top-3 to named operators
 * (e.g. softplus-like, saturating-ratio); rerun discovery with the
 * extended operator set and test whether new metrics get
 * simpler/shorter — plus bandit-style allocation across islands using
 * each island's score distribution (kill islands whose upper quantile
 * trails) — and the analyst-naming hook (present top mined motifs with
 * proposed names for blessing before they enter the operator set).
 *
 * The portable core here: canonical subtree hashing, support counting
 * over a program corpus, top-k motif extraction with proposed names,
 * expression-compression measurement, and the island bandit rule.
 *
 * ACCEPTANCE GATE: ADOPT operator invention iff the extended-operator
 * run reaches equal-or-better OOD NMSE with >= 20% shorter median
 * expressions; REJECT if invented operators are used in < 5% of final
 * programs or diversity collapses.
 *
 * Research-only module. Not wired into any live SR path.
 */

export type SrNode =
  | { kind: "const"; value: number }
  | { kind: "var"; name: string }
  | { kind: "op"; op: string; children: SrNode[] };

/** Canonical string hash of a subtree (order-sensitive). */
export function subtreeHash(n: SrNode): string {
  if (n.kind === "const") return "c";
  if (n.kind === "var") return `v:${n.name}`;
  return `${n.op}(${n.children.map(subtreeHash).join(",")})`;
}

function subtreeSize(n: SrNode): number {
  if (n.kind === "op") return 1 + n.children.reduce((s, c) => s + subtreeSize(c), 0);
  return 1;
}

/** All subtrees of a program with at least minSize nodes. */
export function enumerateSubtrees(root: SrNode, minSize = 2): SrNode[] {
  const out: SrNode[] = [];
  const walk = (n: SrNode): void => {
    if (subtreeSize(n) >= minSize) out.push(n);
    if (n.kind === "op") n.children.forEach(walk);
  };
  walk(root);
  return out;
}

export interface Motif {
  hash: string;
  /** Canonical example subtree. */
  example: SrNode;
  /** Number of programs containing the subtree. */
  support: number;
  size: number;
  /** Proposed analyst-facing name. */
  proposedName: string;
}

/**
 * Mine frequent subtrees across the program corpus: support = number
 * of programs containing the subtree (>= minSupport).
 */
export function mineMotifs(
  programs: readonly SrNode[],
  minSupport: number,
  topK = 3,
): Motif[] {
  if (programs.length === 0) throw new Error("mineMotifs: no programs");
  if (minSupport < 1) throw new Error("mineMotifs: minSupport >= 1");
  const support = new Map<string, { example: SrNode; programs: Set<number>; size: number }>();
  programs.forEach((prog, pi) => {
    const seen = new Set<string>();
    for (const st of enumerateSubtrees(prog)) {
      const h = subtreeHash(st);
      if (seen.has(h)) continue;
      seen.add(h);
      const entry = support.get(h) ?? { example: st, programs: new Set<number>(), size: subtreeSize(st) };
      entry.programs.add(pi);
      support.set(h, entry);
    }
  });
  const motifs: Motif[] = [];
  for (const [hash, e] of support) {
    if (e.programs.size >= minSupport) {
      motifs.push({
        hash,
        example: e.example,
        support: e.programs.size,
        size: e.size,
        proposedName: proposeName(e.example, hash),
      });
    }
  }
  motifs.sort((a, b) => b.support - a.support || b.size - a.size);
  return motifs.slice(0, topK);
}

/** Heuristic analyst-facing name proposals for mined motifs. */
export function proposeName(example: SrNode, hash: string): string {
  if (example.kind === "op") {
    const ops = new Set<string>();
    const walk = (n: SrNode): void => {
      if (n.kind === "op") {
        ops.add(n.op);
        n.children.forEach(walk);
      }
    };
    walk(example);
    if (ops.has("div") && ops.has("add")) return "saturating-ratio";
    if (ops.has("exp") || ops.has("log")) return "softplus-like";
    if (ops.has("mul") && ops.has("sub")) return "interaction-decay";
    return `${example.op}-motif`;
  }
  return `motif-${hash.slice(0, 8)}`;
}

/**
 * Compression check: median expression size with the extended operator
 * set vs the baseline. Gate: >= 20% shorter at equal-or-better NMSE.
 */
export function compressionCheck(
  baselineSizes: readonly number[],
  extendedSizes: readonly number[],
): { medianBaseline: number; medianExtended: number; compression: number; pass: boolean } {
  const med = (vs: readonly number[]): number => {
    if (vs.length === 0) throw new Error("compressionCheck: empty sizes");
    const s = [...vs].sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 === 1 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
  };
  const b = med(baselineSizes);
  const e = med(extendedSizes);
  const compression = (b - e) / b;
  return { medianBaseline: b, medianExtended: e, compression, pass: compression >= 0.2 };
}

export interface Island {
  id: string;
  /** Recent program scores (higher is better). */
  scores: number[];
}

/**
 * Bandit-style island allocation: kill islands whose upper quantile
 * (default 75th percentile) trails the best island's upper quantile by
 * more than `gap`.
 */
export function allocateIslands(
  islands: readonly Island[],
  quantile = 0.75,
  gap = 0.1,
): { survivors: string[]; killed: string[] } {
  if (islands.length === 0) throw new Error("allocateIslands: no islands");
  const uq = (scores: readonly number[]): number => {
    if (scores.length === 0) return -Infinity;
    const s = [...scores].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(quantile * s.length))] as number;
  };
  const best = Math.max(...islands.map((i) => uq(i.scores)));
  const survivors: string[] = [];
  const killed: string[] = [];
  for (const isl of islands) {
    if (best - uq(isl.scores) > gap) killed.push(isl.id);
    else survivors.push(isl.id);
  }
  return { survivors, killed };
}
