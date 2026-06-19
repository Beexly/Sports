import { describe, expect, it } from "vitest";
import {
  gcd,
  lcm,
  gcdMany,
  lcmMany,
  divides,
  divisors,
  divisorCount,
  divisorSum,
  isPrime,
  primesUpTo,
  nthPrime,
  primeFactorization,
  primeFactors,
  nextPrime,
  isCoprime,
  mod,
  modPow,
  modInverse,
  extendedGcd,
  crt,
  isPerfect,
  isAbundant,
  isDeficient,
  isPerfectSquare,
  isPerfectPower,
  isPalindromeNumber,
  isArmstrong,
  fibonacci,
  fibonacciSequence,
  factorial,
  triangularNumber,
  catalanNumber,
  collatzSteps,
  eulerTotient,
  mobius,
  digitSum,
  digitalRoot,
  numberOfDigits,
  binomial,
  permutations,
  partitions,
  bellNumber,
} from "@/lib/math/number-theory";

// ===========================================================================
// 1. Divisibility & GCD
// ===========================================================================

describe("gcd", () => {
  it("computes gcd(48, 18) = 6", () => {
    expect(gcd(48, 18)).toBe(6);
  });
  it("is commutative", () => {
    expect(gcd(18, 48)).toBe(6);
  });
  it("gcd(0, 0) = 0", () => {
    expect(gcd(0, 0)).toBe(0);
  });
  it("gcd(n, 0) = |n|", () => {
    expect(gcd(7, 0)).toBe(7);
    expect(gcd(0, 7)).toBe(7);
  });
  it("handles negatives via abs", () => {
    expect(gcd(-48, 18)).toBe(6);
    expect(gcd(48, -18)).toBe(6);
    expect(gcd(-48, -18)).toBe(6);
  });
  it("coprime numbers yield 1", () => {
    expect(gcd(17, 13)).toBe(1);
  });
  it("gcd(100, 10) = 10", () => {
    expect(gcd(100, 10)).toBe(10);
  });
  it("gcd of equal numbers is the number", () => {
    expect(gcd(42, 42)).toBe(42);
  });
});

describe("lcm", () => {
  it("lcm(4, 6) = 12", () => {
    expect(lcm(4, 6)).toBe(12);
  });
  it("returns 0 when either is 0", () => {
    expect(lcm(0, 5)).toBe(0);
    expect(lcm(5, 0)).toBe(0);
    expect(lcm(0, 0)).toBe(0);
  });
  it("lcm(21, 6) = 42", () => {
    expect(lcm(21, 6)).toBe(42);
  });
  it("handles negatives", () => {
    expect(lcm(-4, 6)).toBe(12);
  });
  it("lcm of coprimes is the product", () => {
    expect(lcm(7, 5)).toBe(35);
  });
});

describe("gcdMany", () => {
  it("returns 0 for empty list", () => {
    expect(gcdMany([])).toBe(0);
  });
  it("gcd of [48, 18, 30] = 6", () => {
    expect(gcdMany([48, 18, 30])).toBe(6);
  });
  it("single element returns its abs", () => {
    expect(gcdMany([-9])).toBe(9);
  });
  it("short-circuits at 1", () => {
    expect(gcdMany([13, 17, 4, 100])).toBe(1);
  });
  it("gcd of [12, 24, 36] = 12", () => {
    expect(gcdMany([12, 24, 36])).toBe(12);
  });
});

describe("lcmMany", () => {
  it("returns 0 for empty list", () => {
    expect(lcmMany([])).toBe(0);
  });
  it("lcm of [4, 6, 8] = 24", () => {
    expect(lcmMany([4, 6, 8])).toBe(24);
  });
  it("returns 0 if any element is 0", () => {
    expect(lcmMany([4, 0, 8])).toBe(0);
  });
  it("lcm of [2, 3, 5] = 30", () => {
    expect(lcmMany([2, 3, 5])).toBe(30);
  });
  it("single element returns its abs", () => {
    expect(lcmMany([7])).toBe(7);
  });
});

