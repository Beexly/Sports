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
