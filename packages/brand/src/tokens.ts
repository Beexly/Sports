export const colors = {
  plasmaMagenta: "#ff2dd6",
  ionBlue: "#00e5ff",
  ultraviolet: "#7a5cff",
  electricBlue: "#2563eb",
  deepSpace: "#050812",
  panel: "#0b1020",
  line: "#1e293b",
  text: "#f8fafc",
  muted: "#94a3b8",
  success: "#22c55e",
  warning: "#facc15",
  danger: "#fb7185",
} as const;

export const fonts = {
  display: '"Exo 2", Inter, ui-sans-serif, system-ui, sans-serif',
  body: 'Inter, ui-sans-serif, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
} as const;

export const radii = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "16px",
  full: "999px",
} as const;

export const brandCssVars = {
  "--gse-color-plasma-magenta": colors.plasmaMagenta,
  "--gse-color-ion-blue": colors.ionBlue,
  "--gse-color-ultraviolet": colors.ultraviolet,
  "--gse-color-electric-blue": colors.electricBlue,
  "--gse-color-deep-space": colors.deepSpace,
  "--gse-color-panel": colors.panel,
  "--gse-color-line": colors.line,
  "--gse-color-text": colors.text,
  "--gse-color-muted": colors.muted,
  "--gse-font-display": fonts.display,
  "--gse-font-body": fonts.body,
  "--gse-font-mono": fonts.mono,
} as const;

export type BrandColorName = keyof typeof colors;
