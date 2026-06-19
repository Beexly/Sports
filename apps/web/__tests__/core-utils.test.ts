import { describe, it, expect } from "vitest";
import {
  chunk,
  groupBy,
  partition,
  unique,
  uniqueBy,
  sortBy,
  sortByDesc,
  zip,
  zip3,
  flatten,
  take,
  drop,
  takeLast,
  minBy,
  maxBy,
  sum,
  sumBy,
  mean,
  meanBy,
  countBy,
  range,
  rotate,
  windows,
  interleave,
  indexBy,
  frequencies,
  rankBy,
} from "@/lib/utils/array-utils";
import {
  slugify,
  truncate,
  truncateWords,
  titleCase,
  capitalize,
  camelCase,
  snakeCase,
  kebabCase,
  padLeft,
  padRight,
  repeat,
  highlightSegments,
  countOccurrences,
  stripHtml,
  escapeHtml,
  normalizeWhitespace,
  initials,
  hashCode,
  hashToColor,
  pluralize,
  ordinal,
  isUrl,
  extractDomain,
  maskEnd,
  formatBytes,
} from "@/lib/utils/string-utils";
import {
  shannonEntropy,
  binaryEntropy,
  klDivergence,
  jensenShannonDivergence,
  crossEntropy,
  logLoss,
  meanLogLoss,
  brierScore,
  brierDecompose,
  normalizedEntropy,
  perplexity,
} from "@/lib/math/entropy";
import {
  variancePop,
  varianceSample,
  stdDevPop,
  stdDevSample,
  zScore,
  zScores,
  median,
  mode,
  quantile,
  iqr,
  pearsonCorrelation,
  spearmanCorrelation,
  linearRegression,
  movingAverage,
  exponentialMovingAverage,
  cumSum,
  normalize,
  standardize,
  detectOutliers,
  rmse,
  mae,
} from "@/lib/math/statistics";
import {
  startOfDayUtc,
  endOfDayUtc,
  startOfWeekUtc,
  isSameDayUtc,
  isToday,
  isTomorrow,
  isPast,
  isFuture,
  addDays,
  addHours,
  diffDays,
  diffHours,
  isoWeekNumber,
  formatGameDate,
  formatGameTime,
  groupByDay,
  isWeekend,
  formatDuration,
  timeUntil,
  dateRange,
  parseDate,
} from "@/lib/utils/date-utils";

// ─── array-utils ─────────────────────────────────────────────────────────────

describe("chunk", () => {
  it("splits into even chunks", () => expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]));
  it("last chunk is partial", () => expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]));
  it("size=1 returns each element", () => expect(chunk([1, 2], 1)).toEqual([[1], [2]]));
  it("size larger than array", () => expect(chunk([1, 2], 10)).toEqual([[1, 2]]));
  it("empty array", () => expect(chunk([], 3)).toEqual([]));
  it("size < 1 returns []", () => expect(chunk([1, 2], 0)).toEqual([]));
});

describe("groupBy", () => {
  it("groups by value", () => {
    const result = groupBy([1, 2, 3, 4], (n) => n % 2);
    expect(result.get(0)).toEqual([2, 4]);
    expect(result.get(1)).toEqual([1, 3]);
  });
  it("empty array", () => expect(groupBy([], (x: number) => x).size).toBe(0));
});

describe("partition", () => {
  it("splits into two groups", () => {
    const [evens, odds] = partition([1, 2, 3, 4, 5], (n) => n % 2 === 0);
    expect(evens).toEqual([2, 4]);
    expect(odds).toEqual([1, 3, 5]);
  });
  it("all match", () => expect(partition([2, 4], (n) => n % 2 === 0)).toEqual([[2, 4], []]));
  it("none match", () => expect(partition([1, 3], (n) => n % 2 === 0)).toEqual([[], [1, 3]]));
});

describe("unique", () => {
  it("removes duplicates", () => expect(unique([1, 2, 1, 3, 2])).toEqual([1, 2, 3]));
  it("empty array", () => expect(unique([])).toEqual([]));
});

describe("uniqueBy", () => {
  it("keeps first occurrence by key", () => {
    const result = uniqueBy([{ id: 1, v: "a" }, { id: 1, v: "b" }, { id: 2, v: "c" }], (x) => x.id);
    expect(result).toHaveLength(2);
    expect(result[0]!.v).toBe("a");
  });
});

