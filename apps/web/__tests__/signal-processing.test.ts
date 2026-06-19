/**
 * Tests for signal-processing utilities.
 * Covers: SMA, EMA, WMA, Kalman, convolve, crossCorrelation,
 * autocorrelation, linearTrend, detrend, detectChangePoints,
 * findPeaks, gaussianSmooth, medianFilter, savitzkyGolay,
 * dftMagnitudes, dominantFrequency, rollingStdDev, rollingZScore, ewma,
 * complex arithmetic, FFT roundtrip, IIR filters (Butterworth),
 * Kalman filter (new interface), window functions, signal statistics,
 * sports time-series functions.
 */

import { describe, it, expect } from "vitest";
import {
  // Complex arithmetic
  complex,
  complexAdd,
  complexSub,
  complexMul,
  complexDiv,
  complexAbs,
  complexArg,
  complexConj,
  complexExp,
  complexPolar,
  // FFT
  fft,
  ifft,
  zeroPadToNextPowerOf2,
  nextPowerOf2,
  fftMagnitude,
  fftPhase,
  fftFrequencies,
  spectralPeaks,
  // Convolution / correlation
  convolve,
  correlate,
  autocorrelate,
  fftConvolve,
  // FIR filters
  firFilter,
  movingAverage,
  weightedMovingAverage,
  exponentialMovingAverage,
  gaussianKernel,
  gaussianSmooth,
  hammingWindow,
  hannWindow,
  blackmanWindow,
  applyWindow,
  // IIR filters
  iirFilter,
  butterworthLowpass,
  butterworthHighpass,
  // Kalman filter (new interface)
  kalmanPredict,
  kalmanUpdate,
  kalmanFilter,
  // Signal statistics
  signalEnergy,
  signalPower,
  snrDb,
  zeroCrossingRate,
  rms,
  signalMean,
  signalVariance,
  signalStd,
  normalize,
  detrend,
  // Sports time-series
  smoothOddsTimeSeries,
  detectLineMovementSpikes,
  oddsVelocity,
  oddsAcceleration,
  performanceCycle,
  streakDetection,
  // Legacy
  simpleMovingAverage,
  kalmansmoother,
  crossCorrelation,
  autocorrelation,
  linearTrend,
  detectChangePoints,
  findPeaks,
  dftMagnitudes,
  dominantFrequency,
  rollingStdDev,
  rollingZScore,
  ewma,
  medianFilter,
  savitzkyGolay,
} from "@/lib/math/signal-processing";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const closeToArr = (arr: number[], expected: number[], tol = 1e-6) => {
  expect(arr).toHaveLength(expected.length);
  arr.forEach((v, i) => {
    if (isNaN(expected[i]!)) {
      expect(isNaN(v)).toBe(true);
    } else {
      expect(v).toBeCloseTo(expected[i]!, 5);
    }
  });
};

// ─── Complex arithmetic ───────────────────────────────────────────────────────

describe("complex", () => {
  it("creates complex with re and im", () => {
    const c = complex(3, 4);
    expect(c.re).toBe(3);
    expect(c.im).toBe(4);
  });

  it("im defaults to 0", () => {
    const c = complex(5);
    expect(c.re).toBe(5);
    expect(c.im).toBe(0);
  });
});

describe("complexAdd", () => {
  it("adds two complex numbers", () => {
    const r = complexAdd({ re: 1, im: 2 }, { re: 3, im: 4 });
    expect(r.re).toBeCloseTo(4, 5);
    expect(r.im).toBeCloseTo(6, 5);
  });

  it("adding zero complex leaves unchanged", () => {
    const a = { re: 7, im: -3 };
    const r = complexAdd(a, { re: 0, im: 0 });
    expect(r.re).toBe(7);
    expect(r.im).toBe(-3);
  });
});

describe("complexSub", () => {
  it("subtracts two complex numbers", () => {
    const r = complexSub({ re: 5, im: 3 }, { re: 2, im: 1 });
    expect(r.re).toBeCloseTo(3, 5);
    expect(r.im).toBeCloseTo(2, 5);
  });

  it("self-subtraction gives zero", () => {
    const a = { re: 4, im: 7 };
    const r = complexSub(a, a);
    expect(r.re).toBeCloseTo(0, 10);
    expect(r.im).toBeCloseTo(0, 10);
  });
});

describe("complexMul", () => {
  it("(1+i)*(1-i) = 2", () => {
    const r = complexMul({ re: 1, im: 1 }, { re: 1, im: -1 });
    expect(r.re).toBeCloseTo(2, 5);
    expect(r.im).toBeCloseTo(0, 5);
  });

  it("(2+3i)*(4+5i) = -7+22i", () => {
    const r = complexMul({ re: 2, im: 3 }, { re: 4, im: 5 });
    expect(r.re).toBeCloseTo(-7, 5);
    expect(r.im).toBeCloseTo(22, 5);
  });

  it("multiplying by 1+0i returns same", () => {
    const a = { re: 5, im: -2 };
    const r = complexMul(a, { re: 1, im: 0 });
    expect(r.re).toBeCloseTo(5, 5);
    expect(r.im).toBeCloseTo(-2, 5);
  });
});

describe("complexDiv", () => {
  it("(4+2i)/(2+0i) = 2+i", () => {
    const r = complexDiv({ re: 4, im: 2 }, { re: 2, im: 0 });
    expect(r.re).toBeCloseTo(2, 5);
    expect(r.im).toBeCloseTo(1, 5);
  });

  it("divide by zero gives NaN", () => {
    const r = complexDiv({ re: 1, im: 1 }, { re: 0, im: 0 });
    expect(isNaN(r.re)).toBe(true);
  });

  it("(1+i)/(1+i) = 1", () => {
    const a = { re: 1, im: 1 };
    const r = complexDiv(a, a);
    expect(r.re).toBeCloseTo(1, 5);
    expect(r.im).toBeCloseTo(0, 5);
  });
});

describe("complexAbs", () => {
  it("|3+4i| = 5", () => {
    expect(complexAbs({ re: 3, im: 4 })).toBeCloseTo(5, 5);
  });

  it("|0| = 0", () => {
    expect(complexAbs({ re: 0, im: 0 })).toBeCloseTo(0, 5);
  });

  it("|1+0i| = 1", () => {
    expect(complexAbs({ re: 1, im: 0 })).toBeCloseTo(1, 5);
  });
});

describe("complexArg", () => {
  it("arg(1+0i) = 0", () => {
    expect(complexArg({ re: 1, im: 0 })).toBeCloseTo(0, 5);
  });

  it("arg(0+i) = π/2", () => {
    expect(complexArg({ re: 0, im: 1 })).toBeCloseTo(Math.PI / 2, 5);
  });

  it("arg(-1+0i) = π", () => {
    expect(complexArg({ re: -1, im: 0 })).toBeCloseTo(Math.PI, 5);
  });
});

