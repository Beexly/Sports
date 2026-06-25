/**
 * ClaimIndependenceIndex — detect whether N reports are independent or echoes of one origin.
 *
 * From the research dark-corner inventory. "Five reports" is not five sources if four of
 * them copied the first. This computes how many genuinely independent origins back a set
 * of claims, so source-count never inflates into fake confidence. The result feeds the
 * genome's `evidence.independentSources`. Pure, no I/O.
 *
 * Two claims are DEPENDENT when they share an origin id, when one cites the other's
 * source, or when their text is near-identical within a short echo window. Dependence is
 * transitive (union-find), so a chain of copies collapses to one effective source.
 */

export interface IndependenceClaim {
  readonly id: string;
  readonly source: string;
  /** The upstream origin this claim traces to, when known (e.g. a wire/report id). */
  readonly originId?: string;
  /** Source ids this claim explicitly cites/echoes. */
  readonly citesSourceIds?: readonly string[];
  /** Normalized claim text, for echo detection. */
  readonly text?: string;
  /** Publication time, epoch ms. */
  readonly atMs: number;
}

export interface IndependenceResult {
  readonly totalClaims: number;
  /** Number of genuinely independent origin clusters. */
  readonly independentSources: number;
  /** independentSources / totalClaims, in [0,1]. 1 = fully independent. */
  readonly independenceIndex: number;
}

const ECHO_WINDOW_MS = 30 * 60 * 1000; // near-identical text within 30m reads as an echo

class UnionFind {
  private readonly parent = new Map<string, string>();
  find(x: string): string {
    let root = this.parent.get(x) ?? x;
    if (!this.parent.has(x)) this.parent.set(x, x);
    while (root !== (this.parent.get(root) ?? root)) {
      root = this.parent.get(root) ?? root;
    }
    this.parent.set(x, root);
    return root;
  }
  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

function normalize(text: string | undefined): string {
  return (text ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Compute how many independent origins back the claim set. Two claims merge when they
 * share an origin, cite each other's source, or echo near-identical text in-window.
 */
export function claimIndependence(claims: readonly IndependenceClaim[]): IndependenceResult {
  const total = claims.length;
  if (total === 0) return { totalClaims: 0, independentSources: 0, independenceIndex: 0 };

  const uf = new UnionFind();
  for (const c of claims) uf.find(c.id);

  const bySource = new Map<string, string[]>();
  const byOrigin = new Map<string, string[]>();
  for (const c of claims) {
    (bySource.get(c.source) ?? bySource.set(c.source, []).get(c.source)!).push(c.id);
    if (c.originId) (byOrigin.get(c.originId) ?? byOrigin.set(c.originId, []).get(c.originId)!).push(c.id);
  }

  // Same origin → dependent.
  for (const ids of byOrigin.values()) {
    for (let i = 1; i < ids.length; i++) uf.union(ids[0]!, ids[i]!);
  }
  // Citation of another claim's source → dependent.
  for (const c of claims) {
    for (const cited of c.citesSourceIds ?? []) {
      for (const other of bySource.get(cited) ?? []) uf.union(c.id, other);
    }
  }
  // Near-identical text within the echo window → dependent.
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const a = claims[i]!;
      const b = claims[j]!;
      const ta = normalize(a.text);
      if (ta.length > 0 && ta === normalize(b.text) && Math.abs(a.atMs - b.atMs) <= ECHO_WINDOW_MS) {
        uf.union(a.id, b.id);
      }
    }
  }

  const roots = new Set(claims.map((c) => uf.find(c.id)));
  const independentSources = roots.size;
  return { totalClaims: total, independentSources, independenceIndex: independentSources / total };
}
