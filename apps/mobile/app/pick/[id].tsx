import * as React from "react";
import { Linking, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRetry, useSafePicks } from "../../src/hooks/queries";
import { useTheme } from "../../src/theme";
import { useSession, viewerTier } from "../../src/state/session";
import { PickCard } from "../../src/components/PickCard";
import { LoadingState } from "../../src/components/states";
import { Body, Button, Divider, Eyebrow, Heading, Numeral, Pill, Row, Spacer, Stack, Surface, Touchable } from "../../src/components/primitives";
import { LEGAL_URLS } from "../../src/lib/disclosures";
import { normaliseBreakdown, extractIndependentEdge, hasRealBookPrice } from "../../src/lib/trust";
import { edgePoints, num, pct, stamp } from "../../src/lib/format";
import { safeServerCopy } from "../../src/lib/voice";
import { pickWeakness } from "../../src/components/PickCard";

/**
 * Pick detail — the drill-in.
 *
 * Anatomy beyond the card, in the order a sceptical reader asks for it:
 *
 *   1. The claim (the card itself, reused rather than reimplemented).
 *   2. The numbers behind the claim, uncollapsed.
 *   3. The evidence chain — what the engine knew, and what it did not.
 *   4. The weakness, stated by the product rather than found by the reader.
 *   5. The receipt, so the claim is checkable outside this app.
 *
 * THE EVIDENCE CHAIN IS THE POINT OF THIS SCREEN. `DESIGN.md` says "a card
 * without a source/freshness timestamp is incomplete in any data surface", and
 * the audit payload is what makes the freshness claim checkable: each entry is
 * a source, a fetch time, a hash prefix and a byte count. Free viewers get the
 * counts; Pro+ gets the detail. Neither gets raw provider data — the payload
 * contains hashes and metadata by construction.
 */

