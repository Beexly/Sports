/**
 * Currency and monetary display utilities — pure, zero dependencies.
 *
 * Multi-currency formatting, profit/loss display, stake calculations,
 * subscription revenue metrics, and monetary value rendering
 * for sports betting and subscription contexts.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD" | "JPY" | "BTC" | "ETH";

export interface MoneyDisplay {
  readonly raw: number;
  readonly formatted: string;      // e.g., "$1,234.56"
  readonly sign: "+" | "-" | "";  // sign prefix (empty for 0)
  readonly isPositive: boolean;
  readonly isNegative: boolean;
  readonly isZero: boolean;
}

export interface PnlDisplay {
  readonly amount: number;
  readonly formatted: string;      // always shows sign: "+$12.50" or "-$8.00"
  readonly colorClass: string;     // "text-green-500" | "text-red-500" | "text-gray-400"
  readonly isProfit: boolean;
}

export interface SubscriptionRevenue {
  readonly mrr: number;
  readonly arr: number;
  readonly formatted: {
    mrr: string;
    arr: string;
  };
}

// ---------------------------------------------------------------------------
// Symbol and decimal config
// ---------------------------------------------------------------------------

interface CurrencyConfig {
  symbol: string;
  decimals: number;
}

const CURRENCY_CONFIG: Record<CurrencyCode, CurrencyConfig> = {
  USD: { symbol: "$", decimals: 2 },
  EUR: { symbol: "€", decimals: 2 },
  GBP: { symbol: "£", decimals: 2 },
  CAD: { symbol: "$", decimals: 2 },
  AUD: { symbol: "$", decimals: 2 },
  JPY: { symbol: "¥", decimals: 0 },
  BTC: { symbol: "₿", decimals: 8 },
  ETH: { symbol: "Ξ", decimals: 6 },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Add thousands separators (commas) to the integer portion of a number string.
 */
function addThousandsSeparator(integerPart: string): string {
  // Walk right-to-left and insert comma every 3 digits
  const result: string[] = [];
  for (let i = 0; i < integerPart.length; i++) {
    if (i > 0 && (integerPart.length - i) % 3 === 0) {
      result.push(",");
    }
    result.push(integerPart[i]!);
  }
  return result.join("");
}

/**
 * Format an absolute (non-negative) number with given decimal places and commas.
 */
function formatAbsolute(abs: number, decimals: number): string {
  const fixed = abs.toFixed(decimals);
  if (decimals === 0) {
    return addThousandsSeparator(fixed);
  }
  const dotIdx = fixed.indexOf(".");
  const intPart = fixed.slice(0, dotIdx);
  const decPart = fixed.slice(dotIdx); // includes the dot
  return addThousandsSeparator(intPart) + decPart;
}

// ---------------------------------------------------------------------------
// formatCurrency
// ---------------------------------------------------------------------------

/**
 * Format a number as a currency string.
 *
 * - USD/CAD/AUD: "$" prefix, 2 decimal places, thousands separator
 * - EUR: "€" prefix, 2 decimal places
 * - GBP: "£" prefix, 2 decimal places
 * - JPY: "¥" prefix, 0 decimal places
 * - BTC: "₿" prefix, 8 decimal places
 * - ETH: "Ξ" prefix, 6 decimal places
 *
 * @param amount   - the monetary value
 * @param currency - currency code (default: "USD")
 * @param options  - compact: use K/M suffixes; decimals: override decimal places
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "USD",
  options?: { compact?: boolean; decimals?: number }
): string {
  const cfg = CURRENCY_CONFIG[currency];
  const sym = cfg.symbol;
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const decimals = options?.decimals !== undefined ? options.decimals : cfg.decimals;

  if (options?.compact && abs >= 1000) {
    const sign = negative ? "-" : "";
    if (abs >= 1_000_000) {
      return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
    }
    return `${sign}${sym}${(abs / 1000).toFixed(1)}K`;
  }

  const formatted = formatAbsolute(abs, decimals);
  const sign = negative ? "-" : "";
  return `${sign}${sym}${formatted}`;
}

// ---------------------------------------------------------------------------
// displayMoney
// ---------------------------------------------------------------------------

/**
 * Return a MoneyDisplay object with sign, flags, and formatted string.
 */
