/**
 * Formation classification from the pre-snap set.
 *
 * At the set moment every offensive player is nearly stationary, so a
 * single snapshot of offense-frame positions is enough for a rule-based
 * read: QB depth gives the backfield, receiver splits give the
 * distribution, attached/blocking bodies give personnel.
 *
 * v1 is rule-based on geometry (transparent, debuggable). The
 * FormationClassifier interface leaves the ML path open: a trained model
 * drops in behind the same contract.
 *
 * Original implementation for GSE.
 */

import {
  toOffenseFrame,
  type OffensePoint,
  type SnapContext,
} from "./cv-field-model.js";

export type Backfield = "under-center" | "pistol" | "shotgun" | "empty" | "wildcat" | "unknown";
export type Distribution =
  | "trips-left"
  | "trips-right"
  | "bunch-left"
  | "bunch-right"
  | "2x2"
  | "3x1-left"
  | "3x1-right"
  | "empty-5wide"
  | "goal-line"
  | "unknown";

export interface Formation {
  readonly backfield: Backfield;
  /** e.g. "11", "12", "21", "10" — inferred from RB + TE counts. */
  readonly personnel: string;
  readonly wrLeft: number;
  readonly wrRight: number;
  readonly teCount: number;
  readonly rbCount: number;
  readonly distribution: Distribution;
  /** True when 5 eligible receivers are split (no backfield RB). */
  readonly empty: boolean;
  /** 0..1. */
  readonly confidence: number;
  readonly notes: string;
}

/** One offensive player at the set moment. */
export interface SetPlayer {
  readonly trackletId: string;
  /** Field meters. */
  readonly xM: number;
  readonly yM: number;
}

export interface FormationClassifier {
  readonly name: string;
  classify(
    offense: readonly SetPlayer[],
    ctx: SnapContext,
    ballLateralYd?: number,
  ): Formation;
}

const YD = {
  /** Within this of the LOS laterally counts as "on the line". */
  lineTol: 1.0,
  /** Split end threshold: |lateral| beyond this is a wide receiver. */
  wrSplit: 7.0,
  // Attached-TE band. Interior linemen (guards/tackles) align within ~2.5
  // yards of the ball; a TE attaches outside them. Splits wider than 2.5
  // on a tackle are a known v1 approximation — film study tunes this.
  teInner: 2.5,
  teOuter: 5.0,
  /** Bunch cluster radius. */
  bunchRadius: 4.0,
};

export class RuleBasedFormationClassifier implements FormationClassifier {
  readonly name = "rule-based-formation-v1";

