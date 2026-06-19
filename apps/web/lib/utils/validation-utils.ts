/**
 * Pure TypeScript validation utilities for form inputs and domain objects.
 * No npm dependencies. Strict types throughout.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface FieldValidation {
  field: string
  result: ValidationResult
}

export interface SchemaValidationResult {
  valid: boolean
  fieldErrors: Record<string, string[]>
  allErrors: string[]
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function ok(): ValidationResult {
  return { valid: true, errors: [] }
}

function fail(message: string): ValidationResult {
  return { valid: false, errors: [message] }
}

function failMany(errors: string[]): ValidationResult {
  return { valid: false, errors }
}

const VALID_SPORTS = [
  'NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'MLS',
  'tennis', 'golf', 'boxing', 'UFC',
] as const

// ---------------------------------------------------------------------------
// Primitive validators
// ---------------------------------------------------------------------------

/** Returns true if value is non-empty after trimming */
export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0
}

/**
 * RFC 5322 simplified: local@domain.tld
 * No consecutive dots; no leading/trailing dots in local part
 */
export function isEmail(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  // Local part: no leading/trailing/consecutive dots
  const emailRegex = /^(?!\.)(?!.*\.\.)([a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*)(?<!\.)@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/
  return emailRegex.test(value)
}

/** Must start with http:// or https://; has a domain with at least one dot */
export function isUrl(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  if (!/^https?:\/\//i.test(value)) return false
  try {
    const u = new URL(value)
    return u.hostname.includes('.')
  } catch {
    return false
  }
}

/**
 * US/international: optional +1, 10 digits (stripped of spaces/dashes/parens)
 */
export function isPhoneNumber(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  const stripped = value.replace(/[\s\-().]/g, '')
  // Allow optional +1 followed by 10 digits, or just 10 digits
  return /^(\+1)?[2-9]\d{9}$/.test(stripped) || /^\+?[1-9]\d{9,14}$/.test(stripped)
}

/** Only [a-zA-Z0-9] */
export function isAlphanumeric(value: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(value)
}

/** Only [a-z0-9-]; no leading/trailing/consecutive dashes */
export function isSlug(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  if (/[^a-z0-9-]/.test(value)) return false
  if (value.startsWith('-') || value.endsWith('-')) return false
  if (value.includes('--')) return false
  return true
}

/** Standard UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx */
export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/** ISO 8601 date: YYYY-MM-DD */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(value)
  return !isNaN(d.getTime())
}

/** ISO 8601 datetime: YYYY-MM-DDTHH:MM:SSZ or with timezone offset */
export function isIsoDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(value)) return false
  const d = new Date(value)
  return !isNaN(d.getTime())
}

/** Returns true if value > 0 */
export function isPositiveNumber(value: number): boolean {
  return typeof value === 'number' && isFinite(value) && value > 0
}

/** 0–100 inclusive */
export function isPercentage(value: number): boolean {
  return typeof value === 'number' && isFinite(value) && value >= 0 && value <= 100
}

/**
 * American odds: must be >= 100 or <= -100
 * e.g. -110, +150, +100, -100 are valid; -50 is invalid
 */
export function isOddsAmerican(value: number): boolean {
  return typeof value === 'number' && isFinite(value) && (value >= 100 || value <= -100)
}

/** Decimal odds > 1.0 */
export function isOddsDecimal(value: number): boolean {
  return typeof value === 'number' && isFinite(value) && value > 1.0
}

/** 0–100 inclusive integer */
export function isConfidenceScore(value: number): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 100
}

// ---------------------------------------------------------------------------
// String validators with messages
// ---------------------------------------------------------------------------

export function validateRequired(value: string, fieldName?: string): ValidationResult {
  const label = fieldName ?? 'Field'
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fail(`${label} is required`)
  }
  return ok()
}

export function validateMinLength(value: string, min: number, fieldName?: string): ValidationResult {
  const label = fieldName ?? 'Field'
  if (value.length < min) {
    return fail(`${label} must be at least ${min} characters`)
  }
  return ok()
}

export function validateMaxLength(value: string, max: number, fieldName?: string): ValidationResult {
  const label = fieldName ?? 'Field'
  if (value.length > max) {
    return fail(`${label} must be at most ${max} characters`)
  }
  return ok()
}

export function validatePattern(value: string, pattern: RegExp, message?: string): ValidationResult {
  if (!pattern.test(value)) {
    return fail(message ?? `Value does not match required pattern`)
  }
  return ok()
}

export function validateRange(value: number, min: number, max: number, fieldName?: string): ValidationResult {
  const label = fieldName ?? 'Value'
  if (value < min || value > max) {
    return fail(`${label} must be between ${min} and ${max}`)
  }
  return ok()
}

// ---------------------------------------------------------------------------
// Domain-specific validators
// ---------------------------------------------------------------------------

export interface PickInput {
  sport: string
  gameId: string
  pickType: string
  confidence: number
  line?: number
  odds?: number
  modelVersion?: string
}

