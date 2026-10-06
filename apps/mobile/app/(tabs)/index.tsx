import * as React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBoard, useRetry } from "../../src/hooks/queries";
import { useTheme } from "../../src/theme";
import { usePreferences } from "../../src/state/preferences";
import { useSession, viewerTier } from "../../src/state/session";
import { BoardLaneRow } from "../../src/components/BoardLaneRow";
import { ErrorState, GateState, LoadingState } from "../../src/components/states";
import { Body, Divider, Eyebrow, Heading, Numeral, Row, Spacer, Stack, Surface } from "../../src/components/primitives";
import { FreshnessStamp, SectionHeader } from "../../src/components/signals";
import { stamp } from "../../src/lib/format";
import type { BoardStateData } from "../../src/api/contracts";

/**
 * The Board — `/board` on the web, `BoardStateData` on the wire.
 *
 * WHAT THIS SCREEN IS FOR, and what it is not:
 *
 * The board is NOT a list of picks. It is the engine's gate state made visible:
 * what is being scored right now, what it published, and — the part no other
 * product shows — what it REFUSED and why. The owner's positioning line is
 * "It says no far more than it says yes" and "No edge, no pick". A board that
 * only showed the published lane would delete the product's whole argument.
 *
 * So the three lanes are peers, and the GATED lane is not de-emphasised. It is
 * the most important column on the screen.
 *
 * THE HEALTH STRIP is load-bearing. `booksPolled` has been observed at 0 in
 * production with no picks on a football Sunday (2026-09-13). A board that
 * silently renders empty in that state is lying by omission, so the strip
 * states the counts and lets a zero be visible.
 */

