/**
 * Tests for validation-utils.ts
 * Covers primitive validators, domain validators, sanitizers, numeric utils,
 * array validators, composite helpers, date validators, and sports-domain checks.
 */
import { describe, it, expect } from 'vitest'
import {
  // Types
  ValidationResult,
  SchemaValidationResult,
  // Primitives
  isNonEmpty,
  isEmail,
  isUrl,
  isPhoneNumber,
  isAlphanumeric,
  isSlug,
  isUuid,
  isIsoDate,
  isIsoDateTime,
  isPositiveNumber,
  isPercentage,
  isOddsAmerican,
  isOddsDecimal,
  isConfidenceScore,
  // String validators
  validateRequired,
  validateMinLength,
  validateMaxLength,
  validatePattern,
  validateRange,
  // Domain validators
  validatePick,
  validateUserInput,
  validateStake,
  // Sanitization
  sanitizeString,
  sanitizeEmail,
  sanitizeSlug,
  sanitizeDisplayName,
  escapeForHtml,
  escapeForRegex,
  truncateForDisplay,
  // Numeric
  clamp,
  roundTo,
  toDecimalOdds,
  toAmericanOdds,
  impliedProbabilityFromAmerican,
  removeVig,
  // Array validators
  validateNonEmptyArray,
  validateArrayLength,
  validateUniqueValues,
  // Composite
  composeValidations,
  validateObject,
  // Date validators
  isDateInFuture,
  isDateInPast,
  isDateWithinDays,
  validateGameDate,
  // Sports-domain
  validateSpread,
  validateOverUnder,
  isValidSport,
  normalizeOdds,
} from '@/lib/utils/validation-utils'