export function validatePick(pick: PickInput): SchemaValidationResult {
  const fieldErrors: Record<string, string[]> = {}

  // sport
  if (!pick.sport || !isValidSport(pick.sport)) {
    fieldErrors['sport'] = [`sport must be one of: ${VALID_SPORTS.join(', ')}`]
  }

  // gameId
  if (!pick.gameId || pick.gameId.trim().length === 0) {
    fieldErrors['gameId'] = ['gameId is required']
  }

  // pickType
  const validPickTypes = ['spread', 'moneyline', 'total', 'prop']
  if (!pick.pickType || !validPickTypes.includes(pick.pickType)) {
    fieldErrors['pickType'] = [`pickType must be one of: ${validPickTypes.join(', ')}`]
  }

  // confidence
  if (pick.confidence === undefined || pick.confidence === null) {
    fieldErrors['confidence'] = ['confidence is required']
  } else if (!isConfidenceScore(pick.confidence)) {
    fieldErrors['confidence'] = ['confidence must be an integer between 0 and 100']
  }

  // odds (optional)
  if (pick.odds !== undefined) {
    if (!isOddsAmerican(pick.odds)) {
      fieldErrors['odds'] = ['odds must be valid american odds (>= 100 or <= -100)']
    }
  }

  // modelVersion (optional)
  if (pick.modelVersion !== undefined) {
    if (!/^v\d+\.\d+\.\d+$/.test(pick.modelVersion)) {
      fieldErrors['modelVersion'] = ['modelVersion must match pattern /^v\\d+\\.\\d+\\.\\d+$/']
    }
  }

  const allErrors = Object.values(fieldErrors).flat()
  return {
    valid: allErrors.length === 0,
    fieldErrors,
    allErrors,
  }
}

export interface UserInput {
  email: string
  displayName?: string
  subscriptionTier?: string
}

export function validateUserInput(input: UserInput): SchemaValidationResult {
  const fieldErrors: Record<string, string[]> = {}

  // email
  if (!input.email || input.email.trim().length === 0) {
    fieldErrors['email'] = ['email is required']
  } else if (!isEmail(input.email)) {
    fieldErrors['email'] = ['email must be a valid email address']
  }

  // displayName (optional)
  if (input.displayName !== undefined) {
    const dn = input.displayName
    const dnErrors: string[] = []
    if (dn.length < 2) dnErrors.push('displayName must be at least 2 characters')
    if (dn.length > 50) dnErrors.push('displayName must be at most 50 characters')
    if (/[^a-zA-Z0-9 '\-]/.test(dn)) dnErrors.push("displayName may only contain letters, numbers, spaces, apostrophes, and hyphens")
    if (dnErrors.length > 0) fieldErrors['displayName'] = dnErrors
  }

  // subscriptionTier (optional)
  if (input.subscriptionTier !== undefined) {
    const validTiers = ['free', 'pro', 'elite']
    if (!validTiers.includes(input.subscriptionTier)) {
      fieldErrors['subscriptionTier'] = [`subscriptionTier must be one of: ${validTiers.join(', ')}`]
    }
  }

  const allErrors = Object.values(fieldErrors).flat()
  return {
    valid: allErrors.length === 0,
    fieldErrors,
    allErrors,
  }
}

export interface StakeInput {
  amount: number
  unit: 'units' | 'dollars' | 'percent'
  maxBankroll?: number
}

export function validateStake(stake: StakeInput): SchemaValidationResult {
  const fieldErrors: Record<string, string[]> = {}

  // amount
  if (stake.amount === undefined || stake.amount === null) {
    fieldErrors['amount'] = ['amount is required']
  } else if (!isPositiveNumber(stake.amount)) {
    fieldErrors['amount'] = ['amount must be a positive number']
  } else {
    // unit-specific range checks
    if (stake.unit === 'percent') {
      if (stake.amount > 100) {
        fieldErrors['amount'] = ['amount must be between 0 and 100 when unit is percent']
      }
    } else if (stake.unit === 'units') {
      if (stake.amount < 0.1 || stake.amount > 100) {
        fieldErrors['amount'] = ['amount must be between 0.1 and 100 when unit is units']
      }
    }
  }

  // unit
  const validUnits = ['units', 'dollars', 'percent']
  if (!stake.unit || !validUnits.includes(stake.unit)) {
    fieldErrors['unit'] = [`unit must be one of: ${validUnits.join(', ')}`]
  }

  // maxBankroll (optional)
  if (stake.maxBankroll !== undefined) {
    if (!isPositiveNumber(stake.maxBankroll)) {
      fieldErrors['maxBankroll'] = ['maxBankroll must be a positive number']
    } else if (stake.unit === 'dollars' && isPositiveNumber(stake.amount) && stake.amount > stake.maxBankroll) {
      fieldErrors['amount'] = [
        ...(fieldErrors['amount'] ?? []),
        'amount must not exceed maxBankroll when unit is dollars',
      ]
    }
  }

  const allErrors = Object.values(fieldErrors).flat()
  return {
    valid: allErrors.length === 0,
    fieldErrors,
    allErrors,
  }
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

/** Trim whitespace; remove null bytes; normalize unicode whitespace to space */
export function sanitizeString(value: string): string {
  return value
    .replace(/\0/g, '')
    .replace(/[   -   　]/g, ' ')
    .trim()
}

/** lowercase, trim */
export function sanitizeEmail(value: string): string {
  return value.toLowerCase().trim()
}

/**
 * lowercase, replace spaces with -, remove non-alphanumeric except dash,
 * dedupe dashes, trim dashes
 */
export function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** trim, collapse multiple spaces to one, remove chars outside [a-zA-Z0-9 '-] */
export function sanitizeDisplayName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9 '\-]/g, '')
}

/** & → &amp; < → &lt; > → &gt; " → &quot; ' → &#x27; */
export function escapeForHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/** Escape special regex chars: . * + ? ^ $ { } [ ] | ( ) \ */
export function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()[\]|\\]/g, '\\$&')
}

