import * as React from "react";
import { StyleSheet, Text, View, type DimensionValue } from "react-native";

import type { FactorDetail, PublicPick, SubscriptionTier } from "../api/contracts";
import { useTheme } from "../theme";
import { redactionLabel } from "../lib/entitlements";
import { normaliseBreakdown, extractIndependentEdge, hasRealBookPrice } from "../lib/trust";
import { edgePoints, stamp } from "../lib/format";
import { safeServerCopy, scanVoice } from "../lib/voice";
import { ConfidenceMeter, DataQuality, EdgeIndex, ExpectedClv, FreshnessStamp, GradeLabel, LineMovement, MarketImplied, RiskBadge, SettlementBadge, TierBadge } from "./signals";
import { Body, Button, Divider, Eyebrow, Numeral, Pill, Row, Spacer, Surface, Touchable } from "./primitives";

/**
 * PickCard — "the primary output unit" (`DESIGN.md` § Signature Components).
 *
 * The required anatomy, in order, is implemented literally:
 *
 *   [EYEBROW: sport + tier badge]        [settlement state]
 *   [Primary call — the selection]
 *   [Confidence meter + score]
 *   [Supporting context — market implied, edge index, line movement]
 *   [Factor trail (Pro+)]
 *   [Source freshness timestamp]          ← ALWAYS present
 *   [Weakness disclosure]                 ← ALWAYS present on Pro+
 *   [CTA]
 *
 * Four things this card is engineered NOT to do:
 *
 *  1. **Never render confidence as a percent.** It renders "72/100" with the
 *     label "Confidence". See `ConfidenceMeter`.
 *  2. **Never present a redaction as a value.** A FREE viewer's null confidence
 *     becomes a "Pro" pill, never "0/100" and never an empty meter.
 *  3. **Never claim a book price that does not exist.** A signal-slate row says
 *     "No book price attached" in the line slot.
 *  4. **Never show an adverse row.** The caller is expected to have run
 *     `applyBoardSafety`, and this card additionally refuses to render a
 *     negative-CLV row's CTA — belt and braces on the one rule whose breach is
 *     a customer betting a bet we said not to take.
 */

export interface PickCardProps {
  pick: PublicPick;
  tier: SubscriptionTier;
  fromCache?: boolean;
  cacheAgeMs?: number;
  onOpen: (pick: PublicPick) => void;
  onExplain?: (pick: PublicPick) => void;
  /** Rendered as the card's action row. Omit to suppress the CTA entirely. */
  actionLabel?: string;
  onAction?: (pick: PublicPick) => void;
  now?: Date;
}

