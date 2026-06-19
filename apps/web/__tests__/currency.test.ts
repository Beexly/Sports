import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  displayMoney,
  formatPnl,
  calculateMrr,
  calculateArr,
  formatRoi,
  formatOddsReturn,
  formatProfit,
  parseCurrencyString,
  stakeDisplayOptions,
  formatCompact,
  formatStake,
  convertRate,
} from "@/lib/utils/currency";

// ---------------------------------------------------------------------------
// formatCurrency — USD
// ---------------------------------------------------------------------------

describe("formatCurrency — USD", () => {
  it("formats a basic USD amount with 2 decimal places", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats a negative USD amount", () => {
    expect(formatCurrency(-12.5)).toBe("-$12.50");
  });

  it("adds thousands separator for 4-digit amounts", () => {
    expect(formatCurrency(1000)).toBe("$1,000.00");
  });

  it("adds thousands separator for 7-digit amounts", () => {
    expect(formatCurrency(1234567.89)).toBe("$1,234,567.89");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatCurrency(9.999)).toBe("$10.00");
  });

  it("formats a small amount", () => {
    expect(formatCurrency(0.01)).toBe("$0.01");
  });

  it("compact K for amounts >= 1000", () => {
    expect(formatCurrency(1234, "USD", { compact: true })).toBe("$1.2K");
  });

  it("compact K shows one decimal", () => {
    expect(formatCurrency(1500, "USD", { compact: true })).toBe("$1.5K");
  });

  it("compact M for amounts >= 1,000,000", () => {
    expect(formatCurrency(1_500_000, "USD", { compact: true })).toBe("$1.5M");
  });

  it("compact does not apply below 1000", () => {
    expect(formatCurrency(999, "USD", { compact: true })).toBe("$999.00");
  });

  it("compact with negative value uses K", () => {
    expect(formatCurrency(-2000, "USD", { compact: true })).toBe("-$2.0K");
  });

  it("decimals override", () => {
    expect(formatCurrency(1234.5678, "USD", { decimals: 4 })).toBe("$1,234.5678");
  });

  it("decimals override to 0", () => {
    expect(formatCurrency(1234.56, "USD", { decimals: 0 })).toBe("$1,235");
  });
});

// ---------------------------------------------------------------------------
// formatCurrency — other currencies
// ---------------------------------------------------------------------------

describe("formatCurrency — EUR", () => {
  it("formats with euro symbol", () => {
    expect(formatCurrency(500, "EUR")).toBe("€500.00");
  });

  it("formats EUR with thousands separator", () => {
    expect(formatCurrency(1500, "EUR")).toBe("€1,500.00");
  });

  it("formats negative EUR", () => {
    expect(formatCurrency(-100, "EUR")).toBe("-€100.00");
  });
});

describe("formatCurrency — GBP", () => {
  it("formats with pound symbol", () => {
    expect(formatCurrency(250.5, "GBP")).toBe("£250.50");
  });

  it("formats negative GBP", () => {
    expect(formatCurrency(-75, "GBP")).toBe("-£75.00");
  });
});

describe("formatCurrency — JPY", () => {
  it("formats JPY with no decimal places", () => {
    expect(formatCurrency(1000, "JPY")).toBe("¥1,000");
  });

  it("formats JPY rounding", () => {
    expect(formatCurrency(1234.99, "JPY")).toBe("¥1,235");
  });

  it("formats negative JPY", () => {
    expect(formatCurrency(-500, "JPY")).toBe("-¥500");
  });
});

describe("formatCurrency — BTC", () => {
  it("formats BTC with 8 decimal places", () => {
    expect(formatCurrency(0.00500000, "BTC")).toBe("₿0.00500000");
  });

  it("formats BTC whole number", () => {
    expect(formatCurrency(1, "BTC")).toBe("₿1.00000000");
  });
});

describe("formatCurrency — ETH", () => {
  it("formats ETH with 6 decimal places", () => {
    expect(formatCurrency(1.5, "ETH")).toBe("Ξ1.500000");
  });

  it("formats ETH zero", () => {
    expect(formatCurrency(0, "ETH")).toBe("Ξ0.000000");
  });
});

// ---------------------------------------------------------------------------
// displayMoney
// ---------------------------------------------------------------------------