  classify(
    offense: readonly SetPlayer[],
    ctx: SnapContext,
    _ballLateralYd = 0,
  ): Formation {
    const pts: (OffensePoint & { id: string })[] = offense.map((p) => ({
      id: p.trackletId,
      ...toOffenseFrame(p.xM, p.yM, ctx),
    }));

    if (pts.length < 7) {
      return {
        backfield: "unknown",
        personnel: "??",
        wrLeft: 0,
        wrRight: 0,
        teCount: 0,
        rbCount: 0,
        distribution: "unknown",
        empty: false,
        confidence: 0.2,
        notes: `only ${pts.length} offensive players visible; need >= 7`,
      };
    }

    // QB: the behind-LOS player closest to the ball laterally. The QB takes
    // the snap at (or near) the ball's lateral spot; backs line up deeper
    // or offset. Most-centered wins; ties break toward the LOS.
    // (Wildcat — a back taking the snap — is a known v1 blind spot.)
    const behind = pts.filter(
      (p) => p.downfieldYd < -0.5 && Math.abs(p.lateralYd) < 4,
    );
    behind.sort(
      (a, b) =>
        Math.abs(a.lateralYd) - Math.abs(b.lateralYd) ||
        b.downfieldYd - a.downfieldYd,
    );
    const qb = behind[0] ?? null;
    const qbDepth = qb ? -qb.downfieldYd : null;

    let backfield: Backfield = "unknown";
    if (qbDepth == null) backfield = "unknown";
    else if (qbDepth < 1.5) backfield = "under-center";
    else if (qbDepth < 4.5) backfield = "pistol";
    else backfield = "shotgun";

    // Backs: behind the LOS, inside the tackles (|lateral| < 6), not the QB.
    const backs = pts.filter(
      (p) =>
        p.downfieldYd < -0.5 &&
        Math.abs(p.lateralYd) < 6 &&
        p.id !== qb?.id,
    );
    const rbCount = backs.length;

    // Tight ends: attached (near LOS, 2-5 yards lateral) — not split wide.
    const tes = pts.filter(
      (p) =>
        Math.abs(p.downfieldYd) < YD.lineTol + 1 &&
        Math.abs(p.lateralYd) >= YD.teInner &&
        Math.abs(p.lateralYd) < YD.teOuter &&
        p.id !== qb?.id,
    );
    const teCount = tes.length;

    // Wide receivers: split beyond the TE band, near the LOS or off it.
    const wrLeft = pts.filter(
      (p) => p.lateralYd < -YD.wrSplit && p.id !== qb?.id,
    ).length;
    const wrRight = pts.filter(
      (p) => p.lateralYd > YD.wrSplit && p.id !== qb?.id,
    ).length;

    // Slot receivers: between TE band and WR split.
    const slotLeft = pts.filter(
      (p) =>
        p.lateralYd <= -YD.teOuter &&
        p.lateralYd >= -YD.wrSplit &&
        p.id !== qb?.id &&
        !tes.some((t) => t.id === p.id),
    ).length;
    const slotRight = pts.filter(
      (p) =>
        p.lateralYd >= YD.teOuter &&
        p.lateralYd <= YD.wrSplit &&
        p.id !== qb?.id &&
        !tes.some((t) => t.id === p.id),
    ).length;

    const leftTotal = wrLeft + slotLeft;
    const rightTotal = wrRight + slotRight;

    // Bunch: 3+ receivers within a 4-yard cluster on one side.
    const bunchSide = (side: 1 | -1): boolean => {
      const rec = pts.filter(
        (p) =>
          Math.sign(p.lateralYd) === side &&
          Math.abs(p.lateralYd) >= YD.teOuter &&
          p.id !== qb?.id,
      );
      for (const a of rec) {
        const cluster = rec.filter(
          (b) =>
            Math.hypot(
              a.downfieldYd - b.downfieldYd,
              a.lateralYd - b.lateralYd,
            ) < YD.bunchRadius,
        ).length;
        if (cluster >= 3) return true;
      }
      return false;
    };

    let distribution: Distribution = "unknown";
    if (leftTotal + rightTotal >= 5 && rbCount === 0 && backfield === "shotgun") {
      distribution = "empty-5wide";
    } else if (bunchSide(-1)) distribution = "bunch-left";
    else if (bunchSide(1)) distribution = "bunch-right";
    else if (leftTotal >= 3 && rightTotal < 3) distribution = "trips-left";
    else if (rightTotal >= 3 && leftTotal < 3) distribution = "trips-right";
    else if (leftTotal === 2 && rightTotal === 2) distribution = "2x2";
    else if (leftTotal === 3 && rightTotal === 1) distribution = "3x1-left";
    else if (rightTotal === 3 && leftTotal === 1) distribution = "3x1-right";

    const empty = rbCount === 0 && backfield === "shotgun" && leftTotal + rightTotal >= 4;
    if (empty && backfield === "shotgun") backfield = "empty";

    const personnel = `${rbCount}${teCount}`;
    const notes = [
      `qbDepth=${qbDepth?.toFixed(1) ?? "?"}yd`,
      `backs=${rbCount}`,
      `tes=${teCount}`,
      `L${leftTotal}/R${rightTotal}`,
    ].join(" ");

    // Confidence: penalize missing players and ambiguous geometry.
    const playerPenalty = pts.length < 11 ? (11 - pts.length) * 0.05 : 0;
    const qbPenalty = qbDepth == null ? 0.25 : 0;
    const confidence = Math.max(
      0.15,
      Math.min(0.95, 0.9 - playerPenalty - qbPenalty),
    );

    return {
      backfield,
      personnel,
      wrLeft: leftTotal,
      wrRight: rightTotal,
      teCount,
      rbCount,
      distribution,
      empty,
      confidence: Math.round(confidence * 100) / 100,
      notes,
    };
  }
}
