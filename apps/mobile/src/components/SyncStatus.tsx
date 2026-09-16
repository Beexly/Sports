import * as React from "react";
import { View } from "react-native";

import { useTheme } from "../theme";
import { useWatchlist } from "../hooks/useWatchlist";
import { Body, Divider, Eyebrow, Pill, Row, Spacer, Surface, Touchable } from "./primitives";

/**
 * Sync status.
 *
 * WHY THIS EXISTS: the offline queue deliberately never drops a write, so there
 * is always a state where the user's action happened locally and has not reached
 * the server. A product that keeps that state to itself has built a queue that
 * lies — the user sees their own optimistic state and nothing tells them it is
 * unconfirmed.
 *
 * Three states, and the distinction between the last two is the point:
 *
 *   syncing  — work in flight. Neutral, not alarming; this is normal.
 *   pending  — waiting for connectivity. The action WILL go through.
 *   parked   — the queue gave up. The action will NOT go through unless the user
 *              acts, and saying so is the only honest option.
 *
 * The component renders nothing when there is nothing to say, so it costs a
 * quiet screen nothing.
 */

export function SyncStatus(): React.ReactElement | null {
  const t = useTheme();
  const { pendingFollows, pendingUnfollows, parked, syncing, sync } = useWatchlist();

  const pendingCount = pendingFollows.length + pendingUnfollows.length;

  if (pendingCount === 0 && parked.length === 0 && !syncing) return null;

  if (parked.length > 0) {
    return (
      <Surface>
        <Row gap="s2" align="center">
          <Pill tone="alert">Not sent</Pill>
          <Eyebrow tone="meta">
            {parked.length} action{parked.length === 1 ? "" : "s"} could not be saved
          </Eyebrow>
        </Row>
        <Spacer size="s3" />
        <Body size="bodySm" tone="meta">
          {parked.length === 1
            ? "One change you made could not be applied to your account."
            : `${parked.length} changes you made could not be applied to your account.`}{" "}
          Nothing was lost on this device, and nothing was applied either.
        </Body>
        <Spacer size="s3" />
        <Divider />
        <Spacer size="s3" />
        <Body size="bodySm" tone="muted">
          {parked[0]?.parked?.reason ?? "The server refused it."}
        </Body>
        <Spacer size="s3" />
        <Touchable
          onPress={() => void sync()}
          accessibilityLabel="Retry saving your changes"
        >
          <View
            style={{
              minHeight: 44,
              justifyContent: "center",
              paddingHorizontal: t.space.s4,
              borderRadius: t.radius.sm,
              borderWidth: 1,
              borderColor: t.colors.borderStrong,
              alignSelf: "flex-start",
            }}
          >
            <Eyebrow tone="fg">Try again</Eyebrow>
          </View>
        </Touchable>
      </Surface>
    );
  }

  return (
    <Surface>
      <Row gap="s2" align="center">
        <Pill tone="caution">{syncing ? "Saving" : "Waiting"}</Pill>
        <Eyebrow tone="meta">
          {pendingCount} change{pendingCount === 1 ? "" : "s"} not yet saved
        </Eyebrow>
      </Row>
      <Spacer size="s2" />
      <Body size="bodySm" tone="muted">
        {syncing
          ? "Sending them to your account now."
          : "They will be saved automatically next time you are online."}
      </Body>
    </Surface>
  );
}