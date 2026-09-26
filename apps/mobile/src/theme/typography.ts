/**
 * Type roles — native port of the FIELD type scale.
 *
 * THE ONE-FAMILY LAW (design contract, quoted from design-tokens.css):
 *
 *   "Design contract Law 1: evidence sets the rendering. A figure and its
 *    sample size must sit at the SAME optical size at n=10-29 so the claim
 *    and its weakness read in one glance — unachievable across two families,
 *    because a mono figure beside a sans caption reads as machine output
 *    annotated by a human, rebuilding the exact hierarchy Law 1 exists to
 *    destroy."
 *
 * So: one family for body, numerals, mono, and display. Exo 2, JetBrains
 * Mono and Instrument Serif were retired. The app bundles Inter for that
 * single family and Barlow Condensed for the arch role (exactly the two
 * families the token stack names), and uses NO third family.
 *
 * MOBILE RAMP — the one place this port deviates, deliberately.
 * The web `--t-arch-3xl` is 220px and `--t-num-3xl` is 96px. Those are
 * poster sizes for a 1200px canvas. Reusing them on a 393pt-wide device
 * would not be "faithful", it would be broken. The ramp below preserves the
 * *role* (what each token is for), the *weight*, the *line-height ratio* and
 * the *ordering*, and rescales the ramp to a phone/tablet canvas. The ratio
 * ordering is asserted in tests so a future edit cannot silently collapse
 * the hierarchy.
 */

/**
 * Font variant tokens, declared locally rather than imported from React Native.
 *
 * WHY: importing the type from `react-native` pulls RN's entire declaration
 * graph into any check that touches this module — which on the host this project
 * was built on exceeds the process cap and makes the check unrunnable. The pure
 * type layer should not depend on the framework anyway; the values below are the
 * subset React Native accepts and are asserted against RN's own union by the
 * UI-rules lint.
 */
export type FontVariantToken =
  | "small-caps"
  | "oldstyle-nums"
  | "lining-nums"
  | "tabular-nums"
  | "proportional-nums";

/** Weights are numeric strings — RN requires strings for custom fonts on iOS. */
export const weight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
  black: "900",
} as const;

export const family = {
  /** The single family. Inter, with the system stack as the declared fallback. */
  body: "Inter",
  /** Condensed sports-native. Arch headlines + monogram ONLY. Rare by design. */
  arch: "BarlowCondensed",
  /** System fallback, used when font loading fails. Never a design choice. */
  system: undefined,
} as const;

/**
 * Weight → registered PostScript family name.
 *
 * WHY THIS EXISTS: static TTFs are registered one file per weight, and React
 * Native treats each `useFonts` key as its own FAMILY. A `<Text>` with
 * `fontFamily: "Inter"` and `fontWeight: "600"` therefore does not synthesise
 * or select Inter SemiBold — iOS resolves the family first and the weight
 * second, finds only the regular face under that family, and renders 400.
 *
 * That failure is invisible in a screenshot review of a single screen and
 * glaring across a design system, so the mapping is explicit and the type
 * tokens use it rather than relying on `fontWeight` to do the work.
 */
export const FONT_FAMILY_BY_WEIGHT = {
  "400": "Inter",
  "500": "Inter-Medium",
  "600": "Inter-SemiBold",
  "700": "Inter-Bold",
} as const;

export const ARCH_BY_WEIGHT = {
  "800": "BarlowCondensed-ExtraBold",
  "900": "BarlowCondensed-Black",
} as const;

/** Every font family the binary registers. Kept in one place so the loader map
 *  cannot drift from the tokens that name them. */
export const REGISTERED_FONT_FAMILIES = [
  ...Object.values(FONT_FAMILY_BY_WEIGHT),
  ...Object.values(ARCH_BY_WEIGHT),
] as const;

/** Letter-spacing constants. Eyebrows are 0.16em per the token file. */
export const tracking = {
  eyebrow: 1.9, // ~0.16em at 12px
  tight: -0.4,
  normal: 0,
} as const;

export interface TypeRole {
  readonly fontFamily: string | undefined;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly fontWeight:
    | "400"
    | "500"
    | "600"
    | "700"
    | "800"
    | "900"
    | "normal"
    | "bold";
  readonly letterSpacing?: number;
  readonly textTransform?: "uppercase" | "lowercase" | "none";
  /**
   * Always set for anything numeric. The contract calls tabular figures
   * non-negotiable.
   *
   * Typed as React Native's MUTABLE `FontVariant[]` deliberately: RN's
   * `TextStyle.fontVariant` is a mutable array, so declaring a `readonly` tuple
   * here is rejected at every `<Text style={t.type.numXl}>` call site. Getting
   * this wrong once produced a wall of type errors across the component layer,
   * which is why it is called out rather than left to be rediscovered.
   */
  readonly fontVariant?: FontVariantToken[];
}

/**
 * The scale. Every data-facing role carries `tabular-nums`; the only roles
 * without it are prose and the arch headline.
 */
