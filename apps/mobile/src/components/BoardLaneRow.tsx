import * as React from "react";
import { View } from "react-native";

import type { BoardStateRow, SubscriptionTier } from "../api/contracts";
import { useTheme } from "../theme";
import { redactionLabel } from "../lib/entitlements";
import { relativeTime } from "../lib/format";
import { safeServerCopy } from "../lib/voice";
import { Body, Eyebrow, Numeral, Pill, Row, Spacer, Surface, Touchable } from "./primitives";

/**
 * A board lane row.
 *
 * Deliberately NOT a PickCard. The board is a dense gate console — the design
 * contract's own table says the public surface is "curated — one signal per
 * card" while the cockpit is "dense — multiple signals per row". The board sits
 * between those two: it is public, but it is telemetry, so it leans dense and
 * leaves the full card treatment to the Picks surface.
 *
 * What each lane row must convey, in order of importance:
 *
 *   1. WHICH GAME — matchup, sport, market.
 *   2. WHAT STATE — the lane (`status`), which is the whole point of the screen.
 *   3. WHY, if it was gated — `gateReason`, verbatim from the server.
 *   4. Edge Index, always public.
 *   5. Confidence, when entitled — as a score, never a percent.
 *   6. How fresh the row is.
 */

export interface BoardLaneRowProps {
  row: BoardStateRow;
  tier: SubscriptionTier;
  onOpen: (row: BoardStateRow) => void;
}

export function BoardLaneRow({ row, tier, onOpen }: BoardLaneRowProps): React.ReactElement {
  const t = useTheme();
  const confidenceRedaction = redactionLabel("confidence", tier);

  const lane = {
    SCORING: { label: "Scoring", tone: "wayfind" as const },
    PUBLISHED: { label: "Published", tone: "accent" as const },
    GATED: { label: "Gated", tone: "neutral" as const },
  }[row.status];

  // The gate reason is server copy and is passed through the voice linter
  // before it is rendered. A refusal is the product's most load-bearing
  // sentence, so it is the last place a rule-8 regression should appear.
  const reason = row.gateReason ? safeServerCopy(`gate:${row.id}`, row.gateReason) : null;

  return (
    <Surface padded={false}>
      <Touchable
        onPress={() => onOpen(row)}
        accessibilityLabel={`${row.matchup}, ${lane.label}${row.gateReason ? `, ${row.gateReason}` : ""}`}
        accessibilityHint="Opens the details for this game"
      >
        <View style={{ padding: t.space.s4 }}>
          <Row justify="space-between" align="center">
            <Row gap="s2" align="center">
              <Eyebrow tone="wayfind">{row.sport}</Eyebrow>
              <Pill tone={lane.tone}>{lane.label}</Pill>
            </Row>
            <Eyebrow tone="muted">{relativeTime(row.updatedAt)}</Eyebrow>
          </Row>

          <Spacer size="s2" />

          <Body size="bodyLg" style={{ color: t.colors.fg }} numberOfLines={2}>
            {row.matchup}
          </Body>
          <Spacer size="s1" />
          <Eyebrow tone="meta">{row.market}</Eyebrow>

          <Spacer size="s3" />

          <Row gap="s6" align="baseline">
            <View>
              <Eyebrow tone="meta">Edge Index</Eyebrow>
              <Numeral size="numSm" tone={row.edgeIndex === null ? "muted" : "fg"}>
                {row.edgeIndex === null ? "—" : row.edgeIndex.toFixed(1)}
              </Numeral>
            </View>
            <View>
              <Eyebrow tone="meta">Confidence</Eyebrow>
              {row.confidence === null ? (
                confidenceRedaction ? (
                  <Pill tone="neutral">{confidenceRedaction}</Pill>
                ) : (
                  <Numeral size="numSm" tone="muted">
                    —
                  </Numeral>
                )
              ) : (
                // A score out of 100. Never a percent — see ConfidenceMeter.
                <Numeral size="numSm">{`${Math.round(row.confidence)}/100`}</Numeral>
              )}
            </View>
          </Row>

          {reason ? (
            <>
              <Spacer size="s3" />
              <Body size="bodySm" tone="meta" numberOfLines={3}>
                {reason}
              </Body>
            </>
          ) : null}
        </View>
      </Touchable>
    </Surface>
  );
}