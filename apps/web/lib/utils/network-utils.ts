/**
 * Network analytics library for sports prediction platform.
 * Focuses on: social networks, strength-of-schedule networks, team similarity graphs.
 * Zero npm dependencies. No `any`. Pure TypeScript.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Graph = {
  nodes: string[]
  edges: { from: string; to: string; weight: number }[]
}

// ---------------------------------------------------------------------------
// 1. Graph representation
// ---------------------------------------------------------------------------

export function buildGraph(
  edges: { from: string; to: string; weight?: number }[],
): Graph {
  const nodeSet = new Set<string>()
  const resolvedEdges: { from: string; to: string; weight: number }[] = []
  for (const e of edges) {
    nodeSet.add(e.from)
    nodeSet.add(e.to)
    resolvedEdges.push({ from: e.from, to: e.to, weight: e.weight ?? 1 })
  }
  return { nodes: [...nodeSet], edges: resolvedEdges }
}

export function addEdge(
  graph: Graph,
  from: string,
  to: string,
  weight = 1,
): Graph {
  const nodes = graph.nodes.includes(from)
    ? graph.nodes.includes(to)
      ? [...graph.nodes]
      : [...graph.nodes, to]
    : graph.nodes.includes(to)
      ? [...graph.nodes, from]
      : [...graph.nodes, from, to]
  return {
    nodes,
    edges: [...graph.edges, { from, to, weight }],
  }
}

export function adjacencyMatrix(graph: Graph): number[][] {
  const n = graph.nodes.length
  const idx = new Map<string, number>()
  graph.nodes.forEach((node, i) => idx.set(node, i))
  const mat: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  for (const e of graph.edges) {
    const r = idx.get(e.from)
    const c = idx.get(e.to)
    if (r !== undefined && c !== undefined) {
      mat[r]![c] = (mat[r]![c] ?? 0) + e.weight
    }
  }
  return mat
}

export function outDegree(graph: Graph, node: string): number {
  let sum = 0
  for (const e of graph.edges) {
    if (e.from === node) sum += e.weight
  }
  return sum
}

export function inDegree(graph: Graph, node: string): number {
  let sum = 0
  for (const e of graph.edges) {
    if (e.to === node) sum += e.weight
  }
  return sum
}

export function density(graph: Graph): number {
  const n = graph.nodes.length
  if (n < 2) return 0
  return graph.edges.length / (n * (n - 1))
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build adjacency list (directed). */
function buildAdjList(
  graph: Graph,
): Map<string, { to: string; weight: number }[]> {
  const adj = new Map<string, { to: string; weight: number }[]>()
  for (const n of graph.nodes) adj.set(n, [])
  for (const e of graph.edges) {
    adj.get(e.from)?.push({ to: e.to, weight: e.weight })
  }
  return adj
}

/** BFS distances from `start` (unweighted, hop count). */
function bfsDistances(graph: Graph, start: string): Map<string, number> {
  const dist = new Map<string, number>()
  dist.set(start, 0)
  const queue: string[] = [start]
  // Treat as undirected for BFS (used in closeness/betweenness)
  const undirAdj = new Map<string, string[]>()
  for (const n of graph.nodes) undirAdj.set(n, [])
  for (const e of graph.edges) {
    undirAdj.get(e.from)?.push(e.to)
    undirAdj.get(e.to)?.push(e.from)
  }
  while (queue.length > 0) {
    const u = queue.shift()!
    const du = dist.get(u) ?? 0
    for (const v of undirAdj.get(u) ?? []) {
      if (!dist.has(v)) {
        dist.set(v, du + 1)
        queue.push(v)
      }
    }
  }
  return dist
}

/** Dijkstra shortest-path distances from `start` (directed, weighted). */
function dijkstraDistances(
  graph: Graph,
  start: string,
): Map<string, number> {
  const dist = new Map<string, number>()
  for (const n of graph.nodes) dist.set(n, Infinity)
  dist.set(start, 0)

  // Simple priority queue via sorted array for small graphs
  const pq: { node: string; d: number }[] = [{ node: start, d: 0 }]
  const adj = buildAdjList(graph)

  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d)
    const top = pq.shift()!
    const u = top.node
    const du = top.d
    if (du > (dist.get(u) ?? Infinity)) continue
    for (const { to: v, weight: w } of adj.get(u) ?? []) {
      const alt = du + w
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt)
        pq.push({ node: v, d: alt })
      }
    }
  }
  return dist
}

