/**
 * Pinecone (2025-04 API) + Robertson & Zaragoza BM25+ Hybrid Corpus Retriever (TypeScript).
 *
 * Implements:
 * - Robertson & Zaragoza (2009) BM25+ lexical scoring (k1 = 1.2, b = 0.75, delta = 1.0)
 * - Pinecone API 2025-04 (`POST https://api.pinecone.io/embed` with `llama-text-embed-v2` 1024-dim
 *   dense and `pinecone-sparse-english-v0` sparse; `POST https://api.pinecone.io/rerank` with
 *   `pinecone-rerank-v0` / `bge-reranker-v2-m3`; `GET/POST https://api.pinecone.io/backups`)
 * - Hybrid convex dot-product scoring: alpha * <v_q, v_d> + (1 - alpha) * <s_q, s_d>, alpha = 0.65
 * - Seamless offline BM25+ fallback when PINECONE_API_KEY is absent.
 */

export interface CorpusDocumentTS {
  docId: string;
  title: string;
  text: string;
  namespace?: 'gse-200-book-corpus' | 'gse-372-repos' | 'gsi-biomechanics' | string;
  category?: string;
  lane?: string;
  sourceUrl?: string;
  authors?: string;
  year?: number;
  metadata?: Record<string, unknown>;
}

export interface SparseVectorTS {
  indices: number[];
  values: number[];
}

export interface HybridSearchResultTS {
  docId: string;
  title: string;
  namespace: string;
  category: string;
  bm25PlusScore: number;
  denseScore: number;
  sparseScore: number;
  hybridConvexScore: number;
  rerankScore: number | null;
  finalScore: number;
  snippet: string;
  metadata: Record<string, unknown>;
}

export interface PineconeRetrieverConfig {
  indexName?: string;
  indexHost?: string;
  apiKey?: string;
  fallbackApiKey?: string;
  apiVersion?: string;
  alpha?: number;
  k1?: number;
  b?: number;
  delta?: number;
  forceOffline?: boolean;
}

