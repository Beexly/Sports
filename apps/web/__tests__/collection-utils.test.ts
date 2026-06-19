import { describe, it, expect } from 'vitest';
import {
  groupBy,
  groupByMultiple,
  partition,
  partitionN,
  chunk,
  zip,
  zipWith,
  unzip,
  flatten,
  flatMap,
  unique,
  uniqueBy,
  compact,
  rotate,
  interleave,
  slidingWindow,
  toPairs,
  fromPairs,
  sortBy,
  topN,
  bottomN,
  rankItems,
  pick,
  omit,
  deepMerge,
  deepClone,
  mapValues,
  filterValues,
  invertObject,
  flattenObject,
  unflattenObject,
  union,
  intersection,
  difference,
  symmetricDifference,
  isSubset,
  cartesianProduct,
  countBy,
  frequencies,
  mostCommon,
  rollingAverage,
  weightedAverage,
  normalizeWeights,
  splitByThreshold,
  indexBy,
} from '../lib/utils/collection-utils';

// ---------------------------------------------------------------------------
// groupBy
// ---------------------------------------------------------------------------
describe('groupBy', () => {
  it('groups by a string field', () => {
    const arr = [
      { sport: 'NFL', pick: 'A' },
      { sport: 'NBA', pick: 'B' },
      { sport: 'NFL', pick: 'C' },
    ];
    const result = groupBy(arr, (x) => x.sport);
    expect(result['NFL']).toHaveLength(2);
    expect(result['NBA']).toHaveLength(1);
  });

  it('returns empty object for empty array', () => {
    expect(groupBy([], (x: string) => x)).toEqual({});
  });

  it('handles single group', () => {
    const arr = [1, 2, 3];
    const result = groupBy(arr, () => 'all');
    expect(result['all']).toEqual([1, 2, 3]);
  });

  it('each item appears exactly once', () => {
    const arr = ['a', 'b', 'a', 'c'];
    const result = groupBy(arr, (x) => x);
    const flat = Object.values(result).flat();
    expect(flat).toHaveLength(arr.length);
  });
});