/** Dijkstra with path reconstruction. */
function dijkstraWithPath(
  graph: Graph,
  from: string,
  to: string,
): { path: string[]; distance: number } {
  const dist = new Map<string, number>()
  const prev = new Map<string, string | null>()
  for (const n of graph.nodes) {
    dist.set(n, Infinity)
    prev.set(n, null)
  }
  dist.set(from, 0)

  const pq: { node: string; d: number }[] = [{ node: from, d: 0 }]
  const adj = buildAdjList(graph)

  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d)
    const top = pq.shift()!
    const u = top.node
    const du = top.d
    if (du > (dist.get(u) ?? Infinity)) continue
    for (const { to: v, weight: w } of adj.get(u) ?? []) {
      const alt = du + w
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt)
        prev.set(v, u)
        pq.push({ node: v, d: alt })
      }
    }
  }

  const d = dist.get(to) ?? Infinity
  if (d === Infinity) return { path: [], distance: Infinity }

  const path: string[] = []
  let cur: string | null = to
  while (cur !== null) {
    path.unshift(cur)
    cur = prev.get(cur) ?? null
  }
  return { path, distance: d }
}

function cosine(a: number[], b: number[]): number {
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    const ai = a[i] ?? 0
    const bi = b[i] ?? 0
    dot += ai * bi
    normA += ai * ai
    normB += bi * bi
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// ---------------------------------------------------------------------------
// 2. Centrality measures
// ---------------------------------------------------------------------------

export function degreeCentrality(graph: Graph): Map<string, number> {
  const n = graph.nodes.length
  const result = new Map<string, number>()
  for (const node of graph.nodes) {
    const deg = n <= 1 ? 0 : outDegree(graph, node) / (n - 1)
    result.set(node, deg)
  }
  return result
}

export function closenessCentrality(graph: Graph): Map<string, number> {
  const result = new Map<string, number>()
  const n = graph.nodes.length
  for (const node of graph.nodes) {
    const dists = bfsDistances(graph, node)
    let sum = 0
    let reachable = 0
    for (const other of graph.nodes) {
      if (other === node) continue
      const d = dists.get(other) ?? Infinity
      if (d < Infinity) {
        sum += d
        reachable++
      }
    }
    if (reachable === 0 || sum === 0) {
      result.set(node, 0)
    } else {
      // Normalized closeness: (n-1) * reachable / ((n-1) * sum) if partial
      // Classic formula: (reachable/(n-1)) * (reachable/sum) accounts for disconnected
      const normalized = n <= 1 ? 0 : ((reachable / (n - 1)) * reachable) / sum
      result.set(node, normalized)
    }
  }
  return result
}

export function betweennessCentrality(graph: Graph): Map<string, number> {
  const nodes = graph.nodes
  const n = nodes.length
  const betweenness = new Map<string, number>()
  for (const node of nodes) betweenness.set(node, 0)
  if (n < 3) return betweenness

  // Unweighted BFS-based (Brandes algorithm simplified)
  // Build undirected adjacency for BFS
  const undirAdj = new Map<string, string[]>()
  for (const nd of nodes) undirAdj.set(nd, [])
  for (const e of graph.edges) {
    undirAdj.get(e.from)?.push(e.to)
    undirAdj.get(e.to)?.push(e.from)
  }

  for (const s of nodes) {
    const stack: string[] = []
    const pred = new Map<string, string[]>()
    for (const nd of nodes) pred.set(nd, [])
    const sigma = new Map<string, number>()
    for (const nd of nodes) sigma.set(nd, 0)
    sigma.set(s, 1)
    const dist = new Map<string, number>()
    for (const nd of nodes) dist.set(nd, -1)
    dist.set(s, 0)
    const queue: string[] = [s]

    while (queue.length > 0) {
      const v = queue.shift()!
      stack.push(v)
      for (const w of undirAdj.get(v) ?? []) {
        if ((dist.get(w) ?? -1) < 0) {
          queue.push(w)
          dist.set(w, (dist.get(v) ?? 0) + 1)
        }
        if ((dist.get(w) ?? -1) === (dist.get(v) ?? 0) + 1) {
          sigma.set(w, (sigma.get(w) ?? 0) + (sigma.get(v) ?? 0))
          pred.get(w)?.push(v)
        }
      }
    }

    const delta = new Map<string, number>()
    for (const nd of nodes) delta.set(nd, 0)
    while (stack.length > 0) {
      const w = stack.pop()!
      for (const v of pred.get(w) ?? []) {
        const sigW = sigma.get(w) ?? 0
        const sigV = sigma.get(v) ?? 0
        const frac = sigV === 0 ? 0 : (sigV / sigW) * (1 + (delta.get(w) ?? 0))
        delta.set(v, (delta.get(v) ?? 0) + frac)
      }
      if (w !== s) {
        betweenness.set(w, (betweenness.get(w) ?? 0) + (delta.get(w) ?? 0))
      }
    }
  }

  // Normalize by (n-1)(n-2) for directed; since we treat undirected paths, use same denominator
  const denom = (n - 1) * (n - 2)
  if (denom > 0) {
    for (const [k, v] of betweenness) {
      betweenness.set(k, v / denom)
    }
  }
  return betweenness
}

export function eigenCentrality(
  graph: Graph,
  iterations = 20,
): Map<string, number> {
  const nodes = graph.nodes
  const result = new Map<string, number>()
  if (nodes.length === 0) return result
  for (const n of nodes) result.set(n, 1)

  const adj = buildAdjList(graph)

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Map<string, number>()
    for (const node of nodes) next.set(node, 0)
    for (const node of nodes) {
      for (const { to, weight } of adj.get(node) ?? []) {
        next.set(to, (next.get(to) ?? 0) + (result.get(node) ?? 0) * weight)
      }
    }
    let maxVal = 0
    for (const v of next.values()) {
      if (v > maxVal) maxVal = v
    }
    for (const [k, v] of next) {
      next.set(k, maxVal > 0 ? v / maxVal : 0)
    }
    for (const [k, v] of next) result.set(k, v)
  }

  let maxVal = 0
  for (const v of result.values()) {
    if (v > maxVal) maxVal = v
  }
  if (maxVal > 0) {
    for (const [k, v] of result) result.set(k, v / maxVal)
  }
  return result
}