describe("divides", () => {
  it("3 divides 12", () => {
    expect(divides(3, 12)).toBe(true);
  });
  it("5 does not divide 12", () => {
    expect(divides(5, 12)).toBe(false);
  });
  it("everything divides 0 except handled by 0", () => {
    expect(divides(7, 0)).toBe(true);
  });
  it("0 divides only 0", () => {
    expect(divides(0, 0)).toBe(true);
    expect(divides(0, 5)).toBe(false);
  });
  it("handles negatives", () => {
    expect(divides(-3, 12)).toBe(true);
    expect(divides(3, -12)).toBe(true);
  });
  it("1 divides everything", () => {
    expect(divides(1, 99)).toBe(true);
  });
});

describe("divisors", () => {
  it("divisors of 12 are [1,2,3,4,6,12]", () => {
    expect(divisors(12)).toEqual([1, 2, 3, 4, 6, 12]);
  });
  it("divisors of 1 are [1]", () => {
    expect(divisors(1)).toEqual([1]);
  });
  it("divisors of a prime are [1, p]", () => {
    expect(divisors(13)).toEqual([1, 13]);
  });
  it("divisors of a perfect square include the root once", () => {
    expect(divisors(36)).toEqual([1, 2, 3, 4, 6, 9, 12, 18, 36]);
  });
  it("returns empty for n <= 0", () => {
    expect(divisors(0)).toEqual([]);
    expect(divisors(-12)).toEqual([]);
  });
  it("returns sorted ascending", () => {
    const d = divisors(60);
    const sorted = [...d].sort((a, b) => a - b);
    expect(d).toEqual(sorted);
  });
});

describe("divisorCount", () => {
  it("12 has 6 divisors", () => {
    expect(divisorCount(12)).toBe(6);
  });
  it("prime has 2 divisors", () => {
    expect(divisorCount(13)).toBe(2);
  });
  it("1 has 1 divisor", () => {
    expect(divisorCount(1)).toBe(1);
  });
  it("returns 0 for n <= 0", () => {
    expect(divisorCount(0)).toBe(0);
    expect(divisorCount(-5)).toBe(0);
  });
  it("matches divisors().length", () => {
    expect(divisorCount(360)).toBe(divisors(360).length);
  });
});

describe("divisorSum", () => {
  it("sum of divisors of 12 = 28", () => {
    expect(divisorSum(12)).toBe(28);
  });
  it("sum of divisors of 6 = 12", () => {
    expect(divisorSum(6)).toBe(12);
  });
  it("prime p sums to p+1", () => {
    expect(divisorSum(13)).toBe(14);
  });
  it("1 sums to 1", () => {
    expect(divisorSum(1)).toBe(1);
  });
  it("returns 0 for n <= 0", () => {
    expect(divisorSum(0)).toBe(0);
  });
  it("matches manual sum", () => {
    const sum = divisors(28).reduce((a, b) => a + b, 0);
    expect(divisorSum(28)).toBe(sum);
  });
});

// ===========================================================================
// 2. Primes
// ===========================================================================

describe("isPrime", () => {
  it("1 is not prime", () => {
    expect(isPrime(1)).toBe(false);
  });
  it("2 is prime", () => {
    expect(isPrime(2)).toBe(true);
  });
  it("3 is prime", () => {
    expect(isPrime(3)).toBe(true);
  });
  it("4 is not prime", () => {
    expect(isPrime(4)).toBe(false);
  });
  it("17 is prime", () => {
    expect(isPrime(17)).toBe(true);
  });
  it("0 and negatives are not prime", () => {
    expect(isPrime(0)).toBe(false);
    expect(isPrime(-7)).toBe(false);
  });
  it("large prime 7919 is prime", () => {
    expect(isPrime(7919)).toBe(true);
  });
  it("large composite 7917 is not prime", () => {
    expect(isPrime(7917)).toBe(false);
  });
  it("non-integers are not prime", () => {
    expect(isPrime(2.5)).toBe(false);
  });
  it("25 is not prime", () => {
    expect(isPrime(25)).toBe(false);
  });
});

describe("primesUpTo", () => {
  it("primes up to 20", () => {
    expect(primesUpTo(20)).toEqual([2, 3, 5, 7, 11, 13, 17, 19]);
  });
  it("primes up to 2 is [2]", () => {
    expect(primesUpTo(2)).toEqual([2]);
  });
  it("empty for n < 2", () => {
    expect(primesUpTo(1)).toEqual([]);
    expect(primesUpTo(0)).toEqual([]);
  });
  it("primes up to 10", () => {
    expect(primesUpTo(10)).toEqual([2, 3, 5, 7]);
  });
  it("count of primes below 100 is 25", () => {
    expect(primesUpTo(100).length).toBe(25);
  });
});

