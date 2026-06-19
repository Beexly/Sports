/**
 * Queue and data-structure utilities — pure TypeScript, zero dependencies.
 *
 * Exports: Queue, Stack, Deque, MinHeap, MaxHeap, CircularBuffer, LRUCache,
 * TTLCache, and a collection of functional + sports-specific queue helpers.
 */

// ---------------------------------------------------------------------------
// 1. Queue<T> — FIFO
// ---------------------------------------------------------------------------

export class Queue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0] ?? undefined;
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  clear(): void {
    this.items = [];
  }

  toArray(): T[] {
    return [...this.items];
  }

  fromArray(items: T[]): void {
    this.items = [...items];
  }
}

// ---------------------------------------------------------------------------
// 2. Stack<T> — LIFO
// ---------------------------------------------------------------------------

export class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1] ?? undefined;
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  clear(): void {
    this.items = [];
  }

  toArray(): T[] {
    return [...this.items];
  }
}

// ---------------------------------------------------------------------------
// 3. Deque<T> — double-ended queue
// ---------------------------------------------------------------------------

export class Deque<T> {
  private items: T[] = [];

  pushFront(item: T): void {
    this.items.unshift(item);
  }

  pushBack(item: T): void {
    this.items.push(item);
  }

  popFront(): T | undefined {
    return this.items.shift();
  }

  popBack(): T | undefined {
    return this.items.pop();
  }

  peekFront(): T | undefined {
    return this.items[0] ?? undefined;
  }

  peekBack(): T | undefined {
    return this.items[this.items.length - 1] ?? undefined;
  }

  size(): number {
    return this.items.length;
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  toArray(): T[] {
    return [...this.items];
  }
}

// ---------------------------------------------------------------------------
// 4 & 5. MinHeap<T> and MaxHeap<T> — array-backed binary heap
// ---------------------------------------------------------------------------

interface HeapNode<T> {
  item: T;
  priority: number;
}

class BinaryHeap<T> {
  protected nodes: HeapNode<T>[] = [];
  /** Return true when `a` should be closer to the root than `b`. */
  protected readonly shouldBubbleUp: (a: number, b: number) => boolean;

  constructor(shouldBubbleUp: (a: number, b: number) => boolean) {
    this.shouldBubbleUp = shouldBubbleUp;
  }

  insert(item: T, priority: number): void {
    this.nodes.push({ item, priority });
    this.bubbleUp(this.nodes.length - 1);
  }

  protected extractRoot(): T | undefined {
    if (this.nodes.length === 0) return undefined;
    const root = this.nodes[0];
    const last = this.nodes.pop();
    if (this.nodes.length > 0 && last !== undefined) {
      this.nodes[0] = last;
      this.sinkDown(0);
    }
    return root?.item;
  }

  protected peekRoot(): T | undefined {
    return this.nodes[0]?.item ?? undefined;
  }

  size(): number {
    return this.nodes.length;
  }

  isEmpty(): boolean {
    return this.nodes.length === 0;
  }

  toSortedArray(): T[] {
    // Snapshot, drain a copy, restore.
    const saved = [...this.nodes];
    const result: T[] = [];
    while (!this.isEmpty()) {
      const v = this.extractRoot();
      if (v !== undefined) result.push(v);
    }
    this.nodes = saved;
    return result;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIdx = Math.floor((index - 1) / 2);
      const parent = this.nodes[parentIdx];
      const current = this.nodes[index];
      if (
        parent !== undefined &&
        current !== undefined &&
        this.shouldBubbleUp(current.priority, parent.priority)
      ) {
        this.nodes[parentIdx] = current;
        this.nodes[index] = parent;
        index = parentIdx;
      } else {
        break;
      }
    }
  }

  private sinkDown(index: number): void {
    const length = this.nodes.length;
    while (true) {
      const left = 2 * index + 1;
      const right = 2 * index + 2;
      let target = index;

      const leftNode = this.nodes[left];
      const targetNode = this.nodes[target];
      if (
        left < length &&
        leftNode !== undefined &&
        targetNode !== undefined &&
        this.shouldBubbleUp(leftNode.priority, targetNode.priority)
      ) {
        target = left;
      }

      const rightNode = this.nodes[right];
      const newTargetNode = this.nodes[target];
      if (
        right < length &&
        rightNode !== undefined &&
        newTargetNode !== undefined &&
        this.shouldBubbleUp(rightNode.priority, newTargetNode.priority)
      ) {
        target = right;
      }

      if (target === index) break;

      const a = this.nodes[index];
      const b = this.nodes[target];
      if (a !== undefined && b !== undefined) {
        this.nodes[index] = b;
        this.nodes[target] = a;
      }
      index = target;
    }
  }
}

export class MinHeap<T> extends BinaryHeap<T> {
  constructor() {
    super((a, b) => a < b);
  }

