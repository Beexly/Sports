/**
 * THE SIXTH-LEDGER CONSERVATION THEOREM — the Public Observer Ledger, machine-checked.
 *
 * The five ledgers (Reality, Belief, Decision, Authority, Learning) are governed by the authority
 * lattice and the Meaning Compiler. The sixth ledger — the Public Observer — must live in that SAME
 * lawful universe, with no escape hatch. This proves it:
 *
 *   T1  Containment      — every public-observer record compiles to INFO_ONLY (fixtures bind at FIXTURE).
 *   T2  No settlement     — canSettle is false, structurally and via publicObserverCanSettle(), always.
 *   T3  Bounded ceiling   — the intrinsic ceiling never exceeds WATCH.
 *   T4  Keystone          — the cap the compiler records IS composeAuthority's meet (no parallel system).
 *   T5  Chronos inertia   — lag can never imply an edge or create an action, for ANY clock arrangement.
 *   T6  Lag is arithmetic — a present-clock lag equals the exact difference; a missing clock is null.
 *   T7  Stats are bounded — visibility/coverage/confidence stay in [0,1]; confidence is the exact blend.
 *
 * A sibling of authority-tensor.theorem.test and meaning-conservation.theorem.test. Deterministic — a
 * fixed grid + a combinatorial clock sweep, no randomness, no wall-clock.
 */

import { describe, it, expect } from "vitest";
import {
  buildPublicObserverRecord,
  publicObserverCanSettle,
  PUBLIC_OBSERVER_RIGHTS,
  type PublicObserverInput,
} from "../public-observer-ledger.js";
import { publicObserverToClaimObject } from "../meaning/morphology-adapters.js";
import { compileClaimObject } from "../meaning/meaning-compiler.js";
import { composeAuthority } from "../authority-vector.js";
import { rankOf } from "../decision-state-stat-contract.js";
import {
  computeChronosLags,
  googleVisibilityIndex,
  knowledgeGraphCoverage,
  serpSportsConfidence,
  type ChronosRecord,
} from "../public-consensus-lag.js";

function obs(over: Partial<PublicObserverInput> = {}): PublicObserverInput {
  return {
    observerId: "obs-x",
    sourceId: "serpapi-google-sports",
    providerName: "SerpApi Google Sports",
    query: "ecuador vs germany",
    engine: "google",
    capturedAtLabel: "fixture",
    subject: "a captured public display",
    resultType: "LIVE_GAME",
    rightsEnvelope: PUBLIC_OBSERVER_RIGHTS,
    ...over,
  };
}

// A deterministic grid spanning the kinds of public display a discovery system shows.
const GRID: ReadonlyArray<{ name: string; input: PublicObserverInput }> = [
  { name: "live-game", input: obs({ resultType: "LIVE_GAME", publicScore: "2 - 1", publicStatus: "59'" }) },
  { name: "spotlight+kgmids", input: obs({ resultType: "GAME_SPOTLIGHT", teams: ["Ecuador", "Germany"], kgmids: [{ entity: "Ecuador", entityType: "TEAM", kgmid: "/m/a" }, { entity: "Germany", entityType: "TEAM", kgmid: "/m/b" }] }) },
  { name: "standings", input: obs({ resultType: "STANDINGS", publicStandings: [{ team: "Rays", rank: 1, record: "40-20" }, { team: "Royals", rank: 2, record: "30-30" }] }) },
  { name: "athlete-stats", input: obs({ resultType: "ATHLETE_STATS", athletes: ["A. Valencia"] }) },
  { name: "highlight-carousel", input: obs({ resultType: "VIDEO_HIGHLIGHT_CAROUSEL", highlights: [{ highlightId: "h1", sourceUrl: "https://example.org/h", sourcePlatform: "google-sports", title: "goal", capturedAtLabel: "fixture", rightsStatus: "UNKNOWN" }] }) },
  { name: "empty-other", input: obs({ resultType: "OTHER" }) },
  { name: "review-rights", input: obs({ rightsEnvelope: { ...PUBLIC_OBSERVER_RIGHTS, reviewStatus: "REVIEWED", reviewedAtLabel: "fixture" } }) },
];

