import * as React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "../theme";
import type { ConfidenceBand } from "../lib/calibration";
import { bandForConfidence } from "../lib/calibration";
import { confidenceScore as formatConfidence, freshnessLine, pct, signed } from "../lib/format";
import type { PickGrade, PublicPick, RiskLevel } from "../api/contracts";
import { Divider, Eyebrow, Numeral, Pill, Row } from "./primitives";

/**
 * The signature data components.
 *
 * Each one encodes a rule from `DESIGN.md` § Signature Components so the rule
 * cannot be forgotten at a call site. Where a rule has a measured incident
 * behind it, the incident is in the comment — a component with a "why" survives
 * a refactor that a component with only a "what" does not.
 */

/* ══════════════════════════════════════════════════════════════════════════
   SETTLEMENT BADGE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * "Two states: WIN (verify mint) and LOSS (alert vermilion). PUSH shown in
 * ion-2. VOID shown in ion-3. Monogram: W, L, P, V. Never '✓' or '✗' alone —
 * screen readers need labels."
 *
 * Colour is therefore NEVER the only signal here: the monogram is always
 * rendered, and the accessibility label always spells the word out.
 */
export function SettlementBadge({
  result,
  size = "md",
}: {
  result: PublicPick["result"];
  size?: "sm" | "md";
}): React.ReactElement {
  const t = useTheme();

  const spec = {
    WIN: { glyph: t.glyph.win, word: "Win", color: t.colors.verify, solid: true },
    LOSS: { glyph: t.glyph.loss, word: "Loss", color: t.colors.alert, solid: true },
    PUSH: { glyph: t.glyph.push, word: "Push", color: t.colors.fgMeta, solid: false },
    VOID: { glyph: t.glyph.void, word: "Void", color: t.colors.fgMuted, solid: false },
    PENDING: { glyph: t.glyph.dot, word: "Pending", color: t.colors.fgMeta, solid: false },
  }[result];

  const compact = size === "sm";

  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`Settlement: ${spec.word}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: t.space.s1,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: spec.solid ? spec.color : t.withAlpha(spec.color, 0.45),
        backgroundColor: spec.solid ? t.withAlpha(spec.color, 0.14) : "transparent",
        borderRadius: t.radius.xs,
        paddingHorizontal: compact ? t.space.s1 : t.space.s2,
        paddingVertical: 2,
      }}
    >
      <Text
        style={[
          t.type.eyebrow,
          { color: spec.color, fontSize: compact ? 11 : 12 },
        ]}
        // The monogram is meaningful, not decorative — it is the non-colour
        // encoding of the outcome, so it is read aloud.
      >
        {spec.glyph}
      </Text>
      <Text style={[t.type.eyebrow, { color: spec.color, fontSize: compact ? 11 : 12 }]}>
        {spec.word.toUpperCase()}
      </Text>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   CONFIDENCE METER
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * "The confidence score is always shown as a number AND optionally a bar."
 *
 * The numeral leads and the bar is the secondary cue. Two things this component
 * refuses to do:
 *
 *   1. Render `%`. Confidence is a SCORE out of 100. Measured 2026-09-13: the
 *      80+ band claimed 0.8663 and realized 0.5191 (z = −10.7). A percent sign
 *      here would be the single most damaging pixel in the product.
 *   2. Use hue as the band differentiator. The FIELD revision retired cyan and
 *      UV to fog, so the four-band ladder collapsed to two effective colours.
 *      Bands are distinguished by FILL WEIGHT and by the always-present
 *      numeral, which is what the contract requires regardless.
 *
 * A null confidence means the viewer is not entitled to it. That renders as an
 * explicit `Pro` label — not a zero, and not an empty bar, both of which read
 * as "the score is bad" or "the screen is broken".
 */
export function ConfidenceMeter({
  confidence,
  redactedLabel = null,
  size = "md",
}: {
  confidence: number | null;
  /** From `redactionLabel("confidence", tier)`. Non-null ⇒ show the label. */
  redactedLabel?: string | null;
  size?: "sm" | "md" | "lg";
}): React.ReactElement {
  const t = useTheme();

  if (confidence === null || !Number.isFinite(confidence)) {
    return (
      <Row gap="s2" align="center">
        <Eyebrow tone="meta">Confidence</Eyebrow>
        {redactedLabel ? (
          <Pill tone="neutral">{redactedLabel}</Pill>
        ) : (
          <Numeral size="numSm" tone="muted">
            —
          </Numeral>
        )}
      </Row>
    );
  }

  const band = bandForConfidence(confidence);
  const numeralSize = size === "lg" ? "num2xl" : size === "sm" ? "numSm" : "numLg";

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Confidence score"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(confidence) }}
    >
      <Row gap="s2" align="baseline">
        <Eyebrow tone="meta">Confidence</Eyebrow>
        <Numeral size={numeralSize} tone={band.accent ? "accent" : "fg"}>
          {formatConfidence(confidence)}
        </Numeral>
      </Row>
      <View style={{ marginTop: t.space.s2 }}>
        <ConfidenceBar score={confidence} band={band} />
      </View>
    </View>
  );
}

function ConfidenceBar({ score, band }: { score: number; band: ConfidenceBand }): React.ReactElement {
  const t = useTheme();
  const color = band.accent ? t.colors.accent : t.colors.fgMeta;
  const clamped = Math.max(0, Math.min(100, score));
  return (
    <View
      style={{
        height: 6,
        borderRadius: t.radius.xs,
        backgroundColor: t.withAlpha(t.colors.fgMeta, 0.16),
        overflow: "hidden",
      }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        style={{
          width: `${clamped}%`,
          height: 6,
          // Fill weight is the non-hue cue. A solid fill is the elite band; the
          // rest step down so two adjacent bands never look identical.
          opacity: band.fill === 0 ? 0.35 : band.fill,
          backgroundColor: color,
          borderRadius: t.radius.xs,
        }}
      />
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FRESHNESS STAMP
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * "A card without a source/freshness timestamp is incomplete in any data
 * surface."
 *
 * This is rule 5 rendered. It is a required prop on every data card in the app
 * — there is no variant of `PickCard` without it.
 *
 * When the payload came from the cache rather than the network, the stamp says
 * so in a second line. A cached board presented as live is the failure this
 * whole component exists to make impossible.
 */
export function FreshnessStamp({
  iso,
  fromCache = false,
  cacheAgeMs = 0,
  now = new Date(),
}: {
  iso: string | null | undefined;
  fromCache?: boolean;
  cacheAgeMs?: number;
  now?: Date;
}): React.ReactElement {
  const t = useTheme();
  const line = freshnessLine(iso, now);

  return (
    <View accessibilityRole="text" accessibilityLabel={line}>
      <Text style={[t.type.numXs, { color: t.colors.fgMuted }]}>{line}</Text>
      {fromCache ? (
        <Text style={[t.type.numXs, { color: t.colors.caution }]}>
          Offline copy — not refreshed.
        </Text>
      ) : null}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TIER + GRADE + RISK
   ══════════════════════════════════════════════════════════════════════════ */

export function TierBadge({ tier }: { tier: PublicPick["tier"] }): React.ReactElement {
  // PREMIUM takes the accent; FREE stays neutral. One accent, one meaning.
  return <Pill tone={tier === "PREMIUM" ? "accent" : "neutral"}>{tier}</Pill>;
}

const GRADE_COPY: Record<PickGrade, string> = {
  ELITE_PLAY: "Elite play",
  STRONG_PLAY: "Strong play",
  SOLID_PLAY: "Solid play",
  LEAN: "Lean",
};

export function GradeLabel({ grade }: { grade: PickGrade }): React.ReactElement {
  return <Eyebrow tone="meta">{GRADE_COPY[grade] ?? grade}</Eyebrow>;
}

const RISK_COPY: Record<RiskLevel, { label: string; tone: "verify" | "wayfind" | "alert" | "caution" }> = {
  LOW_RISK: { label: "Low risk", tone: "verify" },
  MODERATE: { label: "Moderate", tone: "wayfind" },
  HIGH_VARIANCE: { label: "High variance", tone: "caution" },
  INJURY_RISK: { label: "Injury risk", tone: "caution" },
  LINE_STEAM: { label: "Line steam", tone: "alert" },
};

export function RiskBadge({ risk }: { risk: RiskLevel }): React.ReactElement {
  const spec = RISK_COPY[risk];
  return <Pill tone={spec.tone}>{spec.label}</Pill>;
}

/* ══════════════════════════════════════════════════════════════════════════
   EDGE INDEX
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The Edge Index is public on every tier by design — it is "the free
 * trust/transparency signal that makes the teaser credible". So this component
 * has no entitlement branch, and that is deliberate: if a future edit adds one,
 * the change is a positioning regression, not a feature.
 */
export function EdgeIndex({
  value,
  size = "md",
}: {
  value: number | null;
  size?: "sm" | "md";
}): React.ReactElement {
  const t = useTheme();
  return (
    <View accessibilityRole="text" accessibilityLabel={`Edge index ${value === null ? "unavailable" : value}`}>
      <Eyebrow tone="meta">Edge Index</Eyebrow>
      <Numeral size={size === "sm" ? "numSm" : "numMd"} tone={value === null ? "muted" : "fg"}>
        {value === null ? "—" : value.toFixed(1)}
      </Numeral>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MARKET-IMPLIED PROBABILITY
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The ONLY probability this product publishes on a pick.
 *
 * Per `packages/types`, it is "arithmetic on quoted prices a reader can redo by
 * hand, not a model output", it is fixed at publish time, it is present for
 * EVERY tier, and it is NEVER derived from `confidence`.
 *
 * Because it is public, this component has no redaction path either. But it
 * refuses to render when `basis` is `independent_estimate`, because that basis
 * "is NEVER emitted today" by the server and a client that renders it would be
 * presenting a labelled guess as a market fact.
 */
export function MarketImplied({
  winProbability,
}: {
  winProbability: PublicPick["winProbability"];
}): React.ReactElement | null {
  const t = useTheme();
  if (!winProbability) return null;
  if (winProbability.basis !== "market_devig") return null;
  if (!Number.isFinite(winProbability.value)) return null;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Market-implied win probability ${pct(winProbability.value)} across ${winProbability.books} books`}
    >
      <Row gap="s2" align="baseline">
        <Eyebrow tone="meta">Market implied</Eyebrow>
        <Numeral size="numSm">{pct(winProbability.value)}</Numeral>
      </Row>
      <Text style={[t.type.numXs, { color: t.colors.fgMuted }]}>
        De-vigged across {winProbability.books} books at publish
      </Text>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   EXPECTED CLV
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The engine's own honest edge expectation, in probability points.
 *
 * This is the number the board is ranked on (`AGENTS.md`: "Rank public boards
 * on expectedClv / trueProb vs marketFairProb, never on confidence alone"), so
 * it is worth showing — but "the label must always travel with the unit", so
 * the unit is part of the component, not the call site.
 *
 * A negative value is possible in the payload only if the server's suppression
 * is bypassed. It is rendered in the alert tone rather than hidden, because a
 * negative edge on screen is a bug someone should see.
 */
export function ExpectedClv({ value }: { value: number | null }): React.ReactElement | null {
  const t = useTheme();
  if (value === null || !Number.isFinite(value)) return null;
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Expected closing line value ${signed(value, 4)} probability points`}
    >
      <Eyebrow tone="meta">Expected CLV</Eyebrow>
      <Numeral size="numSm" tone={value < 0 ? "alert" : "fg"}>
        {signed(value, 4)}
      </Numeral>
      <Text style={[t.type.numXs, { color: t.colors.fgMuted }]}>probability points</Text>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LINE MOVEMENT
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Opening → current. Pro+ gated server-side, so `null` means "not entitled" or
 * "no captured opening line", and the component says which by deferring to the
 * caller's redaction label rather than guessing.
 */
export function LineMovement({
  movement,
  redactedLabel = null,
}: {
  movement: { opening: number; current: number } | null | undefined;
  redactedLabel?: string | null;
}): React.ReactElement | null {
  const t = useTheme();

  if (!movement) {
    if (!redactedLabel) return null;
    return (
      <Row gap="s2" align="center">
        <Eyebrow tone="meta">Line movement</Eyebrow>
        <Pill tone="neutral">{redactedLabel}</Pill>
      </Row>
    );
  }

  const delta = movement.current - movement.opening;
  const flat = Math.abs(delta) < 0.001;
  const glyph = flat ? t.glyph.dot : delta > 0 ? t.glyph.up : t.glyph.down;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`Line moved from ${movement.opening} to ${movement.current}`}
    >
      <Eyebrow tone="meta">Line movement</Eyebrow>
      <Row gap="s1" align="baseline">
        <Numeral size="numSm" tone="meta">
          {movement.opening.toFixed(1)}
        </Numeral>
        <Numeral size="numSm" tone="muted">
          {t.glyph.arrow}
        </Numeral>
        <Numeral size="numSm">{movement.current.toFixed(1)}</Numeral>
        <Numeral size="numXs" tone={flat ? "muted" : "fg"}>
          {glyph}
        </Numeral>
      </Row>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DATA QUALITY
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 0–100, always public. "No pick has earned the plasma state" without it: the
 * trust signal that makes a thin row legible as thin.
 */
export function DataQuality({ score }: { score: number }): React.ReactElement {
  const t = useTheme();
  const safe = Number.isFinite(score) ? score : 0;
  const tone = safe >= 80 ? "verify" : safe >= 60 ? "wayfind" : "caution";
  return (
    <Row gap="s2" align="baseline">
      <Eyebrow tone="meta">Data quality</Eyebrow>
      <Numeral size="numSm" tone={tone}>
        {Math.round(safe)}
      </Numeral>
    </Row>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECTION HEADER
   ══════════════════════════════════════════════════════════════════════════ */

export function SectionHeader({
  eyebrow,
  title,
  trailing,
  style,
}: {
  eyebrow: string;
  title?: string;
  trailing?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const t = useTheme();
  return (
    <View style={style}>
      <Row justify="space-between" align="center">
        <Eyebrow tone="wayfind">{eyebrow}</Eyebrow>
        {trailing}
      </Row>
      {title ? (
        <Text style={[t.type.displaySm, { color: t.colors.fg, marginTop: t.space.s1 }]}>
          {title}
        </Text>
      ) : null}
      <Divider style={{ marginTop: t.space.s3 }} />
    </View>
  );
}