describe("sortBy", () => {
  it("sorts ascending by key", () => {
    expect(sortBy([{ n: 3 }, { n: 1 }, { n: 2 }], (x) => x.n)).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });
  it("preserves original array", () => {
    const arr = [3, 1, 2];
    sortBy(arr, (x) => x);
    expect(arr).toEqual([3, 1, 2]);
  });
});

describe("sortByDesc", () => {
  it("sorts descending", () => expect(sortByDesc([1, 3, 2], (x) => x)).toEqual([3, 2, 1]));
});

describe("zip", () => {
  it("zips two equal-length arrays", () => expect(zip([1, 2], ["a", "b"])).toEqual([[1, "a"], [2, "b"]]));
  it("stops at shorter array", () => expect(zip([1, 2, 3], ["a"])).toEqual([[1, "a"]]));
});

describe("zip3", () => {
  it("zips three arrays", () => expect(zip3([1], [2], [3])).toEqual([[1, 2, 3]]));
});

describe("flatten", () => {
  it("flattens one level", () => expect(flatten([[1, 2], [3, 4]])).toEqual([1, 2, 3, 4]));
  it("empty subarrays", () => expect(flatten([[], [1]])).toEqual([1]));
});

describe("take / drop / takeLast", () => {
  it("take 2", () => expect(take([1, 2, 3, 4], 2)).toEqual([1, 2]));
  it("drop 2", () => expect(drop([1, 2, 3, 4], 2)).toEqual([3, 4]));
  it("takeLast 2", () => expect(takeLast([1, 2, 3, 4], 2)).toEqual([3, 4]));
  it("take 0", () => expect(take([1, 2], 0)).toEqual([]));
  it("takeLast 0", () => expect(takeLast([1, 2], 0)).toEqual([]));
});

describe("minBy / maxBy", () => {
  it("minBy", () => expect(minBy([{ v: 3 }, { v: 1 }, { v: 2 }], (x) => x.v)).toEqual({ v: 1 }));
  it("maxBy", () => expect(maxBy([{ v: 3 }, { v: 1 }, { v: 2 }], (x) => x.v)).toEqual({ v: 3 }));
  it("empty returns undefined", () => expect(minBy([], (x: number) => x)).toBeUndefined());
});

describe("sum / sumBy / mean / meanBy / countBy", () => {
  it("sum", () => expect(sum([1, 2, 3])).toBe(6));
  it("sumBy", () => expect(sumBy([{ n: 1 }, { n: 2 }], (x) => x.n)).toBe(3));
  it("mean", () => expect(mean([1, 2, 3])).toBe(2));
  it("mean empty", () => expect(mean([])).toBeNull());
  it("meanBy", () => expect(meanBy([{ n: 2 }, { n: 4 }], (x) => x.n)).toBe(3));
  it("countBy", () => expect(countBy([1, 2, 3, 4], (n) => n % 2 === 0)).toBe(2));
});

describe("range", () => {
  it("basic range", () => expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]));
  it("with step", () => expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8]));
  it("empty when start >= end", () => expect(range(5, 5)).toEqual([]));
});

describe("rotate", () => {
  it("rotates left", () => expect(rotate([1, 2, 3, 4], 1)).toEqual([2, 3, 4, 1]));
  it("rotate 0", () => expect(rotate([1, 2, 3], 0)).toEqual([1, 2, 3]));
  it("rotate by length", () => expect(rotate([1, 2, 3], 3)).toEqual([1, 2, 3]));
});

describe("windows", () => {
  it("produces sliding windows", () => expect(windows([1, 2, 3, 4], 3)).toEqual([[1, 2, 3], [2, 3, 4]]));
  it("window > array → empty", () => expect(windows([1, 2], 5)).toEqual([]));
});

describe("interleave", () => {
  it("interleaves two arrays", () => expect(interleave([1, 3], [2, 4])).toEqual([1, 2, 3, 4]));
  it("unequal lengths", () => expect(interleave([1, 3, 5], [2])).toEqual([1, 2, 3, 5]));
});

