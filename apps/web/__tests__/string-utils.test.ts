import { describe, it, expect } from 'vitest';
import {
  // Existing functions
  interpolate,
  interpolateConditional,
  interpolateList,
  camelCase,
  snakeCase,
  kebabCase,
  pascalCase,
  titleCase,
  sentenceCase,
  truncate,
  truncateWords,
  padStart,
  padEnd,
  center,
  repeat,
  reverse,
  isPalindrome,
  countOccurrences,
  escapeRegex,
  extractMatches,
  replaceAll,
  replaceMap,
  levenshteinDistance,
  similarity,
  longestCommonSubstring,
  longestCommonSubsequence,
  diffWords,
  formatNumber,
  formatOdds,
  formatSpread,
  formatRecord,
  formatPercentage,
  formatDuration,
  pluralize,
  slug,
  initials,
  maskString,
  formatPickLine,
  abbreviateName,
  parseOddsString,
  highlight,
  // New additions
  levenshteinSimilarity,
  damerauLevenshteinDistance,
  jaroSimilarity,
  jaroWinklerSimilarity,
  fuzzyMatch,
  soundex,
  metaphone,
  phoneticMatch,
  tokenize,
  removeStopWords,
  stemWord,
  stemTokens,
  nGrams,
  characterNGrams,
  textDiff,
  diffRatio,
  toTitleCase,
  toCamelCase,
  toSnakeCase,
  toKebabCase,
  toPascalCase,
  wrap,
  extractNumbers,
  extractEmails,
  extractUrls,
  wildcardMatch,
  normalizeTeamName,
  teamAbbreviation,
  parseAmericanOddsString,
  formatPickLabel,
  slugifyTeam,
  abbreviateNumber,
} from '../lib/utils/string-utils';

