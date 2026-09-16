import * as React from "react";
import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

import { useTheme } from "../theme";

/**
 * The NEBULA v7 signal mark — ported from
 * `apps/web/components/brand/logo-mark-inline.tsx`.
 *
 * Geometry is copied verbatim from the web SVG (same viewBox, same radii, same
 * rotation, same stroke weights) so the app and the site render the same mark
 * at the same optical weight. The web comment describes what it is, and that
 * description is the reason not to redraw it:
 *
 *   "a bold split orbital ring (the market in motion, open so it never reads as
 *    a coin or an 'O'), a sharp edge blade slicing through it (our read cutting
 *    the market), a signal core at the crossing, and a ping (the moment of
 *    detection)."
 *
 * Colour roles match the web exactly:
 *   ring  = --mineral-hi  (#31353F)  the orbit, deliberately recessive
 *   blade = bone          (#EDE8E0)  the read
 *   core  = bone                     the crossing
 *   ping  = ember         (#FF4D2E)  detection — the ONLY brand accent in the mark
 */

export interface GalaxyMarkProps {
  size?: number;
  /** Monochrome override, for a single-colour lockup. */
  color?: string;
  /** Draw the detection ping in the accent, when the mark is not monochrome. */
  accent?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Decorative by default — the mark carries no information. */
  accessible?: boolean;
}

export function GalaxyMark({
  size = 28,
  color,
  accent = false,
  style,
  accessible = false,
}: GalaxyMarkProps): React.ReactElement {
  const t = useTheme();
  const ring = color ?? t.colors.borderStrong;
  const blade = color ?? t.colors.fg;
  const core = color ?? t.colors.fg;
  const ping = color ?? (accent ? t.colors.accent : t.colors.fgMeta);

  return (
    <View
      style={style}
      accessible={accessible}
      accessibilityRole={accessible ? "image" : "none"}
      accessibilityLabel={accessible ? "Galaxy Sports Edge" : undefined}
      importantForAccessibility={accessible ? "yes" : "no-hide-descendants"}
    >
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        {/* Field orbit — outer ring */}
        <Circle cx={32} cy={32} r={27} stroke={ring} strokeWidth={2} fill="none" />
        {/* The market plane, rotated off-axis so it never reads as a disc */}
        <Ellipse
          cx={32}
          cy={32}
          rx={27}
          ry={10}
          stroke={blade}
          strokeWidth={1.8}
          opacity={0.5}
          transform="rotate(-24 32 32)"
          fill="none"
        />
        {/* The blade — the read cutting the market */}
        <Path d="M53 21.5 A27 27 0 0 1 46 52" stroke={blade} strokeWidth={5} fill="none" />
        {/* Signal core at the crossing */}
        <Circle cx={32} cy={32} r={7} fill={core} />
        {/* The ping — the moment of detection */}
        <Circle cx={10} cy={40} r={3.5} fill={ping} />
      </Svg>
    </View>
  );
}

/**
 * Marks of the brand, used in the navigation rail and the onboarding hero.
 * COMPACT is the only form in the nav — the horizontal lockup is for the
 * cold-open and the About surface, where there is room for it.
 */
export function BrandLockup({ compact = false }: { compact?: boolean }): React.ReactElement {
  const t = useTheme();
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", gap: t.space.s3 }}
      accessibilityRole="header"
      accessibilityLabel="Galaxy Sports Edge"
    >
      <GalaxyMark size={compact ? 24 : 30} accent />
      <Text
        style={[t.type.displaySm, { color: t.colors.fg, letterSpacing: -0.3 }]}
        allowFontScaling
      >
        {compact ? "GSE" : "Galaxy Sports Edge"}
      </Text>
    </View>
  );
}

/**
 * The brand monogram, in the arch face.
 *
 * "One arch headline per page — maximum." This is the second and last
 * sanctioned use, so it is the only place the arch face appears in the app
 * outside a hero headline.
 */
export function Monogram({ size = 20 }: { size?: number }): React.ReactElement {
  const t = useTheme();
  return (
    <Text
      style={[t.type.monogram, { color: t.colors.fg, fontSize: size, lineHeight: size }]}
      allowFontScaling
    >
      GSE
    </Text>
  );
}

/**
 * The tagline, rendered as a component so it cannot be paraphrased.
 * Single source of truth: `apps/web/lib/brand.ts:22`.
 */
export const BRAND_TAGLINE = "Find the signal before the market moves.";
export const BRAND_CLOSER = "We detect. You decide.";
export const BRAND_POSITIONING_LINE = "We're not AI. We're math you can read.";