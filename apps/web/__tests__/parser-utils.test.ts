import { describe, it, expect } from 'vitest';
import {
  parseCsv,
  parseCsvToObjects,
  toCsv,
  objectsToCsv,
  parseQueryString,
  buildQueryString,
  parseCookies,
  parseNumber,
  parsePercent,
  parseBoolean,
  parseDuration,
  parseList,
  parseKeyValue,
  parseEnvLine,
  parseFrontmatter,
  parsePathSegments,
  parseFileExtension,
  parseFilename,
  parseSemver,
  parseTable,
  parseRanges,
  tokenize,
  tryParseJson,
  parseJsonLines,
  deepGet,
} from '@/lib/utils/parser-utils';

// ---------------------------------------------------------------------------
// parseCsv
// ---------------------------------------------------------------------------

describe('parseCsv', () => {
  it('parses a simple single row', () => {
    expect(parseCsv('a,b,c')).toEqual([['a', 'b', 'c']]);
  });

  it('parses multiple rows', () => {
    expect(parseCsv('a,b\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles trailing newline without producing an empty row', () => {
    expect(parseCsv('a,b\nc,d\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles empty fields', () => {
    expect(parseCsv('a,,c')).toEqual([['a', '', 'c']]);
  });

  it('handles empty string input', () => {
    expect(parseCsv('')).toEqual([]);
  });

  it('parses a quoted field containing a comma', () => {
    expect(parseCsv('"a,b",c')).toEqual([['a,b', 'c']]);
  });

  it('parses a quoted field containing an embedded newline', () => {
    expect(parseCsv('"line1\nline2",x')).toEqual([['line1\nline2', 'x']]);
  });

  it('parses escaped double-quotes inside a quoted field', () => {
    expect(parseCsv('"she said ""hi""",b')).toEqual([['she said "hi"', 'b']]);
  });

  it('parses a fully quoted simple field', () => {
    expect(parseCsv('"hello","world"')).toEqual([['hello', 'world']]);
  });

  it('handles multiple quoted fields with commas across rows', () => {
    const input = '"a,1","b,2"\n"c,3","d,4"';
    expect(parseCsv(input)).toEqual([
      ['a,1', 'b,2'],
      ['c,3', 'd,4'],
    ]);
  });

  it('supports a custom delimiter', () => {
    expect(parseCsv('a;b;c', { delimiter: ';' })).toEqual([['a', 'b', 'c']]);
  });

  it('supports tab delimiter', () => {
    expect(parseCsv('a\tb\tc', { delimiter: '\t' })).toEqual([['a', 'b', 'c']]);
  });

  it('does not trim by default', () => {
    expect(parseCsv(' a , b ')).toEqual([[' a ', ' b ']]);
  });

  it('trims when trim option is set', () => {
    expect(parseCsv(' a , b ', { trim: true })).toEqual([['a', 'b']]);
  });

  it('drops the header row when hasHeader is true', () => {
    expect(parseCsv('h1,h2\n1,2', { hasHeader: true })).toEqual([['1', '2']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles a quoted field with embedded delimiter and custom delimiter', () => {
    expect(parseCsv('"a;b";c', { delimiter: ';' })).toEqual([['a;b', 'c']]);
  });

  it('handles a single empty quoted field', () => {
    expect(parseCsv('"",x')).toEqual([['', 'x']]);
  });

  it('preserves embedded CRLF newline inside quotes', () => {
    expect(parseCsv('"a\r\nb",c')).toEqual([['a\r\nb', 'c']]);
  });

  it('handles last row with trailing empty field', () => {
    expect(parseCsv('a,b,')).toEqual([['a', 'b', '']]);
  });
});

// ---------------------------------------------------------------------------
// parseCsvToObjects
// ---------------------------------------------------------------------------

describe('parseCsvToObjects', () => {
  it('maps rows to objects keyed by headers', () => {
    expect(parseCsvToObjects('name,age\nAlice,30\nBob,25')).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(parseCsvToObjects('')).toEqual([]);
  });

  it('returns empty array when only a header is present', () => {
    expect(parseCsvToObjects('a,b,c')).toEqual([]);
  });

  it('fills missing trailing cells with empty strings', () => {
    expect(parseCsvToObjects('a,b,c\n1,2')).toEqual([{ a: '1', b: '2', c: '' }]);
  });

  it('handles quoted values with commas', () => {
    expect(parseCsvToObjects('name,note\nBob,"hi, there"')).toEqual([
      { name: 'Bob', note: 'hi, there' },
    ]);
  });

  it('supports a custom delimiter', () => {
    expect(parseCsvToObjects('a|b\n1|2', { delimiter: '|' })).toEqual([
      { a: '1', b: '2' },
    ]);
  });

  it('ignores extra cells beyond header count', () => {
    const result = parseCsvToObjects('a,b\n1,2,3');
    expect(result).toEqual([{ a: '1', b: '2' }]);
  });
});

// ---------------------------------------------------------------------------
// toCsv
// ---------------------------------------------------------------------------

describe('toCsv', () => {
  it('serializes a simple grid', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\nc,d');
  });

  it('quotes fields containing the delimiter', () => {
    expect(toCsv([['a,b', 'c']])).toBe('"a,b",c');
  });

  it('quotes and escapes fields containing quotes', () => {
    expect(toCsv([['she said "hi"']])).toBe('"she said ""hi"""');
  });

  it('quotes fields containing newlines', () => {
    expect(toCsv([['line1\nline2']])).toBe('"line1\nline2"');
  });

  it('serializes numbers and booleans', () => {
    expect(toCsv([[1, true, 3.5]])).toBe('1,true,3.5');
  });

  it('supports a custom delimiter', () => {
    expect(toCsv([['a', 'b']], { delimiter: ';' })).toBe('a;b');
  });

  it('quotes fields containing custom delimiter', () => {
    expect(toCsv([['a;b', 'c']], { delimiter: ';' })).toBe('"a;b";c');
  });

  it('returns empty string for empty rows', () => {
    expect(toCsv([])).toBe('');
  });

  it('handles a single empty field', () => {
    expect(toCsv([['']])).toBe('');
  });

  it('quotes fields containing carriage returns', () => {
    expect(toCsv([['a\rb']])).toBe('"a\rb"');
  });
});

// ---------------------------------------------------------------------------
// CSV roundtrip
// ---------------------------------------------------------------------------

describe('CSV roundtrip', () => {
  it('roundtrips a simple grid', () => {
    const rows = [
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('roundtrips fields with commas', () => {
    const rows = [['a,b', 'c'], ['d', 'e,f']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('roundtrips fields with quotes', () => {
    const rows = [['say "hi"', 'plain']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('roundtrips fields with embedded newlines', () => {
    const rows = [['multi\nline', 'x']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });

  it('roundtrips a mix of tricky fields', () => {
    const rows = [
      ['normal', 'with,comma', 'with"quote'],
      ['with\nnewline', 'plain', ''],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});

// ---------------------------------------------------------------------------
// objectsToCsv
// ---------------------------------------------------------------------------

describe('objectsToCsv', () => {
  it('serializes objects with a header row', () => {
    const out = objectsToCsv([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
    expect(out).toBe('name,age\nAlice,30\nBob,25');
  });

  it('returns empty string for no objects', () => {
    expect(objectsToCsv([])).toBe('');
  });

  it('derives headers from the union of keys', () => {
    const out = objectsToCsv([{ a: 1 }, { b: 2 }]);
    expect(out).toBe('a,b\n1,\n,2');
  });

  it('preserves first-seen key order', () => {
    const out = objectsToCsv([{ x: 1, y: 2 }, { z: 3, x: 4 }]);
    expect(out.split('\n')[0]).toBe('x,y,z');
  });

  it('quotes values containing commas', () => {
    const out = objectsToCsv([{ note: 'a,b' }]);
    expect(out).toBe('note\n"a,b"');
  });

  it('supports a custom delimiter', () => {
    const out = objectsToCsv([{ a: 1, b: 2 }], { delimiter: ';' });
    expect(out).toBe('a;b\n1;2');
  });

  it('roundtrips through parseCsvToObjects', () => {
    const objs = [
      { name: 'Alice', city: 'NYC' },
      { name: 'Bob', city: 'LA' },
    ];
    expect(parseCsvToObjects(objectsToCsv(objs))).toEqual(objs);
  });

  it('serializes boolean values', () => {
    expect(objectsToCsv([{ active: true }])).toBe('active\ntrue');
  });
});

// ---------------------------------------------------------------------------
// parseQueryString
// ---------------------------------------------------------------------------

describe('parseQueryString', () => {
  it('parses simple key=value pairs', () => {
    expect(parseQueryString('a=1&b=2')).toEqual({ a: '1', b: '2' });
  });

  it('strips a leading question mark', () => {
    expect(parseQueryString('?a=1')).toEqual({ a: '1' });
  });

  it('returns empty object for empty string', () => {
    expect(parseQueryString('')).toEqual({});
  });

  it('returns empty object for a lone question mark', () => {
    expect(parseQueryString('?')).toEqual({});
  });

  it('collapses repeated keys into an array', () => {
    expect(parseQueryString('tag=a&tag=b&tag=c')).toEqual({
      tag: ['a', 'b', 'c'],
    });
  });

  it('decodes URL-encoded values', () => {
    expect(parseQueryString('q=hello%20world')).toEqual({ q: 'hello world' });
  });

  it('decodes plus as space', () => {
    expect(parseQueryString('q=a+b')).toEqual({ q: 'a b' });
  });

  it('handles a key with no value', () => {
    expect(parseQueryString('flag')).toEqual({ flag: '' });
  });

  it('handles a key with an empty value', () => {
    expect(parseQueryString('flag=')).toEqual({ flag: '' });
  });

  it('decodes encoded keys', () => {
    expect(parseQueryString('a%20b=1')).toEqual({ 'a b': '1' });
  });

  it('handles values containing equals signs', () => {
    expect(parseQueryString('eq=a=b')).toEqual({ eq: 'a=b' });
  });

  it('handles three repeated keys mixed with others', () => {
    expect(parseQueryString('x=1&y=2&x=3')).toEqual({ x: ['1', '3'], y: '2' });
  });
});

// ---------------------------------------------------------------------------
// buildQueryString
// ---------------------------------------------------------------------------

describe('buildQueryString', () => {
  it('builds a simple query string', () => {
    expect(buildQueryString({ a: '1', b: '2' })).toBe('a=1&b=2');
  });

  it('produces no leading question mark', () => {
    expect(buildQueryString({ a: '1' }).startsWith('?')).toBe(false);
  });

  it('encodes values', () => {
    expect(buildQueryString({ q: 'hello world' })).toBe('q=hello%20world');
  });

  it('encodes keys', () => {
    expect(buildQueryString({ 'a b': '1' })).toBe('a%20b=1');
  });

  it('repeats keys for array values', () => {
    expect(buildQueryString({ tag: ['a', 'b'] })).toBe('tag=a&tag=b');
  });

  it('serializes numbers', () => {
    expect(buildQueryString({ n: 42 })).toBe('n=42');
  });

  it('serializes booleans', () => {
    expect(buildQueryString({ ok: true })).toBe('ok=true');
  });

  it('handles arrays of numbers', () => {
    expect(buildQueryString({ ids: [1, 2, 3] })).toBe('ids=1&ids=2&ids=3');
  });

  it('returns empty string for empty params', () => {
    expect(buildQueryString({})).toBe('');
  });

  it('roundtrips with parseQueryString', () => {
    const qs = buildQueryString({ a: '1', tag: ['x', 'y'] });
    expect(parseQueryString(qs)).toEqual({ a: '1', tag: ['x', 'y'] });
  });

  it('encodes ampersands in values', () => {
    expect(buildQueryString({ q: 'a&b' })).toBe('q=a%26b');
  });
});

// ---------------------------------------------------------------------------
// parseCookies
// ---------------------------------------------------------------------------

describe('parseCookies', () => {
  it('parses simple cookies', () => {
    expect(parseCookies('a=1; b=2')).toEqual({ a: '1', b: '2' });
  });

  it('returns empty object for empty header', () => {
    expect(parseCookies('')).toEqual({});
  });

  it('trims whitespace around pairs', () => {
    expect(parseCookies('  a=1 ;  b=2  ')).toEqual({ a: '1', b: '2' });
  });

  it('decodes URL-encoded values', () => {
    expect(parseCookies('q=hello%20world')).toEqual({ q: 'hello world' });
  });

  it('skips pairs without equals', () => {
    expect(parseCookies('a=1; broken; b=2')).toEqual({ a: '1', b: '2' });
  });

  it('handles a single cookie', () => {
    expect(parseCookies('session=abc')).toEqual({ session: 'abc' });
  });

  it('handles empty cookie values', () => {
    expect(parseCookies('a=; b=2')).toEqual({ a: '', b: '2' });
  });

  it('handles values containing equals after the first', () => {
    expect(parseCookies('token=a=b=c')).toEqual({ token: 'a=b=c' });
  });

  it('returns empty object for whitespace-only header', () => {
    expect(parseCookies('   ')).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// parseNumber
// ---------------------------------------------------------------------------

describe('parseNumber', () => {
  it('parses a plain number', () => {
    expect(parseNumber('42')).toBe(42);
  });

  it('parses a decimal', () => {
    expect(parseNumber('3.14')).toBe(3.14);
  });

  it('parses a negative number', () => {
    expect(parseNumber('-5')).toBe(-5);
  });

  it('strips commas', () => {
    expect(parseNumber('1,234')).toBe(1234);
  });

  it('strips a dollar sign and commas', () => {
    expect(parseNumber('$1,234.50')).toBe(1234.5);
  });

  it('strips a euro sign', () => {
    expect(parseNumber('€99')).toBe(99);
  });

  it('strips a pound sign', () => {
    expect(parseNumber('£10.99')).toBe(10.99);
  });

  it('strips surrounding whitespace', () => {
    expect(parseNumber('  42  ')).toBe(42);
  });

  it('returns default fallback 0 for non-numeric', () => {
    expect(parseNumber('abc')).toBe(0);
  });

  it('returns custom fallback for non-numeric', () => {
    expect(parseNumber('abc', -1)).toBe(-1);
  });

  it('returns fallback for empty string', () => {
    expect(parseNumber('', 7)).toBe(7);
  });

  it('returns fallback for a lone minus', () => {
    expect(parseNumber('-', 5)).toBe(5);
  });

  it('parses zero', () => {
    expect(parseNumber('0')).toBe(0);
  });

  it('handles scientific notation', () => {
    expect(parseNumber('1e3')).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// parsePercent
// ---------------------------------------------------------------------------

describe('parsePercent', () => {
  it('parses a percent with sign', () => {
    expect(parsePercent('45%')).toBe(0.45);
  });

  it('parses a bare number as a percent', () => {
    expect(parsePercent('45')).toBe(0.45);
  });

  it('parses a decimal percent', () => {
    expect(parsePercent('12.5%')).toBe(0.125);
  });

  it('parses 100%', () => {
    expect(parsePercent('100%')).toBe(1);
  });

  it('parses zero', () => {
    expect(parsePercent('0%')).toBe(0);
  });

  it('handles whitespace', () => {
    expect(parsePercent(' 45 % ')).toBe(0.45);
  });

  it('returns default fallback for invalid', () => {
    expect(parsePercent('abc')).toBe(0);
  });

  it('returns custom fallback for invalid', () => {
    expect(parsePercent('abc', -1)).toBe(-1);
  });

  it('parses a negative percent', () => {
    expect(parsePercent('-10%')).toBeCloseTo(-0.1);
  });

  it('returns fallback for empty string', () => {
    expect(parsePercent('', 0.5)).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// parseBoolean
// ---------------------------------------------------------------------------

describe('parseBoolean', () => {
  it('treats "true" as true', () => {
    expect(parseBoolean('true')).toBe(true);
  });

  it('treats "TRUE" (case-insensitive) as true', () => {
    expect(parseBoolean('TRUE')).toBe(true);
  });

  it('treats "yes" as true', () => {
    expect(parseBoolean('yes')).toBe(true);
  });

  it('treats "1" as true', () => {
    expect(parseBoolean('1')).toBe(true);
  });

  it('treats "on" as true', () => {
    expect(parseBoolean('on')).toBe(true);
  });

  it('treats "y" as true', () => {
    expect(parseBoolean('y')).toBe(true);
  });

  it('trims before comparing', () => {
    expect(parseBoolean('  yes ')).toBe(true);
  });

  it('treats "false" as false', () => {
    expect(parseBoolean('false')).toBe(false);
  });

  it('treats "no" as false', () => {
    expect(parseBoolean('no')).toBe(false);
  });

  it('treats "0" as false', () => {
    expect(parseBoolean('0')).toBe(false);
  });

  it('treats arbitrary text as false', () => {
    expect(parseBoolean('maybe')).toBe(false);
  });

  it('passes through boolean true', () => {
    expect(parseBoolean(true)).toBe(true);
  });

  it('passes through boolean false', () => {
    expect(parseBoolean(false)).toBe(false);
  });

  it('treats number 1 as true', () => {
    expect(parseBoolean(1)).toBe(true);
  });

  it('treats number 0 as false', () => {
    expect(parseBoolean(0)).toBe(false);
  });

  it('treats other numbers as false', () => {
    expect(parseBoolean(2)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseDuration
// ---------------------------------------------------------------------------

describe('parseDuration', () => {
  it('parses 1h30m', () => {
    expect(parseDuration('1h30m')).toBe(5400000);
  });

  it('parses 90s', () => {
    expect(parseDuration('90s')).toBe(90000);
  });

  it('parses 2d', () => {
    expect(parseDuration('2d')).toBe(2 * 24 * 60 * 60 * 1000);
  });

  it('parses 500ms', () => {
    expect(parseDuration('500ms')).toBe(500);
  });

  it('distinguishes m (minutes) from ms (milliseconds)', () => {
    expect(parseDuration('5m')).toBe(300000);
    expect(parseDuration('5ms')).toBe(5);
  });

  it('sums all components', () => {
    expect(parseDuration('1d2h3m4s')).toBe(
      24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000 + 3 * 60 * 1000 + 4 * 1000
    );
  });

  it('handles whitespace between components', () => {
    expect(parseDuration('1h 30m')).toBe(5400000);
  });

  it('handles decimal components', () => {
    expect(parseDuration('1.5h')).toBe(5400000);
  });

  it('returns 0 for unparseable input', () => {
    expect(parseDuration('abc')).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(parseDuration('')).toBe(0);
  });

  it('is case-insensitive', () => {
    expect(parseDuration('1H30M')).toBe(5400000);
  });

  it('parses a single second', () => {
    expect(parseDuration('1s')).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// parseList
// ---------------------------------------------------------------------------

describe('parseList', () => {
  it('splits on commas and trims', () => {
    expect(parseList('a, b, c')).toEqual(['a', 'b', 'c']);
  });

  it('drops empty entries', () => {
    expect(parseList('a,,b,')).toEqual(['a', 'b']);
  });

  it('returns empty array for empty string', () => {
    expect(parseList('')).toEqual([]);
  });

  it('returns empty array for only separators', () => {
    expect(parseList(',,,')).toEqual([]);
  });

  it('supports a custom separator', () => {
    expect(parseList('a|b|c', '|')).toEqual(['a', 'b', 'c']);
  });

  it('handles a single item', () => {
    expect(parseList('solo')).toEqual(['solo']);
  });

  it('trims items with a custom separator', () => {
    expect(parseList('a ; b ; c', ';')).toEqual(['a', 'b', 'c']);
  });
});

// ---------------------------------------------------------------------------
// parseKeyValue
// ---------------------------------------------------------------------------

describe('parseKeyValue', () => {
  it('parses newline-separated key=value lines', () => {
    expect(parseKeyValue('a=1\nb=2')).toEqual({ a: '1', b: '2' });
  });

  it('ignores blank lines', () => {
    expect(parseKeyValue('a=1\n\nb=2')).toEqual({ a: '1', b: '2' });
  });

  it('ignores comment lines starting with #', () => {
    expect(parseKeyValue('# comment\na=1')).toEqual({ a: '1' });
  });

  it('trims keys and values', () => {
    expect(parseKeyValue('  a  =  1  ')).toEqual({ a: '1' });
  });

  it('handles values containing the separator', () => {
    expect(parseKeyValue('url=http://x?a=b')).toEqual({ url: 'http://x?a=b' });
  });

  it('supports a custom kv separator', () => {
    expect(parseKeyValue('a:1\nb:2', { kvSeparator: ':' })).toEqual({
      a: '1',
      b: '2',
    });
  });

  it('supports a custom pair separator', () => {
    expect(parseKeyValue('a=1;b=2', { pairSeparator: ';' })).toEqual({
      a: '1',
      b: '2',
    });
  });

  it('later keys overwrite earlier ones', () => {
    expect(parseKeyValue('a=1\na=2')).toEqual({ a: '2' });
  });

  it('skips lines without a separator', () => {
    expect(parseKeyValue('a=1\nnokv\nb=2')).toEqual({ a: '1', b: '2' });
  });

  it('returns empty object for empty input', () => {
    expect(parseKeyValue('')).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// parseEnvLine
// ---------------------------------------------------------------------------

describe('parseEnvLine', () => {
  it('parses KEY=value', () => {
    expect(parseEnvLine('KEY=value')).toEqual({ key: 'KEY', value: 'value' });
  });

  it('returns null when there is no equals', () => {
    expect(parseEnvLine('NOEQUALS')).toBeNull();
  });

  it('strips surrounding double quotes', () => {
    expect(parseEnvLine('KEY="value"')).toEqual({ key: 'KEY', value: 'value' });
  });

  it('strips surrounding single quotes', () => {
    expect(parseEnvLine("KEY='value'")).toEqual({ key: 'KEY', value: 'value' });
  });

  it('handles empty values', () => {
    expect(parseEnvLine('KEY=')).toEqual({ key: 'KEY', value: '' });
  });

  it('preserves equals signs in the value', () => {
    expect(parseEnvLine('URL=a=b')).toEqual({ key: 'URL', value: 'a=b' });
  });

  it('trims surrounding whitespace', () => {
    expect(parseEnvLine('  KEY = value  ')).toEqual({ key: 'KEY', value: 'value' });
  });

  it('strips a leading export', () => {
    expect(parseEnvLine('export KEY=value')).toEqual({ key: 'KEY', value: 'value' });
  });

  it('returns null for empty key', () => {
    expect(parseEnvLine('=value')).toBeNull();
  });

  it('keeps inner quotes when not surrounding', () => {
    expect(parseEnvLine('KEY=a"b')).toEqual({ key: 'KEY', value: 'a"b' });
  });
});

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

describe('parseFrontmatter', () => {
  it('extracts attributes and body', () => {
    const input = '---\ntitle: Hello\nauthor: Bob\n---\nBody content';
    expect(parseFrontmatter(input)).toEqual({
      attributes: { title: 'Hello', author: 'Bob' },
      body: 'Body content',
    });
  });

  it('returns empty attributes when there is no frontmatter', () => {
    expect(parseFrontmatter('Just a body')).toEqual({
      attributes: {},
      body: 'Just a body',
    });
  });

  it('strips quotes from values', () => {
    const input = '---\ntitle: "Quoted"\n---\nbody';
    expect(parseFrontmatter(input).attributes).toEqual({ title: 'Quoted' });
  });

  it('handles an empty body', () => {
    const input = '---\nkey: val\n---\n';
    const result = parseFrontmatter(input);
    expect(result.attributes).toEqual({ key: 'val' });
    expect(result.body).toBe('');
  });

  it('handles values containing colons', () => {
    const input = '---\nurl: http://example.com\n---\nbody';
    expect(parseFrontmatter(input).attributes).toEqual({
      url: 'http://example.com',
    });
  });

  it('ignores comment lines in frontmatter', () => {
    const input = '---\n# a comment\nkey: val\n---\nbody';
    expect(parseFrontmatter(input).attributes).toEqual({ key: 'val' });
  });

  it('preserves multiline body content', () => {
    const input = '---\nk: v\n---\nline1\nline2';
    expect(parseFrontmatter(input).body).toBe('line1\nline2');
  });

  it('returns empty attributes for empty frontmatter block', () => {
    const input = '---\n---\nbody';
    const result = parseFrontmatter(input);
    expect(result.attributes).toEqual({});
    expect(result.body).toBe('body');
  });

  it('handles single-quoted values', () => {
    const input = "---\nname: 'single'\n---\nb";
    expect(parseFrontmatter(input).attributes).toEqual({ name: 'single' });
  });
});

// ---------------------------------------------------------------------------
// parsePathSegments
// ---------------------------------------------------------------------------

describe('parsePathSegments', () => {
  it('splits a path into segments', () => {
    expect(parsePathSegments('/a/b/c')).toEqual(['a', 'b', 'c']);
  });

  it('drops empty segments from leading/trailing slashes', () => {
    expect(parsePathSegments('/a/b/')).toEqual(['a', 'b']);
  });

  it('handles a root path', () => {
    expect(parsePathSegments('/')).toEqual([]);
  });

  it('handles a path with no leading slash', () => {
    expect(parsePathSegments('a/b')).toEqual(['a', 'b']);
  });

  it('collapses double slashes', () => {
    expect(parsePathSegments('/a//b')).toEqual(['a', 'b']);
  });

  it('returns empty array for empty string', () => {
    expect(parsePathSegments('')).toEqual([]);
  });

  it('handles a single segment', () => {
    expect(parsePathSegments('/api')).toEqual(['api']);
  });
});

// ---------------------------------------------------------------------------
// parseFileExtension
// ---------------------------------------------------------------------------

describe('parseFileExtension', () => {
  it('returns the extension without the dot', () => {
    expect(parseFileExtension('file.txt')).toBe('txt');
  });

  it('lowercases the extension', () => {
    expect(parseFileExtension('IMAGE.PNG')).toBe('png');
  });

  it('returns the last extension for multiple dots', () => {
    expect(parseFileExtension('archive.tar.gz')).toBe('gz');
  });

  it('returns empty string when no extension', () => {
    expect(parseFileExtension('README')).toBe('');
  });

  it('treats dotfiles as having no extension', () => {
    expect(parseFileExtension('.gitignore')).toBe('');
  });

  it('handles a path with directories', () => {
    expect(parseFileExtension('/a/b/file.json')).toBe('json');
  });

  it('returns empty string for a trailing dot', () => {
    expect(parseFileExtension('file.')).toBe('');
  });

  it('handles an empty string', () => {
    expect(parseFileExtension('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// parseFilename
// ---------------------------------------------------------------------------

describe('parseFilename', () => {
  it('returns the basename', () => {
    expect(parseFilename('/a/b/file.txt')).toBe('file.txt');
  });

  it('returns the input when there is no directory', () => {
    expect(parseFilename('file.txt')).toBe('file.txt');
  });

  it('ignores a trailing slash', () => {
    expect(parseFilename('/a/b/')).toBe('b');
  });

  it('handles backslash separators', () => {
    expect(parseFilename('C:\\dir\\file.txt')).toBe('file.txt');
  });

  it('handles a root path', () => {
    expect(parseFilename('/')).toBe('');
  });

  it('handles a single segment', () => {
    expect(parseFilename('solo')).toBe('solo');
  });

  it('handles mixed separators', () => {
    expect(parseFilename('/a\\b/c.md')).toBe('c.md');
  });
});

// ---------------------------------------------------------------------------
// parseSemver
// ---------------------------------------------------------------------------

describe('parseSemver', () => {
  it('parses a basic version', () => {
    expect(parseSemver('1.2.3')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: '',
    });
  });

  it('parses a version with a prerelease', () => {
    expect(parseSemver('1.2.3-beta.1')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: 'beta.1',
    });
  });

  it('tolerates a leading v', () => {
    expect(parseSemver('v2.0.0')).toEqual({
      major: 2,
      minor: 0,
      patch: 0,
      prerelease: '',
    });
  });

  it('ignores build metadata', () => {
    expect(parseSemver('1.0.0+build.5')).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: '',
    });
  });

  it('parses prerelease with build metadata', () => {
    expect(parseSemver('1.0.0-rc.1+build')).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: 'rc.1',
    });
  });

  it('returns null for a missing patch', () => {
    expect(parseSemver('1.2')).toBeNull();
  });

  it('returns null for non-numeric parts', () => {
    expect(parseSemver('a.b.c')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseSemver('')).toBeNull();
  });

  it('handles large numbers', () => {
    expect(parseSemver('10.20.30')).toEqual({
      major: 10,
      minor: 20,
      patch: 30,
      prerelease: '',
    });
  });

  it('trims surrounding whitespace', () => {
    expect(parseSemver('  1.2.3  ')).toEqual({
      major: 1,
      minor: 2,
      patch: 3,
      prerelease: '',
    });
  });

  it('returns null for trailing junk', () => {
    expect(parseSemver('1.2.3.4')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseTable
// ---------------------------------------------------------------------------

describe('parseTable', () => {
  it('parses a markdown table', () => {
    const input = '| Name | Age |\n| --- | --- |\n| Alice | 30 |';
    expect(parseTable(input)).toEqual([
      ['Name', 'Age'],
      ['Alice', '30'],
    ]);
  });

  it('skips the separator row', () => {
    const input = '| a | b |\n| --- | --- |\n| 1 | 2 |';
    const rows = parseTable(input);
    expect(rows).toHaveLength(2);
  });

  it('trims cells', () => {
    const input = '|  a  |  b  |\n| 1 | 2 |';
    expect(parseTable(input)[0]).toEqual(['a', 'b']);
  });

  it('handles tables without outer pipes', () => {
    const input = 'a | b\n--- | ---\n1 | 2';
    expect(parseTable(input)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('handles alignment colons in separator', () => {
    const input = '| a | b |\n| :--- | ---: |\n| 1 | 2 |';
    expect(parseTable(input)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('skips blank lines', () => {
    const input = '| a | b |\n\n| 1 | 2 |';
    expect(parseTable(input)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('ignores lines without pipes', () => {
    const input = 'heading\n| a | b |\n| 1 | 2 |';
    expect(parseTable(input)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(parseTable('')).toEqual([]);
  });

  it('handles a single column table', () => {
    const input = '| Item |\n| --- |\n| Foo |';
    expect(parseTable(input)).toEqual([['Item'], ['Foo']]);
  });
});

// ---------------------------------------------------------------------------
// parseRanges
// ---------------------------------------------------------------------------

describe('parseRanges', () => {
  it('expands a single range', () => {
    expect(parseRanges('1-3')).toEqual([1, 2, 3]);
  });

  it('parses single numbers', () => {
    expect(parseRanges('1,2,3')).toEqual([1, 2, 3]);
  });

  it('mixes ranges and singles', () => {
    expect(parseRanges('1-3,5,7-9')).toEqual([1, 2, 3, 5, 7, 8, 9]);
  });

  it('dedupes overlapping values', () => {
    expect(parseRanges('1-3,2-4')).toEqual([1, 2, 3, 4]);
  });

  it('sorts ascending', () => {
    expect(parseRanges('5,1,3')).toEqual([1, 3, 5]);
  });

  it('dedupes and sorts combined', () => {
    expect(parseRanges('1-3,5')).toEqual([1, 2, 3, 5]);
  });

  it('handles descending ranges by expanding ascending', () => {
    expect(parseRanges('5-3')).toEqual([3, 4, 5]);
  });

  it('handles whitespace', () => {
    expect(parseRanges(' 1 - 3 , 5 ')).toEqual([1, 2, 3, 5]);
  });

  it('returns empty array for empty input', () => {
    expect(parseRanges('')).toEqual([]);
  });

  it('ignores invalid tokens', () => {
    expect(parseRanges('1,abc,3')).toEqual([1, 3]);
  });

  it('handles a single number', () => {
    expect(parseRanges('42')).toEqual([42]);
  });

  it('handles a single-value range', () => {
    expect(parseRanges('5-5')).toEqual([5]);
  });
});

// ---------------------------------------------------------------------------
// tokenize
// ---------------------------------------------------------------------------

describe('tokenize', () => {
  it('splits on whitespace', () => {
    expect(tokenize('a b c')).toEqual(['a', 'b', 'c']);
  });

  it('keeps quoted substrings together', () => {
    expect(tokenize('a "b c" d')).toEqual(['a', 'b c', 'd']);
  });

  it('removes the surrounding quotes', () => {
    expect(tokenize('"hello world"')).toEqual(['hello world']);
  });

  it('collapses multiple spaces', () => {
    expect(tokenize('a   b')).toEqual(['a', 'b']);
  });

  it('handles tabs and newlines as whitespace', () => {
    expect(tokenize('a\tb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('returns empty array for whitespace only', () => {
    expect(tokenize('   ')).toEqual([]);
  });

  it('preserves an empty quoted token', () => {
    expect(tokenize('a "" b')).toEqual(['a', '', 'b']);
  });

  it('handles escaped quotes inside quotes', () => {
    expect(tokenize('"say \\"hi\\""')).toEqual(['say "hi"']);
  });

  it('handles multiple quoted tokens', () => {
    expect(tokenize('"a b" "c d"')).toEqual(['a b', 'c d']);
  });

  it('handles leading and trailing whitespace', () => {
    expect(tokenize('  a b  ')).toEqual(['a', 'b']);
  });
});

// ---------------------------------------------------------------------------
// tryParseJson
// ---------------------------------------------------------------------------

describe('tryParseJson', () => {
  it('parses valid JSON', () => {
    expect(tryParseJson('{"a":1}', {})).toEqual({ a: 1 });
  });

  it('parses a JSON array', () => {
    expect(tryParseJson('[1,2,3]', [])).toEqual([1, 2, 3]);
  });

  it('returns fallback on invalid JSON', () => {
    expect(tryParseJson('{bad', { ok: false })).toEqual({ ok: false });
  });

  it('returns fallback on empty string', () => {
    expect(tryParseJson('', null)).toBeNull();
  });

  it('parses JSON primitives', () => {
    expect(tryParseJson('42', 0)).toBe(42);
  });

  it('parses JSON booleans', () => {
    expect(tryParseJson('true', false)).toBe(true);
  });

  it('parses JSON null', () => {
    expect(tryParseJson('null', 'fallback')).toBeNull();
  });

  it('uses a typed fallback', () => {
    const result = tryParseJson<number[]>('nope', []);
    expect(result).toEqual([]);
  });

  it('parses nested JSON', () => {
    expect(tryParseJson('{"a":{"b":[1,2]}}', {})).toEqual({ a: { b: [1, 2] } });
  });
});

// ---------------------------------------------------------------------------
// parseJsonLines
// ---------------------------------------------------------------------------

describe('parseJsonLines', () => {
  it('parses each line', () => {
    expect(parseJsonLines('{"a":1}\n{"b":2}')).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('skips blank lines', () => {
    expect(parseJsonLines('{"a":1}\n\n{"b":2}')).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('skips invalid lines', () => {
    expect(parseJsonLines('{"a":1}\nnot json\n{"b":2}')).toEqual([
      { a: 1 },
      { b: 2 },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(parseJsonLines('')).toEqual([]);
  });

  it('parses primitives per line', () => {
    expect(parseJsonLines('1\n2\n3')).toEqual([1, 2, 3]);
  });

  it('handles CRLF line endings', () => {
    expect(parseJsonLines('{"a":1}\r\n{"b":2}')).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('parses arrays per line', () => {
    expect(parseJsonLines('[1,2]\n[3,4]')).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('returns empty array when all lines are invalid', () => {
    expect(parseJsonLines('bad\nworse')).toEqual([]);
  });

  it('trims whitespace around lines', () => {
    expect(parseJsonLines('  {"a":1}  ')).toEqual([{ a: 1 }]);
  });
});

// ---------------------------------------------------------------------------
// deepGet
// ---------------------------------------------------------------------------

describe('deepGet', () => {
  it('reads a top-level key', () => {
    expect(deepGet({ a: 1 }, 'a')).toBe(1);
  });

  it('reads a nested key', () => {
    expect(deepGet({ a: { b: { c: 42 } } }, 'a.b.c')).toBe(42);
  });

  it('reads into an array by index', () => {
    expect(deepGet({ a: [10, 20, 30] }, 'a.1')).toBe(20);
  });

  it('reads a mixed object/array path', () => {
    expect(deepGet({ a: { b: [{ c: 'found' }] } }, 'a.b.0.c')).toBe('found');
  });

  it('returns undefined for a missing key by default', () => {
    expect(deepGet({ a: 1 }, 'b')).toBeUndefined();
  });

  it('returns the fallback for a missing key', () => {
    expect(deepGet({ a: 1 }, 'b', 'default')).toBe('default');
  });

  it('returns fallback for an out-of-bounds index', () => {
    expect(deepGet({ a: [1] }, 'a.5', null)).toBeNull();
  });

  it('returns fallback when descending into a primitive', () => {
    expect(deepGet({ a: 1 }, 'a.b', 'fb')).toBe('fb');
  });

  it('returns fallback when intermediate is null', () => {
    expect(deepGet({ a: null }, 'a.b', 'fb')).toBe('fb');
  });

  it('returns the object itself for an empty path', () => {
    const obj = { a: 1 };
    expect(deepGet(obj, '')).toBe(obj);
  });

  it('handles a null root', () => {
    expect(deepGet(null, 'a', 'fb')).toBe('fb');
  });

  it('handles an undefined root', () => {
    expect(deepGet(undefined, 'a', 'fb')).toBe('fb');
  });

  it('reads a deeply nested array index', () => {
    expect(deepGet({ list: [[{ x: 1 }]] }, 'list.0.0.x')).toBe(1);
  });

  it('returns fallback for a non-integer array index', () => {
    expect(deepGet({ a: [1, 2] }, 'a.foo', 'fb')).toBe('fb');
  });

  it('returns false (not fallback) when value is falsy false', () => {
    expect(deepGet({ a: false }, 'a', 'fb')).toBe(false);
  });

  it('returns 0 (not fallback) when value is falsy zero', () => {
    expect(deepGet({ a: 0 }, 'a', 'fb')).toBe(0);
  });
});