describe("complexConj", () => {
  it("conj(3+4i) = 3-4i", () => {
    const r = complexConj({ re: 3, im: 4 });
    expect(r.re).toBeCloseTo(3, 5);
    expect(r.im).toBeCloseTo(-4, 5);
  });

  it("conj(conj(c)) = c", () => {
    const c = { re: 2, im: -5 };
    const r = complexConj(complexConj(c));
    expect(r.re).toBeCloseTo(c.re, 5);
    expect(r.im).toBeCloseTo(c.im, 5);
  });
});

describe("complexExp", () => {
  it("e^0 = 1", () => {
    const r = complexExp({ re: 0, im: 0 });
    expect(r.re).toBeCloseTo(1, 5);
    expect(r.im).toBeCloseTo(0, 5);
  });

  it("e^(iπ) ≈ -1 (Euler)", () => {
    const r = complexExp({ re: 0, im: Math.PI });
    expect(r.re).toBeCloseTo(-1, 5);
    expect(r.im).toBeCloseTo(0, 5);
  });

  it("e^(1+0i) = e", () => {
    const r = complexExp({ re: 1, im: 0 });
    expect(r.re).toBeCloseTo(Math.E, 5);
    expect(r.im).toBeCloseTo(0, 5);
  });
});

describe("complexPolar", () => {
  it("polar(1, 0) = 1+0i", () => {
    const r = complexPolar(1, 0);
    expect(r.re).toBeCloseTo(1, 5);
    expect(r.im).toBeCloseTo(0, 5);
  });

  it("polar(2, π/2) ≈ 0+2i", () => {
    const r = complexPolar(2, Math.PI / 2);
    expect(r.re).toBeCloseTo(0, 5);
    expect(r.im).toBeCloseTo(2, 5);
  });

  it("abs(polar(r,θ)) = r", () => {
    const r = complexPolar(5, 1.3);
    expect(complexAbs(r)).toBeCloseTo(5, 5);
  });
});

// ─── FFT ─────────────────────────────────────────────────────────────────────

describe("nextPowerOf2", () => {
  it("nextPowerOf2(1) = 1", () => expect(nextPowerOf2(1)).toBe(1));
  it("nextPowerOf2(2) = 2", () => expect(nextPowerOf2(2)).toBe(2));
  it("nextPowerOf2(3) = 4", () => expect(nextPowerOf2(3)).toBe(4));
  it("nextPowerOf2(8) = 8", () => expect(nextPowerOf2(8)).toBe(8));
  it("nextPowerOf2(9) = 16", () => expect(nextPowerOf2(9)).toBe(16));
  it("nextPowerOf2(0) = 1", () => expect(nextPowerOf2(0)).toBe(1));
});

describe("zeroPadToNextPowerOf2", () => {
  it("already power-of-2 returns copy", () => {
    const s = [1, 2, 3, 4];
    const r = zeroPadToNextPowerOf2(s);
    expect(r).toHaveLength(4);
    closeToArr(r, s);
  });

  it("pads [1,2,3] to length 4", () => {
    const r = zeroPadToNextPowerOf2([1, 2, 3]);
    expect(r).toHaveLength(4);
    expect(r[3]).toBe(0);
  });
});

describe("fft and ifft roundtrip", () => {
  it("ifft(fft(signal)) ≈ signal for power-of-2 length", () => {
    const signal = [1, 2, 3, 4, 5, 6, 7, 8];
    const spectrum = fft(signal);
    const recovered = ifft(spectrum);
    signal.forEach((v, i) => {
      expect(recovered[i]!.re).toBeCloseTo(v, 4);
      expect(recovered[i]!.im).toBeCloseTo(0, 4);
    });
  });

  it("fft of constant [C,C,...] has DC term = N*C and rest ≈ 0", () => {
    const N = 8;
    const C = 3;
    const signal = new Array(N).fill(C);
    const spectrum = fft(signal);
    expect(complexAbs(spectrum[0]!)).toBeCloseTo(N * C, 4);
    for (let k = 1; k < N; k++) {
      expect(complexAbs(spectrum[k]!)).toBeCloseTo(0, 4);
    }
  });

  it("fft length is next power of 2 of input", () => {
    const signal = [1, 2, 3, 4, 5]; // length 5 -> padded to 8
    const spectrum = fft(signal);
    expect(spectrum).toHaveLength(8);
  });

  it("fft of [1,0,0,0] is all ones (real parts)", () => {
    const spectrum = fft([1, 0, 0, 0]);
    spectrum.forEach((c) => {
      expect(c.re).toBeCloseTo(1, 5);
      expect(c.im).toBeCloseTo(0, 5);
    });
  });
});

describe("fftMagnitude", () => {
  it("magnitudes are non-negative", () => {
    const spectrum = fft([1, -2, 3, -4]);
    fftMagnitude(spectrum).forEach((m) => expect(m).toBeGreaterThanOrEqual(0));
  });

  it("magnitude of [1,0,0,0] is all 1s", () => {
    const spectrum = fft([1, 0, 0, 0]);
    fftMagnitude(spectrum).forEach((m) => expect(m).toBeCloseTo(1, 5));
  });
});

describe("fftPhase", () => {
  it("returns array same length as spectrum", () => {
    const spectrum = fft([1, 2, 3, 4]);
    expect(fftPhase(spectrum)).toHaveLength(spectrum.length);
  });

  it("phase of real positive DC is 0", () => {
    const spectrum = fft([1, 1, 1, 1]);
    expect(fftPhase(spectrum)[0]).toBeCloseTo(0, 5);
  });
});

describe("fftFrequencies", () => {
  it("first bin is 0", () => {
    const freqs = fftFrequencies(8, 8);
    expect(freqs[0]).toBe(0);
  });

  it("bin k = k * sampleRate / N", () => {
    const freqs = fftFrequencies(8, 100);
    expect(freqs[1]).toBeCloseTo(12.5, 5);
    expect(freqs[2]).toBeCloseTo(25, 5);
  });

  it("returns N frequencies", () => {
    expect(fftFrequencies(16, 1)).toHaveLength(16);
  });
});

describe("spectralPeaks", () => {
  it("returns at most topN peaks", () => {
    const signal = new Array(16).fill(0).map((_, i) => Math.sin(2 * Math.PI * i / 4));
    const peaks = spectralPeaks(signal, 1, 3);
    expect(peaks.length).toBeLessThanOrEqual(3);
  });

  it("peaks have positive magnitudes", () => {
    const signal = new Array(8).fill(0).map((_, i) => Math.sin(2 * Math.PI * i / 4));
    const peaks = spectralPeaks(signal, 1);
    peaks.forEach((p) => expect(p.magnitude).toBeGreaterThan(0));
  });

  it("returns SpectralPeak shape", () => {
    const signal = [1, 2, 3, 4, 3, 2, 1, 0];
    const peaks = spectralPeaks(signal, 1);
    if (peaks.length > 0) {
      expect(typeof peaks[0]!.frequency).toBe("number");
      expect(typeof peaks[0]!.magnitude).toBe("number");
      expect(typeof peaks[0]!.phase).toBe("number");
    }
  });
});

