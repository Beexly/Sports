import * as React from "react";
import { Text, View } from "react-native";

import { environment, ink, ember, iris, semantic } from "../theme/tokens";

/**
 * SLATE — the Live Activity.
 *
 * Phase 6+ planning item 3 lists "iOS Live Activities for in-game pick tracking"
 * and item 4 lists a Watch complication showing "model version, slate density,
 * open picks count". Both read from the same board the app already has, so this
 * adds no server work.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  WHAT THIS RENDERS, AND THE ONE THING IT MUST NEVER RENDER
 * ══════════════════════════════════════════════════════════════════════════
 *
 * It renders STATE: how many picks are open, how many the engine gated today,
 * which model version produced them, and when the numbers were last refreshed.
 *
 * It NEVER renders a line, a price, or a probability. Three reasons, and each is
 * independently sufficient:
 *
 *   1. A Live Activity is a surface with no freshness stamp and no way to
 *      consult the record. A number there is a number with no provenance.
 *   2. The design contract forbids animating or silently updating a data value.
 *      An activity that updates on a push is the definition of a value changing
 *      while the reader watches.
 *   3. A price in a Live Activity is a price someone will act on, and it is the
 *      one number in this product that is guaranteed to be stale within minutes.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  THE FRESHNESS RULE, EXPRESSED AS AN iOS MECHANISM
 * ══════════════════════════════════════════════════════════════════════════
 *
 * `staleDate` is passed on every `start` and `update`. iOS de-emphasises the
 * activity once that date passes and no refresh has arrived. That is the native
 * equivalent of the app's "Offline copy, not refreshed" line — the system itself
 * shows the reader that the numbers are old, without this code having to be
 * trusted to remember. `STALE_AFTER_MS` is therefore a correctness constant, not
 * a decoration.
 *
 * Colours are FIELD tokens imported directly rather than through `useTheme`:
 * a Live Activity renders in a widget extension with no React context from the
 * app, so a hook would throw. The values are the same objects the app uses.
 */

/** The activity is de-emphasised by iOS after this long without a refresh. */
export const STALE_AFTER_MS = 30 * 60 * 1000;

export interface SlateActivityProps {
  /** Model version that produced the counts. Rendered so a version change is visible. */
  modelVersion: string;
  /** Picks currently open (published, not yet settled). */
  openPicks: number;
  /** Games the engine passed on today. The refusal count is the product, not a gap. */
  gatedToday: number;
  /** ISO timestamp of the last successful refresh. Always rendered. */
  lastRefresh: string;
}

/** Compact relative age. Duplicated from lib/format because a widget bundle
 *  should not pull the whole app's modules in for one function. */
function ageLabel(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "unknown";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.round(minutes / 60)}h`;
}

/**
 * The Live Activity layout.
 *
 * Marked with the `'widget'` directive by `createLiveActivity` at the call site;
 * this component itself stays a plain function so it typechecks against the same
 * React Native types as the rest of the app.
 */
export function SlateActivityLayout({ props }: { props: SlateActivityProps }): React.ReactElement {
  const { modelVersion, openPicks, gatedToday, lastRefresh } = props;
  return (
    <View
      style={{
        padding: 16,
        backgroundColor: environment.carbon,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text
          style={{
            fontSize: 11,
            letterSpacing: 1.6,
            color: iris.base,
            textTransform: "uppercase",
            fontWeight: "600",
          }}
        >
          Galaxy Sports Edge
        </Text>
        <Text style={{ fontSize: 11, letterSpacing: 1.2, color: ink.mist }}>
          {`v${modelVersion}`}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: 24 }}>
        <View>
          <Text style={{ fontSize: 10, letterSpacing: 1.4, color: ink.mist, textTransform: "uppercase" }}>
            Open
          </Text>
          <Text style={{ fontSize: 26, fontWeight: "700", color: ink.bone, fontVariant: ["tabular-nums"] }}>
            {String(openPicks)}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 10, letterSpacing: 1.4, color: ink.mist, textTransform: "uppercase" }}>
            Gated
          </Text>
          <Text style={{ fontSize: 26, fontWeight: "700", color: ink.fog, fontVariant: ["tabular-nums"] }}>
            {String(gatedToday)}
          </Text>
        </View>
      </View>

      {/* The freshness line is not optional. A Live Activity without one is a
          number with no age, which is the thing this product refuses to print. */}
      <Text style={{ fontSize: 11, color: ink.mist }}>
        {`Refreshed ${ageLabel(lastRefresh)} ago`}
      </Text>

      {/* "We detect. You decide." is inside the 220-character ActivityKit payload
          budget along with the rest, and it is the one line of brand copy that
          fits a lock screen without becoming a slogan. */}
      <Text style={{ fontSize: 10, color: ember.base, letterSpacing: 0.4 }}>
        {"We detect. You decide."}
      </Text>
    </View>
  );
}

/**
 * The colours a Live Activity may use, exported so a reviewer can see the
 * surface cannot reach a price-or-signal tone by accident.
 */
export const ACTIVITY_COLOURS = {
  ground: environment.carbon,
  ink: ink.bone,
  meta: ink.mist,
  wayfind: iris.base,
  accent: ember.base,
  verify: semantic.verify,
} as const;