export function PickCard({
  pick,
  tier,
  fromCache = false,
  cacheAgeMs = 0,
  onOpen,
  onExplain,
  actionLabel,
  onAction,
  now,
}: PickCardProps): React.ReactElement {
  const t = useTheme();
  const breakdown = normaliseBreakdown(pick.factorBreakdown);
  const edge = extractIndependentEdge(pick.factorBreakdown);
  const priced = hasRealBookPrice(pick);

  // Server text passes the voice linter before it is rendered. A regression in
  // the server's copy must not become a regression in the app's copy.
  const reasoning = pick.reasoning?.trim()
    ? safeServerCopy(`pick:${pick.id}:reasoning`, pick.reasoning)
    : null;

  const weakness = pickWeakness(breakdown?.factors ?? []);
  const showWeakness = tier === "PRO" || tier === "ELITE";

  const adverse = edge !== null && Number.isFinite(edge.expectedClv) && edge.expectedClv < 0;

  return (
    <Surface accent={pick.tier === "PREMIUM"} testID={`pick-card-${pick.id}`}>
      {/* ── Anatomy 1: eyebrow row ─────────────────────────────────────── */}
      <Row justify="space-between" align="center">
        <Row gap="s2" align="center">
          <Eyebrow tone="wayfind">{pick.game.sport}</Eyebrow>
          <TierBadge tier={pick.tier} />
        </Row>
        <Row gap="s2" align="center">
          {pick.isFeatured ? <Pill tone="accent">Featured</Pill> : null}
          <SettlementBadge result={pick.result} size="sm" />
        </Row>
      </Row>

      <Spacer size="s3" />

      {/* ── Anatomy 2: the primary call ────────────────────────────────── */}
      <Touchable
        onPress={() => onOpen(pick)}
        accessibilityLabel={`${pick.selection}, ${pick.game.awayTeam} at ${pick.game.homeTeam}`}
        accessibilityHint="Opens the full pick, including the factor trail"
        style={{ minHeight: t.space.s10 }}
      >
        <Text style={[t.type.displaySm, { color: t.colors.fg }]} numberOfLines={2} allowFontScaling>
          {pick.selection}
        </Text>
        <Text style={[t.type.bodySm, { color: t.colors.fgMeta, marginTop: t.space.s1 }]}>
          {pick.game.awayTeam} @ {pick.game.homeTeam} {"\u00B7"} {stamp(pick.game.commenceTime)}
        </Text>
      </Touchable>

      <Spacer size="s3" />

      {/* ── The book-price honesty line ────────────────────────────────── */}
      {!priced ? (
        <Row gap="s2" align="center">
          <Pill tone="caution">No book price attached</Pill>
          <Eyebrow tone="muted">Model signal only</Eyebrow>
        </Row>
      ) : (
        <Row gap="s2" align="center">
          <Eyebrow tone="meta">Line</Eyebrow>
          <Numeral size="numMd">{pick.line > 0 ? `+${pick.line}` : `${pick.line}`}</Numeral>
        </Row>
      )}

      <Spacer size="s4" />

      {/* ── Anatomy 3: confidence ──────────────────────────────────────── */}
      <ConfidenceMeter
        confidence={pick.confidence}
        redactedLabel={redactionLabel("confidence", tier)}
      />

      <Spacer size="s4" />
      <Divider />
      <Spacer size="s3" />

      {/* ── Anatomy 4: supporting context ──────────────────────────────── */}
      <Row gap="s6" wrap>
        <EdgeIndex value={pick.edgeScore} />
        <MarketImplied winProbability={pick.winProbability} />
        <ExpectedClv value={edge?.expectedClv ?? null} />
        <LineMovement movement={pick.lineMovement} redactedLabel={redactionLabel("lineMovement", tier)} />
        <DataQuality score={pick.dataQualityScore} />
      </Row>

      {/* ── Factor trail ──────────────────────────────────────────────── */}
      {breakdown && breakdown.factors.length > 0 ? (
        <>
          <Spacer size="s4" />
          <FactorTrail factors={breakdown.factors} />
        </>
      ) : null}

      {/* ── Reasoning ─────────────────────────────────────────────────── */}
      {reasoning ? (
        <>
          <Spacer size="s4" />
          <Body size="bodySm" tone="meta" numberOfLines={4}>
            {reasoning}
          </Body>
        </>
      ) : null}

      {/* ── Anatomy 6: weakness disclosure (Pro+ only) ─────────────────── */}
      {showWeakness && weakness ? (
        <>
          <Spacer size="s4" />
          <View
            style={{
              borderLeftWidth: 2,
              borderLeftColor: t.colors.caution,
              paddingLeft: t.space.s3,
            }}
          >
            <Eyebrow tone="meta">What would change this</Eyebrow>
            <Body size="bodySm" tone="meta">
              {weakness}
            </Body>
          </View>
        </>
      ) : null}

      {/* ── Adverse disclosure ────────────────────────────────────────── */}
      {adverse ? (
        <>
          <Spacer size="s4" />
          <View
            style={{
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: t.colors.alert,
              borderRadius: t.radius.sm,
              padding: t.space.s3,
            }}
          >
            <Eyebrow tone="alert">Withheld from the board</Eyebrow>
            <Body size="bodySm" tone="meta">
              The engine prices this side worse than the book is offering. We surface
              it here only so it can be reviewed — it is not offered.
            </Body>
          </View>
        </>
      ) : null}

      <Spacer size="s4" />
      <Divider />
      <Spacer size="s3" />

      {/* ── Anatomy 7: source + freshness — always present ─────────────── */}
      <Row justify="space-between" align="flex-end">
        <FreshnessStamp
          iso={pick.dataFreshnessAt ?? pick.generatedAt}
          fromCache={fromCache}
          cacheAgeMs={cacheAgeMs}
          now={now}
        />
        <GradeLabel grade={pick.pickGrade} />
      </Row>

      <Spacer size="s3" />
      <Row gap="s2" align="center" wrap>
        <RiskBadge risk={pick.riskLevel} />
        {pick.receiptHash ? (
          <Pill tone="neutral">Receipt {pick.receiptHash.slice(0, 8)}</Pill>
        ) : null}
        {pick.isAuditAvailable ? <Pill tone="neutral">Audit available</Pill> : null}
      </Row>

      {/* ── Anatomy 8: action ─────────────────────────────────────────── */}
      {(actionLabel && onAction) || onExplain ? (
        <>
          <Spacer size="s4" />
          <Row gap="s3">
            {actionLabel && onAction && !adverse ? (
              <Button label={actionLabel} onPress={() => onAction(pick)} variant="primary" />
            ) : null}
            {onExplain ? (
              <Button
                label="Factor trail"
                onPress={() => onExplain(pick)}
                variant="secondary"
              />
            ) : null}
          </Row>
        </>
      ) : null}
    </Surface>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FACTOR TRAIL
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The factor breakdown bars.
 *
 * Contract: "One accent color per chart — pick one of plasma, orbital cyan, or
 * ultraviolet. Do not mix accent colors in a single visualization unless they
 * map to a semantic distinction."
 *
 * Under FIELD the palette retired cyan and UV to fog, so the ONLY remaining
 * colour distinction that survives is ember-or-fog. The bars therefore map
 * colour to the one semantic distinction that still matters and still has a
 * token — positive versus negative contribution — and never to "which factor".
 *
 * A weight is also rendered as a NUMBER on every row, because the contract's
 * first data-viz rule is "numerals first — the number is always visible before
 * the chart renders."
 */
function FactorTrail({ factors }: { factors: FactorDetail[] }): React.ReactElement {
  const t = useTheme();
  const maxAbs = Math.max(1, ...factors.map((f) => Math.abs(f.weight)));

  return (
    <View accessibilityRole="none">
      <Eyebrow tone="meta">Factor breakdown</Eyebrow>
      <Spacer size="s2" />
      {factors.map((factor, index) => {
        const positive = factor.impact === "positive";
        const negative = factor.impact === "negative";
        const color = positive ? t.colors.accent : negative ? t.colors.alert : t.colors.fgMeta;
        // Annotated as DimensionValue: React Native's percentage width is a
        // template-literal type, and a plain `string` is not assignable to it.
        const widthPct: DimensionValue = `${Math.round(
          (Math.abs(factor.weight) / maxAbs) * 100,
        )}%`;
        return (
          <View
            key={`${factor.name}-${index}`}
            style={{ marginBottom: t.space.s2 }}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${factor.name}, ${factor.impact}, weight ${factor.weight}`}
          >
            <Row justify="space-between" align="baseline">
              <Body size="bodySm" tone="meta" numberOfLines={1} style={{ flex: 1 }}>
                {factor.name}
              </Body>
              <Numeral size="numXs" tone={positive ? "accent" : negative ? "alert" : "meta"}>
                {edgePoints(factor.weight)}
              </Numeral>
            </Row>
            <View
              style={{
                height: 4,
                marginTop: 3,
                backgroundColor: t.withAlpha(t.colors.fgMeta, 0.14),
                borderRadius: t.radius.xs,
                overflow: "hidden",
              }}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <View
                style={{
                  width: widthPct,
                  height: 4,
                  backgroundColor: color,
                  borderRadius: t.radius.xs,
                }}
              />
            </View>
          </View>
        );
      })}
      {/* A factor description is server text and passes the linter before use. */}
      {factors[0]?.description ? (
        <Body size="bodySm" tone="muted" numberOfLines={2}>
          {safeServerCopy("factor:description", factors[0].description)}
        </Body>
      ) : null}
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   WEAKNESS DERIVATION
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * "What would change this."
 *
 * Derived, never authored: the largest NEGATIVE-impact factor is the honest
 * answer to "what is this pick's weakest point". If nothing is negative, say so
 * plainly rather than inventing a caveat.
 *
 * The returned string is composed from the factor NAME only (a server string)
 * and passes the voice linter. If it fails, the disclosure is suppressed rather
 * than rendered — a weakness line is not so important that it justifies
 * shipping a rule-8 violation.
 */
export function pickWeakness(factors: readonly FactorDetail[]): string | null {
  const negatives = factors.filter((f) => f.impact === "negative" && f.name);
  if (factors.length === 0) return null;
  if (negatives.length === 0) {
    return "No factor in this breakdown scored against the pick. The exposure is variance, not a known weakness.";
  }
  const worst = negatives.reduce((acc, f) => (f.weight < acc.weight ? f : acc), negatives[0] as FactorDetail);
  const sentence = `${worst.name} is the heaviest factor against this pick. If it moves the other way, this read is wrong.`;
  return scanVoice(sentence).length === 0 ? sentence : null;
}