/** suffix default '…'; truncate at maxLength chars total (including suffix) */
export function truncateForDisplay(value: string, maxLength: number, suffix = '…'): string {
  if (value.length <= maxLength) return value
  const cutoff = maxLength - suffix.length
  if (cutoff <= 0) return suffix.slice(0, maxLength)
  return value.slice(0, cutoff) + suffix
}

// ---------------------------------------------------------------------------
// Numeric utilities
// ---------------------------------------------------------------------------

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Math.round to N decimal places; handles floating-point noise */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

/**
 * Convert american odds to decimal odds.
 * +150 → 2.50; -110 → 1.9090...
 */
export function toDecimalOdds(americanOdds: number): number {
  if (americanOdds >= 100) {
    return 1 + americanOdds / 100
  }
  return 1 + 100 / Math.abs(americanOdds)
}

/**
 * Convert decimal odds to american odds.
 * >=2: (decimal-1)*100; <2: -100/(decimal-1); round to nearest int
 */
export function toAmericanOdds(decimalOdds: number): number {
  if (decimalOdds >= 2) {
    return Math.round((decimalOdds - 1) * 100)
  }
  return Math.round(-100 / (decimalOdds - 1))
}

/**
 * Implied probability from american odds.
 * pos: 100/(odds+100); neg: -odds/(-odds+100)
 */
export function impliedProbabilityFromAmerican(odds: number): number {
  if (odds >= 0) {
    return 100 / (odds + 100)
  }
  return (-odds) / (-odds + 100)
}

/**
 * Multiplicative devig: convert both to implied prob, normalize to sum=1.
 * Returns fair probabilities { home, away }.
 */
export function removeVig(homeOdds: number, awayOdds: number): { home: number; away: number } {
  const homeProb = impliedProbabilityFromAmerican(homeOdds)
  const awayProb = impliedProbabilityFromAmerican(awayOdds)
  const total = homeProb + awayProb
  return {
    home: homeProb / total,
    away: awayProb / total,
  }
}

// ---------------------------------------------------------------------------
// Array validators
// ---------------------------------------------------------------------------

export function validateNonEmptyArray<T>(arr: T[], fieldName?: string): ValidationResult {
  const label = fieldName ?? 'Array'
  if (!Array.isArray(arr) || arr.length === 0) {
    return fail(`${label} must not be empty`)
  }
  return ok()
}

export function validateArrayLength<T>(arr: T[], min: number, max: number, fieldName?: string): ValidationResult {
  const label = fieldName ?? 'Array'
  if (arr.length < min || arr.length > max) {
    return fail(`${label} must have between ${min} and ${max} items`)
  }
  return ok()
}

export function validateUniqueValues<T>(arr: T[], fieldName?: string): ValidationResult {
  const label = fieldName ?? 'Array'
  const seen = new Set<T>()
  for (const item of arr) {
    if (seen.has(item)) {
      return fail(`${label} must not contain duplicate values`)
    }
    seen.add(item)
  }
  return ok()
}

// ---------------------------------------------------------------------------
// Composite helpers
// ---------------------------------------------------------------------------

/** All must be valid; collect all errors */
export function composeValidations(...results: ValidationResult[]): ValidationResult {
  const errors: string[] = []
  for (const r of results) {
    if (!r.valid) {
      errors.push(...r.errors)
    }
  }
  return errors.length === 0 ? ok() : failMany(errors)
}

export function validateObject<T extends Record<string, unknown>>(
  obj: T,
  schema: { [K in keyof T]?: (value: T[K]) => ValidationResult }
): SchemaValidationResult {
  const fieldErrors: Record<string, string[]> = {}

  for (const key of Object.keys(schema) as (keyof T)[]) {
    const validator = schema[key]
    if (validator) {
      const result = validator(obj[key])
      if (!result.valid) {
        fieldErrors[key as string] = result.errors
      }
    }
  }

  const allErrors = Object.values(fieldErrors).flat()
  return {
    valid: allErrors.length === 0,
    fieldErrors,
    allErrors,
  }
}

// ---------------------------------------------------------------------------
// Date validators
// ---------------------------------------------------------------------------

export function isDateInFuture(date: Date): boolean {
  return date.getTime() > Date.now()
}

export function isDateInPast(date: Date): boolean {
  return date.getTime() < Date.now()
}

/**
 * reference defaults to now; true if |date - reference| <= days * 86400000
 */
export function isDateWithinDays(date: Date, days: number, reference?: Date): boolean {
  const ref = reference ?? new Date()
  return Math.abs(date.getTime() - ref.getTime()) <= days * 86400000
}

