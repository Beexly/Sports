import * as React from "react";
import { ActivityIndicator, View } from "react-native";

import { useTheme } from "../theme";
import type { ApiFailure } from "../api/contracts";
import { Body, Button, Divider, Eyebrow, Heading, Spacer, Surface } from "./primitives";

/**
 * The honest states.
 *
 * This file is the product's thesis rendered as UI. The positioning is
 * "We post when the model finds edge. Most days, fewer than five picks. Thin
 * slate? We post less. Sometimes nothing." — which means an empty screen is not
 * a failure mode to be papered over with a spinner or a placeholder card. It is
 * the most common honest outcome, and it has to look deliberate.
 *
 * The web homepage already does this ("No pick has earned the plasma state";
 * the calibration curve shows `{n}/30` rather than a fake line). These are the
 * native equivalents.
 *
 * RULES THESE COMPONENTS ENFORCE:
 *   · Never a skeleton card where a real card would go. A skeleton implies data
 *     is coming; on a quiet slate nothing is coming.
 *   · Never "Something went wrong." Every state names the actual condition, and
 *     where the server gave a reason, the reason is the copy.
 *   · Every failure state offers exactly one next action, and only when an
 *     action would actually help. A "Retry" button on a rate limit is a lie.
 */

/* ── Loading ───────────────────────────────────────────────────────────── */

/**
 * A spinner plus a sentence. Not a skeleton.
 *
 * The sentence exists because the four gates (`bootstrap`, `stale_data`,
 * rate-limited, offline) resolve at very different speeds, and a bare spinner
 * for 12 seconds reads as broken.
 */
export function LoadingState({ label = "Loading the board" }: { label?: string }): React.ReactElement {
  const t = useTheme();
  return (
    <View
      style={{ paddingVertical: t.space.s10, alignItems: "center", gap: t.space.s3 }}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
    >
      <ActivityIndicator color={t.colors.accent} />
      <Eyebrow tone="meta">{label}</Eyebrow>
    </View>
  );
}

/* ── Honest empty ──────────────────────────────────────────────────────── */

export interface EmptyStateProps {
  title: string;
  body: string;
  /** A single action, only when one actually helps. */
  actionLabel?: string;
  onAction?: () => void;
  /** Secondary line: the freshness stamp, so the user knows the data's age. */
  footnote?: string;
  testID?: string;
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  footnote,
  testID,
}: EmptyStateProps): React.ReactElement {
  const t = useTheme();
  return (
    <Surface level="card" testID={testID}>
      <Eyebrow tone="wayfind">Quiet slate</Eyebrow>
      <Spacer size="s2" />
      <Heading size="displaySm">{title}</Heading>
      <Spacer size="s3" />
      <Body tone="meta">{body}</Body>
      {footnote ? (
        <>
          <Spacer size="s3" />
          <Divider />
          <Spacer size="s2" />
          <Body size="bodySm" tone="muted">
            {footnote}
          </Body>
        </>
      ) : null}
      {actionLabel && onAction ? (
        <>
          <Spacer size="s4" />
          <Button label={actionLabel} onPress={onAction} variant="secondary" />
        </>
      ) : null}
    </Surface>
  );
}

/* ── Server gate ───────────────────────────────────────────────────────── */

/**
 * A server gate is not an error, and it must not be shown as one.
 *
 * The server emits deliberately distinct bodies: `bootstrapGateResponse` for a
 * readiness flag that is off, `staleDataGateResponse` for "awaiting fresh
 * data". That distinction exists so an operator can tell an env regression from
 * a data outage — and so this screen can say the right sentence.
 */
export function GateState({ failure, onRetry }: { failure: ApiFailure; onRetry?: () => void }): React.ReactElement {
  const t = useTheme();
  const { title, body } = gateCopy(failure);
  return (
    <Surface level="card">
      <Eyebrow tone={failure.kind === "stale" ? "wayfind" : "meta"}>
        {failure.kind === "stale" ? "Awaiting fresh data" : "Not open right now"}
      </Eyebrow>
      <Spacer size="s2" />
      <Heading size="displaySm">{title}</Heading>
      <Spacer size="s3" />
      <Body tone="meta">{body}</Body>
      {failure.retryAfterSec !== null && failure.kind === "rate_limited" ? (
        <>
          <Spacer size="s2" />
          <Body size="bodySm" tone="muted">
            Try again in about {Math.max(1, Math.round(failure.retryAfterSec))} seconds.
          </Body>
        </>
      ) : null}
      {/* No Retry on a rate limit — it would be a button that cannot work. */}
      {onRetry && failure.kind !== "rate_limited" ? (
        <>
          <Spacer size="s4" />
          <Button label="Check again" onPress={onRetry} variant="secondary" />
        </>
      ) : null}
    </Surface>
  );
}

