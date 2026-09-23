import { describe, expect, it } from "vitest";

import {
  ENABLED,
  dynamoHomeEdge,
  meetsDynamoGate,
  mseVsBaseline,
  rawBaseline,
} from "@/lib/calibration/2506-11399v1-dynamo-home-advantage";

describe("DYNAMO non-stationary home advantage", () => {
  it("is disabled by default", () => {
    expect(ENABLED).toBe(false);
  });

  it("tracks a drifting home edge", () => {
    // True home edge ramps from 0 to 1.0 xP over the sample.
    let s = 7;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const drives = [];
    for (let t = 0; t < 2000; t++) {
      const isHome = (t % 2) as 0 | 1;
      const trueEdge = (t / 2000) * 1.0;
      drives.push({ t, isHome, xp: 2.0 + isHome * trueEdge + (rnd() - 0.5) * 4 });
    }
    const { edgeSeries, predicted } = dynamoHomeEdge(drives, 0.995);
    expect(edgeSeries.length).toBe(2000);
    // Late estimate should exceed the early estimate (it tracked the drift).
    expect(edgeSeries[1999]).toBeGreaterThan(edgeSeries[200]);
    expect(predicted).toBeGreaterThan(0.3);
  });

  it("beats the raw baseline when the edge is non-stationary", () => {
    let s = 8;
    const rnd = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    const drives = [];
    for (let t = 0; t < 1200; t++) {
      const isHome = (t % 2) as 0 | 1;
      const regime = t < 600 ? 0.2 : 1.2; // structural break
      drives.push({ t, isHome, xp: 2.0 + isHome * regime + (rnd() - 0.5) * 3 });
    }
    const train = drives.slice(0, 1000);
    const test = drives.slice(1000);
    const { predicted } = dynamoHomeEdge(train, 0.99);
    const mu = train.reduce((a, d) => a + d.xp, 0) / train.length;
    const dynamoPred = test.map((d) => mu + predicted * d.isHome);
    const { relativeImprovement } = mseVsBaseline(test, dynamoPred, rawBaseline(test));
    expect(relativeImprovement).toBeGreaterThan(0);
    expect(meetsDynamoGate(0.12)).toBe(true);
    expect(meetsDynamoGate(0.05)).toBe(false);
  });
});
