/**
 * Tests for pipeline.ts and validation.ts utilities.
 * Minimum 50 tests covering all exported functions.
 */

import { describe, it, expect } from "vitest";

import {
  pipe,
  pipeAsync,
  compose,
  filter,
  filterAll,
  filterAny,
  sortWith,
  compareBy,
  compareByMulti,
  paginate,
  processPipeline,
  searchFilter,
  rangeFilter,
  enumFilter,
  dedupe,
  groupAndSort,
} from "@/lib/utils/pipeline";

import {
  ok,
  err,
  combine,
  validateEmail,
  validateUrl,
  validateNumberInRange,
  validateRequiredString,
  validateDateNotPast,
  validateConfidence,
  validateAmericanOdds,
  validateSportSlug,
  createObjectValidator,
} from "@/lib/utils/validation";

// ---------------------------------------------------------------------------
// pipe / compose
// ---------------------------------------------------------------------------

describe("pipe", () => {
  it("pipe(f, g)(x) = g(f(x))", () => {
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const fn = pipe(addOne, double);
    expect(fn(3)).toBe(8); // (3+1)*2
  });

  it("pipe with three functions applies left-to-right", () => {
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const negate = (x: number) => -x;
    const fn = pipe(addOne, double, negate);
    expect(fn(2)).toBe(-6); // ((2+1)*2)*-1
  });

  it("pipe with no args returns identity", () => {
    const fn = pipe<number>();
    expect(fn(42)).toBe(42);
  });
});