// ─── Convolution and correlation ──────────────────────────────────────────────

describe("convolve", () => {
  it("identity kernel [1] returns same signal", () => {
    const signal = [1, 2, 3, 4, 5];
    closeToArr(convolve(signal, [1]), signal);
  });

  it("[1,1] kernel gives cumulative sum shifted", () => {
    const result = convolve([1, 2, 3], [1, 1]);
    expect(result).toHaveLength(4);
    expect(result[0]).toBeCloseTo(1, 5);
    expect(result[1]).toBeCloseTo(3, 5);
    expect(result[2]).toBeCloseTo(5, 5);
    expect(result[3]).toBeCloseTo(3, 5);
  });

  it("output length is signal.length + kernel.length - 1", () => {
    const signal = [1, 2, 3, 4, 5];
    const kernel = [1, 0, -1];
    expect(convolve(signal, kernel)).toHaveLength(7);
  });

  it("[0.5, 0.5] averages adjacent pairs", () => {
    const result = convolve([2, 4, 6], [0.5, 0.5]);
    expect(result[1]).toBeCloseTo(3, 5);
    expect(result[2]).toBeCloseTo(5, 5);
  });

  it("single element signal and kernel", () => {
    const result = convolve([3], [4]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBeCloseTo(12, 5);
  });
});

describe("correlate", () => {
  it("output length = a.length + b.length - 1", () => {
    const a = [1, 2, 3];
    const b = [1, 2];
    expect(correlate(a, b)).toHaveLength(4);
  });

  it("correlate(a,a) has max at center", () => {
    const a = [1, 2, 3];
    const r = correlate(a, a);
    const center = a.length - 1;
    const maxVal = Math.max(...r);
    expect(r[center]).toBeCloseTo(maxVal, 5);
  });
});

describe("autocorrelate", () => {
  it("returns length 2*N-1", () => {
    const signal = [1, 2, 3, 4, 5];
    expect(autocorrelate(signal)).toHaveLength(9);
  });

  it("center value (lag=0) is 1.0 after normalization", () => {
    const signal = [1, 2, 3, 4, 5];
    const r = autocorrelate(signal);
    const center = signal.length - 1;
    expect(r[center]).toBeCloseTo(1.0, 5);
  });

  it("is symmetric", () => {
    const signal = [1, 2, 3, 2, 1];
    const r = autocorrelate(signal);
    for (let i = 0; i < r.length; i++) {
      expect(r[i]).toBeCloseTo(r[r.length - 1 - i]!, 5);
    }
  });
});

describe("fftConvolve", () => {
  it("produces same result as direct convolve", () => {
    const signal = [1, 2, 3, 4];
    const kernel = [1, -1, 1];
    const direct = convolve(signal, kernel);
    const fast = fftConvolve(signal, kernel);
    expect(fast).toHaveLength(direct.length);
    direct.forEach((v, i) => expect(fast[i]).toBeCloseTo(v, 3));
  });

  it("output length = signal.length + kernel.length - 1", () => {
    const r = fftConvolve([1, 2, 3, 4, 5], [1, 2]);
    expect(r).toHaveLength(6);
  });
});

// ─── FIR filters ─────────────────────────────────────────────────────────────

describe("firFilter", () => {
  it("identity kernel returns same signal", () => {
    const signal = [1, 2, 3, 4, 5];
    closeToArr(firFilter(signal, [1]), signal);
  });

  it("output same length as signal", () => {
    const signal = [1, 2, 3, 4, 5];
    expect(firFilter(signal, [0.5, 0.5])).toHaveLength(5);
  });

  it("[0.5,0.5] moving average blends adjacent", () => {
    const r = firFilter([0, 4, 0, 4, 0], [0.5, 0.5]);
    expect(r[1]).toBeCloseTo(2, 5);
  });
});

describe("movingAverage", () => {
  it("returns same length as input", () => {
    expect(movingAverage([1, 2, 3, 4, 5], 3)).toHaveLength(5);
  });

  it("center of a constant signal is constant", () => {
    const result = movingAverage([5, 5, 5, 5, 5], 3);
    result.forEach((v) => expect(v).toBeCloseTo(5, 5));
  });

  it("window=1 returns original", () => {
    const signal = [1, 2, 3, 4];
    closeToArr(movingAverage(signal, 1), signal);
  });
});

describe("gaussianKernel", () => {
  it("kernel sums to 1 (normalized)", () => {
    const k = gaussianKernel(7, 1.5);
    const sum = k.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it("kernel is symmetric", () => {
    const k = gaussianKernel(7, 1.5);
    for (let i = 0; i < Math.floor(k.length / 2); i++) {
      expect(k[i]).toBeCloseTo(k[k.length - 1 - i]!, 5);
    }
  });

  it("center is maximum", () => {
    const k = gaussianKernel(9, 2);
    const center = Math.floor(k.length / 2);
    k.forEach((v, i) => {
      if (i !== center) expect(v).toBeLessThanOrEqual(k[center]!);
    });
  });
});

describe("hammingWindow", () => {
  it("returns n elements", () => {
    expect(hammingWindow(8)).toHaveLength(8);
  });

  it("endpoints are near 0.08 (Hamming)", () => {
    const w = hammingWindow(8);
    expect(w[0]).toBeCloseTo(0.08, 2);
    expect(w[7]).toBeCloseTo(0.08, 2);
  });

  it("sum is approximately N/2", () => {
    const n = 16;
    const w = hammingWindow(n);
    const sum = w.reduce((a, b) => a + b, 0);
    // Hamming sum ≈ 0.54*N
    expect(sum).toBeGreaterThan(n * 0.4);
    expect(sum).toBeLessThan(n * 0.7);
  });
});

describe("hannWindow", () => {
  it("returns n elements", () => {
    expect(hannWindow(8)).toHaveLength(8);
  });

  it("endpoints are 0", () => {
    const w = hannWindow(8);
    expect(w[0]).toBeCloseTo(0, 5);
    expect(w[7]).toBeCloseTo(0, 5);
  });

  it("all values in [0,1]", () => {
    const w = hannWindow(16);
    w.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    });
  });
});

describe("blackmanWindow", () => {
  it("returns n elements", () => {
    expect(blackmanWindow(8)).toHaveLength(8);
  });

  it("endpoints near zero", () => {
    const w = blackmanWindow(8);
    expect(Math.abs(w[0]!)).toBeLessThan(1e-10);
    expect(Math.abs(w[7]!)).toBeLessThan(1e-10);
  });

  it("all values in [-0.1, 1]", () => {
    const w = blackmanWindow(16);
    w.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(-0.1);
      expect(v).toBeLessThanOrEqual(1);
    });
  });
});

describe("applyWindow", () => {
  it("zeroes out edges with hann window", () => {
    const signal = [1, 1, 1, 1, 1, 1, 1, 1];
    const result = applyWindow(signal, hannWindow);
    expect(result[0]).toBeCloseTo(0, 5);
    expect(result[7]).toBeCloseTo(0, 5);
  });

  it("returns same length as signal", () => {
    const signal = [1, 2, 3, 4, 5, 6];
    expect(applyWindow(signal, hammingWindow)).toHaveLength(6);
  });
});

