import { describe, it, expect } from 'vitest'
import {
  buildGraph,
  addNode,
  addEdge,
  removeNode,
  removeEdge,
  adjacencyList,
  adjacencyMatrix,
  bfs,
  dfs,
  dfsRecursive,
  bfsLevels,
  dijkstra,
  shortestPath,
  allPairsShortestPath,
  floydWarshall,
  topologicalSort,
  kahn,
  connectedComponents,
  stronglyConnectedComponents,
  isConnected,
  hasCycle,
  isBipartite,
  minimumSpanningTree,
  isTree,
  scheduleStrength,
  centralityScore,
  rankByPageRank,
} from '../lib/math/graph-utils'
import type { Edge, NodeId } from '../lib/math/graph-utils'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sortedIds = (ids: NodeId[]): string[] =>
  ids.map(String).sort()

// ---------------------------------------------------------------------------
// Graph construction
// ---------------------------------------------------------------------------

describe('buildGraph', () => {
  it('creates a graph with the specified nodes and edges', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }])
    expect(g.nodes.size).toBe(3)
    expect(g.edges).toHaveLength(1)
    expect(g.directed).toBe(false)
  })

  it('sets directed flag when provided', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2 }], true)
    expect(g.directed).toBe(true)
  })

  it('creates an empty graph', () => {
    const g = buildGraph([], [])
    expect(g.nodes.size).toBe(0)
    expect(g.edges).toHaveLength(0)
  })

  it('accepts string NodeIds', () => {
    const g = buildGraph(['a', 'b'], [{ from: 'a', to: 'b' }])
    expect(g.nodes.has('a')).toBe(true)
    expect(g.nodes.has('b')).toBe(true)
  })
})

describe('addNode', () => {
  it('adds a node that does not exist', () => {
    const g = buildGraph([1, 2], [])
    const g2 = addNode(g, 3)
    expect(g2.nodes.has(3)).toBe(true)
    expect(g2.nodes.size).toBe(3)
  })

  it('adding an existing node is idempotent', () => {
    const g = buildGraph([1, 2], [])
    const g2 = addNode(g, 1)
    expect(g2.nodes.size).toBe(2)
  })

  it('does not mutate the original graph', () => {
    const g = buildGraph([1, 2], [])
    addNode(g, 3)
    expect(g.nodes.size).toBe(2)
  })
})

describe('addEdge', () => {
  it('adds an edge', () => {
    const g = buildGraph([1, 2], [])
    const g2 = addEdge(g, { from: 1, to: 2, weight: 5 })
    expect(g2.edges).toHaveLength(1)
    expect(g2.edges[0].weight).toBe(5)
  })

  it('allows duplicate edges', () => {
    const g = buildGraph([1, 2], [])
    const g2 = addEdge(addEdge(g, { from: 1, to: 2 }), { from: 1, to: 2 })
    expect(g2.edges).toHaveLength(2)
  })
})

describe('removeNode', () => {
  it('removes a node and its incident edges', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 2, to: 3 }])
    const g2 = removeNode(g, 2)
    expect(g2.nodes.has(2)).toBe(false)
    expect(g2.edges).toHaveLength(0)
  })

  it('removing a non-existent node leaves graph unchanged', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2 }])
    const g2 = removeNode(g, 99)
    expect(g2.nodes.size).toBe(2)
    expect(g2.edges).toHaveLength(1)
  })
})

describe('removeEdge', () => {
  it('removes the matching edge', () => {
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ])
    const g2 = removeEdge(g, 1, 2)
    expect(g2.edges).toHaveLength(1)
    expect(g2.edges[0].from).toBe(2)
  })

  it('removing non-existent edge leaves edges unchanged', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2 }])
    const g2 = removeEdge(g, 99, 100)
    expect(g2.edges).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// adjacencyList / adjacencyMatrix
// ---------------------------------------------------------------------------