describe("displayMoney", () => {
  it("positive amount → sign '+'", () => {
    expect(displayMoney(100).sign).toBe("+");
  });

  it("negative amount → sign '-'", () => {
    expect(displayMoney(-50).sign).toBe("-");
  });

  it("zero → sign ''", () => {
    expect(displayMoney(0).sign).toBe("");
  });

  it("positive → isPositive true", () => {
    expect(displayMoney(1).isPositive).toBe(true);
    expect(displayMoney(1).isNegative).toBe(false);
    expect(displayMoney(1).isZero).toBe(false);
  });

  it("negative → isNegative true", () => {
    expect(displayMoney(-1).isNegative).toBe(true);
    expect(displayMoney(-1).isPositive).toBe(false);
    expect(displayMoney(-1).isZero).toBe(false);
  });

  it("zero → isZero true", () => {
    expect(displayMoney(0).isZero).toBe(true);
    expect(displayMoney(0).isPositive).toBe(false);
    expect(displayMoney(0).isNegative).toBe(false);
  });

  it("formatted property matches formatCurrency output", () => {
    expect(displayMoney(1234.56).formatted).toBe("$1,234.56");
  });

  it("raw property holds the original amount", () => {
    expect(displayMoney(99.99).raw).toBe(99.99);
  });

  it("works with EUR currency code", () => {
    const m = displayMoney(500, "EUR");
    expect(m.formatted).toBe("€500.00");
    expect(m.sign).toBe("+");
  });
});

// ---------------------------------------------------------------------------
// formatPnl
// ---------------------------------------------------------------------------

describe("formatPnl", () => {
  it("profit → '+' prefix and green class", () => {
    const r = formatPnl(12.5);
    expect(r.formatted).toBe("+$12.50");
    expect(r.colorClass).toBe("text-green-500");
    expect(r.isProfit).toBe(true);
  });

  it("loss → '-' prefix and red class", () => {
    const r = formatPnl(-8);
    expect(r.formatted).toBe("-$8.00");
    expect(r.colorClass).toBe("text-red-500");
    expect(r.isProfit).toBe(false);
  });

  it("zero → no sign and gray class", () => {
    const r = formatPnl(0);
    expect(r.formatted).toBe("$0.00");
    expect(r.colorClass).toBe("text-gray-400");
    expect(r.isProfit).toBe(false);
  });

  it("amount property holds raw value", () => {
    expect(formatPnl(50).amount).toBe(50);
    expect(formatPnl(-20).amount).toBe(-20);
  });

  it("works with EUR", () => {
    const r = formatPnl(100, "EUR");
    expect(r.formatted).toBe("+€100.00");
    expect(r.colorClass).toBe("text-green-500");
  });
});

// ---------------------------------------------------------------------------
// calculateMrr
// ---------------------------------------------------------------------------