describe("indexBy", () => {
  it("creates lookup map", () => {
    const map = indexBy([{ id: "a", v: 1 }, { id: "b", v: 2 }], (x) => x.id);
    expect(map.get("a")!.v).toBe(1);
  });
});

describe("frequencies", () => {
  it("counts occurrences", () => {
    const f = frequencies(["a", "b", "a"]);
    expect(f.get("a")).toBe(2);
    expect(f.get("b")).toBe(1);
  });
});

describe("rankBy", () => {
  it("ranks descending with ties (competition ranking: 1,1,3)", () => {
    const result = rankBy([{ v: 10 }, { v: 5 }, { v: 10 }], (x) => x.v, "desc");
    expect(result.find((r) => r.v === 5)!.rank).toBe(3);
    expect(result.filter((r) => r.v === 10).every((r) => r.rank === 1)).toBe(true);
  });
});

// ─── string-utils ─────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("basic", () => expect(slugify("Hello World")).toBe("hello-world"));
  it("strips special chars", () => expect(slugify("Kansas City Chiefs!")).toBe("kansas-city-chiefs"));
  it("collapses spaces", () => expect(slugify("  foo  bar  ")).toBe("foo-bar"));
  it("collapses dashes", () => expect(slugify("foo--bar")).toBe("foo-bar"));
});

describe("truncate", () => {
  it("no-op when short", () => expect(truncate("Hello", 10)).toBe("Hello"));
  it("truncates with ellipsis", () => expect(truncate("Hello World", 8)).toBe("Hello..."));
});

describe("truncateWords", () => {
  it("truncates at word boundary", () => expect(truncateWords("Hello World Foo", 14)).toBe("Hello World..."));
  it("no-op when fits", () => expect(truncateWords("Hi", 10)).toBe("Hi"));
});

describe("titleCase", () => {
  it("capitalizes each word", () => expect(titleCase("hello world")).toBe("Hello World"));
});

describe("capitalize", () => {
  it("first letter only", () => expect(capitalize("hello world")).toBe("Hello world"));
  it("empty string", () => expect(capitalize("")).toBe(""));
});

describe("camelCase / snakeCase / kebabCase", () => {
  it("camelCase", () => expect(camelCase("hello-world_foo")).toBe("helloWorldFoo"));
  it("snakeCase from camel", () => expect(snakeCase("helloWorld")).toBe("hello_world"));
  it("kebabCase from camel", () => expect(kebabCase("helloWorld")).toBe("hello-world"));
});

describe("padLeft / padRight / repeat", () => {
  it("padLeft with zeros", () => expect(padLeft("5", 3, "0")).toBe("005"));
  it("padRight with space", () => expect(padRight("hi", 4)).toBe("hi  "));
  it("repeat", () => expect(repeat("ab", 3)).toBe("ababab"));
  it("repeat 0", () => expect(repeat("ab", 0)).toBe(""));
});

describe("highlight", () => {
  it("returns unsplit text when no query", () => {
    const segments = highlightSegments("Hello", "");
    expect(segments[0]!.text).toBe("Hello");
    expect(segments[0]!.highlight).toBeUndefined();
  });
  it("marks matching segment", () => {
    const segments = highlightSegments("Hello World", "world");
    const matched = segments.find((s) => s.highlight);
    expect(matched?.text.toLowerCase()).toBe("world");
  });
});

describe("countOccurrences", () => {
  it("counts matches", () => expect(countOccurrences("abcabc", "abc")).toBe(2));
  it("empty sub returns 0", () => expect(countOccurrences("abc", "")).toBe(0));
});

describe("stripHtml / escapeHtml", () => {
  it("strips tags", () => expect(stripHtml("<p>Hello <b>World</b></p>")).toBe("Hello World"));
  it("escapes html chars", () => expect(escapeHtml("<>&\"'")).toBe("&lt;&gt;&amp;&quot;&#39;"));
});

describe("normalizeWhitespace", () => {
  it("collapses spaces", () => expect(normalizeWhitespace("  foo  bar  ")).toBe("foo bar"));
});

describe("initials", () => {
  it("full name", () => expect(initials("John Michael Smith")).toBe("JMS"));
  it("two words", () => expect(initials("LeBron James")).toBe("LJ"));
  it("max chars", () => expect(initials("A B C D", 2)).toBe("AB"));
});

