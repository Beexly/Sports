/**
 * Tests for network-utils.ts
 * Run: cd apps/web && npx vitest run __tests__/network-utils.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  buildGraph,
  addEdge,
  adjacencyMatrix,
  outDegree,
  inDegree,
  density,
  degreeCentrality,
  closenessCentrality,
  betweennessCentrality,
  eigenCentrality,
  pageRank,
  connectedComponents,
  labelPropagation,
  modularityScore,
  stronglyConnectedComponents,
  cosineSimilarityGraph,
  jaccardSimilarity,
  nodeNeighborhood,
  sharedNeighbors,
  strengthOfSchedule,
  dominanceGraph,
  beatChainExists,
  clusteringCoefficient,
  teamSimilarityNetwork,
  shortestPath,
  allShortestPaths,
  networkDiameter,
  averagePathLength,
  smallWorldCoefficient,
  edgeTimeline,
  networkGrowth,
  persistentEdges,
} from '@/lib/utils/network-utils'

// ---------------------------------------------------------------------------
// 1. Graph representation
// ---------------------------------------------------------------------------

describe('buildGraph', () => {
  it('builds graph from edges with default weight=1', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    expect(g.edges[0]?.weight).toBe(1)
  })

  it('uses supplied weight', () => {
    const g = buildGraph([{ from: 'A', to: 'B', weight: 3.5 }])
    expect(g.edges[0]?.weight).toBe(3.5)
  })

  it('collects unique nodes', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ])
    expect(g.nodes).toHaveLength(3)
    expect(g.nodes).toContain('A')
    expect(g.nodes).toContain('B')
    expect(g.nodes).toContain('C')
  })

  it('handles empty edge list', () => {
    const g = buildGraph([])
    expect(g.nodes).toHaveLength(0)
    expect(g.edges).toHaveLength(0)
  })

  it('handles self-loop', () => {
    const g = buildGraph([{ from: 'A', to: 'A' }])
    expect(g.nodes).toContain('A')
    expect(g.edges).toHaveLength(1)
  })
})

describe('addEdge', () => {
  it('returns new graph (immutable)', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    const g2 = addEdge(g, 'B', 'C')
    expect(g.edges).toHaveLength(1)
    expect(g2.edges).toHaveLength(2)
  })

  it('adds new nodes when necessary', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    const g2 = addEdge(g, 'C', 'D')
    expect(g2.nodes).toContain('C')
    expect(g2.nodes).toContain('D')
  })

  it('defaults weight to 1', () => {
    const g = buildGraph([])
    const g2 = addEdge(g, 'X', 'Y')
    expect(g2.edges[0]?.weight).toBe(1)
  })

  it('uses supplied weight', () => {
    const g = buildGraph([])
    const g2 = addEdge(g, 'X', 'Y', 7)
    expect(g2.edges[0]?.weight).toBe(7)
  })

  it('does not duplicate existing nodes', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    const g2 = addEdge(g, 'A', 'C')
    const aCount = g2.nodes.filter((n) => n === 'A').length
    expect(aCount).toBe(1)
  })
})

describe('adjacencyMatrix', () => {
  it('produces correct matrix for simple directed graph', () => {
    const g = buildGraph([{ from: 'A', to: 'B', weight: 2 }])
    const mat = adjacencyMatrix(g)
    // nodes ordered as they appear in g.nodes — A then B
    const aIdx = g.nodes.indexOf('A')
    const bIdx = g.nodes.indexOf('B')
    expect(mat[aIdx]?.[bIdx]).toBe(2)
    expect(mat[bIdx]?.[aIdx]).toBe(0)
  })

  it('returns empty matrix for empty graph', () => {
    const g = buildGraph([])
    expect(adjacencyMatrix(g)).toHaveLength(0)
  })

  it('handles single node', () => {
    const g: import('@/lib/utils/network-utils').Graph = { nodes: ['A'], edges: [] }
    const mat = adjacencyMatrix(g)
    expect(mat).toHaveLength(1)
    expect(mat[0]).toHaveLength(1)
    expect(mat[0]?.[0]).toBe(0)
  })
})

describe('outDegree', () => {
  it('sums weights of outgoing edges', () => {
    const g = buildGraph([
      { from: 'A', to: 'B', weight: 2 },
      { from: 'A', to: 'C', weight: 3 },
    ])
    expect(outDegree(g, 'A')).toBe(5)
  })

  it('returns 0 for node with no outgoing edges', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    expect(outDegree(g, 'B')).toBe(0)
  })

  it('returns 0 for unknown node', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    expect(outDegree(g, 'Z')).toBe(0)
  })
})

describe('inDegree', () => {
  it('sums weights of incoming edges', () => {
    const g = buildGraph([
      { from: 'A', to: 'C', weight: 1 },
      { from: 'B', to: 'C', weight: 4 },
    ])
    expect(inDegree(g, 'C')).toBe(5)
  })

  it('returns 0 for node with no incoming edges', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    expect(inDegree(g, 'A')).toBe(0)
  })
})

describe('density', () => {
  it('computes directed density', () => {
    // n=3, max edges=6, actual=3 => 3/6=0.5
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' },
    ])
    expect(density(g)).toBeCloseTo(0.5)
  })

  it('returns 0 for empty graph', () => {
    expect(density(buildGraph([]))).toBe(0)
  })

  it('returns 0 for single node', () => {
    const g: import('@/lib/utils/network-utils').Graph = { nodes: ['A'], edges: [] }
    expect(density(g)).toBe(0)
  })

  it('returns 1 for complete directed graph n=2 with 2 edges', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'A' },
    ])
    expect(density(g)).toBeCloseTo(1)
  })
})

// ---------------------------------------------------------------------------
// 2. Centrality measures
// ---------------------------------------------------------------------------

describe('degreeCentrality', () => {
  it('returns normalized out-degree', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'A', to: 'C' },
    ])
    // n=3, A has 2 outgoing edges (weight 1 each) but centrality = count/(n-1) is ambiguous
    // Implementation: outDegree(A)/(n-1) = 2/2 = 1
    const dc = degreeCentrality(g)
    expect(dc.get('A')).toBeCloseTo(1)
  })

  it('returns 0 for isolated node in 2-node graph', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    const dc = degreeCentrality(g)
    expect(dc.get('B')).toBeCloseTo(0)
  })

  it('handles empty graph', () => {
    const dc = degreeCentrality(buildGraph([]))
    expect(dc.size).toBe(0)
  })
})

describe('closenessCentrality', () => {
  it('returns positive value for connected node', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ])
    const cc = closenessCentrality(g)
    expect((cc.get('B') ?? 0)).toBeGreaterThan(0)
  })

  it('returns 0 for isolated node', () => {
    const g: import('@/lib/utils/network-utils').Graph = {
      nodes: ['A', 'B', 'C'],
      edges: [{ from: 'A', to: 'B', weight: 1 }],
    }
    const cc = closenessCentrality(g)
    expect(cc.get('C')).toBe(0)
  })

  it('handles single node', () => {
    const g: import('@/lib/utils/network-utils').Graph = { nodes: ['A'], edges: [] }
    const cc = closenessCentrality(g)
    expect(cc.get('A')).toBe(0)
  })

  it('handles empty graph', () => {
    const cc = closenessCentrality(buildGraph([]))
    expect(cc.size).toBe(0)
  })
})

describe('betweennessCentrality', () => {
  it('hub node has highest betweenness', () => {
    // A-B-C chain: B is on all A<->C paths
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'A' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'B' },
    ])
    const bc = betweennessCentrality(g)
    expect((bc.get('B') ?? 0)).toBeGreaterThan((bc.get('A') ?? 0))
    expect((bc.get('B') ?? 0)).toBeGreaterThan((bc.get('C') ?? 0))
  })

  it('returns all zeros for 2-node graph', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    const bc = betweennessCentrality(g)
    expect(bc.get('A')).toBe(0)
    expect(bc.get('B')).toBe(0)
  })

  it('returns all zeros for empty graph', () => {
    const bc = betweennessCentrality(buildGraph([]))
    expect(bc.size).toBe(0)
  })
})

describe('eigenCentrality', () => {
  it('all values between 0 and 1', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' },
    ])
    const ec = eigenCentrality(g)
    for (const v of ec.values()) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('max value is 1 (normalized) for cyclic graph', () => {
    // Use a cycle so all nodes receive in-flow and converge to non-zero values
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' },
    ])
    const ec = eigenCentrality(g)
    const maxVal = Math.max(...ec.values())
    expect(maxVal).toBeCloseTo(1)
  })

  it('handles empty graph', () => {
    const ec = eigenCentrality(buildGraph([]))
    expect(ec.size).toBe(0)
  })
})

describe('pageRank', () => {
  it('sums to 1 for simple graph', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' },
    ])
    const pr = pageRank(g)
    const total = [...pr.values()].reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(1)
  })

  it('sums to 1 for disconnected graph', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'D' },
    ])
    const pr = pageRank(g)
    const total = [...pr.values()].reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(1)
  })

  it('returns empty map for empty graph', () => {
    const pr = pageRank(buildGraph([]))
    expect(pr.size).toBe(0)
  })

  it('well-linked node has higher rank', () => {
    // B is pointed to by A and C
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'B' },
      { from: 'B', to: 'D' },
    ])
    const pr = pageRank(g)
    expect((pr.get('B') ?? 0)).toBeGreaterThan((pr.get('A') ?? 0))
    expect((pr.get('B') ?? 0)).toBeGreaterThan((pr.get('C') ?? 0))
  })

  it('uses custom damping factor', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }, { from: 'B', to: 'A' }])
    const pr = pageRank(g, 0.5, 30)
    const total = [...pr.values()].reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(1)
  })
})

// ---------------------------------------------------------------------------
// 3. Community detection
// ---------------------------------------------------------------------------

describe('connectedComponents', () => {
  it('finds single component in connected graph', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ])
    const comps = connectedComponents(g)
    expect(comps).toHaveLength(1)
    expect(comps[0]).toHaveLength(3)
  })

  it('finds two disconnected components', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'D' },
    ])
    const comps = connectedComponents(g)
    expect(comps).toHaveLength(2)
  })

  it('single node forms its own component', () => {
    const g: import('@/lib/utils/network-utils').Graph = { nodes: ['X'], edges: [] }
    const comps = connectedComponents(g)
    expect(comps).toHaveLength(1)
    expect(comps[0]).toContain('X')
  })

  it('empty graph returns no components', () => {
    const comps = connectedComponents(buildGraph([]))
    expect(comps).toHaveLength(0)
  })

  it('ignores edge direction (weakly connected)', () => {
    // A->B  C->B means A,B,C are weakly connected
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'B' },
    ])
    const comps = connectedComponents(g)
    expect(comps).toHaveLength(1)
    expect(comps[0]).toHaveLength(3)
  })
})

describe('labelPropagation', () => {
  it('returns a label for every node', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ])
    const labels = labelPropagation(g)
    expect(labels.size).toBe(3)
  })

  it('connected nodes tend to share a community', () => {
    // Two tight cliques
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'A' },
      { from: 'C', to: 'D' },
      { from: 'D', to: 'C' },
    ])
    const labels = labelPropagation(g, 20)
    expect(labels.get('A')).toBe(labels.get('B'))
    expect(labels.get('C')).toBe(labels.get('D'))
  })

  it('empty graph returns empty map', () => {
    expect(labelPropagation(buildGraph([]))).toEqual(new Map())
  })
})

describe('modularityScore', () => {
  it('returns 0 for graph with no edges', () => {
    const g: import('@/lib/utils/network-utils').Graph = { nodes: ['A', 'B'], edges: [] }
    const communities = new Map([['A', 0], ['B', 1]])
    expect(modularityScore(g, communities)).toBe(0)
  })

  it('returns a number', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }, { from: 'C', to: 'D' }])
    const communities = new Map([['A', 0], ['B', 0], ['C', 1], ['D', 1]])
    const q = modularityScore(g, communities)
    expect(typeof q).toBe('number')
  })
})

describe('stronglyConnectedComponents', () => {
  it('cycle gives one SCC', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' },
    ])
    const sccs = stronglyConnectedComponents(g)
    expect(sccs).toHaveLength(1)
    expect(sccs[0]).toHaveLength(3)
  })

  it('linear chain gives three SCCs (each node)', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ])
    const sccs = stronglyConnectedComponents(g)
    expect(sccs).toHaveLength(3)
  })

  it('empty graph returns no SCCs', () => {
    expect(stronglyConnectedComponents(buildGraph([]))).toHaveLength(0)
  })

  it('two separate cycles give two SCCs', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'A' },
      { from: 'C', to: 'D' },
      { from: 'D', to: 'C' },
    ])
    const sccs = stronglyConnectedComponents(g)
    expect(sccs).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// 4. Similarity and clustering
// ---------------------------------------------------------------------------

describe('cosineSimilarityGraph', () => {
  it('identical vectors get similarity 1 and are connected', () => {
    const vectors = new Map([
      ['A', [1, 0, 1]],
      ['B', [1, 0, 1]],
    ])
    const g = cosineSimilarityGraph(vectors)
    const edge = g.edges.find((e) => e.from === 'A' && e.to === 'B')
    expect(edge?.weight).toBeCloseTo(1)
  })

  it('orthogonal vectors get no edge (similarity=0)', () => {
    const vectors = new Map([
      ['A', [1, 0]],
      ['B', [0, 1]],
    ])
    const g = cosineSimilarityGraph(vectors)
    expect(g.edges.filter((e) => (e.from === 'A' && e.to === 'B') || (e.from === 'B' && e.to === 'A'))).toHaveLength(0)
  })

  it('only includes edges where similarity > 0.5', () => {
    const vectors = new Map([
      ['A', [1, 0, 0]],
      ['B', [0, 1, 0]],
      ['C', [0, 0, 1]],
    ])
    const g = cosineSimilarityGraph(vectors)
    expect(g.edges).toHaveLength(0)
  })

  it('all keys appear as nodes', () => {
    const vectors = new Map([
      ['A', [1, 0]],
      ['B', [0, 1]],
      ['C', [1, 0]],
    ])
    const g = cosineSimilarityGraph(vectors)
    expect(g.nodes).toContain('A')
    expect(g.nodes).toContain('B')
    expect(g.nodes).toContain('C')
  })

  it('empty map returns empty graph', () => {
    const g = cosineSimilarityGraph(new Map())
    expect(g.nodes).toHaveLength(0)
    expect(g.edges).toHaveLength(0)
  })
})

describe('jaccardSimilarity', () => {
  it('returns 1 for identical sets', () => {
    const s = new Set(['a', 'b', 'c'])
    expect(jaccardSimilarity(s, s)).toBe(1)
  })

  it('returns 0 for disjoint sets', () => {
    expect(jaccardSimilarity(new Set(['a']), new Set(['b']))).toBe(0)
  })

  it('returns 0 for both empty sets', () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(0)
  })

  it('returns 0.5 for half-overlap', () => {
    const a = new Set(['x', 'y'])
    const b = new Set(['y', 'z'])
    expect(jaccardSimilarity(a, b)).toBeCloseTo(1 / 3)
  })

  it('handles one empty set', () => {
    expect(jaccardSimilarity(new Set(['a']), new Set())).toBe(0)
  })
})

describe('nodeNeighborhood', () => {
  it('returns direct neighbors at depth 1', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'A', to: 'C' },
    ])
    const nb = nodeNeighborhood(g, 'A', 1)
    expect(nb).toContain('B')
    expect(nb).toContain('C')
    expect(nb).not.toContain('A')
  })

  it('returns extended neighborhood at depth 2', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ])
    const nb = nodeNeighborhood(g, 'A', 2)
    expect(nb).toContain('B')
    expect(nb).toContain('C')
  })

  it('excludes start node', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    expect(nodeNeighborhood(g, 'A', 1)).not.toContain('A')
  })

  it('returns empty for isolated node', () => {
    const g: import('@/lib/utils/network-utils').Graph = { nodes: ['A'], edges: [] }
    expect(nodeNeighborhood(g, 'A', 1)).toHaveLength(0)
  })

  it('default depth is 1', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ])
    const nb = nodeNeighborhood(g, 'A')
    expect(nb).toContain('B')
    expect(nb).not.toContain('C')
  })
})

describe('sharedNeighbors', () => {
  it('finds common neighbor', () => {
    // A->B, C->B means B is shared neighbor of A and C
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'B' },
    ])
    const shared = sharedNeighbors(g, 'A', 'C')
    expect(shared).toContain('B')
  })

  it('returns empty when no common neighbors', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'D' },
    ])
    const shared = sharedNeighbors(g, 'A', 'C')
    expect(shared).toHaveLength(0)
  })

  it('does not include the query nodes themselves', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'A' },
    ])
    const shared = sharedNeighbors(g, 'A', 'B')
    expect(shared).not.toContain('A')
    expect(shared).not.toContain('B')
  })
})

// ---------------------------------------------------------------------------
// 5. Sports network applications
// ---------------------------------------------------------------------------

describe('strengthOfSchedule', () => {
  it('computes average win rate of opponents', () => {
    const winRates = new Map([
      ['TeamB', 0.6],
      ['TeamC', 0.4],
    ])
    const sos = strengthOfSchedule('TeamA', ['TeamB', 'TeamC'], winRates)
    expect(sos).toBeCloseTo(0.5)
  })

  it('returns 0 for empty opponents', () => {
    expect(strengthOfSchedule('A', [], new Map())).toBe(0)
  })

  it('ignores unknown opponents', () => {
    const winRates = new Map([['TeamB', 0.6]])
    const sos = strengthOfSchedule('TeamA', ['TeamB', 'UnknownTeam'], winRates)
    expect(sos).toBeCloseTo(0.6)
  })

  it('returns 0 if no opponents have known win rates', () => {
    const sos = strengthOfSchedule('A', ['B', 'C'], new Map())
    expect(sos).toBe(0)
  })
})

describe('dominanceGraph', () => {
  it('creates directed edge from winner to loser', () => {
    const g = dominanceGraph([{ winner: 'A', loser: 'B', margin: 10 }])
    const edge = g.edges.find((e) => e.from === 'A' && e.to === 'B')
    expect(edge?.weight).toBe(10)
  })

  it('sums margins for repeated matchups', () => {
    const g = dominanceGraph([
      { winner: 'A', loser: 'B', margin: 5 },
      { winner: 'A', loser: 'B', margin: 3 },
    ])
    const edge = g.edges.find((e) => e.from === 'A' && e.to === 'B')
    expect(edge?.weight).toBe(8)
  })

  it('handles empty results', () => {
    const g = dominanceGraph([])
    expect(g.nodes).toHaveLength(0)
    expect(g.edges).toHaveLength(0)
  })

  it('includes all teams as nodes', () => {
    const g = dominanceGraph([
      { winner: 'A', loser: 'B', margin: 1 },
      { winner: 'C', loser: 'D', margin: 2 },
    ])
    expect(g.nodes).toContain('A')
    expect(g.nodes).toContain('B')
    expect(g.nodes).toContain('C')
    expect(g.nodes).toContain('D')
  })
})

describe('beatChainExists', () => {
  it('returns true for direct win', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    expect(beatChainExists(g, 'A', 'B')).toBe(true)
  })

  it('returns true for transitive win (A beat B, B beat C)', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ])
    expect(beatChainExists(g, 'A', 'C')).toBe(true)
  })

  it('returns false when no chain exists', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'D' },
    ])
    expect(beatChainExists(g, 'A', 'C')).toBe(false)
  })

  it('returns false for unknown nodes', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    expect(beatChainExists(g, 'A', 'Z')).toBe(false)
    expect(beatChainExists(g, 'Z', 'B')).toBe(false)
  })

  it('returns false for self-chain', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    expect(beatChainExists(g, 'A', 'A')).toBe(false)
  })

  it('does not follow reverse edges', () => {
    const g = buildGraph([{ from: 'B', to: 'A' }])
    expect(beatChainExists(g, 'A', 'B')).toBe(false)
  })
})

describe('clusteringCoefficient', () => {
  it('returns 1 for a triangle', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' },
      { from: 'B', to: 'A' },
      { from: 'A', to: 'C' },
      { from: 'C', to: 'B' },
    ])
    expect(clusteringCoefficient(g, 'A')).toBeCloseTo(1)
  })

  it('returns 0 for node with degree < 2', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    expect(clusteringCoefficient(g, 'A')).toBe(0)
  })

  it('returns 0 for isolated node', () => {
    const g: import('@/lib/utils/network-utils').Graph = { nodes: ['A', 'B', 'C'], edges: [] }
    expect(clusteringCoefficient(g, 'A')).toBe(0)
  })

  it('returns between 0 and 1 for partial triangle', () => {
    // A connects to B and C, but B and C are NOT connected
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'A', to: 'C' },
      { from: 'B', to: 'A' },
      { from: 'C', to: 'A' },
    ])
    const cc = clusteringCoefficient(g, 'A')
    expect(cc).toBeGreaterThanOrEqual(0)
    expect(cc).toBeLessThanOrEqual(1)
  })
})

describe('teamSimilarityNetwork', () => {
  it('returns sorted descending by similarity', () => {
    const teams = new Map([
      ['A', [1, 0, 0]],
      ['B', [1, 0.1, 0]],
      ['C', [0, 0, 1]],
    ])
    const result = teamSimilarityNetwork(teams)
    for (let i = 1; i < result.length; i++) {
      expect((result[i - 1]?.similarity ?? 0)).toBeGreaterThanOrEqual(result[i]?.similarity ?? 0)
    }
  })

  it('all pairs are included', () => {
    const teams = new Map([
      ['A', [1, 0]],
      ['B', [0, 1]],
      ['C', [1, 1]],
    ])
    const result = teamSimilarityNetwork(teams)
    expect(result).toHaveLength(3) // 3 pairs from 3 teams
  })

  it('identical vectors produce similarity 1', () => {
    const teams = new Map([
      ['X', [3, 4]],
      ['Y', [3, 4]],
    ])
    const result = teamSimilarityNetwork(teams)
    expect(result[0]?.similarity).toBeCloseTo(1)
  })

  it('empty map returns empty array', () => {
    expect(teamSimilarityNetwork(new Map())).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// 6. Flow and path analysis
// ---------------------------------------------------------------------------

describe('shortestPath', () => {
  it('finds path in simple chain', () => {
    const g = buildGraph([
      { from: 'A', to: 'B', weight: 1 },
      { from: 'B', to: 'C', weight: 1 },
    ])
    const result = shortestPath(g, 'A', 'C')
    expect(result.distance).toBeCloseTo(2)
    expect(result.path).toContain('A')
    expect(result.path).toContain('B')
    expect(result.path).toContain('C')
  })

  it('prefers lower-weight path', () => {
    const g = buildGraph([
      { from: 'A', to: 'B', weight: 10 },
      { from: 'A', to: 'C', weight: 1 },
      { from: 'C', to: 'B', weight: 1 },
    ])
    const result = shortestPath(g, 'A', 'B')
    expect(result.distance).toBeCloseTo(2)
    expect(result.path).toContain('C')
  })

  it('returns Infinity distance for unreachable pair', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'D' },
    ])
    const result = shortestPath(g, 'A', 'C')
    expect(result.distance).toBe(Infinity)
    expect(result.path).toHaveLength(0)
  })

  it('returns self path with distance 0', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    const result = shortestPath(g, 'A', 'A')
    expect(result.distance).toBe(0)
    expect(result.path).toEqual(['A'])
  })

  it('returns Infinity for unknown node', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    const result = shortestPath(g, 'A', 'Z')
    expect(result.distance).toBe(Infinity)
  })
})

describe('allShortestPaths', () => {
  it('includes Infinity for unreachable pair', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'D' },
    ])
    const all = allShortestPaths(g)
    expect(all.get('A')?.get('C')).toBe(Infinity)
  })

  it('self-distance is 0', () => {
    const g = buildGraph([{ from: 'A', to: 'B' }])
    const all = allShortestPaths(g)
    expect(all.get('A')?.get('A')).toBe(0)
  })

  it('returns correct distances for chain', () => {
    const g = buildGraph([
      { from: 'A', to: 'B', weight: 2 },
      { from: 'B', to: 'C', weight: 3 },
    ])
    const all = allShortestPaths(g)
    expect(all.get('A')?.get('C')).toBeCloseTo(5)
  })
})

describe('networkDiameter', () => {
  it('returns max finite shortest path', () => {
    const g = buildGraph([
      { from: 'A', to: 'B', weight: 1 },
      { from: 'B', to: 'C', weight: 1 },
    ])
    expect(networkDiameter(g)).toBeCloseTo(2)
  })

  it('returns 0 for empty graph', () => {
    expect(networkDiameter(buildGraph([]))).toBe(0)
  })

  it('returns 0 for single node', () => {
    const g: import('@/lib/utils/network-utils').Graph = { nodes: ['A'], edges: [] }
    expect(networkDiameter(g)).toBe(0)
  })

  it('ignores Infinity paths', () => {
    const g = buildGraph([
      { from: 'A', to: 'B', weight: 1 },
      { from: 'C', to: 'D', weight: 1 },
    ])
    expect(networkDiameter(g)).toBe(1)
  })
})

describe('averagePathLength', () => {
  it('computes mean path length for chain', () => {
    const g = buildGraph([
      { from: 'A', to: 'B', weight: 1 },
      { from: 'B', to: 'C', weight: 1 },
    ])
    // A->B=1, A->C=2, B->C=1 (only directed)
    const apl = averagePathLength(g)
    expect(apl).toBeGreaterThan(0)
  })

  it('returns 0 for empty graph', () => {
    expect(averagePathLength(buildGraph([]))).toBe(0)
  })

  it('excludes self-distances', () => {
    const g = buildGraph([{ from: 'A', to: 'B', weight: 1 }])
    // Only A->B counts (B->A is Infinity and excluded)
    expect(averagePathLength(g)).toBeCloseTo(1)
  })
})

describe('smallWorldCoefficient', () => {
  it('returns a number >= 0', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
      { from: 'C', to: 'A' },
    ])
    expect(smallWorldCoefficient(g)).toBeGreaterThanOrEqual(0)
  })

  it('returns 0 for empty graph', () => {
    expect(smallWorldCoefficient(buildGraph([]))).toBe(0)
  })

  it('returns 0 when average path length is 0', () => {
    const g: import('@/lib/utils/network-utils').Graph = { nodes: ['A'], edges: [] }
    expect(smallWorldCoefficient(g)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 7. Temporal and dynamic networks
// ---------------------------------------------------------------------------

describe('edgeTimeline', () => {
  const events = [
    { from: 'A', to: 'B', timestampMs: 100, weight: 1 },
    { from: 'C', to: 'D', timestampMs: 200, weight: 1 },
    { from: 'E', to: 'F', timestampMs: 350, weight: 1 },
  ]

  it('splits events into time windows', () => {
    const snapshots = edgeTimeline(events, 150)
    // window 1: [100,250) => events at 100,200; window 2: [250,400) => event at 350
    expect(snapshots).toHaveLength(2)
    expect(snapshots[0]?.edges).toHaveLength(2)
    expect(snapshots[1]?.edges).toHaveLength(1)
  })

  it('returns empty array for empty events', () => {
    expect(edgeTimeline([], 1000)).toHaveLength(0)
  })

  it('returns empty for windowMs <= 0', () => {
    expect(edgeTimeline(events, 0)).toHaveLength(0)
  })

  it('single event produces one snapshot', () => {
    const snapshots = edgeTimeline(
      [{ from: 'A', to: 'B', timestampMs: 0 }],
      1000,
    )
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]?.edges).toHaveLength(1)
  })

  it('respects weight field', () => {
    const snapshots = edgeTimeline(
      [{ from: 'A', to: 'B', timestampMs: 0, weight: 5 }],
      1000,
    )
    expect(snapshots[0]?.edges[0]?.weight).toBe(5)
  })
})

describe('networkGrowth', () => {
  it('returns metrics for each snapshot', () => {
    const s1 = buildGraph([{ from: 'A', to: 'B' }])
    const s2 = buildGraph([{ from: 'A', to: 'B' }, { from: 'B', to: 'C' }])
    const growth = networkGrowth([s1, s2])
    expect(growth).toHaveLength(2)
    expect(growth[0]?.nodes).toBe(2)
    expect(growth[0]?.edges).toBe(1)
    expect(growth[1]?.edges).toBe(2)
  })

  it('returns empty for no snapshots', () => {
    expect(networkGrowth([])).toHaveLength(0)
  })

  it('density is computed per snapshot', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'A' },
    ])
    const growth = networkGrowth([g])
    expect(growth[0]?.density).toBeCloseTo(1)
  })
})

describe('persistentEdges', () => {
  it('returns edges present in all snapshots', () => {
    const s1 = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'B', to: 'C' },
    ])
    const s2 = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'D' },
    ])
    const persistent = persistentEdges([s1, s2])
    expect(persistent).toHaveLength(1)
    expect(persistent[0]?.from).toBe('A')
    expect(persistent[0]?.to).toBe('B')
  })

  it('returns empty for no snapshots', () => {
    expect(persistentEdges([])).toHaveLength(0)
  })

  it('returns all edges if only one snapshot', () => {
    const g = buildGraph([
      { from: 'A', to: 'B' },
      { from: 'C', to: 'D' },
    ])
    const persistent = persistentEdges([g])
    expect(persistent).toHaveLength(2)
  })

  it('returns empty if no edge is in all snapshots', () => {
    const s1 = buildGraph([{ from: 'A', to: 'B' }])
    const s2 = buildGraph([{ from: 'C', to: 'D' }])
    const persistent = persistentEdges([s1, s2])
    expect(persistent).toHaveLength(0)
  })

  it('handles single snapshot with no edges', () => {
    const g: import('@/lib/utils/network-utils').Graph = { nodes: ['A'], edges: [] }
    expect(persistentEdges([g])).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Additional edge cases and integration tests
// ---------------------------------------------------------------------------

describe('integration: dominanceGraph + beatChainExists', () => {
  it('transitively identifies A->B->C beat chain', () => {
    const g = dominanceGraph([
      { winner: 'A', loser: 'B', margin: 7 },
      { winner: 'B', loser: 'C', margin: 3 },
    ])
    expect(beatChainExists(g, 'A', 'C')).toBe(true)
    expect(beatChainExists(g, 'C', 'A')).toBe(false)
  })
})

describe('integration: pageRank on dominance graph', () => {
  it('sum equals 1 and values are positive', () => {
    const g = dominanceGraph([
      { winner: 'A', loser: 'B', margin: 10 },
      { winner: 'B', loser: 'C', margin: 5 },
      { winner: 'C', loser: 'A', margin: 3 },
    ])
    const pr = pageRank(g)
    const total = [...pr.values()].reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(1)
    for (const v of pr.values()) {
      expect(v).toBeGreaterThan(0)
    }
  })
})

describe('integration: edgeTimeline + networkGrowth', () => {
  it('growth metrics increase as events accumulate', () => {
    const events = [
      { from: 'A', to: 'B', timestampMs: 0 },
      { from: 'A', to: 'B', timestampMs: 0 },
      { from: 'C', to: 'D', timestampMs: 1000 },
      { from: 'E', to: 'F', timestampMs: 1000 },
    ]
    const snapshots = edgeTimeline(events, 1000)
    const growth = networkGrowth(snapshots)
    expect(growth).toHaveLength(2)
    // Second window has more new node types
    expect((growth[1]?.nodes ?? 0)).toBeGreaterThanOrEqual(2)
  })
})

describe('jaccardSimilarity detailed', () => {
  it('one element in common out of three total = 1/3', () => {
    const a = new Set(['a', 'b'])
    const b = new Set(['b', 'c'])
    expect(jaccardSimilarity(a, b)).toBeCloseTo(1 / 3)
  })

  it('superset relationship', () => {
    const a = new Set(['a', 'b', 'c'])
    const b = new Set(['a'])
    expect(jaccardSimilarity(a, b)).toBeCloseTo(1 / 3)
  })
})

describe('strengthOfSchedule edge cases', () => {
  it('single opponent', () => {
    const wr = new Map([['B', 0.75]])
    expect(strengthOfSchedule('A', ['B'], wr)).toBeCloseTo(0.75)
  })

  it('all opponents unknown', () => {
    expect(strengthOfSchedule('A', ['X', 'Y'], new Map())).toBe(0)
  })
})

describe('shortestPath weighted', () => {
  it('handles weighted triangle', () => {
    const g = buildGraph([
      { from: 'A', to: 'B', weight: 5 },
      { from: 'A', to: 'C', weight: 2 },
      { from: 'C', to: 'B', weight: 1 },
    ])
    const r = shortestPath(g, 'A', 'B')
    expect(r.distance).toBeCloseTo(3) // A->C->B = 2+1
    expect(r.path).toEqual(['A', 'C', 'B'])
  })
})

describe('connectedComponents with isolated nodes', () => {
  it('isolated nodes each form their own component', () => {
    const g: import('@/lib/utils/network-utils').Graph = {
      nodes: ['A', 'B', 'C'],
      edges: [],
    }
    const comps = connectedComponents(g)
    expect(comps).toHaveLength(3)
  })
})

describe('networkDiameter for weighted graph', () => {
  it('respects weighted distances', () => {
    const g = buildGraph([
      { from: 'A', to: 'B', weight: 3 },
      { from: 'B', to: 'C', weight: 4 },
    ])
    expect(networkDiameter(g)).toBeCloseTo(7)
  })
})