describe('adjacencyList', () => {
  it('undirected: both directions present', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2 }])
    const al = adjacencyList(g)
    expect(al.get(1)).toContain(2)
    expect(al.get(2)).toContain(1)
  })

  it('directed: only forward direction', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2 }], true)
    const al = adjacencyList(g)
    expect(al.get(1)).toContain(2)
    expect(al.get(2)).not.toContain(1)
  })

  it('isolated node has empty neighbour list', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }])
    const al = adjacencyList(g)
    expect(al.get(3)).toEqual([])
  })
})

describe('adjacencyMatrix', () => {
  it('symmetric for undirected graphs', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2, weight: 4 }])
    const mat = adjacencyMatrix(g)
    // nodes sorted: '1', '2', '3' → indices 0,1,2
    expect(mat[0][1]).toBe(4)
    expect(mat[1][0]).toBe(4)
    expect(mat[0][2]).toBe(0)
  })

  it('asymmetric for directed graphs', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2, weight: 7 }], true)
    const mat = adjacencyMatrix(g)
    expect(mat[0][1]).toBe(7)
    expect(mat[1][0]).toBe(0)
  })

  it('default weight is 1 when not provided', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2 }])
    const mat = adjacencyMatrix(g)
    expect(mat[0][1]).toBe(1)
  })

  it('returns 0-by-0 matrix for empty graph', () => {
    const mat = adjacencyMatrix(buildGraph([], []))
    expect(mat).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// BFS / DFS
// ---------------------------------------------------------------------------

describe('bfs', () => {
  it('visits all reachable nodes', () => {
    // 1 -- 2 -- 3
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 2, to: 3 }])
    const result = bfs(g, 1)
    expect(sortedIds(result)).toEqual(['1', '2', '3'])
  })

  it('returns start node first', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 1, to: 3 }])
    const result = bfs(g, 1)
    expect(result[0]).toBe(1)
  })

  it('does not visit unreachable nodes in disconnected graph', () => {
    const g = buildGraph([1, 2, 3, 4], [{ from: 1, to: 2 }, { from: 3, to: 4 }])
    const result = bfs(g, 1)
    expect(result).not.toContain(3)
    expect(result).not.toContain(4)
  })

  it('returns empty for a missing start node', () => {
    const g = buildGraph([1, 2], [])
    expect(bfs(g, 99)).toEqual([])
  })

  it('returns single node for isolated node', () => {
    const g = buildGraph([1], [])
    expect(bfs(g, 1)).toEqual([1])
  })
})

describe('dfs (iterative)', () => {
  it('visits all reachable nodes', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 2, to: 3 }])
    const result = dfs(g, 1)
    expect(sortedIds(result)).toEqual(['1', '2', '3'])
  })

  it('starts with the start node', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 1, to: 3 }])
    expect(dfs(g, 1)[0]).toBe(1)
  })

  it('returns empty for missing start node', () => {
    const g = buildGraph([1, 2], [])
    expect(dfs(g, 99)).toEqual([])
  })
})

describe('dfsRecursive', () => {
  it('visits all reachable nodes', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 2, to: 3 }])
    const result = dfsRecursive(g, 1)
    expect(sortedIds(result)).toEqual(['1', '2', '3'])
  })

  it('returns empty for missing start node', () => {
    const g = buildGraph([1, 2], [])
    expect(dfsRecursive(g, 99)).toEqual([])
  })
})