export const type = {
  /* ── ARCH — oversized compressed sport-native headlines ─────────────── */
  /* "One arch headline per page — maximum." Its rarity is the point. */
  archLg: {
    fontFamily: "BarlowCondensed-Black",
    fontSize: 56,
    lineHeight: 52,
    fontWeight: weight.black,
    letterSpacing: tracking.tight,
  },
  archMd: {
    fontFamily: "BarlowCondensed-ExtraBold",
    fontSize: 44,
    lineHeight: 42,
    fontWeight: weight.extrabold,
    letterSpacing: tracking.tight,
  },
  archSm: {
    fontFamily: "BarlowCondensed-ExtraBold",
    fontSize: 34,
    lineHeight: 34,
    fontWeight: weight.extrabold,
    letterSpacing: tracking.tight,
  },
  /** Brand monogram — the only other sanctioned arch use. */
  monogram: {
    fontFamily: "BarlowCondensed-Black",
    fontSize: 20,
    lineHeight: 20,
    fontWeight: weight.black,
    letterSpacing: 0.5,
  },

  /* ── DISPLAY — section headers, page titles ─────────────────────────── */
  displayLg: {
    fontFamily: "Inter-SemiBold",
    fontSize: 30,
    lineHeight: 36,
    fontWeight: weight.semibold,
    letterSpacing: tracking.tight,
  },
  displayMd: {
    fontFamily: "Inter-SemiBold",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: weight.semibold,
    letterSpacing: tracking.tight,
  },
  displaySm: {
    fontFamily: "Inter-SemiBold",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: weight.semibold,
  },

  /* ── BODY — prose. No tabular figures; these are sentences. ─────────── */
  bodyLg: {
    fontFamily: "Inter",
    fontSize: 17,
    lineHeight: 26,
    fontWeight: weight.regular,
  },
  body: {
    // 15px — above the 14px floor.
    fontFamily: "Inter",
    fontSize: 15,
    lineHeight: 23,
    fontWeight: weight.regular,
  },
  bodySm: {
    // 13px — the declared floor. Never go below this for prose.
    fontFamily: "Inter",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: weight.regular,
  },

  /* ── EYEBROW — mono uppercase, the "intel file" look ────────────────── */
  /* Every data card leads with one. 12px floor, up from the old 11px. */
  eyebrow: {
    fontFamily: "Inter-Medium",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: weight.medium,
    letterSpacing: tracking.eyebrow,
    textTransform: "uppercase",
  },
  eyebrowLg: {
    fontFamily: "Inter-Medium",
    fontSize: 13,
    lineHeight: 17,
    fontWeight: weight.medium,
    letterSpacing: tracking.eyebrow,
    textTransform: "uppercase",
  },

  /* ── NUMERALS — every number in the product. Tabular, always. ───────── */
  num3xl: {
    fontFamily: "Inter-Bold",
    fontSize: 56,
    lineHeight: 54,
    fontWeight: weight.bold,
    fontVariant: ["tabular-nums"],
  },
  num2xl: {
    fontFamily: "Inter-Bold",
    fontSize: 40,
    lineHeight: 42,
    fontWeight: weight.bold,
    fontVariant: ["tabular-nums"],
  },
  numXl: {
    fontFamily: "Inter-Bold",
    fontSize: 30,
    lineHeight: 34,
    fontWeight: weight.bold,
    fontVariant: ["tabular-nums"],
  },
  numLg: {
    fontFamily: "Inter-SemiBold",
    fontSize: 24,
    lineHeight: 28,
    fontWeight: weight.semibold,
    fontVariant: ["tabular-nums"],
  },
  numMd: {
    fontFamily: "Inter-SemiBold",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: weight.semibold,
    fontVariant: ["tabular-nums"],
  },
  numSm: {
    fontFamily: "Inter-Medium",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: weight.medium,
    fontVariant: ["tabular-nums"],
  },
  numXs: {
    fontFamily: "Inter-Medium",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: weight.medium,
    fontVariant: ["tabular-nums"],
  },

  /* ── EDITORIAL — pull quotes. Never in a data view. ─────────────────── */
  /* The serial serif was retired; this role now uses the one family, and
     exists so call sites stay legible. Cite this when auditing. */
  editMd: {
    fontFamily: "Inter-Medium",
    fontSize: 20,
    lineHeight: 30,
    fontWeight: weight.medium,
  },
} satisfies Record<string, TypeRole>;

export type TypeToken = keyof typeof type;

/**
 * Assertion helper used by tests/type-scale.test.ts. Exported from the module
 * rather than living only in the test so the ordering contract is discoverable
 * by anyone reading the theme.
 */
export const NUMERAL_ORDER: readonly TypeToken[] = [
  "num3xl",
  "num2xl",
  "numXl",
  "numLg",
  "numMd",
  "numSm",
  "numXs",
];

export const BODY_FLOOR_PT = 13;