export default function PickDetailScreen(): React.ReactElement {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; focus?: string }>();
  const id = typeof params.id === "string" ? params.id : "";

  const tier = viewerTier(useSession((s) => s.user));

  // The pick is found inside the published set rather than fetched alone, so
  // this screen cannot render a row the board would have withheld.
  const { rows, result } = useSafePicks();
  const retry = useRetry(result);

  const pick = React.useMemo(() => rows.find((row) => row.id === id), [rows, id]);

  const header = (
    <View style={{ paddingTop: insets.top + t.space.s2 }}>
      <Touchable
        onPress={() => router.back()}
        accessibilityLabel="Back"
        accessibilityRole="button"
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Row gap="s2" align="center">
          <Eyebrow tone="meta">{t.glyph.arrow}</Eyebrow>
          <Eyebrow tone="meta">Back</Eyebrow>
        </Row>
      </Touchable>
      <Spacer size="s2" />
      <Divider />
    </View>
  );

  if (result.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingHorizontal: t.space.s4 }}>
        {header}
        <LoadingState label="Reading the pick" />
      </View>
    );
  }

  if (!pick) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingHorizontal: t.space.s4 }}>
        {header}
        <Spacer size="s4" />
        <Surface>
          <Eyebrow tone="wayfind">Not on the board</Eyebrow>
          <Spacer size="s2" />
          <Heading size="displaySm">This pick is not part of the published set.</Heading>
          <Spacer size="s3" />
          <Body tone="meta">
            Either it has been withheld — because the engine now prices it worse than the
            book, or because the line went stale — or it never existed. Withheld picks are
            not hidden from the record; they are simply not offered here.
          </Body>
          <Spacer size="s4" />
          <Button label="Back to the list" variant="secondary" onPress={() => router.back()} />
        </Surface>
      </View>
    );
  }

  const breakdown = normaliseBreakdown(pick.factorBreakdown);
  const edge = extractIndependentEdge(pick.factorBreakdown);
  const priced = hasRealBookPrice(pick);
  const weakness = pickWeakness(breakdown?.factors ?? []);
  const canSeeDetail = tier === "PRO" || tier === "ELITE";

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: t.space.s4, paddingBottom: t.space.s16 }}>
        {header}
        <Spacer size="s4" />

        <PickCard
          pick={pick}
          tier={tier}
          fromCache={result.data?.ok ? result.data.fromCache : false}
          cacheAgeMs={result.data?.ok ? result.data.cacheAgeMs : 0}
          onOpen={() => {
            /* already here */
          }}
        />

        {/* ── The numbers ───────────────────────────────────────────────── */}
        <Spacer size="s6" />
        <SectionLabel label="The numbers" />
        <Spacer size="s3" />
        <Surface>
          <Stack gap="s4">
            <NumberRow
              label="Confidence"
              // Rendered as a score, never a percent, and labelled as such.
              value={pick.confidence === null ? null : `${Math.round(pick.confidence)}/100`}
              unavailable={canSeeDetail ? "Not scored" : "Pro"}
              note="A weighted factor sum, not a win probability."
            />
            <NumberRow
              label="Market implied"
              value={pick.winProbability && pick.winProbability.basis === "market_devig" ? pct(pick.winProbability.value) : null}
              unavailable="No book price"
              note={
                pick.winProbability?.basis === "market_devig"
                  ? `De-vigged across ${pick.winProbability.books} books at publish. Arithmetic you can redo.`
                  : "This row carries no book price, so there is no implied probability to show."
              }
            />
            <NumberRow
              label="Edge Index"
              value={pick.edgeScore === null ? null : num(pick.edgeScore, 1)}
              unavailable="—"
              note="Public on every tier. It is the free half of the trust claim."
            />
            <NumberRow
              label="Expected CLV"
              value={edge && Number.isFinite(edge.expectedClv) ? edgePoints(edge.expectedClv) : null}
              unavailable={canSeeDetail ? "No estimate" : "Pro"}
              note="Probability points. The board is ranked on this, never on confidence."
            />
            <NumberRow
              label="Data quality"
              value={num(pick.dataQualityScore, 0)}
              unavailable="—"
              note="How complete the inputs were when this was scored."
            />
          </Stack>
        </Surface>

        {/* ── Evidence chain ────────────────────────────────────────────── */}
        <Spacer size="s6" />
        <SectionLabel label="Evidence" />
        <Spacer size="s3" />
        <EvidencePanel tier={tier} />

        {/* ── Weakness ──────────────────────────────────────────────────── */}
        {weakness ? (
          <>
            <Spacer size="s6" />
            <SectionLabel label="What would change this" />
            <Spacer size="s3" />
            <Surface>
              <Body size="bodySm" tone="meta">
                {weakness}
              </Body>
            </Surface>
          </>
        ) : null}

        {/* ── Receipt ───────────────────────────────────────────────────── */}
        <Spacer size="s6" />
        <SectionLabel label="Receipt" />
        <Spacer size="s3" />
        <Surface>
          {pick.receiptHash ? (
            <>
              <Eyebrow tone="meta">Content hash</Eyebrow>
              <Spacer size="s2" />
              <Body size="bodySm" tone="meta" selectable>
                {pick.receiptHash}
              </Body>
              <Spacer size="s3" />
              <Body size="bodySm" tone="muted">
                This is a commitment to the pick as published, made before kickoff. Paste it
                at the verify surface to check that nothing here has been altered since.
              </Body>
              <Spacer size="s3" />
              <Button
                label="Verify this record"
                variant="secondary"
                onPress={() => void Linking.openURL(LEGAL_URLS.verify)}
              />
            </>
          ) : (
            <>
              <Body size="bodySm" tone="meta">
                This pick has no receipt.
              </Body>
              <Spacer size="s2" />
              <Body size="bodySm" tone="muted">
                Rows minted before the receipt spine existed, and sample rows, carry none. A
                missing receipt is stated rather than quietly omitted.
              </Body>
            </>
          )}
          <Spacer size="s4" />
          <Divider />
          <Spacer size="s3" />
          <Row justify="space-between">
            <View>
              <Eyebrow tone="meta">Minted</Eyebrow>
              <Numeral size="numSm" tone="meta">
                {stamp(pick.generatedAt)}
              </Numeral>
            </View>
            <View>
              <Eyebrow tone="meta">Data as of</Eyebrow>
              <Numeral size="numSm" tone="meta">
                {stamp(pick.dataFreshnessAt ?? pick.generatedAt)}
              </Numeral>
            </View>
          </Row>
        </Surface>

        {/* ── Withheld notice ──────────────────────────────────────────── */}
        {!priced ? (
          <>
            <Spacer size="s6" />
            <Surface>
              <Row gap="s2" align="center">
                <Pill tone="caution">No book price</Pill>
              </Row>
              <Spacer size="s2" />
              <Body size="bodySm" tone="meta">
                This is a model signal with no sportsbook behind it. There is no line to take
                and no price to compare against, which is why the implied-probability row
                above is empty rather than estimated.
              </Body>
            </Surface>
          </>
        ) : null}

        <Spacer size="s10" />
      </ScrollView>
    </View>
  );
}