describe("nthPrime", () => {
  it("1st prime is 2", () => {
    expect(nthPrime(1)).toBe(2);
  });
  it("2nd prime is 3", () => {
    expect(nthPrime(2)).toBe(3);
  });
  it("6th prime is 13", () => {
    expect(nthPrime(6)).toBe(13);
  });
  it("25th prime is 97", () => {
    expect(nthPrime(25)).toBe(97);
  });
  it("returns 0 for n <= 0", () => {
    expect(nthPrime(0)).toBe(0);
    expect(nthPrime(-3)).toBe(0);
  });
});

describe("primeFactorization", () => {
  it("factorizes 360 as 2^3 * 3^2 * 5", () => {
    const f = primeFactorization(360);
    expect(f.get(2)).toBe(3);
    expect(f.get(3)).toBe(2);
    expect(f.get(5)).toBe(1);
    expect(f.size).toBe(3);
  });
  it("prime factorizes to itself^1", () => {
    const f = primeFactorization(13);
    expect(f.get(13)).toBe(1);
    expect(f.size).toBe(1);
  });
  it("empty for n <= 1", () => {
    expect(primeFactorization(1).size).toBe(0);
    expect(primeFactorization(0).size).toBe(0);
  });
  it("factorizes a prime power 8 = 2^3", () => {
    const f = primeFactorization(8);
    expect(f.get(2)).toBe(3);
    expect(f.size).toBe(1);
  });
  it("product of factors reconstructs n", () => {
    const f = primeFactorization(2310);
    let product = 1;
    for (const [p, e] of f) product *= Math.pow(p, e);
    expect(product).toBe(2310);
  });
});

describe("primeFactors", () => {
  it("distinct factors of 360 sorted", () => {
    expect(primeFactors(360)).toEqual([2, 3, 5]);
  });
  it("empty for n <= 1", () => {
    expect(primeFactors(1)).toEqual([]);
  });
  it("prime returns itself", () => {
    expect(primeFactors(17)).toEqual([17]);
  });
  it("prime power returns single base", () => {
    expect(primeFactors(64)).toEqual([2]);
  });
});

describe("nextPrime", () => {
  it("nextPrime(13) = 17", () => {
    expect(nextPrime(13)).toBe(17);
  });
  it("nextPrime(0) = 2", () => {
    expect(nextPrime(0)).toBe(2);
  });
  it("nextPrime(1) = 2", () => {
    expect(nextPrime(1)).toBe(2);
  });
  it("nextPrime(2) = 3", () => {
    expect(nextPrime(2)).toBe(3);
  });
  it("nextPrime of negative = 2", () => {
    expect(nextPrime(-5)).toBe(2);
  });
  it("nextPrime(20) = 23", () => {
    expect(nextPrime(20)).toBe(23);
  });
});

describe("isCoprime", () => {
  it("8 and 15 are coprime", () => {
    expect(isCoprime(8, 15)).toBe(true);
  });
  it("6 and 9 are not coprime", () => {
    expect(isCoprime(6, 9)).toBe(false);
  });
  it("1 is coprime to everything", () => {
    expect(isCoprime(1, 100)).toBe(true);
  });
  it("a number is not coprime with itself (unless 1)", () => {
    expect(isCoprime(4, 4)).toBe(false);
  });
});

// ===========================================================================
// 3. Modular arithmetic
// ===========================================================================

describe("mod", () => {
  it("mod(7, 3) = 1", () => {
    expect(mod(7, 3)).toBe(1);
  });
  it("always non-negative for negative a", () => {
    expect(mod(-1, 3)).toBe(2);
    expect(mod(-7, 3)).toBe(2);
  });
  it("normalizes with negative modulus magnitude", () => {
    expect(mod(7, -3)).toBe(1);
  });
  it("mod(0, 5) = 0", () => {
    expect(mod(0, 5)).toBe(0);
  });
  it("throws when m = 0", () => {
    expect(() => mod(5, 0)).toThrow();
  });
});