describe('bfsLevels', () => {
  it('groups nodes by distance from start', () => {
    //    1
    //   / \
    //  2   3
    //  |
    //  4
    const g = buildGraph([1, 2, 3, 4], [
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 2, to: 4 },
    ])
    const levels = bfsLevels(g, 1)
    expect(levels[0]).toEqual([1])
    expect(sortedIds(levels[1])).toEqual(['2', '3'])
    expect(levels[2]).toEqual([4])
  })

  it('single node produces one level', () => {
    const g = buildGraph([1], [])
    const levels = bfsLevels(g, 1)
    expect(levels).toHaveLength(1)
    expect(levels[0]).toEqual([1])
  })

  it('returns empty for missing start', () => {
    const g = buildGraph([1], [])
    expect(bfsLevels(g, 99)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Dijkstra / shortestPath / allPairs / floydWarshall
// ---------------------------------------------------------------------------

describe('dijkstra', () => {
  it('computes shortest distances on a weighted graph', () => {
    // 1 -5-> 2 -3-> 3; 1 -10-> 3
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2, weight: 5 },
      { from: 2, to: 3, weight: 3 },
      { from: 1, to: 3, weight: 10 },
    ], true)
    const result = dijkstra(g, 1)
    expect(result.get(1)?.distance).toBe(0)
    expect(result.get(2)?.distance).toBe(5)
    expect(result.get(3)?.distance).toBe(8) // via 2
  })

  it('path to self is [self] with distance 0', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2, weight: 3 }])
    const res = dijkstra(g, 1).get(1)
    expect(res?.distance).toBe(0)
    expect(res?.path).toEqual([1])
  })

  it('unreachable node gets Infinity distance and empty path', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }], true)
    const res = dijkstra(g, 1).get(3)
    expect(res?.distance).toBe(Infinity)
    expect(res?.path).toEqual([])
  })

  it('works with unweighted graph (default weight 1)', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 2, to: 3 }])
    const res = dijkstra(g, 1)
    expect(res.get(3)?.distance).toBe(2)
  })

  it('reconstructs the path correctly', () => {
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2, weight: 1 },
      { from: 2, to: 3, weight: 1 },
    ], true)
    const res = dijkstra(g, 1).get(3)
    expect(res?.path).toEqual([1, 2, 3])
  })
})

describe('shortestPath', () => {
  it('finds the shortest path between two nodes', () => {
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2, weight: 2 },
      { from: 2, to: 3, weight: 3 },
    ])
    const result = shortestPath(g, 1, 3)
    expect(result).not.toBeNull()
    expect(result?.distance).toBe(5)
    expect(result?.path).toEqual([1, 2, 3])
  })

  it('returns { path: [node], distance: 0 } for same node', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2 }])
    const result = shortestPath(g, 1, 1)
    expect(result?.distance).toBe(0)
    expect(result?.path).toEqual([1])
  })

  it('returns null when no path exists', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }], true)
    expect(shortestPath(g, 1, 3)).toBeNull()
  })

  it('returns null when from node not in graph', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2 }])
    expect(shortestPath(g, 99, 1)).toBeNull()
  })

  it('returns null when to node not in graph', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2 }])
    expect(shortestPath(g, 1, 99)).toBeNull()
  })
})

describe('allPairsShortestPath', () => {
  it('computes paths for all pairs', () => {
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2, weight: 1 },
      { from: 2, to: 3, weight: 1 },
    ])
    const result = allPairsShortestPath(g)
    expect(result.get('1->3')?.distance).toBe(2)
    expect(result.get('3->1')?.distance).toBe(2) // undirected
  })

  it('self-distance is 0', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2 }])
    expect(allPairsShortestPath(g).get('1->1')?.distance).toBe(0)
  })
})

