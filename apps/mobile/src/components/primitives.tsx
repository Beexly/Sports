import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { useTheme, type Theme } from "../theme";
import type { TypeToken } from "../theme/typography";

/**
 * Primitives.
 *
 * Every one of these exists to make a design-contract rule the path of least
 * resistance, because a rule that requires discipline at 200 call sites is a
 * rule that will be broken at three of them.
 *
 *   Surface      — the card surface + 1px hairline. Forbids `--void` as a card
 *                  background (it "collapses depth") and `--titanium` as a page
 *                  background (it "reads as a raised surface") by not exposing
 *                  those choices here at all.
 *   Eyebrow      — mono uppercase at 0.16em. "Every data card leads with one."
 *   Numeral      — tabular figures, always. The contract calls this
 *                  non-negotiable, and this is the only text primitive that
 *                  sets `fontVariant`, so a numeric value cannot miss it.
 *   Divider      — a hairline, because FIELD retired glows: "hairline borders
 *                  separate; shadows do not."
 *   Button       — 44pt minimum height, enforced, not documented.
 *   Touchable    — the same 44pt floor for anything custom.
 *
 * NOTE ON `color` vs `style`: colours always come from the theme object, never
 * from a literal. A literal hex in a component is how a palette forks.
 */

/* ── Surface ───────────────────────────────────────────────────────────── */