  extractMin(): T | undefined {
    return this.extractRoot();
  }

  peekMin(): T | undefined {
    return this.peekRoot();
  }
}

export class MaxHeap<T> extends BinaryHeap<T> {
  constructor() {
    super((a, b) => a > b);
  }

  extractMax(): T | undefined {
    return this.extractRoot();
  }

  peekMax(): T | undefined {
    return this.peekRoot();
  }
}

// ---------------------------------------------------------------------------
// 6. CircularBuffer<T>
// ---------------------------------------------------------------------------

export class CircularBuffer<T> {
  private readonly buf: (T | undefined)[];
  private head = 0; // index of oldest element
  private tail = 0; // index where next element will be written
  private count = 0;
  private readonly cap: number;

  constructor(capacity: number) {
    if (capacity < 1) throw new RangeError("CircularBuffer capacity must be >= 1");
    this.cap = capacity;
    this.buf = new Array<T | undefined>(capacity).fill(undefined);
  }

  push(item: T): void {
    if (this.count === this.cap) {
      // Overwrite oldest
      this.buf[this.tail] = item;
      this.tail = (this.tail + 1) % this.cap;
      this.head = (this.head + 1) % this.cap;
    } else {
      this.buf[this.tail] = item;
      this.tail = (this.tail + 1) % this.cap;
      this.count++;
    }
  }

  pop(): T | undefined {
    if (this.count === 0) return undefined;
    // Pop from the newest end (tail - 1)
    this.tail = (this.tail - 1 + this.cap) % this.cap;
    const item = this.buf[this.tail];
    this.buf[this.tail] = undefined;
    this.count--;
    return item ?? undefined;
  }

  peek(): T | undefined {
    if (this.count === 0) return undefined;
    return this.buf[this.head] ?? undefined;
  }

  size(): number {
    return this.count;
  }

  isFull(): boolean {
    return this.count === this.cap;
  }

  isEmpty(): boolean {
    return this.count === 0;
  }

  /** Returns items in order from oldest to newest. */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      const v = this.buf[(this.head + i) % this.cap];
      if (v !== undefined) result.push(v);
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// 7. LRUCache<K, V>
// ---------------------------------------------------------------------------

interface LRUNode<K, V> {
  key: K;
  value: V;
  prev: LRUNode<K, V> | null;
  next: LRUNode<K, V> | null;
}

export class LRUCache<K, V> {
  private readonly cap: number;
  private readonly map: Map<K, LRUNode<K, V>> = new Map();
  // Doubly-linked list: head = most recently used, tail = least recently used
  private head: LRUNode<K, V> | null = null;
  private tail: LRUNode<K, V> | null = null;

  constructor(capacity: number) {
    if (capacity < 1) throw new RangeError("LRUCache capacity must be >= 1");
    this.cap = capacity;
  }

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.moveToHead(node);
    return node.value;
  }

  set(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this.moveToHead(existing);
      return;
    }
    const node: LRUNode<K, V> = { key, value, prev: null, next: null };
    this.map.set(key, node);
    this.addToHead(node);
    if (this.map.size > this.cap) {
      this.evictTail();
    }
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  delete(key: K): boolean {
    const node = this.map.get(key);
    if (!node) return false;
    this.removeNode(node);
    this.map.delete(key);
    return true;
  }

  size(): number {
    return this.map.size;
  }

  /** Returns keys from most recently used to least recently used. */
  keys(): K[] {
    const result: K[] = [];
    let cur = this.head;
    while (cur !== null) {
      result.push(cur.key);
      cur = cur.next;
    }
    return result;
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  private addToHead(node: LRUNode<K, V>): void {
    node.next = this.head;
    node.prev = null;
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
  }

  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) node.prev.next = node.next;
    else this.head = node.next;
    if (node.next) node.next.prev = node.prev;
    else this.tail = node.prev;
    node.prev = null;
    node.next = null;
  }

  private moveToHead(node: LRUNode<K, V>): void {
    if (node === this.head) return;
    this.removeNode(node);
    this.addToHead(node);
  }

  private evictTail(): void {
    if (!this.tail) return;
    this.map.delete(this.tail.key);
    this.removeNode(this.tail);
  }
}

// ---------------------------------------------------------------------------
// 8. TTLCache<K, V>
// ---------------------------------------------------------------------------

interface TTLEntry<V> {
  value: V;
  expiresAt: number;
}

export class TTLCache<K, V> {
  private readonly defaultTtlMs: number;
  private readonly store: Map<K, TTLEntry<V>> = new Map();

  constructor(defaultTtlMs: number) {
    this.defaultTtlMs = defaultTtlMs;
  }

  set(key: K, value: V, ttlMs?: number): void {
    const ttl = ttlMs ?? this.defaultTtlMs;
    this.store.set(key, { value, expiresAt: Date.now() + ttl });
  }

