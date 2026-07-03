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
});