describe("modPow", () => {
  it("modPow(2, 10, 1000) = 24", () => {
    expect(modPow(2, 10, 1000)).toBe(24);
  });
  it("modPow(3, 0, 7) = 1", () => {
    expect(modPow(3, 0, 7)).toBe(1);
  });
  it("modPow with m=1 is 0", () => {
    expect(modPow(5, 3, 1)).toBe(0);
  });
  it("Fermat: 2^16 mod 17 = 1", () => {
    expect(modPow(2, 16, 17)).toBe(1);
  });
  it("modPow(7, 256, 13)", () => {
    expect(modPow(7, 256, 13)).toBe(9);
  });
  it("throws for negative exponent", () => {
    expect(() => modPow(2, -1, 5)).toThrow();
  });
  it("throws when m = 0", () => {
    expect(() => modPow(2, 3, 0)).toThrow();
  });
  it("normalizes negative base", () => {
    expect(modPow(-2, 3, 5)).toBe(modPow(3, 3, 5));
  });
});

describe("extendedGcd", () => {
  it("satisfies a*x + b*y = gcd", () => {
    const { gcd: g, x, y } = extendedGcd(240, 46);
    expect(g).toBe(2);
    expect(240 * x + 46 * y).toBe(g);
  });
  it("works for coprime inputs", () => {
    const { gcd: g, x, y } = extendedGcd(3, 11);
    expect(g).toBe(1);
    expect(3 * x + 11 * y).toBe(1);
  });
  it("gcd matches plain gcd", () => {
    expect(extendedGcd(48, 18).gcd).toBe(gcd(48, 18));
  });
  it("handles b = 0", () => {
    const r = extendedGcd(7, 0);
    expect(r.gcd).toBe(7);
    expect(7 * r.x).toBe(7);
  });
});

describe("modInverse", () => {
  it("modInverse(3, 11) = 4", () => {
    expect(modInverse(3, 11)).toBe(4);
  });
  it("inverse times a is 1 mod m", () => {
    const inv = modInverse(7, 26);
    expect((7 * inv) % 26).toBe(1);
  });
  it("returns NaN when no inverse exists", () => {
    expect(modInverse(4, 8)).toBeNaN();
  });
  it("modInverse with m=1 is 0", () => {
    expect(modInverse(5, 1)).toBe(0);
  });
  it("returns NaN for m <= 0", () => {
    expect(modInverse(3, 0)).toBeNaN();
    expect(modInverse(3, -5)).toBeNaN();
  });
  it("handles a > m", () => {
    const inv = modInverse(14, 11); // 14 ≡ 3 mod 11 → inverse 4
    expect(inv).toBe(4);
  });
});

describe("crt", () => {
  it("classic example x≡2(3), x≡3(5), x≡2(7) = 23", () => {
    expect(crt([2, 3, 2], [3, 5, 7])).toBe(23);
  });
  it("two-congruence example x≡1(4), x≡2(5) = 17", () => {
    expect(crt([1, 2], [4, 5])).toBe(17);
  });
  it("single congruence", () => {
    expect(crt([4], [7])).toBe(4);
  });
  it("returns NaN on length mismatch", () => {
    expect(crt([1, 2], [3])).toBeNaN();
  });
  it("returns NaN on empty input", () => {
    expect(crt([], [])).toBeNaN();
  });
  it("returns NaN for non-coprime moduli", () => {
    expect(crt([1, 2], [4, 6])).toBeNaN();
  });
  it("returns NaN for non-positive modulus", () => {
    expect(crt([1, 2], [3, 0])).toBeNaN();
  });
});

// ===========================================================================
// 4. Special numbers
// ===========================================================================

describe("isPerfect", () => {
  it("6 is perfect", () => {
    expect(isPerfect(6)).toBe(true);
  });
  it("28 is perfect", () => {
    expect(isPerfect(28)).toBe(true);
  });
  it("496 is perfect", () => {
    expect(isPerfect(496)).toBe(true);
  });
  it("12 is not perfect", () => {
    expect(isPerfect(12)).toBe(false);
  });
  it("1 is not perfect", () => {
    expect(isPerfect(1)).toBe(false);
  });
  it("negatives are not perfect", () => {
    expect(isPerfect(-6)).toBe(false);
  });
});

describe("isAbundant", () => {
  it("12 is abundant", () => {
    expect(isAbundant(12)).toBe(true);
  });
  it("6 (perfect) is not abundant", () => {
    expect(isAbundant(6)).toBe(false);
  });
  it("8 (deficient) is not abundant", () => {
    expect(isAbundant(8)).toBe(false);
  });
  it("24 is abundant", () => {
    expect(isAbundant(24)).toBe(true);
  });
});