/** Must be within 14 days in future; not more than 1 year in past */
export function validateGameDate(date: Date): ValidationResult {
  const now = new Date()
  const msInDay = 86400000
  const diffMs = date.getTime() - now.getTime()

  if (diffMs > 14 * msInDay) {
    return fail('Game date must be within 14 days in the future')
  }
  if (diffMs < -365 * msInDay) {
    return fail('Game date must not be more than 1 year in the past')
  }
  return ok()
}

// ---------------------------------------------------------------------------
// Sports-domain specific
// ---------------------------------------------------------------------------

/**
 * Validate spread for a given sport.
 * Returns valid=true with a warning message if outside expected range.
 * NFL: -30 to +30; NBA: -50 to +50; MLB/NHL: -3 to +3; else -50 to +50
 */
export function validateSpread(spread: number, sport: string): ValidationResult {
  if (typeof spread !== 'number' || !isFinite(spread)) {
    return fail('spread must be a finite number')
  }

  let min: number
  let max: number

  switch (sport) {
    case 'NFL':
      min = -30; max = 30; break
    case 'NBA':
      min = -50; max = 50; break
    case 'MLB':
    case 'NHL':
      min = -3; max = 3; break
    default:
      min = -50; max = 50; break
  }

  if (spread < min || spread > max) {
    return {
      valid: true,
      errors: [`Warning: spread ${spread} is outside expected range [${min}, ${max}] for ${sport}`],
    }
  }
  return ok()
}

/**
 * Validate over/under total for a given sport.
 * Returns valid=true with a warning if outside expected range.
 * NFL: 30-80; NBA: 180-270; MLB: 5-15; NHL: 4-10; else 0-500
 */
export function validateOverUnder(total: number, sport: string): ValidationResult {
  if (typeof total !== 'number' || !isFinite(total)) {
    return fail('total must be a finite number')
  }

  let min: number
  let max: number

  switch (sport) {
    case 'NFL':
      min = 30; max = 80; break
    case 'NBA':
      min = 180; max = 270; break
    case 'MLB':
      min = 5; max = 15; break
    case 'NHL':
      min = 4; max = 10; break
    default:
      min = 0; max = 500; break
  }

  if (total < min || total > max) {
    return {
      valid: true,
      errors: [`Warning: total ${total} is outside expected range [${min}, ${max}] for ${sport}`],
    }
  }
  return ok()
}

/** Same list as validatePick */
export function isValidSport(sport: string): boolean {
  return (VALID_SPORTS as readonly string[]).includes(sport)
}

/**
 * Accepts "+150", "-110", "150", "-110", 1.5 (decimal), null-like → null
 * Returns american odds integer or null if unparseable
 */
export function normalizeOdds(odds: number | string): number | null {
  if (odds === null || odds === undefined || odds === '') return null

  // Numeric input
  if (typeof odds === 'number') {
    if (!isFinite(odds)) return null
    // If it looks like decimal odds (positive, between 1 and ~100 range but < 100)
    if (odds > 1 && odds < 100 && !Number.isInteger(odds)) {
      // Treat as decimal odds, convert to american
      return toAmericanOdds(odds)
    }
    // Otherwise treat as american odds
    if (isOddsAmerican(odds)) return Math.round(odds)
    return null
  }

  // String input
  const trimmed = String(odds).trim()
  if (trimmed === '') return null

  // Try to parse as number
  const parsed = Number(trimmed)
  if (isNaN(parsed)) return null
  if (!isFinite(parsed)) return null

  // If string representation has a decimal point, treat as decimal odds
  if (trimmed.includes('.')) {
    if (parsed > 1) {
      return toAmericanOdds(parsed)
    }
    return null
  }

  // Integer string — treat as american odds
  if (isOddsAmerican(parsed)) return Math.round(parsed)
  return null
}

// ---------------------------------------------------------------------------
// Primitive type guards (spec additions)
// ---------------------------------------------------------------------------

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/** Must be finite (not NaN/Infinity) */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value)
}

export function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/** Not null, not array */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isNull(value: unknown): value is null {
  return value === null
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined
}

export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

// ---------------------------------------------------------------------------
// String format validators (ValidationResult<string> style, spec additions)
// ---------------------------------------------------------------------------

/** RFC 5322 simplified; returns ValidationResult<string> */
export function validateEmail(value: unknown): ValidationResult & { value?: string } {
  if (!isString(value)) return { valid: false, errors: ['Email must be a string'] }
  if (!isEmail(value)) return { valid: false, errors: ['Invalid email address'] }
  return { valid: true, errors: [], value }
}

export function validateUrl(
  value: unknown,
  opts?: { protocols?: string[]; requireHttps?: boolean },
): ValidationResult & { value?: string } {
  const allowedProtocols = opts?.protocols ?? ['http', 'https']
  if (!isString(value)) return { valid: false, errors: ['URL must be a string'] }
  if (value.trim().length === 0) return { valid: false, errors: ['URL must not be empty'] }
  let u: URL
  try {
    u = new URL(value)
  } catch {
    return { valid: false, errors: ['Invalid URL'] }
  }
  const proto = u.protocol.replace(/:$/, '')
  if (!allowedProtocols.includes(proto)) {
    return { valid: false, errors: [`URL protocol must be one of: ${allowedProtocols.join(', ')}`] }
  }
  if (opts?.requireHttps && proto !== 'https') {
    return { valid: false, errors: ['URL must use HTTPS'] }
  }
  if (!u.hostname.includes('.')) {
    return { valid: false, errors: ['URL must have a valid hostname'] }
  }
  return { valid: true, errors: [], value }
}