  get(key: K, nowMs?: number): V | undefined {
    const now = nowMs ?? Date.now();
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (now >= entry.expiresAt) return undefined;
    return entry.value;
  }

  has(key: K, nowMs?: number): boolean {
    const now = nowMs ?? Date.now();
    const entry = this.store.get(key);
    if (!entry) return false;
    return now < entry.expiresAt;
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  evictExpired(nowMs?: number): number {
    const now = nowMs ?? Date.now();
    let count = 0;
    for (const [key, entry] of this.store) {
      if (now >= entry.expiresAt) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  size(nowMs?: number): number {
    const now = nowMs ?? Date.now();
    let count = 0;
    for (const entry of this.store.values()) {
      if (now < entry.expiresAt) count++;
    }
    return count;
  }
}

// ---------------------------------------------------------------------------
// 9. Functional queue utilities
// ---------------------------------------------------------------------------

/**
 * Process `queue` in batches of `batchSize`, flatten all results.
 */
export function batchProcess<T, R>(
  queue: T[],
  batchSize: number,
  processor: (batch: T[]) => R[],
): R[] {
  const results: R[] = [];
  for (let i = 0; i < queue.length; i += batchSize) {
    const batch = queue.slice(i, i + batchSize);
    results.push(...processor(batch));
  }
  return results;
}

/**
 * Stable sort by priority. Ascending by default; pass `descending=true` for
 * highest-priority first.
 */
export function prioritySort<T>(
  items: T[],
  getPriority: (item: T) => number,
  descending = false,
): T[] {
  return [...items].sort((a, b) => {
    const diff = getPriority(a) - getPriority(b);
    return descending ? -diff : diff;
  });
}

/**
 * Assign monotonically increasing delays to items so they are spaced at the
 * given `ratePerSecond`.
 */
export function throttleQueue<T>(
  items: T[],
  ratePerSecond: number,
): { item: T; delayMs: number }[] {
  if (ratePerSecond <= 0) throw new RangeError("ratePerSecond must be > 0");
  const intervalMs = 1000 / ratePerSecond;
  return items.map((item, i) => ({ item, delayMs: i * intervalMs }));
}

/**
 * Interleave multiple queues round-robin until all are exhausted.
 */
export function mergeQueues<T>(...queues: T[][]): T[] {
  const result: T[] = [];
  const indices = queues.map(() => 0);
  let remaining = true;
  while (remaining) {
    remaining = false;
    for (let q = 0; q < queues.length; q++) {
      const idx = indices[q] ?? 0;
      const queue = queues[q];
      if (queue !== undefined && idx < queue.length) {
        const item = queue[idx];
        if (item !== undefined) result.push(item);
        indices[q] = idx + 1;
        if ((indices[q] ?? 0) < queue.length) remaining = true;
      }
    }
  }
  return result;
}

/**
 * Split items into those matching `predicate` and the rest.
 */
export function partitionQueue<T>(
  items: T[],
  predicate: (item: T) => boolean,
): { matching: T[]; rest: T[] } {
  const matching: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (predicate(item)) matching.push(item);
    else rest.push(item);
  }
  return { matching, rest };
}

// ---------------------------------------------------------------------------
// 10. Sports-specific queue utilities
// ---------------------------------------------------------------------------

export type GameEvent = {
  time: number;
  type: string;
  payload: Record<string, number | string | boolean>;
};

/**
 * Build a Queue pre-loaded with game events sorted by `time` ascending.
 */
export function gameEventQueue(events: GameEvent[]): Queue<GameEvent> {
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const q = new Queue<GameEvent>();
  q.fromArray(sorted);
  return q;
}

export type IngestionSource = { source: string; priority: number };

/**
 * Return sources with a numeric priority (high=3, medium=2, low=1) sorted
 * descending (highest priority first).
 */
export function ingestionQueue(
  sources: string[],
  priority: "high" | "medium" | "low",
): IngestionSource[] {
  const numericPriority = priority === "high" ? 3 : priority === "medium" ? 2 : 1;
  const tagged: IngestionSource[] = sources.map((source) => ({
    source,
    priority: numericPriority,
  }));
  return tagged.sort((a, b) => b.priority - a.priority);
}

export type Alert = { severity: "critical" | "warning" | "info"; message: string };

/**
 * Load alerts into a MaxHeap keyed by severity (critical=3, warning=2, info=1).
 */
export function alertQueue(
  alerts: Alert[],
): MaxHeap<{ severity: string; message: string }> {
  const heap = new MaxHeap<{ severity: string; message: string }>();
  const severityPriority = (s: string): number =>
    s === "critical" ? 3 : s === "warning" ? 2 : 1;
  for (const alert of alerts) {
    heap.insert({ severity: alert.severity, message: alert.message }, severityPriority(alert.severity));
  }
  return heap;
}
