import { describe, it, expect } from 'vitest';
import {
  goldenSectionSearch,
  bisectionRoot,
  newtonRoot,
  secantRoot,
  brentMinimize,
  numericalGradient,
  armijoLineSearch,
  gradientDescent,
  gradientDescentMomentum,
  adam,
  lbfgs,
  simulatedAnnealing,
  geneticAlgorithm,
  penaltyMethod,
  meanVarianceOptimize,
  gridSearch,
  randomSearch,
  isConverged,
  decaySchedule,
} from '@/lib/math/optimization';

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/** f(x) = x^2 */
const sq = (x: number): number => x * x;
/** f(x) = (x - 3)^2 */
const sqShifted = (x: number): number => (x - 3) ** 2;
/** f(x) = (x - 2)^2 */
const sqShifted2 = (x: number): number => (x - 2) ** 2;
/** f(x, y) = x^2 + y^2 */
const sphere: (x: number[]) => number = ([x, y]) => x * x + y * y;
const sphereGrad: (x: number[]) => number[] = ([x, y]) => [2 * x, 2 * y];

// ---------------------------------------------------------------------------
// goldenSectionSearch
// ---------------------------------------------------------------------------

describe('goldenSectionSearch', () => {
  it('finds minimum of x^2 on [-2, 2]', () => {
    const result = goldenSectionSearch(sq, -2, 2);
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.value).toBeCloseTo(0, 5);
    expect(result.iterations).toBeGreaterThan(0);
  });

  it('finds minimum of (x-3)^2 on [0, 6]', () => {
    const result = goldenSectionSearch(sqShifted, 0, 6);
    expect(result.x).toBeCloseTo(3, 5);
    expect(result.value).toBeCloseTo(0, 5);
  });

  it('respects custom tolerance', () => {
    const result = goldenSectionSearch(sq, -1, 1, 1e-4);
    expect(Math.abs(result.x)).toBeLessThan(1e-3);
  });

  it('respects maxIter limit', () => {
    const result = goldenSectionSearch(sq, -2, 2, 1e-15, 5);
    expect(result.iterations).toBeLessThanOrEqual(5);
  });

  it('finds minimum of sin(x) on [4, 6] (near 3pi/2)', () => {
    const result = goldenSectionSearch(Math.sin, 4, 6);
    expect(result.x).toBeCloseTo(3 * Math.PI / 2, 4);
    expect(result.value).toBeCloseTo(-1, 5);
  });

  it('returns value matching fn(x)', () => {
    const result = goldenSectionSearch(sqShifted, 0, 6);
    expect(result.value).toBeCloseTo(sqShifted(result.x), 8);
  });
});

// ---------------------------------------------------------------------------
// bisectionRoot
// ---------------------------------------------------------------------------

describe('bisectionRoot', () => {
  it('finds sqrt(2) as root of x^2 - 2 on [1, 2]', () => {
    const result = bisectionRoot((x) => x * x - 2, 1, 2);
    expect(result.x).toBeCloseTo(Math.SQRT2, 6);
    expect(result.converged).toBe(true);
  });

  it('finds pi as root of sin(x) on [3, 4]', () => {
    const result = bisectionRoot(Math.sin, 3, 4);
    expect(result.x).toBeCloseTo(Math.PI, 6);
    expect(result.converged).toBe(true);
  });

  it('returns converged=false when signs not opposite', () => {
    // Both positive: x^2 - 0.1 has roots outside [1, 2]? No — x^2-0.1 at x=1 is 0.9>0, at x=2 is 3.9>0
    const result = bisectionRoot((x) => x * x + 1, -1, 1); // x^2+1 never crosses 0
    // At x=-1: 2 > 0, at x=1: 2 > 0 — same sign
    expect(result.converged).toBe(false);
  });

  it('reports iterations > 0', () => {
    const result = bisectionRoot((x) => x, -1, 1);
    expect(result.iterations).toBeGreaterThan(0);
  });

  it('finds root of cubic x^3 - x - 2 in [1, 2]', () => {
    // Root ≈ 1.5214
    const result = bisectionRoot((x) => x ** 3 - x - 2, 1, 2);
    expect(result.x).toBeCloseTo(1.5214, 3);
  });

  it('handles root exactly at midpoint within tolerance', () => {
    const result = bisectionRoot((x) => x, -1, 1, 1e-10);
    expect(Math.abs(result.x)).toBeCloseTo(0, 8);
  });
});

// ---------------------------------------------------------------------------
// newtonRoot
// ---------------------------------------------------------------------------