export function validatePhone(
  value: unknown,
  opts?: { country?: 'US' | 'intl' },
): ValidationResult & { value?: string } {
  if (!isString(value)) return { valid: false, errors: ['Phone must be a string'] }
  const country = opts?.country ?? 'US'
  if (country === 'US') {
    const stripped = value.replace(/[\s\-()+.]/g, '')
    const digits = stripped.replace(/^\+?1/, '')
    if (!/^\d{10}$/.test(digits)) {
      return { valid: false, errors: ['US phone must have 10 digits'] }
    }
    return { valid: true, errors: [], value }
  }
  // E.164 international: +[1-15 digits]
  if (!/^\+[1-9]\d{1,14}$/.test(value)) {
    return { valid: false, errors: ['International phone must be in E.164 format (+[1-15 digits])'] }
  }
  return { valid: true, errors: [], value }
}

export function validatePostalCode(
  value: unknown,
  country: 'US' | 'CA' | 'UK' = 'US',
): ValidationResult & { value?: string } {
  if (!isString(value)) return { valid: false, errors: ['Postal code must be a string'] }
  if (country === 'US') {
    if (!/^\d{5}(-\d{4})?$/.test(value)) {
      return { valid: false, errors: ['US postal code must be 5 digits or 5+4 format'] }
    }
  } else if (country === 'CA') {
    if (!/^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i.test(value)) {
      return { valid: false, errors: ['CA postal code must match A1A 1A1 format'] }
    }
  } else if (country === 'UK') {
    if (!/^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(value)) {
      return { valid: false, errors: ['UK postal code is invalid'] }
    }
  }
  return { valid: true, errors: [], value }
}

/** Luhn algorithm + 13-19 digits after stripping spaces/dashes */
export function validateCreditCard(value: unknown): ValidationResult & { value?: string } {
  if (!isString(value)) return { valid: false, errors: ['Credit card must be a string'] }
  const stripped = value.replace(/[\s-]/g, '')
  if (!/^\d{13,19}$/.test(stripped)) {
    return { valid: false, errors: ['Credit card must have 13-19 digits'] }
  }
  // Luhn check
  let sum = 0
  let alternate = false
  for (let i = stripped.length - 1; i >= 0; i--) {
    let n = parseInt(stripped[i] ?? '0', 10)
    if (alternate) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alternate = !alternate
  }
  if (sum % 10 !== 0) {
    return { valid: false, errors: ['Credit card number failed Luhn check'] }
  }
  return { valid: true, errors: [], value: stripped }
}

export function validateIpv4(value: unknown): ValidationResult & { value?: string } {
  if (!isString(value)) return { valid: false, errors: ['IPv4 must be a string'] }
  const parts = value.split('.')
  if (parts.length !== 4) return { valid: false, errors: ['IPv4 must have four octets'] }
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return { valid: false, errors: ['IPv4 octets must be numeric'] }
    const n = parseInt(part, 10)
    if (n < 0 || n > 255) return { valid: false, errors: ['IPv4 octets must be 0-255'] }
  }
  return { valid: true, errors: [], value }
}

export function validateIpv6(value: unknown): ValidationResult & { value?: string } {
  if (!isString(value)) return { valid: false, errors: ['IPv6 must be a string'] }
  // Use URL parser trick for validation
  try {
    new URL(`http://[${value}]`)
    return { valid: true, errors: [], value }
  } catch {
    return { valid: false, errors: ['Invalid IPv6 address'] }
  }
}

export function validateDate(value: unknown): (ValidationResult & { value?: Date }) {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return { valid: false, errors: ['Invalid Date object'] }
    return { valid: true, errors: [], value }
  }
  if (!isString(value)) return { valid: false, errors: ['Date must be a string or Date'] }
  const d = new Date(value)
  if (isNaN(d.getTime())) return { valid: false, errors: ['Invalid date string'] }
  return { valid: true, errors: [], value: d }
}

export function validateDateString(
  value: unknown,
  format: 'ISO' | 'US' | 'EU' = 'ISO',
): ValidationResult & { value?: string } {
  if (!isString(value)) return { valid: false, errors: ['Date must be a string'] }
  if (format === 'ISO') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { valid: false, errors: ['Date must be in YYYY-MM-DD format'] }
    }
    if (isNaN(new Date(value).getTime())) {
      return { valid: false, errors: ['Invalid ISO date'] }
    }
  } else if (format === 'US') {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return { valid: false, errors: ['Date must be in MM/DD/YYYY format'] }
    }
    const parts = value.split('/').map(Number)
    const mm = parts[0] as number, dd = parts[1] as number, yyyy = parts[2] as number
    if (isNaN(new Date(yyyy, mm - 1, dd).getTime())) {
      return { valid: false, errors: ['Invalid US date'] }
    }
  } else if (format === 'EU') {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return { valid: false, errors: ['Date must be in DD/MM/YYYY format'] }
    }
    const parts = value.split('/').map(Number)
    const dd = parts[0] as number, mm = parts[1] as number, yyyy = parts[2] as number
    if (isNaN(new Date(yyyy, mm - 1, dd).getTime())) {
      return { valid: false, errors: ['Invalid EU date'] }
    }
  }
  return { valid: true, errors: [], value }
}