describe("compose", () => {
  it("compose(f, g)(x) = f(g(x))", () => {
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const fn = compose(addOne, double);
    expect(fn(3)).toBe(7); // (3*2)+1
  });

  it("compose with no args returns identity", () => {
    const fn = compose<string>();
    expect(fn("hello")).toBe("hello");
  });

  it("compose is right-to-left (opposite of pipe)", () => {
    const addOne = (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const piped = pipe(addOne, double)(5);    // (5+1)*2 = 12
    const composed = compose(double, addOne)(5); // (5+1)*2 = 12, same here
    // Verify they differ when order matters differently
    const pipeResult = pipe(double, addOne)(5);    // (5*2)+1 = 11
    const composeResult = compose(addOne, double)(5); // (5*2)+1 = 11
    expect(pipeResult).toBe(composeResult);
    expect(piped).toBe(composed);
  });
});

describe("pipeAsync", () => {
  it("runs async functions sequentially", async () => {
    const addOne = async (x: number) => x + 1;
    const double = (x: number) => x * 2;
    const fn = pipeAsync(addOne, double);
    expect(await fn(3)).toBe(8); // (3+1)*2
  });
});

// ---------------------------------------------------------------------------
// filter / filterAll / filterAny
// ---------------------------------------------------------------------------

describe("filter", () => {
  it("basic predicate filters correctly", () => {
    const isEven = (x: number) => x % 2 === 0;
    const result = filter(isEven)([1, 2, 3, 4, 5, 6]);
    expect(result).toEqual([2, 4, 6]);
  });

  it("returns empty array when no items match", () => {
    const result = filter((x: number) => x > 100)([1, 2, 3]);
    expect(result).toEqual([]);
  });
});

describe("filterAll", () => {
  it("AND logic: item must pass all predicates", () => {
    const isEven = (x: number) => x % 2 === 0;
    const isPositive = (x: number) => x > 0;
    const result = filterAll([isEven, isPositive])([-2, -1, 0, 1, 2, 3, 4]);
    expect(result).toEqual([2, 4]);
  });

  it("no predicates → all items pass", () => {
    const result = filterAll<number>([])([1, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });
});

describe("filterAny", () => {
  it("OR logic: item passes if any predicate is true", () => {
    const isNegative = (x: number) => x < 0;
    const isGreaterThan10 = (x: number) => x > 10;
    const result = filterAny([isNegative, isGreaterThan10])([-5, 0, 5, 15]);
    expect(result).toEqual([-5, 15]);
  });

  it("no predicates → no items pass", () => {
    const result = filterAny<number>([])([1, 2, 3]);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// compareBy / compareByMulti / sortWith
// ---------------------------------------------------------------------------

describe("compareBy", () => {
  it("sorts ascending by numeric key", () => {
    const items = [{ v: 3 }, { v: 1 }, { v: 2 }];
    const sorted = sortWith(compareBy((x: { v: number }) => x.v))(items);
    expect(sorted.map((x) => x.v)).toEqual([1, 2, 3]);
  });

  it("sorts descending by numeric key", () => {
    const items = [{ v: 3 }, { v: 1 }, { v: 2 }];
    const sorted = sortWith(compareBy((x: { v: number }) => x.v, "desc"))(items);
    expect(sorted.map((x) => x.v)).toEqual([3, 2, 1]);
  });

  it("sorts ascending by string key", () => {
    const items = [{ name: "charlie" }, { name: "alice" }, { name: "bob" }];
    const sorted = sortWith(compareBy((x: { name: string }) => x.name))(items);
    expect(sorted.map((x) => x.name)).toEqual(["alice", "bob", "charlie"]);
  });

  it("sorts descending by string key", () => {
    const items = [{ name: "charlie" }, { name: "alice" }, { name: "bob" }];
    const sorted = sortWith(compareBy((x: { name: string }) => x.name, "desc"))(items);
    expect(sorted.map((x) => x.name)).toEqual(["charlie", "bob", "alice"]);
  });
});

describe("compareByMulti", () => {
  it("first comparator tiebreaks with subsequent", () => {
    type Item = { tier: number; score: number };
    const items: Item[] = [
      { tier: 1, score: 50 },
      { tier: 2, score: 30 },
      { tier: 1, score: 80 },
      { tier: 2, score: 10 },
    ];
    const cmp = compareByMulti([compareBy((x: Item) => x.tier), compareBy((x: Item) => x.score)]);
    const sorted = sortWith(cmp)(items);
    expect(sorted).toEqual([
      { tier: 1, score: 50 },
      { tier: 1, score: 80 },
      { tier: 2, score: 10 },
      { tier: 2, score: 30 },
    ]);
  });

  it("no comparators returns 0 (stable)", () => {
    const cmp = compareByMulti<number>([]);
    expect(cmp(5, 5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// paginate
// ---------------------------------------------------------------------------

describe("paginate", () => {
  it("page 1, pageSize 2 of [1,2,3,4,5] → items=[1,2], total=5, totalPages=3", () => {
    const result = paginate([1, 2, 3, 4, 5], 1, 2);
    expect(result.items).toEqual([1, 2]);
    expect(result.total).toBe(5);
    expect(result.filtered).toBe(5);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);
  });

  it("last page has remaining items", () => {
    const result = paginate([1, 2, 3, 4, 5], 3, 2);
    expect(result.items).toEqual([5]);
  });

  it("page beyond total → empty items", () => {
    const result = paginate([1, 2, 3], 5, 2);
    expect(result.items).toEqual([]);
  });

  it("page 2 returns correct slice", () => {
    const result = paginate([1, 2, 3, 4, 5], 2, 2);
    expect(result.items).toEqual([3, 4]);
  });
});

// ---------------------------------------------------------------------------
// processPipeline
// ---------------------------------------------------------------------------

describe("processPipeline", () => {
  it("filters AND sorts AND paginates in one call", () => {
    const items = [
      { id: 1, score: 50, active: true },
      { id: 2, score: 80, active: false },
      { id: 3, score: 30, active: true },
      { id: 4, score: 70, active: true },
      { id: 5, score: 20, active: true },
    ];
    const result = processPipeline({
      items,
      filters: [(x) => x.active],
      sort: compareBy((x) => x.score, "desc"),
      page: 1,
      pageSize: 2,
    });
    expect(result.total).toBe(5);
    expect(result.filtered).toBe(4);
    expect(result.items.map((x) => x.id)).toEqual([4, 1]); // top 2 scores from active
    expect(result.totalPages).toBe(2);
  });

  it("empty filters → all items pass through", () => {
    const items = [1, 2, 3, 4, 5];
    const result = processPipeline({ items, page: 1, pageSize: 10 });
    expect(result.total).toBe(5);
    expect(result.filtered).toBe(5);
    expect(result.items).toEqual([1, 2, 3, 4, 5]);
  });

  it("defaults page=1, pageSize=20", () => {
    const items = Array.from({ length: 25 }, (_, i) => i + 1);
    const result = processPipeline({ items });
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
    expect(result.items).toHaveLength(20);
    expect(result.totalPages).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// searchFilter
// ---------------------------------------------------------------------------

describe("searchFilter", () => {
  type SearchItem = { name: string; sport: string };
  const items: SearchItem[] = [
    { name: "Alice Johnson", sport: "Basketball" },
    { name: "Bob Smith", sport: "Football" },
    { name: "Carol White", sport: "baseball" },
  ];

  it("case-insensitive substring match by default", () => {
    const pred = searchFilter("alice", [(x: SearchItem) => x.name]);
    expect(pred(items[0]!)).toBe(true);
    expect(pred(items[1]!)).toBe(false);
  });

  it("matches across multiple key functions", () => {
    const pred = searchFilter("foot", [(x: SearchItem) => x.name, (x: SearchItem) => x.sport]);
    expect(pred(items[1]!)).toBe(true);
    expect(pred(items[0]!)).toBe(false);
  });

  it("exact=true requires exact match (case-insensitive)", () => {
    const pred = searchFilter("basketball", [(x: SearchItem) => x.sport], { exact: true });
    expect(pred(items[0]!)).toBe(true);
    expect(pred(items[1]!)).toBe(false);
  });

  it("exact=true does not match substring", () => {
    const pred = searchFilter("basket", [(x: SearchItem) => x.sport], { exact: true });
    expect(pred(items[0]!)).toBe(false);
  });

  it("no keyFns → no item matches", () => {
    const pred = searchFilter("alice", []);
    expect(pred(items[0]!)).toBe(false);
  });

  it("case-sensitive match when caseSensitive=true", () => {
    const pred = searchFilter("alice", [(x: SearchItem) => x.name], { caseSensitive: true });
    expect(pred(items[0]!)).toBe(false); // name is "Alice" not "alice"
    const pred2 = searchFilter("Alice", [(x: SearchItem) => x.name], { caseSensitive: true });
    expect(pred2(items[0]!)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// rangeFilter
// ---------------------------------------------------------------------------

describe("rangeFilter", () => {
  const items = [1, 5, 10, 15, 20];

  it("filters within [min, max] inclusive", () => {
    const pred = rangeFilter((x: number) => x, 5, 15);
    expect(items.filter(pred)).toEqual([5, 10, 15]);
  });

  it("undefined min is unbounded below", () => {
    const pred = rangeFilter((x: number) => x, undefined, 10);
    expect(items.filter(pred)).toEqual([1, 5, 10]);
  });

  it("undefined max is unbounded above", () => {
    const pred = rangeFilter((x: number) => x, 10, undefined);
    expect(items.filter(pred)).toEqual([10, 15, 20]);
  });

  it("no bounds → all items pass", () => {
    const pred = rangeFilter((x: number) => x);
    expect(items.filter(pred)).toEqual(items);
  });
});

// ---------------------------------------------------------------------------
// enumFilter
// ---------------------------------------------------------------------------

describe("enumFilter", () => {
  type Status = "active" | "inactive" | "pending";
  const items: { id: number; status: Status }[] = [
    { id: 1, status: "active" },
    { id: 2, status: "inactive" },
    { id: 3, status: "pending" },
    { id: 4, status: "active" },
  ];

  it("matches allowed values", () => {
    const pred = enumFilter((x: { id: number; status: Status }) => x.status, ["active", "pending"] as Status[]);
    expect(items.filter(pred).map((x) => x.id)).toEqual([1, 3, 4]);
  });

  it("does not match non-allowed values", () => {
    const pred = enumFilter((x: { id: number; status: Status }) => x.status, ["inactive"] as Status[]);
    expect(items.filter(pred).map((x) => x.id)).toEqual([2]);
  });

  it("empty allowed list → no items", () => {
    const pred = enumFilter((x: { id: number; status: Status }) => x.status, [] as Status[]);
    expect(items.filter(pred)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// dedupe
// ---------------------------------------------------------------------------

describe("dedupe", () => {
  it("removes duplicates by key", () => {
    const items = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
      { id: 1, name: "c" },
      { id: 3, name: "d" },
    ];
    const result = dedupe((x: { id: number; name: string }) => x.id)(items);
    expect(result).toEqual([
      { id: 1, name: "a" },
      { id: 2, name: "b" },
      { id: 3, name: "d" },
    ]);
  });

  it("preserves first occurrence", () => {
    const items = ["apple", "banana", "apple", "cherry"];
    const result = dedupe((x: string) => x)(items);
    expect(result).toEqual(["apple", "banana", "cherry"]);
  });

  it("no duplicates → returns same items", () => {
    const items = [1, 2, 3, 4, 5];
    const result = dedupe((x: number) => x)(items);
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });
});

// ---------------------------------------------------------------------------
// groupAndSort
// ---------------------------------------------------------------------------

describe("groupAndSort", () => {
  it("groups items by key", () => {
    const items = [
      { sport: "nfl", name: "a" },
      { sport: "nba", name: "b" },
      { sport: "nfl", name: "c" },
    ];
    const result = groupAndSort(items, (x) => x.sport);
    expect(result.get("nfl")).toEqual([
      { sport: "nfl", name: "a" },
      { sport: "nfl", name: "c" },
    ]);
    expect(result.get("nba")).toEqual([{ sport: "nba", name: "b" }]);
  });

  it("sorts groups by provided order", () => {
    const items = [
      { tier: "free", name: "a" },
      { tier: "pro", name: "b" },
      { tier: "elite", name: "c" },
      { tier: "free", name: "d" },
    ];
    const result = groupAndSort(items, (x) => x.tier, ["elite", "pro", "free"]);
    const keys = [...result.keys()];
    expect(keys).toEqual(["elite", "pro", "free"]);
  });

  it("groups not in groupOrder appear last", () => {
    const items = [
      { tier: "free", val: 1 },
      { tier: "vip", val: 2 },
      { tier: "pro", val: 3 },
    ];
    const result = groupAndSort(items, (x) => x.tier, ["pro", "free"]);
    const keys = [...result.keys()];
    expect(keys[0]).toBe("pro");
    expect(keys[1]).toBe("free");
    expect(keys[2]).toBe("vip");
  });
});

// ---------------------------------------------------------------------------
// validateEmail
// ---------------------------------------------------------------------------

describe("validateEmail", () => {
  it("valid email passes", () => {
    expect(validateEmail("user@example.com").valid).toBe(true);
  });

  it("another valid email passes", () => {
    expect(validateEmail("foo.bar+baz@sub.domain.org").valid).toBe(true);
  });

  it("invalid email without @ fails", () => {
    expect(validateEmail("notanemail").valid).toBe(false);
  });

  it("empty string fails", () => {
    expect(validateEmail("").valid).toBe(false);
  });

  it("missing domain fails", () => {
    expect(validateEmail("user@").valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateUrl
// ---------------------------------------------------------------------------

describe("validateUrl", () => {
  it("valid https URL passes", () => {
    expect(validateUrl("https://example.com").valid).toBe(true);
  });

  it("valid http URL passes", () => {
    expect(validateUrl("http://example.com/path?q=1").valid).toBe(true);
  });

  it("ftp URL fails", () => {
    expect(validateUrl("ftp://example.com").valid).toBe(false);
  });

  it("plain string without protocol fails", () => {
    expect(validateUrl("not a url").valid).toBe(false);
  });

  it("empty string fails", () => {
    expect(validateUrl("").valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateNumberInRange
// ---------------------------------------------------------------------------

describe("validateNumberInRange", () => {
  it("value within range passes", () => {
    expect(validateNumberInRange(5, 0, 10).valid).toBe(true);
  });

  it("value above max fails", () => {
    expect(validateNumberInRange(15, 0, 10).valid).toBe(false);
  });

  it("value at boundary is valid", () => {
    expect(validateNumberInRange(0, 0, 10).valid).toBe(true);
    expect(validateNumberInRange(10, 0, 10).valid).toBe(true);
  });

  it("error message includes label when provided", () => {
    const result = validateNumberInRange(15, 0, 10, "Score");
    expect(result.errors[0]).toContain("Score");
  });
});

// ---------------------------------------------------------------------------
// validateRequiredString
// ---------------------------------------------------------------------------

describe("validateRequiredString", () => {
  it("non-empty string passes", () => {
    expect(validateRequiredString("hello").valid).toBe(true);
  });

  it("empty string fails", () => {
    expect(validateRequiredString("").valid).toBe(false);
  });

  it("whitespace-only string fails", () => {
    expect(validateRequiredString("   ").valid).toBe(false);
  });

  it("non-string value fails", () => {
    expect(validateRequiredString(123).valid).toBe(false);
  });

  it("null fails", () => {
    expect(validateRequiredString(null).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateDateNotPast
// ---------------------------------------------------------------------------

describe("validateDateNotPast", () => {
  const now = Date.now();
  const future = now + 86400000; // +1 day
  const past = now - 86400000;  // -1 day

  it("future date passes", () => {
    expect(validateDateNotPast(new Date(future), now).valid).toBe(true);
  });

  it("past date fails", () => {
    expect(validateDateNotPast(new Date(past), now).valid).toBe(false);
  });

  it("string date in future passes", () => {
    const futureDateStr = new Date(future).toISOString();
    expect(validateDateNotPast(futureDateStr, now).valid).toBe(true);
  });

  it("numeric timestamp in past fails", () => {
    expect(validateDateNotPast(past, now).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateConfidence
// ---------------------------------------------------------------------------

describe("validateConfidence", () => {
  it("50 is valid", () => {
    expect(validateConfidence(50).valid).toBe(true);
  });

  it("0 and 100 are valid (boundaries)", () => {
    expect(validateConfidence(0).valid).toBe(true);
    expect(validateConfidence(100).valid).toBe(true);
  });

  it("101 is invalid", () => {
    expect(validateConfidence(101).valid).toBe(false);
  });

  it("-1 is invalid", () => {
    expect(validateConfidence(-1).valid).toBe(false);
  });

  it('string "50" is invalid (not a number)', () => {
    expect(validateConfidence("50").valid).toBe(false);
  });

  it("non-number is invalid", () => {
    expect(validateConfidence(null).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateAmericanOdds
// ---------------------------------------------------------------------------

describe("validateAmericanOdds", () => {
  it("-110 is valid", () => {
    expect(validateAmericanOdds(-110).valid).toBe(true);
  });

  it("0 is valid (EV)", () => {
    expect(validateAmericanOdds(0).valid).toBe(true);
  });

  it("+150 is valid", () => {
    expect(validateAmericanOdds(150).valid).toBe(true);
  });

  it("string is invalid", () => {
    expect(validateAmericanOdds("str").valid).toBe(false);
  });

  it("Infinity is invalid", () => {
    expect(validateAmericanOdds(Infinity).valid).toBe(false);
  });

  it("value beyond -10000 is invalid", () => {
    expect(validateAmericanOdds(-10001).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateSportSlug
// ---------------------------------------------------------------------------

describe("validateSportSlug", () => {
  it("known slug passes", () => {
    expect(validateSportSlug("americanfootball_nfl").valid).toBe(true);
    expect(validateSportSlug("basketball_nba").valid).toBe(true);
    expect(validateSportSlug("baseball_mlb").valid).toBe(true);
  });

  it("unknown slug fails", () => {
    expect(validateSportSlug("tennis_atp").valid).toBe(false);
  });

  it("non-string fails", () => {
    expect(validateSportSlug(42).valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ok / err / combine
// ---------------------------------------------------------------------------

describe("ok / err / combine", () => {
  it("ok returns valid with no errors", () => {
    const result = ok();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("err returns invalid with one error", () => {
    const result = err("Something went wrong");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Something went wrong");
  });

  it("combine: all valid → valid", () => {
    const result = combine(ok(), ok(), ok());
    expect(result.valid).toBe(true);
  });

  it("combine: one error → invalid, errors combined", () => {
    const result = combine(ok(), err("error A"), err("error B"));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("error A");
    expect(result.errors).toContain("error B");
  });

  it("combine: no args → valid", () => {
    const result = combine();
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createObjectValidator
// ---------------------------------------------------------------------------

describe("createObjectValidator", () => {
  it("validates object fields", () => {
    type Obj = { email: string; confidence: unknown };
    const validator = createObjectValidator<Obj>({
      email: validateEmail,
      confidence: validateConfidence,
    });
    const valid = validator({ email: "user@example.com", confidence: 75 });
    expect(valid.valid).toBe(true);
  });

  it("collects errors from multiple invalid fields", () => {
    type Obj = { email: string; confidence: unknown };
    const validator = createObjectValidator<Obj>({
      email: validateEmail,
      confidence: validateConfidence,
    });
    const result = validator({ email: "bad", confidence: 150 });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});