export default function BoardScreen(): React.ReactElement {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const query = useBoard();
  const retry = useRetry(query);
  const tier = viewerTier(useSession((s) => s.user));
  const sports = usePreferences((s) => s.sports);
  const now = React.useMemo(() => new Date(), [query.dataUpdatedAt]);

  const result = query.data;

  const header = (
    <View style={{ paddingTop: insets.top + t.space.s3 }}>
      <Row justify="space-between" align="flex-end">
        <View>
          <Eyebrow tone="wayfind">Board</Eyebrow>
          <Heading size="archMd" style={{ marginTop: t.space.s1 }}>
            THE GATE
          </Heading>
        </View>
        {result && result.ok ? (
          <Numeral size="numMd" tone="meta">
            v{result.data.data.modelVersion || "—"}
          </Numeral>
        ) : null}
      </Row>
      <Spacer size="s3" />
      <Divider />
    </View>
  );

  if (query.isPending) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingHorizontal: t.space.s4 }}>
        {header}
        <LoadingState label="Reading the gate" />
      </View>
    );
  }

  if (!result) {
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingHorizontal: t.space.s4 }}>
        {header}
        <Spacer size="s4" />
        <ErrorState failure={unreachable()} onRetry={retry} subject="the board" />
      </View>
    );
  }

  if (!result.ok) {
    // A gate and an error are different products. Render the right one.
    const isGate = result.kind === "gated" || result.kind === "stale" || result.kind === "rate_limited";
    return (
      <View style={{ flex: 1, backgroundColor: t.colors.bg, paddingHorizontal: t.space.s4 }}>
        {header}
        <Spacer size="s4" />
        {isGate ? <GateState failure={result} onRetry={retry} /> : <ErrorState failure={result} onRetry={retry} />}
      </View>
    );
  }

  const data = result.data.data;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: t.space.s4,
          paddingBottom: t.space.s16,
        }}
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
        <HealthStrip data={data} />

        <Spacer size="s4" />
        <FreshnessStamp iso={data.lastRefresh} fromCache={result.fromCache} cacheAgeMs={result.cacheAgeMs} />

        {/* ── Published ─────────────────────────────────────────────────── */}
        <Spacer size="s6" />
        <SectionHeader
          eyebrow="Published"
          title={data.publishedToday.length === 0 ? undefined : `${data.publishedToday.length} on the board`}
        />
        <Spacer size="s3" />
        {data.publishedToday.length === 0 ? (
          <Surface>
            <Body tone="meta">
              Nothing has cleared the gate yet today. Most days, fewer than five picks. Some days, none.
            </Body>
            <Spacer size="s2" />
            <Body size="bodySm" tone="muted">
              {describeQuiet(data)}
            </Body>
          </Surface>
        ) : (
          <Stack gap="s3">
            {data.publishedToday.map((row) => (
              <BoardLaneRow
                key={row.id}
                row={row}
                tier={tier}
                onOpen={({ gameId }) => router.push({ pathname: "/pick/[id]", params: { id: gameId } })}
              />
            ))}
          </Stack>
        )}

        {/* ── Scoring now ───────────────────────────────────────────────── */}
        <Spacer size="s8" />
        <SectionHeader eyebrow="Scoring now" />
        <Spacer size="s3" />
        {data.scoringNow.length === 0 ? (
          <Surface>
            <Body size="bodySm" tone="meta">
              No game is inside a scoring run this moment.
            </Body>
          </Surface>
        ) : (
          <Stack gap="s3">
            {data.scoringNow.map((row) => (
              <BoardLaneRow
                key={row.id}
                row={row}
                tier={tier}
                onOpen={({ gameId }) => router.push({ pathname: "/pick/[id]", params: { id: gameId } })}
              />
            ))}
          </Stack>
        )}

        {/* ── Gated — the refusal lane ──────────────────────────────────── */}
        <Spacer size="s8" />
        <SectionHeader
          eyebrow="Gated"
          title={data.gatedToday === 0 ? undefined : `Today we passed on ${data.gatedToday}`}
        />
        <Spacer size="s3" />
        {data.gatedTodayRows.length === 0 ? (
          <Surface>
            <Body size="bodySm" tone="meta">
              No gate decisions recorded today.
            </Body>
          </Surface>
        ) : (
          <Stack gap="s3">
            {data.gatedTodayRows.map((row) => (
              <BoardLaneRow
                key={row.id}
                row={row}
                tier={tier}
                onOpen={({ gameId }) => router.push({ pathname: "/pick/[id]", params: { id: gameId } })}
              />
            ))}
          </Stack>
        )}

        {/* ── Preferences ───────────────────────────────────────────────── */}
        {sports.length === 0 ? (
          <>
            <Spacer size="s8" />
            <Surface>
              <Eyebrow tone="meta">Filter</Eyebrow>
              <Spacer size="s2" />
              <Body size="bodySm" tone="meta">
                Showing every sport we cover. Set preferences in More.
              </Body>
            </Surface>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

/* ── Health strip ──────────────────────────────────────────────────────── */

/**
 * The four counters that tell a reader whether to trust the page in front of
 * them. `booksPolled` at 0 is the single most important number here — a board
 * with no books behind it is a board with nothing behind it, and production has
 * shown exactly that.
 */
function HealthStrip({ data }: { data: BoardStateData }): React.ReactElement {
  const t = useTheme();
  const booksTone = data.booksPolled === 0 ? "alert" : "fg";
  return (
    <Surface>
      {/*
        A 2x2 grid, not a wrapping row.
        At 393pt (the narrowest supported iPhone) four counters plus their gaps
        exceed the available 361pt and wrap 3+1, which reads as a layout mistake
        rather than as a table. Two rows of two is stable at every width this app
        supports, and the measurement that produced this comment is the 393pt
        frame in `preview/screens.html`.
      */}
      <Row justify="space-between" gap="s5">
        <Counter label="Sports" value={data.sportsWatched} />
        <Counter label="Books polled" value={data.booksPolled} tone={booksTone} />
      </Row>
      <Spacer size="s4" />
      <Row justify="space-between" gap="s5">
        <Counter label="Open picks" value={data.openPicks} />
        <Counter label="Gated today" value={data.gatedToday} />
      </Row>
      {data.booksPolled === 0 ? (
        <>
          <Spacer size="s3" />
          <Divider />
          <Spacer size="s2" />
          <Body size="bodySm" tone="alert">
            No sportsbook is pricing a game we cover right now, so there is nothing to
            evaluate. This is a data condition, not a quiet slate.
          </Body>
        </>
      ) : null}
      <Spacer size="s3" />
      <Divider />
      <Spacer size="s2" />
      <Body size="bodySm" tone="muted">
        Last refresh {stamp(data.lastRefresh)}
      </Body>
    </Surface>
  );
}

function Counter({
  label,
  value,
  tone = "fg",
}: {
  label: string;
  value: number;
  tone?: "fg" | "alert";
}): React.ReactElement {
  return (
    <View>
      <Eyebrow tone="meta">{label}</Eyebrow>
      <Numeral size="numLg" tone={tone}>
        {value}
      </Numeral>
    </View>
  );
}

/* ── Copy ──────────────────────────────────────────────────────────────── */

/**
 * An honest sentence for a quiet board.
 *
 * The server's own vocabulary distinguishes a genuinely quiet slate from a stale
 * one (`meta.degradationCharacter`), and that distinction exists because the two
 * mean opposite things to a customer: "nothing qualified" versus "we could not
 * check". The string is passed through rather than paraphrased, falling back to
 * the market-neutral sentence when the field is absent.
 */
function describeQuiet(data: BoardStateData): string {
  if (data.bootstrap) {
    return "The board is still bootstrapping. Nothing has been evaluated yet.";
  }
  if (data.sportsWatched === 0) {
    return "No league is inside its slate window right now.";
  }
  return "The gate ran and nothing cleared it. That is the system working, not failing.";
}

/** The failure used when the query resolved with no data and no error at all. */
function unreachable() {
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