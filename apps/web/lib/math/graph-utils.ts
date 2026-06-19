/**
 * Pure TypeScript graph algorithms library.
 * No external npm dependencies. No `any`.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NodeId = string | number

export interface Edge {
  from: NodeId
  to: NodeId
  weight?: number
}

export interface Graph {
  nodes: Set<NodeId>
  edges: Edge[]
  directed?: boolean
}

export interface ShortestPathResult {
  path: NodeId[]
  distance: number
}

export interface TopologicalResult {
  order: NodeId[]
  hasCycle: boolean
}

export interface ComponentResult {
  components: NodeId[][]
  count: number
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Canonical string key for a NodeId */
function key(id: NodeId): string {
  return String(id)
}

/** Build a forward adjacency list (NodeId[] neighbours keyed by NodeId) */
function buildAdjList(
  nodes: Set<NodeId>,
  edges: Edge[],
  directed: boolean,
): Map<NodeId, { to: NodeId; weight: number }[]> {
  const adj = new Map<NodeId, { to: NodeId; weight: number }[]>()
  for (const n of nodes) adj.set(n, [])
  for (const e of edges) {
    adj.get(e.from)?.push({ to: e.to, weight: e.weight ?? 1 })
    if (!directed) {
      adj.get(e.to)?.push({ to: e.from, weight: e.weight ?? 1 })
    }
  }
  return adj
}

// ---------------------------------------------------------------------------
// Graph construction
// ---------------------------------------------------------------------------

export function buildGraph(
  nodes: NodeId[],
  edges: Edge[],
  directed?: boolean,
): Graph {
  return {
    nodes: new Set(nodes),
    edges: [...edges],
    directed: directed ?? false,
  }
}

export function addNode(graph: Graph, node: NodeId): Graph {
  const nodes = new Set(graph.nodes)
  nodes.add(node)
  return { ...graph, nodes }
}

export function addEdge(graph: Graph, edge: Edge): Graph {
  return { ...graph, edges: [...graph.edges, edge] }
}

export function removeNode(graph: Graph, node: NodeId): Graph {
  const nodes = new Set(graph.nodes)
  nodes.delete(node)
  const edges = graph.edges.filter(
    (e) => e.from !== node && e.to !== node,
  )
  return { ...graph, nodes, edges }
}

export function removeEdge(
  graph: Graph,
  from: NodeId,
  to: NodeId,
): Graph {
  const edges = graph.edges.filter(
    (e) => !(e.from === from && e.to === to),
  )
  return { ...graph, edges }
}

export function adjacencyList(graph: Graph): Map<NodeId, NodeId[]> {
  const result = new Map<NodeId, NodeId[]>()
  for (const n of graph.nodes) result.set(n, [])
  for (const e of graph.edges) {
    result.get(e.from)?.push(e.to)
    if (!graph.directed) {
      result.get(e.to)?.push(e.from)
    }
  }
  return result
}

export function adjacencyMatrix(graph: Graph): number[][] {
  const sorted = [...graph.nodes].sort((a, b) =>
    String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0,
  )
  const n = sorted.length
  const idx = new Map<NodeId, number>()
  sorted.forEach((node, i) => idx.set(node, i))

  const mat: number[][] = Array.from({ length: n }, () =>
    Array(n).fill(0),
  )
  for (const e of graph.edges) {
    const r = idx.get(e.from)
    const c = idx.get(e.to)
    if (r !== undefined && c !== undefined) {
      mat[r][c] = e.weight ?? 1
      if (!graph.directed) mat[c][r] = e.weight ?? 1
    }
  }
  return mat
}

// ---------------------------------------------------------------------------
// Traversal
// ---------------------------------------------------------------------------

export function bfs(graph: Graph, start: NodeId): NodeId[] {
  if (!graph.nodes.has(start)) return []
  const adj = buildAdjList(graph.nodes, graph.edges, graph.directed ?? false)
  const visited = new Set<NodeId>()
  const queue: NodeId[] = [start]
  const result: NodeId[] = []
  visited.add(start)
  while (queue.length > 0) {
    const node = queue.shift()!
    result.push(node)
    for (const { to } of adj.get(node) ?? []) {
      if (!visited.has(to)) {
        visited.add(to)
        queue.push(to)
      }
    }
  }
  return result
}

