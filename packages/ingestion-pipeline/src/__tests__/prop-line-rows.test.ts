import { describe, expect, it } from "vitest";
import {
  decodePropMarket,
  encodePropMarket,
  slugPlayer,
  toPropLineSnapshotRows,
} from "../prop-line-rows.js";

describe("slugPlayer", () => {
  it("collides A.J. Brown and AJ Brown", () => {
    expect(slugPlayer("A.J. Brown")).toBe(slugPlayer("AJ Brown"));
    expect(slugPlayer("A.J. Brown")).toBe(slugPlayer("Aj Brown"));
  });

  it("produces a single slug for Ja'Marr Chase", () => {
    expect(slugPlayer("Ja'Marr Chase")).toBe("jamarr_chase");
  });

  it("drops generational suffixes jr/sr/ii/iii/iv", () => {
    expect(slugPlayer("Justin Jefferson Jr.")).toBe("justin_jefferson");
    expect(slugPlayer("Aaron Donald Sr.")).toBe("aaron_donald");
    expect(slugPlayer("Joe Mixon II")).toBe("joe_mixon");
    expect(slugPlayer("Trent Williams III")).toBe("trent_williams");
    expect(slugPlayer("Davante Adams IV")).toBe("davante_adams");
  });

  it("strips diacritics via NFD", () => {
    expect(slugPlayer("José Peréz")).toBe("jose_perez");
  });
});

describe("encode / decode", () => {
  it("puts the player in market so OPEN is per player-prop", () => {
    expect(encodePropMarket("player_receptions", "Justin Jefferson")).toBe(
      "player_receptions|justin_jefferson",
    );
    expect(decodePropMarket("player_receptions|justin_jefferson")).toEqual({
      marketKey: "player_receptions",
      playerSlug: "justin_jefferson",
    });
  });

  it("refuses empty names and keys that already contain the separator", () => {
    expect(encodePropMarket("player_receptions", "   ")).toBeNull();
    expect(encodePropMarket("player|receptions", "X")).toBeNull();
    expect(decodePropMarket("SPREAD")).toBeNull();
  });
});

describe("toPropLineSnapshotRows", () => {
  it("flattens two-way receptions and skips featured h2h", () => {
    const rows = toPropLineSnapshotRows({
      id: "evt1",
      bookmakers: [
        {
          key: "draftkings",
          markets: [
            {
              key: "h2h",
              outcomes: [{ name: "Home", price: -120 }],
            },
            {
              key: "player_receptions",
              outcomes: [
                { name: "Over", description: "Justin Jefferson", price: -115, point: 6.5 },
                { name: "Under", description: "Justin Jefferson", price: -105, point: 6.5 },
              ],
            },
          ],
        },
      ],
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.side).sort()).toEqual(["over", "under"]);
    expect(rows[0]?.market).toBe("player_receptions|justin_jefferson");
    expect(rows[0]?.book).toBe("draftkings");
    expect(rows.find((r) => r.side === "over")?.line).toBe(6.5);
    expect(rows.find((r) => r.side === "over")?.price).toBe(-115);
  });

  it("stores one-sided quotes without inventing the other side", () => {
    const rows = toPropLineSnapshotRows({
      bookmakers: [
        {
          key: "fanduel",
          markets: [
            {
              key: "player_receptions",
              outcomes: [{ name: "Over", description: "A.J. Brown", price: -110, point: 5.5 }],
            },
          ],
        },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.side).toBe("over");
    expect(rows[0]?.market).toBe("player_receptions|aj_brown");
  });

  it("skips outcomes with no player description", () => {
    const rows = toPropLineSnapshotRows({
      bookmakers: [
        {
          key: "betmgm",
          markets: [
            {
              key: "player_receptions",
              outcomes: [{ name: "Over", price: -110, point: 4.5 }],
            },
          ],
        },
      ],
    });
    expect(rows).toEqual([]);
  });
});