describe("isDeficient", () => {
  it("8 is deficient", () => {
    expect(isDeficient(8)).toBe(true);
  });
  it("primes are deficient", () => {
    expect(isDeficient(13)).toBe(true);
  });
  it("1 is deficient", () => {
    expect(isDeficient(1)).toBe(true);
  });
  it("6 (perfect) is not deficient", () => {
    expect(isDeficient(6)).toBe(false);
  });
  it("12 (abundant) is not deficient", () => {
    expect(isDeficient(12)).toBe(false);
  });
});

describe("isPerfectSquare", () => {
  it("0 and 1 are perfect squares", () => {
    expect(isPerfectSquare(0)).toBe(true);
    expect(isPerfectSquare(1)).toBe(true);
  });
  it("144 is a perfect square", () => {
    expect(isPerfectSquare(144)).toBe(true);
  });
  it("145 is not", () => {
    expect(isPerfectSquare(145)).toBe(false);
  });
  it("negatives are not", () => {
    expect(isPerfectSquare(-4)).toBe(false);
  });
  it("large square 1000000 is", () => {
    expect(isPerfectSquare(1000000)).toBe(true);
  });
});

describe("isPerfectPower", () => {
  it("8 = 2^3 is a perfect power", () => {
    expect(isPerfectPower(8)).toBe(true);
  });
  it("27 = 3^3 is a perfect power", () => {
    expect(isPerfectPower(27)).toBe(true);
  });
  it("16 = 2^4 is a perfect power", () => {
    expect(isPerfectPower(16)).toBe(true);
  });
  it("100 = 10^2 is a perfect power", () => {
    expect(isPerfectPower(100)).toBe(true);
  });
  it("12 is not a perfect power", () => {
    expect(isPerfectPower(12)).toBe(false);
  });
  it("2 is not a perfect power", () => {
    expect(isPerfectPower(2)).toBe(false);
  });
  it("0 and 1 are perfect powers", () => {
    expect(isPerfectPower(0)).toBe(true);
    expect(isPerfectPower(1)).toBe(true);
  });
});

describe("isPalindromeNumber", () => {
  it("121 is a palindrome", () => {
    expect(isPalindromeNumber(121)).toBe(true);
  });
  it("123 is not", () => {
    expect(isPalindromeNumber(123)).toBe(false);
  });
  it("single digits are palindromes", () => {
    expect(isPalindromeNumber(7)).toBe(true);
  });
  it("ignores sign", () => {
    expect(isPalindromeNumber(-121)).toBe(true);
  });
  it("1221 is a palindrome", () => {
    expect(isPalindromeNumber(1221)).toBe(true);
  });
});

describe("isArmstrong", () => {
  it("153 is Armstrong", () => {
    expect(isArmstrong(153)).toBe(true);
  });
  it("9474 is Armstrong", () => {
    expect(isArmstrong(9474)).toBe(true);
  });
  it("single digits are Armstrong", () => {
    expect(isArmstrong(5)).toBe(true);
  });
  it("154 is not Armstrong", () => {
    expect(isArmstrong(154)).toBe(false);
  });
  it("370 is Armstrong", () => {
    expect(isArmstrong(370)).toBe(true);
  });
});

// ===========================================================================
// 5. Sequences
// ===========================================================================

describe("fibonacci", () => {
  it("F(0) = 0", () => {
    expect(fibonacci(0)).toBe(0);
  });
  it("F(1) = 1", () => {
    expect(fibonacci(1)).toBe(1);
  });
  it("F(10) = 55", () => {
    expect(fibonacci(10)).toBe(55);
  });
  it("F(20) = 6765", () => {
    expect(fibonacci(20)).toBe(6765);
  });
  it("returns 0 for n < 0", () => {
    expect(fibonacci(-5)).toBe(0);
  });
  it("F(7) = 13", () => {
    expect(fibonacci(7)).toBe(13);
  });
});

describe("fibonacciSequence", () => {
  it("first 8 Fibonacci numbers", () => {
    expect(fibonacciSequence(8)).toEqual([0, 1, 1, 2, 3, 5, 8, 13]);
  });
  it("empty for count <= 0", () => {
    expect(fibonacciSequence(0)).toEqual([]);
    expect(fibonacciSequence(-3)).toEqual([]);
  });
  it("count 1 returns [0]", () => {
    expect(fibonacciSequence(1)).toEqual([0]);
  });
  it("last element matches fibonacci()", () => {
    const seq = fibonacciSequence(15);
    expect(seq[seq.length - 1]).toBe(fibonacci(14));
  });
});

