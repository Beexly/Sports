/**
 * Spring physics simulation — pure math, zero dependencies.
 *
 * Damped harmonic oscillator for animation and gesture-following.
 * Used for: animated number displays, CountUp alternatives,
 * physics-based transitions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpringConfig {
  /** Stiffness k (default: 170) */
  stiffness?: number;
  /** Damping coefficient c (default: 26) */
  damping?: number;
  /** Mass (default: 1) */
  mass?: number;
  /** Initial velocity (default: 0) */
  velocity?: number;
}

export interface SpringState {
  /** Current position */
  position: number;
  /** Current velocity */
  velocity: number;
}

export interface SpringFrame {
  position: number;
  velocity: number;
  /** true when settled: |v| < 0.01 and |x - target| < 0.01 */
  done: boolean;
}

// ---------------------------------------------------------------------------
// Preset configs
// ---------------------------------------------------------------------------

export const SPRING_PRESETS = {
  gentle: { stiffness: 120, damping: 14, mass: 1 },
  wobbly: { stiffness: 180, damping: 12, mass: 1 },
  stiff: { stiffness: 210, damping: 20, mass: 1 },
  slow: { stiffness: 280, damping: 60, mass: 1 },
  molasses: { stiffness: 280, damping: 120, mass: 1 },
} as const;

// ---------------------------------------------------------------------------
// Core factory
// ---------------------------------------------------------------------------

/**
 * Create a spring stepper using RK4 (Runge-Kutta 4th order) integration.
 *
 * F = -k * (x - target) - c * v
 * a = F / mass
 *
 * Damping ratio: ζ = c / (2 * sqrt(k * mass))
 *   ζ > 1 → overdamped (no oscillation)
 *   ζ = 1 → critically damped
 *   ζ < 1 → underdamped (oscillates)
 *
 * @param config Spring configuration (stiffness, damping, mass, velocity)
 * @returns Object with a `step` method
 */
export function createSpring(config?: SpringConfig): {
  step: (state: SpringState, target: number, dt: number) => SpringFrame;
} {
  const k = config?.stiffness ?? 170;
  const c = config?.damping ?? 26;
  const m = config?.mass ?? 1;

  function acceleration(x: number, v: number, target: number): number {
    return (-k * (x - target) - c * v) / m;
  }

  function step(
    state: SpringState,
    target: number,
    dt: number,
  ): SpringFrame {
    const { position: x, velocity: v } = state;

    // RK4 integration
    const k1v = acceleration(x, v, target);
    const k1x = v;

    const k2v = acceleration(x + (dt / 2) * k1x, v + (dt / 2) * k1v, target);
    const k2x = v + (dt / 2) * k1v;

    const k3v = acceleration(x + (dt / 2) * k2x, v + (dt / 2) * k2v, target);
    const k3x = v + (dt / 2) * k2v;

    const k4v = acceleration(x + dt * k3x, v + dt * k3v, target);
    const k4x = v + dt * k3v;

    const newPosition = x + (dt / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    const newVelocity = v + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);

    const done =
      Math.abs(newVelocity) < 0.01 &&
      Math.abs(newPosition - target) < 0.01;

    return { position: newPosition, velocity: newVelocity, done };
  }

  return { step };
}

// ---------------------------------------------------------------------------
// Simulation helpers
// ---------------------------------------------------------------------------

/**
 * Simulate a spring from `from` to `to` at 60fps.
 * Returns frames until `done=true` or `maxFrames` is reached.
 */
export function simulateSpring(
  from: number,
  to: number,
  config?: SpringConfig,
  maxFrames = 300,
): SpringFrame[] {
  const spring = createSpring(config);
  const dt = 1 / 60;
  const frames: SpringFrame[] = [];

  let state: SpringState = {
    position: from,
    velocity: config?.velocity ?? 0,
  };

  for (let i = 0; i < maxFrames; i++) {
    const frame = spring.step(state, to, dt);
    frames.push(frame);
    if (frame.done) break;
    state = { position: frame.position, velocity: frame.velocity };
  }

  return frames;
}

/**
 * Estimate duration in ms until the spring settles.
 * Returns (frames / 60) * 1000.
 */
export function springDuration(
  from: number,
  to: number,
  config?: SpringConfig,
): number {
  const frames = simulateSpring(from, to, config);
  return (frames.length / 60) * 1000;
}
