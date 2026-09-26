import * as React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBrief, useRetry } from "../../src/hooks/queries";
import { useTheme } from "../../src/theme";
import { ErrorState, GateState, LoadingState } from "../../src/components/states";
import { Body, Divider, Eyebrow, Heading, Row, Spacer, Surface } from "../../src/components/primitives";
import { FreshnessStamp } from "../../src/components/signals";
import { safeServerCopy } from "../../src/lib/voice";

/**
 * The daily Brief.
 *
 * The Brief is a NARRATIVE surface, which changes two rules:
 *
 *   1. It is one of the four surfaces where the token file scopes the paper
 *      reading mode ("data surfaces … never used on marketing/cinematic
 *      pages"). The Brief is the opposite of a data surface, so it stays FIELD
 *      even when the user has paper mode on. The mode is resolved by the
 *      navigation layer, not by this screen.
 *   2. Editorial type would be permitted here and nowhere else — but the FIELD
 *      revision retired the serial face, so the role now renders in the one
 *      family. `type.editMd` exists so the intent survives; the palette
 *      collapse is an upstream finding, not something to route around.
 *
 * The body text is SERVER COPY. It is scanned before render: the Brief is the
 * longest prose the product publishes, so it is the most likely place for a
 * positioning regression to appear, and the least likely place for anyone to
 * notice one by eye.
 */

export default function BriefScreen(): React.ReactElement {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const query = useBrief();
  const retry = useRetry(query);

  const header = (
    <View style={{ paddingTop: insets.top + t.space.s3, paddingHorizontal: t.space.s4 }}>
      <Eyebrow tone="wayfind">Brief</Eyebrow>
      <Heading size="archMd" style={{ marginTop: t.space.s1 }}>
        TODAY
      </Heading>
      <Spacer size="s3" />
      <Divider />
    </View>
  );

  const result = query.data;

  const body = (() => {
    if (query.isPending) {
      return (
        <View style={{ paddingHorizontal: t.space.s4 }}>
          <LoadingState label="Fetching the brief" />
        </View>
      );
    }
    if (!result) {
      return (
        <View style={{ paddingHorizontal: t.space.s4 }}>
          <ErrorState
            failure={{
              ok: false,
              kind: "server",
              message: "We could not reach the server.",
              detail: "Query settled with neither data nor an error.",
              status: null,
              retryAfterSec: null,
              retryable: true,
            }}
            onRetry={retry}
            subject="the brief"
          />
        </View>
      );
    }
    if (!result.ok) {
      const isGate = result.kind === "gated" || result.kind === "stale" || result.kind === "rate_limited";
      return (
        <View style={{ paddingHorizontal: t.space.s4 }}>
          {isGate ? (
            <GateState failure={result} onRetry={retry} />
          ) : (
            <ErrorState failure={result} onRetry={retry} subject="the brief" />
          )}
        </View>
      );
    }

    const brief = result.data;

    if (brief.gated || brief.body.length === 0) {
      return (
        <View style={{ paddingHorizontal: t.space.s4 }}>
          <Surface>
            <Eyebrow tone="wayfind">Not published</Eyebrow>
            <Spacer size="s2" />
            <Heading size="displaySm">No brief today.</Heading>
            <Spacer size="s3" />
            <Body tone="meta">
              {brief.gateReason
                ? safeServerCopy("brief:gateReason", brief.gateReason)
                : "The brief is written from the day's scoring runs. There were none worth reporting."}
            </Body>
          </Surface>
        </View>
      );
    }

    return (
      <View style={{ paddingHorizontal: t.space.s4 }}>
        <Surface>
          <Eyebrow tone="wayfind">{brief.headline || "Daily brief"}</Eyebrow>
          <Spacer size="s4" />
          {brief.body.map((paragraph, index) => (
            <View key={`p-${index}`} style={{ marginBottom: t.space.s4 }}>
              <Body size="bodyLg" style={{ color: t.colors.fg }}>
                {safeServerCopy(`brief:body:${index}`, paragraph)}
              </Body>
            </View>
          ))}
          <Divider />
          <Spacer size="s3" />
          <FreshnessStamp iso={brief.asOf} fromCache={result.fromCache} cacheAgeMs={result.cacheAgeMs} />
        </Surface>

        <Spacer size="s4" />
        <Surface>
          <Eyebrow tone="meta">What this is</Eyebrow>
          <Spacer size="s2" />
          <Body size="bodySm" tone="meta">
            The brief reports the model&apos;s state. It is not commentary, not a prediction
            about a game, and not a reaction to a result. Where it quotes a number, that
            number came from the engine and is checkable on the surfaces it links.
          </Body>
        </Surface>
      </View>
    );
  })();

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: t.space.s16 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isPending}
            onRefresh={retry}
            tintColor={t.colors.accent}
          />
        }
      >
        {header}
        <Spacer size="s4" />
        {body}
        <Spacer size="s8" />
        <View style={{ paddingHorizontal: t.space.s4 }}>
          <Row justify="space-between">
            <Eyebrow tone="muted">We detect. You decide.</Eyebrow>
          </Row>
        </View>
        <Spacer size="s10" />
      </ScrollView>
    </View>
  );
}