export function validateSlug(value: unknown): ValidationResult & { value?: string } {
  if (!isString(value)) return { valid: false, errors: ['Slug must be a string'] }
  if (!isSlug(value)) return { valid: false, errors: ['Invalid slug: use lowercase letters, numbers, and hyphens; no leading/trailing hyphens'] }
  return { valid: true, errors: [], value }
}

export function validateUsername(
  value: unknown,
  opts?: { minLength?: number; maxLength?: number; allowedChars?: RegExp },
): ValidationResult & { value?: string } {
  if (!isString(value)) return { valid: false, errors: ['Username must be a string'] }
  const min = opts?.minLength ?? 3
  const max = opts?.maxLength ?? 30
  const pattern = opts?.allowedChars ?? /^[a-zA-Z0-9_-]+$/
  if (value.length < min) return { valid: false, errors: [`Username must be at least ${min} characters`] }
  if (value.length > max) return { valid: false, errors: [`Username must be at most ${max} characters`] }
  if (!pattern.test(value)) return { valid: false, errors: ['Username contains invalid characters'] }
  return { valid: true, errors: [], value }
}

export function validatePassword(
  value: unknown,
  opts?: { minLength?: number; requireUppercase?: boolean; requireDigit?: boolean; requireSymbol?: boolean },
): ValidationResult & { value?: string } {
  if (!isString(value)) return { valid: false, errors: ['Password must be a string'] }
  const minLen = opts?.minLength ?? 8
  const requireUpper = opts?.requireUppercase ?? false
  const requireDigit = opts?.requireDigit ?? false
  const requireSymbol = opts?.requireSymbol ?? false
  const errors: string[] = []
  if (value.length < minLen) errors.push(`Password must be at least ${minLen} characters`)
  if (requireUpper && !/[A-Z]/.test(value)) errors.push('Password must contain an uppercase letter')
  if (requireDigit && !/\d/.test(value)) errors.push('Password must contain a digit')
  if (requireSymbol && !/[^a-zA-Z0-9]/.test(value)) errors.push('Password must contain a symbol')
  if (errors.length > 0) return { valid: false, errors }
  return { valid: true, errors: [], value }
}

export function validateHexColor(value: unknown): ValidationResult & { value?: string } {
  if (!isString(value)) return { valid: false, errors: ['Hex color must be a string'] }
  if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)) {
    return { valid: false, errors: ['Hex color must be #RGB or #RRGGBB'] }
  }
  return { valid: true, errors: [], value }
}

export function validateJSON(value: unknown): ValidationResult & { value?: unknown } {
  if (!isString(value)) return { valid: false, errors: ['JSON must be a string'] }
  try {
    const parsed: unknown = JSON.parse(value)
    return { valid: true, errors: [], value: parsed }
  } catch {
    return { valid: false, errors: ['Invalid JSON'] }
  }
}

// ---------------------------------------------------------------------------
// Numeric validators (spec additions)
// ---------------------------------------------------------------------------

export function validatePositive(value: unknown): ValidationResult & { value?: number } {
  if (!isNumber(value)) return { valid: false, errors: ['Value must be a finite number'] }
  if (value <= 0) return { valid: false, errors: ['Value must be positive'] }
  return { valid: true, errors: [], value }
}

export function validateNonNegative(value: unknown): ValidationResult & { value?: number } {
  if (!isNumber(value)) return { valid: false, errors: ['Value must be a finite number'] }
  if (value < 0) return { valid: false, errors: ['Value must be non-negative'] }
  return { valid: true, errors: [], value }
}

export function validatePercentage(value: unknown): ValidationResult & { value?: number } {
  if (!isNumber(value)) return { valid: false, errors: ['Percentage must be a finite number'] }
  if (value < 0 || value > 1) return { valid: false, errors: ['Percentage must be between 0.0 and 1.0'] }
  return { valid: true, errors: [], value }
}

export function validateOdds(value: unknown): ValidationResult & { value?: number } {
  if (!isNumber(value)) return { valid: false, errors: ['Odds must be a finite number'] }
  if (!isOddsAmerican(value)) return { valid: false, errors: ['Odds must be >= 100 or <= -100'] }
  return { valid: true, errors: [], value }
}

export function validateConfidence(value: unknown): ValidationResult & { value?: number } {
  if (!isNumber(value)) return { valid: false, errors: ['Confidence must be a finite number'] }
  if (value < 0 || value > 100) return { valid: false, errors: ['Confidence must be between 0 and 100'] }
  return { valid: true, errors: [], value }
}

export function validateProbability(value: unknown): ValidationResult & { value?: number } {
  return validatePercentage(value)
}

// ---------------------------------------------------------------------------
// Schema validation (spec additions)
// ---------------------------------------------------------------------------

export type SchemaFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date'

export interface SchemaField {
  type: SchemaFieldType
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  enum?: unknown[]
  items?: SchemaField
  properties?: Schema
}