export function pageRank(
  graph: Graph,
  dampingFactor = 0.85,
  iterations = 50,
): Map<string, number> {
  const nodes = graph.nodes
  const n = nodes.length
  const result = new Map<string, number>()
  if (n === 0) return result
  for (const node of nodes) result.set(node, 1 / n)

  const adj = buildAdjList(graph)
  // Build inbound map
  const inbound = new Map<string, string[]>()
  for (const node of nodes) inbound.set(node, [])
  for (const node of nodes) {
    for (const { to } of adj.get(node) ?? []) {
      inbound.get(to)?.push(node)
    }
  }
  const outDegMap = new Map<string, number>()
  for (const node of nodes) {
    outDegMap.set(node, (adj.get(node) ?? []).length)
  }

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Map<string, number>()
    for (const node of nodes) {
      let rank = (1 - dampingFactor) / n
      for (const src of inbound.get(node) ?? []) {
        const od = outDegMap.get(src) ?? 0
        if (od > 0) {
          rank += dampingFactor * ((result.get(src) ?? 0) / od)
        }
      }
      next.set(node, rank)
    }
    for (const [k, v] of next) result.set(k, v)
  }

  let total = 0
  for (const v of result.values()) total += v
  if (total > 0) {
    for (const [k, v] of result) result.set(k, v / total)
  }
  return result
}

// ---------------------------------------------------------------------------
// 3. Community detection
// ---------------------------------------------------------------------------

export function connectedComponents(graph: Graph): string[][] {
  const visited = new Set<string>()
  const components: string[][] = []

  // Build undirected adjacency
  const undirAdj = new Map<string, string[]>()
  for (const n of graph.nodes) undirAdj.set(n, [])
  for (const e of graph.edges) {
    undirAdj.get(e.from)?.push(e.to)
    undirAdj.get(e.to)?.push(e.from)
  }

  for (const start of graph.nodes) {
    if (visited.has(start)) continue
    const component: string[] = []
    const queue: string[] = [start]
    visited.add(start)
    while (queue.length > 0) {
      const node = queue.shift()!
      component.push(node)
      for (const nb of undirAdj.get(node) ?? []) {
        if (!visited.has(nb)) {
          visited.add(nb)
          queue.push(nb)
        }
      }
    }
    components.push(component)
  }
  return components
}