describe("factorial", () => {
  it("0! = 1", () => {
    expect(factorial(0)).toBe(1);
  });
  it("5! = 120", () => {
    expect(factorial(5)).toBe(120);
  });
  it("10! = 3628800", () => {
    expect(factorial(10)).toBe(3628800);
  });
  it("returns NaN for negatives", () => {
    expect(factorial(-1)).toBeNaN();
  });
  it("returns NaN for non-integers", () => {
    expect(factorial(2.5)).toBeNaN();
  });
  it("1! = 1", () => {
    expect(factorial(1)).toBe(1);
  });
});

describe("triangularNumber", () => {
  it("T(1) = 1", () => {
    expect(triangularNumber(1)).toBe(1);
  });
  it("T(5) = 15", () => {
    expect(triangularNumber(5)).toBe(15);
  });
  it("T(10) = 55", () => {
    expect(triangularNumber(10)).toBe(55);
  });
  it("returns 0 for n <= 0", () => {
    expect(triangularNumber(0)).toBe(0);
    expect(triangularNumber(-5)).toBe(0);
  });
});

describe("catalanNumber", () => {
  it("C(0) = 1", () => {
    expect(catalanNumber(0)).toBe(1);
  });
  it("C(1) = 1", () => {
    expect(catalanNumber(1)).toBe(1);
  });
  it("C(2) = 2", () => {
    expect(catalanNumber(2)).toBe(2);
  });
  it("C(3) = 5", () => {
    expect(catalanNumber(3)).toBe(5);
  });
  it("C(5) = 42", () => {
    expect(catalanNumber(5)).toBe(42);
  });
  it("C(10) = 16796", () => {
    expect(catalanNumber(10)).toBe(16796);
  });
  it("returns 0 for n < 0", () => {
    expect(catalanNumber(-1)).toBe(0);
  });
});

describe("collatzSteps", () => {
  it("n = 1 takes 0 steps", () => {
    expect(collatzSteps(1)).toBe(0);
  });
  it("n <= 1 takes 0 steps", () => {
    expect(collatzSteps(0)).toBe(0);
    expect(collatzSteps(-5)).toBe(0);
  });
  it("n = 6 takes 8 steps", () => {
    expect(collatzSteps(6)).toBe(8);
  });
  it("n = 27 takes 111 steps", () => {
    expect(collatzSteps(27)).toBe(111);
  });
  it("n = 2 takes 1 step", () => {
    expect(collatzSteps(2)).toBe(1);
  });
});

// ===========================================================================
// 6. Totient & arithmetic functions
// ===========================================================================

describe("eulerTotient", () => {
  it("φ(10) = 4", () => {
    expect(eulerTotient(10)).toBe(4);
  });
  it("φ(1) = 1", () => {
    expect(eulerTotient(1)).toBe(1);
  });
  it("φ(p) = p - 1 for prime", () => {
    expect(eulerTotient(7)).toBe(6);
  });
  it("φ(12) = 4", () => {
    expect(eulerTotient(12)).toBe(4);
  });
  it("φ(36) = 12", () => {
    expect(eulerTotient(36)).toBe(12);
  });
  it("returns 0 for n <= 0", () => {
    expect(eulerTotient(0)).toBe(0);
  });
  it("matches brute-force coprime count", () => {
    let count = 0;
    for (let i = 1; i <= 30; i++) if (isCoprime(i, 30)) count++;
    expect(eulerTotient(30)).toBe(count);
  });
});

describe("mobius", () => {
  it("μ(1) = 1", () => {
    expect(mobius(1)).toBe(1);
  });
  it("squarefree with even prime count → 1", () => {
    expect(mobius(6)).toBe(1); // 2 * 3
  });
  it("squarefree with odd prime count → -1", () => {
    expect(mobius(30)).toBe(-1); // 2 * 3 * 5
    expect(mobius(2)).toBe(-1);
  });
  it("non-squarefree → 0", () => {
    expect(mobius(12)).toBe(0); // 2^2 * 3
    expect(mobius(8)).toBe(0);
  });
  it("returns 0 for n <= 0", () => {
    expect(mobius(0)).toBe(0);
  });
  it("μ(15) = 1 (3 * 5)", () => {
    expect(mobius(15)).toBe(1);
  });
});

