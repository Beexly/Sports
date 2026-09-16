import * as React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCalibration, usePerformance, useRetry } from "../../src/hooks/queries";
import { useTheme } from "../../src/theme";
import { CalibrationCurve } from "../../src/components/CalibrationCurve";
import { CollectingState, EmptyState, ErrorState, GateState, LoadingState } from "../../src/components/states";
import { Body, Divider, Eyebrow, Heading, Numeral, Pill, Row, Spacer, Stack, Surface } from "../../src/components/primitives";
import { FreshnessStamp } from "../../src/components/signals";
import {
  MIN_CURVE_SAMPLE,
  MIN_DISCRIMINATION_SAMPLE,
  MIN_PUBLISH_BUCKET_SAMPLE,
  VERDICT_META,
  brierRead,
  canRenderCurve,
  readDiscrimination,
  type CalibrationBucketInput,
} from "../../src/lib/calibration";
import { num, pct } from "../../src/lib/format";
import { safeServerCopy } from "../../src/lib/voice";

/**
 * Calibration — the trust surface.
 *
 * This is the single most credibility-bearing screen in the product, and the
 * design review flagged that its web counterpart (`calibration-panel.tsx`)
 * renders the right content in the wrong palette. The app takes the CONTENT
 * structure from that panel and the PALETTE from the design contract:
 *
 *   · The headline is the discrimination verdict — "does higher confidence win
 *     more?" — and it is allowed to say "Higher confidence is winning less.
 *     Under review" in the alert tone. A product that states its own failure in
 *     the headline is the whole positioning.
 *   · No casino green. The verdict tones are verify / alert / fog only.
 *   · Numbers before charts, always.
 *   · The curve does not render below 30 settled picks — it shows `n/30`.
 *
 * Three withholdings are enforced HERE, matching the web panel exactly:
 *   1. No curve below 30 settled.
 *   2. No win rate in a bucket below 30 decided ("collecting", not a number).
 *   3. The discrimination note's concrete rates are withheld unless BOTH
 *      endpoint buckets clear the publish floor.
 */

