import { describe, it, expect } from 'vitest';
import {
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
  it('custom suffix', () => expect(truncate('hello world', 8, '...')).toBe('hello...')); // 8 - 3 = 5
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
    // 'ABCBDAB' and 'BDCABA' have LCS of length 4; actual string may vary
    expect(longestCommonSubsequence('ABCBDAB', 'BDCABA').length).toBe(4);
  });
  it('identical', () => expect(longestCommonSubsequence('abc', 'abc')).toBe('abc'));
  it('no common = empty', () => expect(longestCommonSubsequence('abc', 'xyz')).toBe(''));
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