describe("digitSum", () => {
  it("digitSum(123) = 6", () => {
    expect(digitSum(123)).toBe(6);
  });
  it("digitSum(0) = 0", () => {
    expect(digitSum(0)).toBe(0);
  });
  it("ignores sign", () => {
    expect(digitSum(-456)).toBe(15);
  });
  it("digitSum(99999) = 45", () => {
    expect(digitSum(99999)).toBe(45);
  });
});

describe("digitalRoot", () => {
  it("digitalRoot(123) = 6", () => {
    expect(digitalRoot(123)).toBe(6);
  });
  it("digitalRoot(99) = 9", () => {
    expect(digitalRoot(99)).toBe(9);
  });
  it("digitalRoot(0) = 0", () => {
    expect(digitalRoot(0)).toBe(0);
  });
  it("digitalRoot(9999) = 9", () => {
    expect(digitalRoot(9999)).toBe(9);
  });
  it("digitalRoot(12345) = 6", () => {
    expect(digitalRoot(12345)).toBe(6);
  });
});

describe("numberOfDigits", () => {
  it("0 has 1 digit", () => {
    expect(numberOfDigits(0)).toBe(1);
  });
  it("123 has 3 digits", () => {
    expect(numberOfDigits(123)).toBe(3);
  });
  it("ignores sign", () => {
    expect(numberOfDigits(-4567)).toBe(4);
  });
  it("1000000 has 7 digits", () => {
    expect(numberOfDigits(1000000)).toBe(7);
  });
});

// ===========================================================================
// 7. Combinatorial (integer)
// ===========================================================================

describe("binomial", () => {
  it("C(5, 2) = 10", () => {
    expect(binomial(5, 2)).toBe(10);
  });
  it("C(n, 0) = 1", () => {
    expect(binomial(7, 0)).toBe(1);
  });
  it("C(n, n) = 1", () => {
    expect(binomial(7, 7)).toBe(1);
  });
  it("returns 0 for k < 0", () => {
    expect(binomial(5, -1)).toBe(0);
  });
  it("returns 0 for k > n", () => {
    expect(binomial(5, 6)).toBe(0);
  });
  it("C(10, 5) = 252", () => {
    expect(binomial(10, 5)).toBe(252);
  });
  it("is symmetric", () => {
    expect(binomial(20, 7)).toBe(binomial(20, 13));
  });
});

describe("permutations", () => {
  it("P(5, 2) = 20", () => {
    expect(permutations(5, 2)).toBe(20);
  });
  it("P(n, 0) = 1", () => {
    expect(permutations(7, 0)).toBe(1);
  });
  it("P(n, n) = n!", () => {
    expect(permutations(5, 5)).toBe(120);
  });
  it("returns 0 for k < 0", () => {
    expect(permutations(5, -1)).toBe(0);
  });
  it("returns 0 for k > n", () => {
    expect(permutations(5, 6)).toBe(0);
  });
  it("P(10, 3) = 720", () => {
    expect(permutations(10, 3)).toBe(720);
  });
});

describe("partitions", () => {
  it("p(0) = 1", () => {
    expect(partitions(0)).toBe(1);
  });
  it("p(1) = 1", () => {
    expect(partitions(1)).toBe(1);
  });
  it("p(4) = 5", () => {
    expect(partitions(4)).toBe(5);
  });
  it("p(5) = 7", () => {
    expect(partitions(5)).toBe(7);
  });
  it("p(10) = 42", () => {
    expect(partitions(10)).toBe(42);
  });
  it("returns 0 for n < 0", () => {
    expect(partitions(-1)).toBe(0);
  });
});

describe("bellNumber", () => {
  it("B(0) = 1", () => {
    expect(bellNumber(0)).toBe(1);
  });
  it("B(1) = 1", () => {
    expect(bellNumber(1)).toBe(1);
  });
  it("B(2) = 2", () => {
    expect(bellNumber(2)).toBe(2);
  });
  it("B(3) = 5", () => {
    expect(bellNumber(3)).toBe(5);
  });
  it("B(4) = 15", () => {
    expect(bellNumber(4)).toBe(15);
  });
  it("B(5) = 52", () => {
    expect(bellNumber(5)).toBe(52);
  });
  it("returns 0 for n < 0", () => {
    expect(bellNumber(-1)).toBe(0);
  });
});