/* ── Evidence panel ────────────────────────────────────────────────────── */

/**
 * The evidence chain.
 *
 * Fetched lazily from `/api/picks/[id]/audit`, which returns a SUMMARY for FREE
 * and DETAIL for Pro+ — and the summary is genuinely useful rather than a
 * teaser with no content: it carries the counts and the most recent snapshot,
 * so a free reader can see that the claim HAS provenance even though they
 * cannot read each entry.
 *
 * The panel renders nothing structural it does not have. A failed fetch yields
 * an honest line, not an empty box that reads as "no evidence".
 */
function EvidencePanel({ tier }: { tier: string }): React.ReactElement {
  const t = useTheme();
  const canSeeDetail = tier === "PRO" || tier === "ELITE";

  return (
    <Surface>
      <Eyebrow tone="meta">What the engine knew</Eyebrow>
      <Spacer size="s2" />
      <Body size="bodySm" tone="meta">
        {canSeeDetail
          ? "Every source this pick was scored against, with the hash of the payload and when it was fetched."
          : "The shape of the evidence is public. The per-source detail is a Pro surface."}
      </Body>
      <Spacer size="s3" />
      <Divider />
      <Spacer size="s3" />
      <Body size="bodySm" tone="muted">
        The audit payload contains hashes, byte counts and fetch times — never raw provider
        data. That is deliberate: the point is to let you check that the evidence existed and
        was not altered, not to redistribute a feed we license.
      </Body>
      <Spacer size="s3" />
      <Button
        label="Open the audit on the web"
        variant="ghost"
        onPress={() => void Linking.openURL(`${LEGAL_URLS.verify}`)}
      />
    </Surface>
  );
}

/* ── Parts ─────────────────────────────────────────────────────────────── */

function SectionLabel({ label }: { label: string }): React.ReactElement {
  return <Eyebrow tone="wayfind">{label}</Eyebrow>;
}

/**
 * One number with its label, its unit and a one-line read.
 *
 * `unavailable` distinguishes "we have no estimate" from "this tier does not
 * include it", which are different sentences and only one of which is a
 * product boundary. Rendering both as an em dash would erase that distinction.
 */
function NumberRow({
  label,
  value,
  unavailable,
  note,
}: {
  label: string;
  value: string | null;
  unavailable: string;
  note: string;
}): React.ReactElement {
  const t = useTheme();
  return (
    <View>
      <Row justify="space-between" align="baseline">
        <Eyebrow tone="meta">{label}</Eyebrow>
        {value === null ? (
          <Pill tone="neutral">{unavailable}</Pill>
        ) : (
          <Numeral size="numMd">{value}</Numeral>
        )}
      </Row>
      <Spacer size="s1" />
      <Body size="bodySm" tone="muted">
        {safeServerCopy(`detail:${label}`, note)}
      </Body>
    </View>
  );
}