export function displayMoney(amount: number, currency: CurrencyCode = "USD"): MoneyDisplay {
  const formatted = formatCurrency(amount, currency);
  const sign: "+" | "-" | "" = amount > 0 ? "+" : amount < 0 ? "-" : "";

  return {
    raw: amount,
    formatted,
    sign,
    isPositive: amount > 0,
    isNegative: amount < 0,
    isZero: amount === 0,
  };
}

// ---------------------------------------------------------------------------
// formatPnl
// ---------------------------------------------------------------------------

/**
 * Format profit/loss with explicit sign and a Tailwind color class.
 *
 * - profit  → "+$12.50", "text-green-500"
 * - loss    → "-$8.00",  "text-red-500"
 * - zero    → "$0.00",   "text-gray-400"
 */
export function formatPnl(amount: number, currency: CurrencyCode = "USD"): PnlDisplay {
  const isProfit = amount > 0;
  const isLoss = amount < 0;

  let formatted: string;
  let colorClass: string;

  if (isProfit) {
    formatted = `+${formatCurrency(amount, currency)}`;
    colorClass = "text-green-500";
  } else if (isLoss) {
    // formatCurrency already adds the minus sign
    formatted = formatCurrency(amount, currency);
    colorClass = "text-red-500";
  } else {
    formatted = formatCurrency(0, currency);
    colorClass = "text-gray-400";
  }

  return {
    amount,
    formatted,
    colorClass,
    isProfit,
  };
}

// ---------------------------------------------------------------------------
// calculateMrr / calculateArr
// ---------------------------------------------------------------------------

/**
 * Build SubscriptionRevenue from a given MRR value.
 * arr = mrr * 12
 */
export function calculateMrr(monthlyRevenue: number): SubscriptionRevenue {
  const mrr = monthlyRevenue;
  const arr = monthlyRevenue * 12;
  return {
    mrr,
    arr,
    formatted: {
      mrr: formatCurrency(mrr, "USD"),
      arr: formatCurrency(arr, "USD"),
    },
  };
}

/**
 * Build SubscriptionRevenue from a given ARR value.
 * mrr = arr / 12
 */
export function calculateArr(annualRevenue: number): SubscriptionRevenue {
  const arr = annualRevenue;
  const mrr = annualRevenue / 12;
  return {
    mrr,
    arr,
    formatted: {
      mrr: formatCurrency(mrr, "USD"),
      arr: formatCurrency(arr, "USD"),
    },
  };
}

// ---------------------------------------------------------------------------
// formatRoi
// ---------------------------------------------------------------------------

/**
 * Format ROI as percentage with explicit sign for non-zero values.
 * 0.156 → "+15.6%", -0.05 → "-5.0%", 0 → "0.0%"
 */
export function formatRoi(roi: number, decimals = 1): string {
  const pct = (roi * 100).toFixed(decimals);
  if (roi > 0) return `+${pct}%`;
  if (roi < 0) return `${pct}%`;
  return `${pct}%`;
}

// ---------------------------------------------------------------------------
// formatOddsReturn / formatProfit
// ---------------------------------------------------------------------------

/**
 * Calculate and format the total return (stake + profit) for a bet.
 *
 * - Positive odds: return = stake + stake * (odds / 100)
 * - Negative odds: return = stake + stake * (100 / |odds|)
 */
export function formatOddsReturn(stake: number, americanOdds: number): string {
  let totalReturn: number;
  if (americanOdds >= 0) {
    totalReturn = stake + stake * (americanOdds / 100);
  } else {
    totalReturn = stake + stake * (100 / Math.abs(americanOdds));
  }
  return formatCurrency(totalReturn, "USD");
}

/**
 * Calculate and format the net profit only (not including stake).
 * Result is shown with a sign prefix.
 */
export function formatProfit(stake: number, americanOdds: number): string {
  let profit: number;
  if (americanOdds >= 0) {
    profit = stake * (americanOdds / 100);
  } else {
    profit = stake * (100 / Math.abs(americanOdds));
  }
  // Always show with sign
  const formatted = formatCurrency(profit, "USD");
  return `+${formatted}`;
}

// ---------------------------------------------------------------------------
// parseCurrencyString
// ---------------------------------------------------------------------------

