/**
 * Next-game exposure from snaps (and injury), not calendar games.
 *
 * A healthy scratch (0 offensive snaps) is not a 0% receiver/rusher. It is
 * zero opportunity — the same identity #519/#530/#531 fixed for targets,
 * rush attempts, and touches. nflverse snap_counts + injuries are CC-BY.
 *
 * Closed-form: snap share s = playerSnaps / teamOffSnaps, teamSnaps=0 or
 * playerSnaps=0 refused as talent. Injury-out ⇒ exposure 0 (ZIP hurdle).
 * Expected snaps = s × next-game team offensive snaps.
 *
 * Independent p path only. priced:false. Pure, no I/O.
 */

export const SNAP_EXPOSURE_METHOD_TAG = "props_hb_snap_exposure_v1" as const;

export type SnapSample = {
  readonly playerSnaps: number;
  readonly teamOffSnaps: number;
};

export type SnapShare = {
  readonly ok: true;
  readonly methodTag: typeof SNAP_EXPOSURE_METHOD_TAG;
  readonly share: number;
  readonly priced: false;
};

export type SnapDenied = {
  readonly ok: false;
  readonly methodTag: typeof SNAP_EXPOSURE_METHOD_TAG;
  readonly share: null;
  readonly priced: false;
  readonly refuse: "zero_team" | "zero_player" | "bad";
};

function finiteNonNeg(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

/** Player snap share. 0-player-snap rows are exposure 0, not a 0% talent. */
export function snapShare(s: SnapSample): SnapShare | SnapDenied {
  const tag = SNAP_EXPOSURE_METHOD_TAG;
  if (!finiteNonNeg(s.playerSnaps) || !finiteNonNeg(s.teamOffSnaps)) {
    return { ok: false, methodTag: tag, share: null, priced: false, refuse: "bad" };
  }
  if (s.teamOffSnaps <= 0) {
    return { ok: false, methodTag: tag, share: null, priced: false, refuse: "zero_team" };
  }
  if (s.playerSnaps === 0) {
    return { ok: false, methodTag: tag, share: null, priced: false, refuse: "zero_player" };
  }
  if (s.playerSnaps > s.teamOffSnaps) {
    return { ok: false, methodTag: tag, share: null, priced: false, refuse: "bad" };
  }
  return { ok: true, methodTag: tag, share: s.playerSnaps / s.teamOffSnaps, priced: false };
}

/** Pooled snap share across games. Drops 0-snap / 0-team rows. */
export function pooledSnapShare(samples: readonly SnapSample[]): number | null {
  let p = 0;
  let t = 0;
  for (const s of samples) {
    const r = snapShare(s);
    if (!r.ok) continue;
    p += s.playerSnaps;
    t += s.teamOffSnaps;
  }
  if (t <= 0) return null;
  return p / t;
}

/**
 * Next-game snap exposure. `injuryOut` true ⇒ 0 (ZIP). teamOffSnapsNext=0 ⇒ 0.
 * Does not invent a snap share when the pooled sample is empty.
 */
export function expectedSnapsNext(
  share: number | null,
  teamOffSnapsNext: number,
  injuryOut: boolean,
): number {
  if (injuryOut) return 0;
  if (share === null || !Number.isFinite(share) || share < 0) {
    throw new RangeError(`expectedSnapsNext: share must be a finite ≥ 0 or null`);
  }
  if (!Number.isFinite(teamOffSnapsNext) || teamOffSnapsNext < 0) {
    throw new RangeError(`expectedSnapsNext: teamOffSnapsNext must be finite and ≥ 0`);
  }
  if (teamOffSnapsNext === 0) return 0;
  return share * teamOffSnapsNext;
}
