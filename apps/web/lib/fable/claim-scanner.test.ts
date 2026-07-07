import { describe, expect, it } from "vitest";
import { scanUnsupportedFableClaims } from "./claim-scanner";

describe("FABLE unsupported claim scanner", () => {
  it("flags unsupported launch and evidence claims outside code spans", () => {
    const hits = scanUnsupportedFableClaims("The system is production-ready with AWS parity.");

    expect(hits.map((hit) => hit.phrase)).toEqual(["aws parity", "production-ready"]);
  });

  it("allows forbidden terms when quoted as literal policy examples", () => {
    const hits = scanUnsupportedFableClaims(
      "Do not write `production-ready` or `Ground Truth configured` unless evidence exists."
    );

    expect(hits).toHaveLength(0);
  });

  it("does not let an inflected word that merely contains a marker substring exempt a real claim", () => {
    // "historically" contains the substring "historical" but is not the whole-word
    // marker, so it must not suppress the co-located tout claims on the line.
    const hits = scanUnsupportedFableClaims("Members saw guaranteed .5+ gain historically.");

    expect(hits.map((hit) => hit.phrase)).toEqual([".5+ gain", "guaranteed"]);
  });

  it("still exempts a line carrying a genuine whole-word allowed-context marker", () => {
    const hits = scanUnsupportedFableClaims(
      "This is a historical example, but members were told they get guaranteed wins."
    );

    expect(hits).toHaveLength(0);
  });
});
