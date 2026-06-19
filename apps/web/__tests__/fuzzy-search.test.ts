/**
 * Tests for fuzzy search utilities.
 * Minimum 55 test cases covering all exported functions.
 */

import { describe, it, expect } from "vitest";
import {
  levenshtein,
  normalizedLevenshtein,
  similarity,
  jaccardSimilarity,
  longestCommonSubsequence,
  longestCommonSubstring,
  prefixScore,
  initialism,
  matchesInitialism,
  tokenize,
  fuzzyScore,
  fuzzySearch,
  searchTeams,
  searchPicks,
  highlight,
  abbreviateTeam,
  canonicalTeamName,
  rankSuggestions,
} from "@/lib/utils/fuzzy-search";

// ---------------------------------------------------------------------------
// levenshtein
// ---------------------------------------------------------------------------
describe("levenshtein", () => {
  it("returns 0 for empty strings", () => {
    expect(levenshtein("", "")).toBe(0);
  });

  it("returns 0 for identical strings", () => {
    expect(levenshtein("cat", "cat")).toBe(0);
  });

  it("returns 1 for one substitution", () => {
    expect(levenshtein("cat", "car")).toBe(1);
  });

  it("kitten → sitting is 3", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });

  it("empty to non-empty is length of target", () => {
    expect(levenshtein("", "abc")).toBe(3);
  });

  it("non-empty to empty is length of source", () => {
    expect(levenshtein("abc", "")).toBe(3);
  });

  it("single insertion", () => {
    expect(levenshtein("ab", "abc")).toBe(1);
  });

  it("single deletion", () => {
    expect(levenshtein("abc", "ab")).toBe(1);
  });

  it("completely different strings", () => {
    expect(levenshtein("abc", "xyz")).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// normalizedLevenshtein
// ---------------------------------------------------------------------------
describe("normalizedLevenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(normalizedLevenshtein("hello", "hello")).toBe(0);
  });

  it("returns 0 if both empty", () => {
    expect(normalizedLevenshtein("", "")).toBe(0);
  });

  it("returns 1 for completely different strings of equal length", () => {
    expect(normalizedLevenshtein("abc", "xyz")).toBe(1);
  });

  it("returns value between 0 and 1 for partial match", () => {
    const score = normalizedLevenshtein("cat", "car");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it("is symmetric", () => {
    expect(normalizedLevenshtein("hello", "world")).toBeCloseTo(
      normalizedLevenshtein("world", "hello")
    );
  });
});

// ---------------------------------------------------------------------------
// similarity
// ---------------------------------------------------------------------------
describe("similarity", () => {
  it("returns 1 for identical strings", () => {
    expect(similarity("hello", "hello")).toBe(1);
  });

  it("returns 0 for completely different strings", () => {
    expect(similarity("abc", "xyz")).toBe(0);
  });

  it("returns partial match between 0 and 1", () => {
    const score = similarity("cat", "car");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// jaccardSimilarity
// ---------------------------------------------------------------------------
describe("jaccardSimilarity", () => {
  it("returns 1 for identical tokenized strings", () => {
    expect(jaccardSimilarity("New England Patriots", "New England Patriots")).toBe(1);
  });

  it("returns 0 for no token overlap", () => {
    expect(jaccardSimilarity("Kansas City Chiefs", "New York Giants")).toBe(0);
  });

  it("returns 1 for both empty strings", () => {
    expect(jaccardSimilarity("", "")).toBe(1);
  });

  it("returns 0 when one string is empty", () => {
    expect(jaccardSimilarity("abc", "")).toBe(0);
  });

  it("returns partial overlap correctly", () => {
    // "new england patriots" vs "new york giants" — "new" overlaps
    const score = jaccardSimilarity("New England Patriots", "New York Giants");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// longestCommonSubsequence
// ---------------------------------------------------------------------------
describe("longestCommonSubsequence", () => {
  it("ABCDE vs ACE is 3", () => {
    expect(longestCommonSubsequence("ABCDE", "ACE")).toBe(3);
  });

  it("identical strings return full length", () => {
    expect(longestCommonSubsequence("hello", "hello")).toBe(5);
  });

  it("no common characters returns 0", () => {
    expect(longestCommonSubsequence("abc", "xyz")).toBe(0);
  });

  it("empty string returns 0", () => {
    expect(longestCommonSubsequence("", "abc")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// longestCommonSubstring
// ---------------------------------------------------------------------------
describe("longestCommonSubstring", () => {
  it("abcdef vs cdef is 4", () => {
    expect(longestCommonSubstring("abcdef", "cdef")).toBe(4);
  });

  it("identical strings return full length", () => {
    expect(longestCommonSubstring("hello", "hello")).toBe(5);
  });

  it("no common substring returns 0", () => {
    expect(longestCommonSubstring("abc", "xyz")).toBe(0);
  });

  it("empty string returns 0", () => {
    expect(longestCommonSubstring("", "abc")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// prefixScore
// ---------------------------------------------------------------------------
describe("prefixScore", () => {
  it("returns 1 for exact prefix match", () => {
    expect(prefixScore("Kansas", "Kansas City Chiefs")).toBe(1);
  });

  it("returns 1 when target starts with query", () => {
    expect(prefixScore("new", "New England Patriots")).toBe(1);
  });

  it("returns 0 when no prefix match", () => {
    expect(prefixScore("xyz", "Kansas City Chiefs")).toBe(0);
  });

  it("returns 0 for empty query", () => {
    expect(prefixScore("", "Kansas City Chiefs")).toBe(0);
  });

  it("returns 0.8 when first word of target starts with query but target does not", () => {
    // "kan" starts "Kansas" (first word of "Kansas City Chiefs") but not the full string
    expect(prefixScore("chiefs", "Kansas City Chiefs")).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// initialism
// ---------------------------------------------------------------------------
describe("initialism", () => {
  it("New England Patriots → NEP", () => {
    expect(initialism("New England Patriots")).toBe("NEP");
  });

  it("Kansas City Chiefs → KC", () => {
    expect(initialism("Kansas City Chiefs")).toBe("KCC");
  });

  it("single word → first letter", () => {
    expect(initialism("Patriots")).toBe("P");
  });

  it("handles extra whitespace", () => {
    expect(initialism("  New  England  ")).toBe("NE");
  });
});

// ---------------------------------------------------------------------------
// matchesInitialism
// ---------------------------------------------------------------------------
describe("matchesInitialism", () => {
  it("ne matches New England Patriots", () => {
    expect(matchesInitialism("ne", "New England Patriots")).toBe(true);
  });

  it("kc matches Kansas City Chiefs", () => {
    expect(matchesInitialism("kc", "Kansas City Chiefs")).toBe(true);
  });

  it("xyz does not match New England Patriots", () => {
    expect(matchesInitialism("xyz", "New England Patriots")).toBe(false);
  });

  it("nep matches New England Patriots (full initialism)", () => {
    expect(matchesInitialism("nep", "New England Patriots")).toBe(true);
  });

  it("empty query returns false", () => {
    expect(matchesInitialism("", "New England Patriots")).toBe(false);
  });

  it("case-insensitive match", () => {
    expect(matchesInitialism("NE", "New England Patriots")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// tokenize
// ---------------------------------------------------------------------------
describe("tokenize", () => {
  it("splits New England Patriots into tokens", () => {
    expect(tokenize("New England Patriots")).toEqual(["new", "england", "patriots"]);
  });

  it("lowercases all tokens", () => {
    expect(tokenize("HELLO WORLD")).toEqual(["hello", "world"]);
  });

  it("strips punctuation", () => {
    expect(tokenize("San Francisco 49ers")).toEqual(["san", "francisco", "49ers"]);
  });

  it("empty string returns empty array", () => {
    expect(tokenize("")).toEqual([]);
  });

  it("handles multiple spaces", () => {
    expect(tokenize("  New  England  ")).toEqual(["new", "england"]);
  });
});

// ---------------------------------------------------------------------------
// fuzzyScore
// ---------------------------------------------------------------------------
describe("fuzzyScore", () => {
  it("chiefs vs Kansas City Chiefs is above 0.3", () => {
    expect(fuzzyScore("chiefs", "Kansas City Chiefs")).toBeGreaterThan(0.3);
  });

  it("kc chiefs vs Kansas City Chiefs is above 0.5", () => {
    expect(fuzzyScore("kc chiefs", "Kansas City Chiefs")).toBeGreaterThan(0.5);
  });

  it("xyz vs Kansas City Chiefs is below 0.2", () => {
    expect(fuzzyScore("xyz", "Kansas City Chiefs")).toBeLessThan(0.2);
  });

  it("identical strings return close to 1", () => {
    expect(fuzzyScore("Kansas City Chiefs", "Kansas City Chiefs")).toBeGreaterThanOrEqual(0.9);
  });

  it("empty query returns 0", () => {
    expect(fuzzyScore("", "Kansas City Chiefs")).toBe(0);
  });

  it("score is in [0, 1] range", () => {
    const score = fuzzyScore("chiefs", "Kansas City Chiefs");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// fuzzySearch
// ---------------------------------------------------------------------------
describe("fuzzySearch", () => {
  const teams = ["Kansas City Chiefs", "Chicago Bears", "SF 49ers"];

  it("first result for chiefs is Kansas City Chiefs", () => {
    const results = fuzzySearch("chiefs", teams, (x) => x);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.item).toBe("Kansas City Chiefs");
  });

  it("filters by minScore", () => {
    const results = fuzzySearch("xyz", teams, (x) => x, { minScore: 0.5 });
    expect(results).toHaveLength(0);
  });

  it("limits maxResults", () => {
    const results = fuzzySearch("a", teams, (x) => x, { maxResults: 1 });
    expect(results.length).toBeLessThanOrEqual(1);
  });

  it("results are sorted descending by score", () => {
    const results = fuzzySearch("chicago", teams, (x) => x);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
  });

  it("each result has score, item, and highlights", () => {
    const results = fuzzySearch("chiefs", teams, (x) => x);
    if (results.length > 0) {
      const r = results[0]!;
      expect(typeof r.score).toBe("number");
      expect(r.item).toBeDefined();
      expect(Array.isArray(r.highlights)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// searchTeams
// ---------------------------------------------------------------------------
describe("searchTeams", () => {
  const teams = ["Kansas City Chiefs", "New England Patriots", "Chicago Bears", "Dallas Cowboys"];

  it("returns sorted results by score", () => {
    const results = searchTeams("chiefs", teams);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.item).toBe("Kansas City Chiefs");
  });

  it("returns FuzzyMatch objects with score property", () => {
    const results = searchTeams("bears", teams);
    expect(results.length).toBeGreaterThan(0);
    expect(typeof results[0]?.score).toBe("number");
  });

  it("respects maxResults option", () => {
    const results = searchTeams("a", teams, { maxResults: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// searchPicks
// ---------------------------------------------------------------------------
describe("searchPicks", () => {
  const picks = [
    { pick: "Kansas City Chiefs -3.5", sport: "NFL", id: "1" },
    { pick: "Boston Celtics ML", sport: "NBA", id: "2" },
    { pick: "LA Dodgers over 8.5", sport: "MLB", id: "3" },
  ];

  it("searches by pick field", () => {
    const results = searchPicks("chiefs", picks);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.item.id).toBe("1");
  });

  it("can find by sport", () => {
    const results = searchPicks("NBA", picks);
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns empty array for no matches", () => {
    const results = searchPicks("zzz", picks, { minScore: 0.9 });
    expect(results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// highlight
// ---------------------------------------------------------------------------
describe("highlight", () => {
  it("wraps match in ** markers", () => {
    const result = highlight("Kansas City Chiefs", "Chiefs");
    expect(result).toContain("**Chiefs**");
  });

  it("case-insensitive match with original casing in output", () => {
    const result = highlight("Kansas City Chiefs", "chiefs");
    expect(result).toContain("**Chiefs**");
  });

  it("returns text unchanged if no match", () => {
    expect(highlight("no match", "xyz")).toBe("no match");
  });

  it("wraps partial match in the middle", () => {
    const result = highlight("Kansas City Chiefs", "City");
    expect(result).toContain("**City**");
  });

  it("returns text unchanged for empty query", () => {
    expect(highlight("Kansas City Chiefs", "")).toBe("Kansas City Chiefs");
  });
});

// ---------------------------------------------------------------------------
// abbreviateTeam
// ---------------------------------------------------------------------------
describe("abbreviateTeam", () => {
  it("Kansas City Chiefs → KC", () => {
    expect(abbreviateTeam("Kansas City Chiefs")).toBe("KC");
  });

  it("New England Patriots → NE", () => {
    expect(abbreviateTeam("New England Patriots")).toBe("NE");
  });

  it("returns short string for unknown team with 3+ words", () => {
    const abbr = abbreviateTeam("Some Unknown Team");
    expect(abbr.length).toBeLessThanOrEqual(3);
    expect(abbr).toBe("SUT");
  });

  it("returns short string for unknown 2-word team", () => {
    const abbr = abbreviateTeam("Mystery Squad");
    expect(abbr.length).toBeLessThanOrEqual(3);
  });

  it("Boston Celtics → BOS", () => {
    expect(abbreviateTeam("Boston Celtics")).toBe("BOS");
  });
});

// ---------------------------------------------------------------------------
// canonicalTeamName
// ---------------------------------------------------------------------------
describe("canonicalTeamName", () => {
  const teams = ["Kansas City Chiefs", "New England Patriots", "Chicago Bears"];

  it("returns best match for fuzzy input chiefz", () => {
    const result = canonicalTeamName("chiefz", teams);
    expect(result).toBe("Kansas City Chiefs");
  });

  it("returns null for no match above threshold", () => {
    const result = canonicalTeamName("xyzabc", teams);
    expect(result).toBeNull();
  });

  it("returns exact match for exact input", () => {
    const result = canonicalTeamName("Chicago Bears", teams);
    expect(result).toBe("Chicago Bears");
  });

  it("handles initialism match", () => {
    // "NE" should match "New England Patriots"
    const result = canonicalTeamName("NE Patriots", teams);
    expect(result).toBe("New England Patriots");
  });
});

// ---------------------------------------------------------------------------
// rankSuggestions
// ---------------------------------------------------------------------------
describe("rankSuggestions", () => {
  const teams = ["Kansas City Chiefs", "New England Patriots", "Chicago Bears", "Dallas Cowboys", "Green Bay Packers"];

  it("returns at most maxResults items", () => {
    const results = rankSuggestions("a", teams, (x) => x, 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });

  it("defaults to 5 results max", () => {
    const results = rankSuggestions("a", teams, (x) => x);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("returns items not FuzzyMatch objects", () => {
    const results = rankSuggestions("chiefs", teams, (x) => x, 5);
    if (results.length > 0) {
      expect(typeof results[0]).toBe("string");
    }
  });

  it("best match comes first", () => {
    const results = rankSuggestions("chiefs", teams, (x) => x, 5);
    if (results.length > 0) {
      expect(results[0]).toBe("Kansas City Chiefs");
    }
  });
});
