import { describe, it, expect } from 'vitest';
import {
  solveBenchmarkTask,
  HLE_EPIDEMIOLOGY_TASK,
  ARC_TASK_ROTATION,
  FRONTIER_MATH_SYMPLECTIC_TASK,
  CAUSAL_PHYS_INCLINE_TASK
} from '../universal-causal-solver.js';

describe('Universal Causal Solver Benchmark Integration', () => {
  it('solves HLE causal epidemiological counterfactual task', () => {
    const solution = solveBenchmarkTask(HLE_EPIDEMIOLOGY_TASK);
    expect(solution.confidenceScore).toBeGreaterThanOrEqual(0.70);
    expect(solution.derivedAnswer).toContain('9.5%');
    expect(solution.dagValidation.cycleDetected).toBe(false);
    expect(solution.dagValidation.unblockedBackdoorPaths).toHaveLength(0);
  });

  it('solves ARC-AGI spatial topological abstraction task', () => {
    const solution = solveBenchmarkTask(ARC_TASK_ROTATION);
    expect(solution.confidenceScore).toBe(1.0);
    expect(solution.invarianceCertificates).toContain('spatial_isometric_rotation_90_deg');
    expect(solution.dagValidation.cycleDetected).toBe(false);
  });

  it('solves FrontierMath symplectic integrator conservation task', () => {
    const solution = solveBenchmarkTask(FRONTIER_MATH_SYMPLECTIC_TASK);
    expect(solution.confidenceScore).toBeGreaterThanOrEqual(0.95);
    expect(solution.derivedAnswer).toContain('Symplectic structure preserved');
    expect(solution.invarianceCertificates).toContain('canonical_two_form_exact_preservation');
  });

  it('solves Causal Physics stadium drag & projectile trajectory task', () => {
    const solution = solveBenchmarkTask(CAUSAL_PHYS_INCLINE_TASK);
    expect(solution.confidenceScore).toBeGreaterThanOrEqual(0.85);
    expect(solution.derivedAnswer).toContain('49.3 m');
    expect(solution.invarianceCertificates).toContain('navier_stokes_boundary_layer_invariance');
    expect(solution.dagValidation.unblockedBackdoorPaths).toHaveLength(0);
  });
});