export function dfs(graph: Graph, start: NodeId): NodeId[] {
  if (!graph.nodes.has(start)) return []
  const adj = buildAdjList(graph.nodes, graph.edges, graph.directed ?? false)
  const visited = new Set<NodeId>()
  const stack: NodeId[] = [start]
  const result: NodeId[] = []
  while (stack.length > 0) {
    const node = stack.pop()!
    if (visited.has(node)) continue
    visited.add(node)
    result.push(node)
    // Push neighbours in reverse order so we visit in "natural" order
    const neighbours = (adj.get(node) ?? []).map((n) => n.to).reverse()
    for (const nb of neighbours) {
      if (!visited.has(nb)) stack.push(nb)
    }
  }
  return result
}

export function dfsRecursive(graph: Graph, start: NodeId): NodeId[] {
  if (!graph.nodes.has(start)) return []
  const adj = buildAdjList(graph.nodes, graph.edges, graph.directed ?? false)
  const visited = new Set<NodeId>()
  const result: NodeId[] = []

  function visit(node: NodeId): void {
    if (visited.has(node)) return
    visited.add(node)
    result.push(node)
    for (const { to } of adj.get(node) ?? []) {
      visit(to)
    }
  }
  visit(start)
  return result
}

export function bfsLevels(graph: Graph, start: NodeId): NodeId[][] {
  if (!graph.nodes.has(start)) return []
  const adj = buildAdjList(graph.nodes, graph.edges, graph.directed ?? false)
  const visited = new Set<NodeId>()
  const levels: NodeId[][] = []
  let current: NodeId[] = [start]
  visited.add(start)
  while (current.length > 0) {
    levels.push(current)
    const next: NodeId[] = []
    for (const node of current) {
      for (const { to } of adj.get(node) ?? []) {
        if (!visited.has(to)) {
          visited.add(to)
          next.push(to)
        }
      }
    }
    current = next
  }
  return levels
}

// ---------------------------------------------------------------------------
// Shortest paths
// ---------------------------------------------------------------------------

/** Simple binary-heap priority queue */
class MinHeap<T> {
  private heap: { priority: number; value: T }[] = []

  push(value: T, priority: number): void {
    this.heap.push({ priority, value })
    this._bubbleUp(this.heap.length - 1)
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined
    const top = this.heap[0]
    const last = this.heap.pop()!
    if (this.heap.length > 0) {
      this.heap[0] = last
      this._sinkDown(0)
    }
    return top.value
  }

  get size(): number {
    return this.heap.length
  }

  private _bubbleUp(i: number): void {
    while (i > 0) {
      const parent = (i - 1) >> 1
      if (this.heap[parent].priority <= this.heap[i].priority) break
      ;[this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]]
      i = parent
    }
  }

  private _sinkDown(i: number): void {
    const n = this.heap.length
    while (true) {
      let smallest = i
      const l = 2 * i + 1
      const r = 2 * i + 2
      if (l < n && this.heap[l].priority < this.heap[smallest].priority)
        smallest = l
      if (r < n && this.heap[r].priority < this.heap[smallest].priority)
        smallest = r
      if (smallest === i) break
      ;[this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]]
      i = smallest
    }
  }
}

export function dijkstra(
  graph: Graph,
  start: NodeId,
): Map<NodeId, ShortestPathResult> {
  const adj = buildAdjList(graph.nodes, graph.edges, graph.directed ?? false)
  const dist = new Map<NodeId, number>()
  const prev = new Map<NodeId, NodeId | null>()

  for (const n of graph.nodes) {
    dist.set(n, Infinity)
    prev.set(n, null)
  }
  dist.set(start, 0)

  const pq = new MinHeap<NodeId>()
  pq.push(start, 0)

  while (pq.size > 0) {
    const u = pq.pop()!
    const du = dist.get(u)!
    for (const { to: v, weight: w } of adj.get(u) ?? []) {
      const alt = du + w
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt)
        prev.set(v, u)
        pq.push(v, alt)
      }
    }
  }

  const result = new Map<NodeId, ShortestPathResult>()
  for (const n of graph.nodes) {
    const d = dist.get(n) ?? Infinity
    if (d === Infinity) {
      result.set(n, { path: [], distance: Infinity })
    } else {
      // Reconstruct path
      const path: NodeId[] = []
      let cur: NodeId | null = n
      while (cur !== null) {
        path.unshift(cur)
        cur = prev.get(cur) ?? null
      }
      result.set(n, { path, distance: d })
    }
  }
  return result
}