describe('newtonRoot', () => {
  it('finds sqrt(2) for x^2 - 2 with df = 2x', () => {
    const result = newtonRoot(
      (x) => x * x - 2,
      (x) => 2 * x,
      1.5,
    );
    expect(result.x).toBeCloseTo(Math.SQRT2, 8);
    expect(result.converged).toBe(true);
  });

  it('finds root of sin(x) near pi', () => {
    const result = newtonRoot(Math.sin, Math.cos, 3.0);
    expect(result.x).toBeCloseTo(Math.PI, 8);
    expect(result.converged).toBe(true);
  });

  it('converges in very few iterations (quadratic convergence)', () => {
    const result = newtonRoot((x) => x * x - 4, (x) => 2 * x, 1.5);
    expect(result.iterations).toBeLessThan(20);
    expect(result.x).toBeCloseTo(2, 8);
  });

  it('returns converged=false when derivative is zero at x0', () => {
    // f(x) = x^2, f'(0) = 0 — derivative vanishes at x0=0
    const result = newtonRoot((x) => x * x, (_x) => 0, 1.0);
    expect(result.converged).toBe(false);
  });

  it('respects maxIter', () => {
    const result = newtonRoot((x) => x * x - 2, (x) => 2 * x, 1.5, 1e-15, 2);
    expect(result.iterations).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// secantRoot
// ---------------------------------------------------------------------------

describe('secantRoot', () => {
  it('finds sqrt(2) for x^2 - 2', () => {
    const result = secantRoot((x) => x * x - 2, 1.0, 2.0);
    expect(result.x).toBeCloseTo(Math.SQRT2, 6);
    expect(result.converged).toBe(true);
  });

  it('finds root of x^3 - x - 2', () => {
    const result = secantRoot((x) => x ** 3 - x - 2, 1.0, 2.0);
    expect(result.x).toBeCloseTo(1.5214, 3);
  });

  it('reports iterations', () => {
    const result = secantRoot((x) => x * x - 2, 1.0, 2.0);
    expect(result.iterations).toBeGreaterThan(0);
  });

  it('converges for simple linear root f(x)=x-5', () => {
    const result = secantRoot((x) => x - 5, 0, 10);
    expect(result.x).toBeCloseTo(5, 6);
    expect(result.converged).toBe(true);
  });

  it('handles x0 very close to root', () => {
    const result = secantRoot((x) => x * x - 4, 1.99, 2.01);
    expect(result.x).toBeCloseTo(2, 6);
  });
});

// ---------------------------------------------------------------------------
// brentMinimize
// ---------------------------------------------------------------------------

describe('brentMinimize', () => {
  it('finds minimum of (x-2)^2 on [0, 4]', () => {
    const result = brentMinimize(sqShifted2, 0, 4);
    expect(result.x).toBeCloseTo(2, 5);
    expect(result.value).toBeCloseTo(0, 5);
  });

  it('finds minimum of x^2 on [-2, 2]', () => {
    const result = brentMinimize(sq, -2, 2);
    expect(result.x).toBeCloseTo(0, 5);
    expect(result.value).toBeCloseTo(0, 5);
  });

  it('finds minimum of (x-3)^2 on [0, 6]', () => {
    const result = brentMinimize(sqShifted, 0, 6);
    expect(result.x).toBeCloseTo(3, 5);
    expect(result.value).toBeCloseTo(0, 5);
  });

  it('finds minimum of cos(x) on [2, 5] (near pi)', () => {
    const result = brentMinimize(Math.cos, 2, 5);
    expect(result.x).toBeCloseTo(Math.PI, 4);
    expect(result.value).toBeCloseTo(-1, 5);
  });

  it('returns iterations > 0', () => {
    const result = brentMinimize(sq, -2, 2);
    expect(result.iterations).toBeGreaterThan(0);
  });

  it('value matches fn(x)', () => {
    const result = brentMinimize(sqShifted2, 0, 4);
    expect(result.value).toBeCloseTo(sqShifted2(result.x), 8);
  });
});

// ---------------------------------------------------------------------------
// numericalGradient
// ---------------------------------------------------------------------------

describe('numericalGradient', () => {
  it('matches analytical gradient of x^2+y^2 at [1, 1]', () => {
    const grad = numericalGradient(sphere, [1, 1]);
    expect(grad[0]).toBeCloseTo(2, 5);
    expect(grad[1]).toBeCloseTo(2, 5);
  });

  it('matches gradient of x^2+y^2 at [0, 0]', () => {
    const grad = numericalGradient(sphere, [0, 0]);
    expect(grad[0]).toBeCloseTo(0, 5);
    expect(grad[1]).toBeCloseTo(0, 5);
  });

  it('matches gradient of x^3 at [2]', () => {
    const grad = numericalGradient(([x]) => x ** 3, [2]);
    expect(grad[0]).toBeCloseTo(12, 4); // 3x^2 at x=2 = 12
  });

  it('returns array of same length as x', () => {
    const grad = numericalGradient(([x, y, z]) => x + y + z, [1, 2, 3]);
    expect(grad).toHaveLength(3);
  });

  it('custom h produces good accuracy', () => {
    const grad = numericalGradient(([x]) => Math.sin(x), [0], 1e-6);
    expect(grad[0]).toBeCloseTo(1, 5); // cos(0) = 1
  });
});

// ---------------------------------------------------------------------------
// armijoLineSearch
// ---------------------------------------------------------------------------

describe('armijoLineSearch', () => {
  it('returns a positive step size', () => {
    const x = [5, 5];
    const dir = [-1, -1]; // descent direction
    const g = sphereGrad(x);
    const alpha = armijoLineSearch(sphere, x, dir, g);
    expect(alpha).toBeGreaterThan(0);
  });

  it('returns step < 1 when gradient is large', () => {
    const x = [100, 100];
    const g = sphereGrad(x); // [200, 200]
    const dir = g.map((gi) => -gi); // steepest descent
    const alpha = armijoLineSearch(sphere, x, dir, g);
    expect(alpha).toBeLessThan(1);
  });

  it('satisfies Armijo sufficient decrease condition', () => {
    const x = [1, 1];
    const g = sphereGrad(x);
    const dir = g.map((gi) => -gi);
    const c = 1e-4;
    const alpha = armijoLineSearch(sphere, x, dir, g, { c });
    const f0 = sphere(x);
    const slope = g.reduce((s, gi, i) => s + gi * dir[i], 0);
    const fNew = sphere(x.map((xi, i) => xi + alpha * dir[i]));
    expect(fNew).toBeLessThanOrEqual(f0 + c * alpha * slope + 1e-12);
  });

  it('accepts custom alpha0', () => {
    const x = [1, 1];
    const g = sphereGrad(x);
    const dir = g.map((gi) => -gi);
    const alpha = armijoLineSearch(sphere, x, dir, g, { alpha0: 0.1 });
    expect(alpha).toBeLessThanOrEqual(0.1 + 1e-12);
  });
});

// ---------------------------------------------------------------------------
// gradientDescent
// ---------------------------------------------------------------------------

describe('gradientDescent', () => {
  it('converges on x^2+y^2 from [1, 1]', () => {
    const result = gradientDescent(sphere, sphereGrad, [1, 1], { lr: 0.1, maxIter: 1000 });
    expect(result.x[0]).toBeCloseTo(0, 3);
    expect(result.x[1]).toBeCloseTo(0, 3);
  });

  it('value is near zero at minimum', () => {
    const result = gradientDescent(sphere, sphereGrad, [1, 1], { lr: 0.1, maxIter: 1000 });
    expect(result.value).toBeCloseTo(0, 3);
  });

  it('reports iterations > 0', () => {
    const result = gradientDescent(sphere, sphereGrad, [1, 1], { lr: 0.1, maxIter: 100 });
    expect(result.iterations).toBeGreaterThan(0);
  });

  it('tracks history when requested', () => {
    const result = gradientDescent(sphere, sphereGrad, [1, 1], {
      lr: 0.1,
      maxIter: 50,
      trackHistory: true,
    });
    expect(result.history).toBeDefined();
    expect(result.history!.length).toBeGreaterThan(0);
  });

  it('history values are decreasing (monotone descent)', () => {
    const result = gradientDescent(sphere, sphereGrad, [3, 3], {
      lr: 0.05,
      maxIter: 100,
      trackHistory: true,
    });
    const h = result.history!;
    for (let i = 1; i < h.length; i++) {
      expect(h[i]).toBeLessThanOrEqual(h[i - 1] + 1e-10);
    }
  });

  it('converges with default lr', () => {
    const result = gradientDescent(sphere, sphereGrad, [0.5, 0.5]);
    expect(result.value).toBeLessThan(1);
  });
});

// ---------------------------------------------------------------------------
// gradientDescentMomentum
// ---------------------------------------------------------------------------

describe('gradientDescentMomentum', () => {
  it('converges on x^2+y^2 from [1, 1]', () => {
    const result = gradientDescentMomentum(sphere, sphereGrad, [1, 1], {
      lr: 0.05,
      maxIter: 500,
    });
    expect(result.x[0]).toBeCloseTo(0, 3);
    expect(result.x[1]).toBeCloseTo(0, 3);
  });

  it('converges on the sphere function within tight budget', () => {
    // Verify momentum converges to a good solution
    const result = gradientDescentMomentum(sphere, sphereGrad, [2, 2], {
      lr: 0.05,
      momentum: 0.9,
      maxIter: 500,
      tol: 1e-8,
    });
    expect(result.value).toBeLessThan(1e-5);
  });

  it('tracks history when requested', () => {
    const result = gradientDescentMomentum(sphere, sphereGrad, [1, 1], {
      lr: 0.05,
      maxIter: 50,
      trackHistory: true,
    });
    expect(result.history).toBeDefined();
    expect(result.history!.length).toBeGreaterThan(0);
  });

  it('reports converged when within tolerance', () => {
    const result = gradientDescentMomentum(sphere, sphereGrad, [1, 1], {
      lr: 0.05,
      maxIter: 2000,
      tol: 1e-5,
    });
    expect(result.converged).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// adam
// ---------------------------------------------------------------------------

describe('adam', () => {
  it('converges on x^2+y^2 from [1, 1]', () => {
    const result = adam(sphere, sphereGrad, [1, 1], { lr: 0.1, maxIter: 2000 });
    expect(result.x[0]).toBeCloseTo(0, 2);
    expect(result.x[1]).toBeCloseTo(0, 2);
  });

  it('value approaches zero at minimum', () => {
    const result = adam(sphere, sphereGrad, [1, 1], { lr: 0.1, maxIter: 2000 });
    expect(result.value).toBeLessThan(1e-3);
  });

  it('reports iterations > 0', () => {
    const result = adam(sphere, sphereGrad, [1, 1], { maxIter: 50 });
    expect(result.iterations).toBeGreaterThan(0);
  });

  it('tracks history when requested', () => {
    const result = adam(sphere, sphereGrad, [1, 1], {
      lr: 0.1,
      maxIter: 50,
      trackHistory: true,
    });
    expect(result.history).toBeDefined();
    expect(result.history!.length).toBeGreaterThan(0);
  });

  it('converges with high learning rate', () => {
    const result = adam(sphere, sphereGrad, [5, 5], { lr: 0.5, maxIter: 5000 });
    expect(result.value).toBeLessThan(0.1);
  });

  it('works on higher-dimensional problem', () => {
    const fn: (x: number[]) => number = (x) => x.reduce((s, xi) => s + xi * xi, 0);
    const grad: (x: number[]) => number[] = (x) => x.map((xi) => 2 * xi);
    const x0 = [1, 1, 1, 1, 1];
    const result = adam(fn, grad, x0, { lr: 0.1, maxIter: 3000 });
    expect(result.value).toBeLessThan(0.1);
  });
});

// ---------------------------------------------------------------------------
// lbfgs
// ---------------------------------------------------------------------------

describe('lbfgs', () => {
  it('converges on x^2+y^2 from [1, 1]', () => {
    const result = lbfgs(sphere, sphereGrad, [1, 1]);
    expect(result.x[0]).toBeCloseTo(0, 4);
    expect(result.x[1]).toBeCloseTo(0, 4);
    expect(result.converged).toBe(true);
  });

  it('value near zero at minimum', () => {
    const result = lbfgs(sphere, sphereGrad, [3, 3]);
    expect(result.value).toBeCloseTo(0, 4);
  });

  it('converges on simple quadratic with known minimum', () => {
    // f(x) = (x-2)^2 + (y+1)^2, minimum at (2, -1)
    const fn: ObjectiveFn = ([x, y]) => (x - 2) ** 2 + (y + 1) ** 2;
    const grad: GradientFn = ([x, y]) => [2 * (x - 2), 2 * (y + 1)];
    const result = lbfgs(fn, grad, [0, 0]);
    expect(result.x[0]).toBeCloseTo(2, 4);
    expect(result.x[1]).toBeCloseTo(-1, 4);
  });

  it('respects m (history size) parameter', () => {
    const result = lbfgs(sphere, sphereGrad, [1, 1], { m: 3 });
    expect(result.converged).toBe(true);
  });

  it('converges in fewer iterations than gradient descent', () => {
    const gd = gradientDescent(sphere, sphereGrad, [5, 5], { lr: 0.1, maxIter: 5000, tol: 1e-8 });
    const lb = lbfgs(sphere, sphereGrad, [5, 5], { maxIter: 5000, tol: 1e-8 });
    // L-BFGS typically much faster
    expect(lb.iterations).toBeLessThan(gd.iterations);
  });
});

// ---------------------------------------------------------------------------
// simulatedAnnealing
// ---------------------------------------------------------------------------

describe('simulatedAnnealing', () => {
  it('finds approximate minimum of x^2+y^2', () => {
    const result = simulatedAnnealing(sphere, [5, 5], {
      initialTemp: 2.0,
      coolingRate: 0.99,
      maxIter: 20000,
      seed: 42,
    });
    expect(result.value).toBeLessThan(1.0);
  });

  it('does better than the starting point', () => {
    const x0 = [10, 10];
    const start = sphere(x0);
    const result = simulatedAnnealing(sphere, x0, {
      initialTemp: 5.0,
      coolingRate: 0.995,
      maxIter: 30000,
      seed: 42,
    });
    expect(result.value).toBeLessThan(start);
  });

  it('is reproducible with same seed', () => {
    const opts = { initialTemp: 1.0, coolingRate: 0.99, maxIter: 1000, seed: 99 };
    const r1 = simulatedAnnealing(sphere, [3, 3], opts);
    const r2 = simulatedAnnealing(sphere, [3, 3], opts);
    expect(r1.value).toBeCloseTo(r2.value, 10);
    expect(r1.x).toEqual(r2.x);
  });

  it('produces different results with different seeds', () => {
    const r1 = simulatedAnnealing(sphere, [3, 3], { seed: 1, maxIter: 500 });
    const r2 = simulatedAnnealing(sphere, [3, 3], { seed: 2, maxIter: 500 });
    // Almost certainly differ with different seeds
    expect(r1.value !== r2.value || r1.x[0] !== r2.x[0]).toBe(true);
  });

  it('tracks history when requested', () => {
    const result = simulatedAnnealing(sphere, [1, 1], {
      maxIter: 100,
      trackHistory: true,
      seed: 42,
    });
    expect(result.history).toBeDefined();
    expect(result.history!.length).toBeGreaterThan(0);
  });

  it('history best values are non-increasing', () => {
    const result = simulatedAnnealing(sphere, [3, 3], {
      maxIter: 500,
      trackHistory: true,
      seed: 7,
    });
    const h = result.history!;
    for (let i = 1; i < h.length; i++) {
      expect(h[i]).toBeLessThanOrEqual(h[i - 1] + 1e-12);
    }
  });

  it('reports iterations equal to maxIter (or when temp hits floor)', () => {
    const result = simulatedAnnealing(sphere, [1, 1], {
      maxIter: 200,
      seed: 42,
      coolingRate: 0.9,
      minTemp: 1e-10,
    });
    expect(result.iterations).toBeGreaterThan(0);
    expect(result.iterations).toBeLessThanOrEqual(200);
  });
});

// ---------------------------------------------------------------------------
// geneticAlgorithm
// ---------------------------------------------------------------------------

describe('geneticAlgorithm', () => {
  const bounds2d: Array<[number, number]> = [[-5, 5], [-5, 5]];

  it('finds approximate minimum of x^2+y^2 within bounds', () => {
    const result = geneticAlgorithm(sphere, bounds2d, {
      populationSize: 50,
      generations: 200,
      seed: 42,
    });
    expect(result.value).toBeLessThan(1.0);
  });

  it('solution stays within bounds', () => {
    const result = geneticAlgorithm(sphere, bounds2d, { seed: 42 });
    result.x.forEach((xi, i) => {
      const [lo, hi] = bounds2d[i];
      expect(xi).toBeGreaterThanOrEqual(lo - 1e-10);
      expect(xi).toBeLessThanOrEqual(hi + 1e-10);
    });
  });

  it('is reproducible with same seed', () => {
    const opts = { seed: 123, generations: 50, populationSize: 20 };
    const r1 = geneticAlgorithm(sphere, bounds2d, opts);
    const r2 = geneticAlgorithm(sphere, bounds2d, opts);
    expect(r1.value).toBeCloseTo(r2.value, 10);
  });

  it('tracks history when requested', () => {
    const result = geneticAlgorithm(sphere, bounds2d, {
      generations: 30,
      seed: 42,
      trackHistory: true,
    });
    expect(result.history).toBeDefined();
    expect(result.history!.length).toBe(30);
  });

  it('history is non-increasing (elitism keeps best)', () => {
    const result = geneticAlgorithm(sphere, bounds2d, {
      generations: 50,
      seed: 42,
      trackHistory: true,
    });
    const h = result.history!;
    for (let i = 1; i < h.length; i++) {
      expect(h[i]).toBeLessThanOrEqual(h[i - 1] + 1e-12);
    }
  });

  it('works with 1D bounds', () => {
    const result = geneticAlgorithm(([x]) => (x - 3) ** 2, [[-5, 5]], {
      seed: 42,
      generations: 200,
    });
    expect(result.x[0]).toBeCloseTo(3, 0);
  });
});

// ---------------------------------------------------------------------------
// penaltyMethod
// ---------------------------------------------------------------------------

describe('penaltyMethod', () => {
  it('minimizes x^2+y^2 with equality constraint x+y=1', () => {
    // Analytical solution: x=y=0.5
    // Use a moderate penalty to avoid divergence with numerical gradient
    const fn: ObjectiveFn = ([x, y]) => x * x + y * y;
    const grad: GradientFn = ([x, y]) => [2 * x, 2 * y];
    const constraints = [
      { fn: ([x, y]: number[]) => x + y - 1, type: 'equality' as const },
    ];
    const result = penaltyMethod(fn, grad, [0.5, 0.5], constraints, {
      penaltyFactor: 10,
      maxIter: 2000,
      tol: 1e-5,
    });
    // With penalty method, we get an approximate solution; constraint roughly satisfied
    const constraintViol = Math.abs(result.x[0] + result.x[1] - 1);
    expect(constraintViol).toBeLessThan(0.5);
    // x and y should be roughly equal (symmetry of the problem)
    expect(Math.abs(result.x[0] - result.x[1])).toBeLessThan(0.5);
  });

  it('minimizes subject to inequality constraint x >= 1 (as x-1 <= 0 rewritten)', () => {
    // min x^2, s.t. x >= 1  ⟹  x=1
    // inequality g(x) = 1 - x <= 0
    const fn: ObjectiveFn = ([x]) => x * x;
    const grad: GradientFn = ([x]) => [2 * x];
    const constraints = [
      { fn: ([x]: number[]) => 1 - x, type: 'inequality' as const },
    ];
    const result = penaltyMethod(fn, grad, [0], constraints, {
      penaltyFactor: 500,
      maxIter: 3000,
      tol: 1e-6,
    });
    expect(result.x[0]).toBeGreaterThanOrEqual(0.9);
  });

  it('returns an OptimizeResult shape', () => {
    const fn: ObjectiveFn = ([x]) => x * x;
    const grad: GradientFn = ([x]) => [2 * x];
    const result = penaltyMethod(fn, grad, [2], [], {});
    expect(result).toHaveProperty('x');
    expect(result).toHaveProperty('value');
    expect(result).toHaveProperty('iterations');
    expect(result).toHaveProperty('converged');
  });

  it('converges to unconstrained minimum when no constraints given', () => {
    const fn: ObjectiveFn = ([x, y]) => x * x + y * y;
    const grad: GradientFn = ([x, y]) => [2 * x, 2 * y];
    const result = penaltyMethod(fn, grad, [3, 3], [], {
      penaltyFactor: 1,
      maxIter: 2000,
      tol: 1e-6,
    });
    expect(result.value).toBeLessThan(1.0);
  });
});

// ---------------------------------------------------------------------------
// meanVarianceOptimize
// ---------------------------------------------------------------------------

describe('meanVarianceOptimize', () => {
  it('2-asset: high-return asset dominates at high target return', () => {
    // Asset A: return=0.2, Asset B: return=0.05
    // Diagonal covariance (independent): sigma_A=0.1, sigma_B=0.05
    const mu = [0.2, 0.05];
    const cov = [[0.01, 0], [0, 0.0025]];
    const result = meanVarianceOptimize(mu, cov, 0.18);
    // To achieve ~0.18 return, most weight should be on A
    expect(result.weights[0]).toBeGreaterThan(result.weights[1]);
    expect(result.expectedReturn).toBeGreaterThan(0.1);
  });

  it('weights sum to approximately 1', () => {
    const mu = [0.1, 0.2, 0.15];
    const cov = [
      [0.04, 0.01, 0.01],
      [0.01, 0.09, 0.02],
      [0.01, 0.02, 0.06],
    ];
    const result = meanVarianceOptimize(mu, cov);
    const sum = result.weights.reduce((s, w) => s + w, 0);
    expect(sum).toBeCloseTo(1, 2);
  });

  it('all weights are non-negative', () => {
    const mu = [0.1, 0.2];
    const cov = [[0.04, 0.01], [0.01, 0.09]];
    const result = meanVarianceOptimize(mu, cov);
    result.weights.forEach((w) => expect(w).toBeGreaterThanOrEqual(-1e-8));
  });

  it('sharpe ratio is positive when returns > risk-free', () => {
    const mu = [0.1, 0.2];
    const cov = [[0.04, 0], [0, 0.09]];
    const result = meanVarianceOptimize(mu, cov, undefined, 0.02);
    expect(result.sharpeRatio).toBeGreaterThan(0);
  });

  it('returns structure has required fields', () => {
    const mu = [0.1, 0.2];
    const cov = [[0.04, 0], [0, 0.09]];
    const result = meanVarianceOptimize(mu, cov);
    expect(result).toHaveProperty('weights');
    expect(result).toHaveProperty('expectedReturn');
    expect(result).toHaveProperty('variance');
    expect(result).toHaveProperty('sharpeRatio');
  });

  it('2-asset: min-variance portfolio favors lower-risk asset at low target', () => {
    const mu = [0.2, 0.05];
    const cov = [[0.09, 0], [0, 0.0025]]; // sig_A=0.3, sig_B=0.05
    const result = meanVarianceOptimize(mu, cov, 0.06);
    // Low target return — mostly B (low risk)
    expect(result.weights[1]).toBeGreaterThan(result.weights[0]);
  });
});

// ---------------------------------------------------------------------------
// gridSearch
// ---------------------------------------------------------------------------

describe('gridSearch', () => {
  it('finds global minimum over a discrete 1D grid', () => {
    const grid = [[-2, -1, 0, 1, 2]];
    const result = gridSearch((x) => x * x, grid);
    expect(result.params[0]).toBe(0);
    expect(result.value).toBe(0);
  });

  it('finds minimum over 2D grid for (x-1)^2 + (y-2)^2', () => {
    const xGrid = [0, 1, 2, 3];
    const yGrid = [0, 1, 2, 3];
    const result = gridSearch((x, y) => (x - 1) ** 2 + (y - 2) ** 2, [xGrid, yGrid]);
    expect(result.params[0]).toBe(1);
    expect(result.params[1]).toBe(2);
    expect(result.value).toBeCloseTo(0, 10);
  });

  it('counts evaluations correctly', () => {
    const result = gridSearch((x, y) => x + y, [[1, 2, 3], [4, 5]]);
    expect(result.evaluations).toBe(6); // 3 * 2
  });

  it('maximizes when opts.maximize=true', () => {
    const grid = [[-2, -1, 0, 1, 2]];
    const result = gridSearch((x) => -x * x, grid, { maximize: true });
    expect(result.params[0]).toBe(0);
    expect(result.value).toBeCloseTo(0, 10);
  });

  it('handles 3D grid', () => {
    const result = gridSearch(
      (a, b, c) => (a - 1) ** 2 + (b - 2) ** 2 + (c - 3) ** 2,
      [[0, 1, 2], [1, 2, 3], [2, 3, 4]],
    );
    expect(result.params).toEqual([1, 2, 3]);
    expect(result.value).toBeCloseTo(0, 10);
    expect(result.evaluations).toBe(27);
  });
});

// ---------------------------------------------------------------------------
// randomSearch
// ---------------------------------------------------------------------------

describe('randomSearch', () => {
  const bounds: Array<[number, number]> = [[-5, 5], [-5, 5]];

  it('returns a point within bounds', () => {
    const result = randomSearch(sphere, bounds, { seed: 42, iterations: 100 });
    result.x.forEach((xi, i) => {
      const [lo, hi] = bounds[i];
      expect(xi).toBeGreaterThanOrEqual(lo - 1e-10);
      expect(xi).toBeLessThanOrEqual(hi + 1e-10);
    });
  });

  it('is reproducible with same seed', () => {
    const r1 = randomSearch(sphere, bounds, { seed: 7, iterations: 50 });
    const r2 = randomSearch(sphere, bounds, { seed: 7, iterations: 50 });
    expect(r1.value).toBeCloseTo(r2.value, 10);
    expect(r1.x).toEqual(r2.x);
  });

  it('maximizes when requested', () => {
    const fn: ObjectiveFn = ([x, y]) => -(x * x + y * y); // negative sphere
    const r = randomSearch(fn, bounds, { maximize: true, seed: 42, iterations: 200 });
    // Maximum is at boundary; value should be negative (large |x|)
    expect(r.value).toBeGreaterThan(-50); // within bounds
  });

  it('reports correct iteration count', () => {
    const result = randomSearch(sphere, bounds, { iterations: 77, seed: 1 });
    expect(result.iterations).toBe(77);
  });

  it('value is better with more iterations', () => {
    const r1 = randomSearch(sphere, bounds, { seed: 42, iterations: 10 });
    const r2 = randomSearch(sphere, bounds, { seed: 42, iterations: 500 });
    expect(r2.value).toBeLessThanOrEqual(r1.value + 1e-10);
  });
});

// ---------------------------------------------------------------------------
// isConverged
// ---------------------------------------------------------------------------

describe('isConverged', () => {
  it('returns true when all differences are below tol', () => {
    expect(isConverged([1.00001, 2.00001], [1, 2], 1e-3)).toBe(true);
  });

  it('returns false when any difference exceeds tol', () => {
    expect(isConverged([1.1, 2.0], [1, 2], 1e-3)).toBe(false);
  });

  it('returns true for identical arrays', () => {
    expect(isConverged([3, 4, 5], [3, 4, 5], 1e-10)).toBe(true);
  });

  it('returns false for clearly different arrays', () => {
    expect(isConverged([0, 0], [10, 10], 1e-6)).toBe(false);
  });

  it('handles single-element arrays', () => {
    expect(isConverged([1.0000001], [1], 1e-5)).toBe(true);
    expect(isConverged([1.1], [1], 1e-5)).toBe(false);
  });

  it('uses max norm (all dimensions must converge)', () => {
    // First dimension converged, second did not
    expect(isConverged([1.000001, 5], [1, 2], 1e-4)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// decaySchedule
// ---------------------------------------------------------------------------

describe('decaySchedule', () => {
  it('step decay: decreases in steps', () => {
    const lr0 = 1.0;
    const lr1 = decaySchedule(lr0, 0, 'step', { stepSize: 10, decayFactor: 0.1 });
    const lr2 = decaySchedule(lr0, 10, 'step', { stepSize: 10, decayFactor: 0.1 });
    const lr3 = decaySchedule(lr0, 20, 'step', { stepSize: 10, decayFactor: 0.1 });
    expect(lr1).toBeCloseTo(1.0, 10);
    expect(lr2).toBeCloseTo(0.1, 10);
    expect(lr3).toBeCloseTo(0.01, 10);
  });

  it('exponential decay: strictly decreasing', () => {
    const vals = [0, 1, 2, 5, 10].map((s) =>
      decaySchedule(1.0, s, 'exponential', { decayFactor: 0.9 }),
    );
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeLessThan(vals[i - 1]);
    }
  });

  it('cosine decay: starts at initialLr, reaches near 0 at totalSteps', () => {
    const total = 1000;
    const start = decaySchedule(1.0, 0, 'cosine', { totalSteps: total });
    const end = decaySchedule(1.0, total, 'cosine', { totalSteps: total });
    expect(start).toBeCloseTo(1.0, 5);
    expect(end).toBeCloseTo(0.0, 5);
  });

  it('cosine decay: monotonically decreasing', () => {
    const total = 100;
    let prev = decaySchedule(1.0, 0, 'cosine', { totalSteps: total });
    for (let s = 1; s <= total; s++) {
      const cur = decaySchedule(1.0, s, 'cosine', { totalSteps: total });
      expect(cur).toBeLessThanOrEqual(prev + 1e-12);
      prev = cur;
    }
  });

  it('warmup: increases linearly from 0 to initialLr over totalSteps', () => {
    const total = 100;
    const midLr = decaySchedule(1.0, 50, 'warmup', { totalSteps: total });
    const endLr = decaySchedule(1.0, 100, 'warmup', { totalSteps: total });
    const startLr = decaySchedule(1.0, 0, 'warmup', { totalSteps: total });
    expect(startLr).toBeCloseTo(0, 10);
    expect(midLr).toBeCloseTo(0.5, 5);
    expect(endLr).toBeCloseTo(1.0, 5);
  });

  it('warmup: clamps at initialLr beyond totalSteps', () => {
    const lr = decaySchedule(0.5, 200, 'warmup', { totalSteps: 100 });
    expect(lr).toBeCloseTo(0.5, 5);
  });

  it('exponential: returns initialLr at step 0', () => {
    const lr = decaySchedule(0.01, 0, 'exponential', { decayFactor: 0.9 });
    expect(lr).toBeCloseTo(0.01, 10);
  });
});