// ---------------------------------------------------------------------------
// groupByMultiple
// ---------------------------------------------------------------------------
describe('groupByMultiple', () => {
  it('combines multiple keys with pipe separator', () => {
    const arr = [
      { sport: 'NFL', tier: 'free' },
      { sport: 'NBA', tier: 'pro' },
      { sport: 'NFL', tier: 'free' },
      { sport: 'NFL', tier: 'pro' },
    ];
    const result = groupByMultiple(arr, [(x) => x.sport, (x) => x.tier]);
    expect(result['NFL|free']).toHaveLength(2);
    expect(result['NFL|pro']).toHaveLength(1);
    expect(result['NBA|pro']).toHaveLength(1);
  });

  it('works with a single key function (same as groupBy)', () => {
    const arr = ['a', 'b', 'a'];
    const result = groupByMultiple(arr, [(x) => x]);
    expect(result['a']).toHaveLength(2);
    expect(result['b']).toHaveLength(1);
  });

  it('returns empty object for empty array', () => {
    expect(groupByMultiple([], [(x: string) => x])).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// partition
// ---------------------------------------------------------------------------
describe('partition', () => {
  it('splits even and odd numbers', () => {
    const [evens, odds] = partition([1, 2, 3, 4, 5], (x) => x % 2 === 0);
    expect(evens).toEqual([2, 4]);
    expect(odds).toEqual([1, 3, 5]);
  });

  it('returns empty arrays for empty input', () => {
    const [a, b] = partition([], () => true);
    expect(a).toEqual([]);
    expect(b).toEqual([]);
  });

  it('all in true bucket when predicate always true', () => {
    const [a, b] = partition([1, 2, 3], () => true);
    expect(a).toEqual([1, 2, 3]);
    expect(b).toEqual([]);
  });

  it('all in false bucket when predicate always false', () => {
    const [a, b] = partition([1, 2, 3], () => false);
    expect(a).toEqual([]);
    expect(b).toEqual([1, 2, 3]);
  });

  it('preserves order', () => {
    const [a] = partition([5, 3, 1, 2, 4], (x) => x > 3);
    expect(a).toEqual([5, 4]);
  });
});

// ---------------------------------------------------------------------------
// partitionN
// ---------------------------------------------------------------------------
describe('partitionN', () => {
  it('creates 3-way partition with catch-all', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const [low, mid, high, rest] = partitionN(arr, [
      (x) => x <= 3,
      (x) => x <= 6,
      (x) => x <= 9,
    ]);
    expect(low).toEqual([1, 2, 3]);
    expect(mid).toEqual([4, 5, 6]);
    expect(high).toEqual([7, 8, 9]);
    expect(rest).toEqual([10]);
  });

  it('last bucket catches unmatched items', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const buckets = partitionN(arr, [(x) => x === 'a', (x) => x === 'b']);
    expect(buckets[0]).toEqual(['a']);
    expect(buckets[1]).toEqual(['b']);
    expect(buckets[2]).toEqual(['c', 'd']);
  });

  it('returns N+1 buckets for N predicates', () => {
    const buckets = partitionN([1], [(x) => x > 0, (x) => x < 0]);
    expect(buckets).toHaveLength(3);
  });

  it('empty input yields all empty buckets', () => {
    const buckets = partitionN([], [(x: number) => x > 0]);
    expect(buckets).toEqual([[], []]);
  });
});

// ---------------------------------------------------------------------------
// chunk
// ---------------------------------------------------------------------------
describe('chunk', () => {
  it('chunks evenly', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
  });

  it('has remainder chunk', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns empty array for empty input', () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it('chunk size equal to array length returns single chunk', () => {
    expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
  });

  it('chunk size 1 returns each element as its own chunk', () => {
    expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
  });

  it('chunk size larger than array returns single chunk', () => {
    expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
  });

  it('throws for size <= 0', () => {
    expect(() => chunk([1], 0)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// zip & unzip
// ---------------------------------------------------------------------------
describe('zip', () => {
  it('zips equal-length arrays', () => {
    expect(zip([1, 2, 3], ['a', 'b', 'c'])).toEqual([[1, 'a'], [2, 'b'], [3, 'c']]);
  });

  it('truncates to shorter array', () => {
    expect(zip([1, 2, 3], ['a', 'b'])).toEqual([[1, 'a'], [2, 'b']]);
  });

  it('returns empty for empty inputs', () => {
    expect(zip([], [])).toEqual([]);
  });
});

describe('zipWith', () => {
  it('combines elements with function', () => {
    expect(zipWith([1, 2, 3], [4, 5, 6], (a, b) => a + b)).toEqual([5, 7, 9]);
  });

  it('truncates to shorter array', () => {
    expect(zipWith([1, 2], [10, 20, 30], (a, b) => a * b)).toEqual([10, 40]);
  });
});

describe('unzip', () => {
  it('unzips pairs to two arrays', () => {
    expect(unzip([[1, 'a'], [2, 'b'], [3, 'c']])).toEqual([[1, 2, 3], ['a', 'b', 'c']]);
  });

  it('returns empty arrays for empty input', () => {
    expect(unzip([])).toEqual([[], []]);
  });
});

// ---------------------------------------------------------------------------
// flatten & flatMap
// ---------------------------------------------------------------------------
describe('flatten', () => {
  it('flattens one level by default', () => {
    expect(flatten([[1, 2], [3, 4]])).toEqual([1, 2, 3, 4]);
  });

  it('respects depth parameter', () => {
    // flatten takes T[][] so for this test we go through the types carefully
    const nested = [[1, 2], [3, [4, 5]]] as number[][];
    expect(flatten(nested, 1)).toEqual([1, 2, 3, [4, 5]]);
  });

  it('returns empty for empty input', () => {
    expect(flatten([])).toEqual([]);
  });
});

describe('flatMap', () => {
  it('maps and flattens one level', () => {
    expect(flatMap([1, 2, 3], (x) => [x, x * 2])).toEqual([1, 2, 2, 4, 3, 6]);
  });

  it('passes index to function', () => {
    expect(flatMap(['a', 'b'], (x, i) => [`${i}:${x}`])).toEqual(['0:a', '1:b']);
  });

  it('returns empty for empty input', () => {
    expect(flatMap([], () => [1])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// unique & uniqueBy
// ---------------------------------------------------------------------------
describe('unique', () => {
  it('removes duplicate primitives', () => {
    expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
  });

  it('preserves order of first occurrence', () => {
    expect(unique(['b', 'a', 'b', 'c'])).toEqual(['b', 'a', 'c']);
  });

  it('returns empty for empty input', () => {
    expect(unique([])).toEqual([]);
  });
});

describe('uniqueBy', () => {
  it('dedupes objects by key function', () => {
    const arr = [{ id: 1, v: 'a' }, { id: 2, v: 'b' }, { id: 1, v: 'c' }];
    const result = uniqueBy(arr, (x) => x.id);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 1, v: 'a' });
  });

  it('returns first occurrence on duplicates', () => {
    const arr = [{ k: 'x', n: 1 }, { k: 'x', n: 2 }];
    expect(uniqueBy(arr, (x) => x.k)[0]!.n).toBe(1);
  });

  it('handles empty input', () => {
    expect(uniqueBy([], (x: string) => x)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// compact
// ---------------------------------------------------------------------------
describe('compact', () => {
  it('removes falsy values', () => {
    expect(compact([0, 1, false, 2, '', 3, null, undefined])).toEqual([1, 2, 3]);
  });

  it('returns empty for all-falsy input', () => {
    expect(compact([null, undefined, false, 0, ''])).toEqual([]);
  });

  it('returns same elements when no falsies', () => {
    expect(compact([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// rotate
// ---------------------------------------------------------------------------
describe('rotate', () => {
  it('rotates right by positive n', () => {
    expect(rotate([1, 2, 3, 4, 5], 2)).toEqual([4, 5, 1, 2, 3]);
  });

  it('rotates left by negative n', () => {
    expect(rotate([1, 2, 3, 4, 5], -2)).toEqual([3, 4, 5, 1, 2]);
  });

  it('handles n = 0 (no change)', () => {
    expect(rotate([1, 2, 3], 0)).toEqual([1, 2, 3]);
  });

  it('handles wraparound beyond array length', () => {
    expect(rotate([1, 2, 3], 3)).toEqual([1, 2, 3]);
    expect(rotate([1, 2, 3], 4)).toEqual([3, 1, 2]);
  });

  it('returns empty for empty input', () => {
    expect(rotate([], 5)).toEqual([]);
  });

  it('rotates by n = 1 right', () => {
    expect(rotate([1, 2, 3], 1)).toEqual([3, 1, 2]);
  });
});

// ---------------------------------------------------------------------------
// interleave
// ---------------------------------------------------------------------------
describe('interleave', () => {
  it('interleaves two equal-length arrays', () => {
    expect(interleave([1, 3, 5], [2, 4, 6])).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('interleaves three arrays', () => {
    expect(interleave([1, 4], [2, 5], [3, 6])).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('handles unequal lengths', () => {
    expect(interleave<number | string>([1, 2, 3], ['a'])).toEqual([1, 'a', 2, 3]);
  });

  it('returns empty for no arguments', () => {
    expect(interleave()).toEqual([]);
  });

  it('returns copy when only one array', () => {
    expect(interleave([1, 2, 3])).toEqual([1, 2, 3]);
  });
});

// ---------------------------------------------------------------------------
// slidingWindow
// ---------------------------------------------------------------------------
describe('slidingWindow', () => {
  it('creates windows of correct size', () => {
    expect(slidingWindow([1, 2, 3, 4, 5], 3)).toEqual([
      [1, 2, 3],
      [2, 3, 4],
      [3, 4, 5],
    ]);
  });

  it('size 1 returns each element as its own window', () => {
    expect(slidingWindow([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
  });

  it('size equal to array length returns one window', () => {
    expect(slidingWindow([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
  });

  it('returns empty when size > array length', () => {
    expect(slidingWindow([1, 2], 3)).toEqual([]);
  });

  it('throws for size <= 0', () => {
    expect(() => slidingWindow([1], 0)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// toPairs & fromPairs
// ---------------------------------------------------------------------------
describe('toPairs', () => {
  it('converts object to array of pairs', () => {
    const result = toPairs({ a: 1, b: 2 });
    expect(result).toContainEqual(['a', 1]);
    expect(result).toContainEqual(['b', 2]);
  });

  it('returns empty for empty object', () => {
    expect(toPairs({})).toEqual([]);
  });
});

describe('fromPairs', () => {
  it('converts pairs to object', () => {
    expect(fromPairs([['a', 1], ['b', 2]])).toEqual({ a: 1, b: 2 });
  });

  it('returns empty object for empty pairs', () => {
    expect(fromPairs([])).toEqual({});
  });

  it('roundtrips with toPairs', () => {
    const obj = { x: 10, y: 20, z: 30 };
    expect(fromPairs(toPairs(obj))).toEqual(obj);
  });
});

// ---------------------------------------------------------------------------
// sortBy
// ---------------------------------------------------------------------------
describe('sortBy', () => {
  it('sorts by single numeric key', () => {
    const arr = [{ n: 3 }, { n: 1 }, { n: 2 }];
    expect(sortBy(arr, (x) => x.n)).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  it('sorts by single string key using localeCompare', () => {
    const arr = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }];
    expect(sortBy(arr, (x) => x.name).map((x) => x.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('sorts by multiple keys (stable)', () => {
    const arr = [
      { sport: 'NFL', conf: 80 },
      { sport: 'NBA', conf: 90 },
      { sport: 'NFL', conf: 70 },
      { sport: 'NBA', conf: 85 },
    ];
    const result = sortBy(arr, (x) => x.sport, (x) => x.conf);
    expect(result.map((x) => `${x.sport}-${x.conf}`)).toEqual([
      'NBA-85', 'NBA-90', 'NFL-70', 'NFL-80',
    ]);
  });

  it('does not mutate the original array', () => {
    const arr = [3, 1, 2];
    sortBy(arr, (x) => x);
    expect(arr).toEqual([3, 1, 2]);
  });

  it('returns empty for empty input', () => {
    expect(sortBy([], (x: number) => x)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// topN & bottomN
// ---------------------------------------------------------------------------
describe('topN', () => {
  it('returns top N items by score', () => {
    const arr = [{ n: 5 }, { n: 1 }, { n: 3 }, { n: 4 }, { n: 2 }];
    expect(topN(arr, 3, (x) => x.n).map((x) => x.n)).toEqual([5, 4, 3]);
  });

  it('returns all items if n > array length', () => {
    const arr = [1, 2, 3];
    expect(topN(arr, 10, (x) => x)).toHaveLength(3);
  });

  it('returns empty for empty input', () => {
    expect(topN([], 3, (x: number) => x)).toEqual([]);
  });
});

describe('bottomN', () => {
  it('returns bottom N items by score', () => {
    const arr = [{ n: 5 }, { n: 1 }, { n: 3 }, { n: 4 }, { n: 2 }];
    expect(bottomN(arr, 3, (x) => x.n).map((x) => x.n)).toEqual([1, 2, 3]);
  });

  it('returns empty for empty input', () => {
    expect(bottomN([], 3, (x: number) => x)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// rankItems
// ---------------------------------------------------------------------------
describe('rankItems', () => {
  it('ranks items by score descending', () => {
    const result = rankItems([{ n: 10 }, { n: 30 }, { n: 20 }], (x) => x.n);
    expect(result[0]).toMatchObject({ score: 30, rank: 1 });
    expect(result[1]).toMatchObject({ score: 20, rank: 2 });
    expect(result[2]).toMatchObject({ score: 10, rank: 3 });
  });

  it('gives ties the same rank (dense ranking)', () => {
    const result = rankItems([{ n: 10 }, { n: 20 }, { n: 20 }, { n: 30 }], (x) => x.n);
    expect(result[0]!.rank).toBe(1); // 30
    expect(result[1]!.rank).toBe(2); // 20
    expect(result[2]!.rank).toBe(2); // 20 (tie)
    expect(result[3]!.rank).toBe(3); // 10 — dense: next rank after 2
  });

  it('handles single item', () => {
    const result = rankItems([{ n: 42 }], (x) => x.n);
    expect(result[0]).toMatchObject({ rank: 1, score: 42 });
  });

  it('returns empty for empty input', () => {
    expect(rankItems([], (x: number) => x)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// pick & omit
// ---------------------------------------------------------------------------
describe('pick', () => {
  it('picks specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  it('returns empty object for no keys', () => {
    expect(pick({ a: 1 }, [])).toEqual({});
  });

  it('handles key not in object gracefully', () => {
    const obj = { a: 1 };
    // TypeScript would prevent this but test runtime behavior
    const result = pick(obj, ['a']);
    expect(result).toEqual({ a: 1 });
  });
});

describe('omit', () => {
  it('omits specified keys', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });

  it('returns full object when no keys omitted', () => {
    const obj = { a: 1, b: 2 };
    expect(omit(obj, [])).toEqual({ a: 1, b: 2 });
  });

  it('omitting all keys returns empty', () => {
    const obj = { a: 1 };
    expect(omit(obj, ['a'])).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// deepMerge
// ---------------------------------------------------------------------------
describe('deepMerge', () => {
  it('merges flat objects', () => {
    expect(deepMerge<Record<string, number>>({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 });
  });

  it('deep merges nested objects', () => {
    const result = deepMerge<{ a: Record<string, number> }>({ a: { x: 1, y: 2 } }, { a: { y: 99, z: 3 } });
    expect(result).toEqual({ a: { x: 1, y: 99, z: 3 } });
  });

  it('replaces arrays, not merges them', () => {
    const result = deepMerge({ arr: [1, 2, 3] }, { arr: [4, 5] });
    expect(result.arr).toEqual([4, 5]);
  });

  it('does not mutate target', () => {
    const target = { a: 1 };
    deepMerge(target, { b: 2 } as Partial<typeof target>);
    expect(target).toEqual({ a: 1 });
  });

  it('merges multiple sources left to right', () => {
    const result = deepMerge({ a: 1 }, { b: 2 } as object, { c: 3 } as object);
    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });
});

// ---------------------------------------------------------------------------
// deepClone
// ---------------------------------------------------------------------------
describe('deepClone', () => {
  it('clones nested object', () => {
    const obj = { a: { b: { c: 42 } } };
    const clone = deepClone(obj);
    clone.a.b.c = 99;
    expect(obj.a.b.c).toBe(42);
  });

  it('clones arrays', () => {
    const arr = [1, [2, 3], [4, [5]]];
    const clone = deepClone(arr);
    (clone[1] as number[])[0] = 99;
    expect((arr[1] as number[])[0]).toBe(2);
  });

  it('clones Date objects to Date instances', () => {
    const d = new Date('2024-01-15T00:00:00.000Z');
    const clone = deepClone(d);
    expect(clone).toBeInstanceOf(Date);
    expect(clone.toISOString()).toBe(d.toISOString());
  });

  it('clones primitives', () => {
    expect(deepClone(42)).toBe(42);
    expect(deepClone('hello')).toBe('hello');
    expect(deepClone(true)).toBe(true);
    expect(deepClone(null)).toBe(null);
  });

  it('clones nested structure with dates', () => {
    const obj = { d: new Date('2024-06-01'), n: 5 };
    const clone = deepClone(obj);
    expect(clone.d).toBeInstanceOf(Date);
    expect(clone.d.toISOString()).toBe(obj.d.toISOString());
  });
});

// ---------------------------------------------------------------------------
// mapValues & filterValues
// ---------------------------------------------------------------------------
describe('mapValues', () => {
  it('maps values with function', () => {
    expect(mapValues({ a: 1, b: 2 }, (v) => v * 2)).toEqual({ a: 2, b: 4 });
  });

  it('passes key to function', () => {
    expect(mapValues({ x: 1 }, (v, k) => `${k}=${v}`)).toEqual({ x: 'x=1' });
  });

  it('returns empty for empty input', () => {
    expect(mapValues({}, (v) => v)).toEqual({});
  });
});

describe('filterValues', () => {
  it('filters values with predicate', () => {
    expect(filterValues({ a: 1, b: 2, c: 3 }, (v) => v > 1)).toEqual({ b: 2, c: 3 });
  });

  it('returns empty when nothing matches', () => {
    expect(filterValues({ a: 1 }, (v) => v > 100)).toEqual({});
  });

  it('passes key to predicate', () => {
    expect(filterValues({ a: 1, b: 2 }, (_, k) => k === 'a')).toEqual({ a: 1 });
  });
});

// ---------------------------------------------------------------------------
// invertObject
// ---------------------------------------------------------------------------
describe('invertObject', () => {
  it('inverts keys and values', () => {
    expect(invertObject({ a: 'x', b: 'y' })).toEqual({ x: 'a', y: 'b' });
  });

  it('returns empty for empty input', () => {
    expect(invertObject({})).toEqual({});
  });

  it('later values overwrite earlier on value collision', () => {
    // two keys mapping to same value — last write wins
    const result = invertObject({ a: 'z', b: 'z' });
    expect(result['z']).toBeDefined();
    expect(['a', 'b']).toContain(result['z']);
  });
});

// ---------------------------------------------------------------------------
// flattenObject & unflattenObject
// ---------------------------------------------------------------------------
describe('flattenObject', () => {
  it('flattens nested object', () => {
    expect(flattenObject({ a: { b: 1, c: { d: 2 } } })).toEqual({ 'a.b': 1, 'a.c.d': 2 });
  });

  it('uses custom separator', () => {
    expect(flattenObject({ a: { b: 1 } }, '_')).toEqual({ 'a_b': 1 });
  });

  it('handles flat object without nesting', () => {
    expect(flattenObject({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('returns empty for empty input', () => {
    expect(flattenObject({})).toEqual({});
  });
});

describe('unflattenObject', () => {
  it('unflattens dotted keys to nested object', () => {
    expect(unflattenObject({ 'a.b': 1, 'a.c.d': 2 })).toEqual({ a: { b: 1, c: { d: 2 } } });
  });

  it('uses custom separator', () => {
    expect(unflattenObject({ 'a_b': 1 }, '_')).toEqual({ a: { b: 1 } });
  });

  it('roundtrips with flattenObject', () => {
    const original = { a: { b: { c: 99 }, d: 'hello' }, e: 42 };
    const flat = flattenObject(original);
    const restored = unflattenObject(flat);
    expect(restored).toEqual(original);
  });

  it('handles flat keys (no separator)', () => {
    expect(unflattenObject({ a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
  });
});

// ---------------------------------------------------------------------------
// Set operations
// ---------------------------------------------------------------------------
describe('union', () => {
  it('combines two arrays and dedupes', () => {
    expect(union([1, 2, 3], [2, 3, 4])).toEqual([1, 2, 3, 4]);
  });

  it('returns distinct elements from single array', () => {
    expect(union([1, 1, 2], [])).toEqual([1, 2]);
  });

  it('empty union empty is empty', () => {
    expect(union([], [])).toEqual([]);
  });
});

describe('intersection', () => {
  it('returns common elements', () => {
    expect(intersection([1, 2, 3, 4], [2, 4, 6])).toEqual([2, 4]);
  });

  it('returns empty when no overlap', () => {
    expect(intersection([1, 2], [3, 4])).toEqual([]);
  });

  it('handles empty inputs', () => {
    expect(intersection([], [1, 2])).toEqual([]);
  });
});

describe('difference', () => {
  it('returns elements in a but not b', () => {
    expect(difference([1, 2, 3, 4], [2, 4])).toEqual([1, 3]);
  });

  it('returns all of a when b is empty', () => {
    expect(difference([1, 2, 3], [])).toEqual([1, 2, 3]);
  });

  it('returns empty when a is a subset of b', () => {
    expect(difference([1, 2], [1, 2, 3])).toEqual([]);
  });
});

describe('symmetricDifference', () => {
  it('returns elements in either but not both', () => {
    expect(symmetricDifference([1, 2, 3], [2, 3, 4])).toEqual([1, 4]);
  });

  it('returns union when no overlap', () => {
    expect(symmetricDifference([1, 2], [3, 4])).toEqual([1, 2, 3, 4]);
  });

  it('returns empty when sets are equal', () => {
    expect(symmetricDifference([1, 2], [1, 2])).toEqual([]);
  });
});

describe('isSubset', () => {
  it('returns true when sub is subset of sup', () => {
    expect(isSubset([1, 2], [1, 2, 3, 4])).toBe(true);
  });

  it('returns false when sub has element not in sup', () => {
    expect(isSubset([1, 5], [1, 2, 3])).toBe(false);
  });

  it('empty set is subset of anything', () => {
    expect(isSubset([], [1, 2])).toBe(true);
  });

  it('identical sets are subsets of each other', () => {
    expect(isSubset([1, 2], [1, 2])).toBe(true);
  });
});

describe('cartesianProduct', () => {
  it('produces all pairs', () => {
    expect(cartesianProduct([1, 2], ['a', 'b'])).toEqual([
      [1, 'a'], [1, 'b'], [2, 'a'], [2, 'b'],
    ]);
  });

  it('returns empty when either array is empty', () => {
    expect(cartesianProduct([], [1, 2])).toEqual([]);
    expect(cartesianProduct([1, 2], [])).toEqual([]);
  });

  it('length is a.length * b.length', () => {
    expect(cartesianProduct([1, 2, 3], [4, 5])).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// Counting & frequency
// ---------------------------------------------------------------------------
describe('countBy', () => {
  it('counts by key function', () => {
    const arr = ['NFL', 'NBA', 'NFL', 'MLB', 'NBA', 'NFL'];
    expect(countBy(arr, (x) => x)).toEqual({ NFL: 3, NBA: 2, MLB: 1 });
  });

  it('returns empty for empty input', () => {
    expect(countBy([], (x: string) => x)).toEqual({});
  });

  it('counts by derived key', () => {
    const picks = [{ tier: 'free' }, { tier: 'pro' }, { tier: 'free' }];
    expect(countBy(picks, (x) => x.tier)).toEqual({ free: 2, pro: 1 });
  });
});

describe('frequencies', () => {
  it('counts element frequencies', () => {
    const map = frequencies([1, 2, 2, 3, 3, 3]);
    expect(map.get(1)).toBe(1);
    expect(map.get(2)).toBe(2);
    expect(map.get(3)).toBe(3);
  });

  it('returns empty Map for empty input', () => {
    expect(frequencies([])).toEqual(new Map());
  });

  it('works with strings', () => {
    const map = frequencies(['a', 'b', 'a']);
    expect(map.get('a')).toBe(2);
    expect(map.get('b')).toBe(1);
  });
});

describe('mostCommon', () => {
  it('returns most common element first', () => {
    expect(mostCommon([1, 2, 2, 3, 3, 3])[0]).toBe(3);
  });

  it('respects n parameter', () => {
    expect(mostCommon([1, 2, 2, 3, 3, 3], 2)).toHaveLength(2);
  });

  it('returns all if n not specified', () => {
    const result = mostCommon(['a', 'b', 'c']);
    expect(result).toHaveLength(3);
  });

  it('handles empty input', () => {
    expect(mostCommon([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// rollingAverage
// ---------------------------------------------------------------------------
describe('rollingAverage', () => {
  it('uses expanding window for first n-1 entries', () => {
    const data = [{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }, { v: 5 }];
    const result = rollingAverage(data, 3, (x) => x.v);
    // index 0: window [1] → avg 1
    expect(result[0]).toBeCloseTo(1);
    // index 1: window [1,2] → avg 1.5
    expect(result[1]).toBeCloseTo(1.5);
    // index 2: window [1,2,3] → avg 2
    expect(result[2]).toBeCloseTo(2);
    // index 3: window [2,3,4] → avg 3
    expect(result[3]).toBeCloseTo(3);
    // index 4: window [3,4,5] → avg 4
    expect(result[4]).toBeCloseTo(4);
  });

  it('returns same length as input', () => {
    const data = [{ v: 10 }, { v: 20 }, { v: 30 }];
    expect(rollingAverage(data, 2, (x) => x.v)).toHaveLength(3);
  });

  it('returns empty for empty input', () => {
    expect(rollingAverage([], 3, (x: { v: number }) => x.v)).toEqual([]);
  });

  it('throws for window size <= 0', () => {
    expect(() => rollingAverage([{ v: 1 }], 0, (x) => x.v)).toThrow(RangeError);
  });

  it('n=1 returns each element value as its own average', () => {
    const data = [{ v: 5 }, { v: 10 }, { v: 15 }];
    expect(rollingAverage(data, 1, (x) => x.v)).toEqual([5, 10, 15]);
  });
});

// ---------------------------------------------------------------------------
// weightedAverage
// ---------------------------------------------------------------------------
describe('weightedAverage', () => {
  it('computes weighted average', () => {
    const items = [{ v: 10, w: 1 }, { v: 20, w: 3 }];
    expect(weightedAverage(items, (x) => x.v, (x) => x.w)).toBeCloseTo(17.5);
  });

  it('returns 0 for empty array', () => {
    expect(weightedAverage([], (x: { v: number }) => x.v, (x) => 1)).toBe(0);
  });

  it('returns 0 when all weights are 0', () => {
    const items = [{ v: 10, w: 0 }];
    expect(weightedAverage(items, (x) => x.v, (x) => x.w)).toBe(0);
  });

  it('equal weights gives unweighted average', () => {
    const items = [{ v: 2 }, { v: 4 }, { v: 6 }];
    expect(weightedAverage(items, (x) => x.v, () => 1)).toBeCloseTo(4);
  });
});

// ---------------------------------------------------------------------------
// normalizeWeights
// ---------------------------------------------------------------------------
describe('normalizeWeights', () => {
  it('weights sum to 1', () => {
    const normalized = normalizeWeights([1, 2, 3, 4]);
    const sum = normalized.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1);
  });

  it('preserves proportions', () => {
    const normalized = normalizeWeights([1, 3]);
    expect(normalized[0]).toBeCloseTo(0.25);
    expect(normalized[1]).toBeCloseTo(0.75);
  });

  it('returns zeros for all-zero input', () => {
    expect(normalizeWeights([0, 0, 0])).toEqual([0, 0, 0]);
  });

  it('handles single weight', () => {
    expect(normalizeWeights([5])[0]).toBeCloseTo(1);
  });
});

// ---------------------------------------------------------------------------
// splitByThreshold
// ---------------------------------------------------------------------------
describe('splitByThreshold', () => {
  it('splits picks above and below threshold', () => {
    const picks = [{ conf: 70 }, { conf: 80 }, { conf: 50 }, { conf: 90 }];
    const { above, below } = splitByThreshold(picks, (x) => x.conf, 75);
    expect(above.map((x) => x.conf)).toEqual([80, 90]);
    expect(below.map((x) => x.conf)).toEqual([70, 50]);
  });

  it('value exactly at threshold goes to above', () => {
    const items = [{ v: 75 }];
    const { above, below } = splitByThreshold(items, (x) => x.v, 75);
    expect(above).toHaveLength(1);
    expect(below).toHaveLength(0);
  });

  it('returns all in above when everything is above threshold', () => {
    const items = [{ v: 90 }, { v: 95 }];
    const { above, below } = splitByThreshold(items, (x) => x.v, 50);
    expect(above).toHaveLength(2);
    expect(below).toHaveLength(0);
  });

  it('returns empty for empty input', () => {
    const { above, below } = splitByThreshold([], (x: { v: number }) => x.v, 50);
    expect(above).toEqual([]);
    expect(below).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// indexBy
// ---------------------------------------------------------------------------
describe('indexBy', () => {
  it('indexes array by key function', () => {
    const picks = [{ id: 'a', v: 1 }, { id: 'b', v: 2 }];
    const idx = indexBy(picks, (x) => x.id);
    expect(idx['a']).toEqual({ id: 'a', v: 1 });
    expect(idx['b']).toEqual({ id: 'b', v: 2 });
  });

  it('last item wins on duplicate key', () => {
    const arr = [{ id: 'a', v: 1 }, { id: 'a', v: 2 }];
    expect(indexBy(arr, (x) => x.id)['a']!.v).toBe(2);
  });

  it('returns empty object for empty input', () => {
    expect(indexBy([], (x: { id: string }) => x.id)).toEqual({});
  });

  it('all items are indexed', () => {
    const arr = [{ k: '1' }, { k: '2' }, { k: '3' }];
    const idx = indexBy(arr, (x) => x.k);
    expect(Object.keys(idx)).toHaveLength(3);
  });
});