function gateCopy(failure: ApiFailure): { title: string; body: string } {
  switch (failure.kind) {
    case "stale":
      return {
        title: "We do not publish on a stale slate.",
        body:
          "The last ingestion has not landed inside its refresh window, so the board is dark " +
          "rather than showing you a line we cannot stand behind.",
      };
    case "gated":
      return {
        title: "The board is not open right now.",
        body: failure.message,
      };
    case "rate_limited":
      return {
        title: "Slow down a moment.",
        body: "This device has made a lot of requests. The limit resets shortly.",
      };
    case "auth":
      return {
        title: "Sign in to see this.",
        body: "This surface is tied to your account, so we know what you are entitled to.",
      };
    case "not_found":
      return {
        title: "That is no longer available.",
        body: "It may have settled or been retracted. The record is unchanged either way.",
      };
    default:
      return {
        title: "We could not reach the server.",
        body: failure.message,
      };
  }
}

/* ── Error ─────────────────────────────────────────────────────────────── */

/**
 * An infrastructure problem, stated as one.
 *
 * Modelled on the web panel's own doctrine (quoted in
 * `calibration-panel.tsx`): "A connection problem, not a verdict. The graded
 * record is unchanged." The point is to stop a customer reading an outage as a
 * change in the product's results.
 */
export function ErrorState({
  failure,
  onRetry,
  subject = "this surface",
}: {
  failure: ApiFailure;
  onRetry?: () => void;
  subject?: string;
}): React.ReactElement {
  const t = useTheme();
  return (
    <Surface level="card">
      <Eyebrow tone="alert">Unavailable</Eyebrow>
      <Spacer size="s2" />
      <Heading size="displaySm">A connection problem, not a verdict.</Heading>
      <Spacer size="s3" />
      <Body tone="meta">{failure.message}</Body>
      <Spacer size="s2" />
      <Body size="bodySm" tone="muted">
        The graded record behind {subject} is unchanged by us not being able to reach it.
      </Body>
      {onRetry ? (
        <>
          <Spacer size="s4" />
          <Button label="Try again" onPress={onRetry} variant="secondary" />
        </>
      ) : null}
      {/* Operator detail, never shown as customer copy but useful in a bug report. */}
      <Spacer size="s3" />
      <Body size="bodySm" tone="muted" numberOfLines={2}>
        {failure.detail}
      </Body>
    </Surface>
  );
}

/* ── Collecting ────────────────────────────────────────────────────────── */

/**
 * The sample-size gate as a component.
 *
 * "Calibration is gated to 30 settled picks before any curve renders." Rather
 * than an empty chart, this shows the count — `12/30` — which is what the web
 * homepage does and what makes the number feel earned rather than hidden.
 */
export function CollectingState({
  sampleSize,
  required,
  onTrack,
}: {
  sampleSize: number;
  required: number;
  onTrack: string;
}): React.ReactElement {
  const t = useTheme();
  const pct = required > 0 ? Math.min(100, Math.round((sampleSize / required) * 100)) : 0;
  return (
    <Surface level="card">
      <Eyebrow tone="wayfind">Collecting</Eyebrow>
      <Spacer size="s2" />
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: t.space.s1 }}>
        <Body size="bodyLg" style={{ color: t.colors.fg }}>
          {sampleSize}
        </Body>
        <Body size="body" tone="meta">
          / {required} settled picks
        </Body>
      </View>
      <Spacer size="s3" />
      <View
        style={{
          height: 4,
          backgroundColor: t.withAlpha(t.colors.fgMeta, 0.16),
          borderRadius: t.radius.xs,
          overflow: "hidden",
        }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View
          style={{
            width: `${pct}%`,
            height: 4,
            backgroundColor: t.colors.wayfind,
            borderRadius: t.radius.xs,
          }}
        />
      </View>
      <Spacer size="s3" />
      <Body size="bodySm" tone="meta">
        {onTrack}
      </Body>
    </Surface>
  );
}