// ─── IIR filters ─────────────────────────────────────────────────────────────

describe("iirFilter", () => {
  it("b=[1], a=[1] returns same signal", () => {
    const signal = [1, 2, 3, 4, 5];
    closeToArr(iirFilter(signal, [1], [1]), signal);
  });

  it("output same length as signal", () => {
    const signal = [1, 2, 3, 4, 5];
    expect(iirFilter(signal, [0.5, 0.5], [1, 0])).toHaveLength(5);
  });
});

describe("butterworthLowpass", () => {
  it("order 1 returns b and a of length 2", () => {
    const { b, a } = butterworthLowpass(1, 100, 1000);
    expect(b).toHaveLength(2);
    expect(a).toHaveLength(2);
  });

  it("order 2 returns b and a of length 3", () => {
    const { b, a } = butterworthLowpass(2, 100, 1000);
    expect(b).toHaveLength(3);
    expect(a).toHaveLength(3);
  });

  it("a[0] = 1 for order 1", () => {
    const { a } = butterworthLowpass(1, 100, 1000);
    expect(a[0]).toBeCloseTo(1, 5);
  });

  it("a[0] = 1 for order 2", () => {
    const { a } = butterworthLowpass(2, 100, 1000);
    expect(a[0]).toBeCloseTo(1, 5);
  });

  it("b coefficients sum to roughly 1 for very low cutoff (passes DC)", () => {
    // For a lowpass at very high cutoff (pass DC), b sum should be near 1
    const { b, a } = butterworthLowpass(1, 499, 1000);
    const bSum = b.reduce((s, v) => s + v, 0);
    const aSum = a.reduce((s, v) => s + v, 0);
    // Gain at DC = sum(b)/sum(a) should be ~1
    expect(bSum / aSum).toBeCloseTo(1, 0);
  });

  it("lowpass order 1 attenuates DC", () => {
    // Apply to DC signal, output should converge to input
    const { b, a } = butterworthLowpass(1, 200, 1000);
    const signal = new Array(50).fill(1);
    const filtered = iirFilter(signal, b, a);
    // After settling, output should be near 1
    expect(filtered[49]!).toBeCloseTo(1, 1);
  });
});

describe("butterworthHighpass", () => {
  it("order 1 returns b and a of length 2", () => {
    const { b, a } = butterworthHighpass(1, 100, 1000);
    expect(b).toHaveLength(2);
    expect(a).toHaveLength(2);
  });

  it("order 2 returns b and a of length 3", () => {
    const { b, a } = butterworthHighpass(2, 100, 1000);
    expect(b).toHaveLength(3);
    expect(a).toHaveLength(3);
  });

  it("a[0] = 1 for order 1", () => {
    const { a } = butterworthHighpass(1, 100, 1000);
    expect(a[0]).toBeCloseTo(1, 5);
  });

  it("a[0] = 1 for order 2", () => {
    const { a } = butterworthHighpass(2, 100, 1000);
    expect(a[0]).toBeCloseTo(1, 5);
  });

  it("highpass blocks DC: DC input gives near-zero output (settled)", () => {
    const { b, a } = butterworthHighpass(1, 100, 1000);
    const signal = new Array(100).fill(1);
    const filtered = iirFilter(signal, b, a);
    // After settling, DC response of highpass = 0
    expect(Math.abs(filtered[99]!)).toBeLessThan(0.1);
  });
});

// ─── Kalman filter (new interface) ───────────────────────────────────────────

describe("kalmanPredict", () => {
  it("estimate unchanged after predict", () => {
    const state = { estimate: 5, errorVariance: 1 };
    const predicted = kalmanPredict(state, 0.1);
    expect(predicted.estimate).toBeCloseTo(5, 5);
  });

  it("error variance increases by processNoise", () => {
    const state = { estimate: 0, errorVariance: 1 };
    const predicted = kalmanPredict(state, 0.5);
    expect(predicted.errorVariance).toBeCloseTo(1.5, 5);
  });
});

describe("kalmanUpdate", () => {
  it("measurement exactly equals estimate: no change", () => {
    const state = { estimate: 5, errorVariance: 1 };
    const updated = kalmanUpdate(state, 5, 1);
    expect(updated.estimate).toBeCloseTo(5, 5);
  });

  it("error variance decreases after update", () => {
    const state = { estimate: 0, errorVariance: 1 };
    const updated = kalmanUpdate(state, 1, 1);
    expect(updated.errorVariance).toBeLessThan(state.errorVariance);
  });

  it("update moves estimate toward measurement", () => {
    const state = { estimate: 0, errorVariance: 1 };
    const updated = kalmanUpdate(state, 10, 1);
    expect(updated.estimate).toBeGreaterThan(0);
    expect(updated.estimate).toBeLessThan(10);
  });
});

describe("kalmanFilter", () => {
  it("returns same length as measurements", () => {
    const m = [1, 2, 3, 4, 5];
    expect(kalmanFilter(m)).toHaveLength(5);
  });

  it("returns empty for empty input", () => {
    expect(kalmanFilter([])).toEqual([]);
  });

  it("smooths a noisy signal", () => {
    const noisy = [0, 10, 0, 10, 0, 10, 0, 10, 0, 10];
    const filtered = kalmanFilter(noisy, 0.01, 1.0);
    const noisyVar = noisy.reduce((s, v) => s + (v - 5) ** 2, 0) / noisy.length;
    const filteredMean = filtered.reduce((s, v) => s + v, 0) / filtered.length;
    const filteredVar = filtered.reduce((s, v) => s + (v - filteredMean) ** 2, 0) / filtered.length;
    expect(filteredVar).toBeLessThan(noisyVar);
  });

  it("constant signal stays approximately constant", () => {
    const signal = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
    const filtered = kalmanFilter(signal);
    filtered.forEach((v) => expect(v).toBeCloseTo(5, 3));
  });

  it("uses custom initialEstimate", () => {
    const m = [10, 10, 10];
    const filtered = kalmanFilter(m, 0.01, 1, 0);
    // Should converge toward 10 from initial 0
    expect(filtered[2]!).toBeGreaterThan(filtered[0]!);
  });
});

// ─── Signal statistics ────────────────────────────────────────────────────────

describe("signalEnergy", () => {
  it("sum of squares", () => {
    expect(signalEnergy([1, 2, 3])).toBeCloseTo(14, 5);
  });

  it("zeros have zero energy", () => {
    expect(signalEnergy([0, 0, 0])).toBeCloseTo(0, 5);
  });

  it("empty signal has zero energy", () => {
    expect(signalEnergy([])).toBe(0);
  });
});

describe("signalPower", () => {
  it("mean of squares", () => {
    expect(signalPower([1, 2, 3])).toBeCloseTo(14 / 3, 5);
  });

  it("empty returns 0", () => {
    expect(signalPower([])).toBe(0);
  });
});