export type Schema = Record<string, SchemaField>

function validateFieldValue(
  value: unknown,
  field: SchemaField,
  path: string,
): string[] {
  const errs: string[] = []

  // Type check
  let typeMismatch = false
  switch (field.type) {
    case 'string':
      if (typeof value !== 'string') { errs.push(`${path} must be a string`); typeMismatch = true }
      break
    case 'number':
      if (typeof value !== 'number' || !isFinite(value)) { errs.push(`${path} must be a finite number`); typeMismatch = true }
      break
    case 'boolean':
      if (typeof value !== 'boolean') { errs.push(`${path} must be a boolean`); typeMismatch = true }
      break
    case 'array':
      if (!Array.isArray(value)) { errs.push(`${path} must be an array`); typeMismatch = true }
      break
    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) { errs.push(`${path} must be an object`); typeMismatch = true }
      break
    case 'date':
      if (!(value instanceof Date) && typeof value !== 'string') { errs.push(`${path} must be a Date or date string`); typeMismatch = true }
      if (!typeMismatch) {
        const d = value instanceof Date ? value : new Date(value as string)
        if (isNaN(d.getTime())) { errs.push(`${path} is not a valid date`); typeMismatch = true }
      }
      break
  }

  if (typeMismatch) return errs

  // min/max
  if (field.min !== undefined) {
    if (field.type === 'string' && (value as string).length < field.min) {
      errs.push(`${path} must be at least ${field.min} characters`)
    } else if (field.type === 'number' && (value as number) < field.min) {
      errs.push(`${path} must be >= ${field.min}`)
    } else if (field.type === 'array' && (value as unknown[]).length < field.min) {
      errs.push(`${path} must have at least ${field.min} items`)
    }
  }
  if (field.max !== undefined) {
    if (field.type === 'string' && (value as string).length > field.max) {
      errs.push(`${path} must be at most ${field.max} characters`)
    } else if (field.type === 'number' && (value as number) > field.max) {
      errs.push(`${path} must be <= ${field.max}`)
    } else if (field.type === 'array' && (value as unknown[]).length > field.max) {
      errs.push(`${path} must have at most ${field.max} items`)
    }
  }

  // pattern (string only)
  if (field.pattern && field.type === 'string') {
    if (!field.pattern.test(value as string)) {
      errs.push(`${path} does not match required pattern`)
    }
  }

  // enum
  if (field.enum) {
    if (!field.enum.includes(value)) {
      errs.push(`${path} must be one of: ${field.enum.join(', ')}`)
    }
  }

  // nested array items
  if (field.type === 'array' && field.items) {
    for (let i = 0; i < (value as unknown[]).length; i++) {
      errs.push(...validateFieldValue((value as unknown[])[i], field.items, `${path}[${i}]`))
    }
  }

  // nested object properties
  if (field.type === 'object' && field.properties) {
    errs.push(...validateSchemaFields(value as Record<string, unknown>, field.properties, path))
  }

  return errs
}

function validateSchemaFields(
  obj: Record<string, unknown>,
  schema: Schema,
  prefix = '',
): string[] {
  const errs: string[] = []
  for (const [key, field] of Object.entries(schema)) {
    const path = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    const missing = value === undefined || value === null
    if (missing) {
      if (field.required) errs.push(`${path} is required`)
      continue
    }
    errs.push(...validateFieldValue(value, field, path))
  }
  return errs
}

export function validateSchema(
  value: unknown,
  schema: Schema,
): ValidationResult & { value?: Record<string, unknown> } {
  if (!isObject(value)) return { valid: false, errors: ['Value must be an object'] }
  const errs = validateSchemaFields(value, schema)
  if (errs.length > 0) return { valid: false, errors: errs }
  return { valid: true, errors: [], value }
}

export function coerceToSchema(
  value: unknown,
  schema: Schema,
): ValidationResult & { value?: Record<string, unknown> } {
  if (!isObject(value)) return { valid: false, errors: ['Value must be an object'] }
  const coerced: Record<string, unknown> = { ...value }
  for (const [key, field] of Object.entries(schema)) {
    const raw = coerced[key]
    if (raw === null || raw === undefined) continue
    if (field.type === 'number' && typeof raw === 'string') {
      const n = parseFloat(raw)
      if (!isNaN(n)) coerced[key] = n
    } else if (field.type === 'boolean' && typeof raw === 'string') {
      if (raw === 'true') coerced[key] = true
      else if (raw === 'false') coerced[key] = false
    } else if (field.type === 'date' && typeof raw === 'string') {
      const d = new Date(raw)
      if (!isNaN(d.getTime())) coerced[key] = d
    }
  }
  return validateSchema(coerced, schema)
}

// ---------------------------------------------------------------------------
// Enhanced sanitization (spec additions)
// ---------------------------------------------------------------------------

/** Remove all HTML tags */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}

/** & < > " ' → HTML entities */
export function escapeHtml(str: string): string {
  return escapeForHtml(str)
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\0/\\:*?"<>|]/g, '')
    .replace(/\.\./g, '')
    .trim()
    .slice(0, 255)
}

export function sanitizeNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  return isNaN(n) || !isFinite(n) ? fallback : n
}