describe("T1–T4 — the public observer lives under the authority law", () => {
  for (const { name, input } of GRID) {
    it(`${name}: cannot settle, ceiling ≤ WATCH, compiles to INFO_ONLY, cap = composeAuthority's meet`, () => {
      const record = buildPublicObserverRecord(input);

      // T2 — no settlement, structurally and via the exposed guarantee.
      expect(record.canSettle).toBe(false);
      expect(publicObserverCanSettle(record)).toBe(false);
      expect(record.authorityImpact).toBe("PUBLIC_OBSERVER_ONLY");

      // T3 — bounded ceiling.
      expect(rankOf(record.authorityCeiling)).toBeLessThanOrEqual(rankOf("WATCH"));

      const claimInput = publicObserverToClaimObject(record);
      const c = compileClaimObject(claimInput);
      const meet = composeAuthority(claimInput.authorityVector).ceiling;

      // T1 — containment: a public observer on fixture data can only ever mean INFO_ONLY.
      expect(c.publicExpression).toBe("INFO_ONLY");
      expect(meet).toBe("INFO_ONLY");
      expect(c.objectType).toBe("PUBLIC_OBSERVER_RESULT");
      // suppresses action by construction — it is discovery/latency, never a trigger.
      expect(c.decision.suppressesAction).toBe(true);

      // T4 — the keystone: every authority cap the compiler recorded IS the engine's meet, not a
      // bespoke public-observer downgrade. The sixth ledger composes composeAuthority; it does not fork it.
      for (const d of c.explain.downgrades) {
        if (d.engine === "composeAuthority") expect(d.cappedTo).toBe(meet);
      }
    });
  }

  it("every compiled public-observer claim is fixture-watermarked and never publicSafe", () => {
    for (const { input } of GRID) {
      const c = compileClaimObject(publicObserverToClaimObject(buildPublicObserverRecord(input)));
      expect(c.fixtureWatermarked).toBe(true);
      expect(c.publicSafe).toBe(false);
    }
  });
});

describe("T5–T6 — Chronos inertia: lag is a clock fact, never a signal", () => {
  const CLOCKS: ReadonlyArray<number | null> = [null, 0, 100, 250, 3300];

  it("for ANY arrangement of public/source clocks, lag can never imply an edge or create an action", () => {
    let checked = 0;
    for (const pub of CLOCKS) {
      for (const src of CLOCKS) {
        const c: ChronosRecord = {
          eventId: "e",
          eventClockSec: 3300,
          sourceClockSec: src,
          marketClockSec: 3304,
          publicObserverClockSec: pub,
          gseClockSec: 3314,
        };
        const r = computeChronosLags(c);
        // T5 — never actionable, regardless of the numbers.
        expect(r.canImplyEdge).toBe(false);
        expect(r.canCreateAction).toBe(false);
        // T6 — lag is exact arithmetic, and a missing clock is null (never a fabricated 0).
        if (pub == null || src == null) {
          expect(r.publicConsensusLag).toBeNull();
          expect(r.publicVsOfficialLag).toBeNull();
        } else {
          expect(r.publicConsensusLag).toBe(pub - src);
          expect(r.publicVsOfficialLag).toBe(pub - src);
        }
        checked++;
      }
    }
    expect(checked).toBe(CLOCKS.length * CLOCKS.length);
  });

  it("each clock propagates null independently — no lag is invented from a missing measurement", () => {
    const allNull: ChronosRecord = {
      eventId: "e", eventClockSec: null, sourceClockSec: null, marketClockSec: null,
      publicObserverClockSec: null, gseClockSec: null,
    };
    const r = computeChronosLags(allNull);
    for (const v of [r.publicConsensusLag, r.publicScoreboardDelay, r.publicVsMarketLag, r.publicVsOfficialLag, r.marketVsOfficialLag, r.gseVsPublicLag]) {
      expect(v).toBeNull();
    }
  });
});

describe("T7 — visibility statistics are bounded and reproducible (no hidden weighting)", () => {
  for (const { name, input } of GRID) {
    it(`${name}: visibility/coverage/confidence ∈ [0,1] and confidence is the exact declared blend`, () => {
      const record = buildPublicObserverRecord(input);
      const vis = googleVisibilityIndex(record);
      const kg = knowledgeGraphCoverage(record);
      const conf = serpSportsConfidence(record);
      for (const v of [vis, kg, conf]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      // The confidence engine owns no hidden math — it is exactly the documented 0.6/0.4 blend, rounded.
      expect(conf).toBe(Math.round((vis * 0.6 + kg * 0.4) * 1000) / 1000);
    });
  }
});