export function labelPropagation(
  graph: Graph,
  maxIterations = 10,
): Map<string, number> {
  const labels = new Map<string, number>()
  graph.nodes.forEach((n, i) => labels.set(n, i))

  // Undirected adjacency
  const undirAdj = new Map<string, string[]>()
  for (const n of graph.nodes) undirAdj.set(n, [])
  for (const e of graph.edges) {
    undirAdj.get(e.from)?.push(e.to)
    undirAdj.get(e.to)?.push(e.from)
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    let changed = false
    // Shuffle nodes for randomness (deterministic seed-ish by index)
    const order = [...graph.nodes]
    for (const node of order) {
      const neighbors = undirAdj.get(node) ?? []
      if (neighbors.length === 0) continue
      // Count label frequencies
      const freq = new Map<number, number>()
      for (const nb of neighbors) {
        const lbl = labels.get(nb) ?? 0
        freq.set(lbl, (freq.get(lbl) ?? 0) + 1)
      }
      let bestLabel = labels.get(node) ?? 0
      let bestCount = 0
      for (const [lbl, count] of freq) {
        if (count > bestCount || (count === bestCount && lbl < bestLabel)) {
          bestCount = count
          bestLabel = lbl
        }
      }
      if (bestLabel !== (labels.get(node) ?? 0)) {
        labels.set(node, bestLabel)
        changed = true
      }
    }
    if (!changed) break
  }

  // Re-number communities from 0
  const remap = new Map<number, number>()
  let nextId = 0
  for (const node of graph.nodes) {
    const lbl = labels.get(node) ?? 0
    if (!remap.has(lbl)) {
      remap.set(lbl, nextId++)
    }
    labels.set(node, remap.get(lbl) ?? 0)
  }
  return labels
}

export function modularityScore(
  graph: Graph,
  communities: Map<string, number>,
): number {
  const m = graph.edges.length
  if (m === 0) return 0

  let edgesWithin = 0
  for (const e of graph.edges) {
    if ((communities.get(e.from) ?? -1) === (communities.get(e.to) ?? -2)) {
      edgesWithin++
    }
  }

  // Compute degree per community
  const commDegree = new Map<number, number>()
  for (const node of graph.nodes) {
    const c = communities.get(node) ?? 0
    const deg = outDegree(graph, node) + inDegree(graph, node)
    commDegree.set(c, (commDegree.get(c) ?? 0) + deg)
  }

  let expected = 0
  const twoM = 2 * m
  for (const deg of commDegree.values()) {
    expected += (deg / twoM) * (deg / twoM)
  }

  return edgesWithin / m - expected
}

export function stronglyConnectedComponents(graph: Graph): string[][] {
  // Kosaraju's algorithm
  const nodes = graph.nodes
  const adj = buildAdjList(graph)

  // Reversed adjacency
  const radj = new Map<string, string[]>()
  for (const n of nodes) radj.set(n, [])
  for (const e of graph.edges) {
    radj.get(e.to)?.push(e.from)
  }

  // Pass 1: finish order via iterative DFS
  const visited = new Set<string>()
  const finishOrder: string[] = []

  for (const start of nodes) {
    if (visited.has(start)) continue
    const stack: { node: string; idx: number }[] = [{ node: start, idx: 0 }]
    visited.add(start)
    while (stack.length > 0) {
      const top = stack[stack.length - 1]!
      const neighbors = adj.get(top.node) ?? []
      if (top.idx < neighbors.length) {
        const next = (neighbors[top.idx]!).to
        top.idx++
        if (!visited.has(next)) {
          visited.add(next)
          stack.push({ node: next, idx: 0 })
        }
      } else {
        finishOrder.push(top.node)
        stack.pop()
      }
    }
  }

  // Pass 2: assign components on reversed graph in reverse finish order
  const assigned = new Set<string>()
  const sccs: string[][] = []

  for (let i = finishOrder.length - 1; i >= 0; i--) {
    const start = finishOrder[i]!
    if (assigned.has(start)) continue
    const component: string[] = []
    const stack: string[] = [start]
    assigned.add(start)
    while (stack.length > 0) {
      const u = stack.pop()!
      component.push(u)
      for (const v of radj.get(u) ?? []) {
        if (!assigned.has(v)) {
          assigned.add(v)
          stack.push(v)
        }
      }
    }
    sccs.push(component)
  }
  return sccs
}

// ---------------------------------------------------------------------------
// 4. Similarity and clustering
// ---------------------------------------------------------------------------

