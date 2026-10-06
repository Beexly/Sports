#!/usr/bin/env node
// Surface composite math for UI_AUDIT.md finding U1. READ-ONLY, no product code.
// Reproduces exactly what the browser composites, from the token values in
// apps/web/styles/design-tokens.css, so the "this card is invisible" claim is a
// computed number rather than an argument.
//
//   node handoff/surface-math.mjs

const T = {
  void: "#08090C",
  obsidian: "#08090C",
  carbon: "#08090C",
  eclipse: "#12141A",
  titanium: "#191C23",
  slate: "#191C23",
};
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) => "#" + rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
// alpha composite: src OVER dst, both opaque
const over = (fg, a, dst) => fg.map((c, i) => a * c + (1 - a) * dst[i]);
const lum = (rgb) => {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb.map(f);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const cr = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const html = hx(T.void); // html { background: var(--void) }
const page = over(hx(T.obsidian), 0.6, html); // layout.tsx:122  bg-obsidian/60
console.log(`html  ground        ${T.void}`);
console.log(`cockpit page ground ${toHex(page)}   (bg-obsidian/60 over html)`);
console.log(`  page vs html contrast  ${cr(page, html).toFixed(4)}:1  → IDENTICAL\n`);

const used = [
  ["obsidian", 0.4], ["obsidian", 0.5], ["obsidian", 0.6], ["obsidian", 0.7], ["obsidian", 0.8],
  ["carbon", 0.2], ["carbon", 0.3], ["carbon", 0.4], ["carbon", 0.6], ["carbon", 0.7],
  ["carbon", 0.8], ["carbon", 0.9],
  ["eclipse", 0.4], ["eclipse", 0.5], ["eclipse", 0.7],
  ["titanium", 0.2], ["titanium", 0.4],
];
console.log("bg-<family>/<alpha>".padEnd(22) + "renders".padEnd(11) + "vs page  dRGB");
for (const [f, a] of used) {
  const c = over(hx(T[f]), a, page);
  const d = c.map((v, i) => Math.round(v - page[i]));
  const invisible = d.every((x) => x === 0);
  console.log(
    `bg-${f}/${Math.round(a * 100)}`.padEnd(22) +
      toHex(c).padEnd(11) +
      `${cr(c, page).toFixed(4)}`.padEnd(9) +
      `(${d.join(",")})${invisible ? "   ← ZERO DELTA" : ""}`
  );
}
console.log("\nConclusion: on a #08090C page, any card painted obsidian/carbon/void at any");
console.log("alpha is byte-identical to the page. The cockpit's card border is the ONLY");
console.log("thing separating a card from the canvas. eclipse/* and titanium/* do lift.");