describe("snrDb", () => {
  it("10dB for signal 10x noise energy", () => {
    const signal = [Math.sqrt(10)];
    const noise = [1];
    expect(snrDb(signal, noise)).toBeCloseTo(10, 3);
  });

  it("0dB when signal equals noise energy", () => {
    expect(snrDb([1], [1])).toBeCloseTo(0, 5);
  });

  it("Infinity when noise is zero", () => {
    expect(snrDb([1, 2], [0, 0])).toBe(Infinity);
  });
});

describe("zeroCrossingRate", () => {
  it("alternating signal has high ZCR", () => {
    const signal = [1, -1, 1, -1, 1, -1];
    expect(zeroCrossingRate(signal)).toBeCloseTo(1.0, 5);
  });

  it("constant positive has ZCR 0", () => {
    expect(zeroCrossingRate([1, 2, 3, 4])).toBeCloseTo(0, 5);
  });

  it("single element returns 0", () => {
    expect(zeroCrossingRate([5])).toBe(0);
  });
});

describe("rms", () => {
  it("rms([1,1,1,1]) = 1", () => {
    expect(rms([1, 1, 1, 1])).toBeCloseTo(1, 5);
  });

  it("rms([3,4]) = sqrt(25/2) ≈ 3.535", () => {
    expect(rms([3, 4])).toBeCloseTo(Math.sqrt(12.5), 5);
  });

  it("rms of zeros is 0", () => {
    expect(rms([0, 0, 0])).toBeCloseTo(0, 5);
  });
});

describe("signalMean", () => {
  it("mean of [1,2,3,4,5] = 3", () => {
    expect(signalMean([1, 2, 3, 4, 5])).toBeCloseTo(3, 5);
  });

  it("empty returns 0", () => {
    expect(signalMean([])).toBe(0);
  });
});

describe("signalVariance", () => {
  it("variance of [2,2,2] = 0", () => {
    expect(signalVariance([2, 2, 2])).toBeCloseTo(0, 5);
  });

  it("variance of [0,2] = 1", () => {
    expect(signalVariance([0, 2])).toBeCloseTo(1, 5);
  });
});

describe("signalStd", () => {
  it("std of constant is 0", () => {
    expect(signalStd([5, 5, 5])).toBeCloseTo(0, 5);
  });

  it("std >= 0 always", () => {
    expect(signalStd([1, -2, 3])).toBeGreaterThanOrEqual(0);
  });
});

describe("normalize", () => {
  it("max absolute value becomes 1", () => {
    const r = normalize([2, -4, 1, 3]);
    expect(Math.max(...r.map(Math.abs))).toBeCloseTo(1, 5);
  });

  it("zeros return zeros", () => {
    const r = normalize([0, 0, 0]);
    r.forEach((v) => expect(v).toBeCloseTo(0, 5));
  });

  it("returns same length", () => {
    expect(normalize([1, 2, 3])).toHaveLength(3);
  });

  it("empty returns empty", () => {
    expect(normalize([])).toHaveLength(0);
  });
});

describe("detrend", () => {
  it("detrended perfectly linear series is all ~0s", () => {
    const values = [1, 3, 5, 7, 9];
    const result = detrend(values);
    result.forEach((v) => expect(Math.abs(v)).toBeLessThan(1e-8));
  });

  it("returns same length as input", () => {
    expect(detrend([3, 1, 4, 1, 5])).toHaveLength(5);
  });

  it("detrending constant series leaves all values ~0", () => {
    const result = detrend([7, 7, 7, 7, 7]);
    result.forEach((v) => expect(Math.abs(v)).toBeLessThan(1e-8));
  });
});

// ─── Sports time-series ───────────────────────────────────────────────────────

describe("smoothOddsTimeSeries", () => {
  it("returns same length as input", () => {
    const odds = [100, 102, 105, 103, 108];
    expect(smoothOddsTimeSeries(odds)).toHaveLength(5);
  });

  it("first element equals first input", () => {
    const odds = [110, 112, 115];
    const result = smoothOddsTimeSeries(odds);
    expect(result[0]).toBeCloseTo(110, 5);
  });

  it("smaller alpha = more smoothing", () => {
    const odds = [100, 120, 100, 120, 100, 120, 100];
    const smooth01 = smoothOddsTimeSeries(odds, 0.1);
    const smooth09 = smoothOddsTimeSeries(odds, 0.9);
    const var01 = smooth01.reduce((s, v) => s + (v - 110) ** 2, 0);
    const var09 = smooth09.reduce((s, v) => s + (v - 110) ** 2, 0);
    expect(var01).toBeLessThan(var09);
  });
});

describe("detectLineMovementSpikes", () => {
  it("detects spike above threshold", () => {
    const odds = [100, 100, 100, 107, 100];
    const spikes = detectLineMovementSpikes(odds, 3.0);
    expect(spikes).toContain(3);
  });

  it("no spikes below threshold", () => {
    const odds = [100, 101, 102, 101, 100];
    const spikes = detectLineMovementSpikes(odds, 3.0);
    expect(spikes).toHaveLength(0);
  });

  it("returns indices", () => {
    const odds = [0, 0, 0, 10, 0];
    const spikes = detectLineMovementSpikes(odds, 3.0);
    expect(spikes.every((i) => typeof i === "number")).toBe(true);
  });
});

describe("oddsVelocity", () => {
  it("length = N-1", () => {
    const odds = [100, 102, 105, 103];
    expect(oddsVelocity(odds)).toHaveLength(3);
  });

  it("first difference is correct", () => {
    const odds = [100, 103, 101];
    const v = oddsVelocity(odds);
    expect(v[0]).toBeCloseTo(3, 5);
    expect(v[1]).toBeCloseTo(-2, 5);
  });

  it("empty input returns empty", () => {
    expect(oddsVelocity([])).toHaveLength(0);
  });
});

describe("oddsAcceleration", () => {
  it("length = N-2", () => {
    const odds = [100, 102, 105, 103, 100];
    expect(oddsAcceleration(odds)).toHaveLength(3);
  });

  it("constant velocity has zero acceleration", () => {
    const odds = [100, 102, 104, 106, 108];
    const a = oddsAcceleration(odds);
    a.forEach((v) => expect(Math.abs(v)).toBeLessThan(1e-10));
  });
});

describe("performanceCycle", () => {
  it("returns { dominant, confidence } shape", () => {
    const r = performanceCycle([1, 2, 3, 2, 1, 2, 3, 2]);
    expect(typeof r.dominant).toBe("number");
    expect(typeof r.confidence).toBe("number");
  });

  it("confidence >= 0", () => {
    const scores = [1, 0, 1, 0, 1, 0, 1, 0];
    const { confidence } = performanceCycle(scores);
    expect(confidence).toBeGreaterThanOrEqual(0);
  });

  it("period-2 oscillation detected", () => {
    const scores = [1, -1, 1, -1, 1, -1, 1, -1];
    const { dominant } = performanceCycle(scores);
    expect(dominant).toBeCloseTo(2, 0);
  });

  it("short signal returns without error", () => {
    expect(() => performanceCycle([1])).not.toThrow();
  });
});