describe('floydWarshall', () => {
  it('computes all pairwise distances', () => {
    const nodes: NodeId[] = [1, 2, 3]
    const edges: Edge[] = [
      { from: 1, to: 2, weight: 3 },
      { from: 2, to: 3, weight: 4 },
      { from: 1, to: 3, weight: 10 },
    ]
    const { dist } = floydWarshall(nodes, edges)
    // sorted order: '1'=0, '2'=1, '3'=2
    expect(dist[0][2]).toBe(7) // 1->2->3 = 7, cheaper than direct 10
  })

  it('diagonal is zero', () => {
    const nodes: NodeId[] = [1, 2]
    const edges: Edge[] = [{ from: 1, to: 2, weight: 5 }]
    const { dist } = floydWarshall(nodes, edges)
    expect(dist[0][0]).toBe(0)
    expect(dist[1][1]).toBe(0)
  })

  it('returns empty matrices for no nodes', () => {
    const { dist, next } = floydWarshall([], [])
    expect(dist).toHaveLength(0)
    expect(next).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Topological sort
// ---------------------------------------------------------------------------

describe('topologicalSort', () => {
  it('returns a valid topological order for a DAG', () => {
    // 1->2, 1->3, 2->4, 3->4
    const g = buildGraph([1, 2, 3, 4], [
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 2, to: 4 },
      { from: 3, to: 4 },
    ], true)
    const { order, hasCycle: cycle } = topologicalSort(g)
    expect(cycle).toBe(false)
    expect(order).toHaveLength(4)
    // 1 must come before 2, 3; 2 and 3 before 4
    expect(order.indexOf(1)).toBeLessThan(order.indexOf(2))
    expect(order.indexOf(1)).toBeLessThan(order.indexOf(3))
    expect(order.indexOf(2)).toBeLessThan(order.indexOf(4))
  })

  it('detects a cycle', () => {
    // 1->2->3->1
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 1 },
    ], true)
    const { hasCycle: cycle } = topologicalSort(g)
    expect(cycle).toBe(true)
  })

  it('returns empty order when cycle detected', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2 }, { from: 2, to: 1 }], true)
    const { order, hasCycle: cycle } = topologicalSort(g)
    expect(cycle).toBe(true)
    expect(order).toHaveLength(0)
  })

  it('single node DAG', () => {
    const g = buildGraph([1], [], true)
    const { order, hasCycle: cycle } = topologicalSort(g)
    expect(cycle).toBe(false)
    expect(order).toEqual([1])
  })
})

describe('kahn', () => {
  it('returns topological order for a DAG', () => {
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ], true)
    const result = kahn(g)
    expect(result).not.toBeNull()
    expect(result!.indexOf(1)).toBeLessThan(result!.indexOf(2))
    expect(result!.indexOf(2)).toBeLessThan(result!.indexOf(3))
  })

  it('returns null when cycle exists', () => {
    const g = buildGraph([1, 2], [
      { from: 1, to: 2 },
      { from: 2, to: 1 },
    ], true)
    expect(kahn(g)).toBeNull()
  })

  it('handles empty graph', () => {
    const g = buildGraph([], [], true)
    expect(kahn(g)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Connectivity
// ---------------------------------------------------------------------------

describe('connectedComponents', () => {
  it('finds two components in a disconnected graph', () => {
    const g = buildGraph([1, 2, 3, 4], [
      { from: 1, to: 2 },
      { from: 3, to: 4 },
    ])
    const { components, count } = connectedComponents(g)
    expect(count).toBe(2)
    expect(components.some(c => sortedIds(c).includes('1') && sortedIds(c).includes('2'))).toBe(true)
    expect(components.some(c => sortedIds(c).includes('3') && sortedIds(c).includes('4'))).toBe(true)
  })

  it('single component for a fully connected graph', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 2, to: 3 }])
    const { count } = connectedComponents(g)
    expect(count).toBe(1)
  })

  it('isolated nodes form their own components', () => {
    const g = buildGraph([1, 2, 3], [])
    const { count } = connectedComponents(g)
    expect(count).toBe(3)
  })

  it('empty graph returns zero components', () => {
    const g = buildGraph([], [])
    const { count } = connectedComponents(g)
    expect(count).toBe(0)
  })
})

describe('stronglyConnectedComponents', () => {
  it('each node in its own SCC when no cycles', () => {
    // 1->2->3
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 2, to: 3 }], true)
    const sccs = stronglyConnectedComponents(g)
    expect(sccs).toHaveLength(3)
    expect(sccs.every(c => c.length === 1)).toBe(true)
  })

  it('finds SCC for a cycle', () => {
    // 1<->2, 3 isolated
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2 },
      { from: 2, to: 1 },
    ], true)
    const sccs = stronglyConnectedComponents(g)
    const largeSCC = sccs.find(c => c.length === 2)
    expect(largeSCC).toBeDefined()
    expect(sortedIds(largeSCC!)).toEqual(['1', '2'])
  })

  it('handles empty graph', () => {
    const g = buildGraph([], [], true)
    expect(stronglyConnectedComponents(g)).toHaveLength(0)
  })
})

