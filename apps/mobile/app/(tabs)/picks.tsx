import * as React from "react";
import { RefreshControl, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRetry, useSafePicks } from "../../src/hooks/queries";
import { useTheme } from "../../src/theme";
import { usePreferences } from "../../src/state/preferences";
import { useSession, viewerTier } from "../../src/state/session";
import { PickCard } from "../../src/components/PickCard";
import { EmptyState, ErrorState, GateState, LoadingState } from "../../src/components/states";
import { Body, Divider, Eyebrow, Heading, Pill, Row, Spacer, Surface } from "../../src/components/primitives";
import { compareByRanking } from "../../src/lib/trust";

/**
 * The Picks surface.
 *
 * THE MOST IMPORTANT THING ON THIS SCREEN IS WHAT IS NOT ON IT.
 *
 * Three separate rules can remove a row between the database and this list, and
 * every one of them is a promise the product makes:
 *
 *   1. The server tier gate removes PREMIUM rows for FREE viewers, and redacts
 *      `confidence`. (Rule 3 — enforcement is server-side; this screen only
 *      labels the redaction.)
 *   2. `adverse-edge-suppression` removes any row whose own `expectedClv` is
 *      negative — the engine saying, in its own numbers, that this side is
 *      priced worse than the book. Nine such rows were live on 2026-09-13.
 *   3. The stale-pick policy removes PENDING rows not refreshed in 14 days.
 *
 * Rules 2 and 3 run client-side too (`applyBoardSafety`), which is why this
 * screen can report a suppression COUNT. That count is shown, not hidden: a
 * board that silently drops rows is indistinguishable from a board with nothing
 * to show, and "we withheld three" is a materially different statement from
 * "there were three picks".
 *
 * The list is sorted by `compareByRanking`, which never uses confidence.
 */

export default function PicksScreen(): React.ReactElement {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sports = usePreferences((s) => s.sports);
  const sport = sports.length === 1 ? sports[0] : undefined;

  const { result: query, rows, suppressed } = useSafePicks(sport ? { sport } : {});
  const retry = useRetry(query);
  const tier = viewerTier(useSession((s) => s.user));

  const sorted = React.useMemo(
    () => [...rows].sort(compareByRanking),
    [rows],
  );

  const header = (
    <View style={{ paddingTop: insets.top + t.space.s3, paddingHorizontal: t.space.s4 }}>
      <Row justify="space-between" align="flex-end">
        <View>
          <Eyebrow tone="wayfind">Picks</Eyebrow>
          <Heading size="archMd" style={{ marginTop: t.space.s1 }}>
            THE PASS LIST
          </Heading>
        </View>
        {sport ? <Pill tone="neutral">{sport}</Pill> : null}
      </Row>
      <Spacer size="s3" />
      <Divider />
    </View>
  );

  const body = (() => {
    if (query.isPending) {
      return <LoadingState label="Reading the published set" />;
    }
    if (!query.data) {
      return (
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
          subject="the published record"
        />
      );
    }
    if (!query.data.ok) {
      const isGate =
        query.data.kind === "gated" ||
        query.data.kind === "stale" ||
        query.data.kind === "rate_limited";
      return isGate ? (
        <GateState failure={query.data} onRetry={retry} />
      ) : (
        <ErrorState failure={query.data} onRetry={retry} subject="the published record" />
      );
    }
    if (sorted.length === 0) {
      return (
        <EmptyState
          title="Nothing published on this slate."
          body={suppressed.emptied
            ? "Every row the engine produced was withheld before it reached you. We do not publish a bet we price worse than the book, and we do not publish on a stale line."
            : "The engine ran and did not find an edge it could stand behind. That is the product working as designed."}
          footnote={suppressedFoot(suppressed)}
          actionLabel="Check again"
          onAction={retry}
        />
      );
    }
    return null;
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
        {sorted.length > 0 && (suppressed.adverse > 0 || suppressed.stale > 0) ? (
          <>
            <WithheldNotice report={suppressed} />
            <Spacer size="s4" />
          </>
        ) : null}
        {body}

        {sorted.map((item) => (
          <View key={item.id} style={{ paddingHorizontal: t.space.s4, marginBottom: t.space.s3 }}>
            <PickCard
              pick={item}
              tier={tier}
              fromCache={query.data?.ok ? query.data.fromCache : false}
              cacheAgeMs={query.data?.ok ? query.data.cacheAgeMs : 0}
              onOpen={(pick) => router.push({ pathname: "/pick/[id]", params: { id: pick.id } })}
              onExplain={(pick) =>
                router.push({ pathname: "/pick/[id]", params: { id: pick.id, focus: "factors" } })
              }
            />
          </View>
        ))}

        <Spacer size="s6" />
        <View style={{ paddingHorizontal: t.space.s4 }}>
          <Surface>
            <Eyebrow tone="meta">How this list is ordered</Eyebrow>
            <Spacer size="s2" />
            <Body size="bodySm" tone="meta">
              By the engine&apos;s own expected closing line value first, then price difference,
              then Edge Index. Never by confidence — measured on 2026-09-13, the
              highest-confidence pick on the board carried the smallest edge on it.
            </Body>
          </Surface>
        </View>
        <Spacer size="s10" />
      </ScrollView>
    </View>
  );
}

/* ── Withheld notice ───────────────────────────────────────────────────── */

function WithheldNotice({
  report,
}: {
  report: { adverse: number; stale: number; emptied: boolean };
}): React.ReactElement {
  const t = useTheme();
  return (
    <View style={{ paddingHorizontal: t.space.s4 }}>
      <Surface>
        <Row gap="s2" align="center">
          <Pill tone="caution">Withheld</Pill>
          <Eyebrow tone="meta">
            {report.adverse + report.stale} row{report.adverse + report.stale === 1 ? "" : "s"} removed
          </Eyebrow>
        </Row>
        <Spacer size="s2" />
        {report.adverse > 0 ? (
          <Body size="bodySm" tone="meta">
            {report.adverse} priced worse than the book by our own estimate. We do not
            offer a bet we can see is bad.
          </Body>
        ) : null}
        {report.stale > 0 ? (
          <>
            {report.adverse > 0 ? <Spacer size="s1" /> : null}
            <Body size="bodySm" tone="meta">
              {report.stale} not refreshed inside the staleness window. A stale line is not
              an actionable one.
            </Body>
          </>
        ) : null}
        <Spacer size="s2" />
        <Body size="bodySm" tone="muted">
          Withheld rows still settle and still count in the record. Hiding a row we should
          have passed on is honest; erasing it from our results would not be.
        </Body>
      </Surface>
    </View>
  );
}

function suppressedFoot(report: { adverse: number; stale: number }): string | undefined {
  const total = report.adverse + report.stale;
  if (total === 0) return undefined;
  return `${total} row${total === 1 ? "" : "s"} withheld before this list was built.`;
}

/* ── Ranking ───────────────────────────────────────────────────────────── */

/**
 * The comparator is IMPORTED, not reimplemented.
 *
 * The first draft of this file inlined a copy "to avoid pulling the trust
 * module into the render path". That was wrong, and wrong in exactly the way
 * this codebase documents having been burned by: two implementations of one
 * predicate drift, and a drift in the sort order publishes a board ranked on
 * something other than edge. The module is a few hundred lines of pure
 * functions; there is no render cost worth a second source of truth.
 */