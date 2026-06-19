/**
 * Galaxy Dynasty — deterministic SVG placeholder art.
 *
 * Renders on-brand placeholder visuals (avatars, card faces, faction crests,
 * badges) from a seed, using the engine's `placeholderPalette` so colors always
 * sit inside the Galaxy visual law (black/gold/deep-blue + cosmic accents). This
 * stands in for Higgsfield output until real generation is wired (DECISION
 * D-004); the matching brief is always available via `buildAssetBrief`.
 */

import { placeholderPalette } from "@sports/galaxy-engine";

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function svgToDataUri(svg: string): string {
  // encodeURIComponent keeps it valid in src="" without base64 bloat.
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** A circular avatar plate with orbiting accents — the operative shell. */
export function avatarSvg(seed: string): string {
  const p = placeholderPalette(seed);
  const h = hashSeed(seed);
  const rings = 2 + (h % 3);
  const ringEls = Array.from({ length: rings })
    .map((_, i) => {
      const r = 26 + i * 9;
      const dash = 6 + ((h >> (i + 1)) % 10);
      return `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${i % 2 ? p.accent : p.glow}" stroke-opacity="0.5" stroke-width="1.5" stroke-dasharray="${dash} ${dash}"/>`;
    })
    .join("");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">` +
    `<defs><radialGradient id="g" cx="50%" cy="40%" r="70%">` +
    `<stop offset="0%" stop-color="${p.glow}" stop-opacity="0.55"/>` +
    `<stop offset="100%" stop-color="${p.base}"/></radialGradient></defs>` +
    `<rect width="120" height="120" rx="16" fill="${p.base}"/>` +
    `<circle cx="60" cy="60" r="40" fill="url(#g)"/>` +
    ringEls +
    `<circle cx="60" cy="52" r="13" fill="${p.accent}" fill-opacity="0.9"/>` +
    `<path d="M36 92 q24 -26 48 0" fill="${p.accent}" fill-opacity="0.75"/>` +
    `</svg>`;
  return svgToDataUri(svg);
}

/** A vault-grade card face. */
export function cardSvg(seed: string, label: string): string {
  const p = placeholderPalette(seed);
  const safe = label.replace(/[<>&]/g, "");
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="300" viewBox="0 0 220 300">` +
    `<defs><linearGradient id="f" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${p.glow}" stop-opacity="0.5"/>` +
    `<stop offset="100%" stop-color="${p.base}"/></linearGradient></defs>` +
    `<rect width="220" height="300" rx="14" fill="${p.base}"/>` +
    `<rect x="6" y="6" width="208" height="288" rx="11" fill="url(#f)" stroke="${p.accent}" stroke-width="2"/>` +
    `<circle cx="110" cy="120" r="58" fill="none" stroke="${p.accent}" stroke-opacity="0.7" stroke-width="2"/>` +
    `<circle cx="110" cy="120" r="34" fill="${p.glow}" fill-opacity="0.55"/>` +
    `<rect x="20" y="232" width="180" height="44" rx="8" fill="#000" fill-opacity="0.35"/>` +
    `<text x="110" y="260" text-anchor="middle" font-family="monospace" font-size="15" fill="${p.accent}">${safe}</text>` +
    `</svg>`;
  return svgToDataUri(svg);
}

/** A faction crest hexagon. */
export function crestSvg(seed: string): string {
  const p = placeholderPalette(seed);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">` +
    `<rect width="96" height="96" rx="12" fill="${p.base}"/>` +
    `<polygon points="48,12 80,30 80,66 48,84 16,66 16,30" fill="${p.glow}" fill-opacity="0.45" stroke="${p.accent}" stroke-width="2"/>` +
    `<polygon points="48,30 64,40 64,58 48,68 32,58 32,40" fill="${p.accent}" fill-opacity="0.85"/>` +
    `</svg>`;
  return svgToDataUri(svg);
}

/** A circular achievement badge. */
export function badgeSvg(seed: string): string {
  const p = placeholderPalette(seed);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">` +
    `<circle cx="36" cy="36" r="34" fill="${p.base}" stroke="${p.accent}" stroke-width="2"/>` +
    `<circle cx="36" cy="36" r="20" fill="${p.glow}" fill-opacity="0.6"/>` +
    `<path d="M36 18 l5 12 13 1 -10 8 3 13 -11 -7 -11 7 3 -13 -10 -8 13 -1 z" fill="${p.accent}"/>` +
    `</svg>`;
  return svgToDataUri(svg);
}