describe('isConnected', () => {
  it('returns true for a connected graph', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 2, to: 3 }])
    expect(isConnected(g)).toBe(true)
  })

  it('returns false for a disconnected graph', () => {
    const g = buildGraph([1, 2, 3, 4], [{ from: 1, to: 2 }, { from: 3, to: 4 }])
    expect(isConnected(g)).toBe(false)
  })

  it('returns true for a single node', () => {
    const g = buildGraph([1], [])
    expect(isConnected(g)).toBe(true)
  })

  it('returns true for an empty graph', () => {
    const g = buildGraph([], [])
    expect(isConnected(g)).toBe(true)
  })
})

describe('hasCycle', () => {
  it('detects a cycle in undirected graph', () => {
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 1 },
    ])
    expect(hasCycle(g)).toBe(true)
  })

  it('returns false for a tree (undirected)', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 1, to: 3 }])
    expect(hasCycle(g)).toBe(false)
  })

  it('detects a cycle in directed graph', () => {
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 1 },
    ], true)
    expect(hasCycle(g)).toBe(true)
  })

  it('returns false for a directed DAG', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 2, to: 3 }], true)
    expect(hasCycle(g)).toBe(false)
  })

  it('returns false for empty graph', () => {
    expect(hasCycle(buildGraph([], []))).toBe(false)
  })

  it('self-loop is a cycle (directed)', () => {
    const g = buildGraph([1], [{ from: 1, to: 1 }], true)
    expect(hasCycle(g)).toBe(true)
  })
})