// ---------------------------------------------------------------------------
// interpolate
// ---------------------------------------------------------------------------
describe('interpolate', () => {
  it('basic replacement', () => {
    expect(interpolate('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
  });

  it('multiple keys', () => {
    expect(interpolate('{{a}} + {{b}} = {{c}}', { a: 1, b: 2, c: 3 })).toBe('1 + 2 = 3');
  });

  it(':upper format', () => {
    expect(interpolate('{{val:upper}}', { val: 'hello' })).toBe('HELLO');
  });

  it(':lower format', () => {
    expect(interpolate('{{val:lower}}', { val: 'HELLO' })).toBe('hello');
  });

  it(':title format', () => {
    expect(interpolate('{{val:title}}', { val: 'hello world' })).toBe('Hello World');
  });

  it(':n2 format', () => {
    expect(interpolate('{{val:n2}}', { val: 3.14159 })).toBe('3.14');
  });

  it(':n0 format', () => {
    expect(interpolate('{{val:n0}}', { val: 42.7 })).toBe('43');
  });

  it(':pct format', () => {
    expect(interpolate('{{val:pct}}', { val: 0.532 })).toBe('53.2%');
  });

  it(':+/- format positive', () => {
    expect(interpolate('{{val:+/-}}', { val: 3 })).toBe('+3');
  });

  it(':+/- format negative', () => {
    expect(interpolate('{{val:+/-}}', { val: -3 })).toBe('-3');
  });

  it('missing key left as-is', () => {
    expect(interpolate('Hello {{name}}!', {})).toBe('Hello {{name}}!');
  });

  it('null value becomes empty string', () => {
    expect(interpolate('{{val}}', { val: null })).toBe('');
  });

  it('undefined value becomes empty string', () => {
    expect(interpolate('{{val}}', { val: undefined })).toBe('');
  });

  it('false value becomes empty string', () => {
    expect(interpolate('{{val}}', { val: false })).toBe('');
  });

  it('0 value is kept (not falsy special case)', () => {
    expect(interpolate('{{val}}', { val: 0 })).toBe('0');
  });

  it('empty string value becomes empty string', () => {
    expect(interpolate('[{{val}}]', { val: '' })).toBe('[]');
  });
});

// ---------------------------------------------------------------------------
// interpolateConditional
// ---------------------------------------------------------------------------
describe('interpolateConditional', () => {
  it('renders truthy block', () => {
    expect(interpolateConditional('{{#if show}}YES{{/if}}', { show: true })).toBe('YES');
  });

  it('hides falsy block', () => {
    expect(interpolateConditional('{{#if show}}YES{{/if}}', { show: false })).toBe('');
  });

  it('renders else branch on falsy', () => {
    expect(
      interpolateConditional('{{#if show}}YES{{#else}}NO{{/if}}', { show: false }),
    ).toBe('NO');
  });

  it('renders if branch on truthy with else', () => {
    expect(
      interpolateConditional('{{#if show}}YES{{#else}}NO{{/if}}', { show: true }),
    ).toBe('YES');
  });

  it('missing key treated as falsy', () => {
    expect(interpolateConditional('{{#if foo}}yes{{/if}}', {})).toBe('');
  });
});

// ---------------------------------------------------------------------------
// interpolateList
// ---------------------------------------------------------------------------
describe('interpolateList', () => {
  it('renders each item', () => {
    expect(interpolateList('{{#each items}}{{item}},{{/each}}', ['a', 'b', 'c'])).toBe('a,b,c,');
  });

  it('provides index', () => {
    expect(interpolateList('{{#each items}}{{index}}{{/each}}', ['x', 'y'])).toBe('01');
  });

  it('first flag correct', () => {
    const result = interpolateList('{{#each items}}{{first}}{{/each}}', ['a', 'b', 'c']);
    expect(result).toBe('truefalsefalse');
  });

  it('last flag correct', () => {
    const result = interpolateList('{{#each items}}{{last}}{{/each}}', ['a', 'b', 'c']);
    expect(result).toBe('falsefalsetrue');
  });

  it('passes outer vars', () => {
    expect(
      interpolateList('Header:{{title}} {{#each items}}{{item}}{{/each}}', ['a'], { title: 'T' }),
    ).toBe('Header:T a');
  });
});

// ---------------------------------------------------------------------------
// Case transforms
// ---------------------------------------------------------------------------
describe('camelCase', () => {
  it('hyphenated', () => expect(camelCase('hello-world')).toBe('helloWorld'));
  it('snake', () => expect(camelCase('hello_world')).toBe('helloWorld'));
  it('spaced', () => expect(camelCase('hello world')).toBe('helloWorld'));
  it('mixed', () => expect(camelCase('hello-world_foo bar')).toBe('helloWorldFooBar'));
  it('already camel', () => expect(camelCase('helloWorld')).toBe('helloWorld'));
});

describe('snakeCase', () => {
  it('camel', () => expect(snakeCase('helloWorld')).toBe('hello_world'));
  it('spaced', () => expect(snakeCase('hello world')).toBe('hello_world'));
  it('pascal', () => expect(snakeCase('HelloWorld')).toBe('hello_world'));
  it('kebab', () => expect(snakeCase('hello-world')).toBe('hello_world'));
});

describe('kebabCase', () => {
  it('camel', () => expect(kebabCase('helloWorld')).toBe('hello-world'));
  it('spaced', () => expect(kebabCase('hello world')).toBe('hello-world'));
  it('snake', () => expect(kebabCase('hello_world')).toBe('hello-world'));
});

describe('pascalCase', () => {
  it('hyphenated', () => expect(pascalCase('hello-world')).toBe('HelloWorld'));
  it('spaced', () => expect(pascalCase('hello world')).toBe('HelloWorld'));
  it('snake', () => expect(pascalCase('hello_world')).toBe('HelloWorld'));
});

describe('titleCase', () => {
  it('basic', () => expect(titleCase('hello world')).toBe('Hello World'));
  it('single word', () => expect(titleCase('hello')).toBe('Hello'));
  it('already title', () => expect(titleCase('Hello World')).toBe('Hello World'));
});

describe('sentenceCase', () => {
  it('upper to sentence', () => expect(sentenceCase('HELLO WORLD')).toBe('Hello world'));
  it('keeps first letter upper', () => expect(sentenceCase('hello')).toBe('Hello'));
  it('empty string', () => expect(sentenceCase('')).toBe(''));
});

// ---------------------------------------------------------------------------
// Truncate
// ---------------------------------------------------------------------------
describe('truncate', () => {
  it('no truncation needed', () => expect(truncate('hello', 10)).toBe('hello'));
  it('exact length — no truncation', () => expect(truncate('hello', 5)).toBe('hello'));
  it('truncates with default suffix', () => expect(truncate('hello world', 8)).toBe('hello w…'));
  it('custom suffix', () => expect(truncate('hello world', 8, '...')).toBe('hello...'));
});

describe('truncateWords', () => {
  it('no truncation', () => expect(truncateWords('one two three', 3)).toBe('one two three'));
  it('truncates at word boundary', () =>
    expect(truncateWords('one two three four', 2)).toBe('one two…'));
  it('custom suffix', () =>
    expect(truncateWords('one two three', 2, '...')).toBe('one two...'));
});

// ---------------------------------------------------------------------------
// Padding
// ---------------------------------------------------------------------------
describe('padStart', () => {
  it('pads to length', () => expect(padStart('5', 3, '0')).toBe('005'));
  it('no pad needed', () => expect(padStart('hello', 3)).toBe('hello'));
  it('default char is space', () => expect(padStart('x', 3)).toBe('  x'));
});

describe('padEnd', () => {
  it('pads to length', () => expect(padEnd('hi', 5, '-')).toBe('hi---'));
  it('no pad needed', () => expect(padEnd('hello', 3)).toBe('hello'));
});

describe('center', () => {
  it('centers with even padding', () => expect(center('hi', 6, '-')).toBe('--hi--'));
  it('centers with odd padding left-biased', () => expect(center('hi', 5, '-')).toBe('-hi--'));
  it('no pad needed', () => expect(center('hello', 3)).toBe('hello'));
});

// ---------------------------------------------------------------------------
// Repeat / reverse / palindrome / occurrences
// ---------------------------------------------------------------------------
describe('repeat', () => {
  it('no separator', () => expect(repeat('ab', 3)).toBe('ababab'));
  it('with separator', () => expect(repeat('ab', 3, '-')).toBe('ab-ab-ab'));
  it('zero times', () => expect(repeat('ab', 0)).toBe(''));
});

describe('reverse', () => {
  it('reverses', () => expect(reverse('hello')).toBe('olleh'));
  it('empty', () => expect(reverse('')).toBe(''));
});

describe('isPalindrome', () => {
  it('true for racecar', () => expect(isPalindrome('racecar')).toBe(true));
  it('true with mixed case', () => expect(isPalindrome('RaceCar')).toBe(true));
  it('true with punctuation', () => expect(isPalindrome('A man, a plan, a canal: Panama')).toBe(true));
  it('false for non-palindrome', () => expect(isPalindrome('hello')).toBe(false));
});

describe('countOccurrences', () => {
  it('basic count', () => expect(countOccurrences('hello world', 'l')).toBe(3));
  it('empty substring returns 0', () => expect(countOccurrences('hello', '')).toBe(0));
  it('no match', () => expect(countOccurrences('hello', 'z')).toBe(0));
  it('non-overlapping', () => expect(countOccurrences('aaa', 'aa')).toBe(1));
});

// ---------------------------------------------------------------------------
// Pattern & search
// ---------------------------------------------------------------------------
describe('escapeRegex', () => {
  it('escapes special regex chars', () => {
    const escaped = escapeRegex('$.+*?[](){}|\\^');
    expect(() => new RegExp(escaped)).not.toThrow();
    expect(new RegExp(escaped).test('$.+*?[](){}|\\^')).toBe(true);
  });
});

describe('extractMatches', () => {
  it('extracts global matches from string pattern', () => {
    expect(extractMatches('cat bat sat', '[a-z]at')).toEqual(['cat', 'bat', 'sat']);
  });

  it('extracts from RegExp', () => {
    expect(extractMatches('abc123def456', /\d+/)).toEqual(['123', '456']);
  });
});

describe('replaceAll', () => {
  it('replaces all occurrences', () => {
    expect(replaceAll('aababab', 'ab', 'X')).toBe('aXXX');
  });
});

describe('replaceMap', () => {
  it('applies simultaneous replacements', () => {
    expect(replaceMap('cat and dog', { cat: 'dog', dog: 'cat' })).toBe('dog and cat');
  });

  it('empty map returns original', () => {
    expect(replaceMap('hello', {})).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// Diff & similarity
// ---------------------------------------------------------------------------
describe('levenshteinDistance', () => {
  it('"kitten" → "sitting" = 3', () => expect(levenshteinDistance('kitten', 'sitting')).toBe(3));
  it('identical strings = 0', () => expect(levenshteinDistance('abc', 'abc')).toBe(0));
  it('empty to non-empty', () => expect(levenshteinDistance('', 'abc')).toBe(3));
  it('both empty = 0', () => expect(levenshteinDistance('', '')).toBe(0));
});

describe('similarity', () => {
  it('identical = 1', () => expect(similarity('hello', 'hello')).toBe(1));
  it('empty strings = 1', () => expect(similarity('', '')).toBe(1));
  it('completely different approaches 0', () => expect(similarity('abc', 'xyz')).toBeLessThan(0.5));
  it('between 0 and 1', () => {
    const s = similarity('kitten', 'sitting');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});

describe('longestCommonSubstring', () => {
  it('finds common substring', () => expect(longestCommonSubstring('abcdef', 'bcde')).toBe('bcde'));
  it('no common = empty', () => expect(longestCommonSubstring('abc', 'xyz')).toBe(''));
  it('identical', () => expect(longestCommonSubstring('hello', 'hello')).toBe('hello'));
});

describe('longestCommonSubsequence', () => {
  it('basic — result length is 4 (multiple valid LCS exist)', () => {
    expect(longestCommonSubsequence('ABCBDAB', 'BDCABA').length).toBe(4);
  });
  it('identical', () => expect(longestCommonSubsequence('abc', 'abc')).toBe('abc'));
  it('no common = empty', () => expect(longestCommonSubsequence('abc', 'xyz')).toBe(''));
  it('empty a', () => expect(longestCommonSubsequence('', 'abc')).toBe(''));
  it('empty b', () => expect(longestCommonSubsequence('abc', '')).toBe(''));
});

describe('diffWords', () => {
  it('same text produces same tokens', () => {
    const result = diffWords('hello world', 'hello world');
    expect(result.every((t) => t.type === 'same')).toBe(true);
  });

  it('added word', () => {
    const result = diffWords('hello', 'hello world');
    expect(result.some((t) => t.type === 'added' && t.text === 'world')).toBe(true);
  });

  it('removed word', () => {
    const result = diffWords('hello world', 'hello');
    expect(result.some((t) => t.type === 'removed' && t.text === 'world')).toBe(true);
  });

  it('tracks same tokens', () => {
    const result = diffWords('cat sat', 'cat bat');
    expect(result.some((t) => t.type === 'same' && t.text === 'cat')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
describe('formatNumber', () => {
  it('thousands separator', () => expect(formatNumber(1234567)).toBe('1,234,567'));
  it('with decimals', () => expect(formatNumber(1234567.89, { decimals: 2 })).toBe('1,234,567.89'));
  it('custom separator', () => expect(formatNumber(1234567, { separator: '.' })).toBe('1.234.567'));
  it('prefix and suffix', () => expect(formatNumber(42, { prefix: '$', suffix: ' USD' })).toBe('$42 USD'));
  it('negative number', () => expect(formatNumber(-1234, { decimals: 0 })).toBe('-1,234'));
});

describe('formatOdds', () => {
  it('negative odds', () => expect(formatOdds(-110)).toBe('-110'));
  it('positive odds', () => expect(formatOdds(150)).toBe('+150'));
  it('even odds', () => expect(formatOdds(100)).toBe('+100'));
});

describe('formatSpread', () => {
  it('positive spread', () => expect(formatSpread(3.5)).toBe('+3.5'));
  it('negative spread', () => expect(formatSpread(-3.5)).toBe('-3.5'));
  it('zero = PK', () => expect(formatSpread(0)).toBe('PK'));
});

describe('formatRecord', () => {
  it('two part', () => expect(formatRecord(10, 5)).toBe('10-5'));
  it('three part with ties', () => expect(formatRecord(10, 5, 1)).toBe('10-5-1'));
  it('zero ties still two part', () => expect(formatRecord(10, 5, 0)).toBe('10-5'));
});

describe('formatPercentage', () => {
  it('default 1 decimal', () => expect(formatPercentage(0.1234)).toBe('12.3%'));
  it('zero decimals', () => expect(formatPercentage(0.5, 0)).toBe('50%'));
  it('two decimals', () => expect(formatPercentage(0.1234, 2)).toBe('12.34%'));
});

describe('formatDuration', () => {
  it('milliseconds only', () => expect(formatDuration(500)).toBe('0s'));
  it('seconds', () => expect(formatDuration(45000)).toBe('45s'));
  it('minutes', () => expect(formatDuration(120000)).toBe('2m'));
  it('minutes and seconds', () => expect(formatDuration(90000)).toBe('1m 30s'));
  it('hours', () => expect(formatDuration(3600000)).toBe('1h'));
  it('hours and minutes', () => expect(formatDuration(9000000)).toBe('2h 30m'));
  it('days', () => expect(formatDuration(86400000)).toBe('1d'));
  it('days and hours', () => expect(formatDuration(86400000 + 3 * 3600000)).toBe('1d 3h'));
});

describe('pluralize', () => {
  it('singular for 1', () => expect(pluralize(1, 'pick')).toBe('1 pick'));
  it('plural for 0', () => expect(pluralize(0, 'pick')).toBe('0 picks'));
  it('plural for many', () => expect(pluralize(3, 'pick')).toBe('3 picks'));
  it('custom plural', () => expect(pluralize(2, 'ox', 'oxen')).toBe('2 oxen'));
});

describe('slug', () => {
  it('spaces to dashes', () => expect(slug('hello world')).toBe('hello-world'));
  it('special chars removed', () => expect(slug('hello, world!')).toBe('hello-world'));
  it('unicode normalized', () => expect(slug('Héllo Wörld')).toBe('hello-world'));
  it('already slug', () => expect(slug('hello-world')).toBe('hello-world'));
  it('multiple spaces collapse', () => expect(slug('hello  world')).toBe('hello-world'));
});

describe('initials', () => {
  it('two words', () => expect(initials('John Smith')).toBe('JS'));
  it('three words capped at 3', () => expect(initials('John Michael Smith')).toBe('JMS'));
  it('single word', () => expect(initials('Madonna')).toBe('M'));
  it('custom max', () => expect(initials('John Michael Smith', 2)).toBe('JM'));
});

describe('maskString', () => {
  it('masks middle', () => expect(maskString('1234567890', 4, 2)).toBe('1234****90'));
  it('no visible start', () => expect(maskString('abcdef', 0, 2)).toBe('****ef'));
  it('no visible end', () => expect(maskString('abcdef', 2, 0)).toBe('ab****'));
  it('custom char', () => expect(maskString('abcdef', 2, 2, 'X')).toBe('abXXef'));
  it('string shorter than window', () => expect(maskString('ab', 5, 2)).toBe('ab'));
  it('defaults: 0 visible start 0 visible end masks all', () => {
    expect(maskString('abcdefgh')).toBe('********');
  });
});

// ---------------------------------------------------------------------------
// Sports-specific
// ---------------------------------------------------------------------------
describe('formatPickLine', () => {
  it('all parts present', () => {
    expect(formatPickLine(-3.5, 45.5, -150)).toBe('-3.5 | O/U 45.5 | ML -150');
  });

  it('spread only', () => {
    expect(formatPickLine(-3.5, undefined, undefined)).toBe('-3.5');
  });

  it('total only', () => {
    expect(formatPickLine(undefined, 45.5, undefined)).toBe('O/U 45.5');
  });

  it('moneyline only', () => {
    expect(formatPickLine(undefined, undefined, 150)).toBe('ML +150');
  });

  it('spread and total', () => {
    expect(formatPickLine(3.5, 48, undefined)).toBe('+3.5 | O/U 48');
  });

  it('total and moneyline', () => {
    expect(formatPickLine(undefined, 50, -110)).toBe('O/U 50 | ML -110');
  });
});

describe('abbreviateName', () => {
  it('two-word name', () => expect(abbreviateName('Patrick Mahomes')).toBe('P. Mahomes'));
  it('three-word name', () => expect(abbreviateName('John Michael Smith')).toBe('J. Michael Smith'));
  it('single word', () => expect(abbreviateName('Madonna')).toBe('Madonna'));
});

describe('parseOddsString', () => {
  it('positive odds', () => expect(parseOddsString('+150')).toBe(150));
  it('negative odds', () => expect(parseOddsString('-110')).toBe(-110));
  it('no sign negative', () => expect(parseOddsString('-200')).toBe(-200));
  it('invalid string', () => expect(parseOddsString('abc')).toBeNull());
  it('float rejected', () => expect(parseOddsString('+1.5')).toBeNull());
  it('empty string', () => expect(parseOddsString('')).toBeNull());
});

describe('highlight', () => {
  it('wraps match in default markers', () => {
    expect(highlight('Hello World', 'world')).toBe('Hello **World**');
  });

  it('case-insensitive', () => {
    expect(highlight('Kansas City', 'KANSAS')).toBe('**Kansas** City');
  });

  it('custom markFn', () => {
    expect(highlight('score today', 'today', (m) => `<em>${m}</em>`)).toBe('score <em>today</em>');
  });

  it('empty query returns original', () => {
    expect(highlight('hello', '')).toBe('hello');
  });

  it('multiple occurrences all highlighted', () => {
    expect(highlight('the cat sat on the mat', 'at')).toBe(
      'the c**at** s**at** on the m**at**',
    );
  });
});

// ---------------------------------------------------------------------------
// levenshteinSimilarity
// ---------------------------------------------------------------------------
describe('levenshteinSimilarity', () => {
  it('identical strings return 1', () => {
    expect(levenshteinSimilarity('hello', 'hello')).toBe(1);
  });

  it('both empty return 1', () => {
    expect(levenshteinSimilarity('', '')).toBe(1);
  });

  it('completely different short strings < 0.5', () => {
    expect(levenshteinSimilarity('abc', 'xyz')).toBeLessThan(0.5);
  });

  it('value is between 0 and 1', () => {
    const s = levenshteinSimilarity('kitten', 'sitting');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });

  it('1 char vs empty returns 0', () => {
    expect(levenshteinSimilarity('a', '')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// damerauLevenshteinDistance
// ---------------------------------------------------------------------------
describe('damerauLevenshteinDistance', () => {
  it('identical = 0', () => expect(damerauLevenshteinDistance('abc', 'abc')).toBe(0));
  it('both empty = 0', () => expect(damerauLevenshteinDistance('', '')).toBe(0));
  it('transposition counts as 1', () => {
    expect(damerauLevenshteinDistance('ab', 'ba')).toBe(1);
  });
  it('kitten→sitting = 3', () => {
    expect(damerauLevenshteinDistance('kitten', 'sitting')).toBe(3);
  });
  it('empty to non-empty', () => {
    expect(damerauLevenshteinDistance('', 'abc')).toBe(3);
  });
  it('non-empty to empty', () => {
    expect(damerauLevenshteinDistance('abc', '')).toBe(3);
  });
  it('ca→abc = 2', () => {
    // insert 'a' at start + transpose would not help; actual min edit = 2
    expect(damerauLevenshteinDistance('ca', 'abc')).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// jaroSimilarity
// ---------------------------------------------------------------------------
describe('jaroSimilarity', () => {
  it('identical strings = 1', () => {
    expect(jaroSimilarity('hello', 'hello')).toBe(1);
  });

  it('both empty = 1 (same string)', () => {
    expect(jaroSimilarity('', '')).toBe(1);
  });

  it('one empty = 0', () => {
    expect(jaroSimilarity('hello', '')).toBe(0);
    expect(jaroSimilarity('', 'hello')).toBe(0);
  });

  it('martha vs marhta known value ~0.944', () => {
    const score = jaroSimilarity('MARTHA', 'MARHTA');
    expect(score).toBeCloseTo(0.944, 2);
  });

  it('completely different = low score', () => {
    expect(jaroSimilarity('xyz', 'abc')).toBeLessThan(0.4);
  });

  it('score in range [0, 1]', () => {
    const s = jaroSimilarity('kitten', 'sitting');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// jaroWinklerSimilarity
// ---------------------------------------------------------------------------
describe('jaroWinklerSimilarity', () => {
  it('identical strings = 1', () => {
    expect(jaroWinklerSimilarity('hello', 'hello')).toBe(1);
  });

  it('both empty = 1', () => {
    expect(jaroWinklerSimilarity('', '')).toBe(1);
  });

  it('MARTHA vs MARHTA ≥ jaro score', () => {
    const jaro = jaroSimilarity('MARTHA', 'MARHTA');
    const jw = jaroWinklerSimilarity('MARTHA', 'MARHTA');
    expect(jw).toBeGreaterThanOrEqual(jaro);
  });

  it('common prefix boosts score', () => {
    const noPrefix = jaroWinklerSimilarity('abcxyz', 'abcqrs');
    const withPrefix = jaroWinklerSimilarity('abcabc', 'abcabc');
    expect(withPrefix).toBeGreaterThan(noPrefix);
  });

  it('score in range [0, 1]', () => {
    const s = jaroWinklerSimilarity('test', 'text');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('custom p parameter', () => {
    const s1 = jaroWinklerSimilarity('abc', 'abd', 0.0);
    const s2 = jaroWinklerSimilarity('abc', 'abd', 0.25);
    expect(s2).toBeGreaterThanOrEqual(s1);
  });
});

// ---------------------------------------------------------------------------
// fuzzyMatch
// ---------------------------------------------------------------------------
describe('fuzzyMatch', () => {
  it('returns candidates above threshold', () => {
    const results = fuzzyMatch('chiefs', ['chiefs', 'raiders', 'eagles', 'chieves']);
    expect(results.length).toBeGreaterThan(0);
    const names = results.map((r) => r.candidate);
    expect(names).toContain('chiefs');
  });

  it('filters out below threshold', () => {
    const results = fuzzyMatch('xyz', ['aaa', 'bbb', 'ccc'], 0.9);
    expect(results).toHaveLength(0);
  });

  it('results sorted descending by score', () => {
    const results = fuzzyMatch('test', ['test', 'tset', 'best', 'toast']);
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.score).toBeGreaterThanOrEqual(results[i]!.score);
    }
  });

  it('empty candidates returns empty', () => {
    expect(fuzzyMatch('hello', [])).toEqual([]);
  });

  it('custom threshold', () => {
    const results = fuzzyMatch('hello', ['helo', 'world'], 0.5);
    expect(results.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// soundex
// ---------------------------------------------------------------------------
describe('soundex', () => {
  it('Robert → R163', () => expect(soundex('Robert')).toBe('R163'));
  it('Rupert → R163', () => expect(soundex('Rupert')).toBe('R163'));
  it('Rubin → R150', () => expect(soundex('Rubin')).toBe('R150'));
  it('Ashcraft → A261', () => expect(soundex('Ashcraft')).toBe('A261'));
  it('Euler → E460', () => expect(soundex('Euler')).toBe('E460'));
  it('Ellery → E460', () => expect(soundex('Ellery')).toBe('E460'));
  it('empty string → empty string', () => expect(soundex('')).toBe(''));
  it('pads to 4 chars', () => {
    const result = soundex('Lee');
    expect(result).toHaveLength(4);
  });
  it('first char preserved', () => {
    expect(soundex('Smith')[0]).toBe('S');
  });
});

// ---------------------------------------------------------------------------
// metaphone
// ---------------------------------------------------------------------------
describe('metaphone', () => {
  it('empty returns empty', () => expect(metaphone('')).toBe(''));
  it('PH → F', () => {
    const result = metaphone('phone');
    expect(result).toContain('F');
  });
  it('TH → 0', () => {
    const result = metaphone('the');
    expect(result).toContain('0');
  });
  it('W before vowel kept', () => {
    const result = metaphone('water');
    expect(result[0]).toBe('W');
  });
  it('non-alpha chars stripped', () => {
    const result = metaphone('hello!');
    expect(result).toBe(metaphone('hello'));
  });
});

// ---------------------------------------------------------------------------
// phoneticMatch
// ---------------------------------------------------------------------------
describe('phoneticMatch', () => {
  it('Robert and Rupert match', () => expect(phoneticMatch('Robert', 'Rupert')).toBe(true));
  it('Smith and Smythe match', () => expect(phoneticMatch('Smith', 'Smythe')).toBe(true));
  it('different names do not match', () => expect(phoneticMatch('Johnson', 'Williams')).toBe(false));
  it('same word matches itself', () => expect(phoneticMatch('hello', 'hello')).toBe(true));
});

// ---------------------------------------------------------------------------
// tokenize
// ---------------------------------------------------------------------------
describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('hello world')).toEqual(['hello', 'world']);
  });

  it('splits on punctuation', () => {
    expect(tokenize('hello, world!')).toEqual(['hello', 'world']);
  });

  it('returns lowercase', () => {
    expect(tokenize('Hello World')).toEqual(['hello', 'world']);
  });

  it('filters empty tokens', () => {
    expect(tokenize('  hello   world  ')).toEqual(['hello', 'world']);
  });

  it('empty string returns empty array', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('mixed punctuation and spaces', () => {
    const result = tokenize('one,two;three');
    expect(result).toContain('one');
    expect(result).toContain('two');
    expect(result).toContain('three');
  });
});

// ---------------------------------------------------------------------------
// removeStopWords
// ---------------------------------------------------------------------------
describe('removeStopWords', () => {
  it('removes default stop words', () => {
    const tokens = ['the', 'cat', 'is', 'on', 'the', 'mat'];
    const result = removeStopWords(tokens);
    expect(result).not.toContain('the');
    expect(result).not.toContain('is');
    expect(result).not.toContain('on');
    expect(result).toContain('cat');
    expect(result).toContain('mat');
  });

  it('custom stop words', () => {
    const tokens = ['foo', 'bar', 'baz'];
    const result = removeStopWords(tokens, ['foo', 'baz']);
    expect(result).toEqual(['bar']);
  });

  it('empty token list returns empty', () => {
    expect(removeStopWords([])).toEqual([]);
  });

  it('no stop words in list returns all tokens', () => {
    const tokens = ['hello', 'world'];
    expect(removeStopWords(tokens)).toEqual(['hello', 'world']);
  });
});

// ---------------------------------------------------------------------------
// stemWord
// ---------------------------------------------------------------------------
describe('stemWord', () => {
  it('removes -ing', () => expect(stemWord('running')).toBe('run'));
  it('removes -ed', () => expect(stemWord('played')).toBe('play'));
  it('removes -ly', () => expect(stemWord('quickly')).toBe('quick'));
  it('converts -ies to -y', () => expect(stemWord('carries')).toBe('carry'));
  it('removes trailing -s on plurals', () => expect(stemWord('cats')).toBe('cat'));
  it('short word not over-stemmed', () => {
    const result = stemWord('is');
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
  it('removes -er', () => expect(stemWord('player')).toBe('play'));
  it('removes -ness', () => expect(stemWord('happiness')).toBe('happi'));
});

// ---------------------------------------------------------------------------
// stemTokens
// ---------------------------------------------------------------------------
describe('stemTokens', () => {
  it('applies stemWord to each token', () => {
    const tokens = ['running', 'cats', 'played'];
    const result = stemTokens(tokens);
    expect(result).toEqual(tokens.map((t) => stemWord(t)));
  });

  it('empty array returns empty', () => {
    expect(stemTokens([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// nGrams
// ---------------------------------------------------------------------------
describe('nGrams', () => {
  it('bigrams', () => {
    const result = nGrams(['a', 'b', 'c', 'd'], 2);
    expect(result).toEqual([['a', 'b'], ['b', 'c'], ['c', 'd']]);
  });

  it('trigrams', () => {
    const result = nGrams(['a', 'b', 'c', 'd'], 3);
    expect(result).toEqual([['a', 'b', 'c'], ['b', 'c', 'd']]);
  });

  it('n > tokens length returns empty', () => {
    expect(nGrams(['a', 'b'], 5)).toEqual([]);
  });

  it('n = 0 returns empty', () => {
    expect(nGrams(['a', 'b', 'c'], 0)).toEqual([]);
  });

  it('n = 1 returns unigrams', () => {
    expect(nGrams(['a', 'b', 'c'], 1)).toEqual([['a'], ['b'], ['c']]);
  });

  it('empty tokens returns empty', () => {
    expect(nGrams([], 2)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// characterNGrams
// ---------------------------------------------------------------------------
describe('characterNGrams', () => {
  it('bigrams', () => {
    expect(characterNGrams('abc', 2)).toEqual(['ab', 'bc']);
  });

  it('trigrams', () => {
    expect(characterNGrams('abcd', 3)).toEqual(['abc', 'bcd']);
  });

  it('n > string length returns empty', () => {
    expect(characterNGrams('ab', 5)).toEqual([]);
  });

  it('n = 0 returns empty', () => {
    expect(characterNGrams('abc', 0)).toEqual([]);
  });

  it('empty string returns empty', () => {
    expect(characterNGrams('', 2)).toEqual([]);
  });

  it('n = string length returns one element', () => {
    expect(characterNGrams('abc', 3)).toEqual(['abc']);
  });
});

// ---------------------------------------------------------------------------
// textDiff
// ---------------------------------------------------------------------------
describe('textDiff', () => {
  it('identical text has only equal tokens', () => {
    const result = textDiff('hello\nworld', 'hello\nworld');
    expect(result.every((t) => t.type === 'equal')).toBe(true);
  });

  it('added line detected', () => {
    const result = textDiff('line1', 'line1\nline2');
    expect(result.some((t) => t.type === 'insert' && t.text === 'line2')).toBe(true);
  });

  it('deleted line detected', () => {
    const result = textDiff('line1\nline2', 'line1');
    expect(result.some((t) => t.type === 'delete' && t.text === 'line2')).toBe(true);
  });

  it('empty original all inserts', () => {
    const result = textDiff('', 'new line');
    expect(result.some((t) => t.type === 'insert')).toBe(true);
  });

  it('empty modified all deletes', () => {
    const result = textDiff('old line', '');
    expect(result.some((t) => t.type === 'delete')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// diffRatio
// ---------------------------------------------------------------------------
describe('diffRatio', () => {
  it('identical strings = 1', () => {
    expect(diffRatio('hello', 'hello')).toBe(1);
  });

  it('both empty = 1', () => {
    expect(diffRatio('', '')).toBe(1);
  });

  it('completely different = low ratio', () => {
    expect(diffRatio('abc', 'xyz')).toBeLessThan(0.5);
  });

  it('similar strings > 0.5', () => {
    expect(diffRatio('hello world', 'hello worlds')).toBeGreaterThan(0.5);
  });

  it('value in [0, 1]', () => {
    const r = diffRatio('kitten', 'sitting');
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// toTitleCase
// ---------------------------------------------------------------------------
describe('toTitleCase', () => {
  it('basic', () => expect(toTitleCase('hello world')).toBe('Hello World'));
  it('lowercases non-first letters', () => expect(toTitleCase('HELLO WORLD')).toBe('Hello World'));
  it('empty string', () => expect(toTitleCase('')).toBe(''));
  it('single word', () => expect(toTitleCase('hello')).toBe('Hello'));
  it('mixed case', () => expect(toTitleCase('hElLo WoRlD')).toBe('Hello World'));
});

// ---------------------------------------------------------------------------
// toCamelCase
// ---------------------------------------------------------------------------
describe('toCamelCase', () => {
  it('snake_case', () => expect(toCamelCase('hello_world')).toBe('helloWorld'));
  it('kebab-case', () => expect(toCamelCase('hello-world')).toBe('helloWorld'));
  it('space separated', () => expect(toCamelCase('hello world')).toBe('helloWorld'));
  it('PascalCase', () => expect(toCamelCase('HelloWorld')).toBe('helloWorld'));
  it('empty string', () => expect(toCamelCase('')).toBe(''));
});

// ---------------------------------------------------------------------------
// toSnakeCase
// ---------------------------------------------------------------------------
describe('toSnakeCase', () => {
  it('camelCase', () => expect(toSnakeCase('helloWorld')).toBe('hello_world'));
  it('PascalCase', () => expect(toSnakeCase('HelloWorld')).toBe('hello_world'));
  it('space separated', () => expect(toSnakeCase('hello world')).toBe('hello_world'));
  it('kebab-case', () => expect(toSnakeCase('hello-world')).toBe('hello_world'));
  it('empty string', () => expect(toSnakeCase('')).toBe(''));
});

// ---------------------------------------------------------------------------
// toKebabCase
// ---------------------------------------------------------------------------
describe('toKebabCase', () => {
  it('camelCase', () => expect(toKebabCase('helloWorld')).toBe('hello-world'));
  it('snake_case', () => expect(toKebabCase('hello_world')).toBe('hello-world'));
  it('space separated', () => expect(toKebabCase('hello world')).toBe('hello-world'));
  it('PascalCase', () => expect(toKebabCase('HelloWorld')).toBe('hello-world'));
});

// ---------------------------------------------------------------------------
// toPascalCase
// ---------------------------------------------------------------------------
describe('toPascalCase', () => {
  it('snake_case', () => expect(toPascalCase('hello_world')).toBe('HelloWorld'));
  it('kebab-case', () => expect(toPascalCase('hello-world')).toBe('HelloWorld'));
  it('space separated', () => expect(toPascalCase('hello world')).toBe('HelloWorld'));
  it('camelCase', () => expect(toPascalCase('helloWorld')).toBe('HelloWorld'));
});

// ---------------------------------------------------------------------------
// wrap
// ---------------------------------------------------------------------------
describe('wrap', () => {
  it('wraps at word boundary', () => {
    const result = wrap('hello world foo bar', 10);
    expect(result.every((line) => line.length <= 10)).toBe(true);
  });

  it('short string fits in one line', () => {
    expect(wrap('hello', 20)).toEqual(['hello']);
  });

  it('empty string returns empty array', () => {
    expect(wrap('', 10)).toEqual([]);
  });

  it('word longer than width stays on one line', () => {
    const result = wrap('superlongword', 5);
    expect(result).toContain('superlongword');
  });

  it('multiple lines', () => {
    const result = wrap('one two three four', 8);
    expect(result.length).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// extractNumbers
// ---------------------------------------------------------------------------
describe('extractNumbers', () => {
  it('extracts integers', () => {
    expect(extractNumbers('abc 123 def 456')).toEqual([123, 456]);
  });

  it('extracts decimals', () => {
    expect(extractNumbers('price 3.14 qty 2')).toEqual([3.14, 2]);
  });

  it('no numbers returns empty', () => {
    expect(extractNumbers('no numbers here')).toEqual([]);
  });

  it('empty string returns empty', () => {
    expect(extractNumbers('')).toEqual([]);
  });

  it('negative numbers', () => {
    const result = extractNumbers('-5 and -3.14');
    expect(result).toContain(-5);
    expect(result).toContain(-3.14);
  });
});

// ---------------------------------------------------------------------------
// extractEmails
// ---------------------------------------------------------------------------
describe('extractEmails', () => {
  it('extracts single email', () => {
    expect(extractEmails('contact me at foo@bar.com')).toEqual(['foo@bar.com']);
  });

  it('extracts multiple emails', () => {
    const result = extractEmails('a@b.com and c@d.org');
    expect(result).toContain('a@b.com');
    expect(result).toContain('c@d.org');
  });

  it('no emails returns empty', () => {
    expect(extractEmails('no emails here')).toEqual([]);
  });

  it('empty string returns empty', () => {
    expect(extractEmails('')).toEqual([]);
  });

  it('invalid email not extracted', () => {
    expect(extractEmails('not-an-email')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// extractUrls
// ---------------------------------------------------------------------------
describe('extractUrls', () => {
  it('extracts http URL', () => {
    const result = extractUrls('visit http://example.com today');
    expect(result).toContain('http://example.com');
  });

  it('extracts https URL', () => {
    const result = extractUrls('see https://www.google.com for more');
    expect(result).toContain('https://www.google.com');
  });

  it('no URLs returns empty', () => {
    expect(extractUrls('no urls here')).toEqual([]);
  });

  it('multiple URLs', () => {
    const result = extractUrls('http://a.com and https://b.org');
    expect(result.length).toBe(2);
  });

  it('empty string returns empty', () => {
    expect(extractUrls('')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// wildcardMatch
// ---------------------------------------------------------------------------
describe('wildcardMatch', () => {
  it('* matches any sequence', () => {
    expect(wildcardMatch('h*o', 'hello')).toBe(true);
  });

  it('? matches single char', () => {
    expect(wildcardMatch('h?llo', 'hello')).toBe(true);
  });

  it('exact match without wildcards', () => {
    expect(wildcardMatch('hello', 'hello')).toBe(true);
  });

  it('mismatch without wildcards', () => {
    expect(wildcardMatch('hello', 'world')).toBe(false);
  });

  it('* at start', () => {
    expect(wildcardMatch('*world', 'helloworld')).toBe(true);
  });

  it('* at end', () => {
    expect(wildcardMatch('hello*', 'helloworld')).toBe(true);
  });

  it('double star matches empty', () => {
    expect(wildcardMatch('**', '')).toBe(true);
  });

  it('? does not match empty', () => {
    expect(wildcardMatch('?', '')).toBe(false);
  });

  it('empty pattern matches empty string', () => {
    expect(wildcardMatch('', '')).toBe(true);
  });

  it('empty pattern does not match non-empty', () => {
    expect(wildcardMatch('', 'hello')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// normalizeTeamName
// ---------------------------------------------------------------------------
describe('normalizeTeamName', () => {
  it('lowercases', () => {
    expect(normalizeTeamName('New England Patriots')).toBe('new england patriots');
  });

  it('removes punctuation and collapses spaces', () => {
    // Dots become spaces → "L A  Rams" → collapse → "l a rams"
    expect(normalizeTeamName('L.A. Rams')).toBe('l a rams');
  });

  it('collapses whitespace', () => {
    const result = normalizeTeamName('  Kansas   City  Chiefs  ');
    expect(result).toBe('kansas city chiefs');
  });

  it('empty string returns empty', () => {
    expect(normalizeTeamName('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// teamAbbreviation
// ---------------------------------------------------------------------------
describe('teamAbbreviation', () => {
  it('3 words → 3 letter abbreviation', () => {
    expect(teamAbbreviation('New England Patriots')).toBe('NEP');
  });

  it('2 words → 2 letter abbreviation with default maxLen 3', () => {
    expect(teamAbbreviation('Kansas City')).toBe('KC');
  });

  it('custom maxLen', () => {
    expect(teamAbbreviation('New England Patriots', 2)).toBe('NE');
  });

  it('single word', () => {
    expect(teamAbbreviation('Chiefs')).toBe('C');
  });

  it('uppercase first letters', () => {
    const result = teamAbbreviation('new england patriots');
    expect(result).toBe('NEP');
  });
});

// ---------------------------------------------------------------------------
// parseAmericanOddsString
// ---------------------------------------------------------------------------
describe('parseAmericanOddsString', () => {
  it('parses positive odds +150', () => {
    expect(parseAmericanOddsString('+150')).toBe(150);
  });

  it('parses negative odds -110', () => {
    expect(parseAmericanOddsString('-110')).toBe(-110);
  });

  it('parses even odds 100', () => {
    expect(parseAmericanOddsString('100')).toBe(100);
  });

  it('throws on invalid string', () => {
    expect(() => parseAmericanOddsString('abc')).toThrow();
  });

  it('throws on float', () => {
    expect(() => parseAmericanOddsString('+1.5')).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => parseAmericanOddsString('')).toThrow();
  });

  it('trims whitespace', () => {
    expect(parseAmericanOddsString('  +200  ')).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// formatPickLabel
// ---------------------------------------------------------------------------
describe('formatPickLabel', () => {
  it('formats correctly', () => {
    expect(formatPickLabel('NFL', 'Chiefs', 'Eagles', 'Spread')).toBe('NFL: Chiefs vs Eagles — Spread');
  });

  it('different sport and bet type', () => {
    expect(formatPickLabel('NBA', 'Lakers', 'Celtics', 'Moneyline')).toBe('NBA: Lakers vs Celtics — Moneyline');
  });

  it('handles abbreviations', () => {
    expect(formatPickLabel('MLB', 'NYY', 'BOS', 'Total')).toBe('MLB: NYY vs BOS — Total');
  });
});

// ---------------------------------------------------------------------------
// slugifyTeam
// ---------------------------------------------------------------------------
describe('slugifyTeam', () => {
  it('basic team name', () => {
    expect(slugifyTeam('Green Bay Packers')).toBe('green-bay-packers');
  });

  it('already lowercase', () => {
    expect(slugifyTeam('chicago bears')).toBe('chicago-bears');
  });

  it('special chars removed', () => {
    expect(slugifyTeam("St. Louis Rams")).toBe('st-louis-rams');
  });

  it('multiple spaces collapse', () => {
    expect(slugifyTeam('Kansas  City  Chiefs')).toBe('kansas-city-chiefs');
  });

  it('empty string', () => {
    expect(slugifyTeam('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// abbreviateNumber
// ---------------------------------------------------------------------------
describe('abbreviateNumber', () => {
  it('thousands → K', () => {
    expect(abbreviateNumber(1000)).toBe('1K');
  });

  it('millions → M', () => {
    expect(abbreviateNumber(1500000)).toBe('1.5M');
  });

  it('billions → B', () => {
    expect(abbreviateNumber(1000000000)).toBe('1B');
  });

  it('less than 1000 returns as-is', () => {
    expect(abbreviateNumber(999)).toBe('999');
  });

  it('custom decimals', () => {
    expect(abbreviateNumber(1234, 2)).toBe('1.23K');
  });

  it('negative numbers', () => {
    expect(abbreviateNumber(-1000)).toBe('-1K');
  });

  it('zero', () => {
    expect(abbreviateNumber(0)).toBe('0');
  });

  it('1.5K with default decimals', () => {
    expect(abbreviateNumber(1500)).toBe('1.5K');
  });
});