describe("streakDetection", () => {
  it("detects single streak", () => {
    const wins: (0 | 1)[] = [0, 1, 1, 1, 0, 0];
    const { starts, lengths } = streakDetection(wins);
    expect(starts).toContain(1);
    expect(lengths[starts.indexOf(1)]).toBe(3);
  });

  it("detects multiple streaks", () => {
    const wins: (0 | 1)[] = [1, 1, 0, 1, 1, 1, 0];
    const { starts, lengths } = streakDetection(wins);
    expect(starts).toHaveLength(2);
    expect(lengths[0]).toBe(2);
    expect(lengths[1]).toBe(3);
  });

  it("no wins returns empty arrays", () => {
    const { starts, lengths } = streakDetection([0, 0, 0]);
    expect(starts).toHaveLength(0);
    expect(lengths).toHaveLength(0);
  });

  it("all wins is one streak", () => {
    const wins: (0 | 1)[] = [1, 1, 1, 1, 1];
    const { starts, lengths } = streakDetection(wins);
    expect(starts).toHaveLength(1);
    expect(lengths[0]).toBe(5);
  });

  it("starts and lengths have same length", () => {
    const wins: (0 | 1)[] = [1, 0, 1, 0, 1];
    const { starts, lengths } = streakDetection(wins);
    expect(starts).toHaveLength(lengths.length);
  });
});

// ─── Legacy: simpleMovingAverage ─────────────────────────────────────────────

describe("simpleMovingAverage", () => {
  it("basic window=3", () => {
    const result = simpleMovingAverage([1, 2, 3, 4, 5], 3);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
    expect(result[2]).toBeCloseTo(2, 5);
    expect(result[3]).toBeCloseTo(3, 5);
    expect(result[4]).toBeCloseTo(4, 5);
  });

  it("NaN prefix has length window-1", () => {
    const result = simpleMovingAverage([10, 20, 30, 40, 50], 4);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
    expect(isNaN(result[2]!)).toBe(true);
    expect(result[3]).toBeCloseTo(25, 5);
  });

  it("window=1 returns original values", () => {
    const values = [3, 1, 4, 1, 5, 9];
    const result = simpleMovingAverage(values, 1);
    closeToArr(result, values);
  });

  it("short array (length < window) all NaN", () => {
    const result = simpleMovingAverage([1, 2], 5);
    expect(result.every(isNaN)).toBe(true);
  });

  it("returns same length as input", () => {
    const input = [1, 2, 3, 4, 5, 6, 7];
    expect(simpleMovingAverage(input, 3)).toHaveLength(input.length);
  });

  it("window equals array length returns single value at end", () => {
    const result = simpleMovingAverage([2, 4, 6], 3);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
    expect(result[2]).toBeCloseTo(4, 5);
  });
});

// ─── Legacy: exponentialMovingAverage ────────────────────────────────────────

describe("exponentialMovingAverage", () => {
  it("alpha=1 is identity (equals input)", () => {
    const values = [5, 3, 8, 2, 7];
    closeToArr(exponentialMovingAverage(values, 1), values);
  });

  it("alpha=0.5 recursion check", () => {
    const values = [4, 8, 12];
    const result = exponentialMovingAverage(values, 0.5);
    expect(result[0]).toBeCloseTo(4, 5);
    expect(result[1]).toBeCloseTo(0.5 * 8 + 0.5 * 4, 5);
    expect(result[2]).toBeCloseTo(0.5 * 12 + 0.5 * 6, 5);
  });

  it("alpha close to 0 gives nearly constant output (slow decay)", () => {
    const values = [10, 20, 30, 40, 50];
    const result = exponentialMovingAverage(values, 0.01);
    expect(result[0]).toBeCloseTo(10, 5);
    expect(result[result.length - 1]!).toBeLessThan(15);
  });

  it("empty input returns empty", () => {
    expect(exponentialMovingAverage([], 0.5)).toEqual([]);
  });

  it("single element", () => {
    expect(exponentialMovingAverage([42], 0.5)).toEqual([42]);
  });
});

// ─── Legacy: weightedMovingAverage ───────────────────────────────────────────

describe("weightedMovingAverage", () => {
  it("basic weights [1,2,3] on [1,2,3,4,5]", () => {
    const result = weightedMovingAverage([1, 2, 3, 4, 5], [1, 2, 3]);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
    expect(result[2]).toBeCloseTo(14 / 6, 5);
    expect(result[3]).toBeCloseTo(20 / 6, 5);
  });

  it("uniform weights equal to SMA", () => {
    const values = [1, 2, 3, 4, 5];
    const wma = weightedMovingAverage(values, [1, 1, 1]);
    const sma = simpleMovingAverage(values, 3);
    for (let i = 2; i < values.length; i++) {
      expect(wma[i]).toBeCloseTo(sma[i]!, 5);
    }
  });

  it("single weight [1] returns original", () => {
    const values = [7, 3, 5, 1];
    closeToArr(weightedMovingAverage(values, [1]), values);
  });

  it("zero total weight returns all NaN", () => {
    const result = weightedMovingAverage([1, 2, 3], [0, 0, 0]);
    expect(result.every(isNaN)).toBe(true);
  });
});

// ─── Legacy: kalmansmoother ───────────────────────────────────────────────────

describe("kalmansmoother", () => {
  it("returns same length as input", () => {
    const values = [1, 2, 3, 4, 5];
    expect(kalmansmoother(values)).toHaveLength(values.length);
  });

  it("first value equals input[0]", () => {
    const values = [10, 20, 15, 25];
    expect(kalmansmoother(values)[0]).toBeCloseTo(10, 5);
  });

  it("smoother than raw for noisy signal", () => {
    const noisy = [0, 10, 0, 10, 0, 10, 0, 10, 0, 10];
    const smoothed = kalmansmoother(noisy, 1e-3, 1e-1);
    const rawVariance = noisy.reduce((s, v) => s + (v - 5) ** 2, 0) / noisy.length;
    const smoothedMean = smoothed.reduce((s, v) => s + v, 0) / smoothed.length;
    const smoothedVariance = smoothed.reduce((s, v) => s + (v - smoothedMean) ** 2, 0) / smoothed.length;
    expect(smoothedVariance).toBeLessThan(rawVariance);
  });

  it("empty input returns empty", () => {
    expect(kalmansmoother([])).toEqual([]);
  });

  it("constant signal stays constant", () => {
    const values = [5, 5, 5, 5, 5];
    const result = kalmansmoother(values);
    result.forEach((v) => expect(v).toBeCloseTo(5, 3));
  });
});

// ─── Legacy: crossCorrelation ─────────────────────────────────────────────────