describe('isBipartite', () => {
  it('a path graph is bipartite', () => {
    const g = buildGraph([1, 2, 3, 4], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
    ])
    expect(isBipartite(g)).toBe(true)
  })

  it('a triangle (odd cycle) is not bipartite', () => {
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 1 },
    ])
    expect(isBipartite(g)).toBe(false)
  })

  it('an even cycle is bipartite', () => {
    const g = buildGraph([1, 2, 3, 4], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 1 },
    ])
    expect(isBipartite(g)).toBe(true)
  })

  it('empty graph is bipartite', () => {
    expect(isBipartite(buildGraph([], []))).toBe(true)
  })

  it('single node is bipartite', () => {
    expect(isBipartite(buildGraph([1], []))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Tree utilities
// ---------------------------------------------------------------------------

describe('minimumSpanningTree', () => {
  it('returns n-1 edges for a connected graph', () => {
    const g = buildGraph([1, 2, 3, 4], [
      { from: 1, to: 2, weight: 1 },
      { from: 1, to: 3, weight: 4 },
      { from: 2, to: 3, weight: 2 },
      { from: 2, to: 4, weight: 5 },
      { from: 3, to: 4, weight: 3 },
    ])
    const mst = minimumSpanningTree(g)
    expect(mst).toHaveLength(3)
  })

  it('total MST weight is minimal', () => {
    // MST should pick edges 1-2(1), 2-3(2), 3-4(3) = 6
    const g = buildGraph([1, 2, 3, 4], [
      { from: 1, to: 2, weight: 1 },
      { from: 1, to: 3, weight: 4 },
      { from: 2, to: 3, weight: 2 },
      { from: 2, to: 4, weight: 5 },
      { from: 3, to: 4, weight: 3 },
    ])
    const mst = minimumSpanningTree(g)
    const totalWeight = mst.reduce((acc, e) => acc + (e.weight ?? 1), 0)
    expect(totalWeight).toBe(6)
  })

  it('returns empty for empty graph', () => {
    expect(minimumSpanningTree(buildGraph([], []))).toHaveLength(0)
  })

  it('single node has no MST edges', () => {
    expect(minimumSpanningTree(buildGraph([1], []))).toHaveLength(0)
  })
})

describe('isTree', () => {
  it('a path graph is a tree', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }, { from: 2, to: 3 }])
    expect(isTree(g)).toBe(true)
  })

  it('a star graph is a tree', () => {
    const g = buildGraph([1, 2, 3, 4], [
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 1, to: 4 },
    ])
    expect(isTree(g)).toBe(true)
  })

  it('graph with cycle is not a tree', () => {
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 1 },
    ])
    expect(isTree(g)).toBe(false)
  })

  it('disconnected graph is not a tree', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }])
    expect(isTree(g)).toBe(false)
  })

  it('empty graph is a tree', () => {
    expect(isTree(buildGraph([], []))).toBe(true)
  })

  it('single node is a tree', () => {
    expect(isTree(buildGraph([1], []))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Sports-specific
// ---------------------------------------------------------------------------

describe('scheduleStrength', () => {
  it('computes weighted average opponent rating', () => {
    const schedule: Edge[] = [
      { from: 'teamA', to: 'teamB', weight: 2 },
      { from: 'teamA', to: 'teamC', weight: 1 },
    ]
    const ratings = new Map<NodeId, number>([
      ['teamB', 80],
      ['teamC', 60],
    ])
    const strength = scheduleStrength('teamA', schedule, ratings)
    // weighted: (80*2 + 60*1) / (2+1) = 220/3 ≈ 73.33
    expect(strength).toBeCloseTo(73.33, 1)
  })

  it('returns 0 when ratings map is empty', () => {
    const schedule: Edge[] = [{ from: 1, to: 2 }]
    expect(scheduleStrength(1, schedule, new Map())).toBe(0)
  })

  it('returns 0 when team has no schedule games', () => {
    const schedule: Edge[] = [{ from: 2, to: 3 }]
    const ratings = new Map<NodeId, number>([[3, 90]])
    expect(scheduleStrength(1, schedule, ratings)).toBe(0)
  })

  it('handles edges where team is the "to" side', () => {
    const schedule: Edge[] = [{ from: 'opponent', to: 'myTeam', weight: 1 }]
    const ratings = new Map<NodeId, number>([['opponent', 75]])
    expect(scheduleStrength('myTeam', schedule, ratings)).toBe(75)
  })

  it('defaults weight to 1 when not specified', () => {
    const schedule: Edge[] = [
      { from: 'team', to: 'A' },
      { from: 'team', to: 'B' },
    ]
    const ratings = new Map<NodeId, number>([['A', 60], ['B', 80]])
    expect(scheduleStrength('team', schedule, ratings)).toBe(70)
  })
})

describe('centralityScore', () => {
  it('computes degree centrality correctly', () => {
    // star: center has degree 3; n=4; centrality = 3/3 = 1.0
    const g = buildGraph([1, 2, 3, 4], [
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 1, to: 4 },
    ])
    expect(centralityScore(g, 1)).toBe(1.0)
  })

  it('leaf node has low centrality', () => {
    const g = buildGraph([1, 2, 3, 4], [
      { from: 1, to: 2 },
      { from: 1, to: 3 },
      { from: 1, to: 4 },
    ])
    // leaf node 2 has degree 1 in undirected; centrality = 1/3
    expect(centralityScore(g, 2)).toBeCloseTo(1 / 3, 5)
  })

  it('returns 0 for a single node graph', () => {
    const g = buildGraph([1], [])
    expect(centralityScore(g, 1)).toBe(0)
  })

  it('isolated node has centrality 0', () => {
    const g = buildGraph([1, 2, 3], [{ from: 1, to: 2 }])
    expect(centralityScore(g, 3)).toBe(0)
  })
})

describe('rankByPageRank', () => {
  it('returns a score for each node', () => {
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 1 },
    ])
    const scores = rankByPageRank(g)
    expect(scores.size).toBe(3)
    for (const score of scores.values()) {
      expect(score).toBeGreaterThan(0)
    }
  })

  it('scores sum to approximately 1', () => {
    const g = buildGraph([1, 2, 3, 4], [
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 1 },
    ])
    const scores = rankByPageRank(g)
    const total = [...scores.values()].reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(1, 5)
  })

  it('a more "important" node gets a higher score', () => {
    // 1 and 2 both point to 3; nobody points to 1 or 2 except via 3->1
    const g = buildGraph([1, 2, 3], [
      { from: 1, to: 3 },
      { from: 2, to: 3 },
    ], true)
    const scores = rankByPageRank(g, 0.85, 200)
    // Node 3 should have the highest rank since 2 nodes point to it
    expect(scores.get(3)!).toBeGreaterThan(scores.get(1)!)
    expect(scores.get(3)!).toBeGreaterThan(scores.get(2)!)
  })

  it('returns empty map for empty graph', () => {
    const scores = rankByPageRank(buildGraph([], []))
    expect(scores.size).toBe(0)
  })

  it('single node gets score of 1', () => {
    const g = buildGraph([1], [])
    const scores = rankByPageRank(g)
    expect(scores.get(1)).toBeCloseTo(1, 5)
  })

  it('accepts custom damping factor and iterations', () => {
    const g = buildGraph([1, 2], [{ from: 1, to: 2 }, { from: 2, to: 1 }])
    const scores = rankByPageRank(g, 0.5, 50)
    expect(scores.size).toBe(2)
    const total = [...scores.values()].reduce((a, b) => a + b, 0)
    expect(total).toBeCloseTo(1, 5)
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('empty graph adjacency list is empty', () => {
    expect(adjacencyList(buildGraph([], [])).size).toBe(0)
  })

  it('self-loop appears in adjacency list', () => {
    const g = buildGraph([1], [{ from: 1, to: 1 }])
    const al = adjacencyList(g)
    expect(al.get(1)).toContain(1)
  })

  it('bfs on single node', () => {
    const g = buildGraph([42], [])
    expect(bfs(g, 42)).toEqual([42])
  })

  it('dfs on single node', () => {
    expect(dfs(buildGraph([42], []), 42)).toEqual([42])
  })

  it('connectedComponents: empty graph', () => {
    const { count } = connectedComponents(buildGraph([], []))
    expect(count).toBe(0)
  })

  it('dijkstra on empty graph returns empty map', () => {
    const result = dijkstra(buildGraph([], [], true), 1)
    expect(result.size).toBe(0)
  })

  it('topologicalSort on empty graph returns empty order', () => {
    const { order, hasCycle: cycle } = topologicalSort(buildGraph([], [], true))
    expect(order).toHaveLength(0)
    expect(cycle).toBe(false)
  })

  it('minimumSpanningTree on single node', () => {
    expect(minimumSpanningTree(buildGraph([1], []))).toHaveLength(0)
  })

  it('allPairsShortestPath on single node', () => {
    const result = allPairsShortestPath(buildGraph([1], []))
    expect(result.get('1->1')?.distance).toBe(0)
  })

  it('floydWarshall single node', () => {
    const { dist } = floydWarshall([1], [])
    expect(dist[0][0]).toBe(0)
  })

  it('scheduleStrength with no matching edges returns 0', () => {
    const ratings = new Map<NodeId, number>([['x', 50]])
    expect(scheduleStrength('team', [], ratings)).toBe(0)
  })

  it('string node ids work through the full pipeline', () => {
    const g = buildGraph(['alpha', 'beta', 'gamma'], [
      { from: 'alpha', to: 'beta', weight: 2 },
      { from: 'beta', to: 'gamma', weight: 3 },
    ], true)
    const sp = shortestPath(g, 'alpha', 'gamma')
    expect(sp?.distance).toBe(5)
    expect(sp?.path).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('kahn on single node returns that node', () => {
    const g = buildGraph([1], [], true)
    expect(kahn(g)).toEqual([1])
  })
})