export interface SurfaceProps {
  children?: React.ReactNode;
  /** `card` is the default container. `lifted` is for modals and the top panel. */
  level?: "card" | "lifted" | "page";
  /** Adds an ember hairline — reserved for the primary state, used sparingly. */
  accent?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Surface({
  children,
  level = "card",
  accent = false,
  padded = true,
  style,
  accessibilityLabel,
  testID,
}: SurfaceProps): React.ReactElement {
  const t = useTheme();
  const backgroundColor =
    level === "page" ? t.colors.bg : level === "lifted" ? t.colors.elevated : t.colors.raised;
  const borderColor = accent ? t.colors.accent : t.colors.border;
  return (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          backgroundColor,
          borderColor,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: t.radius.md,
          padding: padded ? t.space.s4 : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ── Eyebrow ───────────────────────────────────────────────────────────── */

export function Eyebrow({
  children,
  tone = "meta",
  size = "eyebrow",
  style,
}: {
  children: React.ReactNode;
  tone?: "meta" | "muted" | "fg" | "accent" | "wayfind" | "verify" | "alert";
  size?: "eyebrow" | "eyebrowLg";
  style?: StyleProp<TextStyle>;
}): React.ReactElement {
  const t = useTheme();
  const color =
    tone === "fg"
      ? t.colors.fg
      : tone === "accent"
        ? t.colors.accent
        : tone === "wayfind"
          ? t.colors.wayfind
          : tone === "verify"
            ? t.colors.verify
            : tone === "alert"
              ? t.colors.alert
              : tone === "muted"
                ? t.colors.fgMuted
                : t.colors.fgMeta;
  return (
    <Text style={[t.type[size], { color }, style]} allowFontScaling accessibilityRole="text">
      {children}
    </Text>
  );
}

/* ── Numeral ───────────────────────────────────────────────────────────── */

export function Numeral({
  children,
  size = "numMd",
  tone = "fg",
  style,
}: {
  children: React.ReactNode;
  size?: Extract<TypeToken, `num${string}`>;
  tone?: "fg" | "meta" | "muted" | "accent" | "verify" | "alert" | "caution" | "wayfind";
  style?: StyleProp<TextStyle>;
}): React.ReactElement {
  const t = useTheme();
  const color =
    tone === "meta"
      ? t.colors.fgMeta
      : tone === "muted"
        ? t.colors.fgMuted
        : tone === "accent"
          ? t.colors.accent
          : tone === "verify"
            ? t.colors.verify
            : tone === "alert"
              ? t.colors.alert
              : tone === "caution"
                ? t.colors.caution
                : tone === "wayfind"
                  ? t.colors.wayfind
                  : t.colors.fg;
  // `fontVariant` is set by the type token itself, so tabular figures cannot be
  // forgotten at a call site. This is the contract's "non-negotiable".
  return (
    <Text style={[t.type[size], { color }, style]} allowFontScaling>
      {children}
    </Text>
  );
}

/* ── Text ──────────────────────────────────────────────────────────────── */

export function Body({
  children,
  size = "body",
  tone = "fg",
  numberOfLines,
  selectable = false,
  style,
}: {
  children: React.ReactNode;
  size?: Extract<TypeToken, "body" | "bodyLg" | "bodySm">;
  /**
   * Semantic tones are permitted on prose ONLY for these three settlement and
   * data states: `verify` for a confirmation, `alert` for a failure, `caution`
   * for a degraded condition. They are never general "good"/"bad" colouring —
   * the design contract forbids that explicitly, because it is how a product
   * starts looking like a casino.
   */
  tone?: "fg" | "meta" | "muted" | "accent" | "alert" | "verify" | "caution";
  numberOfLines?: number;
  /** Needed for anything a reader must be able to copy — receipt hashes above all. */
  selectable?: boolean;
  style?: StyleProp<TextStyle>;
}): React.ReactElement {
  const t = useTheme();
  const color =
    tone === "meta"
      ? t.colors.fgMeta
      : tone === "muted"
        ? t.colors.fgMuted
        : tone === "accent"
          ? t.colors.accent
          : tone === "alert"
            ? t.colors.alert
            : tone === "verify"
              ? t.colors.verify
              : tone === "caution"
                ? t.colors.caution
                : t.colors.fg;
  return (
    <Text
      style={[t.type[size], { color }, style]}
      numberOfLines={numberOfLines}
      selectable={selectable}
      allowFontScaling
    >
      {children}
    </Text>
  );
}

export function Heading({
  children,
  size = "displayMd",
  tone = "fg",
  style,
}: {
  children: React.ReactNode;
  size?: Extract<TypeToken, "displayLg" | "displayMd" | "displaySm" | "archLg" | "archMd" | "archSm">;
  tone?: "fg" | "accent";
  style?: StyleProp<TextStyle>;
}): React.ReactElement {
  const t = useTheme();
  return (
    <Text
      style={[t.type[size], { color: tone === "accent" ? t.colors.accent : t.colors.fg }, style]}
      accessibilityRole="header"
      allowFontScaling
    >
      {children}
    </Text>
  );
}

/* ── Divider ───────────────────────────────────────────────────────────── */

export function Divider({
  strong = false,
  style,
}: {
  strong?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const t = useTheme();
  return (
    <View
      style={[
        {
          height: StyleSheet.hairlineWidth,
          backgroundColor: strong ? t.colors.borderStrong : t.colors.border,
          alignSelf: "stretch",
        },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/* ── Pill ──────────────────────────────────────────────────────────────── */

export type PillTone = "neutral" | "accent" | "verify" | "alert" | "caution" | "wayfind";

export function Pill({
  children,
  tone = "neutral",
  solid = false,
}: {
  children: React.ReactNode;
  tone?: PillTone;
  /** Filled rather than outlined. Filled is reserved for the strongest state. */
  solid?: boolean;
}): React.ReactElement {
  const t = useTheme();
  const base = pillColor(t, tone);
  return (
    <View
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: solid ? base : t.withAlpha(base, 0.45),
        backgroundColor: solid ? base : t.withAlpha(base, 0.1),
        borderRadius: t.radius.xs,
        paddingHorizontal: t.space.s2,
        paddingVertical: 2,
        alignSelf: "flex-start",
      }}
    >
      {/* Text on a solid fill uses the inverse ink, never the same tone — a
          tone-on-tone pill is the classic unreadable-badge bug. */}
      <Text style={[t.type.eyebrow, { color: solid ? t.colors.onAccent : base }]}>
        {children}
      </Text>
    </View>
  );
}

function pillColor(t: Theme, tone: PillTone): string {
  switch (tone) {
    case "accent":
      return t.colors.accent;
    case "verify":
      return t.colors.verify;
    case "alert":
      return t.colors.alert;
    case "caution":
      return t.colors.caution;
    case "wayfind":
      return t.colors.wayfind;
    default:
      return t.colors.fgMeta;
  }
}

/* ── Buttons ───────────────────────────────────────────────────────────── */

/** The contract's floor: "Minimum touch target: 44×44px". Exported, not magic. */
export const MIN_TOUCH_TARGET = 44;

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  accessibilityHint,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  testID?: string;
}): React.ReactElement {
  const t = useTheme();

  const palette = {
    primary: { bg: t.colors.accent, fg: t.colors.onAccent, border: t.colors.accent },
    secondary: { bg: "transparent", fg: t.colors.fg, border: t.colors.borderStrong },
    ghost: { bg: "transparent", fg: t.colors.fgMeta, border: "transparent" },
    destructive: { bg: "transparent", fg: t.colors.alert, border: t.withAlpha(t.colors.alert, 0.5) },
  }[variant];

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => ({
        minHeight: MIN_TOUCH_TARGET,
        minWidth: MIN_TOUCH_TARGET,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: t.space.s5,
        borderRadius: t.radius.sm,
        borderWidth: variant === "ghost" ? 0 : StyleSheet.hairlineWidth,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[t.type.eyebrowLg, { color: palette.fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

/**
 * A tappable row that is not a button. Keeps the 44pt floor without pretending
 * to be a Button — used for list rows and disclosure targets.
 */
export function Touchable({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  accessibilityState,
  style,
  testID,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: "button" | "link" | "none";
  /** Needed for toggle/choice controls, where "selected" is the affordance. */
  accessibilityState?: { selected?: boolean; disabled?: boolean; busy?: boolean };
  style?: StyleProp<ViewStyle>;
  testID?: string;
}): React.ReactElement {
  if (!onPress) {
    return <View style={style}>{children}</View>;
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={accessibilityState}
      style={({ pressed }) => [{ minHeight: MIN_TOUCH_TARGET, opacity: pressed ? 0.7 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

/* ── Layout helpers ────────────────────────────────────────────────────── */

export function Row({
  children,
  gap = "s3",
  align = "center",
  justify = "flex-start",
  wrap = false,
  style,
}: {
  children: React.ReactNode;
  gap?: keyof Theme["space"];
  align?: ViewStyle["alignItems"];
  justify?: ViewStyle["justifyContent"];
  wrap?: boolean;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const t = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: align,
          justifyContent: justify,
          gap: t.space[gap],
          flexWrap: wrap ? "wrap" : "nowrap",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Stack({
  children,
  gap = "s3",
  style,
}: {
  children: React.ReactNode;
  gap?: keyof Theme["space"];
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const t = useTheme();
  return <View style={[{ gap: t.space[gap] }, style]}>{children}</View>;
}

/**
 * A spacer that pushes content apart. Uses the 4px grid exclusively — the
 * contract says "all spacing is a multiple of 4", and a `height={7}` anywhere
 * in this app is a bug.
 */
export function Spacer({ size = "s4" }: { size?: keyof Theme["space"] }): React.ReactElement {
  const t = useTheme();
  return <View style={{ height: t.space[size] }} />;
}