import * as fs from 'fs';

function decodeHtml(t) {
  return t
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\emph\{([^}]+)\}/g, '$1')
    .replace(/\\textit\{([^}]+)\}/g, '$1');
}

const raw = JSON.parse(fs.readFileSync('docs/arxiv-program/research/2026-10-17/ARXIV_BETTING_CANONICAL.json', 'utf8'));

console.log('Testing robust decoded extraction:');
let count = 0;
for (const p of raw) {
  const text = decodeHtml(p.abstract || '');
  if (text.length < 100) continue;
  
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  for (const s of sentences) {
    const trimmed = s.trim();
    // Match real quantitative percentages, decimals, or measurements
    const numMatch = trimmed.match(/\b(\d+(?:\.\d+)?)\s*(%|percent|bps|points|yards|mph|dB|pts|times|x|s|seconds|degrees)?\b/i);
    if (numMatch && trimmed.length >= 30 && trimmed.length <= 240 && text.includes(trimmed)) {
      const val = parseFloat(numMatch[1]);
      const unit = numMatch[2] || 'unitless';
      // skip years, single digits 0/1/2 unless followed by %/unit/decimal
      const isYear = /^(19\d\d|20\d\d)$/.test(numMatch[1]);
      const hasUnitOrDecimal = numMatch[2] !== undefined || numMatch[1].includes('.');
      if (!isYear && hasUnitOrDecimal && trimmed.includes(numMatch[1])) {
        console.log('\n[' + (p.arxiv_id || p.id) + '] ' + p.title.slice(0, 60));
        console.log('  Claim:', val, unit);
        console.log('  Quote:', trimmed);
        count++;
        break;
      }
    }
  }
  if (count >= 5) break;
}