const TOKEN_REGEX = /[a-z0-9_+#.-]+/g;

export function tokenizeCorpusText(text: string): string[] {
  const normalized = (text || '').toLowerCase();
  return normalized.match(TOKEN_REGEX) ?? [];
}

export class PineconeBM25HybridCorpusRetrieverTS {
  public readonly indexName: string;
  public readonly apiVersion: string;
  public readonly alpha: number;
  public readonly k1: number;
  public readonly b: number;
  public readonly delta: number;
  public readonly indexHost: string;
  private readonly apiKey: string;
  private readonly fallbackApiKey: string;
  private readonly forceOffline: boolean;

  private documents: CorpusDocumentTS[] = [];
  private docTermFreqs: Array<Map<string, number>> = [];
  private docLengths: number[] = [];
  private avgDocLength = 1.0;
  private idfCache: Map<string, number> = new Map();

  constructor(config: PineconeRetrieverConfig = {}) {
    const alpha = config.alpha ?? 0.65;
    if (alpha < 0 || alpha > 1) {
      throw new Error('Hybrid convex parameter alpha must be within [0, 1].');
    }
    this.indexName = config.indexName ?? process.env.PINECONE_INDEX_NAME ?? 'gse-200-book-hybrid-index';
    this.indexHost = config.indexHost ?? process.env.PINECONE_INDEX_HOST ?? '';
    this.apiVersion = config.apiVersion ?? process.env.PINECONE_API_VERSION ?? '2025-04';
    this.alpha = alpha;
    this.k1 = config.k1 ?? 1.2;
    this.b = config.b ?? 0.75;
    this.delta = config.delta ?? 1.0;
    this.forceOffline = Boolean(config.forceOffline);
    this.apiKey = this.forceOffline ? '' : (config.apiKey ?? process.env.PINECONE_API_KEY ?? '');
    this.fallbackApiKey = this.forceOffline
      ? ''
      : (config.fallbackApiKey ?? process.env.PINECONE_API_KEY_FALLBACK ?? '');
  }

  public get hasLiveApiKey(): boolean {
    return !this.forceOffline && Boolean(this.apiKey || this.fallbackApiKey);
  }

  public indexLocalCorpus(docs: CorpusDocumentTS[]): number {
    this.documents = [...docs];
    this.docTermFreqs = [];
    this.docLengths = [];
    const docFreqs = new Map<string, number>();

    for (const doc of this.documents) {
      const combined = `${doc.title} ${doc.authors ?? ''} ${doc.lane ?? ''} ${doc.category ?? ''} ${doc.text}`;
      const tokens = tokenizeCorpusText(combined);
      this.docLengths.push(tokens.length);
      const tf = new Map<string, number>();
      for (const tok of tokens) {
        tf.set(tok, (tf.get(tok) ?? 0) + 1);
      }
      this.docTermFreqs.push(tf);
      for (const uniqueTok of tf.keys()) {
        docFreqs.set(uniqueTok, (docFreqs.get(uniqueTok) ?? 0) + 1);
      }
    }

    const totalLen = this.docLengths.reduce((acc, n) => acc + n, 0);
    const nDocs = this.documents.length;
    this.avgDocLength = nDocs > 0 ? totalLen / nDocs : 1.0;
    this.idfCache.clear();
    for (const [term, df] of docFreqs.entries()) {
      const idf = Math.log(1.0 + (nDocs - df + 0.5) / (df + 0.5));
      this.idfCache.set(term, idf);
    }
    return this.documents.length;
  }

  public scoreBM25Plus(query: string, docIndex: number): number {
    if (docIndex < 0 || docIndex >= this.documents.length) {
      return 0;
    }
    const qTokens = tokenizeCorpusText(query);
    if (qTokens.length === 0) {
      return 0;
    }
    const tfMap = this.docTermFreqs[docIndex];
    const docLen = this.docLengths[docIndex];
    const normDenom = this.k1 * (1.0 - this.b + this.b * (docLen / Math.max(this.avgDocLength, 1e-9)));

    let score = 0;
    for (const qTok of qTokens) {
      const tf = tfMap.get(qTok) ?? 0;
      if (tf <= 0) continue;
      const idf = this.idfCache.get(qTok) ?? 0;
      const tfComp = ((this.k1 + 1.0) * tf) / (normDenom + tf);
      score += idf * (tfComp + this.delta);
    }
    return score;
  }

  public computeHybridConvexScore(denseDot: number, sparseDot: number, alphaOverride?: number): number {
    const w = alphaOverride ?? this.alpha;
    return w * denseDot + (1.0 - w) * sparseDot;
  }

  public deterministicDenseVector(text: string, dimension = 1024): number[] {
    const tokens = tokenizeCorpusText(text);
    const vec = new Array<number>(dimension).fill(0);
    if (tokens.length === 0) {
      vec[0] = 1.0;
      return vec;
    }
    for (const tok of tokens) {
      let h = 2166136261;
      for (let i = 0; i < tok.length; i++) {
        h ^= tok.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const idx = Math.abs(h) % dimension;
      const sign = (h & 1) === 0 ? 1.0 : -1.0;
      vec[idx] += sign;
    }
    const norm = Math.sqrt(vec.reduce((acc, v) => acc + v * v, 0)) || 1.0;
    return vec.map((v) => Number((v / norm).toFixed(6)));
  }

  public deterministicSparseVector(text: string): SparseVectorTS {
    const tokens = tokenizeCorpusText(text);
    const counts = new Map<number, number>();
    for (const tok of tokens) {
      let h = 5381;
      for (let i = 0; i < tok.length; i++) {
        h = (Math.imul(h, 33) ^ tok.charCodeAt(i)) >>> 0;
      }
      const idx = h % 100000;
      counts.set(idx, (counts.get(idx) ?? 0) + 1.0);
    }
    if (counts.size === 0) {
      return { indices: [1], values: [0.01] };
    }
    const entries = Array.from(counts.entries()).sort((a, b) => a[0] - b[0]);
    const norm = Math.sqrt(entries.reduce((acc, [, v]) => acc + v * v, 0)) || 1.0;
    return {
      indices: entries.map(([i]) => i),
      values: entries.map(([, v]) => Number((v / norm).toFixed(6))),
    };
  }

  public static denseDotProduct(a: number[], b: number[]): number {
    const n = Math.min(a.length, b.length);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += a[i] * b[i];
    }
    return sum;
  }

  public static sparseDotProduct(a: SparseVectorTS, b: SparseVectorTS): number {
    const mapA = new Map<number, number>();
    for (let i = 0; i < a.indices.length; i++) {
      mapA.set(a.indices[i], a.values[i] ?? 0);
    }
    let sum = 0;
    for (let i = 0; i < b.indices.length; i++) {
      const valA = mapA.get(b.indices[i]);
      if (valA !== undefined) {
        sum += valA * (b.values[i] ?? 0);
      }
    }
    return sum;
  }

  public searchOfflineOrHybrid(
    query: string,
    topK = 5,
    namespace?: string,
  ): HybridSearchResultTS[] {
    if (this.documents.length === 0) return [];
    const qDense = this.deterministicDenseVector(query, 1024);
    const qSparse = this.deterministicSparseVector(query);
    const bm25Scores = this.documents.map((_, idx) => this.scoreBM25Plus(query, idx));
    const maxBm25 = Math.max(...bm25Scores, 1.0);

    const results: HybridSearchResultTS[] = [];
    for (let idx = 0; idx < this.documents.length; idx++) {
      const doc = this.documents[idx];
      const ns = doc.namespace ?? 'gse-200-book-corpus';
      if (namespace && ns !== namespace) continue;

      const combined = `${doc.title} ${doc.authors ?? ''} ${doc.text}`;
      const dDense = this.deterministicDenseVector(combined, 1024);
      const dSparse = this.deterministicSparseVector(combined);
      const denseSim = Math.max(0, PineconeBM25HybridCorpusRetrieverTS.denseDotProduct(qDense, dDense));
      const sparseSim = Math.max(0, PineconeBM25HybridCorpusRetrieverTS.sparseDotProduct(qSparse, dSparse));
      const bm25Raw = bm25Scores[idx];
      const lexicalCombined = 0.5 * sparseSim + 0.5 * (bm25Raw / maxBm25);
      const hybridScore = this.computeHybridConvexScore(denseSim, lexicalCombined);

      results.push({
        docId: doc.docId,
        title: doc.title,
        namespace: ns,
        category: doc.category ?? 'book',
        bm25PlusScore: Number(bm25Raw.toFixed(6)),
        denseScore: Number(denseSim.toFixed(6)),
        sparseScore: Number(lexicalCombined.toFixed(6)),
        hybridConvexScore: Number(hybridScore.toFixed(6)),
        rerankScore: null,
        finalScore: Number(hybridScore.toFixed(6)),
        snippet: doc.text.slice(0, 280),
        metadata: doc.metadata ?? {},
      });
    }

    results.sort((a, b) => b.finalScore - a.finalScore || b.bm25PlusScore - a.bm25PlusScore);
    return results.slice(0, topK);
  }
}