export default function CalibrationScreen(): React.ReactElement {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const calibration = useCalibration();
  const performance = usePerformance();
  const retryCalibration = useRetry(calibration);

  const header = (
    <View style={{ paddingTop: insets.top + t.space.s3, paddingHorizontal: t.space.s4 }}>
      <Eyebrow tone="wayfind">Calibration</Eyebrow>
      <Heading size="archMd" style={{ marginTop: t.space.s1 }}>
        DOES IT KNOW?
      </Heading>
      <Spacer size="s3" />
      <Divider />
    </View>
  );

  const body = (() => {
    if (calibration.isPending) {
      return (
        <View style={{ paddingHorizontal: t.space.s4 }}>
          <LoadingState label="Reading the graded record" />
        </View>
      );
    }
    const result = calibration.data;
    if (!result) {
      return (
        <View style={{ paddingHorizontal: t.space.s4 }}>
          <ErrorState
            failure={fallbackFailure()}
            onRetry={retryCalibration}
            subject="the graded record"
          />
        </View>
      );
    }
    if (!result.ok) {
      const isGate = result.kind === "gated" || result.kind === "stale" || result.kind === "rate_limited";
      return (
        <View style={{ paddingHorizontal: t.space.s4 }}>
          {isGate ? (
            <GateState failure={result} onRetry={retryCalibration} />
          ) : (
            <ErrorState failure={result} onRetry={retryCalibration} subject="the graded record" />
          )}
        </View>
      );
    }

    const data = result.data;
    const sampleSize = data.sampleSize;

    if (sampleSize === 0) {
      return (
        <View style={{ paddingHorizontal: t.space.s4 }}>
          <EmptyState
            title="No settled picks yet."
            body="Calibration is measured on settled results only. There is nothing to read until the first picks grade."
            footnote="We publish the curve at 30 settled picks."
          />
        </View>
      );
    }

    const inputs: CalibrationBucketInput[] = data.buckets.map((bucket) => {
      const decided = bucket.n;
      // `observed` is the realized win rate; the win count is recovered from it
      // rather than approximated, because a rounded win count would shift the
      // Clopper-Pearson interval.
      const wins = Math.round(bucket.observed * decided);
      return {
        label: `${bucket.lower}\u2013${bucket.upper}`,
        n: bucket.n,
        decided,
        wins,
        predicted: bucket.predicted,
      };
    });

    const read = readDiscrimination(inputs);
    const verdict = VERDICT_META[read.trend];
    const toneColor =
      verdict.tone === "verify" ? t.colors.verify : verdict.tone === "alert" ? t.colors.alert : t.colors.fgMeta;

    return (
      <View style={{ paddingHorizontal: t.space.s4 }}>
        {/* ── Discrimination verdict — the honest headline ──────────────── */}
        <Surface>
          <Eyebrow tone="meta">Does higher confidence win more?</Eyebrow>
          <Spacer size="s2" />
          <Row gap="s2" align="center">
            <Numeral size="numSm" tone={verdict.tone === "verify" ? "verify" : verdict.tone === "alert" ? "alert" : "meta"}>
              {verdict.glyph}
            </Numeral>
            <Body size="bodyLg" style={{ color: toneColor, flex: 1 }}>
              {verdict.label}
            </Body>
          </Row>
          <Spacer size="s2" />
          <Body size="bodySm" tone="meta">
            {safeServerCopy("calibration:note", read.note)}
          </Body>
          {read.ratesPublishable && read.spread !== null ? (
            <>
              <Spacer size="s3" />
              <Divider />
              <Spacer size="s2" />
              <Row gap="s6">
                <View>
                  <Eyebrow tone="meta">Lowest band</Eyebrow>
                  <Numeral size="numMd">{pct(read.lowestBucketWinRate)}</Numeral>
                </View>
                <View>
                  <Eyebrow tone="meta">Highest band</Eyebrow>
                  <Numeral size="numMd">{pct(read.highestBucketWinRate)}</Numeral>
                </View>
                <View>
                  <Eyebrow tone="meta">Spread</Eyebrow>
                  <Numeral size="numMd" tone={read.spread > 0 ? "verify" : "alert"}>
                    {pct(read.spread)}
                  </Numeral>
                </View>
              </Row>
            </>
          ) : null}
        </Surface>

        {/* ── The curve ────────────────────────────────────────────────── */}
        <Spacer size="s4" />
        <SectionLabel label="Reliability" trailing={`${sampleSize} settled`} />
        <Spacer size="s3" />
        {canRenderCurve(sampleSize) ? (
          <Surface>
            <CalibrationCurve buckets={inputs} />
          </Surface>
        ) : (
          <CollectingState
            sampleSize={sampleSize}
            required={MIN_CURVE_SAMPLE}
            onTrack="We publish the curve at 30 settled picks. Below that a line would say more about the sample than about the model."
          />
        )}

        {/* ── Brier ────────────────────────────────────────────────────── */}
        <Spacer size="s4" />
        <Surface>
          <Row justify="space-between" align="baseline">
            <Eyebrow tone="meta">Brier score</Eyebrow>
            <Numeral size="numMd">{num(data.brier, 4)}</Numeral>
          </Row>
          <Spacer size="s2" />
          <Body size="bodySm" tone="meta">
            {brierRead(data.brier ?? null)}
          </Body>
          <Spacer size="s2" />
          <Body size="bodySm" tone="muted">
            A constant 0.5 forecast scores 0.25. Lower is better.
          </Body>
        </Surface>

        {/* ── Bucket table ─────────────────────────────────────────────── */}
        <Spacer size="s4" />
        <SectionLabel label="Bands" />
        <Spacer size="s3" />
        <Stack gap="s2">
          {inputs.map((bucket) => (
            <BucketRow key={bucket.label} bucket={bucket} />
          ))}
        </Stack>

        {/* ── Floors footer ────────────────────────────────────────────── */}
        <Spacer size="s4" />
        <Surface>
          <Eyebrow tone="meta">What we withhold, and why</Eyebrow>
          <Spacer size="s2" />
          <Body size="bodySm" tone="meta">
            Direction is read from {MIN_DISCRIMINATION_SAMPLE} decided picks in a band. A win
            rate is published from {MIN_PUBLISH_BUCKET_SAMPLE}. The curve renders at{" "}
            {MIN_CURVE_SAMPLE}. Below each floor you get the count, not an estimate dressed up
            as a result.
          </Body>
        </Surface>

        <Spacer size="s4" />
        {result.ok ? <FreshnessStamp iso={data.asOf} fromCache={result.fromCache} cacheAgeMs={result.cacheAgeMs} /> : null}
      </View>
    );
  })();

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: t.space.s16 }}
        refreshControl={
          <RefreshControl
            refreshing={calibration.isFetching && !calibration.isPending}
            onRefresh={retryCalibration}
            tintColor={t.colors.accent}
          />
        }
      >
        {header}
        <Spacer size="s4" />
        {body}

        {performance.data?.ok ? (
          <>
            <Spacer size="s8" />
            <View style={{ paddingHorizontal: t.space.s4 }}>
              <SectionLabel label="Graded record" />
              <Spacer size="s3" />
              <Surface>
                <Row gap="s6" wrap>
                  <Stat label="Settled" value={String(performance.data.data.settled)} />
                  <Stat label="Wins" value={String(performance.data.data.wins)} tone="verify" />
                  <Stat label="Losses" value={String(performance.data.data.losses)} tone="alert" />
                  <Stat label="Pushes" value={String(performance.data.data.pushes)} />
                  <Stat label="Voids" value={String(performance.data.data.voids)} />
                </Row>
                <Spacer size="s3" />
                <Divider />
                <Spacer size="s2" />
                <Body size="bodySm" tone="muted">
                  Pushes and voids are counted and excluded from any win rate. They are shown
                  because removing them would flatter the numbers.
                </Body>
              </Surface>
            </View>
          </>
        ) : null}
        <Spacer size="s10" />
      </ScrollView>
    </View>
  );
}

