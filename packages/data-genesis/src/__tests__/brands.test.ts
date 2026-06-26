import { describe, it, expect } from "vitest";
import {
  isSignalId,
  isReceiptId,
  isDoubtId,
  isMetaDoubtId,
  isCurveId,
  isCalibrationTag,
  isPromotionId,
  toSignalId,
  toReceiptId,
  toDoubtId,
  toMetaDoubtId,
  toCurveId,
  toCalibrationTag,
  toPromotionId,
} from "../brands.js";

describe("branded ids — constructors prefix when needed and refuse empty input", () => {
  it("prefixes a raw value", () => {
    expect(toSignalId("abc")).toBe("signal:abc");
    expect(toReceiptId("h1")).toBe("receipt:h1");
    expect(toDoubtId("d")).toBe("doubt:d");
    expect(toMetaDoubtId("m")).toBe("meta:m");
    expect(toCurveId("c")).toBe("curve:c");
    expect(toCalibrationTag("k")).toBe("calibration:k");
    expect(toPromotionId("p")).toBe("promotion:p");
  });

  it("keeps an already-namespaced value", () => {
    expect(toSignalId("signal:abc")).toBe("signal:abc");
    expect(toReceiptId("receipt:h1")).toBe("receipt:h1");
  });

  it("rejects empty / whitespace input", () => {
    expect(() => toSignalId("")).toThrow();
    expect(() => toSignalId("   ")).toThrow();
    expect(() => toReceiptId("")).toThrow();
  });

  it("rejects an empty suffix", () => {
    expect(() => toSignalId("signal:")).toThrow();
    expect(() => toSignalId("signal:   ")).toThrow();
  });
});

describe("branded ids — validators", () => {
  it("accept well-formed ids", () => {
    expect(isSignalId("signal:x")).toBe(true);
    expect(isReceiptId("receipt:x")).toBe(true);
    expect(isDoubtId("doubt:x")).toBe(true);
    expect(isMetaDoubtId("meta:x")).toBe(true);
    expect(isCurveId("curve:x")).toBe(true);
    expect(isCalibrationTag("calibration:x")).toBe(true);
    expect(isPromotionId("promotion:x")).toBe(true);
  });

  it("reject malformed ids", () => {
    expect(isSignalId("abc")).toBe(false); // no namespace
    expect(isSignalId("signal:")).toBe(false); // empty suffix
    expect(isSignalId("signal: ")).toBe(false); // whitespace suffix
    expect(isSignalId("receipt:x")).toBe(false); // wrong namespace
    expect(isReceiptId("signal:x")).toBe(false);
  });
});