describe("calculateMrr", () => {
  it("mrr equals the input", () => {
    expect(calculateMrr(1000).mrr).toBe(1000);
  });

  it("arr equals mrr * 12", () => {
    expect(calculateMrr(1000).arr).toBe(12000);
  });

  it("formatted.mrr is USD string", () => {
    expect(calculateMrr(1000).formatted.mrr).toBe("$1,000.00");
  });

  it("formatted.arr is USD string", () => {
    expect(calculateMrr(1000).formatted.arr).toBe("$12,000.00");
  });

  it("handles fractional monthly revenue", () => {
    const r = calculateMrr(99.99);
    expect(r.arr).toBeCloseTo(1199.88, 2);
  });

  it("handles zero revenue", () => {
    const r = calculateMrr(0);
    expect(r.mrr).toBe(0);
    expect(r.arr).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateArr
// ---------------------------------------------------------------------------

describe("calculateArr", () => {
  it("arr equals the input", () => {
    expect(calculateArr(12000).arr).toBe(12000);
  });

  it("mrr equals arr / 12", () => {
    expect(calculateArr(12000).mrr).toBe(1000);
  });

  it("formatted.arr is USD string", () => {
    expect(calculateArr(12000).formatted.arr).toBe("$12,000.00");
  });

  it("formatted.mrr is USD string", () => {
    expect(calculateArr(12000).formatted.mrr).toBe("$1,000.00");
  });
});

// ---------------------------------------------------------------------------
// formatRoi
// ---------------------------------------------------------------------------

describe("formatRoi", () => {
  it("positive ROI shows + prefix", () => {
    expect(formatRoi(0.1)).toBe("+10.0%");
  });

  it("negative ROI shows - prefix", () => {
    expect(formatRoi(-0.05)).toBe("-5.0%");
  });

  it("zero ROI shows no sign", () => {
    expect(formatRoi(0)).toBe("0.0%");
  });

  it("custom decimals", () => {
    expect(formatRoi(0.1234, 2)).toBe("+12.34%");
  });

  it("larger ROI", () => {
    expect(formatRoi(0.156)).toBe("+15.6%");
  });

  it("100% ROI", () => {
    expect(formatRoi(1.0)).toBe("+100.0%");
  });
});

// ---------------------------------------------------------------------------
// formatOddsReturn
// ---------------------------------------------------------------------------

describe("formatOddsReturn", () => {
  it("+150 with $100 stake returns $250.00", () => {
    expect(formatOddsReturn(100, 150)).toBe("$250.00");
  });

  it("-110 with $110 stake returns approx $210.00", () => {
    const result = formatOddsReturn(110, -110);
    // 110 + 110 * (100/110) = 110 + 100 = 210
    expect(result).toBe("$210.00");
  });

  it("even odds (+100) doubles the stake", () => {
    expect(formatOddsReturn(50, 100)).toBe("$100.00");
  });

  it("+200 with $50 stake → $150.00", () => {
    expect(formatOddsReturn(50, 200)).toBe("$150.00");
  });

  it("-200 with $100 stake → $150.00", () => {
    expect(formatOddsReturn(100, -200)).toBe("$150.00");
  });
});

// ---------------------------------------------------------------------------
// formatProfit
// ---------------------------------------------------------------------------

describe("formatProfit", () => {
  it("+200 with $50 stake → '+$100.00'", () => {
    expect(formatProfit(50, 200)).toBe("+$100.00");
  });

  it("+150 with $100 stake → '+$150.00'", () => {
    expect(formatProfit(100, 150)).toBe("+$150.00");
  });

  it("-110 with $110 stake → '+$100.00'", () => {
    const result = formatProfit(110, -110);
    // profit = 110 * (100/110) ≈ 100
    expect(result).toBe("+$100.00");
  });
});

// ---------------------------------------------------------------------------
// parseCurrencyString
// ---------------------------------------------------------------------------

describe("parseCurrencyString", () => {
  it("parses a dollar amount with commas", () => {
    expect(parseCurrencyString("$1,234.56")).toBe(1234.56);
  });

  it("parses a euro amount", () => {
    expect(parseCurrencyString("€500")).toBe(500);
  });

  it("parses 1.5K as 1500", () => {
    expect(parseCurrencyString("1.5K")).toBe(1500);
  });

  it("parses 2.5M as 2500000", () => {
    expect(parseCurrencyString("2.5M")).toBe(2_500_000);
  });

  it("returns null for empty string", () => {
    expect(parseCurrencyString("")).toBeNull();
  });

  it("returns null for invalid input", () => {
    expect(parseCurrencyString("abc")).toBeNull();
  });

  it("parses a pound amount", () => {
    expect(parseCurrencyString("£250.50")).toBe(250.5);
  });

  it("parses a negative dollar amount", () => {
    expect(parseCurrencyString("-$12.50")).toBe(-12.5);
  });

  it("parses a plain number string", () => {
    expect(parseCurrencyString("999")).toBe(999);
  });

  it("parses BTC symbol amount", () => {
    expect(parseCurrencyString("₿0.00500000")).toBeCloseTo(0.005, 8);
  });

  it("parses lowercase k suffix", () => {
    expect(parseCurrencyString("3k")).toBe(3000);
  });

  it("parses uppercase M suffix", () => {
    expect(parseCurrencyString("10M")).toBe(10_000_000);
  });

  it("returns null for whitespace-only string", () => {
    expect(parseCurrencyString("   ")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// stakeDisplayOptions
// ---------------------------------------------------------------------------

describe("stakeDisplayOptions", () => {
  it("$200 stake, $10000 bankroll → units=2, percent='2.0%'", () => {
    const r = stakeDisplayOptions(200, 10000);
    expect(r.units).toBe(2);
    expect(r.percent).toBe("2.0%");
  });

  it("unitLabel reflects units with 1 decimal", () => {
    expect(stakeDisplayOptions(200, 10000).unitLabel).toBe("2.0u");
  });

  it("$100 stake → 1 unit", () => {
    const r = stakeDisplayOptions(100, 1000);
    expect(r.units).toBe(1);
    expect(r.unitLabel).toBe("1.0u");
  });

  it("$50 stake → 0.5 units", () => {
    const r = stakeDisplayOptions(50, 5000);
    expect(r.units).toBe(0.5);
    expect(r.unitLabel).toBe("0.5u");
    expect(r.percent).toBe("1.0%");
  });

  it("zero bankroll → percent '0.0%'", () => {
    const r = stakeDisplayOptions(100, 0);
    expect(r.percent).toBe("0.0%");
  });

  it("percent rounds to 1 decimal place", () => {
    const r = stakeDisplayOptions(333, 10000);
    expect(r.percent).toBe("3.3%");
  });
});

// ---------------------------------------------------------------------------
// formatCompact
// ---------------------------------------------------------------------------

describe("formatCompact", () => {
  it("999 → '999'", () => {
    expect(formatCompact(999)).toBe("999");
  });

  it("1000 → '1.0K'", () => {
    expect(formatCompact(1000)).toBe("1.0K");
  });

  it("1500 → '1.5K'", () => {
    expect(formatCompact(1500)).toBe("1.5K");
  });

  it("1000000 → '1.0M'", () => {
    expect(formatCompact(1_000_000)).toBe("1.0M");
  });

  it("negative 2000 → '-2.0K'", () => {
    expect(formatCompact(-2000)).toBe("-2.0K");
  });

  it("zero → '0'", () => {
    expect(formatCompact(0)).toBe("0");
  });

  it("2500000 → '2.5M'", () => {
    expect(formatCompact(2_500_000)).toBe("2.5M");
  });
});

// ---------------------------------------------------------------------------
// formatStake
// ---------------------------------------------------------------------------

describe("formatStake", () => {
  it("formats USD stake with 2 decimal places", () => {
    expect(formatStake(110)).toBe("$110.00");
  });

  it("formats EUR stake with 2 decimal places", () => {
    expect(formatStake(55.5, "EUR")).toBe("€55.50");
  });

  it("formats GBP stake with 2 decimal places", () => {
    expect(formatStake(25, "GBP")).toBe("£25.00");
  });

  it("formats CAD stake with 2 decimal places", () => {
    expect(formatStake(100, "CAD")).toBe("$100.00");
  });

  it("formats AUD stake with 2 decimal places", () => {
    expect(formatStake(200, "AUD")).toBe("$200.00");
  });
});

// ---------------------------------------------------------------------------
// convertRate
// ---------------------------------------------------------------------------

describe("convertRate", () => {
  const rates = { EUR: 0.92, GBP: 0.79, CAD: 1.36 };

  it("same currency returns amount unchanged", () => {
    expect(convertRate(100, "USD", "USD", rates)).toBe(100);
  });

  it("USD → EUR applies the rate", () => {
    expect(convertRate(100, "USD", "EUR", rates)).toBeCloseTo(92, 5);
  });

  it("EUR → USD inverts the rate", () => {
    expect(convertRate(92, "EUR", "USD", rates)).toBeCloseTo(100, 2);
  });

  it("EUR → GBP converts via USD", () => {
    const result = convertRate(92, "EUR", "GBP", rates);
    // 92 EUR → 100 USD → 79 GBP
    expect(result).toBeCloseTo(79, 2);
  });

  it("returns null if fromCurrency rate is missing", () => {
    expect(convertRate(100, "JPY", "USD", rates)).toBeNull();
  });

  it("returns null if toCurrency rate is missing", () => {
    expect(convertRate(100, "USD", "JPY", rates)).toBeNull();
  });

  it("CAD same currency", () => {
    expect(convertRate(200, "CAD", "CAD", rates)).toBe(200);
  });

  it("USD → CAD", () => {
    expect(convertRate(100, "USD", "CAD", rates)).toBeCloseTo(136, 5);
  });
});