export function shortestPath(
  graph: Graph,
  from: NodeId,
  to: NodeId,
): ShortestPathResult | null {
  if (!graph.nodes.has(from) || !graph.nodes.has(to)) return null
  if (from === to) return { path: [from], distance: 0 }
  const results = dijkstra(graph, from)
  const res = results.get(to)
  if (!res || res.distance === Infinity) return null
  return res
}

export function allPairsShortestPath(
  graph: Graph,
): Map<string, ShortestPathResult> {
  const result = new Map<string, ShortestPathResult>()
  for (const src of graph.nodes) {
    const fromSrc = dijkstra(graph, src)
    for (const dst of graph.nodes) {
      const res = fromSrc.get(dst)
      if (res) {
        result.set(`${key(src)}->${key(dst)}`, res)
      }
    }
  }
  return result
}

export function floydWarshall(
  nodes: NodeId[],
  edges: Edge[],
): { dist: number[][]; next: number[][] } {
  const sorted = [...nodes].sort((a, b) =>
    String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0,
  )
  const n = sorted.length
  const idx = new Map<NodeId, number>()
  sorted.forEach((node, i) => idx.set(node, i))

  const INF = Infinity
  const dist: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => (i === j ? 0 : INF)),
  )
  const next: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => (i === j ? j : -1)),
  )

  for (const e of edges) {
    const r = idx.get(e.from)
    const c = idx.get(e.to)
    if (r !== undefined && c !== undefined) {
      const w = e.weight ?? 1
      if (w < dist[r][c]) {
        dist[r][c] = w
        next[r][c] = c
      }
    }
  }

  for (let k = 0; k < n; k++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (dist[i][k] !== INF && dist[k][j] !== INF) {
          const through = dist[i][k] + dist[k][j]
          if (through < dist[i][j]) {
            dist[i][j] = through
            next[i][j] = next[i][k]
          }
        }
      }
    }
  }

  return { dist, next }
}

// ---------------------------------------------------------------------------
// Topological sort (directed graphs)
// ---------------------------------------------------------------------------

export function topologicalSort(graph: Graph): TopologicalResult {
  const adj = buildAdjList(graph.nodes, graph.edges, true)
  // 0 = white (unvisited), 1 = gray (in stack), 2 = black (done)
  const color = new Map<NodeId, 0 | 1 | 2>()
  for (const n of graph.nodes) color.set(n, 0)

  const order: NodeId[] = []
  let cycleFound = false

  function visit(node: NodeId): void {
    if (cycleFound) return
    color.set(node, 1)
    for (const { to } of adj.get(node) ?? []) {
      const c = color.get(to) ?? 0
      if (c === 1) {
        cycleFound = true
        return
      }
      if (c === 0) visit(to)
    }
    color.set(node, 2)
    order.unshift(node)
  }

  for (const n of graph.nodes) {
    if (color.get(n) === 0) visit(n)
  }

  return { order: cycleFound ? [] : order, hasCycle: cycleFound }
}

export function kahn(graph: Graph): NodeId[] | null {
  // Works on directed graph
  const inDegree = new Map<NodeId, number>()
  for (const n of graph.nodes) inDegree.set(n, 0)
  for (const e of graph.edges) {
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1)
  }

  const queue: NodeId[] = []
  for (const [n, d] of inDegree) {
    if (d === 0) queue.push(n)
  }

  const adj = adjacencyList({ ...graph, directed: true })
  const order: NodeId[] = []
  while (queue.length > 0) {
    const u = queue.shift()!
    order.push(u)
    for (const v of adj.get(u) ?? []) {
      const d = (inDegree.get(v) ?? 0) - 1
      inDegree.set(v, d)
      if (d === 0) queue.push(v)
    }
  }

  return order.length === graph.nodes.size ? order : null
}

// ---------------------------------------------------------------------------
// Connectivity
// ---------------------------------------------------------------------------

