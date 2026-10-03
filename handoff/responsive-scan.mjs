/**
 * Responsive / breakpoint audit for the cockpit surface.
 * READ-ONLY. Changes nothing. Prints a report to stdout.
 *
 * Companion to handoff/RESPONSIVE_AUDIT.md. Written as .mjs rather than .py because
 * .gitignore excludes handoff/*.py — a .py helper would not ship with the report
 * and the audit would not be reproducible from the repo.
 *
 *   node handoff/responsive-scan.mjs            # cockpit only (default)
 *   node handoff/responsive-scan.mjs --all      # whole app
 *
 * Method — five rules, each a grep-shaped static check because the command file
 * asks for a static audit and forbids layout changes:
 *   R1 WIDE-TABLE   a <table> with min-w-[Npx] / min-w-N where N >= viewport
 *                   (375/768/1024), and whether an ancestor provides
 *                   overflow-x-auto (the standard fix) or not.
 *   R2 FIXED-GRID   grid-cols-N with no responsive prefix, N >= 2, so the column
 *                   count never changes across breakpoints.
 *   R3 TOUCH        interactive elements (button/a/Link with onClick or href)
 *                   whose padding/height class implies < 44px on the short axis.
 *   R4 NO-WRAP      whitespace-nowrap / truncate on a text node that is not inside
 *                   a table cell (text truncation without a min-w-0 parent is the
 *                   classic flex/grid overflow source).
 *   R5 FIXED-W      explicit w-[Npx] or min-w-[Npx] on a non-table element above
 *                   the mobile viewport width.
 *
 * FALSE POSITIVES ARE EXPECTED. A grid-cols-2 inside a `hidden md:grid` is fine.
 * Every hit is verified by hand in the report before it is called a finding;
 * the scanner's job is to be exhaustive, not to be right.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const ALL = process.argv.includes('--all');

const SCAN_ROOTS = ALL
  ? [join(ROOT, 'apps/web/app'), join(ROOT, 'apps/web/components'), join(ROOT, 'apps/web/lib')]
  : [join(ROOT, 'apps/web/app/cockpit'), join(ROOT, 'apps/web/components/cockpit')];

const MOBILE = 375;
const TABLET = 768;
const DESKTOP = 1024;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.next') continue;
    const p = join(dir, e);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(e)) out.push(p);
  }
  return out;
}

const files = SCAN_ROOTS.flatMap((r) => walk(r)).sort();
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/');

// px value from min-w-[123px] / min-w-96 / w-[900px]
const pxClass = (cls, kind) => {
  let m = cls.match(new RegExp(`(?:^|\\s)${kind}-\\[(\\d+)px\\]`));
  if (m) return Number(m[1]);
  m = cls.match(new RegExp(`(?:^|\\s)${kind}-(\\d+)(?=\\s|$)`));
  if (!m) return null;
  // Tailwind spacing scale: 0=0, 1=4px, 2=8, 3=12, 4=16, 5=20, 6=24, 8=32,
  // 10=40, 12=48, 14=56, 16=64, 20=80, 24=96, 28=112, 32=128, 36=144, 40=160,
  // 44=176, 48=192, 56=224, 60=240, 64=256, 72=288, 80=320, 96=384.
  const scale = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 14: 56, 16: 64, 20: 80, 24: 96, 28: 112, 32: 128, 36: 144, 40: 160, 44: 176, 48: 192, 56: 224, 60: 240, 64: 256, 72: 288, 80: 320, 96: 384 };
  return scale[Number(m[1])] ?? null;
};

const hasOverflowX = (cls) => /overflow-x-(auto|scroll)/.test(cls);

// Tailwind responsive prefixes — presence means the rule has a responsive escape.
const isResponsivePrefixed = (cls) => /(^|\s)(sm|md|lg|xl|2xl):/.test(cls);

const findings = { R1: [], R2: [], R3: [], R4: [], R5: [] };

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const lines = src.split(/\r?\n/);

  lines.forEach((line, i) => {
    const ln = i + 1;
    // className strings, possibly joined
    const classMatch = line.match(/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{\[([\s\S]*?)\]\})/);
    const cls = classMatch ? (classMatch[1] || classMatch[2] || classMatch[3] || '') : '';
    const flat = cls.replace(/\s+/g, ' ');
    const isTable = /<table\b/.test(line) || /<Table\b/.test(line);
    const prev5 = lines.slice(Math.max(0, i - 5), i).join(' ');
    const hasScrollAncestor = hasOverflowX(prev5) || hasOverflowX(cls);

    // R1 wide table
    if (isTable) {
      const mw = pxClass(flat, 'min-w');
      if (mw !== null && mw >= MOBILE) {
        findings.R1.push({
          file: rel(f), line: ln, px: mw,
          overflows: mw > MOBILE ? 'mobile+tablet+desktop' : 'mobile',
          scrolled: hasScrollAncestor,
          text: line.trim().slice(0, 150),
        });
      }
    }

    // R2 fixed grid (no responsive prefix anywhere on the same declaration)
    const g = flat.match(/(^|\s)grid-cols-(\d+)(?=\s|$)/);
    if (g && Number(g[2]) >= 2 && !isResponsivePrefixed(flat)) {
      findings.R2.push({
        file: rel(f), line: ln, cols: Number(g[2]),
        hiddenMobile: /hidden\s+(sm|md|lg):(grid|flex|block)/.test(flat),
        text: line.trim().slice(0, 150),
      });
    }

    // R3 touch target — small paddings on interactive elements
    if (/<(button|Link|a)\b/.test(line)) {
      const py = flat.match(/(?:^|\s)py-([0-2](?:\.5)?)(?=\s|$)/);
      const px = flat.match(/(?:^|\s)px-([0-2](?:\.5)?)(?=\s|$)/);
      const h = flat.match(/(?:^|\s)h-([0-9])(?=\s|$)/);
      const size = flat.match(/(?:^|\s)size-([0-9])(?=\s|$)/);
      let short = null;
      if (h) short = Number(h[1]) * 4;
      else if (size) short = Number(size[1]) * 4;
      else if (py) {
        // py-1 = 4px top+bottom = 8px block padding; add a nominal 16px line box
        short = Number(py[1]) * 4 * 2 + 16;
      }
      if (short !== null && short < 44) {
        findings.R3.push({
          file: rel(f), line: ln, shortAxis: short,
          tag: (line.match(/<(\w+)/) || [])[1],
          text: line.trim().slice(0, 150),
        });
      }
      if (px && Number(px[1]) <= 2) {
        findings.R3.push({
          file: rel(f), line: ln, shortAxis: 'px-' + px[1] + ' (narrow axis)',
          tag: (line.match(/<(\w+)/) || [])[1],
          text: line.trim().slice(0, 150),
        });
      }
    }

    // R4 nowrap / truncate outside a table cell
    if (!isTable && /whitespace-nowrap/.test(flat)) {
      findings.R4.push({
        file: rel(f), line: ln, cls: 'whitespace-nowrap',
        text: line.trim().slice(0, 150),
      });
    }
    if (!isTable && /(^|\s)truncate(?!-)(?=\s|$)/.test(flat) && !/min-w-0/.test(flat)) {
      findings.R4.push({
        file: rel(f), line: ln, cls: 'truncate w/o min-w-0',
        text: line.trim().slice(0, 150),
      });
    }

    // R5 fixed width on a non-table element above mobile width
    if (!isTable) {
      const w = pxClass(flat, 'w');
      const minw = pxClass(flat, 'min-w');
      if (w !== null && w > MOBILE) {
        findings.R5.push({ file: rel(f), line: ln, kind: 'w', px: w, text: line.trim().slice(0, 150) });
      }
      if (minw !== null && minw > MOBILE) {
        findings.R5.push({ file: rel(f), line: ln, kind: 'min-w', px: minw, text: line.trim().slice(0, 150) });
      }
    }
  });
}

const line = (s) => console.log(s);
line('COCKPIT RESPONSIVE SCAN — ' + (ALL ? 'whole app' : 'cockpit only'));
line('files scanned: ' + files.length);
line('viewports: mobile ' + MOBILE + ' / tablet ' + TABLET + ' / desktop ' + DESKTOP);
line('');

const dump = (key, title, fmt) => {
  const rows = findings[key];
  line(`## ${key} — ${title}  (${rows.length} hits)`);
  for (const r of rows) {
    line('  ' + fmt(r));
  }
  line('');
};

dump('R1', 'WIDE TABLE without/with scroll', (r) =>
  `${r.file}:${r.line}  min-w ${r.px}px  overflows@${r.overflows}  scroll-ancestor:${r.scrolled ? 'YES' : 'no'}`);
dump('R2', 'FIXED GRID, no responsive escape', (r) =>
  `${r.file}:${r.line}  grid-cols-${r.cols}  hidden-bp-variant:${r.hiddenMobile}`);
dump('R3', 'TOUCH TARGET < 44px', (r) =>
  `${r.file}:${r.line}  <${r.tag}>  short-axis ~${r.shortAxis}px`);
dump('R4', 'NOWRAP / TRUNCATE outside table', (r) =>
  `${r.file}:${r.line}  ${r.cls}`);
dump('R5', 'FIXED WIDTH > 375px, non-table', (r) =>
  `${r.file}:${r.line}  ${r.kind}=${r.px}px`);
