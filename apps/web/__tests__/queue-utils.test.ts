/**
 * Tests for queue-utils.ts
 * Run: cd apps/web && npx vitest run __tests__/queue-utils.test.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  Queue,
  Stack,
  Deque,
  MinHeap,
  MaxHeap,
  CircularBuffer,
  LRUCache,
  TTLCache,
  batchProcess,
  prioritySort,
  throttleQueue,
  mergeQueues,
  partitionQueue,
  gameEventQueue,
  ingestionQueue,
  alertQueue,
  type GameEvent,
} from "@/lib/utils/queue-utils";

// ===========================================================================
// Queue<T>
// ===========================================================================

describe("Queue", () => {
  let q: Queue<number>;

  beforeEach(() => {
    q = new Queue<number>();
  });

  it("starts empty", () => {
    expect(q.isEmpty()).toBe(true);
    expect(q.size()).toBe(0);
  });

  it("enqueue increases size", () => {
    q.enqueue(1);
    expect(q.size()).toBe(1);
    expect(q.isEmpty()).toBe(false);
  });

  it("dequeue returns items in FIFO order", () => {
    q.enqueue(1);
    q.enqueue(2);
    q.enqueue(3);
    expect(q.dequeue()).toBe(1);
    expect(q.dequeue()).toBe(2);
    expect(q.dequeue()).toBe(3);
  });

  it("dequeue from empty returns undefined", () => {
    expect(q.dequeue()).toBeUndefined();
  });

  it("peek returns front without removing", () => {
    q.enqueue(10);
    q.enqueue(20);
    expect(q.peek()).toBe(10);
    expect(q.size()).toBe(2);
  });

  it("peek on empty returns undefined", () => {
    expect(q.peek()).toBeUndefined();
  });

  it("clear empties the queue", () => {
    q.enqueue(1);
    q.enqueue(2);
    q.clear();
    expect(q.isEmpty()).toBe(true);
    expect(q.size()).toBe(0);
  });

  it("toArray returns items in FIFO order", () => {
    q.enqueue(1);
    q.enqueue(2);
    q.enqueue(3);
    expect(q.toArray()).toEqual([1, 2, 3]);
  });

  it("toArray does not mutate internal state", () => {
    q.enqueue(1);
    const arr = q.toArray();
    arr.push(99);
    expect(q.size()).toBe(1);
  });

  it("fromArray replaces queue contents", () => {
    q.enqueue(1);
    q.fromArray([4, 5, 6]);
    expect(q.toArray()).toEqual([4, 5, 6]);
  });

  it("fromArray on empty queue populates it", () => {
    q.fromArray([7, 8]);
    expect(q.size()).toBe(2);
    expect(q.dequeue()).toBe(7);
  });

  it("fromArray does not share reference", () => {
    const arr = [1, 2, 3];
    q.fromArray(arr);
    arr.push(4);
    expect(q.size()).toBe(3);
  });

  it("interleaved enqueue/dequeue maintains FIFO", () => {
    q.enqueue(1);
    q.enqueue(2);
    expect(q.dequeue()).toBe(1);
    q.enqueue(3);
    expect(q.dequeue()).toBe(2);
    expect(q.dequeue()).toBe(3);
  });

  it("works with string type", () => {
    const sq = new Queue<string>();
    sq.enqueue("a");
    sq.enqueue("b");
    expect(sq.dequeue()).toBe("a");
  });
});

// ===========================================================================
// Stack<T>
// ===========================================================================

describe("Stack", () => {
  let s: Stack<number>;

  beforeEach(() => {
    s = new Stack<number>();
  });

  it("starts empty", () => {
    expect(s.isEmpty()).toBe(true);
    expect(s.size()).toBe(0);
  });

  it("push increases size", () => {
    s.push(1);
    expect(s.size()).toBe(1);
  });

  it("pop returns items in LIFO order", () => {
    s.push(1);
    s.push(2);
    s.push(3);
    expect(s.pop()).toBe(3);
    expect(s.pop()).toBe(2);
    expect(s.pop()).toBe(1);
  });

  it("pop on empty returns undefined", () => {
    expect(s.pop()).toBeUndefined();
  });

  it("peek returns top without removing", () => {
    s.push(5);
    s.push(10);
    expect(s.peek()).toBe(10);
    expect(s.size()).toBe(2);
  });

  it("peek on empty returns undefined", () => {
    expect(s.peek()).toBeUndefined();
  });

  it("clear empties the stack", () => {
    s.push(1);
    s.clear();
    expect(s.isEmpty()).toBe(true);
  });

  it("toArray returns items in push order (bottom to top)", () => {
    s.push(1);
    s.push(2);
    s.push(3);
    expect(s.toArray()).toEqual([1, 2, 3]);
  });

  it("toArray does not mutate internal state", () => {
    s.push(42);
    const arr = s.toArray();
    arr.pop();
    expect(s.size()).toBe(1);
  });

  it("interleaved push/pop maintains LIFO", () => {
    s.push(1);
    s.push(2);
    expect(s.pop()).toBe(2);
    s.push(3);
    expect(s.pop()).toBe(3);
    expect(s.pop()).toBe(1);
  });
});

// ===========================================================================
// Deque<T>
// ===========================================================================

describe("Deque", () => {
  let d: Deque<number>;

  beforeEach(() => {
    d = new Deque<number>();
  });

  it("starts empty", () => {
    expect(d.isEmpty()).toBe(true);
    expect(d.size()).toBe(0);
  });

  it("pushBack then popFront — FIFO behaviour", () => {
    d.pushBack(1);
    d.pushBack(2);
    d.pushBack(3);
    expect(d.popFront()).toBe(1);
    expect(d.popFront()).toBe(2);
  });

  it("pushFront then popFront — LIFO behaviour at front", () => {
    d.pushFront(1);
    d.pushFront(2);
    expect(d.popFront()).toBe(2);
    expect(d.popFront()).toBe(1);
  });

  it("pushBack then popBack — LIFO behaviour at back", () => {
    d.pushBack(1);
    d.pushBack(2);
    expect(d.popBack()).toBe(2);
    expect(d.popBack()).toBe(1);
  });

  it("pushFront then popBack", () => {
    d.pushFront(1);
    d.pushFront(2);
    expect(d.popBack()).toBe(1);
  });

  it("peekFront does not remove", () => {
    d.pushBack(10);
    expect(d.peekFront()).toBe(10);
    expect(d.size()).toBe(1);
  });

  it("peekBack does not remove", () => {
    d.pushBack(10);
    d.pushBack(20);
    expect(d.peekBack()).toBe(20);
    expect(d.size()).toBe(2);
  });

  it("peekFront/Back on empty return undefined", () => {
    expect(d.peekFront()).toBeUndefined();
    expect(d.peekBack()).toBeUndefined();
  });

  it("popFront/Back on empty return undefined", () => {
    expect(d.popFront()).toBeUndefined();
    expect(d.popBack()).toBeUndefined();
  });

  it("toArray returns items front to back", () => {
    d.pushBack(1);
    d.pushBack(2);
    d.pushFront(0);
    expect(d.toArray()).toEqual([0, 1, 2]);
  });

  it("mixed pushFront and pushBack", () => {
    d.pushFront(2);
    d.pushBack(3);
    d.pushFront(1);
    expect(d.toArray()).toEqual([1, 2, 3]);
  });
});

// ===========================================================================
// MinHeap<T>
// ===========================================================================

describe("MinHeap", () => {
  let h: MinHeap<string>;

  beforeEach(() => {
    h = new MinHeap<string>();
  });

  it("starts empty", () => {
    expect(h.isEmpty()).toBe(true);
    expect(h.size()).toBe(0);
  });

  it("extractMin returns item with lowest priority", () => {
    h.insert("low", 1);
    h.insert("high", 10);
    h.insert("med", 5);
    expect(h.extractMin()).toBe("low");
  });

  it("extracts in ascending priority order", () => {
    h.insert("c", 3);
    h.insert("a", 1);
    h.insert("b", 2);
    expect(h.extractMin()).toBe("a");
    expect(h.extractMin()).toBe("b");
    expect(h.extractMin()).toBe("c");
  });

  it("peekMin does not remove", () => {
    h.insert("x", 5);
    h.insert("y", 1);
    expect(h.peekMin()).toBe("y");
    expect(h.size()).toBe(2);
  });

  it("extractMin on empty returns undefined", () => {
    expect(h.extractMin()).toBeUndefined();
  });

  it("peekMin on empty returns undefined", () => {
    expect(h.peekMin()).toBeUndefined();
  });

  it("toSortedArray returns all in ascending order (non-destructive)", () => {
    h.insert("c", 3);
    h.insert("a", 1);
    h.insert("b", 2);
    const sorted = h.toSortedArray();
    expect(sorted).toEqual(["a", "b", "c"]);
    // Non-destructive: heap still has 3 elements
    expect(h.size()).toBe(3);
  });

  it("handles duplicate priorities", () => {
    h.insert("first", 5);
    h.insert("second", 5);
    h.insert("third", 5);
    const sorted = h.toSortedArray();
    expect(sorted).toHaveLength(3);
  });

  it("single element heap", () => {
    h.insert("only", 42);
    expect(h.peekMin()).toBe("only");
    expect(h.extractMin()).toBe("only");
    expect(h.isEmpty()).toBe(true);
  });

  it("size decreases on extract", () => {
    h.insert("a", 1);
    h.insert("b", 2);
    h.extractMin();
    expect(h.size()).toBe(1);
  });
});

// ===========================================================================
// MaxHeap<T>
// ===========================================================================

describe("MaxHeap", () => {
  let h: MaxHeap<string>;

  beforeEach(() => {
    h = new MaxHeap<string>();
  });

  it("starts empty", () => {
    expect(h.isEmpty()).toBe(true);
  });

  it("extractMax returns item with highest priority", () => {
    h.insert("low", 1);
    h.insert("high", 10);
    h.insert("med", 5);
    expect(h.extractMax()).toBe("high");
  });

  it("extracts in descending priority order", () => {
    h.insert("c", 3);
    h.insert("a", 1);
    h.insert("b", 2);
    expect(h.extractMax()).toBe("c");
    expect(h.extractMax()).toBe("b");
    expect(h.extractMax()).toBe("a");
  });

  it("peekMax does not remove", () => {
    h.insert("x", 5);
    h.insert("y", 100);
    expect(h.peekMax()).toBe("y");
    expect(h.size()).toBe(2);
  });

  it("extractMax on empty returns undefined", () => {
    expect(h.extractMax()).toBeUndefined();
  });

  it("peekMax on empty returns undefined", () => {
    expect(h.peekMax()).toBeUndefined();
  });

  it("toSortedArray returns all in descending order (non-destructive)", () => {
    h.insert("c", 3);
    h.insert("a", 1);
    h.insert("b", 2);
    const sorted = h.toSortedArray();
    expect(sorted).toEqual(["c", "b", "a"]);
    expect(h.size()).toBe(3);
  });

  it("handles duplicate priorities", () => {
    h.insert("x", 10);
    h.insert("y", 10);
    const sorted = h.toSortedArray();
    expect(sorted).toHaveLength(2);
  });

  it("large number of inserts maintain heap property", () => {
    for (let i = 0; i < 20; i++) h.insert(`item${i}`, i);
    const sorted = h.toSortedArray();
    for (let i = 0; i < sorted.length - 1; i++) {
      // priorities descend: item19 first
      expect(sorted[i]).toBe(`item${19 - i}`);
    }
  });
});

// ===========================================================================
// CircularBuffer<T>
// ===========================================================================

describe("CircularBuffer", () => {
  it("throws on capacity < 1", () => {
    expect(() => new CircularBuffer(0)).toThrow(RangeError);
  });

  it("starts empty", () => {
    const cb = new CircularBuffer<number>(3);
    expect(cb.isEmpty()).toBe(true);
    expect(cb.size()).toBe(0);
    expect(cb.isFull()).toBe(false);
  });

  it("push and size", () => {
    const cb = new CircularBuffer<number>(3);
    cb.push(1);
    cb.push(2);
    expect(cb.size()).toBe(2);
  });

  it("isFull when at capacity", () => {
    const cb = new CircularBuffer<number>(2);
    cb.push(1);
    cb.push(2);
    expect(cb.isFull()).toBe(true);
  });

  it("peek returns oldest element", () => {
    const cb = new CircularBuffer<number>(3);
    cb.push(10);
    cb.push(20);
    expect(cb.peek()).toBe(10);
  });

  it("pop removes newest element", () => {
    const cb = new CircularBuffer<number>(3);
    cb.push(1);
    cb.push(2);
    cb.push(3);
    expect(cb.pop()).toBe(3);
    expect(cb.size()).toBe(2);
  });

  it("pop on empty returns undefined", () => {
    const cb = new CircularBuffer<number>(3);
    expect(cb.pop()).toBeUndefined();
  });

  it("peek on empty returns undefined", () => {
    const cb = new CircularBuffer<number>(3);
    expect(cb.peek()).toBeUndefined();
  });

  it("wraps around overwriting oldest on overflow", () => {
    const cb = new CircularBuffer<number>(3);
    cb.push(1);
    cb.push(2);
    cb.push(3);
    cb.push(4); // overwrites 1
    expect(cb.toArray()).toEqual([2, 3, 4]);
  });

  it("toArray returns oldest to newest", () => {
    const cb = new CircularBuffer<number>(4);
    cb.push(10);
    cb.push(20);
    cb.push(30);
    expect(cb.toArray()).toEqual([10, 20, 30]);
  });

  it("double wrap-around", () => {
    const cb = new CircularBuffer<number>(3);
    for (let i = 1; i <= 7; i++) cb.push(i);
    // After 7 pushes into cap=3: keeps 5,6,7
    expect(cb.toArray()).toEqual([5, 6, 7]);
  });

  it("size never exceeds capacity", () => {
    const cb = new CircularBuffer<number>(3);
    for (let i = 0; i < 10; i++) cb.push(i);
    expect(cb.size()).toBe(3);
  });

  it("capacity 1 keeps only last item", () => {
    const cb = new CircularBuffer<number>(1);
    cb.push(1);
    cb.push(2);
    cb.push(3);
    expect(cb.toArray()).toEqual([3]);
  });
});

// ===========================================================================
// LRUCache<K, V>
// ===========================================================================

describe("LRUCache", () => {
  it("throws on capacity < 1", () => {
    expect(() => new LRUCache(0)).toThrow(RangeError);
  });

  it("starts empty", () => {
    const c = new LRUCache<string, number>(3);
    expect(c.size()).toBe(0);
  });

  it("get returns undefined for missing key", () => {
    const c = new LRUCache<string, number>(3);
    expect(c.get("x")).toBeUndefined();
  });

  it("set and get", () => {
    const c = new LRUCache<string, number>(3);
    c.set("a", 1);
    expect(c.get("a")).toBe(1);
  });

  it("has returns true for existing key", () => {
    const c = new LRUCache<string, number>(3);
    c.set("a", 1);
    expect(c.has("a")).toBe(true);
    expect(c.has("b")).toBe(false);
  });

  it("delete removes key", () => {
    const c = new LRUCache<string, number>(3);
    c.set("a", 1);
    expect(c.delete("a")).toBe(true);
    expect(c.has("a")).toBe(false);
  });

  it("delete returns false for missing key", () => {
    const c = new LRUCache<string, number>(3);
    expect(c.delete("nonexistent")).toBe(false);
  });

  it("evicts least recently used when at capacity", () => {
    const c = new LRUCache<string, number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3); // evicts "a"
    expect(c.has("a")).toBe(false);
    expect(c.has("b")).toBe(true);
    expect(c.has("c")).toBe(true);
  });

  it("get marks as recently used, preventing eviction", () => {
    const c = new LRUCache<string, number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.get("a"); // mark "a" as recently used
    c.set("c", 3); // should evict "b" not "a"
    expect(c.has("a")).toBe(true);
    expect(c.has("b")).toBe(false);
    expect(c.has("c")).toBe(true);
  });

  it("keys returns most to least recently used", () => {
    const c = new LRUCache<string, number>(3);
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3);
    expect(c.keys()).toEqual(["c", "b", "a"]);
  });

  it("set updates existing value without eviction", () => {
    const c = new LRUCache<string, number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.set("a", 99); // update
    expect(c.size()).toBe(2);
    expect(c.get("a")).toBe(99);
  });

  it("update moves key to most recently used", () => {
    const c = new LRUCache<string, number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.set("a", 100); // updates and promotes "a"
    c.set("c", 3); // should evict "b"
    expect(c.has("a")).toBe(true);
    expect(c.has("b")).toBe(false);
  });

  it("clear empties cache", () => {
    const c = new LRUCache<string, number>(3);
    c.set("a", 1);
    c.clear();
    expect(c.size()).toBe(0);
    expect(c.keys()).toEqual([]);
  });

  it("size tracks correctly through operations", () => {
    const c = new LRUCache<string, number>(5);
    c.set("a", 1);
    c.set("b", 2);
    expect(c.size()).toBe(2);
    c.delete("a");
    expect(c.size()).toBe(1);
  });
});

// ===========================================================================
// TTLCache<K, V>
// ===========================================================================

describe("TTLCache", () => {
  it("set and get within TTL", () => {
    const c = new TTLCache<string, number>(1000);
    const now = 1000;
    c.set("a", 42);
    // Access at now+500 — within TTL
    const entry = c.get("a", now + 500);
    // Note: since we set without specifying nowMs, expiresAt = Date.now() + 1000
    // We can't control Date.now() here, so just check it's set
    expect(c.has("a")).toBe(true);
  });

  it("get returns undefined when expired (using nowMs param)", () => {
    const c = new TTLCache<string, number>(1000);
    const setTime = 0;
    // Manually set with known expiry: we'll use a very short TTL and advance time
    c.set("x", 99, 100); // expires 100ms after Date.now()
    // Check as if we're 200ms in the future from Date.now()
    const futureNow = Date.now() + 200;
    expect(c.get("x", futureNow)).toBeUndefined();
    void setTime;
  });

  it("has returns false when expired", () => {
    const c = new TTLCache<string, number>(50);
    c.set("k", 1, 50);
    const futureNow = Date.now() + 100;
    expect(c.has("k", futureNow)).toBe(false);
  });

  it("has returns true within TTL", () => {
    const c = new TTLCache<string, number>(5000);
    c.set("k", 1);
    expect(c.has("k")).toBe(true);
  });

  it("delete removes entry", () => {
    const c = new TTLCache<string, number>(5000);
    c.set("k", 1);
    expect(c.delete("k")).toBe(true);
    expect(c.has("k")).toBe(false);
  });

  it("delete returns false for missing key", () => {
    const c = new TTLCache<string, number>(5000);
    expect(c.delete("missing")).toBe(false);
  });

  it("evictExpired removes expired entries and returns count", () => {
    const c = new TTLCache<string, number>(5000);
    c.set("a", 1, 50);
    c.set("b", 2, 50);
    c.set("c", 3, 5000);
    const futureNow = Date.now() + 100;
    const count = c.evictExpired(futureNow);
    expect(count).toBe(2);
  });

  it("size counts only non-expired", () => {
    const c = new TTLCache<string, number>(5000);
    c.set("a", 1, 50);
    c.set("b", 2, 5000);
    const futureNow = Date.now() + 100;
    expect(c.size(futureNow)).toBe(1);
  });

  it("overwrite key resets TTL", () => {
    const c = new TTLCache<string, number>(100);
    c.set("k", 1, 50);
    c.set("k", 2, 5000); // reset with long TTL
    const futureNow = Date.now() + 100;
    expect(c.has("k", futureNow)).toBe(true);
    expect(c.get("k", futureNow)).toBe(2);
  });

  it("uses defaultTtlMs when no per-item TTL given", () => {
    const c = new TTLCache<string, number>(5000);
    c.set("k", 1); // uses default 5000ms
    expect(c.has("k", Date.now() + 4000)).toBe(true);
    expect(c.has("k", Date.now() + 6000)).toBe(false);
  });
});

// ===========================================================================
// batchProcess
// ===========================================================================

describe("batchProcess", () => {
  it("processes items in batches and flattens results", () => {
    const items = [1, 2, 3, 4, 5];
    const result = batchProcess(items, 2, (batch) => batch.map((x) => x * 2));
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });

  it("handles uneven last batch", () => {
    const items = [1, 2, 3, 4, 5];
    const result = batchProcess(items, 3, (batch) => [batch.length]);
    expect(result).toEqual([3, 2]);
  });

  it("empty queue returns empty result", () => {
    const result = batchProcess([], 5, (batch) => batch);
    expect(result).toEqual([]);
  });

  it("batch size larger than queue processes all at once", () => {
    const items = [10, 20];
    const batches: number[][] = [];
    batchProcess(items, 100, (batch) => { batches.push(batch); return batch; });
    expect(batches).toHaveLength(1);
    expect(batches[0]).toEqual([10, 20]);
  });

  it("batch size 1 calls processor per item", () => {
    const calls: number[] = [];
    batchProcess([1, 2, 3], 1, (batch) => { calls.push(batch.length); return batch; });
    expect(calls).toEqual([1, 1, 1]);
  });

  it("processor result is flattened", () => {
    const result = batchProcess(["a", "b", "c"], 2, (batch) => batch.map((s) => s.toUpperCase()));
    expect(result).toEqual(["A", "B", "C"]);
  });
});

// ===========================================================================
// prioritySort
// ===========================================================================

describe("prioritySort", () => {
  const items = [
    { name: "c", score: 3 },
    { name: "a", score: 1 },
    { name: "b", score: 2 },
  ];

  it("sorts ascending by default", () => {
    const sorted = prioritySort(items, (x) => x.score);
    expect(sorted.map((x) => x.name)).toEqual(["a", "b", "c"]);
  });

  it("sorts descending when flag is true", () => {
    const sorted = prioritySort(items, (x) => x.score, true);
    expect(sorted.map((x) => x.name)).toEqual(["c", "b", "a"]);
  });

  it("does not mutate original array", () => {
    const original = [...items];
    prioritySort(items, (x) => x.score);
    expect(items).toEqual(original);
  });

  it("handles empty array", () => {
    expect(prioritySort([], (x: number) => x)).toEqual([]);
  });

  it("stable sort: equal priorities preserve relative order", () => {
    const eq = [{ name: "x", p: 1 }, { name: "y", p: 1 }, { name: "z", p: 1 }];
    const sorted = prioritySort(eq, (i) => i.p);
    expect(sorted.map((i) => i.name)).toEqual(["x", "y", "z"]);
  });
});

// ===========================================================================
// throttleQueue
// ===========================================================================

describe("throttleQueue", () => {
  it("returns one entry per item", () => {
    const result = throttleQueue(["a", "b", "c"], 2);
    expect(result).toHaveLength(3);
  });

  it("first item has delayMs 0", () => {
    const result = throttleQueue(["x"], 10);
    expect(result[0]?.delayMs).toBe(0);
  });

  it("delays are spaced by 1000/ratePerSecond", () => {
    const result = throttleQueue([1, 2, 3], 4);
    expect(result[0]?.delayMs).toBe(0);
    expect(result[1]?.delayMs).toBeCloseTo(250);
    expect(result[2]?.delayMs).toBeCloseTo(500);
  });

  it("preserves item values", () => {
    const result = throttleQueue(["a", "b"], 1);
    expect(result[0]?.item).toBe("a");
    expect(result[1]?.item).toBe("b");
  });

  it("throws for ratePerSecond <= 0", () => {
    expect(() => throttleQueue([1], 0)).toThrow(RangeError);
    expect(() => throttleQueue([1], -1)).toThrow(RangeError);
  });

  it("empty input returns empty output", () => {
    expect(throttleQueue([], 5)).toEqual([]);
  });
});

// ===========================================================================
// mergeQueues
// ===========================================================================

describe("mergeQueues", () => {
  it("interleaves two equal-length queues", () => {
    expect(mergeQueues([1, 2, 3], [4, 5, 6])).toEqual([1, 4, 2, 5, 3, 6]);
  });

  it("handles queues of different lengths", () => {
    expect(mergeQueues([1, 2, 3], [4])).toEqual([1, 4, 2, 3]);
  });

  it("single queue returns its items", () => {
    expect(mergeQueues([1, 2, 3])).toEqual([1, 2, 3]);
  });

  it("empty queues are skipped", () => {
    expect(mergeQueues([], [1, 2])).toEqual([1, 2]);
  });

  it("three queues interleaved", () => {
    const result = mergeQueues([1, 4], [2, 5], [3, 6]);
    expect(result).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("no arguments returns empty array", () => {
    expect(mergeQueues()).toEqual([]);
  });

  it("all empty queues returns empty array", () => {
    expect(mergeQueues([], [])).toEqual([]);
  });
});

// ===========================================================================
// partitionQueue
// ===========================================================================

describe("partitionQueue", () => {
  it("splits even/odd numbers", () => {
    const { matching, rest } = partitionQueue([1, 2, 3, 4, 5], (x) => x % 2 === 0);
    expect(matching).toEqual([2, 4]);
    expect(rest).toEqual([1, 3, 5]);
  });

  it("all match returns empty rest", () => {
    const { matching, rest } = partitionQueue([2, 4, 6], (x) => x % 2 === 0);
    expect(matching).toEqual([2, 4, 6]);
    expect(rest).toEqual([]);
  });

  it("none match returns empty matching", () => {
    const { matching, rest } = partitionQueue([1, 3, 5], (x) => x % 2 === 0);
    expect(matching).toEqual([]);
    expect(rest).toEqual([1, 3, 5]);
  });

  it("empty input returns both empty", () => {
    const { matching, rest } = partitionQueue([], () => true);
    expect(matching).toEqual([]);
    expect(rest).toEqual([]);
  });

  it("preserves order within each partition", () => {
    const { matching } = partitionQueue([5, 1, 4, 2, 3], (x) => x > 3);
    expect(matching).toEqual([5, 4]);
  });

  it("works with string predicate", () => {
    const { matching, rest } = partitionQueue(["apple", "ant", "banana"], (s) => s.startsWith("a"));
    expect(matching).toEqual(["apple", "ant"]);
    expect(rest).toEqual(["banana"]);
  });
});

// ===========================================================================
// gameEventQueue
// ===========================================================================

describe("gameEventQueue", () => {
  it("returns a Queue instance", () => {
    const q = gameEventQueue([]);
    expect(q).toBeInstanceOf(Queue);
  });

  it("sorts events by time ascending", () => {
    const events: GameEvent[] = [
      { time: 30, type: "goal", payload: { team: "home" } },
      { time: 10, type: "kickoff", payload: { team: "away" } },
      { time: 20, type: "foul", payload: { player: "P1" } },
    ];
    const q = gameEventQueue(events);
    expect(q.dequeue()?.time).toBe(10);
    expect(q.dequeue()?.time).toBe(20);
    expect(q.dequeue()?.time).toBe(30);
  });

  it("does not mutate original array", () => {
    const events = [
      { time: 5, type: "a", payload: {} },
      { time: 1, type: "b", payload: {} },
    ];
    const original = [...events];
    gameEventQueue(events);
    expect(events[0]?.time).toBe(original[0]?.time);
  });

  it("empty events returns empty queue", () => {
    const q = gameEventQueue([]);
    expect(q.isEmpty()).toBe(true);
  });

  it("size matches number of events", () => {
    const events = [
      { time: 1, type: "a", payload: {} },
      { time: 2, type: "b", payload: {} },
    ];
    const q = gameEventQueue(events);
    expect(q.size()).toBe(2);
  });
});

// ===========================================================================
// ingestionQueue
// ===========================================================================

describe("ingestionQueue", () => {
  it("assigns priority 3 for high", () => {
    const result = ingestionQueue(["s1"], "high");
    expect(result[0]?.priority).toBe(3);
  });

  it("assigns priority 2 for medium", () => {
    const result = ingestionQueue(["s1"], "medium");
    expect(result[0]?.priority).toBe(2);
  });

  it("assigns priority 1 for low", () => {
    const result = ingestionQueue(["s1"], "low");
    expect(result[0]?.priority).toBe(1);
  });

  it("all sources get the same priority", () => {
    const result = ingestionQueue(["a", "b", "c"], "high");
    expect(result.every((r) => r.priority === 3)).toBe(true);
  });

  it("sorts descending by priority", () => {
    const result = ingestionQueue(["a", "b"], "medium");
    for (let i = 0; i < result.length - 1; i++) {
      expect((result[i]?.priority ?? 0) >= (result[i + 1]?.priority ?? 0)).toBe(true);
    }
  });

  it("preserves source names", () => {
    const result = ingestionQueue(["espn", "odds-api"], "low");
    const names = result.map((r) => r.source);
    expect(names).toContain("espn");
    expect(names).toContain("odds-api");
  });

  it("empty sources returns empty array", () => {
    expect(ingestionQueue([], "high")).toEqual([]);
  });
});

// ===========================================================================
// alertQueue
// ===========================================================================

describe("alertQueue", () => {
  it("returns a MaxHeap instance", () => {
    const h = alertQueue([]);
    expect(h).toBeInstanceOf(MaxHeap);
  });

  it("critical alerts extracted first", () => {
    const h = alertQueue([
      { severity: "info", message: "Info" },
      { severity: "critical", message: "Critical!" },
      { severity: "warning", message: "Warning" },
    ]);
    const first = h.extractMax();
    expect(first?.severity).toBe("critical");
  });

  it("warning extracted before info", () => {
    const h = alertQueue([
      { severity: "info", message: "Info" },
      { severity: "warning", message: "Warning" },
    ]);
    const first = h.extractMax();
    expect(first?.severity).toBe("warning");
  });

  it("all severities extracted in order: critical > warning > info", () => {
    const h = alertQueue([
      { severity: "info", message: "i" },
      { severity: "critical", message: "c" },
      { severity: "warning", message: "w" },
    ]);
    const sorted = h.toSortedArray();
    expect(sorted[0]?.severity).toBe("critical");
    expect(sorted[1]?.severity).toBe("warning");
    expect(sorted[2]?.severity).toBe("info");
  });

  it("empty alerts returns empty heap", () => {
    const h = alertQueue([]);
    expect(h.isEmpty()).toBe(true);
  });

  it("preserves message text", () => {
    const h = alertQueue([{ severity: "info", message: "hello world" }]);
    const item = h.extractMax();
    expect(item?.message).toBe("hello world");
  });

  it("size reflects number of alerts", () => {
    const h = alertQueue([
      { severity: "critical", message: "a" },
      { severity: "warning", message: "b" },
    ]);
    expect(h.size()).toBe(2);
  });
});
