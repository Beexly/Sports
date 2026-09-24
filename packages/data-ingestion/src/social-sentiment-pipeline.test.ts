/**
 * Tests for ./social-sentiment-pipeline (arXiv:2204.10185v1, lane=nlp).
 *
 * ACCEPTANCE GATE: ADAPT into the projection pipeline iff the locked 2025 evaluation shows |r| >= 0.10 with the
 * correct sign and the indicator adds RMSE improvement in a bivariate blend; REJECT if out-of-
 * sample |r| < 0.05 (signal was selection artifact).
 */

import { describe, expect, it } from "vitest";
import * as mod from "./social-sentiment-pipeline";

describe("social sentiment pipeline (arXiv:2204.10185v1)", () => {
  const now = new Date().toISOString();
  const posts = [
    { postId: "1", team: "KC", postedAt: now, text: "bullish breakout win for KC, strong offense" },
    { postId: "2", team: "KC", postedAt: now, text: "weak defense, bearish on KC today" },
    { postId: "3", team: "BUF", postedAt: now, text: "bullish moon" },
  ];
  it("lexicon scores", () => {
    expect(mod.lexiconScore("bullish moon breakout")!).toBeGreaterThan(0.5);
    expect(mod.lexiconScore("bearish crash weak")!).toBeLessThan(-0.5);
    expect(mod.lexiconScore("")!).toBeNull();
    expect(mod.lexiconScore("hello world")).toBe(0);
  });
  it("team sentiment aggregates the window", () => {
    const s = mod.teamSentiment(posts, "KC", new Date(Date.now() - 86400000).toISOString(), new Date(Date.now() + 86400000).toISOString());
    expect(s.n).toBe(2);
    expect(s.mean).not.toBeNull();
    const none = mod.teamSentiment(posts, "DAL", new Date(Date.now() - 86400000).toISOString(), new Date(Date.now() + 86400000).toISOString());
    expect(none.n).toBe(0);
    expect(none.mean).toBeNull();
  });
  it("term salience", () => {
    expect(mod.termSalience(100, 40, 10000, 500)!).toBeGreaterThan(0);
    expect(mod.termSalience(0, 0, 100, 10)).toBeNull();
  });
  it("isSocialPost rejects malformed", () => {
    expect(mod.isSocialPost({ postId: "1" })).toBe(false);
  });
});