describe("crossCorrelation", () => {
  it("identical series at lag=0 should be 1.0", () => {
    const a = [1, 2, 3, 4, 5];
    const results = crossCorrelation(a, a);
    const lag0 = results.find((r) => r.lag === 0);
    expect(lag0).toBeDefined();
    expect(lag0!.correlation).toBeCloseTo(1.0, 5);
  });

  it("returns 2*maxLag+1 entries", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [5, 4, 3, 2, 1];
    const results = crossCorrelation(a, b, 2);
    expect(results).toHaveLength(5);
  });

  it("lags go from -maxLag to +maxLag", () => {
    const a = [1, 2, 3];
    const results = crossCorrelation(a, a, 2);
    const lags = results.map((r) => r.lag);
    expect(lags).toEqual([-2, -1, 0, 1, 2]);
  });

  it("anti-correlated at lag=0 gives -1", () => {
    const a = [1, 2, 3, 4, 5];
    const b = [5, 4, 3, 2, 1];
    const results = crossCorrelation(a, b, 0);
    expect(results[0]!.correlation).toBeCloseTo(-1.0, 5);
  });
});

// ─── Legacy: autocorrelation ──────────────────────────────────────────────────

describe("autocorrelation", () => {
  it("lag=0 is always 1.0", () => {
    const values = [1, 2, 3, 4, 5, 4, 3, 2, 1];
    const results = autocorrelation(values);
    const lag0 = results.find((r) => r.lag === 0);
    expect(lag0!.correlation).toBeCloseTo(1.0, 10);
  });

  it("returns 2*maxLag+1 entries", () => {
    const values = [1, 2, 3, 4, 5];
    const results = autocorrelation(values, 3);
    expect(results).toHaveLength(7);
  });
});

// ─── Legacy: linearTrend ──────────────────────────────────────────────────────

describe("linearTrend", () => {
  it("flat series has slope ≈ 0", () => {
    const { slope, direction } = linearTrend([5, 5, 5, 5, 5]);
    expect(Math.abs(slope)).toBeLessThan(1e-10);
    expect(direction).toBe("flat");
  });

  it("increasing series has slope > 0 and direction 'up'", () => {
    const { slope, direction } = linearTrend([1, 2, 3, 4, 5]);
    expect(slope).toBeGreaterThan(0);
    expect(direction).toBe("up");
  });

  it("decreasing series has slope < 0 and direction 'down'", () => {
    const { slope, direction } = linearTrend([5, 4, 3, 2, 1]);
    expect(slope).toBeLessThan(0);
    expect(direction).toBe("down");
  });

  it("perfect line has r² = 1", () => {
    const { r2 } = linearTrend([2, 4, 6, 8, 10]);
    expect(r2).toBeCloseTo(1.0, 5);
  });

  it("slope is correct for y=2x+1", () => {
    const values = [1, 3, 5, 7, 9];
    const { slope, intercept } = linearTrend(values);
    expect(slope).toBeCloseTo(2, 5);
    expect(intercept).toBeCloseTo(1, 5);
  });
});

// ─── Legacy: detectChangePoints ──────────────────────────────────────────────

describe("detectChangePoints", () => {
  it("constant series has no change points", () => {
    const result = detectChangePoints([5, 5, 5, 5, 5]);
    expect(result).toHaveLength(0);
  });

  it("detects a large jump", () => {
    const values = [1, 1, 1, 1, 100, 1, 1, 1];
    const points = detectChangePoints(values, 2.0);
    expect(points).toContain(4);
    expect(points).toContain(5);
  });

  it("returns empty for length < 2", () => {
    expect(detectChangePoints([42])).toHaveLength(0);
    expect(detectChangePoints([])).toHaveLength(0);
  });

  it("higher threshold misses small changes", () => {
    const values = [0, 1, 0, 1, 0, 1];
    const lenient = detectChangePoints(values, 10);
    expect(lenient).toHaveLength(0);
  });
});

// ─── Legacy: findPeaks ───────────────────────────────────────────────────────

describe("findPeaks", () => {
  it("[1,3,1,3,1] has peaks at indices 1 and 3", () => {
    const { peaks } = findPeaks([1, 3, 1, 3, 1]);
    expect(peaks).toContain(1);
    expect(peaks).toContain(3);
  });

  it("[1,3,1,3,1] has valley at index 2", () => {
    const { valleys } = findPeaks([1, 3, 1, 3, 1]);
    expect(valleys).toContain(2);
  });

  it("edges are never peaks or valleys", () => {
    const { peaks, valleys } = findPeaks([5, 3, 4, 2, 6]);
    expect(peaks).not.toContain(0);
    expect(peaks).not.toContain(4);
    expect(valleys).not.toContain(0);
    expect(valleys).not.toContain(4);
  });

  it("monotonic series has no peaks or valleys", () => {
    const { peaks, valleys } = findPeaks([1, 2, 3, 4, 5]);
    expect(peaks).toHaveLength(0);
    expect(valleys).toHaveLength(0);
  });

  it("minProminence filters low-prominence peaks", () => {
    const values = [0, 1, 0, 10, 0, 1, 0];
    const { peaks: allPeaks } = findPeaks(values);
    const { peaks: prominentPeaks } = findPeaks(values, 5);
    expect(allPeaks.length).toBeGreaterThan(prominentPeaks.length);
    expect(prominentPeaks).toContain(3);
    expect(prominentPeaks).not.toContain(1);
  });
});

// ─── Legacy: gaussianSmooth ───────────────────────────────────────────────────

describe("gaussianSmooth", () => {
  it("sigma=0.01 ≈ identity (tiny kernel)", () => {
    const values = [1, 2, 3, 4, 5];
    const result = gaussianSmooth(values, 0.01);
    result.forEach((v, i) => expect(v).toBeCloseTo(values[i]!, 1));
  });

  it("returns same length as input", () => {
    expect(gaussianSmooth([1, 2, 3, 4, 5, 6, 7], 1.0)).toHaveLength(7);
  });

  it("large sigma smooths toward constant", () => {
    const values = [1, 9, 1, 9, 1, 9, 1];
    const smoothed = gaussianSmooth(values, 5);
    const rawMean = values.reduce((s, v) => s + v, 0) / values.length;
    const rawVar = values.reduce((s, v) => s + (v - rawMean) ** 2, 0) / values.length;
    const smMean = smoothed.reduce((s, v) => s + v, 0) / smoothed.length;
    const smVar = smoothed.reduce((s, v) => s + (v - smMean) ** 2, 0) / smoothed.length;
    expect(smVar).toBeLessThan(rawVar);
  });

  it("constant input stays constant", () => {
    gaussianSmooth([5, 5, 5, 5, 5], 1.0).forEach((v) => expect(v).toBeCloseTo(5, 5));
  });

  it("empty input returns empty", () => {
    expect(gaussianSmooth([], 1.0)).toEqual([]);
  });
});

// ─── Legacy: medianFilter ────────────────────────────────────────────────────