/**
 * Parse a formatted currency string back to a number.
 *
 * Handles: "$1,234.56", "€500", "1.5K", "2.5M", "₿0.00500000".
 * Returns null for empty or invalid input.
 */
export function parseCurrencyString(str: string): number | null {
  if (!str || typeof str !== "string") return null;

  const trimmed = str.trim();
  if (trimmed === "") return null;

  // Strip currency symbols
  let cleaned = trimmed.replace(/[$€£¥₿Ξ]/g, "");

  // Detect K/M suffix (case-insensitive)
  let multiplier = 1;
  if (/[kK]$/.test(cleaned)) {
    multiplier = 1000;
    cleaned = cleaned.slice(0, -1);
  } else if (/[mM]$/.test(cleaned)) {
    multiplier = 1_000_000;
    cleaned = cleaned.slice(0, -1);
  }

  // Remove commas (thousands separators)
  cleaned = cleaned.replace(/,/g, "");

  // Handle negative sign that may have been separated from digits
  cleaned = cleaned.trim();

  const parsed = parseFloat(cleaned);
  if (isNaN(parsed) || !isFinite(parsed)) return null;

  return parsed * multiplier;
}

// ---------------------------------------------------------------------------
// stakeDisplayOptions
// ---------------------------------------------------------------------------

/**
 * Return display options for a stake amount relative to a bankroll.
 *
 * units: stakeUnit / 100 (standard unit = $100)
 * percent: percentage of bankroll
 * unitLabel: e.g. "2.0u"
 */
export function stakeDisplayOptions(
  stakeUnit: number,
  bankroll: number
): { unitLabel: string; units: number; percent: string } {
  const units = stakeUnit / 100;
  const percent = bankroll > 0 ? ((stakeUnit / bankroll) * 100).toFixed(1) + "%" : "0.0%";
  const unitLabel = `${units.toFixed(1)}u`;
  return { unitLabel, units, percent };
}

// ---------------------------------------------------------------------------
// formatCompact
// ---------------------------------------------------------------------------

/**
 * Compact number without currency symbol.
 * 999 → "999", 1000 → "1.0K", 1500 → "1.5K", 1000000 → "1.0M"
 * Negative: "-1.0K"
 */
export function formatCompact(amount: number): string {
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const sign = negative ? "-" : "";

  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1000) {
    return `${sign}${(abs / 1000).toFixed(1)}K`;
  }
  return `${sign}${abs.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// formatStake
// ---------------------------------------------------------------------------

/**
 * Format a stake/wager amount with currency symbol.
 * Always 2 decimal places for USD/EUR/GBP/CAD/AUD.
 */
export function formatStake(amount: number, currency: CurrencyCode = "USD"): string {
  // Force 2 decimals for fiat currencies regardless of BTC/JPY defaults
  const fiat: CurrencyCode[] = ["USD", "EUR", "GBP", "CAD", "AUD"];
  const decimals = fiat.includes(currency) ? 2 : CURRENCY_CONFIG[currency].decimals;
  return formatCurrency(amount, currency, { decimals });
}

// ---------------------------------------------------------------------------
// convertRate
// ---------------------------------------------------------------------------

/**
 * Convert an amount from one currency to another using a rates map (all quoted in USD).
 *
 * rates["EUR"] = 0.92 means 1 USD = 0.92 EUR.
 *
 * Returns null if either rate is missing.
 * Returns amount unchanged if fromCurrency === toCurrency.
 */
export function convertRate(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rates: Record<string, number>
): number | null {
  if (fromCurrency === toCurrency) return amount;

  // Convert fromCurrency → USD → toCurrency
  let amountInUsd: number;

  if (fromCurrency === "USD") {
    amountInUsd = amount;
  } else {
    const fromRate = rates[fromCurrency];
    if (fromRate === undefined || fromRate === null) return null;
    // fromRate = units of fromCurrency per 1 USD → amountInUsd = amount / fromRate
    amountInUsd = amount / fromRate;
  }

  if (toCurrency === "USD") return amountInUsd;

  const toRate = rates[toCurrency];
  if (toRate === undefined || toRate === null) return null;

  return amountInUsd * toRate;
}