export function cosineSimilarityGraph(vectors: Map<string, number[]>): Graph {
  const keys = [...vectors.keys()]
  const edges: { from: string; to: string; weight: number }[] = []
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = vectors.get(keys[i]!) ?? []
      const b = vectors.get(keys[j]!) ?? []
      const sim = cosine(a, b)
      if (sim > 0.5) {
        edges.push({ from: keys[i]!, to: keys[j]!, weight: sim })
        edges.push({ from: keys[j]!, to: keys[i]!, weight: sim })
      }
    }
  }
  if (edges.length === 0) {
    // Return a graph with all keys as isolated nodes
    return { nodes: [...keys], edges: [] }
  }
  // buildGraph collects nodes from edges; add any isolated nodes that had no high-sim pairs
  const g = buildGraph(edges)
  const missing = keys.filter((k) => !g.nodes.includes(k))
  return { nodes: [...g.nodes, ...missing], edges: g.edges }
}

export function jaccardSimilarity(
  setA: Set<string>,
  setB: Set<string>,
): number {
  if (setA.size === 0 && setB.size === 0) return 0
  const intersection = [...setA].filter((x) => setB.has(x)).length
  const union = new Set([...setA, ...setB]).size
  return union === 0 ? 0 : intersection / union
}

export function nodeNeighborhood(
  graph: Graph,
  node: string,
  depth = 1,
): string[] {
  // Build undirected adjacency
  const undirAdj = new Map<string, string[]>()
  for (const n of graph.nodes) undirAdj.set(n, [])
  for (const e of graph.edges) {
    undirAdj.get(e.from)?.push(e.to)
    undirAdj.get(e.to)?.push(e.from)
  }

  const visited = new Set<string>([node])
  const queue: { node: string; d: number }[] = [{ node, d: 0 }]
  const result: string[] = []

  while (queue.length > 0) {
    const item = queue.shift()!
    if (item.d >= depth) continue
    for (const nb of undirAdj.get(item.node) ?? []) {
      if (!visited.has(nb)) {
        visited.add(nb)
        result.push(nb)
        queue.push({ node: nb, d: item.d + 1 })
      }
    }
  }
  return result
}

export function sharedNeighbors(
  graph: Graph,
  nodeA: string,
  nodeB: string,
): string[] {
  const neighborsA = new Set(nodeNeighborhood(graph, nodeA, 1))
  const neighborsB = new Set(nodeNeighborhood(graph, nodeB, 1))
  return [...neighborsA].filter(
    (n) => neighborsB.has(n) && n !== nodeA && n !== nodeB,
  )
}

// ---------------------------------------------------------------------------
// 5. Sports network applications
// ---------------------------------------------------------------------------

export function strengthOfSchedule(
  _teamId: string,
  opponents: string[],
  opponentWinRates: Map<string, number>,
): number {
  if (opponents.length === 0) return 0
  let sum = 0
  let count = 0
  for (const opp of opponents) {
    const wr = opponentWinRates.get(opp)
    if (wr !== undefined) {
      sum += wr
      count++
    }
  }
  return count === 0 ? 0 : sum / count
}

export function dominanceGraph(
  results: { winner: string; loser: string; margin: number }[],
): Graph {
  // Accumulate margins for repeated matchups
  const edgeMap = new Map<string, number>()
  const nodeSet = new Set<string>()
  for (const r of results) {
    nodeSet.add(r.winner)
    nodeSet.add(r.loser)
    const key = `${r.winner}__${r.loser}`
    edgeMap.set(key, (edgeMap.get(key) ?? 0) + r.margin)
  }
  const edges: { from: string; to: string; weight: number }[] = []
  for (const [k, w] of edgeMap) {
    const sep = k.indexOf('__')
    edges.push({ from: k.slice(0, sep), to: k.slice(sep + 2), weight: w })
  }
  const nodes = [...nodeSet]
  return { nodes, edges }
}

export function beatChainExists(
  graph: Graph,
  teamA: string,
  teamB: string,
): boolean {
  if (!graph.nodes.includes(teamA) || !graph.nodes.includes(teamB)) return false
  if (teamA === teamB) return false
  const adj = buildAdjList(graph)
  const visited = new Set<string>([teamA])
  const queue: string[] = [teamA]
  while (queue.length > 0) {
    const u = queue.shift()!
    for (const { to } of adj.get(u) ?? []) {
      if (to === teamB) return true
      if (!visited.has(to)) {
        visited.add(to)
        queue.push(to)
      }
    }
  }
  return false
}