describe("hashCode / hashToColor", () => {
  it("same input same hash", () => expect(hashCode("hello")).toBe(hashCode("hello")));
  it("different inputs different hashes", () => expect(hashCode("a")).not.toBe(hashCode("b")));
  it("hashToColor returns hex", () => expect(hashToColor("test")).toMatch(/^#[0-9a-f]{6}$/));
});

describe("pluralize / ordinal", () => {
  it("pluralize 1", () => expect(pluralize(1, "pick")).toBe("pick"));
  it("pluralize 2", () => expect(pluralize(2, "pick")).toBe("picks"));
  it("ordinal 1st", () => expect(ordinal(1)).toBe("1st"));
  it("ordinal 2nd", () => expect(ordinal(2)).toBe("2nd"));
  it("ordinal 3rd", () => expect(ordinal(3)).toBe("3rd"));
  it("ordinal 11th", () => expect(ordinal(11)).toBe("11th"));
  it("ordinal 12th", () => expect(ordinal(12)).toBe("12th"));
  it("ordinal 21st", () => expect(ordinal(21)).toBe("21st"));
});

describe("isUrl / extractDomain", () => {
  it("valid https URL", () => expect(isUrl("https://example.com")).toBe(true));
  it("invalid", () => expect(isUrl("not a url")).toBe(false));
  it("extracts domain", () => expect(extractDomain("https://www.example.com/path")).toBe("example.com"));
  it("null on bad url", () => expect(extractDomain("not a url")).toBeNull());
});

describe("maskEnd", () => {
  it("masks all but last 4", () => expect(maskEnd("ABCDE1234", 4)).toBe("*****1234"));
  it("short string passes through", () => expect(maskEnd("AB", 4)).toBe("AB"));
});

describe("formatBytes", () => {
  it("bytes", () => expect(formatBytes(0)).toBe("0 B"));
  it("kilobytes", () => expect(formatBytes(1536)).toBe("1.5 KB"));
  it("megabytes", () => expect(formatBytes(1_048_576)).toBe("1 MB"));
});

// ─── entropy ─────────────────────────────────────────────────────────────────

describe("shannonEntropy", () => {
  it("uniform binary → 1 bit", () => expect(shannonEntropy([0.5, 0.5])).toBeCloseTo(1.0, 4));
  it("certain outcome → 0 bits", () => expect(shannonEntropy([1, 0])).toBeCloseTo(0, 4));
  it("uniform 4-way → 2 bits", () => expect(shannonEntropy([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(2.0, 4));
});

describe("binaryEntropy", () => {
  it("p=0.5 → 1.0", () => expect(binaryEntropy(0.5)).toBeCloseTo(1.0, 4));
  it("p=0 → 0", () => expect(binaryEntropy(0)).toBe(0));
  it("p=1 → 0", () => expect(binaryEntropy(1)).toBe(0));
});

describe("klDivergence", () => {
  it("same distribution → 0", () => expect(klDivergence([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 6));
  it("q=0 where p>0 → Infinity", () => expect(klDivergence([0.5, 0.5], [1, 0])).toBe(Infinity));
  it("different lengths → Infinity", () => expect(klDivergence([0.5], [0.3, 0.7])).toBe(Infinity));
});

describe("jensenShannonDivergence", () => {
  it("same → 0", () => expect(jensenShannonDivergence([0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 6));
  it("bounded ≤ 1", () => {
    const jsd = jensenShannonDivergence([1, 0], [0, 1]);
    expect(jsd).toBeGreaterThanOrEqual(0);
    expect(jsd).toBeLessThanOrEqual(1);
  });
});

describe("crossEntropy", () => {
  it("H(P,P) = H(P)", () => {
    const p = [0.6, 0.4];
    const hP = shannonEntropy(p);
    expect(crossEntropy(p, p)).toBeCloseTo(hP, 4);
  });
});

describe("logLoss", () => {
  it("perfect prediction → low loss", () => expect(logLoss(1, 0.99)).toBeLessThan(0.02));
  it("terrible prediction → high loss", () => expect(logLoss(1, 0.01)).toBeGreaterThan(6));
  it("random prediction → 1 bit", () => expect(logLoss(1, 0.5)).toBeCloseTo(1.0, 4));
});

describe("meanLogLoss", () => {
  it("empty → null", () => expect(meanLogLoss([])).toBeNull());
  it("computes mean", () => {
    const result = meanLogLoss([
      { actual: 1, predicted: 0.8 },
      { actual: 0, predicted: 0.2 },
    ]);
    expect(result).toBeGreaterThan(0);
  });
});

describe("brierScore", () => {
  it("empty → null", () => expect(brierScore([])).toBeNull());
  it("perfect → 0", () => expect(brierScore([{ actual: 1, predicted: 1 }])).toBeCloseTo(0, 4));
  it("random → 0.25", () => expect(brierScore([{ actual: 1, predicted: 0.5 }, { actual: 0, predicted: 0.5 }])).toBeCloseTo(0.25, 4));
});

describe("brierDecompose", () => {
  it("returns null for empty", () => expect(brierDecompose([])).toBeNull());
  it("brier ≈ reliability - resolution + uncertainty", () => {
    const data = Array.from({ length: 100 }, (_, i) => ({
      actual: (i % 2 === 0 ? 1 : 0) as 0 | 1,
      predicted: i % 2 === 0 ? 0.7 : 0.3,
    }));
    const result = brierDecompose(data)!;
    expect(result.brier).toBeGreaterThanOrEqual(0);
    expect(Math.abs(result.brier - (result.reliability - result.resolution + result.uncertainty))).toBeLessThan(0.001);
  });
});

describe("normalizedEntropy / perplexity", () => {
  it("normalizedEntropy uniform → 1", () => expect(normalizedEntropy([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(1.0, 4));
  it("normalizedEntropy certain → 0", () => expect(normalizedEntropy([1, 0])).toBeCloseTo(0, 4));
  it("perplexity of binary → 2", () => expect(perplexity([0.5, 0.5])).toBeCloseTo(2, 4));
  it("perplexity of certain → 1", () => expect(perplexity([1, 0])).toBeCloseTo(1, 4));
});

// ─── statistics ──────────────────────────────────────────────────────────────

describe("variancePop / varianceSample", () => {
  it("variancePop [2,4] = 1", () => expect(variancePop([2, 4])).toBeCloseTo(1.0, 6));
  it("varianceSample [2,4] = 2", () => expect(varianceSample([2, 4])).toBeCloseTo(2.0, 6));
  it("empty → null", () => expect(variancePop([])).toBeNull());
  it("n=1 sample → null", () => expect(varianceSample([5])).toBeNull());
});

describe("stdDevPop / stdDevSample", () => {
  it("stdDevPop [2,4] = 1", () => expect(stdDevPop([2, 4])).toBeCloseTo(1.0, 6));
  it("stdDevSample [2,4] = sqrt(2)", () => expect(stdDevSample([2, 4])).toBeCloseTo(Math.sqrt(2), 6));
});

describe("zScore / zScores", () => {
  it("zScore at mean = 0", () => expect(zScore(5, 5, 2)).toBe(0));
  it("zScore 1 std above = 1", () => expect(zScore(7, 5, 2)).toBe(1));
  it("zScore stdDev=0 → null", () => expect(zScore(5, 5, 0)).toBeNull());
  it("zScores mean=0 std=1", () => {
    const scores = zScores([2, 4, 6])!;
    expect(Math.abs(scores.reduce((a, b) => a + b, 0))).toBeLessThan(0.0001);
  });
});

describe("median", () => {
  it("odd length", () => expect(median([3, 1, 2])).toBe(2));
  it("even length", () => expect(median([1, 2, 3, 4])).toBe(2.5));
  it("single", () => expect(median([5])).toBe(5));
  it("empty → null", () => expect(median([])).toBeNull());
});

describe("mode", () => {
  it("single mode", () => expect(mode([1, 2, 2, 3])).toEqual([2]));
  it("multiple modes", () => {
    const m = mode([1, 1, 2, 2]);
    expect(m).toContain(1);
    expect(m).toContain(2);
  });
  it("empty", () => expect(mode([])).toEqual([]));
});

describe("quantile / iqr", () => {
  it("median via quantile", () => expect(quantile([1, 2, 3, 4, 5], 0.5)).toBeCloseTo(3, 4));
  it("q=0 → min", () => expect(quantile([1, 5, 3], 0)).toBe(1));
  it("q=1 → max", () => expect(quantile([1, 5, 3], 1)).toBe(5));
  it("iqr", () => {
    const result = iqr([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result).toBeGreaterThan(0);
  });
});

describe("pearsonCorrelation / spearmanCorrelation", () => {
  it("perfect positive correlation", () => expect(pearsonCorrelation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1.0, 4));
  it("perfect negative correlation", () => expect(pearsonCorrelation([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1.0, 4));
  it("zero correlation", () => expect(pearsonCorrelation([1, 1, 1], [1, 2, 3])).toBeNull());
  it("spearman monotonic", () => {
    const r = spearmanCorrelation([1, 2, 3, 4], [1, 4, 9, 16]);
    expect(r).toBeCloseTo(1.0, 4);
  });
});

describe("linearRegression", () => {
  it("perfect fit", () => {
    const result = linearRegression([1, 2, 3, 4], [2, 4, 6, 8])!;
    expect(result.slope).toBeCloseTo(2, 4);
    expect(result.intercept).toBeCloseTo(0, 4);
    expect(result.rSquared).toBeCloseTo(1.0, 4);
  });
  it("returns null for n < 2", () => expect(linearRegression([1], [1])).toBeNull());
});

describe("movingAverage / exponentialMovingAverage", () => {
  it("MA window=2", () => expect(movingAverage([1, 2, 3, 4], 2)).toEqual([1.5, 2.5, 3.5]));
  it("MA too small → []", () => expect(movingAverage([1], 5)).toEqual([]));
  it("EMA alpha=1 → same as input", () => expect(exponentialMovingAverage([1, 2, 3], 1)).toEqual([1, 2, 3]));
  it("EMA alpha=0 → constant", () => {
    const result = exponentialMovingAverage([5, 10, 20], 0);
    expect(result[0]).toBe(5);
    expect(result[1]).toBe(5);
    expect(result[2]).toBe(5);
  });
});

describe("cumSum", () => {
  it("cumulative sum", () => expect(cumSum([1, 2, 3])).toEqual([1, 3, 6]));
  it("empty", () => expect(cumSum([])).toEqual([]));
});

describe("normalize / standardize", () => {
  it("normalize to [0,1]", () => {
    const result = normalize([0, 5, 10])!;
    expect(result[0]).toBe(0);
    expect(result[2]).toBe(1);
    expect(result[1]).toBeCloseTo(0.5, 4);
  });
  it("normalize all-same → null", () => expect(normalize([5, 5, 5])).toBeNull());
  it("standardize mean≈0 std≈1", () => {
    const result = standardize([2, 4, 6])!;
    const m = result.reduce((a, b) => a + b, 0) / result.length;
    expect(Math.abs(m)).toBeLessThan(0.0001);
  });
});

describe("detectOutliers", () => {
  it("detects extreme values", () => {
    const arr = [1, 2, 2, 2, 2, 2, 2, 100];
    const outliers = detectOutliers(arr, 2.0); // threshold=2.0; z(100)≈2.47
    expect(outliers).toContain(7);
  });
  it("no outliers in tight data", () => {
    expect(detectOutliers([1, 2, 3, 4, 5])).toHaveLength(0);
  });
});

describe("rmse / mae", () => {
  it("rmse perfect fit = 0", () => expect(rmse([1, 2, 3], [1, 2, 3])).toBe(0));
  it("mae perfect fit = 0", () => expect(mae([1, 2, 3], [1, 2, 3])).toBe(0));
  it("rmse mismatched → null", () => expect(rmse([1, 2], [1])).toBeNull());
  it("mae symmetric errors", () => expect(mae([1, 3], [3, 1])).toBe(2));
});

// ─── date-utils ──────────────────────────────────────────────────────────────

const REF = new Date("2026-06-19T14:30:00Z").getTime();

describe("startOfDayUtc / endOfDayUtc", () => {
  it("startOfDayUtc zeroes time", () => {
    const d = startOfDayUtc(REF);
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
  });
  it("endOfDayUtc is 23:59:59", () => {
    const d = endOfDayUtc(REF);
    expect(d.getUTCHours()).toBe(23);
    expect(d.getUTCMinutes()).toBe(59);
    expect(d.getUTCSeconds()).toBe(59);
  });
});

describe("startOfWeekUtc", () => {
  it("June 19 2026 is a Friday → Monday June 15", () => {
    const d = startOfWeekUtc(REF);
    expect(d.getUTCDay()).toBe(1); // Monday
    expect(d.getUTCDate()).toBe(15);
  });
});

describe("isSameDayUtc / isToday / isTomorrow", () => {
  it("same day", () => expect(isSameDayUtc(REF, REF + 3600 * 1000)).toBe(true));
  it("different day", () => expect(isSameDayUtc(REF, REF + 24 * 3600 * 1000)).toBe(false));
  it("isToday with same ref", () => expect(isToday(new Date(REF), new Date(REF))).toBe(true));
  it("isTomorrow", () => expect(isTomorrow(new Date(REF + 24 * 3600 * 1000), new Date(REF))).toBe(true));
});

describe("isPast / isFuture", () => {
  it("past date", () => expect(isPast(new Date(REF - 1000), new Date(REF))).toBe(true));
  it("future date", () => expect(isFuture(new Date(REF + 1000), new Date(REF))).toBe(true));
  it("same time is not future", () => expect(isFuture(new Date(REF), new Date(REF))).toBe(false));
});

describe("addDays / addHours / diffDays / diffHours", () => {
  it("addDays", () => {
    const tomorrow = addDays(new Date(REF), 1);
    expect(diffDays(tomorrow, new Date(REF))).toBe(1);
  });
  it("addHours", () => {
    const later = addHours(new Date(REF), 2);
    expect(diffHours(later, new Date(REF))).toBe(2);
  });
});

describe("isoWeekNumber", () => {
  it("Jan 1 of a year that starts on Thursday is week 1", () => {
    // 2015-01-01 was a Thursday — ISO week 1
    expect(isoWeekNumber(new Date("2015-01-01"))).toBe(1);
  });
  it("returns a positive integer", () => {
    const w = isoWeekNumber(REF);
    expect(w).toBeGreaterThan(0);
    expect(w).toBeLessThanOrEqual(53);
  });
});

describe("isWeekend", () => {
  it("Saturday is weekend", () => expect(isWeekend(new Date("2026-06-20"))).toBe(true));
  it("Sunday is weekend", () => expect(isWeekend(new Date("2026-06-21"))).toBe(true));
  it("Monday is not weekend", () => expect(isWeekend(new Date("2026-06-22"))).toBe(false));
});

describe("formatDuration / timeUntil", () => {
  it("days", () => expect(formatDuration(90 * 3600 * 1000)).toMatch(/d/));
  it("hours", () => expect(formatDuration(3661 * 1000)).toMatch(/h/));
  it("seconds", () => expect(formatDuration(45 * 1000)).toBe("45s"));
  it("timeUntil future", () => expect(timeUntil(REF + 3600 * 1000, REF)).not.toBeNull());
  it("timeUntil past → null", () => expect(timeUntil(REF - 1000, REF)).toBeNull());
});

describe("parseDate", () => {
  it("ISO string", () => expect(parseDate("2026-06-19")?.getUTCFullYear()).toBe(2026));
  it("invalid → null", () => expect(parseDate("not a date")).toBeNull());
});

describe("dateRange", () => {
  it("generates correct count", () => {
    const range = dateRange(new Date("2026-06-01"), new Date("2026-06-03"));
    expect(range).toHaveLength(3);
  });
  it("same day → 1 date", () => {
    const range = dateRange(new Date("2026-06-01"), new Date("2026-06-01"));
    expect(range).toHaveLength(1);
  });
});

describe("groupByDay", () => {
  it("groups correctly", () => {
    const items = [
      { date: new Date("2026-06-01T10:00Z"), v: 1 },
      { date: new Date("2026-06-01T20:00Z"), v: 2 },
      { date: new Date("2026-06-02T10:00Z"), v: 3 },
    ];
    const map = groupByDay(items, (x) => x.date);
    expect(map.get("2026-06-01")!.length).toBe(2);
    expect(map.get("2026-06-02")!.length).toBe(1);
  });
});