export function connectedComponents(graph: Graph): ComponentResult {
  const visited = new Set<NodeId>()
  const components: NodeId[][] = []
  const adj = buildAdjList(graph.nodes, graph.edges, false)

  for (const start of graph.nodes) {
    if (visited.has(start)) continue
    // BFS
    const component: NodeId[] = []
    const queue: NodeId[] = [start]
    visited.add(start)
    while (queue.length > 0) {
      const node = queue.shift()!
      component.push(node)
      for (const { to } of adj.get(node) ?? []) {
        if (!visited.has(to)) {
          visited.add(to)
          queue.push(to)
        }
      }
    }
    components.push(component)
  }

  return { components, count: components.length }
}

export function stronglyConnectedComponents(graph: Graph): NodeId[][] {
  // Kosaraju's two-pass DFS
  const nodes = [...graph.nodes]
  const adj = buildAdjList(graph.nodes, graph.edges, true)

  // Reversed adjacency
  const radj = new Map<NodeId, NodeId[]>()
  for (const n of nodes) radj.set(n, [])
  for (const e of graph.edges) {
    radj.get(e.to)?.push(e.from)
  }

  // Pass 1: finish order
  const visited = new Set<NodeId>()
  const finishOrder: NodeId[] = []

  function dfs1(u: NodeId): void {
    visited.add(u)
    for (const { to: v } of adj.get(u) ?? []) {
      if (!visited.has(v)) dfs1(v)
    }
    finishOrder.push(u)
  }

  for (const n of nodes) {
    if (!visited.has(n)) dfs1(n)
  }

  // Pass 2: assign components on reversed graph in reverse finish order
  const assigned = new Set<NodeId>()
  const sccs: NodeId[][] = []

  function dfs2(u: NodeId, component: NodeId[]): void {
    assigned.add(u)
    component.push(u)
    for (const v of radj.get(u) ?? []) {
      if (!assigned.has(v)) dfs2(v, component)
    }
  }

  for (let i = finishOrder.length - 1; i >= 0; i--) {
    const n = finishOrder[i]
    if (!assigned.has(n)) {
      const component: NodeId[] = []
      dfs2(n, component)
      sccs.push(component)
    }
  }

  return sccs
}

export function isConnected(graph: Graph): boolean {
  if (graph.nodes.size === 0) return true
  const start = [...graph.nodes][0]
  const visited = bfs(graph, start)
  return visited.length === graph.nodes.size
}

export function hasCycle(graph: Graph): boolean {
  if (graph.directed) {
    // DFS with gray/black coloring
    const adj = buildAdjList(graph.nodes, graph.edges, true)
    const color = new Map<NodeId, 0 | 1 | 2>()
    for (const n of graph.nodes) color.set(n, 0)
    let found = false

    function visit(node: NodeId): void {
      if (found) return
      color.set(node, 1)
      for (const { to } of adj.get(node) ?? []) {
        if (color.get(to) === 1) { found = true; return }
        if (color.get(to) === 0) visit(to)
      }
      color.set(node, 2)
    }

    for (const n of graph.nodes) {
      if (color.get(n) === 0) visit(n)
    }
    return found
  } else {
    // Undirected: DFS with parent tracking
    const adj = buildAdjList(graph.nodes, graph.edges, false)
    const visited = new Set<NodeId>()
    let found = false

    function visit(node: NodeId, parent: NodeId | null): void {
      if (found) return
      visited.add(node)
      for (const { to } of adj.get(node) ?? []) {
        if (!visited.has(to)) {
          visit(to, node)
        } else if (to !== parent) {
          found = true
        }
      }
    }

    for (const n of graph.nodes) {
      if (!visited.has(n)) visit(n, null)
    }
    return found
  }
}

export function isBipartite(graph: Graph): boolean {
  const adj = buildAdjList(graph.nodes, graph.edges, false)
  const color = new Map<NodeId, 0 | 1>()

  for (const start of graph.nodes) {
    if (color.has(start)) continue
    const queue: NodeId[] = [start]
    color.set(start, 0)
    while (queue.length > 0) {
      const u = queue.shift()!
      const cu = color.get(u)!
      for (const { to: v } of adj.get(u) ?? []) {
        if (!color.has(v)) {
          color.set(v, cu === 0 ? 1 : 0)
          queue.push(v)
        } else if (color.get(v) === cu) {
          return false
        }
      }
    }
  }
  return true
}