export function clusteringCoefficient(
  graph: Graph,
  node: string,
): number {
  // Build undirected adjacency
  const undirAdj = new Map<string, Set<string>>()
  for (const n of graph.nodes) undirAdj.set(n, new Set())
  for (const e of graph.edges) {
    undirAdj.get(e.from)?.add(e.to)
    undirAdj.get(e.to)?.add(e.from)
  }

  const neighbors = [...(undirAdj.get(node) ?? new Set<string>())]
  const k = neighbors.length
  if (k < 2) return 0

  let triangles = 0
  for (let i = 0; i < neighbors.length; i++) {
    for (let j = i + 1; j < neighbors.length; j++) {
      const ni = neighbors[i]!
      const nj = neighbors[j]!
      if (undirAdj.get(ni)?.has(nj)) triangles++
    }
  }
  return (2 * triangles) / (k * (k - 1))
}

export function teamSimilarityNetwork(
  teams: Map<string, number[]>,
): { teamA: string; teamB: string; similarity: number }[] {
  const keys = [...teams.keys()]
  const result: { teamA: string; teamB: string; similarity: number }[] = []
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = teams.get(keys[i]!) ?? []
      const b = teams.get(keys[j]!) ?? []
      const sim = cosine(a, b)
      result.push({ teamA: keys[i]!, teamB: keys[j]!, similarity: sim })
    }
  }
  result.sort((a, b) => b.similarity - a.similarity)
  return result
}

// ---------------------------------------------------------------------------
// 6. Flow and path analysis
// ---------------------------------------------------------------------------

export function shortestPath(
  graph: Graph,
  from: string,
  to: string,
): { path: string[]; distance: number } {
  if (!graph.nodes.includes(from) || !graph.nodes.includes(to)) {
    return { path: [], distance: Infinity }
  }
  if (from === to) return { path: [from], distance: 0 }
  return dijkstraWithPath(graph, from, to)
}

export function allShortestPaths(
  graph: Graph,
): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>()
  for (const src of graph.nodes) {
    const dists = dijkstraDistances(graph, src)
    result.set(src, dists)
  }
  return result
}

export function networkDiameter(graph: Graph): number {
  const all = allShortestPaths(graph)
  let maxDist = 0
  for (const [src, dists] of all) {
    for (const [dst, d] of dists) {
      if (src !== dst && d !== Infinity && d > maxDist) {
        maxDist = d
      }
    }
  }
  return maxDist
}

export function averagePathLength(graph: Graph): number {
  const all = allShortestPaths(graph)
  let sum = 0
  let count = 0
  for (const [src, dists] of all) {
    for (const [dst, d] of dists) {
      if (src !== dst && d !== Infinity) {
        sum += d
        count++
      }
    }
  }
  return count === 0 ? 0 : sum / count
}

export function smallWorldCoefficient(graph: Graph): number {
  const n = graph.nodes.length
  if (n === 0) return 0
  // Average clustering coefficient
  let ccSum = 0
  for (const node of graph.nodes) {
    ccSum += clusteringCoefficient(graph, node)
  }
  const avgCC = n > 0 ? ccSum / n : 0
  const avgPath = averagePathLength(graph)
  return avgPath === 0 ? 0 : avgCC / avgPath
}

// ---------------------------------------------------------------------------
// 7. Temporal and dynamic networks
// ---------------------------------------------------------------------------

export function edgeTimeline(
  events: { from: string; to: string; timestampMs: number; weight?: number }[],
  windowMs: number,
): Graph[] {
  if (events.length === 0 || windowMs <= 0) return []

  const timestamps = events.map((e) => e.timestampMs)
  const minTs = Math.min(...timestamps)
  const maxTs = Math.max(...timestamps)

  const snapshots: Graph[] = []
  for (let start = minTs; start <= maxTs; start += windowMs) {
    const end = start + windowMs
    const windowEvents = events.filter(
      (e) => e.timestampMs >= start && e.timestampMs < end,
    )
    snapshots.push(buildGraph(windowEvents.map((e) => ({ from: e.from, to: e.to, weight: e.weight ?? 1 }))))
  }
  return snapshots
}

export function networkGrowth(
  snapshots: Graph[],
): { nodes: number; edges: number; density: number }[] {
  return snapshots.map((g) => ({
    nodes: g.nodes.length,
    edges: g.edges.length,
    density: density(g),
  }))
}

export function persistentEdges(
  snapshots: Graph[],
): { from: string; to: string }[] {
  if (snapshots.length === 0) return []

  // Find edges present in ALL snapshots
  const first = snapshots[0]!
  const candidates = first.edges.map((e) => ({ from: e.from, to: e.to }))

  return candidates.filter((cand) =>
    snapshots.every((snap) =>
      snap.edges.some((e) => e.from === cand.from && e.to === cand.to),
    ),
  )
}