/* ── Bucket row ────────────────────────────────────────────────────────── */

/**
 * One confidence band.
 *
 * The reliability bar carries an EXPECTED MARKER — the position the observed
 * rate would sit at if the band were perfectly calibrated. That marker is the
 * whole point of a reliability diagram: a bar alone says "40% won"; a bar with
 * a marker says "40% won where 70% was claimed", which is the actual finding.
 */
function BucketRow({ bucket }: { bucket: CalibrationBucketInput }): React.ReactElement {
  const t = useTheme();
  const publishable = bucket.decided >= MIN_PUBLISH_BUCKET_SAMPLE;
  const observed = bucket.decided > 0 ? bucket.wins / bucket.decided : 0;
  const gap = observed - bucket.predicted;

  return (
    <Surface>
      <Row justify="space-between" align="baseline">
        <Eyebrow tone="meta">Band {bucket.label}</Eyebrow>
        {publishable ? (
          <Numeral size="numSm">{pct(observed)}</Numeral>
        ) : (
          <Pill tone="neutral">{`${bucket.decided}/${MIN_PUBLISH_BUCKET_SAMPLE}`}</Pill>
        )}
      </Row>
      <Spacer size="s2" />
      {publishable ? (
        <>
          <View
            style={{
              height: 8,
              borderRadius: t.radius.xs,
              backgroundColor: t.withAlpha(t.colors.fgMeta, 0.14),
              overflow: "hidden",
            }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <View
              style={{
                width: `${Math.round(observed * 100)}%`,
                height: 8,
                backgroundColor: t.colors.wayfind,
                borderRadius: t.radius.xs,
              }}
            />
          </View>
          <Spacer size="s2" />
          <Row justify="space-between">
            <Body size="bodySm" tone="muted">
              Expected {pct(bucket.predicted)}
            </Body>
            <Body size="bodySm" tone={Math.abs(gap) < 0.05 ? "muted" : "meta"}>
              {gap >= 0 ? "+" : "\u2212"}
              {pct(Math.abs(gap))}
            </Body>
          </Row>
        </>
      ) : (
        <Body size="bodySm" tone="muted">
          Collecting. A rate from {bucket.decided} decided picks would not mean anything yet.
        </Body>
      )}
    </Surface>
  );
}

/* ── Small parts ───────────────────────────────────────────────────────── */

function SectionLabel({ label, trailing }: { label: string; trailing?: string }): React.ReactElement {
  const t = useTheme();
  return (
    <Row justify="space-between" align="center">
      <Eyebrow tone="wayfind">{label}</Eyebrow>
      {trailing ? <Eyebrow tone="muted">{trailing}</Eyebrow> : null}
    </Row>
  );
}

function Stat({
  label,
  value,
  tone = "fg",
}: {
  label: string;
  value: string;
  tone?: "fg" | "verify" | "alert";
}): React.ReactElement {
  return (
    <View>
      <Eyebrow tone="meta">{label}</Eyebrow>
      <Numeral size="numMd" tone={tone}>
        {value}
      </Numeral>
    </View>
  );
}

function fallbackFailure() {
  return {
    ok: false as const,
    kind: "server" as const,
    message: "We could not reach the server.",
    detail: "Query settled with neither data nor an error.",
    status: null,
    retryAfterSec: null,
    retryable: true,
  };
}