describe("medianFilter", () => {
  it("window=3 removes spike", () => {
    const values = [1, 100, 2, 3, 4];
    const result = medianFilter(values, 3);
    expect(result[1]).toBeCloseTo(2, 5);
  });

  it("returns same length as input", () => {
    expect(medianFilter([1, 2, 3, 4, 5], 3)).toHaveLength(5);
  });

  it("window=1 returns original", () => {
    const values = [3, 1, 4, 1, 5];
    closeToArr(medianFilter(values, 1), values);
  });

  it("constant input stays constant", () => {
    medianFilter([7, 7, 7, 7, 7], 3).forEach((v) => expect(v).toBeCloseTo(7, 5));
  });
});

// ─── Legacy: savitzkyGolay ────────────────────────────────────────────────────

describe("savitzkyGolay", () => {
  it("returns same length as input", () => {
    expect(savitzkyGolay([1, 4, 9, 16, 25, 16, 9, 4, 1], 5, 2)).toHaveLength(9);
  });

  it("smooths a noisy signal", () => {
    const base = [0, 2, 4, 6, 8, 10, 8, 6, 4, 2, 0];
    const noisy = base.map((v, i) => (i === 5 ? v + 20 : v));
    const smoothed = savitzkyGolay(noisy, 5, 1);
    expect(smoothed[5]!).toBeLessThan(noisy[5]!);
  });

  it("constant signal stays constant (polyOrder=1)", () => {
    savitzkyGolay([5, 5, 5, 5, 5, 5, 5], 5, 1).forEach((v) =>
      expect(v).toBeCloseTo(5, 3)
    );
  });

  it("empty input returns empty", () => {
    expect(savitzkyGolay([], 5, 2)).toEqual([]);
  });
});

// ─── Legacy: dftMagnitudes ────────────────────────────────────────────────────

describe("dftMagnitudes", () => {
  it("returns same length as input", () => {
    expect(dftMagnitudes([1, 2, 3, 4, 5, 6, 7, 8])).toHaveLength(8);
  });

  it("DC component has max power at k=0 for constant", () => {
    const values = [5, 5, 5, 5, 5, 5, 5, 5];
    const mags = dftMagnitudes(values);
    const maxIdx = mags.reduce((maxI, v, i, arr) => (v > arr[maxI]! ? i : maxI), 0);
    expect(maxIdx).toBe(0);
  });

  it("all magnitudes non-negative", () => {
    dftMagnitudes([1, -2, 3, -4, 5]).forEach((v) =>
      expect(v).toBeGreaterThanOrEqual(0)
    );
  });

  it("DC magnitude for constant array equals N * value", () => {
    const values = [3, 3, 3, 3];
    const mags = dftMagnitudes(values);
    expect(mags[0]).toBeCloseTo(12, 5);
  });

  it("zero input gives all-zero magnitudes", () => {
    dftMagnitudes([0, 0, 0, 0, 0, 0]).forEach((v) => expect(v).toBeCloseTo(0, 5));
  });
});

// ─── Legacy: dominantFrequency ────────────────────────────────────────────────

describe("dominantFrequency", () => {
  it("sine wave with period 10 in 30 samples gives period ≈ 10", () => {
    const N = 30;
    const period = 10;
    const values: number[] = [];
    for (let i = 0; i < N; i++) {
      values.push(Math.sin((2 * Math.PI * i) / period));
    }
    const { period: detectedPeriod } = dominantFrequency(values);
    expect(detectedPeriod).toBeCloseTo(period, 0);
  });

  it("returns frequency in (0, 1)", () => {
    const values: number[] = [];
    for (let i = 0; i < 20; i++) values.push(Math.sin((2 * Math.PI * i) / 5));
    const { frequency } = dominantFrequency(values);
    expect(frequency).toBeGreaterThan(0);
    expect(frequency).toBeLessThan(1);
  });

  it("magnitude is positive for non-trivial signal", () => {
    const values: number[] = [];
    for (let i = 0; i < 16; i++) values.push(Math.cos((2 * Math.PI * i) / 4));
    const { magnitude } = dominantFrequency(values);
    expect(magnitude).toBeGreaterThan(0);
  });
});

// ─── Legacy: rollingStdDev ────────────────────────────────────────────────────

describe("rollingStdDev", () => {
  it("first window-1 entries are NaN", () => {
    const result = rollingStdDev([1, 2, 3, 4, 5], 3);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
    expect(isNaN(result[2]!)).toBe(false);
  });

  it("window=1 is all zeros", () => {
    rollingStdDev([1, 2, 3, 4, 5], 1).forEach((v) => expect(v).toBeCloseTo(0, 10));
  });

  it("returns same length as input", () => {
    expect(rollingStdDev([1, 2, 3, 4, 5], 3)).toHaveLength(5);
  });

  it("constant series has zero std dev after warm-up", () => {
    const result = rollingStdDev([7, 7, 7, 7, 7], 3);
    for (let i = 2; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(0, 10);
    }
  });

  it("known std dev value", () => {
    const result = rollingStdDev([1, 2, 3, 4, 5], 3);
    expect(result[2]).toBeCloseTo(Math.sqrt(2 / 3), 5);
  });
});

// ─── Legacy: rollingZScore ────────────────────────────────────────────────────

describe("rollingZScore", () => {
  it("constant series returns all 0s after warm-up", () => {
    const result = rollingZScore([5, 5, 5, 5, 5], 3);
    for (let i = 2; i < result.length; i++) {
      expect(result[i]).toBeCloseTo(0, 10);
    }
  });

  it("returns same length as input", () => {
    expect(rollingZScore([1, 2, 3, 4, 5], 3)).toHaveLength(5);
  });

  it("first window-1 entries are NaN", () => {
    const result = rollingZScore([1, 2, 3, 4, 5], 3);
    expect(isNaN(result[0]!)).toBe(true);
    expect(isNaN(result[1]!)).toBe(true);
  });

  it("last element of increasing series has positive z-score", () => {
    const result = rollingZScore([1, 2, 3, 4, 5], 3);
    expect(result[4]).toBeGreaterThan(0);
  });
});

// ─── Legacy: ewma ────────────────────────────────────────────────────────────

describe("ewma", () => {
  it("half-life=1 check recursion", () => {
    const alpha = 1 - Math.exp(-Math.LN2 / 1);
    const values = [4, 8, 12];
    const result = ewma(values, 1);
    expect(result[0]).toBeCloseTo(4, 5);
    expect(result[1]).toBeCloseTo(alpha * 8 + (1 - alpha) * 4, 5);
    expect(result[2]).toBeCloseTo(alpha * 12 + (1 - alpha) * result[1]!, 5);
  });

  it("returns same length as input", () => {
    expect(ewma([1, 2, 3, 4, 5], 2)).toHaveLength(5);
  });

  it("first element always equals input[0]", () => {
    expect(ewma([42, 1, 2], 3)[0]).toBeCloseTo(42, 5);
  });

  it("larger half-life means slower decay", () => {
    const values = [10, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const fast = ewma(values, 1);
    const slow = ewma(values, 10);
    expect(slow[9]!).toBeGreaterThan(fast[9]!);
  });

  it("empty input returns empty", () => {
    expect(ewma([], 2)).toEqual([]);
  });
});