// ---------------------------------------------------------------------------
// Tree utilities
// ---------------------------------------------------------------------------

/** Kruskal's algorithm — union-find */
export function minimumSpanningTree(graph: Graph): Edge[] {
  const parent = new Map<NodeId, NodeId>()
  const rank = new Map<NodeId, number>()

  for (const n of graph.nodes) {
    parent.set(n, n)
    rank.set(n, 0)
  }

  function find(x: NodeId): NodeId {
    if (parent.get(x) !== x) {
      parent.set(x, find(parent.get(x)!))
    }
    return parent.get(x)!
  }

  function union(x: NodeId, y: NodeId): boolean {
    const rx = find(x)
    const ry = find(y)
    if (rx === ry) return false
    if ((rank.get(rx) ?? 0) < (rank.get(ry) ?? 0)) {
      parent.set(rx, ry)
    } else if ((rank.get(rx) ?? 0) > (rank.get(ry) ?? 0)) {
      parent.set(ry, rx)
    } else {
      parent.set(ry, rx)
      rank.set(rx, (rank.get(rx) ?? 0) + 1)
    }
    return true
  }

  const sorted = [...graph.edges].sort(
    (a, b) => (a.weight ?? 1) - (b.weight ?? 1),
  )
  const mst: Edge[] = []
  for (const e of sorted) {
    if (union(e.from, e.to)) {
      mst.push(e)
    }
  }
  return mst
}

export function isTree(graph: Graph): boolean {
  if (graph.nodes.size === 0) return true
  // Must be connected and have exactly n-1 edges
  if (graph.edges.length !== graph.nodes.size - 1) return false
  return isConnected(graph) && !hasCycle(graph)
}

// ---------------------------------------------------------------------------
// Sports-specific
// ---------------------------------------------------------------------------

export function scheduleStrength(
  teamId: NodeId,
  schedule: Edge[],
  ratings: Map<NodeId, number>,
): number {
  if (ratings.size === 0) return 0

  let totalWeight = 0
  let weightedSum = 0

  for (const e of schedule) {
    let opponent: NodeId | null = null
    if (e.from === teamId) opponent = e.to
    else if (e.to === teamId) opponent = e.from
    else continue

    const rating = ratings.get(opponent)
    if (rating === undefined) continue

    const w = e.weight ?? 1
    weightedSum += rating * w
    totalWeight += w
  }

  if (totalWeight === 0) return 0
  return weightedSum / totalWeight
}

export function centralityScore(graph: Graph, node: NodeId): number {
  const n = graph.nodes.size
  if (n <= 1) return 0
  const adj = buildAdjList(graph.nodes, graph.edges, graph.directed ?? false)
  const degree = (adj.get(node) ?? []).length
  return degree / (n - 1)
}

export function rankByPageRank(
  graph: Graph,
  dampingFactor = 0.85,
  iterations = 100,
): Map<NodeId, number> {
  const nodes = [...graph.nodes]
  const n = nodes.length
  if (n === 0) return new Map()

  const adj = buildAdjList(graph.nodes, graph.edges, graph.directed ?? false)

  // For directed, we need inbound links; adj is outbound
  // Build inbound map
  const inbound = new Map<NodeId, NodeId[]>()
  for (const node of nodes) inbound.set(node, [])

  for (const node of nodes) {
    for (const { to } of adj.get(node) ?? []) {
      inbound.get(to)?.push(node)
    }
  }

  // Out-degrees
  const outDegree = new Map<NodeId, number>()
  for (const node of nodes) {
    outDegree.set(node, (adj.get(node) ?? []).length)
  }

  // Init scores
  let scores = new Map<NodeId, number>()
  for (const node of nodes) scores.set(node, 1 / n)

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Map<NodeId, number>()
    for (const node of nodes) {
      let rank = (1 - dampingFactor) / n
      for (const src of inbound.get(node) ?? []) {
        const od = outDegree.get(src) ?? 0
        if (od > 0) {
          rank += dampingFactor * ((scores.get(src) ?? 0) / od)
        }
      }
      next.set(node, rank)
    }
    scores = next
  }

  // Normalize so scores sum to 1
  let total = 0
  for (const v of scores.values()) total += v
  if (total > 0) {
    for (const [k, v] of scores) scores.set(k, v / total)
  }

  return scores
}