export function normalizeEmail(email: string): string {
  const lower = email.toLowerCase().trim()
  const atIdx = lower.indexOf('@')
  if (atIdx === -1) return lower
  const local = lower.slice(0, atIdx)
  const domain = lower.slice(atIdx + 1)
  if (domain === 'gmail.com') {
    const plusIdx = local.indexOf('+')
    const base = plusIdx !== -1 ? local.slice(0, plusIdx) : local
    return base.replace(/\./g, '') + '@' + domain
  }
  return lower
}

export function normalizePhonenNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '1' + digits
  return digits
}

// ---------------------------------------------------------------------------
// Composing validators (spec additions)
// ---------------------------------------------------------------------------

type ValidatorResult<T> = ValidationResult & { value?: T }

export function required<T>(
  validator: (v: unknown) => ValidatorResult<T>,
): (v: unknown) => ValidatorResult<T> {
  return (v: unknown) => {
    if (v === null || v === undefined) {
      return { valid: false, errors: ['Value is required'] }
    }
    return validator(v)
  }
}

export function optional<T>(
  validator: (v: unknown) => ValidatorResult<T>,
): (v: unknown) => ValidatorResult<T | undefined> {
  return (v: unknown) => {
    if (v === null || v === undefined) {
      return { valid: true, errors: [], value: undefined }
    }
    return validator(v) as ValidatorResult<T | undefined>
  }
}

export function withDefault<T>(
  validator: (v: unknown) => ValidatorResult<T>,
  defaultValue: T,
): (v: unknown) => ValidatorResult<T> {
  return (v: unknown) => {
    if (v === null || v === undefined) {
      return { valid: true, errors: [], value: defaultValue }
    }
    return validator(v)
  }
}

export function validate<T>(
  value: unknown,
  ...validators: ((v: unknown) => ValidatorResult<T>)[]
): ValidatorResult<T> {
  const allErrors: string[] = []
  let lastValue: T | undefined
  for (const fn of validators) {
    const result = fn(value)
    if (!result.valid) {
      allErrors.push(...result.errors)
    } else {
      lastValue = result.value
    }
  }
  if (allErrors.length > 0) return { valid: false, errors: allErrors }
  return { valid: true, errors: [], value: lastValue }
}

export function combineResults<T>(results: ValidatorResult<unknown>[]): ValidatorResult<T> {
  const allErrors: string[] = []
  for (const r of results) {
    if (!r.valid) allErrors.push(...r.errors)
  }
  if (allErrors.length > 0) return { valid: false, errors: allErrors }
  return { valid: true, errors: [], value: results[results.length - 1]?.value as T }
}

// ---------------------------------------------------------------------------
// Sports-specific validators (spec additions)
// ---------------------------------------------------------------------------

export function validatePickLine(value: unknown): ValidatorResult<string> {
  if (!isString(value)) return { valid: false, errors: ['Pick line must be a string'] }
  const trimmed = value.trim()
  // TEAM +/-NUMBER or TEAM ML or OVER/UNDER NUMBER
  const spreadPattern = /^.+\s[+-]\d+(\.\d+)?$/i
  const mlPattern = /^.+\s+ML$/i
  const ouPattern = /^(OVER|UNDER)\s+\d+(\.\d+)?$/i
  if (spreadPattern.test(trimmed) || mlPattern.test(trimmed) || ouPattern.test(trimmed)) {
    return { valid: true, errors: [], value: trimmed }
  }
  return { valid: false, errors: ['Invalid pick line format. Use "TEAM +/-NUMBER", "TEAM ML", or "OVER/UNDER NUMBER"'] }
}

export function validateAmericanOdds(value: unknown): ValidatorResult<number> {
  return validateOdds(value)
}

const VALID_SPORT_NAMES = [
  'nfl', 'nba', 'mlb', 'nhl', 'ncaaf', 'ncaab', 'soccer', 'tennis', 'golf', 'mma', 'boxing', 'nascar',
] as const

export function validateSportName(value: unknown): ValidatorResult<string> {
  if (!isString(value)) return { valid: false, errors: ['Sport name must be a string'] }
  const lower = value.toLowerCase()
  if (!(VALID_SPORT_NAMES as readonly string[]).includes(lower)) {
    return { valid: false, errors: [`Sport must be one of: ${VALID_SPORT_NAMES.join(', ')}`] }
  }
  return { valid: true, errors: [], value: lower }
}

export function validatePickTier(value: unknown): ValidatorResult<string> {
  if (!isString(value)) return { valid: false, errors: ['Pick tier must be a string'] }
  const valid = ['free', 'pro', 'elite'] as const
  if (!(valid as readonly string[]).includes(value)) {
    return { valid: false, errors: [`Pick tier must be one of: ${valid.join(', ')}`] }
  }
  return { valid: true, errors: [], value }
}

export function validateGameId(value: unknown): ValidatorResult<string> {
  if (!isString(value)) return { valid: false, errors: ['Game ID must be a string'] }
  if (value.trim().length === 0) return { valid: false, errors: ['Game ID must not be empty'] }
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    return { valid: false, errors: ['Game ID may only contain alphanumeric characters, underscores, and hyphens'] }
  }
  return { valid: true, errors: [], value }
}
