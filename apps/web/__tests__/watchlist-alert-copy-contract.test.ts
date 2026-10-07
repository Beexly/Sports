import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Watchlist alert copy ↔ capability contract (source-level).
 *
 * The bug this pins: the /watchlist alerts banner promised Elite members
 * alerts "when a followed team's **or player's** pick grades", but the
 * outbox expansion that materializes recipients matches only
 * `entityType: "TEAM"`. A PLAYER-follower never even enters the recipient
 * set, so not one row records the omission — the failure was completely
 * silent, against paid copy.
 *
 * Widening the query is NOT a small, safe change: a Pick belongs to a Game
 * and carries no player reference at all (pick types are SPREAD / MONEYLINE
 * / TOTAL — there are no player props in the schema), and `Player` has no
 * relation to `Game` or `Pick`. The only available bridge is
 * `Player.recentTeam`, a nullable, denormalized, NFL-only team abbreviation
 * — joining on it would announce "your player's pick graded" for a
 * game-level pick the player has no stake in. That is a fabricated
 * association (CLAUDE.md rule #2), so the honest fix is the copy.
 *
 * This test keeps the two in lockstep: if someone genuinely wires player
 * entities into expansion, they must revisit the copy here deliberately.
 */
const repoRoot = resolve(__dirname, "..");
const page = readFileSync(resolve(repoRoot, "app/watchlist/page.tsx"), "utf8");
const worker = readFileSync(resolve(repoRoot, "lib/settlement-outbox/worker.ts"), "utf8");

/** Strips JSX/block comments and whole-line `//` comments so the assertions
 *  below read the COPY, not the commentary about the copy. (Without this the
 *  "never says player" assertion trips on the explanatory comment inside
 *  AlertsBanner, which is a false positive: a comment ships to nobody.) The
 *  `//` rule is anchored to line-leading whitespace so it can never eat the
 *  `//` in a URL. */
function stripComments(source: string): string {
  return source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function alertsBannerSource(): string {
  const start = page.indexOf("function AlertsBanner");
  const end = page.indexOf("function EmptyState");
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return stripComments(page.slice(start, end));
}

describe("watchlist alert copy ↔ capability", () => {
  it("the alerts banner never promises player alerts, but still describes the product it DOES deliver", () => {
    const banner = alertsBannerSource();
    // The promise the outbox cannot keep.
    expect(banner).not.toMatch(/player/i);
    // ...trimmed without gutting the real Elite pitch.
    expect(banner).toMatch(/Elite/);
    expect(banner).toMatch(/push/i);
    expect(banner).toMatch(/team/i);
  });

  it("expansion matches only TEAM follows, and documents that limit where the query lives", () => {
    const queryAt = worker.search(/entityType:\s*"TEAM"/);
    expect(queryAt).toBeGreaterThan(-1);
    // The next reader must find the reason AT the query, not re-derive it
    // from the schema and re-introduce the copy promise. Scoped to the text
    // immediately preceding the query so a stray "PLAYER" elsewhere in the
    // module cannot satisfy this.
    const precedingContext = worker.slice(Math.max(0, queryAt - 1500), queryAt);
    expect(precedingContext).toMatch(/PLAYER/);
  });
});
