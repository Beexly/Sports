import { describe, expect, it } from 'vitest';
import {
  KTD_SEPARATION_EPS,
  OL_PRESSURE_PRIOR_KAPPA,
  OL_PRESSURE_PRIOR_MEAN,
  RMR_RECOVERY_EPS_SEC,
  kineticTranslationDeficit,
  minDetectablePassBlockSnaps,
  relativeMirrorRecovery,
  shrinkPassBlockPressureRate,
} from '../kinetic-translation-deficit';

describe('kineticTranslationDeficit', () => {
  it('computes (sMax - sCut) / (meanSeparationYards + 0.01)', () => {
    const ktd = kineticTranslationDeficit(9.2, 5.1, 2.04);
    expect(ktd).toBeCloseTo((9.2 - 5.1) / (2.04 + KTD_SEPARATION_EPS), 6);
  });

  it('returns null on negative or non-finite inputs', () => {
    expect(kineticTranslationDeficit(-1, 5, 2)).toBeNull();
    expect(kineticTranslationDeficit(9, Number.NaN, 2)).toBeNull();
    expect(kineticTranslationDeficit(9, 5, -0.5)).toBeNull();
  });
});

describe('relativeMirrorRecovery (Hermes-25 MIT)', () => {
  it('computes (vPost / vPre) / (tauRecoverySec + 0.05)', () => {
    const rmr = relativeMirrorRecovery(4.0, 3.6, 0.40);
    expect(rmr).toBeCloseTo((3.6 / 4.0) / (0.40 + RMR_RECOVERY_EPS_SEC), 6);
  });

  it('rejects non-positive vPre or negative inputs', () => {
    expect(relativeMirrorRecovery(0, 3.6, 0.4)).toBeNull();
    expect(relativeMirrorRecovery(4.0, -1, 0.4)).toBeNull();
    expect(relativeMirrorRecovery(4.0, 3.6, -0.1)).toBeNull();
  });
});

describe('shrinkPassBlockPressureRate & minDetectablePassBlockSnaps', () => {
  it('shrinks low-snap rookie OL pressure rate toward positional prior', () => {
    const res = shrinkPassBlockPressureRate(12, 100);
    expect(res).not.toBeNull();
    const expectedEb =
      (12 + OL_PRESSURE_PRIOR_KAPPA * OL_PRESSURE_PRIOR_MEAN) /
      (100 + OL_PRESSURE_PRIOR_KAPPA);
    expect(res!.rawRate).toBeCloseTo(0.12, 6);
    expect(res!.ebRate).toBeCloseTo(expectedEb, 6);
    expect(res!.shrinkageWeight).toBeCloseTo(100 / 250, 6);
  });

  it('computes N_min = 2211 snaps for deltaP = 0.015 at mu0 = 0.068', () => {
    expect(minDetectablePassBlockSnaps(0.015)).toBe(2211);
    expect(minDetectablePassBlockSnaps(0)).toBeNull();
  });
});