// ---------------------------------------------------------------------------
// isEmail
// ---------------------------------------------------------------------------
describe('isEmail', () => {
  it('accepts a standard email', () => {
    expect(isEmail('user@example.com')).toBe(true)
  })

  it('accepts email with subdomain', () => {
    expect(isEmail('user@mail.example.com')).toBe(true)
  })

  it('accepts email with plus sign in local part', () => {
    expect(isEmail('user+tag@example.com')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isEmail('')).toBe(false)
  })

  it('rejects missing @', () => {
    expect(isEmail('userexample.com')).toBe(false)
  })

  it('rejects multiple @ signs', () => {
    expect(isEmail('user@@example.com')).toBe(false)
  })

  it('rejects leading dot in local part', () => {
    expect(isEmail('.user@example.com')).toBe(false)
  })

  it('rejects trailing dot in local part', () => {
    expect(isEmail('user.@example.com')).toBe(false)
  })

  it('rejects consecutive dots in local part', () => {
    expect(isEmail('us..er@example.com')).toBe(false)
  })

  it('rejects missing TLD', () => {
    expect(isEmail('user@example')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isUrl
// ---------------------------------------------------------------------------
describe('isUrl', () => {
  it('accepts http URL', () => {
    expect(isUrl('http://example.com')).toBe(true)
  })

  it('accepts https URL', () => {
    expect(isUrl('https://example.com/path?q=1')).toBe(true)
  })

  it('rejects missing protocol', () => {
    expect(isUrl('example.com')).toBe(false)
  })

  it('rejects ftp protocol', () => {
    expect(isUrl('ftp://example.com')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isUrl('')).toBe(false)
  })

  it('rejects URL without dot in hostname', () => {
    expect(isUrl('http://localhost')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isSlug
// ---------------------------------------------------------------------------
describe('isSlug', () => {
  it('accepts valid lowercase slug', () => {
    expect(isSlug('my-great-post')).toBe(true)
  })

  it('accepts slug with numbers', () => {
    expect(isSlug('post-123')).toBe(true)
  })

  it('rejects uppercase letters', () => {
    expect(isSlug('My-Post')).toBe(false)
  })

  it('rejects leading dash', () => {
    expect(isSlug('-my-post')).toBe(false)
  })

  it('rejects trailing dash', () => {
    expect(isSlug('my-post-')).toBe(false)
  })

  it('rejects consecutive dashes', () => {
    expect(isSlug('my--post')).toBe(false)
  })

  it('rejects spaces', () => {
    expect(isSlug('my post')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isSlug('')).toBe(false)
  })

  it('accepts single word', () => {
    expect(isSlug('nfl')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// isUuid
// ---------------------------------------------------------------------------
describe('isUuid', () => {
  it('rejects UUID with version digit 3 (not v4)', () => {
    // Third segment starts with 3, not 4
    expect(isUuid('550e8400-e29b-31d4-a716-446655440000')).toBe(false)
  })

  it('accepts a valid UUID v4', () => {
    expect(isUuid('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true)
  })

  it('accepts another valid UUID v4', () => {
    expect(isUuid('550e8400-e29b-4d4a-a716-446655440000')).toBe(true)
  })

  it('rejects UUID with wrong version digit', () => {
    // Version digit should be 4
    expect(isUuid('550e8400-e29b-31d4-a716-446655440000')).toBe(false)
  })

  it('rejects UUID without dashes', () => {
    expect(isUuid('550e8400e29b41d4a716446655440000')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isUuid('')).toBe(false)
  })

  it('rejects UUID with invalid variant digit', () => {
    // Variant digits should be [89ab]
    expect(isUuid('f47ac10b-58cc-4372-c567-0e02b2c3d479')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isOddsAmerican
// ---------------------------------------------------------------------------
describe('isOddsAmerican', () => {
  it('+100 is valid', () => {
    expect(isOddsAmerican(100)).toBe(true)
  })

  it('-100 is valid', () => {
    expect(isOddsAmerican(-100)).toBe(true)
  })

  it('+150 is valid', () => {
    expect(isOddsAmerican(150)).toBe(true)
  })

  it('-110 is valid', () => {
    expect(isOddsAmerican(-110)).toBe(true)
  })

  it('-50 is invalid (between -100 and 100)', () => {
    expect(isOddsAmerican(-50)).toBe(false)
  })

  it('50 is invalid (between -100 and 100)', () => {
    expect(isOddsAmerican(50)).toBe(false)
  })

  it('0 is invalid', () => {
    expect(isOddsAmerican(0)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// validatePick
// ---------------------------------------------------------------------------
describe('validatePick', () => {
  const validPick = {
    sport: 'NFL',
    gameId: 'game-123',
    pickType: 'spread',
    confidence: 75,
  }

  it('accepts a valid pick', () => {
    const result = validatePick(validPick)
    expect(result.valid).toBe(true)
    expect(result.allErrors).toHaveLength(0)
  })

  it('rejects pick with missing sport', () => {
    const result = validatePick({ ...validPick, sport: '' })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['sport']).toBeDefined()
  })

  it('rejects pick with invalid sport', () => {
    const result = validatePick({ ...validPick, sport: 'BADMINTON' })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['sport']).toBeDefined()
  })

  it('rejects pick with invalid confidence (above 100)', () => {
    const result = validatePick({ ...validPick, confidence: 150 })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['confidence']).toBeDefined()
  })

  it('rejects pick with invalid confidence (non-integer)', () => {
    const result = validatePick({ ...validPick, confidence: 75.5 })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['confidence']).toBeDefined()
  })

  it('rejects pick with invalid odds', () => {
    const result = validatePick({ ...validPick, odds: -50 })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['odds']).toBeDefined()
  })

  it('accepts pick with valid odds', () => {
    const result = validatePick({ ...validPick, odds: -110 })
    expect(result.valid).toBe(true)
  })

  it('rejects pick with invalid modelVersion', () => {
    const result = validatePick({ ...validPick, modelVersion: '1.0.0' })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['modelVersion']).toBeDefined()
  })

  it('accepts pick with valid modelVersion', () => {
    const result = validatePick({ ...validPick, modelVersion: 'v1.2.3' })
    expect(result.valid).toBe(true)
  })

  it('rejects pick with invalid pickType', () => {
    const result = validatePick({ ...validPick, pickType: 'parlay' })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['pickType']).toBeDefined()
  })

  it('accepts all valid sports', () => {
    const sports = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'MLS', 'tennis', 'golf', 'boxing', 'UFC']
    for (const sport of sports) {
      const result = validatePick({ ...validPick, sport })
      expect(result.fieldErrors['sport']).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// validateUserInput
// ---------------------------------------------------------------------------
describe('validateUserInput', () => {
  it('accepts valid input', () => {
    const result = validateUserInput({ email: 'test@example.com' })
    expect(result.valid).toBe(true)
  })

  it('rejects bad email', () => {
    const result = validateUserInput({ email: 'not-an-email' })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['email']).toBeDefined()
  })

  it('rejects empty email', () => {
    const result = validateUserInput({ email: '' })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['email']).toBeDefined()
  })

  it('rejects displayName that is too short', () => {
    const result = validateUserInput({ email: 'test@example.com', displayName: 'A' })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['displayName']).toBeDefined()
  })

  it('rejects displayName with special chars', () => {
    const result = validateUserInput({ email: 'test@example.com', displayName: 'John<script>' })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['displayName']).toBeDefined()
  })

  it('accepts displayName with apostrophe and hyphen', () => {
    const result = validateUserInput({ email: 'test@example.com', displayName: "O'Brien-Smith" })
    expect(result.valid).toBe(true)
  })

  it('rejects invalid subscriptionTier', () => {
    const result = validateUserInput({ email: 'test@example.com', subscriptionTier: 'premium' })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['subscriptionTier']).toBeDefined()
  })

  it('accepts valid subscriptionTier', () => {
    for (const tier of ['free', 'pro', 'elite']) {
      const result = validateUserInput({ email: 'test@example.com', subscriptionTier: tier })
      expect(result.fieldErrors['subscriptionTier']).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// validateStake
// ---------------------------------------------------------------------------
describe('validateStake', () => {
  it('accepts valid units stake', () => {
    const result = validateStake({ amount: 2, unit: 'units' })
    expect(result.valid).toBe(true)
  })

  it('rejects negative amount', () => {
    const result = validateStake({ amount: -5, unit: 'units' })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['amount']).toBeDefined()
  })

  it('rejects zero amount', () => {
    const result = validateStake({ amount: 0, unit: 'dollars' })
    expect(result.valid).toBe(false)
  })

  it('rejects percent over 100', () => {
    const result = validateStake({ amount: 150, unit: 'percent' })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['amount']).toBeDefined()
  })

  it('accepts percent at boundary (100)', () => {
    const result = validateStake({ amount: 100, unit: 'percent' })
    expect(result.valid).toBe(true)
  })

  it('rejects units below minimum (0.05)', () => {
    const result = validateStake({ amount: 0.05, unit: 'units' })
    expect(result.valid).toBe(false)
  })

  it('rejects dollars exceeding maxBankroll', () => {
    const result = validateStake({ amount: 1000, unit: 'dollars', maxBankroll: 500 })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['amount']).toBeDefined()
  })

  it('accepts dollars within maxBankroll', () => {
    const result = validateStake({ amount: 100, unit: 'dollars', maxBankroll: 1000 })
    expect(result.valid).toBe(true)
  })

  it('rejects negative maxBankroll', () => {
    const result = validateStake({ amount: 10, unit: 'dollars', maxBankroll: -100 })
    expect(result.valid).toBe(false)
    expect(result.fieldErrors['maxBankroll']).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// sanitizeSlug
// ---------------------------------------------------------------------------
describe('sanitizeSlug', () => {
  it('converts spaces to dashes', () => {
    expect(sanitizeSlug('my great post')).toBe('my-great-post')
  })

  it('removes special chars', () => {
    expect(sanitizeSlug('hello! world')).toBe('hello-world')
  })

  it('lowercases', () => {
    expect(sanitizeSlug('NFL Picks')).toBe('nfl-picks')
  })

  it('dedupes dashes', () => {
    expect(sanitizeSlug('hello   world')).toBe('hello-world')
  })

  it('trims leading/trailing dashes', () => {
    expect(sanitizeSlug('  -hello-  ')).toBe('hello')
  })

  it('removes non-alphanumeric', () => {
    expect(sanitizeSlug('abc@#$def')).toBe('abcdef')
  })
})

// ---------------------------------------------------------------------------
// escapeForHtml
// ---------------------------------------------------------------------------
describe('escapeForHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeForHtml('a & b')).toBe('a &amp; b')
  })

  it('escapes less-than', () => {
    expect(escapeForHtml('<div>')).toBe('&lt;div&gt;')
  })

  it('escapes greater-than', () => {
    expect(escapeForHtml('a > b')).toBe('a &gt; b')
  })

  it('escapes double quote', () => {
    expect(escapeForHtml('"hello"')).toBe('&quot;hello&quot;')
  })

  it("escapes single quote", () => {
    expect(escapeForHtml("it's")).toBe("it&#x27;s")
  })

  it('escapes all 5 in one string', () => {
    const input = `<a href="foo" title='bar'>it & them</a>`
    const result = escapeForHtml(input)
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
    expect(result).toContain('&quot;')
    expect(result).toContain('&#x27;')
    expect(result).toContain('&amp;')
  })
})

// ---------------------------------------------------------------------------
// toDecimalOdds
// ---------------------------------------------------------------------------
describe('toDecimalOdds', () => {
  it('+150 → 2.5', () => {
    expect(toDecimalOdds(150)).toBeCloseTo(2.5, 4)
  })

  it('+100 → 2.0', () => {
    expect(toDecimalOdds(100)).toBeCloseTo(2.0, 4)
  })

  it('-110 → ~1.9091', () => {
    expect(toDecimalOdds(-110)).toBeCloseTo(1.9091, 3)
  })

  it('-200 → 1.5', () => {
    expect(toDecimalOdds(-200)).toBeCloseTo(1.5, 4)
  })

  it('+300 → 4.0', () => {
    expect(toDecimalOdds(300)).toBeCloseTo(4.0, 4)
  })
})

// ---------------------------------------------------------------------------
// toAmericanOdds
// ---------------------------------------------------------------------------
describe('toAmericanOdds', () => {
  it('2.5 → +150', () => {
    expect(toAmericanOdds(2.5)).toBe(150)
  })

  it('2.0 → +100', () => {
    expect(toAmericanOdds(2.0)).toBe(100)
  })

  it('~1.9091 → -110', () => {
    expect(toAmericanOdds(1 + 100 / 110)).toBe(-110)
  })

  it('1.5 → -200', () => {
    expect(toAmericanOdds(1.5)).toBe(-200)
  })

  it('4.0 → +300', () => {
    expect(toAmericanOdds(4.0)).toBe(300)
  })
})

// ---------------------------------------------------------------------------
// impliedProbabilityFromAmerican
// ---------------------------------------------------------------------------
describe('impliedProbabilityFromAmerican', () => {
  it('-110 ≈ 0.524', () => {
    expect(impliedProbabilityFromAmerican(-110)).toBeCloseTo(0.5238, 3)
  })

  it('+150 ≈ 0.4', () => {
    expect(impliedProbabilityFromAmerican(150)).toBeCloseTo(0.4, 4)
  })

  it('-100 = 0.5', () => {
    expect(impliedProbabilityFromAmerican(-100)).toBeCloseTo(0.5, 4)
  })

  it('+100 = 0.5', () => {
    expect(impliedProbabilityFromAmerican(100)).toBeCloseTo(0.5, 4)
  })

  it('+200 ≈ 0.333', () => {
    expect(impliedProbabilityFromAmerican(200)).toBeCloseTo(0.3333, 3)
  })
})

// ---------------------------------------------------------------------------
// removeVig
// ---------------------------------------------------------------------------
describe('removeVig', () => {
  it('home + away fair probs sum to 1', () => {
    const result = removeVig(-110, -110)
    expect(result.home + result.away).toBeCloseTo(1.0, 10)
  })

  it('even game with vig gives 0.5/0.5 after devig', () => {
    const result = removeVig(-110, -110)
    expect(result.home).toBeCloseTo(0.5, 4)
    expect(result.away).toBeCloseTo(0.5, 4)
  })

  it('asymmetric odds: favorite has higher probability', () => {
    const result = removeVig(-150, +130)
    expect(result.home).toBeGreaterThan(result.away)
    expect(result.home + result.away).toBeCloseTo(1.0, 10)
  })

  it('devig removes excess probability', () => {
    // Raw implied probs sum to > 1 due to vig
    const homeRaw = impliedProbabilityFromAmerican(-110)
    const awayRaw = impliedProbabilityFromAmerican(-110)
    expect(homeRaw + awayRaw).toBeGreaterThan(1.0)

    const result = removeVig(-110, -110)
    expect(result.home + result.away).toBeCloseTo(1.0, 10)
  })
})

// ---------------------------------------------------------------------------
// composeValidations
// ---------------------------------------------------------------------------
describe('composeValidations', () => {
  it('all valid results → valid', () => {
    const r1: ValidationResult = { valid: true, errors: [] }
    const r2: ValidationResult = { valid: true, errors: [] }
    const composed = composeValidations(r1, r2)
    expect(composed.valid).toBe(true)
    expect(composed.errors).toHaveLength(0)
  })

  it('one invalid result → invalid with its errors', () => {
    const r1: ValidationResult = { valid: true, errors: [] }
    const r2: ValidationResult = { valid: false, errors: ['Something is wrong'] }
    const composed = composeValidations(r1, r2)
    expect(composed.valid).toBe(false)
    expect(composed.errors).toContain('Something is wrong')
  })

  it('multiple invalid results → all errors collected', () => {
    const r1: ValidationResult = { valid: false, errors: ['Error A'] }
    const r2: ValidationResult = { valid: false, errors: ['Error B', 'Error C'] }
    const composed = composeValidations(r1, r2)
    expect(composed.valid).toBe(false)
    expect(composed.errors).toHaveLength(3)
    expect(composed.errors).toContain('Error A')
    expect(composed.errors).toContain('Error B')
    expect(composed.errors).toContain('Error C')
  })

  it('no arguments → valid', () => {
    const composed = composeValidations()
    expect(composed.valid).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validateGameDate
// ---------------------------------------------------------------------------
describe('validateGameDate', () => {
  it('accepts a date 3 days in future', () => {
    const future = new Date(Date.now() + 3 * 86400000)
    const result = validateGameDate(future)
    expect(result.valid).toBe(true)
  })

  it('rejects a date 15 days in future (> 14 days)', () => {
    const tooFar = new Date(Date.now() + 15 * 86400000)
    const result = validateGameDate(tooFar)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('14 days')
  })

  it('accepts a date 6 months in past', () => {
    const pastDate = new Date(Date.now() - 180 * 86400000)
    const result = validateGameDate(pastDate)
    expect(result.valid).toBe(true)
  })

  it('rejects a date more than 1 year in past', () => {
    const tooOld = new Date(Date.now() - 400 * 86400000)
    const result = validateGameDate(tooOld)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('1 year')
  })
})

// ---------------------------------------------------------------------------
// validateSpread
// ---------------------------------------------------------------------------
describe('validateSpread', () => {
  it('NFL spread within normal range returns valid with no warning', () => {
    const result = validateSpread(-7, 'NFL')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('NFL extreme spread value returns valid=true with warning', () => {
    const result = validateSpread(-35, 'NFL')
    expect(result.valid).toBe(true)
    expect(result.errors[0]).toContain('Warning')
  })

  it('NBA spread within range', () => {
    const result = validateSpread(10, 'NBA')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('MLB extreme spread returns warning', () => {
    const result = validateSpread(5, 'MLB')
    expect(result.valid).toBe(true)
    expect(result.errors[0]).toContain('Warning')
  })

  it('invalid non-number returns invalid', () => {
    // @ts-expect-error - testing runtime behavior
    const result = validateSpread('abc', 'NFL')
    expect(result.valid).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// normalizeOdds
// ---------------------------------------------------------------------------
describe('normalizeOdds', () => {
  it('parses "+150" string → 150', () => {
    expect(normalizeOdds('+150')).toBe(150)
  })

  it('parses "-110" string → -110', () => {
    expect(normalizeOdds('-110')).toBe(-110)
  })

  it('parses "150" string → 150', () => {
    expect(normalizeOdds('150')).toBe(150)
  })

  it('parses "-110" numeric → -110', () => {
    expect(normalizeOdds(-110)).toBe(-110)
  })

  it('parses 150 numeric → 150', () => {
    expect(normalizeOdds(150)).toBe(150)
  })

  it('converts decimal odds 2.5 → +150', () => {
    expect(normalizeOdds(2.5)).toBe(150)
  })

  it('converts decimal odds string "2.5" → +150', () => {
    expect(normalizeOdds('2.5')).toBe(150)
  })

  it('returns null for empty string', () => {
    expect(normalizeOdds('')).toBeNull()
  })

  it('returns null for non-numeric string', () => {
    expect(normalizeOdds('abc')).toBeNull()
  })

  it('returns null for invalid american odds (-50)', () => {
    expect(normalizeOdds(-50)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Additional coverage
// ---------------------------------------------------------------------------
describe('isNonEmpty', () => {
  it('returns true for non-empty string', () => {
    expect(isNonEmpty('hello')).toBe(true)
  })

  it('returns false for empty string', () => {
    expect(isNonEmpty('')).toBe(false)
  })

  it('returns false for whitespace only', () => {
    expect(isNonEmpty('   ')).toBe(false)
  })
})

describe('isConfidenceScore', () => {
  it('accepts 0', () => expect(isConfidenceScore(0)).toBe(true))
  it('accepts 100', () => expect(isConfidenceScore(100)).toBe(true))
  it('accepts 75', () => expect(isConfidenceScore(75)).toBe(true))
  it('rejects 75.5 (non-integer)', () => expect(isConfidenceScore(75.5)).toBe(false))
  it('rejects -1', () => expect(isConfidenceScore(-1)).toBe(false))
  it('rejects 101', () => expect(isConfidenceScore(101)).toBe(false))
})

describe('isValidSport', () => {
  it('returns true for NFL', () => expect(isValidSport('NFL')).toBe(true))
  it('returns true for UFC', () => expect(isValidSport('UFC')).toBe(true))
  it('returns true for tennis', () => expect(isValidSport('tennis')).toBe(true))
  it('returns false for unknown sport', () => expect(isValidSport('CRICKET')).toBe(false))
  it('returns false for empty string', () => expect(isValidSport('')).toBe(false))
})

describe('clamp', () => {
  it('clamps below min', () => expect(clamp(-5, 0, 100)).toBe(0))
  it('clamps above max', () => expect(clamp(200, 0, 100)).toBe(100))
  it('returns value within range', () => expect(clamp(50, 0, 100)).toBe(50))
})

describe('roundTo', () => {
  it('rounds to 2 decimals', () => expect(roundTo(1.235, 2)).toBe(1.24))
  it('rounds to 0 decimals', () => expect(roundTo(1.5, 0)).toBe(2))
  it('handles integer input', () => expect(roundTo(5, 2)).toBe(5))
  it('rounds to 4 decimals', () => expect(roundTo(1.23456, 4)).toBe(1.2346))
})

describe('sanitizeEmail', () => {
  it('lowercases and trims', () => {
    expect(sanitizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com')
  })
})

describe('truncateForDisplay', () => {
  it('does not truncate short strings', () => {
    expect(truncateForDisplay('hello', 10)).toBe('hello')
  })

  it('truncates at maxLength with default suffix', () => {
    const result = truncateForDisplay('hello world', 8)
    expect(result.length).toBe(8)
    expect(result.endsWith('…')).toBe(true)
  })

  it('uses custom suffix', () => {
    const result = truncateForDisplay('hello world', 8, '...')
    expect(result.endsWith('...')).toBe(true)
  })
})

describe('isIsoDate', () => {
  it('accepts valid ISO date', () => expect(isIsoDate('2025-06-01')).toBe(true))
  it('rejects datetime string', () => expect(isIsoDate('2025-06-01T12:00:00Z')).toBe(false))
  it('rejects invalid date', () => expect(isIsoDate('2025-13-01')).toBe(false))
})

describe('isIsoDateTime', () => {
  it('accepts datetime with Z', () => expect(isIsoDateTime('2025-06-01T12:00:00Z')).toBe(true))
  it('accepts datetime with offset', () => expect(isIsoDateTime('2025-06-01T12:00:00+05:00')).toBe(true))
  it('rejects date-only string', () => expect(isIsoDateTime('2025-06-01')).toBe(false))
})

describe('validateNonEmptyArray', () => {
  it('passes non-empty array', () => {
    const result = validateNonEmptyArray([1, 2, 3])
    expect(result.valid).toBe(true)
  })

  it('fails empty array', () => {
    const result = validateNonEmptyArray([])
    expect(result.valid).toBe(false)
  })
})

describe('validateUniqueValues', () => {
  it('passes array with unique values', () => {
    const result = validateUniqueValues([1, 2, 3])
    expect(result.valid).toBe(true)
  })

  it('fails array with duplicate values', () => {
    const result = validateUniqueValues([1, 2, 2])
    expect(result.valid).toBe(false)
  })
})

describe('validateOverUnder', () => {
  it('NBA total within range', () => {
    const result = validateOverUnder(220, 'NBA')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('NFL total outside range returns warning', () => {
    const result = validateOverUnder(100, 'NFL')
    expect(result.valid).toBe(true)
    expect(result.errors[0]).toContain('Warning')
  })
})
